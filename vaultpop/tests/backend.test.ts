import assert from "node:assert/strict";
import test from "node:test";

import { createApiHandler } from "../backend/app";
import { MemoryAccountStore } from "../backend/memory-account-store";
import { MemoryLedgerStore } from "../backend/memory-ledger";
import { SqliteAccountStore } from "../backend/sqlite-account-store";
import type { PurchaseVerifier } from "../backend/types";

const verifier: PurchaseVerifier = {
  async verify(signedTransaction) {
    if (signedTransaction === "invalid") {
      throw new Error("Invalid signature.");
    }
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
  accounts.upsertBootstrapAccount({
    email: "reviewer@example.com",
    password: "reviewer-test-password",
    role: "reviewer",
    initialBalance: {
      vaultCoins: 1_000,
      bonusLives: 5,
      chainBoosts: 5,
      vaultBursts: 3
    }
  });
  return {
    accounts,
    handler: createApiHandler({
      verifier,
      ledger: new MemoryLedgerStore(),
      accounts
    })
  };
}

test("backend health, verification, ledger idempotency, and support endpoints", async () => {
  const { handler } = createTestApi();

  const health = await handler(new Request("https://api.example/health"));
  assert.equal(health.status, 200);

  const verifyRequest = () =>
    new Request("https://api.example/v1/purchases/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        installId: "vp-test",
        signedTransaction: "transaction-one"
      })
    });
  assert.equal((await handler(verifyRequest())).status, 200);
  assert.equal((await handler(verifyRequest())).status, 200);

  const ledger = await handler(
    new Request("https://api.example/v1/ledger?installId=vp-test")
  );
  assert.equal((await ledger.json()).vaultCoins, 1_000);

  const invalid = await handler(
    new Request("https://api.example/v1/purchases/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        installId: "vp-test",
        signedTransaction: "invalid"
      })
    })
  );
  assert.equal(invalid.status, 422);

  const support = await handler(
    new Request("https://api.example/v1/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        installId: "vp-test",
        category: "Bug report",
        message: "The board stopped responding after a combo.",
        appVersion: "1.0.0",
        buildNumber: "1",
        deviceInfo: "Apple iPhone",
        priority: false
      })
    })
  );
  assert.equal(support.status, 201);
  assert.match((await support.json()).ticketId, /^VP-/);
});

test("subscription restore on another install does not replay monthly inventory", async () => {
  const subscriptionVerifier: PurchaseVerifier = {
    async verify() {
      return {
        transactionId: "subscription-renewal-one",
        productId: "app.vaultpop.vaultpass.monthly",
        expiresAt: "2099-07-01T00:00:00.000Z",
        revokedAt: null
      };
    }
  };
  const handler = createApiHandler({
    verifier: subscriptionVerifier,
    ledger: new MemoryLedgerStore(),
    accounts: new MemoryAccountStore()
  });
  const verifyFor = async (installId: string) => {
    const response = await handler(
      new Request("https://api.example/v1/purchases/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installId, signedTransaction: "signed-jws" })
      })
    );
    return response.json();
  };
  const first = await verifyFor("vp-first");
  const restored = await verifyFor("vp-restored");
  assert.equal(first.grant.bonusLives, 10);
  assert.equal(restored.grant.bonusLives, undefined);
  assert.equal(restored.grant.premiumTheme, true);
});

test("required account bootstrap is idempotent and both roles can sign in", async () => {
  const accounts = new MemoryAccountStore();
  const firstAdmin = accounts.upsertBootstrapAccount({
    email: "admin@example.com",
    password: "admin-test-password",
    role: "admin"
  });
  const secondAdmin = accounts.upsertBootstrapAccount({
    email: "admin@example.com",
    password: "admin-test-password",
    role: "admin"
  });
  const firstReviewer = accounts.upsertBootstrapAccount({
    email: "reviewer@example.com",
    password: "reviewer-test-password",
    role: "reviewer",
    initialBalance: { vaultCoins: 1_000, bonusLives: 5, chainBoosts: 5, vaultBursts: 3 }
  });
  const secondReviewer = accounts.upsertBootstrapAccount({
    email: "reviewer@example.com",
    password: "reviewer-test-password",
    role: "reviewer",
    initialBalance: { vaultCoins: 1_000, bonusLives: 5, chainBoosts: 5, vaultBursts: 3 }
  });

  assert.equal(firstAdmin.id, secondAdmin.id);
  assert.equal(firstReviewer.id, secondReviewer.id);
  assert.equal(accounts.listAccounts().length, 2);
  assert.ok(
    accounts.login({
      email: "admin@example.com",
      password: "admin-test-password",
      installId: "admin-install"
    })
  );
  const reviewerLogin = accounts.login({
    email: "reviewer@example.com",
    password: "reviewer-test-password",
    installId: "reviewer-install"
  });
  assert.equal(reviewerLogin?.state.balance.vaultCoins, 1_000);
  assert.equal(reviewerLogin?.state.balance.vaultBursts, 3);
});

test("SQLite account bootstrap and login use the production schema", () => {
  const accounts = new SqliteAccountStore(":memory:");
  const first = accounts.upsertBootstrapAccount({
    email: "reviewer@example.com",
    password: "reviewer-test-password",
    role: "reviewer",
    initialBalance: { vaultCoins: 1_000, bonusLives: 5, chainBoosts: 5, vaultBursts: 3 }
  });
  const second = accounts.upsertBootstrapAccount({
    email: "reviewer@example.com",
    password: "reviewer-test-password",
    role: "reviewer",
    initialBalance: { vaultCoins: 1_000, bonusLives: 5, chainBoosts: 5, vaultBursts: 3 }
  });
  assert.equal(first.id, second.id);
  const session = accounts.login({
    email: "reviewer@example.com",
    password: "reviewer-test-password",
    installId: "sqlite-reviewer-install"
  });
  assert.equal(session?.state.linkedInstallId, "sqlite-reviewer-install");
  assert.equal(session?.state.balance.bonusLives, 5);
  assert.equal(accounts.listAccounts({ query: "sqlite-reviewer-install" }).length, 1);
});

test("admin mutations require admin role, enforce non-negative balances, and audit changes", async () => {
  const { accounts, handler } = createTestApi();
  const login = async (email: string, password: string, installId: string) => {
    const response = await handler(
      new Request("https://api.example/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, installId })
      })
    );
    assert.equal(response.status, 200);
    return (await response.json()) as {
      token: string;
      state: { account: { id: string } };
    };
  };
  const admin = await login(
    "admin@example.com",
    "admin-test-password",
    "admin-install"
  );
  const reviewer = await login(
    "reviewer@example.com",
    "reviewer-test-password",
    "reviewer-install"
  );
  const mutate = (
    token: string,
    delta: Record<string, number>
  ) =>
    handler(
      new Request(
        `https://api.example/v1/admin/accounts/${reviewer.state.account.id}/inventory`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ delta, reason: "Automated test" })
        }
      )
    );

  assert.equal((await mutate(reviewer.token, { vaultCoins: 1 })).status, 403);
  const grant = await mutate(admin.token, {
    vaultCoins: 250,
    bonusLives: 2,
    chainBoosts: 1,
    vaultBursts: 1
  });
  assert.equal(grant.status, 200);
  const grantedState = ((await grant.json()) as any).state;
  assert.equal(grantedState.balance.vaultCoins, 1_250);
  assert.equal(grantedState.balance.bonusLives, 7);

  const remove = await mutate(admin.token, {
    vaultCoins: -50,
    bonusLives: -1,
    chainBoosts: 0,
    vaultBursts: 0
  });
  assert.equal(remove.status, 200);
  assert.equal(((await remove.json()) as any).state.balance.vaultCoins, 1_200);

  assert.equal(
    (
      await mutate(admin.token, {
        vaultCoins: -10_000,
        bonusLives: 0,
        chainBoosts: 0,
        vaultBursts: 0
      })
    ).status,
    422
  );
  assert.equal(accounts.listAudit(accounts.authenticate(admin.token)!).length, 2);
});
