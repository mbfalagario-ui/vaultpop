import { colors, spacing, typography } from "@/theme";
import { Text, View } from "react-native";

type VaultMeterProps = {
  current: number;
  max: number;
  opening?: boolean;
};

export function VaultMeter({ current, max, opening = false }: VaultMeterProps) {
  const percent = Math.max(0, Math.min(100, Math.round((current / max) * 100)));

  return (
    <View
      style={{
        backgroundColor: colors.surfaceRaised,
        borderColor: opening ? colors.gold : colors.border,
        borderRadius: 8,
        borderWidth: 1,
        gap: spacing.sm,
        padding: spacing.md
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text selectable style={typography.button}>
          Vault Meter
        </Text>
        <Text selectable style={[typography.caption, { fontVariant: ["tabular-nums"] }]}>
          {percent}%
        </Text>
      </View>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 999,
          height: 14,
          overflow: "hidden"
        }}
      >
        <View
          style={{
            backgroundColor: opening ? colors.gold : colors.cyan,
            borderRadius: 999,
            height: "100%",
            width: `${percent}%`
          }}
        />
      </View>
    </View>
  );
}

