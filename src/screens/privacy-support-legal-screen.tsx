import { ActionButton } from "@/components/action-button";
import { ActionLink } from "@/components/action-link";
import { ScreenShell } from "@/components/screen-shell";
import { legalOutline } from "@/legal/policy-outline";
import { spacing, typography } from "@/theme";
import { Linking, Text, View } from "react-native";

export function PrivacySupportLegalScreen() {
  return (
    <ScreenShell
      title="Privacy, Support, and Legal"
      lead="How VaultPop handles gameplay data, purchases, advertising, and support."
    >
      <View style={{ gap: spacing.md }}>
        {Object.entries(legalOutline).map(([section, items]) => (
          <View key={section} style={{ gap: spacing.xs }}>
            <Text selectable style={typography.sectionTitle}>
              {section}
            </Text>
            {items.map((item) => (
              <Text selectable key={item} style={typography.body}>
                {item}
              </Text>
            ))}
          </View>
        ))}
      </View>
      <View style={{ gap: spacing.sm }}>
        <ActionLink
          href="/support"
          label="In-App Support"
          detail="Send a private support or privacy request."
        />
        <ActionButton
          label="Email Support"
          detail="Opens your mail app."
          onPress={() => {
            void Linking.openURL("mailto:support@vaultpop.app");
          }}
        />
        <ActionButton
          label="Privacy Policy"
          detail="Opens the policy URL."
          onPress={() => {
            void Linking.openURL("https://vaultpop-api.fly.dev/privacy");
          }}
        />
      </View>
    </ScreenShell>
  );
}
