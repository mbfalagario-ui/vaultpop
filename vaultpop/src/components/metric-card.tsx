import { colors, spacing, typography } from "@/theme";
import { Text, View } from "react-native";

type MetricCardProps = {
  label: string;
  value: string | number;
  accent?: string;
};

export function MetricCard({ label, value, accent = colors.cyan }: MetricCardProps) {
  return (
    <View
      style={{
        backgroundColor: `${accent}0C`,
        borderBottomColor: accent,
        borderBottomWidth: 2,
        borderCurve: "continuous",
        borderRadius: 8,
        flex: 1,
        gap: spacing.xs,
        minWidth: 96,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.md
      }}
    >
      <Text selectable style={[typography.caption, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text
        selectable
        style={[
          typography.sectionTitle,
          { color: accent, fontVariant: ["tabular-nums"], fontWeight: "900" }
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
