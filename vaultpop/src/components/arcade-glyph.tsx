import type { GameModeId, TileType } from "@/game/models";
import { View } from "react-native";

type ArcadeGlyphProps = {
  type: TileType;
  modeId: GameModeId;
  color: string;
  size: number;
};

/**
 * Solid, mature coin glyphs. One silhouette per tile type:
 * gold = faceted diamond, cyan = bolt, emerald = delta, violet = ring, ruby = spark.
 */
export function ArcadeGlyph({ type, color, size }: ArcadeGlyphProps) {
  if (type === "gold") {
    const core = size * 0.66;
    return (
      <View style={{ alignItems: "center", height: size, justifyContent: "center", width: size }}>
        <View
          style={{
            backgroundColor: color,
            borderRadius: size * 0.12,
            height: core,
            transform: [{ rotate: "45deg" }],
            width: core
          }}
        />
        <View
          style={{
            pointerEvents: "none",
            backgroundColor: "#FFFFFF",
            borderRadius: 999,
            height: size * 0.1,
            opacity: 0.55,
            position: "absolute",
            transform: [{ rotate: "45deg" }, { translateX: -size * 0.12 }, { translateY: -size * 0.12 }],
            width: size * 0.1
          }}
        />
      </View>
    );
  }

  if (type === "cyan") {
    const barWidth = size * 0.3;
    const barHeight = size * 0.46;
    return (
      <View style={{ alignItems: "center", height: size, justifyContent: "center", width: size }}>
        <View
          style={{
            backgroundColor: color,
            borderRadius: size * 0.06,
            height: barHeight,
            transform: [{ skewX: "-22deg" }, { translateX: size * 0.1 }, { translateY: -barHeight * 0.34 }],
            width: barWidth
          }}
        />
        <View
          style={{
            backgroundColor: color,
            borderRadius: size * 0.06,
            height: barHeight,
            position: "absolute",
            transform: [{ skewX: "-22deg" }, { translateX: -size * 0.1 }, { translateY: barHeight * 0.34 }],
            width: barWidth
          }}
        />
      </View>
    );
  }

  if (type === "emerald") {
    return (
      <View style={{ alignItems: "center", height: size, justifyContent: "center", width: size }}>
        <View
          style={{
            borderBottomColor: color,
            borderBottomWidth: size * 0.62,
            borderLeftColor: "transparent",
            borderLeftWidth: size * 0.38,
            borderRightColor: "transparent",
            borderRightWidth: size * 0.38,
            height: 0,
            width: 0
          }}
        />
      </View>
    );
  }

  if (type === "violet") {
    return (
      <View style={{ alignItems: "center", height: size, justifyContent: "center", width: size }}>
        <View
          style={{
            borderColor: color,
            borderRadius: 999,
            borderWidth: size * 0.18,
            height: size * 0.72,
            width: size * 0.72
          }}
        />
      </View>
    );
  }

  const barLength = size * 0.78;
  const barThickness = size * 0.24;
  return (
    <View style={{ alignItems: "center", height: size, justifyContent: "center", width: size }}>
      <View
        style={{
          backgroundColor: color,
          borderRadius: 999,
          height: barLength,
          width: barThickness
        }}
      />
      <View
        style={{
          backgroundColor: color,
          borderRadius: 999,
          height: barThickness,
          position: "absolute",
          width: barLength
        }}
      />
      <View
        style={{
          backgroundColor: color,
          borderRadius: size * 0.08,
          height: barThickness * 1.05,
          position: "absolute",
          transform: [{ rotate: "45deg" }],
          width: barThickness * 1.05
        }}
      />
    </View>
  );
}
