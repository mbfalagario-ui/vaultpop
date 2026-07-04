import { colors, spacing, typography } from "@/theme";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

type ActionLinkProps = {
  href: string | { pathname: string; params?: Record<string, string | number> };
  label: string;
  detail?: string;
  accent?: string;
  prominent?: boolean;
};

export function ActionLink({
  href,
  label,
  detail,
  accent = colors.gold,
  prominent = false
}: ActionLinkProps) {
  return (
    <Link href={href as never} asChild>
      <Pressable
        accessibilityHint={detail}
        accessibilityLabel={label}
        accessibilityRole="link"
        style={({ pressed }) => ({
          opacity: pressed ? 0.72 : 1,
          width: "100%"
        })}
      >
        <View
          style={{
            alignItems: prominent ? "center" : "flex-start",
            backgroundColor: prominent ? accent : `${accent}12`,
            borderColor: accent,
            borderCurve: "continuous",
            borderRadius: prominent ? 14 : 10,
            borderWidth: 1,
            boxShadow: `0 10px 30px ${accent}20`,
            justifyContent: "center",
            minHeight: prominent ? 66 : 52,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            width: "100%"
          }}
        >
          <View style={{ gap: spacing.xs }}>
          <Text
            selectable
            style={[
              typography.button,
              {
                color: prominent ? colors.background : accent,
                fontSize: prominent ? 19 : typography.button.fontSize,
                fontWeight: "900"
              }
            ]}
          >
            {label}
          </Text>
          {detail ? (
            <Text
              selectable
              style={[
                typography.caption,
                prominent ? { color: `${colors.background}B8` } : null
              ]}
            >
              {detail}
            </Text>
          ) : null}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
