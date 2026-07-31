/**
 * Google AdMob server-side verification (SSV) for rewarded ads.
 *
 * AdMob appends `signature` and `key_id` as the LAST two query parameters of
 * every SSV callback. The message to verify is the raw query string content
 * that precedes `&signature=`. Signatures are base64url-encoded ECDSA/SHA-256
 * (DER) over that message, verifiable against Google's published public keys.
 *
 * Response matrix (per Build 8 handoff contract):
 * - Bare GET/HEAD (no params)      -> 200 readiness probe (handled in app.ts).
 * - Valid signature, grantable     -> 200, reward recorded once (idempotent,
 *                                     shared daily cap enforced).
 * - Valid signature, NOT grantable -> 200 "Verified SSV callback received.
 *                                     No reward granted." (e.g. the AdMob
 *                                     console verification test, which sends
 *                                     no user_id; or unapproved ad units).
 * - Invalid/forged/malformed       -> 400, fail closed, nothing granted.
 * - Unknown key_id                 -> force ONE public-key refresh before
 *                                     failing closed with 400.
 *
 * Diagnostics (flag-gated by VAULTPOP_REQUEST_LOG=1) are strictly redacted:
 * booleans, lengths, and fixed branch names only. Never parameter values,
 * signatures, keys, tokens, or secrets.
 */
import { verify as cryptoVerify } from "node:crypto";
import { parse as qsParse, stringify as qsStringify } from "node:querystring";

export const ADMOB_SSV_KEY_URL =
  "https://www.gstatic.com/admob/reward/verifier-keys.json";

/** Approved VaultPop rewarded ad units (AdMob may send either format). */
const APPROVED_REWARDED_AD_UNITS = new Set([
  "3409891849",
  "9333822278",
  "ca-app-pub-6035003811280283/3409891849",
  "ca-app-pub-6035003811280283/9333822278"
]);

/** Default per-user daily rewarded cap (admin-configurable via OpsStore). */
const DEFAULT_REWARDED_DAILY_CAP = 30;

/** Reward amounts above this are never grantable for VaultPop units. */
const MAX_REWARD_AMOUNT = 10;

export type SsvKeySet = Map<number, string>; // key_id -> PEM public key

export interface SsvKeyProvider {
  getKeys(): Promise<SsvKeySet>;
  /** Forces a fresh fetch, bypassing any cache (used on unknown key_id). */
  refreshKeys(): Promise<SsvKeySet>;
}

export interface RewardEventStore {
  /** Records the transaction once. Returns true when newly recorded. */
  recordOnce(input: {
    transactionId: string;
    adUnit: string;
    rewardItem: string;
    rewardAmount: number;
    userId: string | null;
  }): boolean;
  /** Number of recorded reward events for a user since the given ISO time. */
  countRecentForUser(userId: string, sinceIso: string): number;
}

/** Fetches and caches Google's SSV verifier keys (cache well under 24h). */
export class GoogleSsvKeyProvider implements SsvKeyProvider {
  private cached: SsvKeySet | null = null;
  private cachedAt = 0;

  async getKeys(): Promise<SsvKeySet> {
    const oneHour = 60 * 60 * 1_000;
    if (this.cached && Date.now() - this.cachedAt < oneHour) {
      return this.cached;
    }
    return this.refreshKeys();
  }

  async refreshKeys(): Promise<SsvKeySet> {
    // Guard against forged-callback refresh amplification: at most one
    // forced fetch per minute (key rotations are far slower than this).
    const oneMinute = 60 * 1_000;
    if (this.cached && Date.now() - this.cachedAt < oneMinute) {
      return this.cached;
    }
    const response = await fetch(ADMOB_SSV_KEY_URL);
    if (!response.ok) {
      throw new Error("SSV verifier keys are unavailable.");
    }
    const body = (await response.json()) as {
      keys?: { keyId: number; pem?: string }[];
    };
    const keys: SsvKeySet = new Map();
    for (const key of body.keys ?? []) {
      if (typeof key.keyId === "number" && typeof key.pem === "string") {
        keys.set(key.keyId, key.pem);
      }
    }
    if (keys.size === 0) {
      throw new Error("SSV verifier keys are empty.");
    }
    this.cached = keys;
    this.cachedAt = Date.now();
    return keys;
  }
}

/** Static keys for tests. */
export class StaticSsvKeyProvider implements SsvKeyProvider {
  constructor(
    private keys: SsvKeySet,
    private refreshed?: SsvKeySet
  ) {}
  refreshCount = 0;
  async getKeys(): Promise<SsvKeySet> {
    return this.keys;
  }
  async refreshKeys(): Promise<SsvKeySet> {
    this.refreshCount += 1;
    if (this.refreshed) {
      this.keys = this.refreshed;
    }
    return this.keys;
  }
}

/** True when a request carries AdMob SSV callback parameters. */
export function isSsvCallback(url: URL): boolean {
  return url.searchParams.has("signature") && url.searchParams.has("key_id");
}

function diagEnabled(): boolean {
  return process.env.VAULTPOP_REQUEST_LOG === "1";
}

/** Attempts one ECDSA/SHA-256 verification; never throws. */
function tryVerify(
  message: string,
  pem: string,
  signature: Buffer,
  dsaEncoding?: "ieee-p1363"
): boolean {
  try {
    const key = dsaEncoding
      ? ({ key: pem, dsaEncoding } as never)
      : pem;
    return cryptoVerify(
      "sha256",
      Buffer.from(message, "utf8"),
      key,
      signature
    );
  } catch {
    return false;
  }
}

/**
 * Verifies and idempotently records an SSV callback.
 * 200 only after a valid Google signature (with or without a grant);
 * otherwise 4xx/5xx so AdMob retries. Duplicates still return 200.
 *
 * `rawWireQuery` is the query string exactly as received on the socket
 * (before WHATWG URL parsing), used for signature canonicalization and
 * divergence diagnostics.
 */
export async function handleSsvCallback(
  url: URL,
  keyProvider: SsvKeyProvider,
  rewards: RewardEventStore,
  rawWireQuery?: string,
  getEffectiveCap?: (userId: string) => number
): Promise<Response> {
  const diag: string[] = [];
  const finish = (response: Response, branch: string): Response => {
    if (diagEnabled()) {
      diag.push(`branch=${branch}`, `status=${response.status}`);
      console.log(`[ssv-diag] ${diag.join(" ")}`);
    }
    return response;
  };

  const signatureRaw = url.searchParams.get("signature") ?? "";
  const keyId = Number(url.searchParams.get("key_id"));
  const transactionId = url.searchParams.get("transaction_id") ?? "";
  const userId = url.searchParams.get("user_id");
  const parsedQuery = url.search.startsWith("?")
    ? url.search.slice(1)
    : url.search;
  const wireQuery =
    typeof rawWireQuery === "string" && rawWireQuery.length > 0
      ? rawWireQuery
      : parsedQuery;

  if (diagEnabled()) {
    diag.push(
      `sig_present=${signatureRaw ? "Y" : "N"}`,
      `key_id_present=${url.searchParams.has("key_id") ? "Y" : "N"}`,
      `user_id_present=${userId !== null ? "Y" : "N"}`,
      `custom_data_present=${url.searchParams.has("custom_data") ? "Y" : "N"}`,
      `wire_match=${wireQuery === parsedQuery ? "Y" : "N"}`
    );
  }

  const signatureIndex = wireQuery.indexOf("&signature=");
  if (!signatureRaw || !Number.isFinite(keyId) || signatureIndex <= 0) {
    return finish(plain("Invalid SSV request.", 400), "malformed_request");
  }

  // Message = raw query content preceding "&signature=" exactly as received.
  // PROVEN (Fly diagnostics, real Google callbacks 2026-07-09): Google signs
  // the percent-DECODED form of that content — a callback whose reward_item
  // contained percent-encoded characters verified ONLY after decoding
  // (verify_raw=N verify_decoded=Y). Accept either canonicalization: a
  // signature must still be a genuine Google ECDSA/SHA-256 signature over
  // the exact callback content, so this weakens nothing; forged callbacks
  // verify under neither form.
  const message = wireQuery.slice(0, signatureIndex);
  let decodedMessage = "";
  try {
    decodedMessage = decodeURIComponent(message);
  } catch {
    decodedMessage = "";
  }

  let keys: SsvKeySet;
  try {
    keys = await keyProvider.getKeys();
  } catch {
    // Fail closed; AdMob retries on non-200.
    return finish(
      plain("Verification keys unavailable.", 503),
      "key_fetch_failed"
    );
  }
  let pem = keys.get(keyId);
  let keyRefreshAttempted = false;
  if (!pem) {
    // Keys rotate: refresh once before failing closed.
    keyRefreshAttempted = true;
    try {
      keys = await keyProvider.refreshKeys();
      pem = keys.get(keyId);
    } catch {
      pem = undefined;
    }
  }
  if (diagEnabled()) {
    diag.push(
      `key_refresh_attempted=${keyRefreshAttempted ? "Y" : "N"}`,
      `key_found=${pem ? "Y" : "N"}`
    );
  }
  if (!pem) {
    return finish(plain("Unknown SSV key.", 400), "unknown_key_id");
  }

  const signature = Buffer.from(signatureRaw, "base64url");
  const validRaw = tryVerify(message, pem, signature);
  const validDecoded =
    !validRaw &&
    decodedMessage !== "" &&
    decodedMessage !== message &&
    tryVerify(decodedMessage, pem, signature);
  const valid = validRaw || validDecoded;

  if (diagEnabled()) {
    diag.push(
      `sig_chars=${signatureRaw.length}`,
      `sig_bytes=${signature.length}`,
      `der_lead=${signature[0] === 0x30 ? "Y" : "N"}`,
      `msg_len=${message.length}`,
      `verify_raw=${validRaw ? "Y" : "N"}`,
      `verify_decoded=${validDecoded ? "Y" : "N"}`
    );
    if (!valid) {
      // Redacted variant probes (booleans only) to pinpoint canonicalization
      // or encoding divergence without exposing any values.
      const sorted = qsStringify(
        Object.fromEntries(
          Object.entries(qsParse(message)).sort(([a], [b]) =>
            a.localeCompare(b)
          )
        ) as never
      );
      const parsedMessage = parsedQuery.slice(
        0,
        parsedQuery.indexOf("&signature=")
      );
      diag.push(
        `verify_sorted=${tryVerify(sorted, pem, signature) ? "Y" : "N"}`,
        `verify_parsed=${parsedMessage && tryVerify(parsedMessage, pem, signature) ? "Y" : "N"}`,
        `verify_p1363=${signature.length === 64 && tryVerify(message, pem, signature, "ieee-p1363") ? "Y" : "N"}`
      );
    }
  }

  if (!valid) {
    return finish(plain("Invalid SSV signature.", 400), "invalid_signature");
  }

  // Signature is genuine Google. Decide grantability (200 either way).
  const adUnit = url.searchParams.get("ad_unit") ?? "";
  const rewardAmount = Math.max(
    0,
    Math.floor(Number(url.searchParams.get("reward_amount") ?? 0) || 0)
  );
  const grantable =
    transactionId.length > 0 &&
    typeof userId === "string" &&
    userId.length >= 4 &&
    APPROVED_REWARDED_AD_UNITS.has(adUnit) &&
    rewardAmount > 0 &&
    rewardAmount <= MAX_REWARD_AMOUNT;

  if (!grantable) {
    // Includes the AdMob console verification test (sent without user_id).
    return finish(
      plain("Verified SSV callback received. No reward granted.", 200),
      "verified_no_grant"
    );
  }

  // Per-user daily cap (account/install + UTC day). NEVER global: the count
  // is scoped to this callback's user_id, and the cap value may carry a
  // per-user admin override. Failed/cancelled ads never reach this point,
  // so they can never consume quota.
  let effectiveCap = DEFAULT_REWARDED_DAILY_CAP;
  if (getEffectiveCap) {
    try {
      effectiveCap = Math.max(0, Math.floor(getEffectiveCap(userId)));
    } catch {
      effectiveCap = DEFAULT_REWARDED_DAILY_CAP;
    }
  }
  const utcDayStart = new Date();
  utcDayStart.setUTCHours(0, 0, 0, 0);
  if (
    rewards.countRecentForUser(userId, utcDayStart.toISOString()) >= effectiveCap
  ) {
    return finish(
      plain("Verified SSV callback received. No reward granted.", 200),
      "verified_no_grant"
    );
  }

  const recorded = rewards.recordOnce({
    transactionId,
    adUnit,
    rewardItem: url.searchParams.get("reward_item") ?? "",
    rewardAmount,
    userId
  });

  return finish(
    plain("OK", 200),
    recorded ? "verified_granted" : "verified_duplicate"
  );
}

function plain(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "text/plain" }
  });
}
