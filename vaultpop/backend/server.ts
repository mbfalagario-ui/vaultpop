import { createServer } from "node:http";

import { ApplePurchaseVerifier } from "./apple-verifier";
import { createApiHandler } from "./app";
import { SqliteLeaderboardStore } from "./leaderboard-store";
import { SqliteOpsStore } from "./ops-store";
import { SqliteAccountStore } from "./sqlite-account-store";
import { SqliteLedgerStore } from "./sqlite-ledger";
import { GoogleSsvKeyProvider } from "./ssv";

const host = process.env.VAULTPOP_API_HOST ?? "127.0.0.1";
const port = Number(process.env.VAULTPOP_API_PORT ?? 8787);
const databasePath =
  process.env.VAULTPOP_DATABASE_PATH ?? "./backend-data/vaultpop.sqlite";
const certificatePaths = (process.env.APPLE_ROOT_CA_PATHS ?? "")
  .split(",")
  .map((path) => path.trim())
  .filter(Boolean);
const requestLogEnabled = process.env.VAULTPOP_REQUEST_LOG === "1";
const accounts = new SqliteAccountStore(databasePath);

accounts.upsertBootstrapAccount({
  email: process.env.VAULTPOP_ADMIN_EMAIL ?? "mbfalagario@gmail.com",
  password: requiredSecret("VAULTPOP_ADMIN_PASSWORD"),
  role: "admin"
});
accounts.upsertBootstrapAccount({
  email: process.env.VAULTPOP_REVIEWER_EMAIL ?? "reviewer@vaultpop.app",
  password: requiredSecret("VAULTPOP_REVIEWER_PASSWORD"),
  role: "reviewer",
  initialBalance: {
    vaultCoins: 1_000,
    bonusLives: 5,
    chainBoosts: 5,
    vaultBursts: 3
  }
});

const leaderboard = new SqliteLeaderboardStore(databasePath);
const ledger = new SqliteLedgerStore(databasePath);
const ops = new SqliteOpsStore(databasePath);

const handler = createApiHandler({
  verifier: new ApplePurchaseVerifier(certificatePaths),
  ledger,
  accounts,
  leaderboard,
  rewards: leaderboard,
  ssvKeys: new GoogleSsvKeyProvider(),
  ops
});

const server = createServer(async (incoming, outgoing) => {
  const startedAt = Date.now();
  const origin = `http://${incoming.headers.host ?? `${host}:${port}`}`;
  const url = new URL(incoming.url ?? "/", origin);
  const request = new Request(url, {
    method: incoming.method,
    headers: {
      ...(incoming.headers as Record<string, string>),
      // Query string exactly as received on the socket, for SSV signature
      // canonicalization (WHATWG URL parsing may normalize percent-encoding).
      "x-vaultpop-raw-query": (() => {
        const target = incoming.url ?? "/";
        const index = target.indexOf("?");
        return index >= 0 ? target.slice(index + 1) : "";
      })()
    } as HeadersInit,
    body:
      incoming.method === "GET" || incoming.method === "HEAD"
        ? undefined
        : (incoming as any),
    duplex: "half"
  } as RequestInit);
  const response = await handler(request);
  if (requestLogEnabled) {
    await logRequestRedacted(incoming.method ?? "?", url, response, startedAt);
  }
  outgoing.statusCode = response.status;
  response.headers.forEach((value, key) => outgoing.setHeader(key, value));
  outgoing.end(Buffer.from(await response.arrayBuffer()));
});

/**
 * Flag-gated (VAULTPOP_REQUEST_LOG=1) redacted request diagnostics.
 * Logs ONLY: method, path, query parameter NAMES (never values), status,
 * duration. For SSV routes it also logs the response body, which on those
 * routes is always one of our own fixed reason strings ("OK",
 * "Invalid SSV request.", "Unknown SSV key.", "Invalid SSV signature.",
 * "Verification keys unavailable.", readiness text) — never user data,
 * signatures, tokens, or secrets.
 */
async function logRequestRedacted(
  method: string,
  url: URL,
  response: Response,
  startedAt: number
): Promise<void> {
  const paramNames = [...url.searchParams.keys()].join(",");
  const isSsvRoute =
    url.pathname === "/api/ads/ssv_callback" ||
    (url.pathname === "/support" && url.searchParams.has("signature"));
  let reason = "";
  if (isSsvRoute) {
    try {
      reason = ` reason="${(await response.clone().text()).slice(0, 60)}"`;
    } catch {
      reason = "";
    }
  }
  console.log(
    `[req] ${method} ${url.pathname} params=[${paramNames}] status=${response.status} ms=${Date.now() - startedAt}${reason}`
  );
}

server.listen(port, host);

function requiredSecret(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be configured in the secure server environment.`);
  }
  return value;
}
