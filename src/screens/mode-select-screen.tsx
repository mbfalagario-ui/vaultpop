import { ModeCard } from "@/components/mode-card";
import { ScreenShell } from "@/components/screen-shell";
import { GAME_MODES } from "@/game/constants";
import { getDailySeed, getLocalDateKey } from "@/game/daily-seed";
import { useSaveProfile } from "@/storage/use-save-profile";
import { spacing, typography } from "@/theme";
import { Text, View } from "react-native";
import { useEffect } from "react";

export function ModeSelectScreen() {
  const [profile] = useSaveProfile();
  const dailyDateKey = getLocalDateKey();
  const dailySeed = getDailySeed();

  useEffect(() => {
    clearRewardedCooldown();
  }, []);

  return (
    <ScreenShell title="Choose Mode" lead="Three offline modes are ready for iOS v1.">
      <View style={{ gap: spacing.md }}>
        {GAME_MODES.map((mode) => (
          <ModeCard
            key={mode.id}
            mode={mode}
            bestScore={profile.highScores[mode.id]}
            detail={
              mode.id === "dailyVault"
                ? `${dailyDateKey} seed saved locally: ${dailySeed}`
                : undefined
            }
          />
        ))}
      </View>
      <Text selectable style={typography.caption}>
        Daily Vault uses the same board seed all day on this device.
      </Text>
      <AdBanner placement="mode-select" />
    </ScreenShell>
  );
}
import { clearRewardedCooldown } from "@/ads/ad-service";
import { AdBanner } from "@/components/ad-banner";
