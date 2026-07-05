import { colors, spacing, typography } from "@/theme";
import { Pressable, Text, View } from "react-native";

type ActionButtonProps = {
  label: string;
  detail?: string;
  accessibilityHint?: string;
  tone?: "primary" | "danger" | "quiet";
  disabled?: boolean;
  accent?: string;
  onPress: () => void;
};

export function ActionButton({
  label,
  detail,
  accessibilityHint,
  tone = "primary",
  disabled = false,
  accent = colors.gold,
  onPress
}: ActionButtonProps) {
  const borderColor =
    tone === "danger" ? colors.ruby : tone === "quiet" ? colors.border : accent;

  return (
    <Pressable
      accessibilityHint={accessibilityHint ?? detail}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: disabled
          ? colors.surface
          : pressed
            ? `${borderColor}24`
            : tone === "primary"
              ? `${borderColor}18`
              : colors.surfaceRaised,
        borderColor,
        borderCurve: "continuous",
        borderRadius: 10,
        borderWidth: 1,
        boxShadow: disabled ? undefined : `0 8px 22px ${borderColor}18`,
        minHeight: 52,
        opacity: disabled ? 0.55 : 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      })}
    >
      <View style={{ gap: spacing.xs }}>
        <Text selectable style={[typography.button, tone === "primary" ? { color: borderColor } : null]}>
          {label}
        </Text>
        {detail ? (
          <Text selectable style={typography.caption}>
            {detail}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
