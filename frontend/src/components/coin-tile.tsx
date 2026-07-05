import { CoinFace } from "@/components/coin-face";
import type { BoardTile, GameModeId } from "@/game/models";
import { getModeVisual } from "@/theme";
import { useEffect, useRef } from "react";
import { Animated, Pressable, View } from "react-native";

type CoinTileProps = {
  tile: BoardTile;
  modeId: GameModeId;
  size: number;
  selected?: boolean;
  reducedMotion?: boolean;
  onPress: () => void;
};

export function CoinTile({
  tile,
  modeId,
  size,
  selected = false,
  reducedMotion = false,
  onPress
}: CoinTileProps) {
  const visual = getModeVisual(modeId);
  const gradient = visual.tileGradients[tile.type];
  const accent = gradient[1];
  const pulse = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const coinSize = Math.max(18, size * 0.86);

  useEffect(() => {
    if (reducedMotion) {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0.35);
    Animated.spring(entrance, {
      damping: 13,
      mass: 0.6,
      stiffness: 260,
      toValue: 1,
      useNativeDriver: true
    }).start();
  }, [entrance, reducedMotion, tile.id]);

  useEffect(() => {
    if (reducedMotion) {
      pulse.setValue(selected ? 1 : 0);
      return;
    }
    Animated.spring(pulse, {
      damping: 10,
      mass: 0.5,
      stiffness: 300,
      toValue: selected ? 1 : 0,
      useNativeDriver: true
    }).start();
    if (selected) {
      burst.setValue(0);
      Animated.timing(burst, {
        duration: 260,
        toValue: 1,
        useNativeDriver: true
      }).start();
    }
  }, [burst, pulse, reducedMotion, selected]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18]
  });
  const burstScale = burst.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1.7]
  });
  const burstOpacity = burst.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 0.9, 0]
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tile.type} coin, row ${tile.row + 1}, column ${tile.column + 1}`}
      accessibilityHint="Clears its connected matching group when at least two coins match."
      testID={`coin-tile-${tile.row}-${tile.column}`}
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
            height: coinSize,
            justifyContent: "center",
            transform: [
              { scale: Animated.multiply(entrance, scale) },
              { scale: pressed && !reducedMotion ? 0.9 : 1 }
            ],
            width: coinSize
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={{
              borderColor: "#FFFFFF",
              borderRadius: 999,
              borderWidth: 2,
              height: coinSize,
              opacity: burstOpacity,
              position: "absolute",
              transform: [{ scale: burstScale }],
              width: coinSize,
              zIndex: 2
            }}
          />
          {selected ? (
            <View
              pointerEvents="none"
              style={{
                borderColor: "#FFFFFF",
                borderRadius: 999,
                borderWidth: 2,
                boxShadow: `0 0 16px ${accent}EE`,
                height: coinSize + 5,
                position: "absolute",
                width: coinSize + 5,
                zIndex: 1
              }}
            />
          ) : null}
          <CoinFace type={tile.type} size={coinSize} gradient={gradient} />
        </Animated.View>
      )}
    </Pressable>
  );
}
