import { clearRewardedCooldown } from "@/ads/ad-service";
import { AdBanner } from "@/components/ad-banner";
import { ArcadeGlyph } from "@/components/arcade-glyph";
import { ModeCard } from "@/components/mode-card";
import { ScreenShell } from "@/components/screen-shell";
import { GAME_MODES } from "@/game/constants";
import { getLocalDateKey } from "@/game/daily-seed";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, getModeVisual, spacing, typography } from "@/theme";
import { Text, View } from "react-native";
import { useEffect } from "react";

export function ModeSelectScreen() {
  const [profile] = useSaveProfile();
  const dailyDateKey = getLocalDateKey();

  useEffect(() => {
    clearRewardedCooldown();
  }, []);

  return (
    <ScreenShell
      eyebrow="CHOOSE YOUR VAULT"
      title=""
      accent={colors.violet}
      compact
    >
      <Text selectable style={[typography.body, { color: colors.textSecondary }]}>
        Pick a rhythm. Chase a new best.
      </Text>
      <View
        style={{
          alignItems: "center",
          height: 58,
          justifyContent: "center",
          position: "relative"
        }}
      >
        <View
          pointerEvents="none"
          style={{
            backgroundColor: colors.border,
            height: 1,
            left: "14%",
            position: "absolute",
            right: "14%"
          }}
        />
        <View style={{ flexDirection: "row", gap: 44 }}>
          {GAME_MODES.map((mode) => {
            const visual = getModeVisual(mode.id);
            const glyph =
              mode.id === "classic"
                ? "violet"
                : mode.id === "dailyVault"
                  ? "cyan"
                  : "gold";
            return (
              <View
                key={mode.id}
                style={{
                  alignItems: "center",
                  backgroundColor: visual.board,
                  borderColor: visual.accent,
                  borderRadius: 999,
                  borderWidth: 1,
                  boxShadow: `0 0 14px ${visual.accent}44`,
                  height: 42,
                  justifyContent: "center",
                  width: 42
                }}
              >
                <ArcadeGlyph
                  color={visual.accent}
                  modeId={mode.id}
                  size={20}
                  type={glyph}
                />
              </View>
            );
          })}
        </View>
      </View>
      <View style={{ gap: spacing.md }}>
        {GAME_MODES.map((mode) => (
          <ModeCard
            key={mode.id}
            mode={mode}
            bestScore={profile.highScores[mode.id]}
            detail={
              mode.id === "dailyVault"
                ? dailyDateKey
                : undefined
            }
          />
        ))}
      </View>
      <Text selectable style={[typography.caption, { color: colors.textMuted }]}>
        Daily Vault refreshes once per local day.
      </Text>
      <AdBanner placement="mode-select" />
    </ScreenShell>
  );
}
