import { ActionLink } from "@/components/action-link";
import { CoinFace } from "@/components/coin-face";
import { GameLogo } from "@/components/game-logo";
import { ScreenShell } from "@/components/screen-shell";
import { colors, spacing } from "@/theme";
import { View } from "react-native";

export function PauseScreen() {
  return (
    <ScreenShell
      eyebrow="TIME FROZEN"
      title="Paused"
      lead="Your chain is waiting."
      accent={colors.violet}
    >
      <View style={{ alignItems: "center", paddingVertical: spacing.lg, gap: spacing.lg }}>
        <CoinFace type="violet" size={84} glow />
        <GameLogo compact />
      </View>
      <ActionLink href="/gameplay" label="RESUME" accent={colors.gold} prominent testID="pause-resume" />
      <ActionLink href="/settings" label="Settings" accent={colors.cyan} />
      <ActionLink href="/modes" label="Mode Select" accent={colors.violet} />
    </ScreenShell>
  );
}
