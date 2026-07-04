import { ActionLink } from "@/components/action-link";
import { ScreenShell } from "@/components/screen-shell";
import { colors } from "@/theme";

export function PauseScreen() {
  return (
    <ScreenShell
      eyebrow="TIME FROZEN"
      title="Paused"
      lead="Your chain is waiting."
      accent={colors.violet}
    >
      <ActionLink href="/gameplay" label="RESUME" accent={colors.violet} prominent />
      <ActionLink href="/settings" label="Settings" accent={colors.cyan} />
      <ActionLink href="/modes" label="Mode Select" accent={colors.gold} />
    </ScreenShell>
  );
}
