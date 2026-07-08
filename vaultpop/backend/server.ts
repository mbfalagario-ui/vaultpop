import { createServer } from "node:http";

import { ApplePurchaseVerifier } from "./apple-verifier";
import { createApiHandler } from "./app";
import { SqliteLeaderboardStore } from "./leaderboard-store";
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

const handler = createApiHandler({
  verifier: new ApplePurchaseVerifier(certificatePaths),
  ledger: new SqliteLedgerStore(databasePath),
  accounts,
  leaderboard,
  rewards: leaderboard,
  ssvKeys: new GoogleSsvKeyProvider()
});

const server = createServer(async (incoming, outgoing) => {
  const origin = `http://${incoming.headers.host ?? `${host}:${port}`}`;
  const request = new Request(new URL(incoming.url ?? "/", origin), {
    method: incoming.method,
    headers: incoming.headers as HeadersInit,
    body:
      incoming.method === "GET" || incoming.method === "HEAD"
        ? undefined
        : (incoming as any),
    duplex: "half"
  } as RequestInit);
  const response = await handler(request);
  outgoing.statusCode = response.status;
  response.headers.forEach((value, key) => outgoing.setHeader(key, value));
  outgoing.end(Buffer.from(await response.arrayBuffer()));
});

server.listen(port, host);

function requiredSecret(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be configured in the secure server environment.`);
  }
  return value;
}
