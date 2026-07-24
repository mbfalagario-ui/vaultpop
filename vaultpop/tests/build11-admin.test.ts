import assert from "node:assert/strict";
import test from "node:test";

import { adminPage } from "../backend/admin-page";
import { createApiHandler } from "../backend/app";
import { MemoryLeaderboardStore } from "../backend/leaderboard-store";
import { MemoryAccountStore } from "../backend/memory-account-store";
import { MemoryLedgerStore } from "../backend/memory-ledger";
import { MemoryOpsStore } from "../backend/ops-store";
import { StaticSsvKeyProvider } from "../backend/ssv";
import type { PurchaseVerifier } from "../backend/types";

const coinVerifier: PurchaseVerifier = {
  async verify() {
    return {
      transactionId: "txn-analytics-1",
      productId: "app.vaultpop.coins.small",
      expiresAt: null,
      revokedAt: null
    };
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
    verifier: coinVerifier,
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
  token?: string
) {
  const response = await handler(
    new Request(`https://api.example${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    })
  );
  return {
    status: response.status,
    body: (await response.json().catch(() => null)) as any
  };
}

async function adminToken(handler: Handler): Promise<string> {
  const login = await call(handler, "POST", "/v1/auth/login", {
    email: "owner@test.app",
    password: "OwnerPassword!234",
    installId: "web-admin"
  });
  return login.body.token as string;
}

async function registerPlayer(handler: Handler, email: string, installId: string) {
  const result = await call(handler, "POST", "/v1/auth/register", {
    email,
    password: "PlayerPassword!234",
    installId
  });
  return { token: result.body.token as string, accountId: result.body.state.account.id as string };
}

test("support inbox: admin-only list, detail, reply, close/reopen, and escalation visibility", async () => {
  const { handler } = createFixture();
  const admin = await adminToken(handler);
  const player = await registerPlayer(handler, "player1@test.app", "install-player-1");

  const created = await call(handler, "POST", "/v1/support/tickets", {
    installId: "install-player-1",
    category: "Ads issue",
    message: "I watched a rewarded ad and got nothing at all.",
    email: "player1@test.app",
    appVersion: "1.0.0",
    buildNumber: "11",
    deviceInfo: "Apple iPhone",
    escalated: true
  });
  assert.equal(created.status, 201);
  const ticketId = created.body.ticketId as string;
  assert.match(ticketId, /^VP-\d{6}$/);

  // Player and anonymous callers are locked out of the inbox.
  const denied = await call(handler, "GET", "/v1/admin/support/tickets", undefined, player.token);
  assert.equal(denied.status, 403);
  const anonymous = await call(handler, "GET", "/v1/admin/support/tickets");
  assert.equal(anonymous.status, 403);

  const list = await call(handler, "GET", "/v1/admin/support/tickets", undefined, admin);
  assert.equal(list.status, 200);
  assert.equal(list.body.tickets.length, 1);
  assert.equal(list.body.tickets[0].status, "open");
  assert.equal(list.body.tickets[0].escalated, true);
  assert.equal(list.body.tickets[0].email, "player1@test.app");

  const escalated = await call(
    handler,
    "GET",
    "/v1/admin/support/tickets?status=escalated",
    undefined,
    admin
  );
  assert.equal(escalated.body.tickets.length, 1);

  const detail = await call(handler, "GET", `/v1/admin/support/tickets/${ticketId}`, undefined, admin);
  assert.equal(detail.status, 200);
  assert.deepEqual(detail.body.ticket.replies, []);

  const badReply = await call(
    handler,
    "POST",
    `/v1/admin/support/tickets/${ticketId}/reply`,
    { message: "" },
    admin
  );
  assert.equal(badReply.status, 400);

  const reply = await call(
    handler,
    "POST",
    `/v1/admin/support/tickets/${ticketId}/reply`,
    { message: "Rewards need the ad network confirmation — try once more." },
    admin
  );
  assert.equal(reply.status, 200);
  assert.equal(reply.body.ticket.replies.length, 1);
  assert.equal(reply.body.ticket.replies[0].author, "admin");

  const closed = await call(
    handler,
    "POST",
    `/v1/admin/support/tickets/${ticketId}/status`,
    { status: "closed" },
    admin
  );
  assert.equal(closed.body.ticket.status, "closed");
  const openList = await call(
    handler,
    "GET",
    "/v1/admin/support/tickets?status=open",
    undefined,
    admin
  );
  assert.equal(openList.body.tickets.length, 0);

  const reopened = await call(
    handler,
    "POST",
    `/v1/admin/support/tickets/${ticketId}/status`,
    { status: "open" },
    admin
  );
  assert.equal(reopened.body.ticket.status, "open");

  const playerReply = await call(
    handler,
    "POST",
    `/v1/admin/support/tickets/${ticketId}/reply`,
    { message: "not allowed" },
    player.token
  );
  assert.equal(playerReply.status, 403);
});

test("analytics: 24h ad aggregation by reward type and safe purchase metrics", async () => {
  const { handler } = createFixture();
  const admin = await adminToken(handler);
  const player = await registerPlayer(handler, "player2@test.app", "install-player-2");

  for (const event of [
    { event: "granted", rewardType: "bonus_life" },
    { event: "granted", rewardType: "bonus_life" },
    { event: "granted", rewardType: "vault_coins" },
    { event: "failed", rewardType: "bonus_life" }
  ]) {
    const recorded = await call(handler, "POST", "/v1/ads/events", {
      installId: "install-player-2",
      ...event
    });
    assert.equal(recorded.status, 202);
  }
  const invalid = await call(handler, "POST", "/v1/ads/events", {
    installId: "install-player-2",
    event: "hacked",
    rewardType: "bonus_life"
  });
  assert.equal(invalid.status, 400);

  const purchase = await call(handler, "POST", "/v1/purchases/verify", {
    installId: "install-player-2",
    signedTransaction: "signed-jws"
  });
  assert.equal(purchase.status, 200);

  const forbidden = await call(handler, "GET", "/v1/admin/analytics", undefined, player.token);
  assert.equal(forbidden.status, 403);

  const analytics = await call(handler, "GET", "/v1/admin/analytics", undefined, admin);
  assert.equal(analytics.status, 200);
  assert.equal(analytics.body.ads.granted24h, 3);
  assert.equal(analytics.body.ads.failed24h, 1);
  assert.deepEqual(analytics.body.ads.byType, { bonusLife: 2, vaultCoins: 1 });
  assert.equal(analytics.body.ads.dailyCap, 30);
  assert.equal(analytics.body.ads.ssvUrl, "https://vaultpop-api.fly.dev/support");
  assert.equal(
    analytics.body.ads.adUnits.bonusLife,
    "ca-app-pub-6035003811280283/3409891849"
  );
  assert.equal(
    analytics.body.ads.adUnits.vaultCoins,
    "ca-app-pub-6035003811280283/9333822278"
  );
  assert.equal(analytics.body.purchases.total, 1);
  assert.equal(analytics.body.purchases.last24h, 1);
  assert.equal(analytics.body.purchases.estimatedGrossUsd, 0.99);
  assert.equal(
    analytics.body.purchases.revenueNote,
    "Estimated gross based on configured product prices."
  );
  assert.ok(Array.isArray(analytics.body.support.categoriesCovered));
  assert.ok(analytics.body.support.categoriesCovered.length >= 8);
});

test("ban and unban: admin-only, blocks sign-in and sync, restores access, audited", async () => {
  const { handler } = createFixture();
  const admin = await adminToken(handler);
  const player = await registerPlayer(handler, "player3@test.app", "install-player-3");

  const playerAttempt = await call(
    handler,
    "POST",
    `/v1/admin/accounts/${player.accountId}/disable`,
    { reason: "nope" },
    player.token
  );
  assert.equal(playerAttempt.status, 403);

  const banned = await call(
    handler,
    "POST",
    `/v1/admin/accounts/${player.accountId}/disable`,
    { reason: "Abusive support messages" },
    admin
  );
  assert.equal(banned.status, 200);
  assert.equal(banned.body.state.account.active, false);

  // Existing session revoked and sync blocked.
  const sync = await call(handler, "GET", "/v1/account", undefined, player.token);
  assert.equal(sync.status, 401);
  // Sign-in blocked while banned.
  const bannedLogin = await call(handler, "POST", "/v1/auth/login", {
    email: "player3@test.app",
    password: "PlayerPassword!234",
    installId: "install-player-3"
  });
  assert.equal(bannedLogin.status, 401);

  const restored = await call(
    handler,
    "POST",
    `/v1/admin/accounts/${player.accountId}/enable`,
    { reason: "Appeal accepted" },
    admin
  );
  assert.equal(restored.status, 200);
  assert.equal(restored.body.state.account.active, true);

  const loginAgain = await call(handler, "POST", "/v1/auth/login", {
    email: "player3@test.app",
    password: "PlayerPassword!234",
    installId: "install-player-3"
  });
  assert.equal(loginAgain.status, 200);

  const audit = await call(handler, "GET", "/v1/admin/audit", undefined, admin);
  const actions = audit.body.entries.map((entry: any) => entry.action);
  assert.ok(actions.includes("account.disable"));
  assert.ok(actions.includes("account.enable"));
  const banEntry = audit.body.entries.find((entry: any) => entry.action === "account.disable");
  assert.equal(banEntry.reason, "Abusive support messages");
});

test("password reset: non-revealing user request, admin-assisted reset, no plaintext exposure", async () => {
  const { handler } = createFixture();
  const admin = await adminToken(handler);
  const player = await registerPlayer(handler, "player4@test.app", "install-player-4");

  const invalid = await call(handler, "POST", "/v1/auth/password-reset", { email: "nope" });
  assert.equal(invalid.status, 400);

  const unknown = await call(handler, "POST", "/v1/auth/password-reset", {
    email: "ghost@test.app"
  });
  const known = await call(handler, "POST", "/v1/auth/password-reset", {
    email: "player4@test.app"
  });
  assert.equal(unknown.status, 200);
  assert.equal(known.status, 200);
  // Identical responses: never reveal whether the account exists.
  assert.deepEqual(unknown.body, known.body);

  const playerList = await call(handler, "GET", "/v1/admin/password-resets", undefined, player.token);
  assert.equal(playerList.status, 403);

  const requests = await call(handler, "GET", "/v1/admin/password-resets", undefined, admin);
  assert.equal(requests.status, 200);
  assert.equal(requests.body.requests.length, 1);
  assert.equal(requests.body.requests[0].email, "player4@test.app");
  assert.equal(requests.body.requests[0].status, "pending");

  const temporaryPassword = "TemporaryReset!9876";
  const reset = await call(
    handler,
    "POST",
    `/v1/admin/accounts/${player.accountId}/password`,
    { password: temporaryPassword, reason: "Admin-assisted reset" },
    admin
  );
  assert.equal(reset.status, 200);
  // No plaintext password or hash material in the response.
  const serialized = JSON.stringify(reset.body);
  assert.ok(!serialized.includes(temporaryPassword));
  assert.ok(!serialized.includes("passwordHash"));

  // Old sessions revoked; new password works.
  const oldSession = await call(handler, "GET", "/v1/account", undefined, player.token);
  assert.equal(oldSession.status, 401);
  const newLogin = await call(handler, "POST", "/v1/auth/login", {
    email: "player4@test.app",
    password: temporaryPassword,
    installId: "install-player-4"
  });
  assert.equal(newLogin.status, 200);

  const requestId = requests.body.requests[0].id as string;
  const handled = await call(
    handler,
    "POST",
    `/v1/admin/password-resets/${requestId}/handled`,
    {},
    admin
  );
  assert.equal(handled.status, 200);
  assert.equal(handled.body.request.status, "handled");

  const analytics = await call(handler, "GET", "/v1/admin/analytics", undefined, admin);
  assert.equal(analytics.body.passwordResets.pending, 0);
});

test("admin console page ships operator sections without raw JSON dumps", async () => {
  const response = adminPage();
  const html = await response.text();
  for (const marker of [
    "Support Tickets",
    "Support Inbox",
    "AI Support Agent",
    "Rewarded Ads (24h)",
    "Purchases &amp; Premium",
    "User Management",
    "Password Resets",
    "Audit Log",
    "Restricted Access",
    "Ban User",
    "Set Temporary Password"
  ]) {
    assert.ok(html.includes(marker), `admin page must include "${marker}"`);
  }
  // Old raw JSON state dump removed as primary UI.
  assert.ok(!html.includes('<pre id="state"'));
  assert.ok(!html.includes("await response.json()"));
  assert.ok(
    response.headers.get("Content-Security-Policy")?.includes("frame-ancestors 'none'")
  );
});
