import { clearRewardedCooldown } from "@/ads/ad-service";
import { ActionLink } from "@/components/action-link";
import { AdBanner } from "@/components/ad-banner";
import { ModeCard } from "@/components/mode-card";
import { ScreenShell } from "@/components/screen-shell";
import { GAME_MODES } from "@/game/constants";
import { getLocalDateKey } from "@/game/daily-seed";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, spacing, typography } from "@/theme";
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
      title="Game Modes"
      lead="Three rhythms. One goal: a new best."
      accent={colors.violet}
      compact
    >
      <View style={{ gap: spacing.md, paddingTop: spacing.xs }}>
        {GAME_MODES.map((mode) => (
          <ModeCard
            key={mode.id}
            mode={mode}
            bestScore={profile.highScores[mode.id]}
            detail={mode.id === "dailyVault" ? dailyDateKey : undefined}
          />
        ))}
      </View>
      <Text
        selectable
        style={[typography.caption, { color: colors.textMuted, textAlign: "center" }]}
      >
        Daily Vault refreshes once per local day.
      </Text>
      <ActionLink href="/" label="Home" accent={colors.cyan} testID="modes-home" />
      <AdBanner placement="mode-select" />
    </ScreenShell>
  );
}
