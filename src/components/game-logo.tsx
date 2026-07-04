import { colors, spacing, typography } from "@/theme";
import { Text, View } from "react-native";

export function GameLogo({ compact = false }: { compact?: boolean }) {
  return (
    <View style={{ alignItems: "center", gap: compact ? 2 : spacing.xs }}>
      <View style={{ alignItems: "center", flexDirection: "row", gap: 7 }}>
        <View
          style={{
            backgroundColor: colors.cyan,
            borderRadius: 3,
            height: compact ? 8 : 11,
            transform: [{ rotate: "45deg" }],
            width: compact ? 8 : 11
          }}
        />
        <Text
          selectable
          style={[
            typography.title,
            {
              color: colors.textPrimary,
              fontSize: compact ? 24 : 42,
              fontWeight: "900"
            }
          ]}
        >
          VaultPop
        </Text>
        <View
          style={{
            backgroundColor: colors.ruby,
            borderRadius: 999,
            height: compact ? 8 : 11,
            width: compact ? 8 : 11
          }}
        />
      </View>
      {!compact ? (
        <Text selectable style={[typography.eyebrow, { color: colors.gold }]}>
          POP COINS. COMPLETE THE CHAIN.
        </Text>
      ) : null}
    </View>
  );
}
