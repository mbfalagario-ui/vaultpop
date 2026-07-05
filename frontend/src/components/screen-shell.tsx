import { colors, radius, spacing, typography } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { PropsWithChildren } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

  return (
    <View style={{ backgroundColor: colors.backgroundDeep, flex: 1, overflow: "hidden" }}>
      <LinearGradient
        colors={["#100C26", colors.background, colors.backgroundDeep]}
        locations={[0, 0.45, 1]}
        style={{ bottom: 0, left: 0, pointerEvents: "none", position: "absolute", right: 0, top: 0 }}
      />
      <LinearGradient
        colors={[`${accent}38`, `${accent}00`]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          pointerEvents: "none",
          borderRadius: 999,
          height: 340,
          position: "absolute",
          right: -140,
          top: -120,
          transform: [{ rotate: "-18deg" }],
          width: 340
        }}
      />
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
          paddingTop: insets.top + spacing.sm
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
          <Text selectable={false} style={[typography.sectionTitle, { fontSize: 19 }]}>
            {title}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
