import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { applyAccountLogin } from "../src/account/account-service";
import { canShowAppOpen, canShowBanner, canShowInterstitial, canShowRewarded } from "../src/ads/ad-policy";
import { IAP_PRODUCTS } from "../src/monetization/catalog";
import {
  applyVerifiedPurchase,
  consumeBooster,
  getRewardedCount,
  grantRewardedBonusLife,
  purchaseBoosterWithCoins
} from "../src/monetization/economy";
import { hasActiveVaultPass, isAdFree } from "../src/monetization/entitlements";
import { createDefaultSaveProfile, normalizeSaveProfile } from "../src/storage/save-model";
import { validateSupportTicket } from "../src/support/support-model";

test("IAP catalog matches exact IDs and order; VaultPass has no hardcoded price", () => {
  assert.deepEqual(
    IAP_PRODUCTS.map((product) => [
      product.id,
      "basePriceUsd" in product ? product.basePriceUsd : null
    ]),
    [
      ["app.vaultpop.boosters.starter", "US$2.99"],
      ["app.vaultpop.coins.small", "US$0.99"],
      ["app.vaultpop.coins.medium", "US$3.99"],
      ["app.vaultpop.coins.large", "US$8.99"],
      ["app.vaultpop.remove_ads", "US$4.99"],
      // Build 18 regression fix: the subscription price must come only from
      // the localized StoreKit product — never from a hardcoded string.
      ["app.vaultpop.vaultpass.plus.monthly", null]
    ]
  );
  assert.equal(IAP_PRODUCTS[2]?.badge, "Popular");
  assert.equal(IAP_PRODUCTS[3]?.badge, "Best Value");
});

test("verified consumables grant exact amounts only once and never expire", () => {
  const profile = createDefaultSaveProfile(new Date("2026-06-29T12:00:00.000Z"));
  const purchase = {
    verified: true as const,
    transactionId: "tx-coins",
    productId: "app.vaultpop.coins.medium" as const,
    grant: { vaultCoins: 5_500 }
  };
  const first = applyVerifiedPurchase(profile, purchase);
  const duplicate = applyVerifiedPurchase(first, purchase);
  assert.equal(first.economy.vaultCoins, 5_500);
  assert.equal(duplicate.economy.vaultCoins, 5_500);
  assert.deepEqual(duplicate.economy.processedTransactionIds, ["tx-coins"]);
});

test("starter and monthly products apply fixed booster grants once per transaction", () => {
  const profile = createDefaultSaveProfile();
  const starter = applyVerifiedPurchase(profile, {
    verified: true,
    transactionId: "tx-starter",
    productId: "app.vaultpop.boosters.starter",
    grant: { bonusLives: 5, chainBoosts: 5, vaultBursts: 3 }
  });
  const monthly = applyVerifiedPurchase(starter, {
    verified: true,
    transactionId: "tx-month-one",
    productId: "app.vaultpop.vaultpass.plus.monthly",
    grant: { bonusLives: 10, chainBoosts: 10, vaultBursts: 5 },
    expiresAt: "2026-08-01T00:00:00.000Z"
  }, new Date("2026-07-01T00:00:00.000Z"));
  const duplicate = applyVerifiedPurchase(monthly, {
    verified: true,
    transactionId: "tx-month-one",
    productId: "app.vaultpop.vaultpass.plus.monthly",
    grant: { bonusLives: 10, chainBoosts: 10, vaultBursts: 5 },
    expiresAt: "2026-08-01T00:00:00.000Z"
  }, new Date("2026-07-01T00:00:00.000Z"));
  assert.deepEqual(duplicate.economy.boosters, {
    bonusLives: 15,
    chainBoosts: 15,
    vaultBursts: 8
  });
  const used = consumeBooster(
    consumeBooster(
      consumeBooster(duplicate, "bonusLives"),
      "chainBoosts"
    ),
    "vaultBursts"
  );
  assert.deepEqual(used.economy.boosters, {
    bonusLives: 14,
    chainBoosts: 14,
    vaultBursts: 7
  });
});

test("Vault Coins buy usable fixed boosters and never create negative balances", () => {
  const profile = {
    ...createDefaultSaveProfile(),
    economy: {
      ...createDefaultSaveProfile().economy,
      vaultCoins: 500
    }
  };
  const purchased = purchaseBoosterWithCoins(profile, "chainBoosts");
  assert.equal(purchased.economy.vaultCoins, 320);
  assert.equal(purchased.economy.boosters.chainBoosts, 1);
  const consumed = consumeBooster(purchased, "chainBoosts");
  assert.equal(consumed.economy.boosters.chainBoosts, 0);
  assert.strictEqual(consumeBooster(consumed, "chainBoosts"), consumed);
});

test("account inventory reconciliation is idempotent across repeated sign in", () => {
  const profile = createDefaultSaveProfile();
  const login = {
    token: "opaque-session-token",
    expiresAt: "2099-01-01T00:00:00.000Z",
    state: {
      account: {
        id: "reviewer-account",
        email: "reviewer@example.com",
        role: "reviewer" as const,
        active: true,
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      linkedInstallId: profile.support.installId,
      balance: {
        vaultCoins: 1_000,
        bonusLives: 5,
        chainBoosts: 5,
        vaultBursts: 3,
        removeAds: false,
        vaultPassExpiresAt: null
      }
    }
  };
  const first = applyAccountLogin(profile, login);
  const second = applyAccountLogin(first, login);
  assert.equal(first.economy.vaultCoins, 1_000);
  assert.equal(second.economy.vaultCoins, 1_000);
  assert.equal(second.economy.boosters.bonusLives, 5);
});

test("production screens contain no known development-facing release copy", () => {
  const visibleScreens = [
    "src/screens/home-screen.tsx",
    "src/screens/mode-select-screen.tsx",
    "src/screens/privacy-support-legal-screen.tsx"
  ];
  const source = visibleScreens.map((path) => readFileSync(path, "utf8")).join("\n");
  for (const phrase of [
    "Offline iOS v1",
    "ready for iOS v1",
    "Review-facing policy notes",
    "Portrait iPhone shell"
  ]) {
    assert.equal(source.includes(phrase), false);
  }
});

test("remove ads restores permanently and VaultPass lapses without deleting inventory", () => {
  let profile = createDefaultSaveProfile();
  profile = applyVerifiedPurchase(profile, {
    verified: true,
    transactionId: "tx-remove",
    productId: "app.vaultpop.remove_ads",
    grant: { removeAds: true }
  });
  profile = applyVerifiedPurchase(profile, {
    verified: true,
    transactionId: "tx-pass",
    productId: "app.vaultpop.vaultpass.plus.monthly",
    grant: { bonusLives: 10 },
    expiresAt: "2026-07-15T00:00:00.000Z"
  }, new Date("2026-07-01T00:00:00.000Z"));
  assert.equal(hasActiveVaultPass(profile, new Date("2026-07-02T00:00:00.000Z")), true);
  assert.equal(hasActiveVaultPass(profile, new Date("2026-08-02T00:00:00.000Z")), false);
  assert.equal(isAdFree(profile, new Date("2026-08-02T00:00:00.000Z")), true);
  assert.equal(profile.economy.boosters.bonusLives, 10);
  assert.equal(normalizeSaveProfile(profile).entitlements.removeAds, true);
});

test("rewarded grants are callback-idempotent and capped at 30 per local day", () => {
  let profile = createDefaultSaveProfile();
  for (let index = 0; index < 35; index += 1) {
    profile = grantRewardedBonusLife(profile, "2026-06-29", `reward-${index}`);
  }
  profile = grantRewardedBonusLife(profile, "2026-06-29", "reward-0");
  assert.equal(getRewardedCount(profile, "2026-06-29"), 30);
  assert.equal(profile.economy.boosters.bonusLives, 30);
  assert.equal(getRewardedCount(profile, "2026-06-30"), 0);
});

test("ad placement rules suppress gameplay, paid users, and excessive frequency", () => {
  const base = {
    adFree: false,
    adsInitialized: true,
    completedRounds: 3,
    lastInterstitialRound: 0,
    fullScreenAdShowing: false,
    rewardedCountToday: 0,
    rewardedJustShown: false,
    firstColdLaunch: false,
    gameplayActive: false
  };
  assert.equal(canShowBanner("home", base), true);
  assert.equal(canShowBanner("gameplay", { ...base, gameplayActive: true }), false);
  assert.equal(canShowInterstitial(base), true);
  assert.equal(canShowInterstitial({ ...base, completedRounds: 2 }), false);
  assert.equal(canShowRewarded({ ...base, rewardedCountToday: 30 }), false);
  assert.equal(canShowAppOpen({ ...base, firstColdLaunch: true }), false);
  assert.equal(canShowAppOpen({ ...base, adFree: true }), false);
});

test("support form requires a useful message and validates optional email", () => {
  assert.equal(validateSupportTicket({ message: "Too short", email: "" }).valid, false);
  assert.equal(
    validateSupportTicket({ message: "Gameplay froze after a combo.", email: "bad" }).valid,
    false
  );
  assert.equal(
    validateSupportTicket({
      message: "Gameplay froze after a combo.",
      email: "player@example.com"
    }).valid,
    true
  );
});
