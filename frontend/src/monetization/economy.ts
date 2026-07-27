import { getProductDefinition, type IapProductId, type ProductGrant } from "@/monetization/catalog";
import type { SaveProfile } from "@/storage/save-model";

export const BOOSTER_COSTS = {
  bonusLives: 250,
  chainBoosts: 180,
  vaultBursts: 400
} as const;

export type BoosterKind = keyof typeof BOOSTER_COSTS;

export type VerifiedPurchaseGrant = {
  verified: true;
  transactionId: string;
  productId: IapProductId;
  grant: ProductGrant;
  expiresAt?: string | null;
  revokedAt?: string | null;
};

export function applyVerifiedPurchase(
  profile: SaveProfile,
  purchase: VerifiedPurchaseGrant,
  now = new Date()
): SaveProfile {
  if (profile.economy.processedTransactionIds.includes(purchase.transactionId)) {
    return applyEntitlementState(profile, purchase, now);
  }

  const definition = getProductDefinition(purchase.productId);
  if (!definition || purchase.revokedAt) {
    return profile;
  }

  const nextProfile = applyEntitlementState(profile, purchase, now);
  return {
    ...nextProfile,
    updatedAt: now.toISOString(),
    economy: {
      ...nextProfile.economy,
      vaultCoins:
        nextProfile.economy.vaultCoins + Math.max(0, Math.floor(purchase.grant.vaultCoins ?? 0)),
      boosters: {
        bonusLives:
          nextProfile.economy.boosters.bonusLives +
          Math.max(0, Math.floor(purchase.grant.bonusLives ?? 0)),
        chainBoosts:
          nextProfile.economy.boosters.chainBoosts +
          Math.max(0, Math.floor(purchase.grant.chainBoosts ?? 0)),
        vaultBursts:
          nextProfile.economy.boosters.vaultBursts +
          Math.max(0, Math.floor(purchase.grant.vaultBursts ?? 0))
      },
      processedTransactionIds: [
        ...nextProfile.economy.processedTransactionIds,
        purchase.transactionId
      ]
    }
  };
}

function applyEntitlementState(
  profile: SaveProfile,
  purchase: VerifiedPurchaseGrant,
  now: Date
): SaveProfile {
  if (purchase.productId === "app.vaultpop.remove_ads" && !purchase.revokedAt) {
    return {
      ...profile,
      entitlements: {
        ...profile.entitlements,
        removeAds: true,
        removeAdsTransactionId: purchase.transactionId
      }
    };
  }

  if (purchase.productId !== "app.vaultpop.vaultpass.plus.monthly") {
    return profile;
  }

  const expiresAt = purchase.expiresAt ?? null;
  const active = Boolean(
    !purchase.revokedAt && expiresAt && new Date(expiresAt).getTime() > now.getTime()
  );
  return {
    ...profile,
    entitlements: {
      ...profile.entitlements,
      vaultPassExpiresAt: active ? expiresAt : null,
      vaultPassTransactionId: active ? purchase.transactionId : null
    }
  };
}

export function purchaseBoosterWithCoins(
  profile: SaveProfile,
  booster: BoosterKind,
  quantity = 1,
  now = new Date()
): SaveProfile {
  const safeQuantity = Math.max(1, Math.floor(quantity));
  const cost = BOOSTER_COSTS[booster] * safeQuantity;
  if (profile.economy.vaultCoins < cost) {
    return profile;
  }
  return {
    ...profile,
    updatedAt: now.toISOString(),
    economy: {
      ...profile.economy,
      vaultCoins: profile.economy.vaultCoins - cost,
      boosters: {
        ...profile.economy.boosters,
        [booster]: profile.economy.boosters[booster] + safeQuantity
      }
    }
  };
}

export function grantRewardedBonusLife(
  profile: SaveProfile,
  dateKey: string,
  rewardId: string,
  now = new Date()
): SaveProfile {
  return grantRewarded(profile, dateKey, rewardId, { bonusLives: 1 }, now);
}

/** Rewarded "Watch for 10 Vault Coins" grant — shares the daily 30-ad cap. */
export function grantRewardedVaultCoins(
  profile: SaveProfile,
  dateKey: string,
  rewardId: string,
  now = new Date()
): SaveProfile {
  return grantRewarded(profile, dateKey, rewardId, { vaultCoins: 10 }, now);
}

function grantRewarded(
  profile: SaveProfile,
  dateKey: string,
  rewardId: string,
  grant: { bonusLives?: number; vaultCoins?: number },
  now: Date
): SaveProfile {
  const rewardState =
    profile.economy.rewardedAds.dateKey === dateKey
      ? profile.economy.rewardedAds
      : { dateKey, count: 0, rewardIds: [] };

  // Shared cap across ALL rewarded placements + per-reward idempotency.
  if (rewardState.count >= 30 || rewardState.rewardIds.includes(rewardId)) {
    return profile;
  }

  return {
    ...profile,
    updatedAt: now.toISOString(),
    economy: {
      ...profile.economy,
      vaultCoins: profile.economy.vaultCoins + (grant.vaultCoins ?? 0),
      boosters: {
        ...profile.economy.boosters,
        bonusLives: profile.economy.boosters.bonusLives + (grant.bonusLives ?? 0)
      },
      rewardedAds: {
        dateKey,
        count: rewardState.count + 1,
        rewardIds: [...rewardState.rewardIds, rewardId]
      }
    }
  };
}

export function getRewardedCount(profile: SaveProfile, dateKey: string): number {
  return profile.economy.rewardedAds.dateKey === dateKey
    ? profile.economy.rewardedAds.count
    : 0;
}

export function consumeBooster(
  profile: SaveProfile,
  booster: BoosterKind,
  now = new Date()
): SaveProfile {
  const available = profile.economy.boosters[booster];
  if (available <= 0) {
    return profile;
  }
  return {
    ...profile,
    updatedAt: now.toISOString(),
    economy: {
      ...profile.economy,
      boosters: {
        ...profile.economy.boosters,
        [booster]: available - 1
      }
    }
  };
}
