import { canShowRewarded } from "@/ads/ad-policy";
import {
  initializeAdsAfterHome,
  isAdsInitialized,
  isFullScreenAdShowing,
  showRewardedBonusLifeAd,
  showRewardedCoinsAd,
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
import { IAP_PRODUCTS, type IapProductId } from "@/monetization/catalog";
import {
  applyVerifiedPurchase,
  BOOSTER_COSTS,
  getRewardedCount,
  grantRewardedBonusLife,
  grantRewardedVaultCoins,
  purchaseBoosterWithCoins,
  type BoosterKind
} from "@/monetization/economy";
import { BOOSTER_GUIDE } from "@/monetization/booster-guide";
import { hasPremiumThemeAccess, isAdFree } from "@/monetization/entitlements";
import {
  createStoreSession,
  verifyPurchaseWithServer,
  type StoreProduct,
  type StoreSession
} from "@/monetization/purchase-service";
import { unlockTheme } from "@/storage";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, radius, spacing, typography, visualThemes } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import { InteractionManager, Text, View } from "react-native";
import type { Purchase } from "react-native-iap";

const PRODUCT_COINS: Record<string, TileType> = {
  "app.vaultpop.boosters.starter": "emerald",
  "app.vaultpop.coins.small": "gold",
  "app.vaultpop.coins.medium": "gold",
  "app.vaultpop.coins.large": "gold",
  "app.vaultpop.remove_ads": "cyan"
};

const PRODUCT_ACCENTS: Record<string, string> = {
  "app.vaultpop.boosters.starter": colors.emerald,
  "app.vaultpop.coins.small": colors.gold,
  "app.vaultpop.coins.medium": colors.gold,
  "app.vaultpop.coins.large": colors.gold,
  "app.vaultpop.remove_ads": colors.cyan
};

const VAULTPASS = IAP_PRODUCTS.find(
  (product) => product.id === "app.vaultpop.vaultpass.monthly"
)!;
const ONE_TIME_PRODUCTS = IAP_PRODUCTS.filter(
  (product) => product.kind !== "subscription"
);

const BOOSTER_LABELS: Record<BoosterKind, string> = {
  bonusLives: "Bonus Life",
  chainBoosts: "Chain Boost",
  vaultBursts: "Vault Burst"
};

export function ShopScreen() {
  const [profile, setProfile] = useSaveProfile();
  const profileRef = useRef(profile);
  const sessionRef = useRef<StoreSession | null>(null);
  const forgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [status, setStatus] = useState("Connecting to the App Store...");
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [forgeResult, setForgeResult] = useState<{ id: BoosterKind; text: string } | null>(null);
  const [watchingAd, setWatchingAd] = useState(false);
  const dateKey = getLocalDateKey();
  const rewardedCount = getRewardedCount(profile, dateKey);
  const adFree = isAdFree(profile);
  const premiumAccess = hasPremiumThemeAccess(profile);
  const vaultPassStore = storeProducts.find((item) => item.id === VAULTPASS.id);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(
    () => () => {
      if (forgeTimerRef.current) {
        clearTimeout(forgeTimerRef.current);
      }
    },
    []
  );

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

  const watchRewarded = async (kind: "life" | "coins") => {
    setWatchingAd(true);
    try {
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
      const result =
        kind === "life" ? await showRewardedBonusLifeAd() : await showRewardedCoinsAd();
      if (!result.rewarded || !result.rewardId) {
        setStatus(
          kind === "life"
            ? "The reward was not confirmed. No Bonus Life was added."
            : "The reward was not confirmed. No Vault Coins were added."
        );
        return;
      }
      if (kind === "life") {
        setProfile((current) => grantRewardedBonusLife(current, dateKey, result.rewardId!));
        setStatus("1 Bonus Life added.");
      } else {
        setProfile((current) => grantRewardedVaultCoins(current, dateKey, result.rewardId!));
        setStatus("10 Vault Coins added.");
      }
    } finally {
      setWatchingAd(false);
    }
  };

  const forge = (booster: BoosterKind) => {
    const cost = BOOSTER_COSTS[booster];
    if (profile.economy.vaultCoins < cost) {
      setForgeResult({
        id: booster,
        text: `Need ${(cost - profile.economy.vaultCoins).toLocaleString()} more Vault Coins.`
      });
      return;
    }
    setProfile((current) => purchaseBoosterWithCoins(current, booster));
    setForgeResult({
      id: booster,
      text: `✓ +1 ${BOOSTER_LABELS[booster]} forged — ${cost} Vault Coins spent.`
    });
    if (forgeTimerRef.current) {
      clearTimeout(forgeTimerRef.current);
    }
    forgeTimerRef.current = setTimeout(() => setForgeResult(null), 4_000);
  };

  return (
    <ScreenShell eyebrow="VAULT SUPPLY" title="Shop" accent={colors.gold} compact>
      {/* Player supply band */}
      <View
        style={{
          backgroundColor: colors.surfaceGlass,
          borderColor: colors.border,
          borderCurve: "continuous",
          borderRadius: radius.md,
          borderWidth: 1,
          flexDirection: "row",
          paddingVertical: spacing.sm + 2
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

      {/* VaultPass hero — always first */}
      <View
        testID={`shop-product-${VAULTPASS.id}`}
        style={{
          borderColor: `${colors.violet}88`,
          borderCurve: "continuous",
          borderRadius: radius.lg,
          borderWidth: 1.5,
          boxShadow: `0 16px 38px #00000077, 0 0 30px ${colors.violet}2E`,
          overflow: "hidden"
        }}
      >
        <LinearGradient
          colors={["#241548", "#120B26"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{ gap: spacing.sm, padding: spacing.md }}
        >
          <View
            style={{
              backgroundColor: colors.violet,
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
              MEMBER PICK
            </Text>
          </View>
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
            <CoinFace type="violet" size={54} glow />
            <View style={{ flex: 1, gap: 2 }}>
              <Text selectable style={[typography.sectionTitle, { fontSize: 18 }]}>
                {VAULTPASS.displayName}
              </Text>
              <Text
                selectable
                style={[typography.caption, { color: colors.violet, fontSize: 12, fontWeight: "700" }]}
              >
                {VAULTPASS.detail}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              selectable
              style={[typography.numeral, { color: colors.textPrimary, flexShrink: 0, fontSize: 16 }]}
            >
              {vaultPassStore?.displayPrice ?? VAULTPASS.basePriceUsd}
            </Text>
          </View>
          {/* Emphasized benefits */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            <BenefitChip label="AD-FREE" accent={colors.gold} strong />
            <BenefitChip label="PRIORITY SUPPORT" accent={colors.cyan} strong />
            <BenefitChip label="PREMIUM THEMES" accent={colors.violet} />
            <BenefitChip label="MONTHLY BOOSTERS" accent={colors.emerald} />
          </View>
          <ActionButton
            label={vaultPassStore ? "Get VaultPass Plus" : "Unavailable"}
            disabled={!vaultPassStore || busyProductId !== null}
            accent={colors.violet}
            testID={`shop-buy-${VAULTPASS.id}`}
            onPress={() => void buy(VAULTPASS.id)}
          />
          <Text selectable style={[typography.caption, { fontSize: 11 }]}>
            Renews monthly until cancelled. Manage or cancel in Apple account settings.
            Benefits remain active through the current paid period.
          </Text>
        </LinearGradient>
      </View>

      {/* Rewarded ad CTAs — near the top */}
      {!adFree ? (
        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <ActionButton
                label="Watch for 1 Bonus Life"
                disabled={rewardedCount >= 30 || watchingAd}
                accent={colors.emerald}
                tone="quiet"
                testID="shop-rewarded-button"
                onPress={() => void watchRewarded("life")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ActionButton
                label="Watch for 10 Vault Coins"
                disabled={rewardedCount >= 30 || watchingAd}
                accent={colors.gold}
                tone="quiet"
                testID="shop-rewarded-coins-button"
                onPress={() => void watchRewarded("coins")}
              />
            </View>
          </View>
          <Text
            selectable
            style={[typography.caption, { color: colors.textMuted, fontSize: 11, textAlign: "center" }]}
          >
            {rewardedCount} of 30 rewarded ads used today — shared across all rewards.
          </Text>
        </View>
      ) : null}

      <StatusPill label={status} tone="cyan" />

      <View style={{ gap: spacing.sm }}>
        <SectionHeader label="APP STORE" accent={colors.gold} />
        {ONE_TIME_PRODUCTS.map((product) => {
          const storeProduct = storeProducts.find((item) => item.id === product.id);
          const available = Boolean(storeProduct);
          const accent = PRODUCT_ACCENTS[product.id] ?? colors.gold;
          const coin = PRODUCT_COINS[product.id] ?? "gold";
          const badge = "badge" in product ? product.badge : undefined;
          return (
            <View
              key={product.id}
              testID={`shop-product-${product.id}`}
              style={{
                backgroundColor: colors.surfaceGlass,
                borderColor: colors.border,
                borderCurve: "continuous",
                borderRadius: radius.lg,
                borderWidth: 1,
                boxShadow: `0 10px 24px #00000055`,
                gap: spacing.sm,
                overflow: "hidden",
                padding: spacing.md
              }}
            >
              <LinearGradient
                colors={[`${accent}22`, `${accent}00`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={{
                  pointerEvents: "none",
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
                <CoinFace type={coin} size={48} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text selectable style={[typography.sectionTitle, { fontSize: 16.5 }]}>
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
          const result = forgeResult?.id === booster.id ? forgeResult : null;
          const success = result?.text.startsWith("✓") ?? false;
          return (
            <View
              key={booster.id}
              testID={`shop-booster-${booster.id}`}
              style={{
                backgroundColor: colors.surfaceGlass,
                borderColor: success ? `${colors.emerald}77` : colors.border,
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
                onPress={() => forge(booster.id)}
              />
              {result ? (
                <Text
                  selectable
                  testID={`shop-forge-result-${booster.id}`}
                  style={[
                    typography.caption,
                    {
                      color: success ? colors.emerald : colors.ruby,
                      fontSize: 12.5,
                      fontWeight: "800",
                      textAlign: "center"
                    }
                  ]}
                >
                  {result.text}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* Styles & Customization (merged from Arcade Styles) */}
      <View style={{ gap: spacing.sm }}>
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
          <View
            style={{
              backgroundColor: colors.violet,
              borderRadius: 999,
              boxShadow: `0 0 8px ${colors.violet}`,
              height: 2,
              width: 22
            }}
          />
          <Text selectable style={[typography.eyebrow, { color: colors.violet }]}>
            STYLES & CUSTOMIZATION
          </Text>
          <View style={{ backgroundColor: colors.border, flex: 1, height: 1 }} />
          <Text selectable style={[typography.eyebrow, { color: colors.textMuted, fontSize: 9.5 }]}>
            {profile.cosmetics.fictionalPoints} STYLE POINTS
          </Text>
        </View>
        {visualThemes.map((theme) => {
          const subscriptionTheme = theme.id === "vaultpass-prism";
          const unlocked =
            profile.cosmetics.unlockedThemeIds.includes(theme.id) ||
            (subscriptionTheme && premiumAccess);
          const active = profile.cosmetics.activeThemeId === theme.id && unlocked;
          const canUnlock =
            !subscriptionTheme && profile.cosmetics.fictionalPoints >= theme.cost;
          return (
            <View
              key={theme.id}
              testID={`cosmetic-theme-${theme.id}`}
              style={{
                alignItems: "center",
                backgroundColor: colors.surfaceGlass,
                borderColor: active ? `${theme.accent}88` : colors.border,
                borderCurve: "continuous",
                borderRadius: radius.lg,
                borderWidth: 1,
                boxShadow: active ? `0 0 22px ${theme.accent}22` : undefined,
                flexDirection: "row",
                gap: spacing.md,
                overflow: "hidden",
                padding: spacing.md
              }}
            >
              <LinearGradient
                colors={[theme.glow, "#00000000"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ bottom: 0, left: 0, pointerEvents: "none", position: "absolute", top: 0, width: 120 }}
              />
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: theme.glow,
                  borderColor: `${theme.accent}66`,
                  borderRadius: radius.pill,
                  borderWidth: 1.5,
                  height: 54,
                  justifyContent: "center",
                  width: 54
                }}
              >
                <CoinFace type="violet" size={36} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text selectable style={[typography.button, { fontSize: 15 }]}>
                  {theme.title}
                </Text>
                <Text selectable style={[typography.caption, { fontSize: 11.5 }]}>
                  {subscriptionTheme && !unlocked
                    ? "Included with active VaultPass Plus."
                    : theme.description}
                </Text>
              </View>
              <View style={{ minWidth: 92 }}>
                <ActionButton
                  label={
                    active
                      ? "Active"
                      : unlocked
                        ? "Use"
                        : subscriptionTheme
                          ? "VaultPass"
                          : `${theme.cost} pts`
                  }
                  disabled={active || (!unlocked && !canUnlock)}
                  tone={active ? "quiet" : "primary"}
                  accent={theme.accent}
                  onPress={() =>
                    setProfile((currentProfile) =>
                      unlockTheme(currentProfile, theme.id, theme.cost)
                    )
                  }
                />
              </View>
            </View>
          );
        })}
        <Text
          selectable
          style={[typography.caption, { color: colors.textMuted, fontSize: 11, textAlign: "center" }]}
        >
          Collect Style Points by playing rounds — 1 point per 250 score.
        </Text>
      </View>

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

function BenefitChip({
  label,
  accent,
  strong = false
}: {
  label: string;
  accent: string;
  strong?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: strong ? accent : `${accent}1C`,
        borderColor: strong ? accent : `${accent}55`,
        borderRadius: radius.pill,
        borderWidth: 1,
        boxShadow: strong ? `0 0 14px ${accent}55` : undefined,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 4
      }}
    >
      <Text
        selectable={false}
        style={{
          color: strong ? "#140F02" : accent,
          fontSize: 10.5,
          fontWeight: "900",
          letterSpacing: 0.8
        }}
      >
        {label}
      </Text>
    </View>
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
