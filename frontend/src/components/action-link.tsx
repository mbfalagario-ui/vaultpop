import { colors, darken, lighten, radius, spacing, typography } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

type ActionLinkProps = {
  href: string | { pathname: string; params?: Record<string, string | number> };
  label: string;
  detail?: string;
  accent?: string;
  prominent?: boolean;
  testID?: string;
};

function Chevron({ color, size = 11 }: { color: string; size?: number }) {
  return (
    <View
      style={{
        borderRightColor: color,
        borderRightWidth: 2.5,
        borderTopColor: color,
        borderTopWidth: 2.5,
        height: size,
        transform: [{ rotate: "45deg" }],
        width: size
      }}
    />
  );
}

export function ActionLink({
  href,
  label,
  detail,
  accent = colors.gold,
  prominent = false,
  testID
}: ActionLinkProps) {
  const autoTestId =
    testID ?? `link-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <Link href={href as never} asChild>
      <Pressable
        accessibilityHint={detail}
        accessibilityLabel={label}
        accessibilityRole="link"
        testID={autoTestId}
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.975 : 1 }],
          width: "100%"
        })}
      >
        {prominent ? (
          <LinearGradient
            colors={[lighten(accent, 0.24), accent, darken(accent, 0.2)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.35, y: 1 }}
            style={{
              alignItems: "center",
              borderRadius: radius.lg,
              boxShadow: `0 14px 34px ${accent}4D`,
              flexDirection: "row",
              justifyContent: "center",
              minHeight: 68,
              paddingHorizontal: spacing.lg
            }}
          >
            <View style={{ alignItems: "center", flex: 1, gap: 2 }}>
              <Text
                selectable={false}
                style={{
                  color: "#140F02",
                  fontSize: 21,
                  fontWeight: "900",
                  letterSpacing: 1.5
                }}
              >
                {label}
              </Text>
              {detail ? (
                <Text
                  selectable={false}
                  style={{ color: "#140F02AA", fontSize: 11.5, fontWeight: "700" }}
                >
                  {detail}
                </Text>
              ) : null}
            </View>
            <Chevron color="#140F02" size={13} />
          </LinearGradient>
        ) : (
          <LinearGradient
            colors={["#232048", "#141126"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              alignItems: "center",
              borderColor: colors.borderBright,
              borderCurve: "continuous",
              borderRadius: radius.md,
              borderWidth: 1,
              boxShadow: `0 10px 22px #00000059, 0 0 14px ${accent}12`,
              flexDirection: "row",
              gap: spacing.sm,
              minHeight: 54,
              overflow: "hidden",
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm
            }}
          >
            <View
              pointerEvents="none"
              style={{
                backgroundColor: "#FFFFFF16",
                height: 1.5,
                left: radius.md,
                position: "absolute",
                right: radius.md,
                top: 0
              }}
            />
            <View
              style={{
                backgroundColor: accent,
                borderRadius: 2,
                boxShadow: `0 0 8px ${accent}AA`,
                height: 8,
                transform: [{ rotate: "45deg" }],
                width: 8
              }}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                selectable={false}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={[typography.button, { fontSize: 15 }]}
              >
                {label}
              </Text>
              {detail ? (
                <Text selectable={false} style={[typography.caption, { fontSize: 11.5 }]}>
                  {detail}
                </Text>
              ) : null}
            </View>
            <Chevron color={colors.textMuted} />
          </LinearGradient>
        )}
      </Pressable>
    </Link>
  );
}
