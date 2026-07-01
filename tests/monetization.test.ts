import assert from "node:assert/strict";
import test from "node:test";

import { canShowAppOpen, canShowBanner, canShowInterstitial, canShowRewarded } from "../src/ads/ad-policy";
import { IAP_PRODUCTS } from "../src/monetization/catalog";
import {
  applyVerifiedPurchase,
  getRewardedCount,
  grantRewardedBonusLife
} from "../src/monetization/economy";
import { hasActiveVaultPass, isAdFree } from "../src/monetization/entitlements";
import { createDefaultSaveProfile, normalizeSaveProfile } from "../src/storage/save-model";
import { validateSupportTicket } from "../src/support/support-model";

test("IAP catalog matches exact IDs, prices, and display order", () => {
  assert.deepEqual(
    IAP_PRODUCTS.map((product) => [product.id, product.basePriceUsd]),
    [
      ["app.vaultpop.boosters.starter", "US$2.99"],
      ["app.vaultpop.coins.small", "US$0.99"],
      ["app.vaultpop.coins.medium", "US$3.99"],
      ["app.vaultpop.coins.large", "US$8.99"],
      ["app.vaultpop.remove_ads", "US$4.99"],
      ["app.vaultpop.vaultpass.monthly", "US$2.99/month"]
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
    productId: "app.vaultpop.vaultpass.monthly",
    grant: { bonusLives: 10, chainBoosts: 10, vaultBursts: 5 },
    expiresAt: "2026-08-01T00:00:00.000Z"
  }, new Date("2026-07-01T00:00:00.000Z"));
  const duplicate = applyVerifiedPurchase(monthly, {
    verified: true,
    transactionId: "tx-month-one",
    productId: "app.vaultpop.vaultpass.monthly",
    grant: { bonusLives: 10, chainBoosts: 10, vaultBursts: 5 },
    expiresAt: "2026-08-01T00:00:00.000Z"
  }, new Date("2026-07-01T00:00:00.000Z"));
  assert.deepEqual(duplicate.economy.boosters, {
    bonusLives: 15,
    chainBoosts: 15,
    vaultBursts: 8
  });
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
    productId: "app.vaultpop.vaultpass.monthly",
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
