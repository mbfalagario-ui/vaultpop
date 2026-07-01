import assert from "node:assert/strict";
import test from "node:test";

import { createApiHandler } from "../backend/app";
import { MemoryLedgerStore } from "../backend/memory-ledger";
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

test("backend health, verification, ledger idempotency, and support endpoints", async () => {
  const handler = createApiHandler({
    verifier,
    ledger: new MemoryLedgerStore()
  });

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
    ledger: new MemoryLedgerStore()
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
