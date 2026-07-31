import { CoinFace } from "@/components/coin-face";
import type { BoardTile, GameModeId } from "@/game/models";
import { getModeVisual, type VisualTheme } from "@/theme";
import { useEffect, useRef } from "react";
import { Animated, Pressable, View } from "react-native";

type CoinTileProps = {
  tile: BoardTile;
  modeId: GameModeId;
  size: number;
  selected?: boolean;
  reducedMotion?: boolean;
  /** Active customization style — drives tile palette, shape, selection ring. */
  theme?: VisualTheme;
  onPress: () => void;
};

export function CoinTile({
  tile,
  modeId,
  size,
  selected = false,
  reducedMotion = false,
  theme,
  onPress
}: CoinTileProps) {
  const visual = getModeVisual(modeId);
  const gradient = theme?.tileGradients[tile.type] ?? visual.tileGradients[tile.type];
  const accent = gradient[1];
  const selectionColor = theme?.selectionColor ?? "#FFFFFF";
  const pulse = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const coinSize = Math.max(18, size * 0.86);

  useEffect(() => {
    if (reducedMotion) {
      // Reduced Motion: fade the coin in place — no drop, no scale swing.
      entrance.setValue(0);
      Animated.timing(entrance, {
        duration: 180,
        toValue: 1,
        useNativeDriver: true
      }).start();
      return;
    }
    // Cascade: refilled coins settle in with a SHORT drop (kept small so the
    // board never feels like it is shaking), bottom rows landing first.
    entrance.setValue(0);
    Animated.sequence([
      Animated.delay((7 - tile.row) * 8),
      Animated.spring(entrance, {
        damping: 20,
        mass: 0.6,
        stiffness: 320,
        toValue: 1,
        useNativeDriver: true
      })
    ]).start();
  }, [entrance, reducedMotion, tile.id, tile.row]);

  useEffect(() => {
    if (reducedMotion) {
      pulse.setValue(selected ? 1 : 0);
      if (selected) {
        // Opacity-only confirmation ring flash — satisfying without movement.
        burst.setValue(0);
        Animated.timing(burst, {
          duration: 260,
          toValue: 1,
          useNativeDriver: true
        }).start();
      }
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

  // Squash-then-pop: the coin briefly squashes vertically before springing
  // into its enlarged selected state — classic game-feel. Reduced Motion
  // keeps a uniform, gentler scale with no squash.
  const squashX = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: reducedMotion ? [1, 1.05, 1.1] : [1, 1.26, 1.18]
  });
  const squashY = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: reducedMotion ? [1, 1.05, 1.1] : [1, 0.78, 1.18]
  });
  const burstScale = burst.interpolate({
    inputRange: [0, 1],
    outputRange: reducedMotion ? [1.25, 1.25] : [0.7, 1.7]
  });
  const burstOpacity = burst.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 0.9, 0]
  });
  const fallShift = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [reducedMotion ? 0 : -10, 0]
  });
  const entranceScale = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [reducedMotion ? 1 : 0.82, 1]
  });
  const entranceOpacity = entrance.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 1, 1]
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
            opacity: entranceOpacity,
            transform: [
              { translateY: fallShift },
              { scaleX: Animated.multiply(entranceScale, squashX) },
              { scaleY: Animated.multiply(entranceScale, squashY) },
              { scale: pressed && !reducedMotion ? 0.9 : 1 }
            ],
            width: coinSize
          }}
        >
          <Animated.View
            style={{
              pointerEvents: "none",
              borderColor: selectionColor,
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
              style={{
                pointerEvents: "none",
                borderColor: selectionColor,
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
          <CoinFace
            type={tile.type}
            size={coinSize}
            gradient={gradient}
            shape={theme?.tileShape ?? "coin"}
          />
        </Animated.View>
      )}
    </Pressable>
  );
}
