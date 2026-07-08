/**
 * Google AdMob server-side verification (SSV) for rewarded ads.
 *
 * AdMob appends `signature` and `key_id` as the LAST two query parameters of
 * every SSV callback. The message to verify is the raw query string content
 * that precedes `signature=`. Signatures are base64url-encoded ECDSA/SHA-256
 * over that message, verifiable against Google's published public keys.
 *
 * Rules implemented here:
 * - Fail closed: no verification -> no acknowledgement (non-200 response).
 * - Idempotent: each AdMob transaction_id is recorded exactly once.
 * - No secrets, no debug output in responses.
 */
import { verify as cryptoVerify } from "node:crypto";

export const ADMOB_SSV_KEY_URL =
  "https://www.gstatic.com/admob/reward/verifier-keys.json";

export type SsvKeySet = Map<number, string>; // key_id -> PEM public key

export interface SsvKeyProvider {
  getKeys(): Promise<SsvKeySet>;
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
}

/** Fetches and caches Google's SSV verifier keys for one hour. */
export class GoogleSsvKeyProvider implements SsvKeyProvider {
  private cached: SsvKeySet | null = null;
  private cachedAt = 0;

  async getKeys(): Promise<SsvKeySet> {
    const oneHour = 60 * 60 * 1_000;
    if (this.cached && Date.now() - this.cachedAt < oneHour) {
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
  constructor(private keys: SsvKeySet) {}
  async getKeys(): Promise<SsvKeySet> {
    return this.keys;
  }
}

/** True when a request carries AdMob SSV callback parameters. */
export function isSsvCallback(url: URL): boolean {
  return url.searchParams.has("signature") && url.searchParams.has("key_id");
}

/**
 * Verifies and idempotently records an SSV callback.
 * Returns a Response: 200 only after a valid signature; otherwise 4xx/5xx so
 * AdMob retries. Duplicate transactions still return 200 (already handled).
 */
export async function handleSsvCallback(
  url: URL,
  keyProvider: SsvKeyProvider,
  rewards: RewardEventStore
): Promise<Response> {
  const signature = url.searchParams.get("signature") ?? "";
  const keyId = Number(url.searchParams.get("key_id"));
  const transactionId = url.searchParams.get("transaction_id") ?? "";
  const rawQuery = url.search.startsWith("?") ? url.search.slice(1) : url.search;
  const signatureIndex = rawQuery.indexOf("signature=");

  if (!signature || !Number.isFinite(keyId) || signatureIndex <= 0) {
    return plain("Invalid SSV request.", 400);
  }

  // Message = query string content preceding "signature=" without the trailing "&".
  const message = rawQuery.slice(0, signatureIndex - 1);

  let keys: SsvKeySet;
  try {
    keys = await keyProvider.getKeys();
  } catch {
    // Fail closed; AdMob retries on non-200.
    return plain("Verification keys unavailable.", 503);
  }
  const pem = keys.get(keyId);
  if (!pem) {
    return plain("Unknown SSV key.", 400);
  }

  let valid = false;
  try {
    valid = cryptoVerify(
      "sha256",
      Buffer.from(message, "utf8"),
      pem,
      Buffer.from(signature, "base64url")
    );
  } catch {
    valid = false;
  }
  if (!valid) {
    return plain("Invalid SSV signature.", 400);
  }

  if (transactionId) {
    rewards.recordOnce({
      transactionId,
      adUnit: url.searchParams.get("ad_unit") ?? "",
      rewardItem: url.searchParams.get("reward_item") ?? "",
      rewardAmount: Math.max(
        0,
        Math.floor(Number(url.searchParams.get("reward_amount") ?? 0) || 0)
      ),
      userId: url.searchParams.get("user_id")
    });
  }

  return plain("OK", 200);
}

function plain(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "text/plain" }
  });
}
