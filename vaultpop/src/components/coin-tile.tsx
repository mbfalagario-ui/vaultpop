import { ArcadeGlyph } from "@/components/arcade-glyph";
import type { BoardTile, GameModeId } from "@/game/models";
import { getModeVisual } from "@/theme";
import { useEffect, useRef } from "react";
import { Animated, Pressable, View } from "react-native";

type CoinTileProps = {
  tile: BoardTile;
  modeId: GameModeId;
  selected?: boolean;
  reducedMotion?: boolean;
  onPress: () => void;
};

export function CoinTile({
  tile,
  modeId,
  selected = false,
  reducedMotion = false,
  onPress
}: CoinTileProps) {
  const visual = getModeVisual(modeId);
  const accent = visual.tileColors[tile.type];
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      pulse.setValue(selected ? 1 : 0);
      return;
    }
    Animated.spring(pulse, {
      damping: 11,
      mass: 0.55,
      stiffness: 260,
      toValue: selected ? 1 : 0,
      useNativeDriver: true
    }).start();
  }, [pulse, reducedMotion, selected]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12]
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tile.type} coin, row ${tile.row + 1}, column ${tile.column + 1}`}
      accessibilityHint="Clears its connected matching group when at least two coins match."
      hitSlop={2}
      onPress={onPress}
      style={{
        alignItems: "center",
        aspectRatio: 1,
        justifyContent: "center",
        width: "12.5%"
      }}
    >
      {({ pressed }) => (
        <Animated.View
          style={{
            alignItems: "center",
            backgroundColor: selected ? `${accent}48` : `${accent}20`,
            borderColor: selected ? "#FFFFFF" : `${accent}CC`,
            borderRadius: 999,
            borderWidth: selected ? 2 : 1,
            boxShadow: selected
              ? `0 0 20px ${accent}CC`
              : pressed
                ? `0 0 14px ${accent}88`
                : `0 4px 9px #00000066`,
            height: "88%",
            justifyContent: "center",
            opacity: pressed ? 0.78 : 1,
            transform: [{ scale }],
            width: "88%"
          }}
        >
          <View
            style={{
              alignItems: "center",
              borderColor: `${accent}66`,
              borderRadius: 999,
              borderWidth: 1,
              height: "76%",
              justifyContent: "center",
              width: "76%"
            }}
          >
            <ArcadeGlyph color={accent} modeId={modeId} size={18} type={tile.type} />
          </View>
          <View
            pointerEvents="none"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 999,
              height: 3,
              left: "28%",
              opacity: 0.72,
              position: "absolute",
              top: "18%",
              width: "22%"
            }}
          />
        </Animated.View>
      )}
    </Pressable>
  );
}
