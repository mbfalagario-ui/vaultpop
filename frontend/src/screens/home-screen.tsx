import { AdBanner } from "@/components/ad-banner";
import { ActionLink } from "@/components/action-link";
import { CoinFace } from "@/components/coin-face";
import { GameLogo } from "@/components/game-logo";
import { HudStat } from "@/components/hud-stat";
import { ScreenShell } from "@/components/screen-shell";
import type { GameModeId, TileType } from "@/game/models";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, getModeVisual, radius, spacing, typography } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";

const modeTiles: { id: GameModeId; glyph: TileType; label: string }[] = [
  { id: "classic", glyph: "violet", label: "Classic" },
  { id: "dailyVault", glyph: "cyan", label: "Daily" },
  { id: "streak", glyph: "gold", label: "Streak" }
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
  const bestScore = Math.max(
    profile.highScores.classic,
    profile.highScores.dailyVault,
    profile.highScores.streak
  );

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
  }, [float, profile.settings.reducedMotion]);

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

      <ActionLink
        href={{ pathname: "/gameplay", params: { mode: "classic" } }}
        label="PLAY"
        detail="Classic · 60 second score attack"
        accent={colors.gold}
        prominent
        testID="home-play-button"
      />

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
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {modeTiles.map((mode) => {
            const visual = getModeVisual(mode.id);
            return (
              <Link
                key={mode.id}
                href={{ pathname: "/gameplay", params: { mode: mode.id } }}
                asChild
              >
                <Pressable
                  accessibilityLabel={`Play ${mode.label}`}
                  testID={`home-mode-${mode.id}`}
                  style={({ pressed }) => ({
                    flex: 1,
                    transform: [{ scale: pressed ? 0.96 : 1 }]
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
                      gap: spacing.sm,
                      minHeight: 108,
                      justifyContent: "center",
                      padding: spacing.sm
                    }}
                  >
                    <CoinFace type={mode.glyph} size={44} glow />
                    <Text
                      selectable={false}
                      style={[
                        typography.eyebrow,
                        { color: visual.accent, fontSize: 10, letterSpacing: 1.6 }
                      ]}
                    >
                      {mode.label}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </Link>
            );
          })}
        </View>
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
