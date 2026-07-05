import { colors, spacing, typography } from "@/theme";
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
}>;

export function ScreenShell({
  eyebrow,
  title,
  lead,
  accent = colors.cyan,
  compact = false,
  showBack = true,
  children
}: ScreenShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <View
        pointerEvents="none"
        style={{
          backgroundColor: `${accent}12`,
          height: 180,
          left: 0,
          position: "absolute",
          right: 0,
          top: 0
        }}
      />
      <View
        pointerEvents="none"
        style={{
          backgroundColor: accent,
          height: 2,
          left: spacing.lg,
          opacity: 0.72,
          position: "absolute",
          right: spacing.lg,
          top: 0
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        style={{ backgroundColor: "transparent" }}
        contentContainerStyle={{
          gap: compact ? spacing.md : spacing.lg,
          minHeight: "100%",
          padding: compact ? spacing.md : spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
          paddingTop: insets.top + spacing.sm
        }}
      >
        {showBack ? (
          <Pressable
            accessibilityLabel="Back"
            accessibilityRole="button"
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
              backgroundColor: pressed ? `${accent}24` : colors.surfaceGlass,
              borderColor: `${accent}66`,
              borderRadius: 999,
              borderWidth: 1,
              height: 42,
              justifyContent: "center",
              opacity: pressed ? 0.72 : 1,
              width: 42
            })}
          >
            <View
              style={{
                borderBottomColor: colors.textPrimary,
                borderBottomWidth: 3,
                borderLeftColor: colors.textPrimary,
                borderLeftWidth: 3,
                height: 13,
                marginLeft: 5,
                transform: [{ rotate: "45deg" }],
                width: 13
              }}
            />
          </Pressable>
        ) : null}
        <View style={{ gap: spacing.xs }}>
          {eyebrow ? (
            <Text selectable style={[typography.eyebrow, { color: accent }]}>
              {eyebrow}
            </Text>
          ) : null}
          {title ? (
            <Text
              selectable
              style={[typography.title, { fontSize: compact ? 26 : 30 }]}
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
        {children}
      </ScrollView>
    </View>
  );
}
