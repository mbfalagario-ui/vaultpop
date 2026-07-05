import { ArcadeGlyph } from "@/components/arcade-glyph";
import type { TileType } from "@/game/models";
import { TILE_GRADIENTS, type TileGradient } from "@/theme/mode-visuals";
import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";

type CoinFaceProps = {
  type: TileType;
  size: number;
  gradient?: TileGradient;
  glow?: boolean;
  dimmed?: boolean;
};

/**
 * The premium coin object used across the app: gradient face, dark rim,
 * inner minting ring, specular highlight, and a solid glyph.
 */
export function CoinFace({ type, size, gradient, glow = false, dimmed = false }: CoinFaceProps) {
  const palette = gradient ?? TILE_GRADIENTS[type];
  const [light, base, deep] = palette;

  return (
    <View
      style={{
        height: size,
        opacity: dimmed ? 0.4 : 1,
        width: size
      }}
    >
      <LinearGradient
        colors={[light, base, deep]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.75, y: 1 }}
        style={{
          alignItems: "center",
          borderRadius: 999,
          boxShadow: glow
            ? `0 0 ${Math.round(size * 0.55)}px ${base}66, 0 ${Math.round(size * 0.12)}px ${Math.round(size * 0.3)}px #00000088`
            : `0 ${Math.round(size * 0.1)}px ${Math.round(size * 0.22)}px #00000077`,
          height: size,
          justifyContent: "center",
          width: size
        }}
      >
        {/* Inner minting ring */}
        <View
          style={{
            pointerEvents: "none",
            borderColor: "#00000030",
            borderRadius: 999,
            borderWidth: Math.max(1, size * 0.035),
            height: size * 0.8,
            position: "absolute",
            width: size * 0.8
          }}
        />
        {/* Rim shading */}
        <View
          style={{
            pointerEvents: "none",
            borderColor: "#00000042",
            borderRadius: 999,
            borderWidth: Math.max(1, size * 0.05),
            height: size,
            position: "absolute",
            width: size
          }}
        />
        <ArcadeGlyph
          color="#FFFFFFE8"
          modeId="classic"
          size={size * 0.5}
          type={type}
        />
        {/* Specular highlight */}
        <View
          style={{
            pointerEvents: "none",
            backgroundColor: "#FFFFFF",
            borderRadius: 999,
            height: size * 0.14,
            left: size * 0.2,
            opacity: 0.65,
            position: "absolute",
            top: size * 0.12,
            transform: [{ rotate: "-24deg" }, { scaleX: 2.1 }],
            width: size * 0.14
          }}
        />
      </LinearGradient>
    </View>
  );
}
