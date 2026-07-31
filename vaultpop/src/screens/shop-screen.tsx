import { reportRewardedAdEvent } from "@/ads/ad-events";
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
import { hasActiveVaultPass, hasPremiumThemeAccess, isAdFree } from "@/monetization/entitlements";
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
import { Linking, Pressable, Text, View } from "react-native";
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

const VAULTPASS_ID: IapProductId = "app.vaultpop.vaultpass.plus.monthly";
const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";
const ONE_TIME_PRODUCTS = IAP_PRODUCTS.filter(
  (product) => product.kind !== "subscription"
);

const BOOSTER_LABELS: Record<BoosterKind, string> = {
  bonusLives: "Bonus Life",
  chainBoosts: "Chain Boost",
  vaultBursts: "Vault Burst"
};

const REWARDED_DAILY_CAP = 30;

export function ShopScreen() {
  const [profile, setProfile] = useSaveProfile();
  const profileRef = useRef(profile);
  const sessionRef = useRef<StoreSession | null>(null);
  const forgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [catalogState, setCatalogState] = useState<"loading" | "ready" | "unavailable">(
    "loading"
  );
  const [status, setStatus] = useState("Connecting to the App Store...");
  const [rewardStatus, setRewardStatus] = useState<{
    text: string;
    tone: "pending" | "success" | "error";
  } | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [catalogDiag, setCatalogDiag] = useState("");
  const [forgeResult, setForgeResult] = useState<{ id: BoosterKind; text: string } | null>(null);
  const [watchingAd, setWatchingAd] = useState<"life" | "coins" | null>(null);
  const dateKey = getLocalDateKey();
  const rewardedCount = getRewardedCount(profile, dateKey);
  const capped = rewardedCount >= REWARDED_DAILY_CAP;
  const adFree = isAdFree(profile);
  const premiumAccess = hasPremiumThemeAccess(profile);
  const vaultPassActive = hasActiveVaultPass(profile);
  const vaultPassStore = storeProducts.find((item) => item.id === VAULTPASS_ID);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const mountedRef = useRef(true);

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

  const loadCatalog = useCallback(async () => {
    setCatalogState("loading");
    setStatus("Connecting to the App Store...");
    try {
      let session = sessionRef.current;
      if (!session) {
        // Direct init — never gated on InteractionManager (ambient animations
        // would otherwise delay or block the store session).
        session = await createStoreSession({
          onPurchase: processPurchase,
          onError: setStatus
        });
        if (!mountedRef.current) {
          await session.close();
          return;
        }
        sessionRef.current = session;
      }
      const products = await session.fetchCatalog();
      if (!mountedRef.current) {
        return;
      }
      setStoreProducts(products);
      setCatalogState(products.length > 0 ? "ready" : "unavailable");
      setCatalogDiag(
        `Requested ${VAULTPASS_ID} — store returned ${
          products.length === 0
            ? "no products"
            : products.map((item) => item.id).join(", ")
        }.`
      );
      setStatus(
        products.length > 0
          ? "App Store products loaded."
          : "Live prices load from the App Store on your device."
      );
    } catch (loadError) {
      if (mountedRef.current) {
        setCatalogState("unavailable");
        setCatalogDiag(
          `Requested ${VAULTPASS_ID} — ${
            loadError instanceof Error
              ? loadError.message
              : "store session unavailable (StoreKit requires a native iOS build)."
          }`
        );
        setStatus("Live prices load from the App Store on your device.");
      }
    }
  }, [processPurchase]);

  useEffect(() => {
    mountedRef.current = true;
    void loadCatalog();

    return () => {
      mountedRef.current = false;
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) {
        void session.close();
      }
    };
  }, [loadCatalog]);

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
          purchase.productId === "app.vaultpop.vaultpass.plus.monthly"
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
    if (capped) {
      setRewardStatus({ text: "Daily reward limit reached.", tone: "error" });
      return;
    }
    const rewardType = kind === "life" ? ("bonus_life" as const) : ("vault_coins" as const);
    setWatchingAd(kind);
    setRewardStatus({ text: "Loading ad...", tone: "pending" });
    try {
      const adsReady = isAdsInitialized() || (await initializeAdsAfterHome());
      const eligible =
        adsReady &&
        canShowRewarded({
          adFree,
          adsInitialized: adsReady,
          completedRounds: profile.ads.completedRounds,
          lastInterstitialRound: profile.ads.lastInterstitialRound,
          fullScreenAdShowing: isFullScreenAdShowing(),
          rewardedCountToday: rewardedCount,
          rewardedJustShown: wasRewardedJustShown(),
          firstColdLaunch: false,
          gameplayActive: false
        });
      if (!eligible) {
        reportRewardedAdEvent(profile.support.installId, { event: "failed", rewardType });
        setRewardStatus({
          text: "Ad unavailable right now. Try again later.",
          tone: "error"
        });
        return;
      }
      const result =
        kind === "life" ? await showRewardedBonusLifeAd() : await showRewardedCoinsAd();
      if (!result.shown) {
        reportRewardedAdEvent(profile.support.installId, { event: "failed", rewardType });
        setRewardStatus({
          text: "Ad unavailable right now. Try again later.",
          tone: "error"
        });
        return;
      }
      if (!result.rewarded || !result.rewardId) {
        reportRewardedAdEvent(profile.support.installId, { event: "failed", rewardType });
        setRewardStatus({
          text: "The reward was not confirmed, so nothing was granted. Try again anytime.",
          tone: "error"
        });
        return;
      }
      reportRewardedAdEvent(profile.support.installId, { event: "granted", rewardType });
      if (kind === "life") {
        setProfile((current) => grantRewardedBonusLife(current, dateKey, result.rewardId!));
        setRewardStatus({ text: "✓ 1 Bonus Life added to your supply.", tone: "success" });
      } else {
        setProfile((current) => grantRewardedVaultCoins(current, dateKey, result.rewardId!));
        setRewardStatus({ text: "✓ 10 Vault Coins added to your supply.", tone: "success" });
      }
    } catch {
      reportRewardedAdEvent(profile.support.installId, { event: "failed", rewardType });
      setRewardStatus({
        text: "Ad unavailable right now. Try again later.",
        tone: "error"
      });
    } finally {
      setWatchingAd(null);
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
      {/* 1 — Compact inventory summary */}
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

      {/* 2 — VaultPass hero */}
      <View
        testID={`shop-product-${VAULTPASS_ID}`}
        style={{
          borderColor: `${colors.cyan}5C`,
          borderCurve: "continuous",
          borderRadius: radius.lg,
          borderWidth: 1.5,
          boxShadow: `0 14px 32px #00000077, 0 0 32px ${colors.ruby}38, 0 0 22px ${colors.cyan}2E`,
          overflow: "hidden"
        }}
      >
        <LinearGradient
          colors={["#22103F", "#0B1030"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{ gap: spacing.sm, padding: spacing.md }}
        >
          {/* Magenta-to-cyan aspirational sheen */}
          <LinearGradient
            colors={[`${colors.ruby}2E`, "rgba(0,0,0,0)", `${colors.cyan}24`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.9 }}
            style={{ bottom: 0, left: 0, pointerEvents: "none", position: "absolute", right: 0, top: 0 }}
          />
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
            <CoinFace type="violet" size={40} glow />
            <View style={{ flex: 1 }}>
              <Text
                selectable={false}
                style={[typography.eyebrow, { color: colors.ruby, fontSize: 9 }]}
              >
                MEMBER PICK
              </Text>
              <Text selectable style={[typography.sectionTitle, { fontSize: 18 }]}>
                VaultPass Plus
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              {vaultPassActive ? (
                <Text
                  selectable={false}
                  testID="shop-vaultpass-active-badge"
                  style={[typography.eyebrow, { color: colors.emerald, fontSize: 11 }]}
                >
                  ACTIVE
                </Text>
              ) : (
                <>
                  <Text
                    numberOfLines={1}
                    selectable
                    testID="shop-vaultpass-price"
                    style={[typography.numeral, { color: colors.textPrimary, fontSize: 16 }]}
                  >
                    {/* Localized StoreKit price only — never a hardcoded fallback. */}
                    {vaultPassStore?.displayPrice ?? "—"}
                  </Text>
                  <Text selectable={false} style={[typography.caption, { color: colors.textMuted, fontSize: 10 }]}>
                    per month
                  </Text>
                </>
              )}
            </View>
          </View>
          <Text selectable style={[typography.caption, { color: colors.textSecondary, fontSize: 12.5 }]}>
            Ad-free play, priority support, premium styles, and monthly boosters.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            <BenefitChip label="AD-FREE" accent={colors.gold} strong />
            <BenefitChip label="PRIORITY SUPPORT" accent={colors.cyan} strong />
            <BenefitChip label="PREMIUM STYLES" accent={colors.violet} />
            <BenefitChip label="MONTHLY BOOSTERS" accent={colors.emerald} />
          </View>
          {vaultPassActive ? (
            <View style={{ gap: spacing.xs }} testID="shop-vaultpass-active">
              <Text
                selectable
                style={[
                  typography.sectionTitle,
                  { color: colors.emerald, fontSize: 15, textAlign: "center" }
                ]}
              >
                ✓ VaultPass Plus Active
              </Text>
              {profile.entitlements.vaultPassExpiresAt ? (
                <Text
                  selectable
                  style={[
                    typography.caption,
                    { color: colors.textMuted, fontSize: 11, textAlign: "center" }
                  ]}
                >
                  Active through{" "}
                  {new Date(profile.entitlements.vaultPassExpiresAt).toLocaleDateString()} —
                  renews automatically via Apple.
                </Text>
              ) : null}
              <ActionButton
                label="Manage Subscription"
                detail="Opens your Apple subscription settings."
                tone="quiet"
                accent={colors.emerald}
                testID="shop-vaultpass-manage"
                onPress={() => {
                  void Linking.openURL(APPLE_SUBSCRIPTIONS_URL);
                }}
              />
            </View>
          ) : (
            <>
              <ActionButton
                label={
                  vaultPassStore
                    ? "Get VaultPass Plus"
                    : catalogState === "loading"
                      ? "Connecting to the App Store..."
                      : "Currently Unavailable"
                }
                disabled={!vaultPassStore || busyProductId !== null}
                accent={colors.violet}
                tone={vaultPassStore ? "primary" : "quiet"}
                testID={`shop-buy-${VAULTPASS_ID}`}
                onPress={() => void buy(VAULTPASS_ID)}
              />
              {!vaultPassStore && catalogState !== "loading" ? (
                <View style={{ gap: spacing.xs }}>
                  <Text
                    selectable
                    testID="shop-vaultpass-unavailable"
                    style={[
                      typography.caption,
                      { color: colors.textSecondary, fontSize: 12, textAlign: "center" }
                    ]}
                  >
                    VaultPass is unavailable right now. Please try again later.
                  </Text>
                  <ActionButton
                    label="Retry Loading Products"
                    tone="quiet"
                    accent={colors.violet}
                    disabled={busyProductId !== null}
                    testID="shop-catalog-retry-button"
                    onPress={() => void loadCatalog()}
                  />
                  {profile.account.role === "admin" && catalogDiag ? (
                    <Text
                      selectable
                      testID="shop-vaultpass-diagnostics"
                      style={[
                        typography.caption,
                        { color: colors.textMuted, fontSize: 10.5, textAlign: "center" }
                      ]}
                    >
                      {catalogDiag}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              <Text
                selectable
                style={[typography.caption, { color: colors.textMuted, fontSize: 10.5, textAlign: "center" }]}
              >
                Renews monthly. Manage or cancel in your Apple account settings.
              </Text>
            </>
          )}
        </LinearGradient>
      </View>

      {/* 3 — Daily Rewards */}
      {!adFree ? (
        <View style={{ gap: spacing.sm }}>
          <SectionHeader label="DAILY REWARDS" accent={colors.emerald} />
          <Text
            selectable
            style={[typography.caption, { color: colors.textMuted, fontSize: 11.5 }]}
          >
            Watch optional rewarded ads for in-game rewards. Shared daily limit: 30.
          </Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <RewardCard
              title="1 Bonus Life"
              sub="+15 seconds in any round"
              accent={colors.emerald}
              coin="emerald"
              state={capped ? "capped" : watchingAd === "life" ? "loading" : "ready"}
              disabledByOther={watchingAd === "coins"}
              testID="shop-rewarded-button"
              onPress={() => void watchRewarded("life")}
            />
            <RewardCard
              title="10 Vault Coins"
              sub="Fuel for the Booster Forge"
              accent={colors.gold}
              coin="gold"
              state={capped ? "capped" : watchingAd === "coins" ? "loading" : "ready"}
              disabledByOther={watchingAd === "life"}
              testID="shop-rewarded-coins-button"
              onPress={() => void watchRewarded("coins")}
            />
          </View>
          <View style={{ gap: 5 }}>
            <View
              style={{
                backgroundColor: colors.border,
                borderRadius: 999,
                height: 4,
                overflow: "hidden"
              }}
            >
              <View
                style={{
                  backgroundColor: capped ? colors.ruby : colors.emerald,
                  borderRadius: 999,
                  height: 4,
                  width: `${Math.min(100, (rewardedCount / REWARDED_DAILY_CAP) * 100)}%`
                }}
              />
            </View>
            <Text
              selectable
              style={[typography.caption, { color: colors.textMuted, fontSize: 11, textAlign: "center" }]}
            >
              {rewardedCount} / {REWARDED_DAILY_CAP} rewarded ads used today
            </Text>
          </View>
          {rewardStatus ? (
            <Text
              selectable
              testID="shop-reward-status"
              style={[
                typography.caption,
                {
                  color:
                    rewardStatus.tone === "success"
                      ? colors.emerald
                      : rewardStatus.tone === "pending"
                        ? colors.cyan
                        : colors.textSecondary,
                  fontSize: 12.5,
                  fontWeight: "800",
                  textAlign: "center"
                }
              ]}
            >
              {rewardStatus.text}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* 4 — Booster Forge */}
      <View style={{ gap: spacing.sm }}>
        <SectionHeader label="BOOSTER FORGE" accent={colors.cyan} />
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
                <CoinFace type={glyph} size={44} />
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

      {/* 5 — Styles & Customization */}
      <View style={{ gap: spacing.sm }}>
        <SectionHeader
          label="STYLES & CUSTOMIZATION"
          accent={colors.violet}
          trailing={`${profile.cosmetics.fictionalPoints} STYLE POINTS`}
        />
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
                  height: 50,
                  justifyContent: "center",
                  width: 50
                }}
              >
                <CoinFace type="violet" size={34} />
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

      {/* 6 — Coin Packs & Upgrades */}
      <View style={{ gap: spacing.sm }}>
        <SectionHeader label="COIN PACKS & UPGRADES" accent={colors.gold} />
        <Text selectable style={[typography.caption, { color: colors.textMuted, fontSize: 11.5 }]}>
          {status}
        </Text>
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
                <CoinFace type={coin} size={44} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text selectable style={[typography.sectionTitle, { fontSize: 16 }]}>
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
                  {storeProduct?.displayPrice ??
                    ("basePriceUsd" in product ? product.basePriceUsd : "")}
                </Text>
              </View>
              <Text selectable style={[typography.caption, { color: colors.textSecondary, fontSize: 12 }]}>
                {product.description}
              </Text>
              <ActionButton
                label={available ? "Get" : "Available on the App Store"}
                disabled={!available || busyProductId !== null}
                accent={accent}
                tone={available ? "primary" : "quiet"}
                testID={`shop-buy-${product.id}`}
                onPress={() => void buy(product.id)}
              />
            </View>
          );
        })}
      </View>

      {/* 7 — Restore + legal */}
      <ActionButton
        label="Restore Purchases"
        detail="Restores Ad-Free Upgrade and active VaultPass access."
        tone="quiet"
        testID="shop-restore-button"
        onPress={() => void restore()}
      />
      <Text
        selectable
        style={[typography.caption, { color: colors.textMuted, fontSize: 11, textAlign: "center" }]}
      >
        Vault Coins, boosters, and rewards are fictional in-game content with no
        real-world value.
      </Text>
      <AdBanner placement="shop" />
    </ScreenShell>
  );
}

type RewardState = "ready" | "loading" | "capped";

function RewardCard({
  title,
  sub,
  accent,
  coin,
  state,
  disabledByOther,
  testID,
  onPress
}: {
  title: string;
  sub: string;
  accent: string;
  coin: TileType;
  state: RewardState;
  disabledByOther: boolean;
  testID: string;
  onPress: () => void;
}) {
  const disabled = state === "loading" || disabledByOther;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Watch for ${title}`}
      accessibilityState={{ disabled }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        opacity: state === "capped" ? 0.55 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }]
      })}
    >
      <View
        style={{
          borderColor: `${accent}66`,
          borderCurve: "continuous",
          borderRadius: radius.lg,
          borderWidth: 1.5,
          boxShadow: `0 10px 24px #00000066, 0 0 22px ${accent}26`,
          overflow: "hidden"
        }}
      >
        <LinearGradient
          colors={[`${accent}2A`, "#0B0F1F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={{ alignItems: "center", gap: spacing.xs, padding: spacing.md }}
        >
          <View
            style={{
              alignItems: "center",
              backgroundColor: `${accent}1F`,
              borderColor: `${accent}66`,
              borderRadius: 999,
              borderWidth: 1.5,
              boxShadow: `0 0 16px ${accent}44`,
              height: 52,
              justifyContent: "center",
              width: 52
            }}
          >
            <CoinFace type={coin} size={36} glow />
          </View>
          <Text
            selectable={false}
            style={[typography.eyebrow, { color: accent, fontSize: 8.5 }]}
          >
            WATCH FOR
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            selectable={false}
            style={[typography.sectionTitle, { fontSize: 16, textAlign: "center" }]}
          >
            {title}
          </Text>
          <Text
            numberOfLines={1}
            selectable={false}
            style={[typography.caption, { color: colors.textMuted, fontSize: 10.5, textAlign: "center" }]}
          >
            {sub}
          </Text>
          <View
            style={{
              alignItems: "center",
              backgroundColor: state === "capped" || disabledByOther ? colors.border : accent,
              borderRadius: radius.pill,
              boxShadow: state === "ready" && !disabled ? `0 0 14px ${accent}66` : undefined,
              marginTop: 2,
              paddingVertical: 8,
              width: "100%"
            }}
          >
            <Text
              selectable={false}
              style={{
                color: state === "capped" || disabledByOther ? colors.textMuted : "#140F02",
                fontSize: 12,
                fontWeight: "900",
                letterSpacing: 1
              }}
            >
              {state === "loading" ? "LOADING AD..." : state === "capped" ? "DAILY LIMIT" : "▶ WATCH AD"}
            </Text>
          </View>
        </LinearGradient>
      </View>
    </Pressable>
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

function SectionHeader({
  label,
  accent,
  trailing
}: {
  label: string;
  accent: string;
  trailing?: string;
}) {
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
      {trailing ? (
        <Text selectable style={[typography.eyebrow, { color: colors.textMuted, fontSize: 9.5 }]}>
          {trailing}
        </Text>
      ) : null}
    </View>
  );
}
