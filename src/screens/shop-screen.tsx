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
import { ArcadeGlyph } from "@/components/arcade-glyph";
import { HudStat } from "@/components/hud-stat";
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
import { BOOSTER_GUIDE } from "@/monetization/booster-guide";
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
      eyebrow="VAULT SUPPLY"
      title="Power Up"
      lead="Boost a run or unlock your preferred arcade setup."
      accent={colors.ruby}
    >
      <View
        style={{
          backgroundColor: colors.surfaceGlass,
          borderColor: colors.border,
          borderCurve: "continuous",
          borderRadius: 12,
          borderWidth: 1,
          flexDirection: "row",
          paddingVertical: spacing.md
        }}
      >
        <HudStat label="VAULT COINS" value={profile.economy.vaultCoins} accent={colors.gold} />
        <View style={{ backgroundColor: colors.border, width: 1 }} />
        <HudStat
          label="BONUS LIVES"
          value={profile.economy.boosters.bonusLives}
          accent={colors.emerald}
        />
        <View style={{ backgroundColor: colors.border, width: 1 }} />
        <HudStat
          label="VAULT BURSTS"
          value={profile.economy.boosters.vaultBursts}
          accent={colors.ruby}
        />
      </View>
      <StatusPill label={status} tone="cyan" />

      <View style={{ gap: spacing.sm }}>
        <Text selectable style={[typography.eyebrow, { color: colors.gold }]}>
          APP STORE
        </Text>
        {IAP_PRODUCTS.map((product, index) => {
          const storeProduct = storeProducts.find((item) => item.id === product.id);
          const available = Boolean(storeProduct);
          const accents = [
            colors.gold,
            colors.cyan,
            colors.ruby,
            colors.emerald,
            colors.violet,
            colors.gold
          ] as const;
          const accent = accents[index % accents.length]!;
          return (
            <View
              key={product.id}
              style={{
                backgroundColor: `${accent}0E`,
                borderColor: `${accent}88`,
                borderCurve: "continuous",
                borderRadius: 12,
                borderWidth: 1,
                boxShadow: `0 8px 24px ${accent}12`,
                gap: spacing.sm,
                padding: spacing.md
              }}
            >
              <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
                <View
                  style={{
                    alignItems: "center",
                    backgroundColor: `${accent}18`,
                    borderColor: accent,
                    borderRadius: 999,
                    borderWidth: 1,
                    height: 56,
                    justifyContent: "center",
                    width: 56
                  }}
                >
                  <ArcadeGlyph
                    color={accent}
                    modeId={index % 3 === 0 ? "classic" : index % 3 === 1 ? "dailyVault" : "streak"}
                    size={27}
                    type={index % 2 === 0 ? "gold" : "cyan"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text selectable style={[typography.sectionTitle, { fontSize: 18 }]}>
                    {product.displayName}
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  selectable
                  style={[typography.button, { color: accent, flexShrink: 0 }]}
                >
                  {storeProduct?.displayPrice ?? product.basePriceUsd}
                </Text>
              </View>
              <Text selectable style={[typography.caption, { color: colors.textSecondary }]}>
                {product.description}
              </Text>
              <View
                style={{
                  backgroundColor: `${accent}0D`,
                  borderLeftColor: accent,
                  borderLeftWidth: 3,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs
                }}
              >
                <Text
                  selectable
                  style={[typography.caption, { color: accent, fontWeight: "800" }]}
                >
                  INCLUDED: {product.detail}
                </Text>
              </View>
              <ActionButton
                label={available ? "Get" : "Unavailable"}
                detail={
                  available
                    ? `Purchase ${product.displayName}.`
                    : "This product cannot be purchased until the App Store returns it."
                }
                disabled={!available || busyProductId !== null}
                accent={accent}
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
        <Text selectable style={[typography.eyebrow, { color: colors.emerald }]}>
          BOOSTER FORGE
        </Text>
        <View style={{ gap: spacing.sm }}>
          {BOOSTER_GUIDE.map((booster, index) => {
            const accent = [colors.cyan, colors.violet, colors.gold][index]!;
            const glyph = index === 0 ? "cyan" : index === 1 ? "violet" : "gold";
            return (
              <View
                key={booster.id}
                style={{
                  backgroundColor: `${accent}0D`,
                  borderColor: `${accent}66`,
                  borderRadius: 10,
                  borderWidth: 1,
                  gap: spacing.sm,
                  padding: spacing.md
                }}
              >
                <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
                  <View
                    style={{
                      alignItems: "center",
                      backgroundColor: `${accent}18`,
                      borderColor: accent,
                      borderRadius: 999,
                      borderWidth: 1,
                      height: 48,
                      justifyContent: "center",
                      width: 48
                    }}
                  >
                    <ArcadeGlyph
                      color={accent}
                      modeId="classic"
                      size={24}
                      type={glyph}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text selectable style={[typography.sectionTitle, { fontSize: 17 }]}>
                      {booster.label}
                    </Text>
                    <Text
                      selectable
                      style={[typography.caption, { color: accent, fontWeight: "800" }]}
                    >
                      {booster.shortEffect}
                    </Text>
                    <Text
                      selectable
                      style={[typography.caption, { color: colors.textSecondary }]}
                    >
                      {booster.description}
                    </Text>
                  </View>
                </View>
                <ActionButton
                  label={`${BOOSTER_COSTS[booster.id]} Vault Coins`}
                  detail={`Add 1 ${booster.label} to your inventory.`}
                  disabled={profile.economy.vaultCoins < BOOSTER_COSTS[booster.id]}
                  accent={accent}
                  onPress={() =>
                    setProfile((current) =>
                      purchaseBoosterWithCoins(current, booster.id)
                    )
                  }
                />
              </View>
            );
          })}
        </View>
      </View>
      {!adFree ? (
        <ActionButton
          label="Watch for 1 Bonus Life"
          detail={`${rewardedCount} of 30 used today.`}
          disabled={rewardedCount >= 30}
          accent={colors.emerald}
          onPress={() => void watchRewarded()}
        />
      ) : null}
      <ActionButton
        label="Restore Purchases"
        detail="Restores Ad-Free Upgrade and active VaultPass access."
        tone="quiet"
        onPress={() => void restore()}
      />
      <Text selectable style={[typography.caption, { color: colors.textMuted }]}>
        Vault Coins are fictional game currency used only for fixed in-game boosters.
      </Text>
      <AdBanner placement="shop" />
    </ScreenShell>
  );
}
