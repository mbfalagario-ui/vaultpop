import { colors, spacing } from "@/theme";
import { Text, View } from "react-native";

export function GameLogo({ compact = false }: { compact?: boolean }) {
  const fontSize = compact ? 26 : 46;

  return (
    <View style={{ alignItems: "center", gap: compact ? 4 : spacing.sm }}>
      <View style={{ alignItems: "center", flexDirection: "row" }}>
        <Text
          selectable={false}
          style={{
            color: colors.textPrimary,
            fontSize,
            fontStyle: "italic",
            fontWeight: "900",
            letterSpacing: fontSize * 0.02,
            textShadowColor: "#000000AA",
            textShadowOffset: { height: 3, width: 0 },
            textShadowRadius: 10
          }}
        >
          VAULT
        </Text>
        <Text
          selectable={false}
          style={{
            color: colors.gold,
            fontSize,
            fontStyle: "italic",
            fontWeight: "900",
            letterSpacing: fontSize * 0.02,
            textShadowColor: `${colors.gold}88`,
            textShadowOffset: { height: 0, width: 0 },
            textShadowRadius: 18
          }}
        >
          POP
        </Text>
      </View>
      {!compact ? (
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
          <View style={{ backgroundColor: colors.borderBright, height: 1, width: 26 }} />
          <Text
            selectable={false}
            style={{
              color: colors.textSecondary,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 3
            }}
          >
            POP COINS · COMPLETE THE CHAIN
          </Text>
          <View style={{ backgroundColor: colors.borderBright, height: 1, width: 26 }} />
        </View>
      ) : null}
    </View>
  );
}
