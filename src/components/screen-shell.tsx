import { colors, spacing, typography } from "@/theme";
import { PropsWithChildren } from "react";
import { ScrollView, Text, View } from "react-native";

type ScreenShellProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  lead?: string;
}>;

export function ScreenShell({ eyebrow, title, lead, children }: ScreenShellProps) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        gap: spacing.lg,
        minHeight: "100%",
        padding: spacing.lg
      }}
    >
      <View style={{ gap: spacing.sm }}>
        {eyebrow ? (
          <Text selectable style={typography.eyebrow}>
            {eyebrow}
          </Text>
        ) : null}
        <Text selectable style={typography.title}>
          {title}
        </Text>
        {lead ? (
          <Text selectable style={typography.body}>
            {lead}
          </Text>
        ) : null}
      </View>
      {children}
    </ScrollView>
  );
}
