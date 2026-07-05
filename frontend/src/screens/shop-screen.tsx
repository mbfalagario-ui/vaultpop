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
import { CoinFace } from "@/components/coin-face";
import { HudStat } from "@/components/hud-stat";
import { ScreenShell } from "@/components/screen-shell";
import { StatusPill } from "@/components/status-pill";
import { getLocalDateKey } from "@/game/daily-seed";
import type { TileType } from "@/game/models";
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
import { colors, radius, spacing, typography } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import { InteractionManager, Text, View } from "react-native";
import type { Purchase } from "react-native-iap";

const PRODUCT_COINS: Record<string, TileType> = {
  "app.vaultpop.boosters.starter": "emerald",
  "app.vaultpop.coins.small": "gold",
  "app.vaultpop.coins.medium": "gold",
  "app.vaultpop.coins.large": "gold",
  "app.vaultpop.remove_ads": "cyan",
  "app.vaultpop.vaultpass.monthly": "violet"
};

const PRODUCT_ACCENTS: Record<string, string> = {
  "app.vaultpop.boosters.starter": colors.emerald,
  "app.vaultpop.coins.small": colors.gold,
  "app.vaultpop.coins.medium": colors.gold,
  "app.vaultpop.coins.large": colors.gold,
  "app.vaultpop.remove_ads": colors.cyan,
  "app.vaultpop.vaultpass.monthly": colors.violet
};

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
      title="Shop"
      lead="Power up your next run."
      accent={colors.gold}
    >
      {/* Player supply band */}
      <View
        style={{
          backgroundColor: colors.surfaceGlass,
          borderColor: colors.border,
          borderCurve: "continuous",
          borderRadius: radius.md,
          borderWidth: 1,
          flexDirection: "row",
          paddingVertical: spacing.md
        }}
      >
        <HudStat
          label="VAULT COINS"
          value={profile.economy.vaultCoins.toLocaleString()}
          accent={colors.gold}
        />
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
        <SectionHeader label="APP STORE" accent={colors.gold} />
        {IAP_PRODUCTS.map((product) => {
          const storeProduct = storeProducts.find((item) => item.id === product.id);
          const available = Boolean(storeProduct);
          const accent = PRODUCT_ACCENTS[product.id] ?? colors.gold;
          const coin = PRODUCT_COINS[product.id] ?? "gold";
          const featured = product.kind === "subscription";
          const badge = "badge" in product ? product.badge : undefined;
          return (
            <View
              key={product.id}
              testID={`shop-product-${product.id}`}
              style={{
                backgroundColor: colors.surfaceGlass,
                borderColor: featured ? `${accent}88` : colors.border,
                borderCurve: "continuous",
                borderRadius: radius.lg,
                borderWidth: 1,
                boxShadow: featured
                  ? `0 14px 34px #00000066, 0 0 26px ${accent}22`
                  : `0 10px 24px #00000055`,
                gap: spacing.sm,
                overflow: "hidden",
                padding: spacing.md
              }}
            >
              <LinearGradient
                colors={[`${accent}22`, `${accent}00`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                pointerEvents="none"
                style={{
                  borderRadius: 999,
                  height: 150,
                  left: -50,
                  position: "absolute",
                  top: -50,
                  width: 150
                }}
              />
              {badge ? (
                <View
                  style={{
                    backgroundColor: accent,
                    borderBottomLeftRadius: radius.sm,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 3,
                    position: "absolute",
                    right: 0,
                    top: 0
                  }}
                >
                  <Text
                    selectable={false}
                    style={{ color: "#140F02", fontSize: 10, fontWeight: "900", letterSpacing: 1 }}
                  >
                    {badge.toUpperCase()}
                  </Text>
                </View>
              ) : null}
              <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
                <CoinFace type={coin} size={52} glow={featured} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text selectable style={[typography.sectionTitle, { fontSize: 17 }]}>
                    {product.displayName}
                  </Text>
                  <Text
                    selectable
                    style={[typography.caption, { color: accent, fontSize: 12, fontWeight: "700" }]}
                  >
                    {product.detail}
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  selectable
                  style={[typography.numeral, { color: colors.textPrimary, flexShrink: 0, fontSize: 16 }]}
                >
                  {storeProduct?.displayPrice ?? product.basePriceUsd}
                </Text>
              </View>
              <Text selectable style={[typography.caption, { color: colors.textSecondary, fontSize: 12 }]}>
                {product.description}
              </Text>
              <ActionButton
                label={available ? "Get" : "Unavailable"}
                disabled={!available || busyProductId !== null}
                accent={accent}
                testID={`shop-buy-${product.id}`}
                onPress={() => void buy(product.id)}
              />
              {product.kind === "subscription" ? (
                <Text selectable style={[typography.caption, { fontSize: 11 }]}>
                  Renews monthly until cancelled. Manage or cancel in Apple account settings.
                  Benefits remain active through the current paid period.
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionHeader label="BOOSTER FORGE" accent={colors.emerald} />
        {BOOSTER_GUIDE.map((booster, index) => {
          const accent = [colors.cyan, colors.violet, colors.gold][index] ?? colors.gold;
          const glyph: TileType = index === 0 ? "cyan" : index === 1 ? "violet" : "gold";
          const cost = BOOSTER_COSTS[booster.id];
          return (
            <View
              key={booster.id}
              testID={`shop-booster-${booster.id}`}
              style={{
                backgroundColor: colors.surfaceGlass,
                borderColor: colors.border,
                borderCurve: "continuous",
                borderRadius: radius.lg,
                borderWidth: 1,
                gap: spacing.sm,
                padding: spacing.md
              }}
            >
              <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
                <CoinFace type={glyph} size={48} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
                    <Text selectable style={[typography.sectionTitle, { fontSize: 16 }]}>
                      {booster.label}
                    </Text>
                    <View
                      style={{
                        backgroundColor: `${accent}1C`,
                        borderColor: `${accent}66`,
                        borderRadius: radius.pill,
                        borderWidth: 1,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 2
                      }}
                    >
                      <Text
                        selectable={false}
                        style={{ color: accent, fontSize: 10.5, fontWeight: "900" }}
                      >
                        {booster.shortEffect}
                      </Text>
                    </View>
                  </View>
                  <Text selectable style={[typography.caption, { color: colors.textSecondary, fontSize: 12 }]}>
                    {booster.description}
                  </Text>
                </View>
              </View>
              <ActionButton
                label={`Forge for ${cost} Vault Coins`}
                disabled={profile.economy.vaultCoins < cost}
                accent={accent}
                testID={`shop-forge-${booster.id}`}
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

      {!adFree ? (
        <ActionButton
          label="Watch for 1 Bonus Life"
          detail={`${rewardedCount} of 30 used today.`}
          disabled={rewardedCount >= 30}
          tone="quiet"
          testID="shop-rewarded-button"
          onPress={() => void watchRewarded()}
        />
      ) : null}
      <ActionButton
        label="Restore Purchases"
        detail="Restores Ad-Free Upgrade and active VaultPass access."
        tone="quiet"
        testID="shop-restore-button"
        onPress={() => void restore()}
      />
      <Text
        selectable
        style={[typography.caption, { color: colors.textMuted, fontSize: 11.5, textAlign: "center" }]}
      >
        Vault Coins are fictional game currency used only for fixed in-game boosters.
      </Text>
      <AdBanner placement="shop" />
    </ScreenShell>
  );
}

function SectionHeader({ label, accent }: { label: string; accent: string }) {
  return (
    <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
      <View
        style={{
          backgroundColor: accent,
          borderRadius: 999,
          boxShadow: `0 0 8px ${accent}`,
          height: 2,
          width: 22
        }}
      />
      <Text selectable style={[typography.eyebrow, { color: accent }]}>
        {label}
      </Text>
      <View style={{ backgroundColor: colors.border, flex: 1, height: 1 }} />
    </View>
  );
}
