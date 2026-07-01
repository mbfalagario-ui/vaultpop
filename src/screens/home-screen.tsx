import { ActionLink } from "@/components/action-link";
import { MetricCard } from "@/components/metric-card";
import { ScreenShell } from "@/components/screen-shell";
import { StatusPill } from "@/components/status-pill";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, spacing, typography } from "@/theme";
import { Text, View } from "react-native";
import { InteractionManager } from "react-native";
import { useEffect } from "react";

export function HomeScreen() {
  const [profile] = useSaveProfile();
  const bestScore = Math.max(
    profile.highScores.classic,
    profile.highScores.dailyVault,
    profile.highScores.streak
  );

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void initializeAdsAfterHome();
    });
    return () => task.cancel();
  }, []);

  return (
    <ScreenShell
      eyebrow="Premium Dark Arcade"
      title="VaultPop"
      lead="Pop Coins. Complete the Chain."
    >
      <View style={{ gap: spacing.sm }}>
        <StatusPill label="Offline iOS v1" tone="cyan" />
        <Text selectable style={typography.body}>
          Tap connected groups, build combos, fill the vault meter, and chase local high scores.
        </Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <MetricCard label="Best Score" value={bestScore} accent={colors.gold} />
        <MetricCard
          label="Fictional Points"
          value={profile.cosmetics.fictionalPoints}
          accent={colors.emerald}
        />
      </View>
      <View style={{ gap: spacing.sm }}>
        <ActionLink href="/modes" label="Start" detail="Choose Classic, Daily Vault, or Streak." />
        <ActionLink href="/settings" label="Settings" />
        <ActionLink href="/shop" label="Shop" detail="Optional purchases and booster counter." />
        <ActionLink href="/cosmetics" label="Cosmetics" />
        <ActionLink href="/support" label="Support" detail="Private in-app help request." />
        <ActionLink href="/legal" label="Privacy, Support, and Legal" />
      </View>
      <AdBanner placement="home" />
    </ScreenShell>
  );
}
import { initializeAdsAfterHome } from "@/ads/ad-service";
import { AdBanner } from "@/components/ad-banner";
