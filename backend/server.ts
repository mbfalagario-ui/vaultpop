import { createServer } from "node:http";

import { ApplePurchaseVerifier } from "./apple-verifier";
import { createApiHandler } from "./app";
import { SqliteLedgerStore } from "./sqlite-ledger";

const host = process.env.VAULTPOP_API_HOST ?? "127.0.0.1";
const port = Number(process.env.VAULTPOP_API_PORT ?? 8787);
const databasePath =
  process.env.VAULTPOP_DATABASE_PATH ?? "./backend-data/vaultpop.sqlite";
const certificatePaths = (process.env.APPLE_ROOT_CA_PATHS ?? "")
  .split(",")
  .map((path) => path.trim())
  .filter(Boolean);

const handler = createApiHandler({
  verifier: new ApplePurchaseVerifier(certificatePaths),
  ledger: new SqliteLedgerStore(databasePath)
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
