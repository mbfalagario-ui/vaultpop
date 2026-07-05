import { AdBanner } from "@/components/ad-banner";
import { ActionLink } from "@/components/action-link";
import { CoinFace } from "@/components/coin-face";
import { GameLogo } from "@/components/game-logo";
import { HudStat } from "@/components/hud-stat";
import { ScreenShell } from "@/components/screen-shell";
import type { GameModeId, TileType } from "@/game/models";
import { fetchLeaderboard, type LeaderboardEntry } from "@/social/leaderboard-service";
import { getStreakInfo } from "@/social/streak-tracker";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, getModeVisual, radius, spacing, typography } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";

const modeTiles: { id: GameModeId; glyph: TileType; label: string }[] = [
  { id: "classic", glyph: "violet", label: "Classic" },
  { id: "dailyVault", glyph: "cyan", label: "Daily" },
  { id: "streak", glyph: "gold", label: "Streak" },
  { id: "blitz", glyph: "ruby", label: "Blitz" }
];

const heroCoins: { type: TileType; size: number; lift: number }[] = [
  { type: "emerald", size: 44, lift: 10 },
  { type: "cyan", size: 54, lift: -8 },
  { type: "gold", size: 76, lift: 0 },
  { type: "violet", size: 54, lift: -8 },
  { type: "ruby", size: 44, lift: 10 }
];

export function HomeScreen() {
  const [profile] = useSaveProfile();
  const float = useRef(new Animated.Value(0)).current;
  const playPulse = useRef(new Animated.Value(1)).current;
  const [topEntries, setTopEntries] = useState<LeaderboardEntry[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const bestScore = Math.max(
    profile.highScores.classic,
    profile.highScores.dailyVault,
    profile.highScores.streak,
    profile.highScores.blitz
  );

  useEffect(() => {
    setStreakDays(getStreakInfo().current);
    let active = true;
    const load = async () => {
      const snapshot = await fetchLeaderboard("classic", 3, profile.support.installId);
      if (active && snapshot) {
        setTopEntries(snapshot.entries);
      }
    };
    void load();
    const intervalId = setInterval(load, 15_000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [profile.support.installId]);

  useEffect(() => {
    if (profile.settings.reducedMotion) {
      return;
    }
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { duration: 2200, toValue: 1, useNativeDriver: true }),
        Animated.timing(float, { duration: 2200, toValue: 0, useNativeDriver: true })
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(playPulse, { duration: 900, toValue: 1.02, useNativeDriver: true }),
        Animated.timing(playPulse, { duration: 900, toValue: 1, useNativeDriver: true })
      ])
    ).start();
  }, [float, playPulse, profile.settings.reducedMotion]);

  const floatShift = float.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });

  return (
    <ScreenShell title="" accent={colors.gold} compact showBack={false}>
      {/* Hero */}
      <View style={{ alignItems: "center", gap: spacing.lg, paddingTop: spacing.xl }}>
        <GameLogo />
        <Animated.View
          style={{
            alignItems: "flex-end",
            flexDirection: "row",
            gap: spacing.sm,
            paddingVertical: spacing.md,
            transform: [{ translateY: floatShift }]
          }}
        >
          {heroCoins.map((coin) => (
            <View key={coin.type} style={{ transform: [{ translateY: coin.lift }] }}>
              <CoinFace type={coin.type} size={coin.size} glow />
            </View>
          ))}
        </Animated.View>
      </View>

      <Animated.View style={{ transform: [{ scale: playPulse }] }}>
        <ActionLink
          href={{ pathname: "/gameplay", params: { mode: "classic" } }}
          label="PLAY"
          detail="Classic · 60 second score attack"
          accent={colors.gold}
          prominent
          testID="home-play-button"
        />
      </Animated.View>

      {/* Player status band */}
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
        <HudStat label="BEST" value={bestScore.toLocaleString()} accent={colors.gold} />
        <View style={{ backgroundColor: colors.border, width: 1 }} />
        <HudStat
          label="VAULT COINS"
          value={profile.economy.vaultCoins.toLocaleString()}
          accent={colors.cyan}
        />
        <View style={{ backgroundColor: colors.border, width: 1 }} />
        <HudStat
          label="BOOSTERS"
          value={
            profile.economy.boosters.bonusLives +
            profile.economy.boosters.chainBoosts +
            profile.economy.boosters.vaultBursts
          }
          accent={colors.emerald}
        />
      </View>

      {/* Mode teasers */}
      <View style={{ gap: spacing.sm }}>
        <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
          <Text selectable style={[typography.eyebrow, { color: colors.textMuted }]}>
            PICK YOUR VAULT
          </Text>
          <Link href="/modes" asChild>
            <Pressable testID="home-all-modes-link" hitSlop={8}>
              <Text selectable={false} style={[typography.eyebrow, { color: colors.cyan }]}>
                ALL MODES
              </Text>
            </Pressable>
          </Link>
        </View>
        {[modeTiles.slice(0, 2), modeTiles.slice(2, 4)].map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: "row", gap: spacing.sm }}>
            {row.map((mode) => {
              const visual = getModeVisual(mode.id);
              return (
                <View key={mode.id} style={{ flex: 1 }}>
                  <Link
                    href={{ pathname: "/gameplay", params: { mode: mode.id } }}
                    asChild
                  >
                  <Pressable
                    accessibilityLabel={`Play ${mode.label}`}
                    testID={`home-mode-${mode.id}`}
                    style={({ pressed }) => ({
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                      width: "100%"
                    })}
                  >
                  <LinearGradient
                    colors={[visual.surfaceRaised, visual.board]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                    style={{
                      alignItems: "center",
                      borderColor: `${visual.accent}44`,
                      borderCurve: "continuous",
                      borderRadius: radius.md,
                      borderWidth: 1,
                      flexDirection: "row",
                      gap: spacing.sm,
                      justifyContent: "center",
                      minHeight: 74,
                      padding: spacing.sm
                    }}
                  >
                    <CoinFace type={mode.glyph} size={40} glow />
                    <Text
                      selectable={false}
                      style={[
                        typography.eyebrow,
                        { color: visual.accent, fontSize: 11, letterSpacing: 1.6 }
                      ]}
                    >
                      {mode.label}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </Link>
                </View>
            );
            })}
          </View>
        ))}
      </View>

      {/* Global ranks + daily streak */}
      <View
        style={{
          backgroundColor: colors.surfaceGlass,
          borderColor: colors.border,
          borderCurve: "continuous",
          borderRadius: radius.lg,
          borderWidth: 1,
          overflow: "hidden"
        }}
      >
        <View
          style={{
            alignItems: "center",
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + 2
          }}
        >
          <Text selectable style={[typography.eyebrow, { color: colors.cyan }]}>
            GLOBAL VAULT RANKS
          </Text>
          <Link href="/streaks" asChild>
            <Pressable
              accessibilityLabel={`${streakDays} day streak`}
              testID="home-streak-chip"
              hitSlop={6}
              style={({ pressed }) => ({
                alignItems: "center",
                backgroundColor: streakDays > 0 ? `${colors.gold}18` : colors.surfaceRaised,
                borderColor: streakDays > 0 ? `${colors.gold}66` : colors.border,
                borderRadius: radius.pill,
                borderWidth: 1,
                flexDirection: "row",
                gap: 6,
                paddingHorizontal: spacing.sm + 2,
                paddingVertical: 4,
                transform: [{ scale: pressed ? 0.95 : 1 }]
              })}
            >
              <CoinFace type="gold" size={14} />
              <Text
                selectable={false}
                style={[typography.eyebrow, { color: streakDays > 0 ? colors.gold : colors.textMuted, fontSize: 9.5 }]}
              >
                {streakDays} DAY STREAK
              </Text>
            </Pressable>
          </Link>
        </View>
        <Link href="/leaderboard" asChild>
          <Pressable
            accessibilityLabel="Open global leaderboard"
            testID="home-leaderboard-card"
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            {topEntries.length === 0 ? (
              <View style={{ alignItems: "center", gap: 4, paddingVertical: spacing.md }}>
                <Text selectable style={[typography.button, { fontSize: 14 }]}>
                  Claim the first vault
                </Text>
                <Text selectable style={[typography.caption, { color: colors.textMuted, fontSize: 11.5 }]}>
                  Finish a round to enter the global leaderboard.
                </Text>
              </View>
            ) : (
              <View>
                {topEntries.map((entry, index) => (
                  <View
                    key={`${entry.handle}-${index}`}
                    style={{
                      alignItems: "center",
                      backgroundColor: entry.you ? `${colors.cyan}12` : "transparent",
                      borderBottomColor: index === topEntries.length - 1 ? "transparent" : colors.border,
                      borderBottomWidth: 1,
                      flexDirection: "row",
                      gap: spacing.sm,
                      minHeight: 42,
                      paddingHorizontal: spacing.md
                    }}
                  >
                    <Text
                      selectable={false}
                      style={[
                        typography.numeral,
                        { color: index === 0 ? colors.gold : colors.textMuted, fontSize: 13, width: 26 }
                      ]}
                    >
                      #{index + 1}
                    </Text>
                    <Text selectable={false} numberOfLines={1} style={[typography.button, { flex: 1, fontSize: 13.5 }]}>
                      {entry.handle}
                    </Text>
                    {entry.you ? (
                      <Text selectable={false} style={[typography.eyebrow, { color: colors.cyan, fontSize: 9 }]}>
                        YOU
                      </Text>
                    ) : null}
                    <Text selectable={false} style={[typography.numeral, { color: colors.cyan, fontSize: 14 }]}>
                      {entry.score.toLocaleString()}
                    </Text>
                  </View>
                ))}
                <View style={{ alignItems: "center", paddingVertical: spacing.sm }}>
                  <Text selectable={false} style={[typography.eyebrow, { color: colors.textMuted, fontSize: 9 }]}>
                    SEE FULL LEADERBOARD
                  </Text>
                </View>
              </View>
            )}
          </Pressable>
        </Link>
      </View>

      {/* Quiet footer */}
      <View style={{ gap: spacing.sm, paddingTop: spacing.sm }}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <ActionLink href="/shop" label="Shop" accent={colors.ruby} />
          </View>
          <View style={{ flex: 1 }}>
            <ActionLink href="/cosmetics" label="Styles" accent={colors.violet} />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <ActionLink href="/how-to-play" label="How to Play" accent={colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <ActionLink href="/settings" label="Settings" accent={colors.cyan} />
          </View>
        </View>
        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            gap: spacing.lg,
            justifyContent: "center",
            paddingTop: spacing.xs
          }}
        >
          <Link href="/support" asChild>
            <Pressable testID="home-support-link" hitSlop={8}>
              <Text selectable={false} style={[typography.caption, { color: colors.textMuted, fontSize: 12 }]}>
                Support
              </Text>
            </Pressable>
          </Link>
          <View style={{ backgroundColor: colors.border, borderRadius: 999, height: 3, width: 3 }} />
          <Link href="/legal" asChild>
            <Pressable testID="home-legal-link" hitSlop={8}>
              <Text selectable={false} style={[typography.caption, { color: colors.textMuted, fontSize: 12 }]}>
                Privacy & Legal
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
      <AdBanner placement="home" />
    </ScreenShell>
  );
}
