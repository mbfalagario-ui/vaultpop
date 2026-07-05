import { CoinFace } from "@/components/coin-face";
import type { GameModeDefinition, TileType } from "@/game/models";
import { colors, getModeVisual, radius, spacing, typography } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

type ModeCardProps = {
  mode: GameModeDefinition;
  bestScore: number;
  detail?: string;
};

const MODE_GLYPHS: Record<string, TileType> = {
  classic: "violet",
  dailyVault: "cyan",
  streak: "gold"
};

export function ModeCard({ mode, bestScore, detail }: ModeCardProps) {
  const visual = getModeVisual(mode.id);
  const glyph = MODE_GLYPHS[mode.id] ?? "gold";

  return (
    <Link href={{ pathname: "/gameplay", params: { mode: mode.id } }} asChild>
      <Pressable
        accessibilityLabel={`Play ${mode.title}`}
        accessibilityRole="link"
        testID={`mode-card-${mode.id}`}
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.977 : 1 }],
          width: "100%"
        })}
      >
        <LinearGradient
          colors={[visual.surfaceRaised, visual.board]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={{
            borderColor: `${visual.accent}55`,
            borderCurve: "continuous",
            borderRadius: radius.lg,
            borderWidth: 1,
            boxShadow: `0 16px 34px #00000066, 0 0 24px ${visual.accent}14`,
            overflow: "hidden",
            padding: spacing.lg
          }}
        >
          {/* Accent energy sweep */}
          <LinearGradient
            colors={[`${visual.accent}30`, `${visual.accent}00`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.9 }}
            pointerEvents="none"
            style={{
              borderRadius: 999,
              height: 190,
              position: "absolute",
              right: -70,
              top: -70,
              width: 190
            }}
          />
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
            <CoinFace type={glyph} size={62} glow />
            <View style={{ flex: 1, gap: 3 }}>
              <Text
                selectable={false}
                style={[typography.eyebrow, { color: visual.accent, fontSize: 10 }]}
              >
                {visual.kicker}
              </Text>
              <Text
                selectable={false}
                style={{
                  color: colors.textPrimary,
                  fontSize: 23,
                  fontStyle: "italic",
                  fontWeight: "900",
                  letterSpacing: 0.3
                }}
              >
                {mode.title}
              </Text>
              <Text
                selectable={false}
                numberOfLines={1}
                style={[typography.caption, { color: colors.textSecondary, fontSize: 12 }]}
              >
                {visual.tagline}
              </Text>
            </View>
          </View>
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: spacing.md
            }}
          >
            <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
              <View
                style={{
                  backgroundColor: "#00000055",
                  borderColor: colors.border,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  flexDirection: "row",
                  gap: 5,
                  paddingHorizontal: spacing.sm + 2,
                  paddingVertical: 5
                }}
              >
                <Text
                  selectable={false}
                  style={[typography.eyebrow, { color: colors.textMuted, fontSize: 9 }]}
                >
                  BEST
                </Text>
                <Text
                  selectable={false}
                  style={{
                    color: visual.energy,
                    fontSize: 12,
                    fontVariant: ["tabular-nums"],
                    fontWeight: "900"
                  }}
                >
                  {bestScore.toLocaleString()}
                </Text>
              </View>
              {detail ? (
                <Text
                  selectable={false}
                  style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}
                >
                  {detail}
                </Text>
              ) : null}
            </View>
            <View
              style={{
                alignItems: "center",
                backgroundColor: visual.accent,
                borderRadius: radius.pill,
                boxShadow: `0 0 16px ${visual.accent}66`,
                flexDirection: "row",
                gap: 6,
                paddingHorizontal: spacing.md + 2,
                paddingVertical: 8
              }}
            >
              <Text
                selectable={false}
                style={{ color: "#0B0919", fontSize: 13, fontWeight: "900", letterSpacing: 1.2 }}
              >
                PLAY
              </Text>
              <View
                style={{
                  borderBottomColor: "transparent",
                  borderBottomWidth: 5,
                  borderLeftColor: "#0B0919",
                  borderLeftWidth: 8,
                  borderTopColor: "transparent",
                  borderTopWidth: 5,
                  height: 0,
                  width: 0
                }}
              />
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Link>
  );
}
