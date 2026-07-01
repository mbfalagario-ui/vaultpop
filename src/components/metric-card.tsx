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
        backgroundColor: colors.surfaceRaised,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flex: 1,
        gap: spacing.xs,
        minWidth: 96,
        padding: spacing.sm
      }}
    >
      <Text selectable style={typography.caption}>
        {label}
      </Text>
      <Text
        selectable
        style={[
          typography.sectionTitle,
          { color: accent, fontVariant: ["tabular-nums"] }
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

