import { colors, spacing } from "@/theme";
import { Text, View } from "react-native";

export function GameLogo({ compact = false }: { compact?: boolean }) {
  const fontSize = compact ? 26 : 46;
  const letterSpacing = fontSize * 0.02;

  return (
    <View style={{ alignItems: "center", gap: compact ? 4 : spacing.sm, width: "100%" }}>
      {/* letterSpacing adds trailing space after the last glyph; compensate
          with paddingLeft so the wordmark is optically centered. */}
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          paddingLeft: letterSpacing
        }}
      >
        <Text
          numberOfLines={1}
          selectable={false}
          style={{
            color: colors.textPrimary,
            fontSize,
            fontStyle: "italic",
            fontWeight: "900",
            letterSpacing,
            textShadowColor: "#000000AA",
            textShadowOffset: { height: 3, width: 0 },
            textShadowRadius: 10
          }}
        >
          VAULT
        </Text>
        <Text
          numberOfLines={1}
          selectable={false}
          style={{
            color: colors.gold,
            fontSize,
            fontStyle: "italic",
            fontWeight: "900",
            letterSpacing,
            textShadowColor: `${colors.gold}88`,
            textShadowOffset: { height: 0, width: 0 },
            textShadowRadius: 18
          }}
        >
          POP
        </Text>
      </View>
      {!compact ? (
        <View style={{ alignItems: "center", gap: 5 }}>
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              gap: spacing.sm,
              justifyContent: "center",
              paddingLeft: 3
            }}
          >
            <View style={{ backgroundColor: colors.borderBright, height: 1, width: 24 }} />
            <Text
              numberOfLines={1}
              selectable={false}
              style={{
                color: colors.textSecondary,
                fontSize: 11.5,
                fontWeight: "800",
                letterSpacing: 3,
                textAlign: "center"
              }}
            >
              POP COINS
            </Text>
            <View style={{ backgroundColor: colors.borderBright, height: 1, width: 24 }} />
          </View>
          <Text
            numberOfLines={1}
            selectable={false}
            style={{
              color: colors.textMuted,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 3,
              paddingLeft: 3,
              textAlign: "center"
            }}
          >
            COMPLETE THE CHAIN
          </Text>
        </View>
      ) : null}
    </View>
  );
}
