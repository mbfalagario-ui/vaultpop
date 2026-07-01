import { ScreenShell } from "@/components/screen-shell";
import { StatusPill } from "@/components/status-pill";
import { typography } from "@/theme";
import { Text } from "react-native";

export function SplashScreen() {
  return (
    <ScreenShell eyebrow="Loading" title="VaultPop">
      <StatusPill label="Portrait iPhone shell" tone="gold" />
      <Text selectable style={typography.body}>
        App startup is local-first and reaches the first playable screen without network calls.
      </Text>
    </ScreenShell>
  );
}
