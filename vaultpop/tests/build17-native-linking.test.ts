import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { createApiHandler } from "../backend/app";
import { MemoryLeaderboardStore } from "../backend/leaderboard-store";
import { MemoryAccountStore } from "../backend/memory-account-store";
import { MemoryLedgerStore } from "../backend/memory-ledger";
import { MemoryOpsStore } from "../backend/ops-store";
import { StaticSsvKeyProvider } from "../backend/ssv";
import type { PurchaseVerifier } from "../backend/types";

const PROD_ADMOB_APP_ID = "ca-app-pub-6035003811280283~7349136854";

const noopVerifier: PurchaseVerifier = {
  async verify() {
    throw new Error("not used");
  }
};

function createFixture() {
  const accounts = new MemoryAccountStore();
  accounts.upsertBootstrapAccount({
    email: "owner@test.app",
    password: "OwnerPassword!234",
    role: "admin"
  });
  const leaderboard = new MemoryLeaderboardStore();
  const handler = createApiHandler({
    verifier: noopVerifier,
    ledger: new MemoryLedgerStore(),
    accounts,
    leaderboard,
    rewards: leaderboard,
    ssvKeys: new StaticSsvKeyProvider(new Map()),
    ops: new MemoryOpsStore(accounts)
  });
  return { accounts, handler };
}

type Handler = ReturnType<typeof createFixture>["handler"];

async function call(
  handler: Handler,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const response = await handler(
    new Request(`https://api.example${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    })
  );
  return {
    status: response.status,
    headers: response.headers,
    body: (await response.json().catch(() => null)) as any
  };
}

async function login(handler: Handler, email: string, password: string) {
  const result = await call(handler, "POST", "/v1/auth/login", {
    email,
    password,
    installId: "build17-test"
  });
  return result.body.token as string;
}

function readAppJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8")) as {
    expo: { plugins: Array<string | [string, Record<string, unknown>]> };
  };
}

function assertNativePlugins(path: string) {
  const config = readAppJson(path);
  const plugins = config.expo.plugins;
  const ads = plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === "react-native-google-mobile-ads"
  ) as [string, Record<string, unknown>] | undefined;
  assert.ok(ads, `${path} must declare the react-native-google-mobile-ads plugin`);
  assert.equal(ads[1].iosAppId, PROD_ADMOB_APP_ID, `${path} iOS AdMob app ID`);
  assert.equal(ads[1].androidAppId, PROD_ADMOB_APP_ID, `${path} Android AdMob app ID`);
  const iap = plugins.find(
    (plugin) => plugin === "react-native-iap" || (Array.isArray(plugin) && plugin[0] === "react-native-iap")
  );
  assert.ok(iap, `${path} must declare the react-native-iap plugin`);
}

test("vaultpop app.json declares native ads and IAP config plugins", () => {
  assertNativePlugins("app.json");
});

test("EAS harness frontend/app.json declares native ads and IAP config plugins", (t) => {
  // The Emergent build harness lives beside this repo; skip when the source
  // is exported standalone.
  if (!existsSync("../frontend/app.json")) {
    t.skip("frontend harness not present in this checkout");
    return;
  }
  assertNativePlugins("../frontend/app.json");
});

test("admin handoff issues single-use codes and cookie-backed admin sessions", async () => {
  const { handler } = createFixture();
  const adminToken = await login(handler, "owner@test.app", "OwnerPassword!234");

  const handoff = await call(handler, "POST", "/v1/admin/handoff", undefined, {
    Authorization: `Bearer ${adminToken}`
  });
  assert.equal(handoff.status, 201);
  assert.equal(typeof handoff.body.code, "string");
  assert.ok(handoff.body.code.length >= 32);

  // Consuming the code sets the secure admin cookie and redirects to /admin.
  const consume = await handler(
    new Request(
      `https://api.example/admin/handoff?code=${encodeURIComponent(handoff.body.code)}`
    )
  );
  assert.equal(consume.status, 303);
  assert.equal(consume.headers.get("location"), "/admin");
  const cookie = consume.headers.get("set-cookie") ?? "";
  assert.match(cookie, /^vp_admin=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);

  // Codes are single-use: a replay gets no cookie.
  const replay = await handler(
    new Request(
      `https://api.example/admin/handoff?code=${encodeURIComponent(handoff.body.code)}`
    )
  );
  assert.equal(replay.status, 303);
  assert.equal(replay.headers.get("set-cookie"), null);

  // The cookie session authenticates admin APIs without a bearer token.
  const cookieValue = cookie.split(";")[0] ?? "";
  const analytics = await call(handler, "GET", "/v1/admin/analytics", undefined, {
    Cookie: cookieValue
  });
  assert.equal(analytics.status, 200);
  assert.ok(analytics.body.support);

  // Logout revokes the cookie session and clears the cookie.
  const logout = await call(handler, "POST", "/v1/auth/logout", undefined, {
    Cookie: cookieValue
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie") ?? "", /Max-Age=0/);
  const afterLogout = await call(handler, "GET", "/v1/admin/analytics", undefined, {
    Cookie: cookieValue
  });
  assert.equal(afterLogout.status, 403);
});

test("player accounts cannot mint admin handoff codes", async () => {
  const { handler } = createFixture();
  await call(handler, "POST", "/v1/auth/register", {
    email: "player.b17@test.app",
    password: "PlayerPassword!234",
    installId: "build17-player"
  });
  const playerToken = await login(handler, "player.b17@test.app", "PlayerPassword!234");
  const handoff = await call(handler, "POST", "/v1/admin/handoff", undefined, {
    Authorization: `Bearer ${playerToken}`
  });
  assert.equal(handoff.status, 403);

  const anonymous = await call(handler, "POST", "/v1/admin/handoff");
  assert.equal(anonymous.status, 403);
});

test("invalid or expired handoff codes never set an admin cookie", async () => {
  const { handler } = createFixture();
  const bogus = await handler(
    new Request("https://api.example/admin/handoff?code=not-a-real-code")
  );
  assert.equal(bogus.status, 303);
  assert.equal(bogus.headers.get("set-cookie"), null);
  const missing = await handler(new Request("https://api.example/admin/handoff"));
  assert.equal(missing.status, 303);
  assert.equal(missing.headers.get("set-cookie"), null);
});

test("admin console screens use the in-app WebView flow, not external Linking", () => {
  const account = readFileSync("src/screens/account-screen.tsx", "utf8");
  const settings = readFileSync("src/screens/settings-screen.tsx", "utf8");
  const console = readFileSync("src/screens/admin-console-screen.tsx", "utf8");

  assert.ok(!account.includes("Linking.openURL(ADMIN_CONSOLE_URL)"));
  assert.ok(!settings.includes("Linking.openURL(ADMIN_CONSOLE_URL)"));
  assert.ok(account.includes('href="/admin-console"'));
  assert.ok(settings.includes('href="/admin-console"'));

  assert.ok(console.includes("react-native-webview"));
  assert.ok(console.includes("requestAdminConsoleHandoffUrl"));
  // Role gating: non-admins get the restricted view.
  assert.ok(console.includes('profile.account.role === "admin"'));
  // No raw session token in any URL.
  assert.ok(!console.includes("sessionToken}`"));
});
