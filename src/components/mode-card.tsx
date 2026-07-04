import { ArcadeGlyph } from "@/components/arcade-glyph";
import type { GameModeDefinition } from "@/game/models";
import { getModeVisual, spacing, typography } from "@/theme";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

type ModeCardProps = {
  mode: GameModeDefinition;
  bestScore: number;
  detail?: string;
};

export function ModeCard({ mode, bestScore, detail }: ModeCardProps) {
  const visual = getModeVisual(mode.id);
  const glyph =
    mode.id === "classic"
      ? "violet"
      : mode.id === "dailyVault"
        ? "cyan"
        : "gold";

  return (
    <Link
      href={{ pathname: "/gameplay", params: { mode: mode.id } }}
      asChild
    >
      <Pressable
        accessibilityLabel={`Play ${mode.title}`}
        accessibilityRole="link"
        style={({ pressed }) => ({
          backgroundColor: visual.surface,
          borderColor: pressed ? visual.secondary : `${visual.accent}99`,
          borderCurve: "continuous",
          borderRadius: 12,
          borderWidth: 1,
          gap: spacing.md,
          minHeight: 142,
          opacity: pressed ? 0.76 : 1,
          overflow: "hidden",
          padding: spacing.md
        })}
      >
        <View
          pointerEvents="none"
          style={{
            backgroundColor: visual.accent,
            bottom: 0,
            left: 0,
            position: "absolute",
            top: 0,
            width: 4
          }}
        />
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
          <View
            style={{
              alignItems: "center",
              backgroundColor: `${visual.accent}16`,
              borderColor: `${visual.accent}AA`,
              borderRadius: 999,
              borderWidth: 1,
              height: 48,
              justifyContent: "center",
              width: 48
            }}
          >
            <ArcadeGlyph
              color={visual.accent}
              modeId={mode.id}
              size={24}
              type={glyph}
            />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text selectable style={[typography.eyebrow, { color: visual.accent, fontSize: 10 }]}>
              {visual.kicker}
            </Text>
            <Text selectable style={[typography.sectionTitle, { fontSize: 20 }]}>
              {mode.title}
            </Text>
            <Text
              selectable
              numberOfLines={2}
              style={[typography.caption, { color: "#AEBBD2", fontSize: 12, lineHeight: 16 }]}
            >
              {mode.summary}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 1, minWidth: 54 }}>
            <Text selectable style={[typography.eyebrow, { color: "#75829B", fontSize: 9 }]}>
              BEST
            </Text>
            <Text
              selectable
              style={[
                typography.sectionTitle,
                {
                  color: visual.energy,
                  fontSize: 20,
                  fontVariant: ["tabular-nums"],
                  fontWeight: "900"
                }
              ]}
            >
              {bestScore}
            </Text>
            <View style={{ flexDirection: "row", gap: 3, paddingTop: 3 }}>
              {[0.28, 0.52, 0.88].map((opacity) => (
                <View
                  key={opacity}
                  style={{
                    backgroundColor: visual.accent,
                    borderRadius: 999,
                    height: 4,
                    opacity,
                    width: 4
                  }}
                />
              ))}
            </View>
          </View>
        </View>
        <View
          style={{
            alignItems: "center",
            borderTopColor: `${visual.accent}35`,
            borderTopWidth: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            marginLeft: 60,
            paddingTop: spacing.sm
          }}
        >
          <View
            pointerEvents="none"
            style={{
              backgroundColor: `${visual.accent}22`,
              borderRadius: 999,
              height: 3,
              left: 0,
              position: "absolute",
              right: 0,
              top: -2
            }}
          >
            <View
              style={{
                backgroundColor: visual.accent,
                borderRadius: 999,
                height: 3,
                width: mode.id === "classic" ? "38%" : mode.id === "dailyVault" ? "64%" : "82%"
              }}
            />
          </View>
          <Text selectable style={[typography.caption, { color: "#75829B" }]}>
            {detail ?? visual.name}
          </Text>
          <Text selectable style={[typography.button, { color: visual.accent, fontSize: 14 }]}>
            PLAY
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
