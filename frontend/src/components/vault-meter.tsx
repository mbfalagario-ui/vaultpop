import { colors, darken, lighten, radius, spacing, typography } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

type VaultMeterProps = {
  current: number;
  max: number;
  opening?: boolean;
  accent?: string;
  label?: string;
};

/**
 * The vault core: a heavy energy channel with segment ticks, a glowing fill
 * tip, and a vault-lock medallion that flares gold when the vault opens.
 */
export function VaultMeter({
  current,
  max,
  opening = false,
  accent = colors.cyan,
  label = "Vault Core"
}: VaultMeterProps) {
  const percent = Math.max(0, Math.min(100, Math.round((current / max) * 100)));
  const animatedWidth = useRef(new Animated.Value(percent)).current;
  const flare = useRef(new Animated.Value(0)).current;
  const fill = opening ? colors.gold : accent;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      duration: 300,
      toValue: percent,
      useNativeDriver: false
    }).start();
  }, [animatedWidth, percent]);

  useEffect(() => {
    if (!opening) {
      flare.setValue(0);
      return;
    }
    Animated.loop(
      Animated.sequence([
        Animated.timing(flare, { duration: 320, toValue: 1, useNativeDriver: false }),
        Animated.timing(flare, { duration: 320, toValue: 0.35, useNativeDriver: false })
      ])
    ).start();
  }, [flare, opening]);

  const width = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"]
  });

  return (
    <View
      testID="vault-meter"
      style={{
        alignItems: "center",
        flexDirection: "row",
        gap: spacing.sm
      }}
    >
      {/* Vault lock medallion */}
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.surfaceRaised,
          borderColor: opening ? colors.gold : `${accent}77`,
          borderRadius: radius.pill,
          borderWidth: 1.5,
          boxShadow: opening ? `0 0 18px ${colors.gold}AA` : `0 0 10px ${accent}33`,
          height: 40,
          justifyContent: "center",
          width: 40
        }}
      >
        <View
          style={{
            alignItems: "center",
            borderColor: fill,
            borderRadius: 999,
            borderWidth: 2.5,
            height: 18,
            justifyContent: "center",
            width: 18
          }}
        >
          <View
            style={{
              backgroundColor: fill,
              borderRadius: 2,
              height: 7,
              top: 5,
              position: "absolute",
              width: 3
            }}
          />
        </View>
      </View>

      <View style={{ flex: 1, gap: 5 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text selectable style={[typography.eyebrow, { color: opening ? colors.gold : accent, fontSize: 10 }]}>
            {opening ? "VAULT OPEN" : label}
          </Text>
          <Text
            selectable
            style={[typography.eyebrow, { color: colors.textMuted, fontSize: 10 }]}
          >
            {percent}%
          </Text>
        </View>
        <View
          style={{
            backgroundColor: "#04030C",
            borderColor: colors.border,
            borderRadius: radius.pill,
            borderWidth: 1,
            height: 16,
            overflow: "hidden"
          }}
        >
          <Animated.View style={{ height: "100%", width }}>
            <LinearGradient
              colors={[lighten(fill, 0.25), fill, darken(fill, 0.15)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: radius.pill,
                boxShadow: `0 0 14px ${fill}CC`,
                flex: 1
              }}
            />
          </Animated.View>
          {/* Segment ticks */}
          <View
            pointerEvents="none"
            style={{
              bottom: 0,
              flexDirection: "row",
              left: 0,
              position: "absolute",
              right: 0,
              top: 0
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((tick) => (
              <View
                key={tick}
                style={{
                  backgroundColor: "#00000066",
                  height: "100%",
                  left: `${tick * 12.5}%`,
                  position: "absolute",
                  width: 2
                }}
              />
            ))}
          </View>
          {opening ? (
            <Animated.View
              pointerEvents="none"
              style={{
                backgroundColor: colors.gold,
                bottom: 0,
                left: 0,
                opacity: flare.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }),
                position: "absolute",
                right: 0,
                top: 0
              }}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}
