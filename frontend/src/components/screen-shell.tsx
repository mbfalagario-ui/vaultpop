import { CoinFace } from "@/components/coin-face";
import { colors, radius, spacing, typography } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { PropsWithChildren, useEffect, useRef } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSaveProfile } from "@/storage/use-save-profile";

/** Deterministic star field — three size tiers of glowing specks. */
const STARS: { top: number; left: number; size: number; tint: "white" | "accent" | "gold"; opacity: number }[] = [
  { top: 4, left: 12, size: 3, tint: "white", opacity: 0.7 },
  { top: 8, left: 66, size: 2, tint: "accent", opacity: 0.65 },
  { top: 11, left: 30, size: 1.5, tint: "white", opacity: 0.4 },
  { top: 14, left: 88, size: 3, tint: "gold", opacity: 0.6 },
  { top: 19, left: 50, size: 1.5, tint: "white", opacity: 0.35 },
  { top: 23, left: 7, size: 2, tint: "accent", opacity: 0.55 },
  { top: 27, left: 74, size: 1.5, tint: "white", opacity: 0.4 },
  { top: 31, left: 40, size: 3, tint: "white", opacity: 0.55 },
  { top: 36, left: 92, size: 2, tint: "accent", opacity: 0.6 },
  { top: 40, left: 18, size: 1.5, tint: "gold", opacity: 0.4 },
  { top: 45, left: 60, size: 2, tint: "white", opacity: 0.5 },
  { top: 50, left: 4, size: 3, tint: "accent", opacity: 0.55 },
  { top: 54, left: 82, size: 1.5, tint: "white", opacity: 0.35 },
  { top: 59, left: 36, size: 2, tint: "gold", opacity: 0.5 },
  { top: 63, left: 70, size: 1.5, tint: "white", opacity: 0.4 },
  { top: 68, left: 14, size: 3, tint: "white", opacity: 0.55 },
  { top: 72, left: 90, size: 2, tint: "accent", opacity: 0.6 },
  { top: 77, left: 48, size: 1.5, tint: "white", opacity: 0.35 },
  { top: 81, left: 26, size: 2, tint: "gold", opacity: 0.5 },
  { top: 85, left: 78, size: 3, tint: "white", opacity: 0.5 },
  { top: 89, left: 8, size: 1.5, tint: "accent", opacity: 0.45 },
  { top: 93, left: 58, size: 2, tint: "white", opacity: 0.5 },
  { top: 96, left: 34, size: 1.5, tint: "gold", opacity: 0.4 },
  { top: 98, left: 84, size: 2, tint: "white", opacity: 0.45 }
];

const SPARKLES: { top: number; left: number; size: number }[] = [
  { top: 9, left: 44, size: 14 },
  { top: 47, left: 86, size: 11 },
  { top: 83, left: 20, size: 12 }
];

type ScreenShellProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  lead?: string;
  accent?: string;
  compact?: boolean;
  showBack?: boolean;
  inlineHeader?: boolean;
}>;

/**
 * Cinematic screen background: deep navy-violet vertical wash, twin aurora
 * glows keyed to the screen accent, and a bottom vignette. All content
 * scrolls above it inside safe areas.
 */
export function ScreenShell({
  eyebrow,
  title,
  lead,
  accent = colors.cyan,
  compact = false,
  showBack = true,
  inlineHeader = false,
  children
}: ScreenShellProps) {
  const insets = useSafeAreaInsets();
  const [profile] = useSaveProfile();
  const breathe = useRef(new Animated.Value(0.7)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (profile.settings.reducedMotion) {
      breathe.setValue(0.85);
      drift.setValue(0.5);
      return;
    }
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { duration: 2600, toValue: 1, useNativeDriver: true }),
        Animated.timing(breathe, { duration: 2600, toValue: 0.55, useNativeDriver: true })
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { duration: 5200, toValue: 1, useNativeDriver: true }),
        Animated.timing(drift, { duration: 5200, toValue: 0, useNativeDriver: true })
      ])
    ).start();
  }, [breathe, drift, profile.settings.reducedMotion]);

  const driftUp = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  const driftDown = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });

  return (
    <View style={{ backgroundColor: colors.backgroundDeep, flex: 1, overflow: "hidden" }}>
      <LinearGradient
        colors={["#151038", "#0B0820", colors.backgroundDeep]}
        locations={[0, 0.5, 1]}
        style={{ bottom: 0, left: 0, pointerEvents: "none", position: "absolute", right: 0, top: 0 }}
      />
      {/* Nebula sweep 1 — screen accent, breathing */}
      <Animated.View
        pointerEvents="none"
        style={{
          height: 520,
          opacity: breathe,
          position: "absolute",
          right: -200,
          top: -180,
          width: 520
        }}
      >
        <LinearGradient
          colors={[`${accent}5C`, `${accent}1F`, `${accent}00`]}
          locations={[0, 0.45, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ borderRadius: 999, flex: 1, transform: [{ rotate: "-18deg" }] }}
        />
      </Animated.View>
      {/* Nebula sweep 2 — violet counter-tone, lower left */}
      <LinearGradient
        colors={["rgba(125,63,255,0.34)", "rgba(125,63,255,0.10)", "rgba(125,63,255,0)"]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          pointerEvents: "none",
          borderRadius: 999,
          bottom: -180,
          height: 480,
          left: -200,
          position: "absolute",
          transform: [{ rotate: "155deg" }],
          width: 480
        }}
      />
      {/* Diagonal energy beam */}
      <LinearGradient
        colors={[`${accent}00`, `${accent}1C`, `${accent}00`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          pointerEvents: "none",
          height: 230,
          left: "-25%",
          position: "absolute",
          top: "28%",
          transform: [{ rotate: "-24deg" }],
          width: "150%"
        }}
      />
      {/* Cool counter-glow mid-left */}
      <LinearGradient
        colors={["rgba(20,150,230,0.22)", "rgba(20,150,230,0)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          pointerEvents: "none",
          borderRadius: 999,
          height: 340,
          left: -150,
          position: "absolute",
          top: "34%",
          transform: [{ rotate: "40deg" }],
          width: 340
        }}
      />
      {/* Bottom horizon rim light */}
      <LinearGradient
        colors={[`${accent}00`, `${accent}30`]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          pointerEvents: "none",
          bottom: 0,
          height: 150,
          left: 0,
          position: "absolute",
          right: 0
        }}
      />
      {/* Drifting ambient coins */}
      <Animated.View
        pointerEvents="none"
        style={{
          left: -34,
          opacity: 0.16,
          position: "absolute",
          top: "16%",
          transform: [{ translateY: driftUp }, { rotate: "-14deg" }]
        }}
      >
        <CoinFace type="gold" size={128} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={{
          opacity: 0.13,
          position: "absolute",
          right: -22,
          top: "56%",
          transform: [{ translateY: driftDown }, { rotate: "18deg" }]
        }}
      >
        <CoinFace type="violet" size={96} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={{
          left: "22%",
          bottom: -18,
          opacity: 0.12,
          position: "absolute",
          transform: [{ translateY: driftUp }, { rotate: "10deg" }]
        }}
      >
        <CoinFace type="cyan" size={72} />
      </Animated.View>
      {/* Star specks + cross sparkles */}
      <View pointerEvents="none" style={{ bottom: 0, left: 0, position: "absolute", right: 0, top: 0 }}>
        {STARS.map((star, index) => {
          const tint =
            star.tint === "accent" ? accent : star.tint === "gold" ? colors.gold : "#E7E4FF";
          return (
            <View
              key={index}
              style={{
                backgroundColor: tint,
                borderRadius: 999,
                boxShadow: `0 0 ${star.size * 4}px ${tint}`,
                height: star.size,
                left: `${star.left}%`,
                opacity: star.opacity,
                position: "absolute",
                top: `${star.top}%`,
                width: star.size
              }}
            />
          );
        })}
        {SPARKLES.map((sparkle, index) => (
          <View
            key={`sparkle-${index}`}
            style={{
              alignItems: "center",
              height: sparkle.size,
              justifyContent: "center",
              left: `${sparkle.left}%`,
              opacity: 0.55,
              position: "absolute",
              top: `${sparkle.top}%`,
              width: sparkle.size
            }}
          >
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 999,
                boxShadow: "0 0 8px #FFFFFF",
                height: sparkle.size,
                position: "absolute",
                width: 1.5
              }}
            />
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 999,
                height: 1.5,
                position: "absolute",
                width: sparkle.size
              }}
            />
          </View>
        ))}
      </View>
      <LinearGradient
        colors={["rgba(94,43,212,0.13)", "rgba(94,43,212,0)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          pointerEvents: "none",
          borderRadius: 999,
          bottom: -160,
          height: 380,
          left: -150,
          position: "absolute",
          transform: [{ rotate: "160deg" }],
          width: 380
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: "transparent" }}
        contentContainerStyle={{
          gap: compact ? spacing.md : spacing.lg,
          minHeight: "100%",
          padding: compact ? spacing.md : spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          paddingTop: insets.top + spacing.md
        }}
      >
        {showBack ? (
          <BackChip accent={accent} inline={inlineHeader} eyebrow={eyebrow} title={title} />
        ) : null}
        {!inlineHeader && (eyebrow || title || lead) ? (
          <View style={{ gap: spacing.xs }}>
            {eyebrow ? (
              <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
                <View
                  style={{
                    backgroundColor: accent,
                    borderRadius: 2,
                    boxShadow: `0 0 8px ${accent}`,
                    height: 10,
                    transform: [{ rotate: "45deg" }],
                    width: 10
                  }}
                />
                <Text selectable style={[typography.eyebrow, { color: accent }]}>
                  {eyebrow}
                </Text>
              </View>
            ) : null}
            {title ? (
              <Text
                selectable
                style={[typography.title, { fontSize: compact ? 26 : 32 }]}
              >
                {title}
              </Text>
            ) : null}
            {lead ? (
              <Text selectable style={typography.body}>
                {lead}
              </Text>
            ) : null}
          </View>
        ) : null}
        {children}
      </ScrollView>
    </View>
  );
}

function BackChip({
  accent,
  inline,
  eyebrow,
  title
}: {
  accent: string;
  inline: boolean;
  eyebrow?: string;
  title?: string;
}) {
  const button = (
    <Pressable
      accessibilityLabel="Back"
      accessibilityRole="button"
      testID="screen-back-button"
      hitSlop={8}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/");
        }
      }}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: pressed ? `${accent}26` : colors.surfaceGlass,
        borderColor: colors.border,
        borderRadius: radius.pill,
        borderWidth: 1,
        height: 44,
        justifyContent: "center",
        transform: [{ scale: pressed ? 0.94 : 1 }],
        width: 44
      })}
    >
      <View
        style={{
          borderBottomColor: colors.textPrimary,
          borderBottomWidth: 2.5,
          borderLeftColor: colors.textPrimary,
          borderLeftWidth: 2.5,
          height: 11,
          marginLeft: 4,
          transform: [{ rotate: "45deg" }],
          width: 11
        }}
      />
    </Pressable>
  );

  if (!inline) {
    return button;
  }

  return (
    <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
      {button}
      <View style={{ flex: 1, gap: 1 }}>
        {eyebrow ? (
          <Text selectable={false} style={[typography.eyebrow, { color: accent, fontSize: 9.5 }]}>
            {eyebrow}
          </Text>
        ) : null}
        {title ? (
          <Text
            selectable={false}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={[typography.sectionTitle, { fontSize: 19 }]}
          >
            {title}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
