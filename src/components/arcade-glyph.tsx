import type { GameModeId, TileType } from "@/game/models";
import { View } from "react-native";

type ArcadeGlyphProps = {
  type: TileType;
  modeId: GameModeId;
  color: string;
  size: number;
};

export function ArcadeGlyph({ type, modeId, color, size }: ArcadeGlyphProps) {
  const stroke = Math.max(2, Math.round(size * 0.12));
  const core = modeId === "streak" ? size * 0.64 : size * 0.58;

  if (type === "gold") {
    return (
      <View
        style={{
          borderColor: color,
          borderRadius: modeId === "streak" ? 4 : core,
          borderWidth: stroke,
          height: core,
          transform: [{ rotate: "45deg" }],
          width: core
        }}
      >
        <View
          style={{
            backgroundColor: color,
            height: stroke,
            left: core * 0.18,
            position: "absolute",
            top: core * 0.34,
            width: core * 0.64
          }}
        />
      </View>
    );
  }

  if (type === "cyan") {
    return (
      <View
        style={{
          height: core,
          justifyContent: "center",
          transform: [{ rotate: "-12deg" }],
          width: core
        }}
      >
        <View
          style={{
            alignSelf: "center",
            backgroundColor: color,
            borderRadius: stroke,
            height: core,
            transform: [{ skewX: "-18deg" }],
            width: stroke * 1.6
          }}
        />
        <View
          style={{
            alignSelf: "center",
            backgroundColor: color,
            borderRadius: stroke,
            height: stroke * 1.4,
            position: "absolute",
            transform: [{ rotate: "-38deg" }],
            width: core * 0.78
          }}
        />
      </View>
    );
  }

  if (type === "emerald") {
    return (
      <View
        style={{
          borderColor: color,
          borderRadius: modeId === "dailyVault" ? 3 : core,
          borderWidth: stroke,
          height: core,
          transform: [{ rotate: modeId === "dailyVault" ? "30deg" : "0deg" }],
          width: core
        }}
      >
        <View
          style={{
            backgroundColor: color,
            borderRadius: stroke,
            bottom: core * 0.14,
            height: stroke,
            left: core * 0.2,
            position: "absolute",
            transform: [{ rotate: "-35deg" }],
            width: core * 0.56
          }}
        />
      </View>
    );
  }

  if (type === "violet") {
    return (
      <View style={{ alignItems: "center", height: core, justifyContent: "center", width: core }}>
        <View
          style={{
            borderColor: color,
            borderRadius: core,
            borderWidth: stroke,
            height: core,
            width: core
          }}
        />
        <View
          style={{
            borderColor: color,
            borderRadius: core,
            borderWidth: stroke,
            height: core * 0.44,
            position: "absolute",
            width: core * 0.44
          }}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        alignItems: "center",
        height: core,
        justifyContent: "center",
        transform: [{ rotate: modeId === "classic" ? "45deg" : "0deg" }],
        width: core
      }}
    >
      <View
        style={{
          borderColor: color,
          borderRadius: modeId === "streak" ? 4 : core,
          borderWidth: stroke,
          height: core,
          width: core
        }}
      />
      <View
        style={{
          backgroundColor: color,
          borderRadius: stroke,
          height: stroke,
          position: "absolute",
          transform: [{ rotate: "45deg" }],
          width: core * 0.68
        }}
      />
    </View>
  );
}
