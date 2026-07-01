import { colors, spacing, typography } from "@/theme";
import { Pressable, Text, View } from "react-native";

type ActionButtonProps = {
  label: string;
  detail?: string;
  tone?: "primary" | "danger" | "quiet";
  disabled?: boolean;
  onPress: () => void;
};

export function ActionButton({
  label,
  detail,
  tone = "primary",
  disabled = false,
  onPress
}: ActionButtonProps) {
  const borderColor =
    tone === "danger" ? colors.ruby : tone === "quiet" ? colors.border : colors.gold;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: disabled
          ? colors.surface
          : pressed
            ? colors.goldMuted
            : colors.surfaceRaised,
        borderColor,
        borderRadius: 8,
        borderWidth: 1,
        opacity: disabled ? 0.55 : 1,
        padding: spacing.md
      })}
    >
      <View style={{ gap: spacing.xs }}>
        <Text selectable style={typography.button}>
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

