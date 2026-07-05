import { ActionLink } from "@/components/action-link";
import { ScreenShell } from "@/components/screen-shell";
import { Text } from "react-native";

export default function NotFoundRoute() {
  return (
    <ScreenShell eyebrow="Route" title="Screen Not Found">
      <Text selectable>This screen is outside the VaultPop iOS contract.</Text>
      <ActionLink href="/" label="Return Home" />
    </ScreenShell>
  );
}
