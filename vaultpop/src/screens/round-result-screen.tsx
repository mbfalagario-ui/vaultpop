import { canShowInterstitial } from "@/ads/ad-policy";
import {
  isAdsInitialized,
  isFullScreenAdShowing,
  showInterstitialAd,
  wasRewardedJustShown
} from "@/ads/ad-service";
import { AdBanner } from "@/components/ad-banner";
import { ActionButton } from "@/components/action-button";
import { ActionLink } from "@/components/action-link";
import { CoinConfetti } from "@/components/coin-confetti";
import { CoinFace } from "@/components/coin-face";
import { HudStat } from "@/components/hud-stat";
import { ScreenShell } from "@/components/screen-shell";
import { ShareScoreCard, type ScoreCardHandle } from "@/components/share-score-card";
import { playSfx } from "@/audio/sfx";
import type { GameModeId, TileType } from "@/game/models";
import { isAdFree } from "@/monetization/entitlements";
import { submitLeaderboardScore } from "@/social/leaderboard-service";
import { getPlayerHandle } from "@/social/player-identity";
import { recordPlayToday } from "@/social/streak-tracker";
import { recordInterstitialShown } from "@/storage";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, getModeVisual, radius, spacing, typography } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";

function normalizeMode(value: string | undefined): GameModeId {
  return value === "dailyVault" || value === "streak" || value === "blitz"
    ? value
    : "classic";
}

const MODE_GLYPHS: Record<GameModeId, TileType> = {
  classic: "violet",
  dailyVault: "cyan",
  streak: "gold",
  blitz: "ruby"
};

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
  const newBest = score >= bestScore && score > 0;
  const glyph = MODE_GLYPHS[mode];
  const [displayScore, setDisplayScore] = useState(0);
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [shareNote, setShareNote] = useState("");
  const shotRef = useRef<ScoreCardHandle>(null);
  const handle = getPlayerHandle();
  const medalScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    playSfx("win", profile.settings.soundEnabled);
    const streak = recordPlayToday();
    setStreakDays(streak.current);
    void submitLeaderboardScore({
      installId: profile.support.installId,
      handle,
      mode,
      score
    }).then((result) => {
      if (result?.accepted && result.rank) {
        setGlobalRank(result.rank);
      }
    });
    // Run once per results view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shareCard = async () => {
    try {
      const uri = await shotRef.current?.capture();
      if (!uri) {
        throw new Error("capture failed");
      }
      const Sharing = await import("expo-sharing");
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          dialogTitle: "Share your VaultPop score",
          mimeType: "image/png"
        });
        setShareNote("");
      } else {
        setShareNote("Image sharing opens the share sheet on iPhone.");
      }
    } catch {
      setShareNote("Could not export the score card on this device.");
    }
  };


  useEffect(() => {
    Animated.spring(medalScale, {
      damping: 9,
      stiffness: 160,
      toValue: 1,
      useNativeDriver: true
    }).start();
    if (profile.settings.reducedMotion || score <= 0) {
      setDisplayScore(score);
      return undefined;
    }
    const steps = 24;
    let step = 0;
    const intervalId = setInterval(() => {
      step += 1;
      const eased = 1 - Math.pow(1 - step / steps, 3);
      setDisplayScore(Math.round(score * eased));
      if (step >= steps) {
        clearInterval(intervalId);
      }
    }, 34);
    return () => clearInterval(intervalId);
  }, [medalScale, profile.settings.reducedMotion, score]);

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
    <ScreenShell eyebrow={visual.name} title="" accent={visual.accent} compact showBack={false}>
      {!profile.settings.reducedMotion ? <CoinConfetti /> : null}
      {/* Celebration medal */}
      <View style={{ alignItems: "center", gap: spacing.md, paddingTop: spacing.lg }}>
        <Animated.View
          style={{
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: medalScale }]
          }}
        >
          {/* Rays */}
          {[0, 30, 60, 90, 120, 150].map((angle) => (
            <View
              key={angle}
              style={{
                pointerEvents: "none",
                backgroundColor: `${visual.accent}30`,
                borderRadius: 999,
                height: 168,
                position: "absolute",
                transform: [{ rotate: `${angle}deg` }],
                width: 3
              }}
            />
          ))}
          <View
            style={{
              alignItems: "center",
              backgroundColor: colors.surfaceRaised,
              borderColor: `${visual.accent}88`,
              borderRadius: radius.pill,
              borderWidth: 2,
              boxShadow: `0 0 44px ${visual.accent}55`,
              height: 116,
              justifyContent: "center",
              width: 116
            }}
          >
            <CoinFace type={glyph} size={78} glow />
          </View>
        </Animated.View>

        {newBest ? (
          <View
            style={{
              backgroundColor: `${colors.gold}1C`,
              borderColor: colors.gold,
              borderRadius: radius.pill,
              borderWidth: 1,
              boxShadow: `0 0 18px ${colors.gold}55`,
              paddingHorizontal: spacing.md,
              paddingVertical: 5
            }}
          >
            <Text selectable style={[typography.eyebrow, { color: colors.gold }]}>
              NEW PERSONAL BEST
            </Text>
          </View>
        ) : (
          <Text selectable style={[typography.eyebrow, { color: visual.secondary }]}>
            VAULT SECURED
          </Text>
        )}

        <View style={{ alignItems: "center" }} testID="result-score">
          <Text
            selectable
            style={{
              color: visual.energy,
              fontSize: 62,
              fontStyle: "italic",
              fontVariant: ["tabular-nums"],
              fontWeight: "900",
              letterSpacing: -1.5,
              textShadowColor: `${visual.energy}55`,
              textShadowOffset: { height: 0, width: 0 },
              textShadowRadius: 22
            }}
          >
            {displayScore.toLocaleString()}
          </Text>
          <Text
            selectable
            style={[typography.eyebrow, { color: colors.textMuted, fontSize: 10, letterSpacing: 3 }]}
          >
            FINAL SCORE
          </Text>
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, paddingTop: spacing.xs }}>
            {globalRank ? (
              <View
                testID="result-global-rank"
                style={{
                  backgroundColor: `${colors.cyan}18`,
                  borderColor: `${colors.cyan}66`,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  paddingHorizontal: spacing.sm + 2,
                  paddingVertical: 4
                }}
              >
                <Text selectable style={[typography.eyebrow, { color: colors.cyan, fontSize: 10 }]}>
                  GLOBAL #{globalRank}
                </Text>
              </View>
            ) : null}
            {streakDays > 0 ? (
              <View
                testID="result-streak-chip"
                style={{
                  backgroundColor: `${colors.gold}14`,
                  borderColor: `${colors.gold}55`,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  paddingHorizontal: spacing.sm + 2,
                  paddingVertical: 4
                }}
              >
                <Text selectable style={[typography.eyebrow, { color: colors.gold, fontSize: 10 }]}>
                  {streakDays} DAY STREAK
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Run summary */}
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
        <HudStat label="BEST" value={bestScore.toLocaleString()} accent={visual.energy} />
        <View style={{ backgroundColor: colors.border, width: 1 }} />
        <HudStat label="CHAIN" value={`${params.combo ?? "1"}x`} accent={visual.accent} />
        <View style={{ backgroundColor: colors.border, width: 1 }} />
        <HudStat label="VAULTS" value={params.vaults ?? "0"} accent={visual.secondary} />
      </View>

      {/* Rewards */}
      <LinearGradient
        colors={[`${visual.energy}1A`, `${visual.energy}05`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          alignItems: "center",
          borderColor: `${visual.energy}44`,
          borderCurve: "continuous",
          borderRadius: radius.md,
          borderWidth: 1,
          flexDirection: "row",
          justifyContent: "space-between",
          padding: spacing.md
        }}
      >
        <View style={{ gap: 2 }}>
          <Text selectable style={[typography.button, { fontSize: 15 }]}>
            Style Points Earned
          </Text>
          <Text selectable style={[typography.caption, { color: colors.textMuted, fontSize: 11.5 }]}>
            Best group {params.group ?? "0"} · Streak {params.streak ?? "0"}
          </Text>
        </View>
        <Text
          selectable
          style={[typography.numeral, { color: visual.energy, fontSize: 26 }]}
        >
          +{points}
        </Text>
      </LinearGradient>

      <ActionLink
        href={{ pathname: "/gameplay", params: { mode } }}
        label="PLAY AGAIN"
        accent={colors.gold}
        prominent
        testID="result-play-again"
      />
      <ActionLink
        href="/modes"
        label="Choose Another Mode"
        accent={visual.secondary}
        testID="result-mode-select"
      />

      {/* Shareable score card */}
      <View style={{ gap: spacing.sm, paddingTop: spacing.sm }}>
        <ShareScoreCard
          ref={shotRef}
          mode={mode}
          score={score}
          best={bestScore}
          combo={`${params.combo ?? "1"}x`}
          handle={handle}
        />
        <ActionButton
          label="Share Score Card"
          detail="Exports this card as an image."
          tone="quiet"
          testID="result-share-button"
          onPress={() => void shareCard()}
        />
        {shareNote ? (
          <Text selectable style={[typography.caption, { color: colors.textMuted, fontSize: 11.5, textAlign: "center" }]}>
            {shareNote}
          </Text>
        ) : null}
      </View>
      <AdBanner placement="results" />
    </ScreenShell>
  );
}
