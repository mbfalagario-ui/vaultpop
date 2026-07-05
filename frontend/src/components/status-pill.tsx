import { colors, radius, spacing, typography } from "@/theme";
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
  const color = toneColor[tone];
  return (
    <View
      testID="status-pill"
      style={{
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: colors.surfaceGlass,
        borderColor: colors.border,
        borderRadius: radius.pill,
        borderWidth: 1,
        flexDirection: "row",
        gap: 7,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 6
      }}
    >
      <View
        style={{
          backgroundColor: color,
          borderRadius: 999,
          boxShadow: `0 0 8px ${color}`,
          height: 7,
          width: 7
        }}
      />
      <Text
        selectable
        style={[typography.caption, { color: colors.textSecondary, flexShrink: 1, fontSize: 12, fontWeight: "700" }]}
      >
        {label}
      </Text>
    </View>
  );
}
