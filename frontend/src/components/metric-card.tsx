import { colors, radius, spacing, typography } from "@/theme";
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
        backgroundColor: colors.surfaceGlass,
        borderColor: colors.border,
        borderCurve: "continuous",
        borderRadius: radius.md,
        borderWidth: 1,
        flex: 1,
        gap: spacing.xs,
        minWidth: 96,
        overflow: "hidden",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md
      }}
    >
      <View
        style={{
          pointerEvents: "none",
          backgroundColor: accent,
          borderRadius: 999,
          boxShadow: `0 0 10px ${accent}`,
          height: 3,
          left: spacing.md,
          position: "absolute",
          top: 0,
          width: 26
        }}
      />
      <Text
        selectable
        style={[typography.eyebrow, { color: colors.textMuted, fontSize: 9.5, letterSpacing: 1.6 }]}
      >
        {label}
      </Text>
      <Text selectable style={[typography.numeral, { color: accent, fontSize: 23 }]}>
        {value}
      </Text>
    </View>
  );
}
