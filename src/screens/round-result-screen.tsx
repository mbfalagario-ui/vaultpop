import { ActionLink } from "@/components/action-link";
import { MetricCard } from "@/components/metric-card";
import { ScreenShell } from "@/components/screen-shell";
import { useSaveProfile } from "@/storage/use-save-profile";
import { recordInterstitialShown } from "@/storage";
import { isAdFree } from "@/monetization/entitlements";
import { colors, spacing, typography } from "@/theme";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { useEffect, useRef } from "react";

export function RoundResultScreen() {
  const params = useLocalSearchParams<{
    mode?: string;
    score?: string;
    combo?: string;
    group?: string;
    streak?: string;
    vaults?: string;
  }>();
  const [profile, setProfile] = useSaveProfile();
  const attemptedInterstitialRef = useRef(false);
  const mode = params.mode ?? "classic";
  const score = Number(params.score ?? 0);
  const bestScore =
    mode === "dailyVault"
      ? profile.highScores.dailyVault
      : mode === "streak"
        ? profile.highScores.streak
        : profile.highScores.classic;
  const points = Math.max(0, Math.floor(score / 250));

  useEffect(() => {
    if (attemptedInterstitialRef.current) {
      return;
    }
    attemptedInterstitialRef.current = true;
    const eligible = canShowInterstitial({
      adFree: isAdFree(profile),
      adsInitialized: isAdsInitialized(),
      completedRounds: profile.ads.completedRounds,
      lastInterstitialRound: profile.ads.lastInterstitialRound,
      fullScreenAdShowing: isFullScreenAdShowing(),
      rewardedCountToday: 0,
      rewardedJustShown: wasRewardedJustShown(),
      firstColdLaunch: false,
      gameplayActive: false
    });
    if (eligible) {
      void showInterstitialAd().then((shown) => {
        if (shown) {
          setProfile((current) => recordInterstitialShown(current));
        }
      });
    }
  }, [profile, setProfile]);

  return (
    <ScreenShell title="Round Result" lead="Local score summary saved on this device.">
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <MetricCard label="Score" value={score} accent={colors.gold} />
        <MetricCard label="Best" value={bestScore} accent={colors.cyan} />
        <MetricCard label="Fictional Points" value={`+${points}`} accent={colors.emerald} />
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text selectable style={typography.body}>
          Combo reached {params.combo ?? "1"}x. Best group: {params.group ?? "0"}. Streak:{" "}
          {params.streak ?? "0"}. Vault bonuses: {params.vaults ?? "0"}.
        </Text>
      </View>
      <ActionLink
        href={{ pathname: "/gameplay", params: { mode } }}
        label="Replay"
        detail="Start another local round."
      />
      <ActionLink href="/modes" label="Mode Select" />
      <AdBanner placement="results" />
    </ScreenShell>
  );
}
import { canShowInterstitial } from "@/ads/ad-policy";
import {
  isAdsInitialized,
  isFullScreenAdShowing,
  showInterstitialAd,
  wasRewardedJustShown
} from "@/ads/ad-service";
import { AdBanner } from "@/components/ad-banner";
