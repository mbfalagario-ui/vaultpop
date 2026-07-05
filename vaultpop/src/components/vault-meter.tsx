import { colors, spacing, typography } from "@/theme";
import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { Text, View } from "react-native";

type VaultMeterProps = {
  current: number;
  max: number;
  opening?: boolean;
  accent?: string;
  label?: string;
};

export function VaultMeter({
  current,
  max,
  opening = false,
  accent = colors.cyan,
  label = "Vault Energy"
}: VaultMeterProps) {
  const percent = Math.max(0, Math.min(100, Math.round((current / max) * 100)));
  const animatedWidth = useRef(new Animated.Value(percent)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      duration: 260,
      toValue: percent,
      useNativeDriver: false
    }).start();
  }, [animatedWidth, percent]);

  const width = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"]
  });

  return (
    <View
      style={{
        backgroundColor: `${accent}10`,
        borderColor: opening ? colors.gold : `${accent}88`,
        borderCurve: "continuous",
        borderRadius: 12,
        borderWidth: 1,
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text selectable style={typography.button}>
          {label}
        </Text>
        <Text selectable style={[typography.caption, { fontVariant: ["tabular-nums"] }]}>
          {percent}%
        </Text>
      </View>
      <View
        style={{
          backgroundColor: "#02040A",
          borderColor: `${accent}44`,
          borderRadius: 999,
          borderWidth: 1,
          height: 12,
          overflow: "hidden"
        }}
      >
        <Animated.View
          style={{
            backgroundColor: opening ? colors.gold : accent,
            borderRadius: 999,
            boxShadow: `0 0 16px ${opening ? colors.gold : accent}`,
            height: "100%",
            width
          }}
        />
      </View>
    </View>
  );
}
