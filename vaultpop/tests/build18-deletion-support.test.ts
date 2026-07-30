import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createApiHandler } from "../backend/app";
import { MemoryLeaderboardStore } from "../backend/leaderboard-store";
import { MemoryAccountStore } from "../backend/memory-account-store";
import { MemoryLedgerStore } from "../backend/memory-ledger";
import { MemoryOpsStore } from "../backend/ops-store";
import { StaticSsvKeyProvider } from "../backend/ssv";
import type { PurchaseVerifier } from "../backend/types";

const verifier: PurchaseVerifier = {
  async verify(signedTransaction) {
    return {
      transactionId: signedTransaction,
      productId: "app.vaultpop.coins.small",
      expiresAt: null,
      revokedAt: null
    };
  }
};

function createTestApi() {
  const accounts = new MemoryAccountStore();
  accounts.upsertBootstrapAccount({
    email: "admin@example.com",
    password: "admin-test-password",
    role: "admin"
  });
  const leaderboard = new MemoryLeaderboardStore();
  const ops = new MemoryOpsStore(accounts);
  return {
    accounts,
    leaderboard,
    ops,
    handler: createApiHandler({
      verifier,
      ledger: new MemoryLedgerStore(),
      accounts,
      leaderboard,
      rewards: leaderboard,
      ssvKeys: new StaticSsvKeyProvider(new Map()),
      ops
    })
  };
}

type Handler = ReturnType<typeof createTestApi>["handler"];

let ipCounter = 0;
function nextIp(): string {
  ipCounter += 1;
  return `10.9.${Math.floor(ipCounter / 200)}.${ipCounter % 200}`;
}

async function register(
  handler: Handler,
  email: string,
  password: string,
  installId: string
): Promise<{ token: string }> {
  const response = await handler(
    new Request("https://api.example/v1/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": nextIp()
      },
      body: JSON.stringify({ email, password, installId })
    })
  );
  assert.equal(response.status, 201);
  return (await response.json()) as { token: string };
}

async function login(
  handler: Handler,
  email: string,
  password: string,
  installId: string
): Promise<Response> {
  return handler(
    new Request("https://api.example/v1/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": nextIp()
      },
      body: JSON.stringify({ email, password, installId })
    })
  );
}

function deleteRequest(
  token: string | null,
  body: Record<string, unknown>,
  ip = nextIp()
): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-forwarded-for": ip
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return new Request("https://api.example/v1/account/delete", {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
}

async function createTicket(
  handler: Handler,
  installId: string,
  message: string
): Promise<Response> {
  return handler(
    new Request("https://api.example/v1/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        installId,
        category: "Bug report",
        message,
        appVersion: "1.0.0",
        buildNumber: "18",
        deviceInfo: "Apple iPhone",
        priority: false
      })
    })
  );
}

test("account deletion requires auth, typed confirmation, and correct password", async () => {
  const { handler } = createTestApi();
  const password = "delete-me-please-123";
  const { token } = await register(
    handler,
    "deleter@example.com",
    password,
    "install-del-1"
  );

  // Unauthenticated deletion rejected.
  const noAuth = await handler(deleteRequest(null, { password, confirm: "DELETE" }));
  assert.equal(noAuth.status, 401);

  // Missing typed confirmation rejected.
  const noConfirm = await handler(deleteRequest(token, { password }));
  assert.equal(noConfirm.status, 400);

  // Wrong confirmation text rejected.
  const badConfirm = await handler(
    deleteRequest(token, { password, confirm: "delete" })
  );
  assert.equal(badConfirm.status, 400);

  // Wrong password (invalid reauthentication) rejected.
  const badPassword = await handler(
    deleteRequest(token, { password: "wrong-password-123", confirm: "DELETE" })
  );
  assert.equal(badPassword.status, 403);

  // Valid deletion succeeds.
  const deleted = await handler(deleteRequest(token, { password, confirm: "DELETE" }));
  assert.equal(deleted.status, 200);
  assert.equal((await deleted.json()).deleted, true);

  // Sessions are revoked: the old token no longer authenticates.
  const stale = await handler(
    new Request("https://api.example/v1/account", {
      headers: { Authorization: `Bearer ${token}` }
    })
  );
  assert.equal(stale.status, 401);

  // The account is gone and is NOT recreated by signing in or syncing.
  const reLogin = await login(handler, "deleter@example.com", password, "install-del-1");
  assert.equal(reLogin.status, 401);
});

test("repeated wrong-password deletion attempts are rate limited", async () => {
  const { handler } = createTestApi();
  const password = "brute-force-target-99";
  const { token } = await register(
    handler,
    "bruteforce@example.com",
    password,
    "install-brute-1"
  );
  const ip = nextIp();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await handler(
      deleteRequest(token, { password: "wrong-password-123", confirm: "DELETE" }, ip)
    );
    assert.equal(response.status, 403);
  }
  const blocked = await handler(
    deleteRequest(token, { password, confirm: "DELETE" }, ip)
  );
  assert.equal(blocked.status, 429);
});

test("horizontal deletion is impossible and the owner account is protected", async () => {
  const { handler, accounts } = createTestApi();
  const passwordA = "player-a-password-1";
  const passwordB = "player-b-password-1";
  const a = await register(handler, "player.a@example.com", passwordA, "install-a");
  const b = await register(handler, "player.b@example.com", passwordB, "install-b");

  // A deletes A. The endpoint has no target parameter, so B is untouched.
  const deleted = await handler(
    deleteRequest(a.token, { password: passwordA, confirm: "DELETE" })
  );
  assert.equal(deleted.status, 200);
  const bState = await handler(
    new Request("https://api.example/v1/account", {
      headers: { Authorization: `Bearer ${b.token}` }
    })
  );
  assert.equal(bState.status, 200);
  assert.equal(
    (await login(handler, "player.b@example.com", passwordB, "install-b")).status,
    200
  );

  // The bootstrap owner account can never be deleted from the app.
  const ownerPassword = "owner-protected-pass-1";
  accounts.upsertBootstrapAccount({
    email: "mbfalagario@gmail.com",
    password: ownerPassword,
    role: "admin"
  });
  const ownerLogin = await login(
    handler,
    "mbfalagario@gmail.com",
    ownerPassword,
    "install-owner"
  );
  assert.equal(ownerLogin.status, 200);
  const ownerToken = ((await ownerLogin.json()) as { token: string }).token;
  const ownerDelete = await handler(
    deleteRequest(ownerToken, { password: ownerPassword, confirm: "DELETE" })
  );
  assert.equal(ownerDelete.status, 400);
  assert.match((await ownerDelete.json()).error, /owner account/i);
});

test("deletion purges leaderboard identity, tickets, reset requests, and entitlement linkage", async () => {
  const { handler, ops } = createTestApi();
  const password = "wipe-me-completely-1";
  const email = "wiped@example.com";
  const installId = "install-wipe-1";
  const { token } = await register(handler, email, password, installId);

  // Leaderboard identity.
  const submit = await handler(
    new Request("https://api.example/v1/leaderboard/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        installId,
        handle: "WipedPlayer",
        mode: "classic",
        score: 4200
      })
    })
  );
  assert.equal(submit.status, 200);

  // Support ticket + pending password reset.
  assert.equal((await createTicket(handler, installId, "Please help with a bug I found.")).status, 201);
  ops.createPasswordResetRequest(email);
  assert.equal(ops.countPendingPasswordResets(), 1);

  const deleted = await handler(deleteRequest(token, { password, confirm: "DELETE" }));
  assert.equal(deleted.status, 200);

  // Leaderboard entries for the install are gone.
  const board = await handler(
    new Request("https://api.example/v1/leaderboard?mode=classic")
  );
  const entries = ((await board.json()) as { entries: { handle: string }[] }).entries;
  assert.equal(entries.some((entry) => entry.handle === "WipedPlayer"), false);

  // Tickets and reset requests are purged.
  assert.equal(ops.listTickets().length, 0);
  assert.equal(ops.countPendingPasswordResets(), 0);

  // No lingering entitlement/inventory linkage for the account.
  const entitlements = await handler(
    new Request(`https://api.example/v1/entitlements?installId=${installId}`)
  );
  const balance = (await entitlements.json()) as { vaultCoins: number; adFree: boolean };
  assert.equal(balance.vaultCoins, 0);
  assert.equal(balance.adFree, false);
});

test("support tickets route as Standard or Premium and stay filterable without email delivery", async () => {
  const { handler, accounts } = createTestApi();

  // Standard: free user with no VaultPass. Free users are never denied support.
  const standard = await createTicket(
    handler,
    "install-standard-1",
    "Standard tier question about gameplay."
  );
  assert.equal(standard.status, 201);

  // Premium: player with an active VaultPass entitlement on the linked account.
  const password = "premium-player-pass-1";
  await register(handler, "premium@example.com", password, "install-premium-1");
  const adminLogin = await login(
    handler,
    "admin@example.com",
    "admin-test-password",
    "install-admin"
  );
  const adminToken = ((await adminLogin.json()) as { token: string }).token;
  const premiumAccount = accounts
    .listAccounts({ query: "premium@example.com" })
    .find((state) => state.account.email === "premium@example.com");
  assert.ok(premiumAccount);
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000).toISOString();
  const entitle = await handler(
    new Request(
      `https://api.example/v1/admin/accounts/${premiumAccount!.account.id}/entitlements`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ vaultPassExpiresAt: future })
      }
    )
  );
  assert.equal(entitle.status, 200);
  const premium = await createTicket(
    handler,
    "install-premium-1",
    "Premium tier question about my VaultPass."
  );
  assert.equal(premium.status, 201);

  // Admin Console visibility + tier filtering through the real admin API.
  const listTickets = async (filter?: string) => {
    const response = await handler(
      new Request(
        `https://api.example/v1/admin/support/tickets${filter ? `?status=${filter}` : ""}`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      )
    );
    assert.equal(response.status, 200);
    return ((await response.json()) as {
      tickets: {
        installId: string;
        tier: string;
        priority: boolean;
        source: string;
        emailDelivery: string;
      }[];
    }).tickets;
  };

  const all = await listTickets();
  assert.equal(all.length, 2);
  // Email delivery is not configured; the ticket persists regardless — email
  // state can never lose a ticket because storage is database-first.
  for (const ticket of all) {
    assert.equal(ticket.source, "in-app");
    assert.equal(ticket.emailDelivery, "not_configured");
  }

  const premiumOnly = await listTickets("premium");
  assert.equal(premiumOnly.length, 1);
  assert.equal(premiumOnly[0]!.installId, "install-premium-1");
  assert.equal(premiumOnly[0]!.tier, "premium");
  assert.equal(premiumOnly[0]!.priority, true);

  const standardOnly = await listTickets("standard");
  assert.equal(standardOnly.length, 1);
  assert.equal(standardOnly[0]!.installId, "install-standard-1");
  assert.equal(standardOnly[0]!.tier, "standard");
});

test("Delete Account is reachable in-app with warnings, reauth, and local wipe", () => {
  const accountScreen = readFileSync("src/screens/account-screen.tsx", "utf8");
  assert.ok(accountScreen.includes("Delete Account"));
  assert.ok(accountScreen.includes("/delete-account"));

  const deleteScreen = readFileSync("src/screens/delete-account-screen.tsx", "utf8");
  assert.ok(deleteScreen.includes("Permanently Delete Account"));
  assert.ok(deleteScreen.includes('confirmText.trim() === "DELETE"'));
  assert.ok(deleteScreen.includes("delete-account-password-input"));
  assert.ok(deleteScreen.includes("apps.apple.com/account/subscriptions"));
  assert.ok(deleteScreen.includes("does NOT cancel an Apple subscription"));
  assert.ok(deleteScreen.includes("createDefaultSaveProfile()"));

  const route = readFileSync("app/delete-account.tsx", "utf8");
  assert.ok(route.includes("DeleteAccountScreen"));

  const service = readFileSync("src/account/account-service.ts", "utf8");
  assert.ok(service.includes("/v1/account/delete"));
  assert.ok(service.includes('confirm: "DELETE"'));
});
