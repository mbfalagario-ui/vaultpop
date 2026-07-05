import { colors, spacing, typography } from "@/theme";
import { Text, View } from "react-native";

export function HudStat({
  label,
  value,
  accent = colors.cyan
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <View style={{ alignItems: "center", flex: 1, gap: 1, minWidth: 76 }}>
      <Text selectable style={[typography.eyebrow, { color: colors.textMuted, fontSize: 10 }]}>
        {label}
      </Text>
      <Text
        selectable
        style={[
          typography.sectionTitle,
          {
            color: accent,
            fontSize: 21,
            fontVariant: ["tabular-nums"],
            fontWeight: "900"
          }
        ]}
      >
        {value}
      </Text>
      <View
        style={{
          backgroundColor: accent,
          borderRadius: 999,
          height: 2,
          marginTop: spacing.xs,
          opacity: 0.7,
          width: 30
        }}
      />
    </View>
  );
}
