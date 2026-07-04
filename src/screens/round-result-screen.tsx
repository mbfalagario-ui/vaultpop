import { canShowInterstitial } from "@/ads/ad-policy";
import {
  isAdsInitialized,
  isFullScreenAdShowing,
  showInterstitialAd,
  wasRewardedJustShown
} from "@/ads/ad-service";
import { AdBanner } from "@/components/ad-banner";
import { ActionLink } from "@/components/action-link";
import { ArcadeGlyph } from "@/components/arcade-glyph";
import { HudStat } from "@/components/hud-stat";
import { ScreenShell } from "@/components/screen-shell";
import type { GameModeId, TileType } from "@/game/models";
import { isAdFree } from "@/monetization/entitlements";
import { recordInterstitialShown } from "@/storage";
import { useSaveProfile } from "@/storage/use-save-profile";
import { getModeVisual, spacing, typography } from "@/theme";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { Text, View } from "react-native";

function normalizeMode(value: string | undefined): GameModeId {
  return value === "dailyVault" || value === "streak" ? value : "classic";
}

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
  const mode = normalizeMode(params.mode);
  const visual = getModeVisual(mode);
  const score = Number(params.score ?? 0);
  const bestScore = profile.highScores[mode];
  const points = Math.max(0, Math.floor(score / 250));
  const glyph: TileType =
    mode === "classic" ? "violet" : mode === "dailyVault" ? "cyan" : "gold";

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
    <ScreenShell
      eyebrow={visual.name}
      title="Vault Complete"
      lead={score >= bestScore && score > 0 ? "New personal best." : "Chain secured."}
      accent={visual.accent}
    >
      <View style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.md }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: `${visual.accent}18`,
            borderColor: visual.accent,
            borderRadius: 999,
            borderWidth: 2,
            boxShadow: `0 0 38px ${visual.accent}66`,
            height: 96,
            justifyContent: "center",
            width: 96
          }}
        >
          <ArcadeGlyph color={visual.accent} modeId={mode} size={48} type={glyph} />
        </View>
        <View style={{ alignItems: "center", gap: spacing.xs }}>
          <Text
            selectable
            style={[
              typography.title,
              {
                color: visual.energy,
                fontSize: 54,
                fontVariant: ["tabular-nums"],
                fontWeight: "900"
              }
            ]}
          >
            {score.toLocaleString()}
          </Text>
          <Text selectable style={[typography.eyebrow, { color: visual.secondary }]}>
            FINAL SCORE
          </Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: visual.surface,
          borderColor: `${visual.accent}66`,
          borderCurve: "continuous",
          borderRadius: 12,
          borderWidth: 1,
          flexDirection: "row",
          paddingVertical: spacing.md
        }}
      >
        <HudStat label="BEST" value={bestScore} accent={visual.energy} />
        <View style={{ backgroundColor: `${visual.accent}44`, width: 1 }} />
        <HudStat label="CHAIN" value={`${params.combo ?? "1"}x`} accent={visual.accent} />
        <View style={{ backgroundColor: `${visual.accent}44`, width: 1 }} />
        <HudStat label="VAULTS" value={params.vaults ?? "0"} accent={visual.secondary} />
      </View>

      <View
        style={{
          alignItems: "center",
          backgroundColor: `${visual.energy}10`,
          borderBottomColor: visual.energy,
          borderBottomWidth: 2,
          borderRadius: 8,
          flexDirection: "row",
          justifyContent: "space-between",
          padding: spacing.md
        }}
      >
        <Text selectable style={typography.button}>
          Progress
        </Text>
        <Text selectable style={[typography.button, { color: visual.energy }]}>
          +{points} style points
        </Text>
      </View>

      <ActionLink
        href={{ pathname: "/gameplay", params: { mode } }}
        label="PLAY AGAIN"
        detail={`Best group ${params.group ?? "0"}  •  Streak ${params.streak ?? "0"}`}
        accent={visual.accent}
        prominent
      />
      <ActionLink href="/modes" label="Choose Another Mode" accent={visual.secondary} />
      <AdBanner placement="results" />
    </ScreenShell>
  );
}
