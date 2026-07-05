import { colors, darken, lighten, radius, spacing, typography } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";

type ActionButtonProps = {
  label: string;
  detail?: string;
  accessibilityHint?: string;
  tone?: "primary" | "danger" | "quiet";
  disabled?: boolean;
  accent?: string;
  testID?: string;
  onPress: () => void;
};

export function ActionButton({
  label,
  detail,
  accessibilityHint,
  tone = "primary",
  disabled = false,
  accent = colors.gold,
  testID,
  onPress
}: ActionButtonProps) {
  const color = tone === "danger" ? colors.ruby : accent;
  const primary = tone === "primary";

  return (
    <Pressable
      accessibilityHint={accessibilityHint ?? detail}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      testID={testID ?? `action-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-button`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: disabled ? 0.45 : 1,
        transform: [{ scale: pressed && !disabled ? 0.975 : 1 }],
        width: "100%"
      })}
    >
      {primary && !disabled ? (
        <LinearGradient
          colors={[lighten(color, 0.22), color, darken(color, 0.18)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.4, y: 1 }}
          style={{
            alignItems: "center",
            borderRadius: radius.md,
            boxShadow: `0 10px 26px ${color}3D`,
            justifyContent: "center",
            minHeight: 54,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm
          }}
        >
          <Text
            selectable={false}
            style={[typography.button, { color: "#140F02", fontWeight: "900" }]}
          >
            {label}
          </Text>
          {detail ? (
            <Text
              selectable={false}
              style={[typography.caption, { color: "#140F02AA", fontSize: 11.5 }]}
            >
              {detail}
            </Text>
          ) : null}
        </LinearGradient>
      ) : (
        <View
          style={{
            alignItems: "center",
            backgroundColor:
              tone === "danger" ? `${colors.ruby}14` : colors.surfaceGlass,
            borderColor: tone === "quiet" ? colors.border : `${color}66`,
            borderCurve: "continuous",
            borderRadius: radius.md,
            borderWidth: 1,
            justifyContent: "center",
            minHeight: 54,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm
          }}
        >
          <Text
            selectable={false}
            style={[
              typography.button,
              { color: tone === "danger" ? colors.ruby : primary ? color : colors.textPrimary }
            ]}
          >
            {label}
          </Text>
          {detail ? (
            <Text selectable={false} style={[typography.caption, { fontSize: 11.5 }]}>
              {detail}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}
