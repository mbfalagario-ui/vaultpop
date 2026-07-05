import { CoinFace } from "@/components/coin-face";
import type { TileType } from "@/game/models";
import { useEffect, useRef } from "react";
import { Animated, Dimensions, View } from "react-native";

const COIN_TYPES: TileType[] = ["gold", "cyan", "emerald", "violet", "ruby"];

type Piece = {
  type: TileType;
  left: number;
  size: number;
  delay: number;
  duration: number;
  spin: string;
};

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, index) => ({
    type: COIN_TYPES[index % COIN_TYPES.length] ?? "gold",
    left: 4 + Math.random() * 88,
    size: 16 + Math.random() * 16,
    delay: Math.random() * 500,
    duration: 1500 + Math.random() * 900,
    spin: `${Math.random() > 0.5 ? "" : "-"}${180 + Math.round(Math.random() * 360)}deg`
  }));
}

/**
 * One-shot celebratory coin rain for the results screen.
 */
export function CoinConfetti({ count = 14 }: { count?: number }) {
  const pieces = useRef(makePieces(count)).current;

  return (
    <View
      pointerEvents="none"
      style={{ bottom: 0, left: 0, overflow: "hidden", position: "absolute", right: 0, top: 0 }}
    >
      {pieces.map((piece, index) => (
        <ConfettiCoin key={index} piece={piece} />
      ))}
    </View>
  );
}

function ConfettiCoin({ piece }: { piece: Piece }) {
  const progress = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get("window").height;

  useEffect(() => {
    Animated.timing(progress, {
      delay: piece.delay,
      duration: piece.duration,
      toValue: 1,
      useNativeDriver: true
    }).start();
  }, [piece.delay, piece.duration, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, screenHeight * 0.92]
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", piece.spin]
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0, 1, 1, 0]
  });

  return (
    <Animated.View
      style={{
        left: `${piece.left}%`,
        opacity,
        position: "absolute",
        top: 0,
        transform: [{ translateY }, { rotate }]
      }}
    >
      <CoinFace type={piece.type} size={piece.size} />
    </Animated.View>
  );
}
