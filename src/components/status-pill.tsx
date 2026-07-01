import { colors, spacing, typography } from "@/theme";
import { Text, View } from "react-native";

type StatusPillProps = {
  label: string;
  tone?: "gold" | "cyan" | "emerald" | "violet";
};

const toneColor = {
  gold: colors.gold,
  cyan: colors.cyan,
  emerald: colors.emerald,
  violet: colors.violet
};

export function StatusPill({ label, tone = "gold" }: StatusPillProps) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderColor: toneColor[tone],
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs
      }}
    >
      <Text selectable style={typography.caption}>
        {label}
      </Text>
    </View>
  );
}
