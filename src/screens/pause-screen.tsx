import { ActionLink } from "@/components/action-link";
import { ScreenShell } from "@/components/screen-shell";

export function PauseScreen() {
  return (
    <ScreenShell title="Paused" lead="Return to the round or choose another screen.">
      <ActionLink href="/gameplay" label="Resume" />
      <ActionLink href="/settings" label="Settings" />
      <ActionLink href="/modes" label="Mode Select" />
    </ScreenShell>
  );
}
