import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  applyAccountLogin,
  clearAccountSession
} from "../src/account/account-service";
import { IAP_PRODUCTS } from "../src/monetization/catalog";
import {
  createCatalogLoader,
  mergeCatalogs
} from "../src/monetization/catalog-loader";
import { applyVerifiedPurchase } from "../src/monetization/economy";
import { hasActiveVaultPass } from "../src/monetization/entitlements";
import {
  createDefaultSaveProfile,
  normalizeSaveProfile
} from "../src/storage/save-model";

type StoreProduct = { id: string; displayPrice: string };

const VAULTPASS_SKU = "app.vaultpop.vaultpass.plus.monthly";
const NOW = new Date("2026-08-01T12:00:00.000Z");
const FUTURE = "2026-09-01T12:00:00.000Z";

function storeProduct(id: string, displayPrice: string): StoreProduct {
  return { id, displayPrice };
}

const vaultPassGrant = {
  verified: true as const,
  transactionId: "tx-vaultpass-1",
  productId: VAULTPASS_SKU as (typeof IAP_PRODUCTS)[number]["id"],
  grant: { bonusLives: 10, chainBoosts: 10, vaultBursts: 5 },
  expiresAt: FUTURE,
  revokedAt: null
};

/* ------------------------------------------------------------------ *
 * Price display: no hardcoded VaultPass price anywhere customer-facing
 * ------------------------------------------------------------------ */

test("VaultPass SKU is unchanged and has no hardcoded price in the catalog", () => {
  const vaultPass = IAP_PRODUCTS.find((product) => product.kind === "subscription");
  assert.ok(vaultPass);
  assert.equal(vaultPass!.id, VAULTPASS_SKU);
  assert.equal("basePriceUsd" in vaultPass!, false);

  const catalogSource = readFileSync("src/monetization/catalog.ts", "utf8");
  assert.equal(/US\$\d+(\.\d+)?\s*\/\s*month/i.test(catalogSource), false);
});

test("shop card renders the localized StoreKit price with no stale fallback", () => {
  const shop = readFileSync("src/screens/shop-screen.tsx", "utf8");
  assert.ok(shop.includes("vaultPassStore?.displayPrice"));
  assert.equal(shop.includes("VAULTPASS.basePriceUsd"), false);
  assert.equal(shop.includes("US$2.99/month"), false);
});

test("shop shows a dedicated active-subscriber state with Manage Subscription", () => {
  const shop = readFileSync("src/screens/shop-screen.tsx", "utf8");
  assert.ok(shop.includes("hasActiveVaultPass"));
  assert.ok(shop.includes("VaultPass Plus Active"));
  assert.ok(shop.includes("Manage Subscription"));
  assert.ok(shop.includes("apps.apple.com/account/subscriptions"));
  // The purchase CTA and the active state are mutually exclusive branches.
  assert.ok(shop.includes("{vaultPassActive ? ("));
});

/* ------------------------------------------------------------------ *
 * Catalog loader: retention, dedupe, bounded retry/backoff
 * ------------------------------------------------------------------ */

test("one transient empty response never clears a valid product", async () => {
  const responses: StoreProduct[][] = [[storeProduct(VAULTPASS_SKU, "$3.99")], [], []];
  let calls = 0;
  const loader = createCatalogLoader({
    fetchOnce: async () => responses[Math.min(calls++, responses.length - 1)]!,
    sleep: async () => {}
  });

  const first = await loader.load();
  assert.equal(first.length, 1);
  assert.equal(first[0]!.displayPrice, "$3.99");

  // Background refresh returns empty: the last valid catalog is retained
  // after a single attempt (no pointless retries, no clobbering).
  const second = await loader.load();
  assert.equal(second.length, 1);
  assert.equal(second[0]!.id, VAULTPASS_SKU);
  assert.equal(calls, 2);
  assert.equal(loader.getCached().length, 1);
});

test("a fresher StoreKit response replaces products; missing SKUs are retained", () => {
  const previous = [storeProduct(VAULTPASS_SKU, "$2.99"), storeProduct("app.vaultpop.remove_ads", "$4.99")];
  const next = [storeProduct(VAULTPASS_SKU, "$3.99")];
  const merged = mergeCatalogs(previous, next);
  assert.equal(merged.find((item) => item.id === VAULTPASS_SKU)?.displayPrice, "$3.99");
  assert.equal(merged.find((item) => item.id === "app.vaultpop.remove_ads")?.displayPrice, "$4.99");
  assert.deepEqual(mergeCatalogs(previous, []), previous);
});

test("concurrent loads share one in-flight run (no overlapping requests)", async () => {
  let calls = 0;
  const loader = createCatalogLoader({
    fetchOnce: async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return [storeProduct(VAULTPASS_SKU, "$3.99")];
    },
    sleep: async () => {}
  });
  const [a, b, c] = await Promise.all([loader.load(), loader.load(), loader.load()]);
  assert.equal(calls, 1);
  assert.equal(a.length, 1);
  assert.deepEqual(a, b);
  assert.deepEqual(b, c);
});

test("retry is bounded with backoff; unavailable only after retries fail with no cache", async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const loader = createCatalogLoader({
    fetchOnce: async () => {
      calls += 1;
      return [];
    },
    maxAttempts: 3,
    backoffMs: 100,
    sleep: async (ms) => {
      sleeps.push(ms);
    }
  });
  const result = await loader.load();
  assert.deepEqual(result, []);
  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [100, 200]);
});

test("a failed refresh with a cached catalog returns the cache instead of throwing", async () => {
  let calls = 0;
  const loader = createCatalogLoader({
    fetchOnce: async () => {
      calls += 1;
      if (calls === 1) {
        return [storeProduct(VAULTPASS_SKU, "$3.99")];
      }
      throw new Error("transient StoreKit error");
    },
    sleep: async () => {}
  });
  await loader.load();
  const refreshed = await loader.load();
  assert.equal(refreshed.length, 1);
  assert.equal(refreshed[0]!.id, VAULTPASS_SKU);
});

test("store session never ends the StoreKit connection on screen unmount", () => {
  const service = readFileSync("src/monetization/purchase-service.ts", "utf8");
  assert.equal(service.includes("iap.endConnection"), false);
  assert.ok(service.includes("connectToStore"));
  assert.ok(service.includes("sharedCatalogLoader"));
});

/* ------------------------------------------------------------------ *
 * Post-purchase entitlement: immediate active state + persistence
 * ------------------------------------------------------------------ */

test("verified VaultPass purchase immediately activates entitlement and grants once", () => {
  const profile = createDefaultSaveProfile(NOW);
  assert.equal(hasActiveVaultPass(profile, NOW), false);

  const after = applyVerifiedPurchase(profile, vaultPassGrant, NOW);
  assert.equal(hasActiveVaultPass(after, NOW), true);
  assert.equal(after.entitlements.vaultPassExpiresAt, FUTURE);
  assert.equal(after.economy.boosters.bonusLives, 10);
  assert.equal(after.economy.boosters.vaultBursts, 5);

  // Repeated purchase callbacks / restores with the same transaction must
  // keep the entitlement active without duplicating rewards.
  const repeated = applyVerifiedPurchase(
    applyVerifiedPurchase(after, vaultPassGrant, NOW),
    vaultPassGrant,
    NOW
  );
  assert.equal(hasActiveVaultPass(repeated, NOW), true);
  assert.equal(repeated.economy.boosters.bonusLives, 10);
  assert.equal(repeated.economy.boosters.vaultBursts, 5);
});

test("entitlement survives app relaunch (persisted save profile round-trip)", () => {
  const active = applyVerifiedPurchase(createDefaultSaveProfile(NOW), vaultPassGrant, NOW);
  const relaunched = normalizeSaveProfile(JSON.parse(JSON.stringify(active)));
  assert.equal(hasActiveVaultPass(relaunched, NOW), true);
  assert.equal(relaunched.entitlements.vaultPassExpiresAt, FUTURE);
});

test("entitlement survives sign-out and is restored on sign-in", () => {
  const active = applyVerifiedPurchase(createDefaultSaveProfile(NOW), vaultPassGrant, NOW);

  const signedOut = clearAccountSession(active, NOW);
  assert.equal(hasActiveVaultPass(signedOut, NOW), true);

  const signedIn = applyAccountLogin(
    signedOut,
    {
      token: "session-token",
      expiresAt: FUTURE,
      state: {
        account: { id: "acct-1", email: "player@example.com", role: "player" },
        linkedInstallId: signedOut.support.installId,
        balance: {
          vaultCoins: 0,
          bonusLives: 0,
          chainBoosts: 0,
          vaultBursts: 0,
          removeAds: false,
          vaultPassExpiresAt: FUTURE
        }
      }
    },
    NOW
  );
  assert.equal(hasActiveVaultPass(signedIn, NOW), true);
});

test("Restore Purchases path re-activates a lapsed local state without duplicate rewards", () => {
  // Simulate a fresh install (new device): no local entitlement, then a
  // restored purchase delivered through the same verified pipeline.
  const fresh = createDefaultSaveProfile(NOW);
  const restored = applyVerifiedPurchase(fresh, vaultPassGrant, NOW);
  assert.equal(hasActiveVaultPass(restored, NOW), true);

  // Restoring again (repeated getAvailablePurchases callback) is a no-op for
  // rewards because the transaction was already processed.
  const restoredTwice = applyVerifiedPurchase(restored, vaultPassGrant, NOW);
  assert.equal(restoredTwice.economy.boosters.bonusLives, 10);
  assert.equal(hasActiveVaultPass(restoredTwice, NOW), true);
});
