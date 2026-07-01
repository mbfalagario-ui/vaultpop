import { colors, spacing, typography } from "@/theme";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

type ActionLinkProps = {
  href: string | { pathname: string; params?: Record<string, string | number> };
  label: string;
  detail?: string;
};

export function ActionLink({ href, label, detail }: ActionLinkProps) {
  return (
    <Link href={href as never} asChild>
      <Pressable
        style={({ pressed }) => ({
          backgroundColor: pressed ? colors.goldMuted : colors.surfaceRaised,
          borderColor: colors.gold,
          borderRadius: 8,
          borderWidth: 1,
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
    </Link>
  );
}
