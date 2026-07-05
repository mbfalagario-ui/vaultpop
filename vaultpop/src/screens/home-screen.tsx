import { AdBanner } from "@/components/ad-banner";
import { ActionLink } from "@/components/action-link";
import { ArcadeGlyph } from "@/components/arcade-glyph";
import { GameLogo } from "@/components/game-logo";
import { HudStat } from "@/components/hud-stat";
import { ScreenShell } from "@/components/screen-shell";
import type { GameModeId, TileType } from "@/game/models";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, getModeVisual, spacing, typography } from "@/theme";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

const modeTiles: { id: GameModeId; glyph: TileType; label: string }[] = [
  { id: "classic", glyph: "violet", label: "Classic" },
  { id: "dailyVault", glyph: "cyan", label: "Daily" },
  { id: "streak", glyph: "gold", label: "Streak" }
];

export function HomeScreen() {
  const [profile] = useSaveProfile();
  const bestScore = Math.max(
    profile.highScores.classic,
    profile.highScores.dailyVault,
    profile.highScores.streak
  );

  return (
    <ScreenShell title="" compact showBack={false}>
      <View style={{ alignItems: "center", gap: spacing.lg, paddingTop: spacing.lg }}>
        <GameLogo />
        <View
          style={{
            alignItems: "center",
            height: 118,
            justifyContent: "center",
            width: "100%"
          }}
        >
          <View
            style={{
              backgroundColor: "#0B0B17",
              borderColor: colors.border,
              borderRadius: 999,
              borderWidth: 1,
              height: 106,
              position: "absolute",
              width: 270
            }}
          />
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            {(["gold", "cyan", "ruby", "emerald", "violet"] as TileType[]).map(
              (type, index) => {
                const accent = [
                  colors.gold,
                  colors.cyan,
                  colors.ruby,
                  colors.emerald,
                  colors.violet
                ][index]!;
                return (
                  <View
                    key={type}
                    style={{
                      alignItems: "center",
                      backgroundColor: `${accent}20`,
                      borderColor: accent,
                      borderRadius: 999,
                      borderWidth: 1,
                      boxShadow: `0 0 18px ${accent}44`,
                      height: index === 2 ? 64 : 52,
                      justifyContent: "center",
                      transform: [{ translateY: index % 2 === 0 ? -5 : 7 }],
                      width: index === 2 ? 64 : 52
                    }}
                  >
                    <ArcadeGlyph color={accent} modeId="classic" size={26} type={type} />
                  </View>
                );
              }
            )}
          </View>
        </View>
      </View>

      <ActionLink
        href="/modes"
        label="PLAY"
        detail="Choose your vault."
        accent={colors.gold}
        prominent
      />

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
        <HudStat label="BEST" value={bestScore} accent={colors.gold} />
        <View style={{ backgroundColor: colors.border, width: 1 }} />
        <HudStat
          label="VAULT COINS"
          value={profile.economy.vaultCoins}
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

      <View style={{ gap: spacing.sm }}>
        <Text selectable style={[typography.eyebrow, { color: colors.textMuted }]}>
          THREE VAULTS. THREE RHYTHMS.
        </Text>
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
                  style={({ pressed }) => ({
                    alignItems: "center",
                    backgroundColor: visual.surface,
                    borderColor: visual.accent,
                    borderCurve: "continuous",
                    borderRadius: 12,
                    borderWidth: 1,
                    flex: 1,
                    gap: spacing.sm,
                    minHeight: 106,
                    opacity: pressed ? 0.72 : 1,
                    padding: spacing.sm
                  })}
                >
                  <View
                    style={{
                      alignItems: "center",
                      backgroundColor: `${visual.accent}18`,
                      borderRadius: 999,
                      height: 48,
                      justifyContent: "center",
                      width: 48
                    }}
                  >
                    <ArcadeGlyph
                      color={visual.accent}
                      modeId={mode.id}
                      size={25}
                      type={mode.glyph}
                    />
                  </View>
                  <Text selectable style={[typography.caption, { color: visual.accent }]}>
                    {mode.label}
                  </Text>
                </Pressable>
              </Link>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <View style={{ flexBasis: "100%" }}>
          <ActionLink
            href="/how-to-play"
            label="How to Play"
            detail="Rules, modes, scoring, and boosters."
            accent={colors.gold}
          />
        </View>
        <View style={{ flexBasis: "48%", flexGrow: 1 }}>
          <ActionLink href="/shop" label="Shop" accent={colors.ruby} />
        </View>
        <View style={{ flexBasis: "48%", flexGrow: 1 }}>
          <ActionLink href="/cosmetics" label="Styles" accent={colors.violet} />
        </View>
        <View style={{ flexBasis: "48%", flexGrow: 1 }}>
          <ActionLink href="/settings" label="Settings" accent={colors.cyan} />
        </View>
        <View style={{ flexBasis: "48%", flexGrow: 1 }}>
          <ActionLink href="/support" label="Support" accent={colors.emerald} />
        </View>
      </View>
      <ActionLink href="/legal" label="Privacy & Legal" accent={colors.borderBright} />
      <AdBanner placement="home" />
    </ScreenShell>
  );
}
