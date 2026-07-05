import { colors, typography } from "@/theme";
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
    <View style={{ alignItems: "center", flex: 1, gap: 2, minWidth: 76 }}>
      <Text
        selectable
        style={[typography.eyebrow, { color: colors.textMuted, fontSize: 9.5, letterSpacing: 1.6 }]}
      >
        {label}
      </Text>
      <Text
        selectable
        style={[
          typography.numeral,
          {
            color: accent,
            fontSize: 22,
            textShadowColor: `${accent}55`,
            textShadowOffset: { height: 0, width: 0 },
            textShadowRadius: 10
          }
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
