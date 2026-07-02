import { canShowRewarded } from "@/ads/ad-policy";
import {
  initializeAdsAfterHome,
  isAdsInitialized,
  isFullScreenAdShowing,
  showRewardedBonusLifeAd,
  wasRewardedJustShown
} from "@/ads/ad-service";
import { AdBanner } from "@/components/ad-banner";
import { ActionButton } from "@/components/action-button";
import { MetricCard } from "@/components/metric-card";
import { ScreenShell } from "@/components/screen-shell";
import { StatusPill } from "@/components/status-pill";
import { getLocalDateKey } from "@/game/daily-seed";
import {
  IAP_PRODUCTS,
  type IapProductId
} from "@/monetization/catalog";
import {
  applyVerifiedPurchase,
  BOOSTER_COSTS,
  getRewardedCount,
  grantRewardedBonusLife,
  purchaseBoosterWithCoins
} from "@/monetization/economy";
import { isAdFree } from "@/monetization/entitlements";
import {
  createStoreSession,
  verifyPurchaseWithServer,
  type StoreProduct,
  type StoreSession
} from "@/monetization/purchase-service";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, spacing, typography } from "@/theme";
import { useCallback, useEffect, useRef, useState } from "react";
import { InteractionManager, Text, View } from "react-native";
import type { Purchase } from "react-native-iap";

export function ShopScreen() {
  const [profile, setProfile] = useSaveProfile();
  const profileRef = useRef(profile);
  const sessionRef = useRef<StoreSession | null>(null);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [status, setStatus] = useState("Connecting to the App Store...");
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const dateKey = getLocalDateKey();
  const rewardedCount = getRewardedCount(profile, dateKey);
  const adFree = isAdFree(profile);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const processPurchase = useCallback(
    async (purchase: Purchase) => {
      const session = sessionRef.current;
      if (!session) {
        return;
      }
      try {
        setStatus("Verifying purchase...");
        const verified = await verifyPurchaseWithServer(
          purchase,
          profileRef.current.support.installId
        );
        setProfile((current) => applyVerifiedPurchase(current, verified));
        await session.finish(purchase);
        setStatus("Purchase verified and delivered.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Purchase verification failed.");
      } finally {
        setBusyProductId(null);
      }
    },
    [setProfile]
  );

  useEffect(() => {
    let active = true;
    const task = InteractionManager.runAfterInteractions(() => {
      void createStoreSession({
        onPurchase: processPurchase,
        onError: setStatus
      })
        .then(async (session) => {
          if (!active) {
            await session.close();
            return;
          }
          sessionRef.current = session;
          const products = await session.fetchCatalog();
          if (active) {
            setStoreProducts(products);
            setStatus(
              products.length > 0
                ? "App Store products loaded."
                : "Products are unavailable from the App Store right now."
            );
          }
        })
        .catch(() => {
          if (active) {
            setStatus("The App Store is unavailable right now.");
          }
        });
      });

    return () => {
      active = false;
      task.cancel();
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) {
        void session.close();
      }
    };
  }, [processPurchase]);

  const buy = async (productId: IapProductId) => {
    const session = sessionRef.current;
    if (!session) {
      setStatus("The App Store is unavailable right now.");
      return;
    }
    setBusyProductId(productId);
    setStatus("Opening the App Store purchase sheet...");
    try {
      await session.purchase(productId);
    } catch {
      setBusyProductId(null);
      setStatus("The purchase did not start. Please try again.");
    }
  };

  const restore = async () => {
    const session = sessionRef.current;
    if (!session) {
      setStatus("The App Store is unavailable right now.");
      return;
    }
    setStatus("Restoring purchases...");
    try {
      const purchases = await session.restore();
      const restorable = purchases.filter(
        (purchase) =>
          purchase.productId === "app.vaultpop.remove_ads" ||
          purchase.productId === "app.vaultpop.vaultpass.monthly"
      );
      for (const purchase of restorable) {
        await processPurchase(purchase);
      }
      setStatus(
        restorable.length > 0
          ? "Restorable purchases are up to date."
          : "No restorable purchases were found."
      );
    } catch {
      setStatus("Restore Purchases could not finish. Please try again.");
    }
  };

  const watchRewarded = async () => {
    const eligible = canShowRewarded({
      adFree,
      adsInitialized: isAdsInitialized(),
      completedRounds: profile.ads.completedRounds,
      lastInterstitialRound: profile.ads.lastInterstitialRound,
      fullScreenAdShowing: isFullScreenAdShowing(),
      rewardedCountToday: rewardedCount,
      rewardedJustShown: wasRewardedJustShown(),
      firstColdLaunch: false,
      gameplayActive: false
    });
    if (!eligible && !(await initializeAdsAfterHome())) {
      setStatus("A rewarded ad is unavailable right now. Please try again later.");
      return;
    }
    const result = await showRewardedBonusLifeAd();
    if (!result.rewarded || !result.rewardId) {
      setStatus("The reward was not confirmed. No Bonus Life was added.");
      return;
    }
    setProfile((current) =>
      grantRewardedBonusLife(current, dateKey, result.rewardId!)
    );
    setStatus("1 Bonus Life added.");
  };

  return (
    <ScreenShell
      title="Shop"
      lead="Optional purchases. No purchase is required to play."
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <MetricCard label="Vault Coins" value={profile.economy.vaultCoins} accent={colors.gold} />
        <MetricCard
          label="Bonus Lives"
          value={profile.economy.boosters.bonusLives}
          accent={colors.emerald}
        />
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text selectable style={typography.body}>
          Vault Coins are fictional in-game currency.
        </Text>
        <Text selectable style={typography.body}>
          Use Vault Coins for boosters and cosmetic unlocks.
        </Text>
        <StatusPill label={status} tone="cyan" />
      </View>
      <View style={{ gap: spacing.sm }}>
        {IAP_PRODUCTS.map((product) => {
          const storeProduct = storeProducts.find((item) => item.id === product.id);
          const available = Boolean(storeProduct);
          return (
            <View
              key={product.id}
              style={{
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                borderRadius: 8,
                borderWidth: 1,
                gap: spacing.sm,
                padding: spacing.md
              }}
            >
              <View style={{ gap: spacing.xs }}>
                <Text selectable style={typography.sectionTitle}>
                  {product.displayName}
                </Text>
                {"badge" in product && product.badge ? (
                  <StatusPill label={product.badge} tone="gold" />
                ) : null}
                <Text selectable style={typography.body}>
                  {product.description}
                </Text>
                <Text selectable style={typography.button}>
                  {storeProduct?.displayPrice ?? product.basePriceUsd}
                </Text>
              </View>
              <ActionButton
                label={available ? `Buy ${product.displayName}` : "Unavailable"}
                detail={
                  available
                    ? product.detail
                    : "This product cannot be purchased until the App Store returns it."
                }
                disabled={!available || busyProductId !== null}
                onPress={() => void buy(product.id)}
              />
              {product.kind === "subscription" ? (
                <Text selectable style={typography.caption}>
                  Renews monthly until cancelled. Manage or cancel in Apple account settings.
                  Benefits remain active through the current paid period.
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
      <View style={{ gap: spacing.sm }}>
        <Text selectable style={typography.sectionTitle}>
          Booster Counter
        </Text>
        {(Object.keys(BOOSTER_COSTS) as (keyof typeof BOOSTER_COSTS)[]).map((booster) => (
          <ActionButton
            key={booster}
            label={`Add 1 ${formatBooster(booster)}`}
            detail={`${BOOSTER_COSTS[booster]} Vault Coins`}
            disabled={profile.economy.vaultCoins < BOOSTER_COSTS[booster]}
            onPress={() =>
              setProfile((current) => purchaseBoosterWithCoins(current, booster))
            }
          />
        ))}
      </View>
      {!adFree ? (
        <ActionButton
          label="Watch Ad for 1 Bonus Life."
          detail={`${rewardedCount} of 30 rewarded grants used today.`}
          disabled={rewardedCount >= 30}
          onPress={() => void watchRewarded()}
        />
      ) : null}
      <ActionButton
        label="Restore Purchases"
        detail="Restores Ad-Free Upgrade and active VaultPass access."
        onPress={() => void restore()}
      />
      <AdBanner placement="shop" />
    </ScreenShell>
  );
}

function formatBooster(booster: keyof typeof BOOSTER_COSTS): string {
  return booster === "bonusLives"
    ? "Bonus Life"
    : booster === "chainBoosts"
      ? "Chain Boost"
      : "Vault Burst";
}
