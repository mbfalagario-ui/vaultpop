import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

const PARTICLE_COUNT = 10;

/**
 * One-shot radial particle burst for tile clears. Mount with a fresh `key`
 * to replay. Purely decorative: pointerEvents none, auto-fades in ~500ms.
 * Callers must skip rendering it entirely when Reduced Motion is enabled.
 */
export function PopParticles({ color, size = 120 }: { color: string; size?: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      duration: 520,
      toValue: 1,
      useNativeDriver: true
    }).start();
  }, [progress]);

  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 1, 0]
  });

  return (
    <View
      pointerEvents="none"
      style={{
        alignItems: "center",
        height: size,
        justifyContent: "center",
        left: "50%",
        marginLeft: -size / 2,
        marginTop: -size / 2,
        position: "absolute",
        top: "50%",
        width: size,
        zIndex: 6
      }}
    >
      {Array.from({ length: PARTICLE_COUNT }, (_, index) => {
        const angle = (index / PARTICLE_COUNT) * Math.PI * 2;
        const distance = size * (0.32 + (index % 3) * 0.09);
        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.cos(angle) * distance]
        });
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.sin(angle) * distance]
        });
        const dot = 5 + (index % 3) * 2;
        return (
          <Animated.View
            key={index}
            style={{
              backgroundColor: color,
              borderRadius: 999,
              boxShadow: `0 0 8px ${color}`,
              height: dot,
              opacity,
              position: "absolute",
              transform: [{ translateX }, { translateY }],
              width: dot
            }}
          />
        );
      })}
    </View>
  );
}
