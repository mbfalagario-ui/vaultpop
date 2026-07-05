import { ArcadeGlyph } from "@/components/arcade-glyph";
import type { GameModeId, TileType } from "@/game/models";
import { colors, darken, radius, spacing, typography } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";

/**
 * Power-up medallion: gradient energy ring, dark core with a solid glyph,
 * and a gold inventory badge.
 */
export function BoosterControl({
  label,
  count,
  accent,
  glyph,
  modeId,
  disabled,
  onPress
}: {
  label: string;
  count: number;
  accent: string;
  glyph: TileType;
  modeId: GameModeId;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label}, ${count} available`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      testID={`booster-${label.toLowerCase()}-button`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        flex: 1,
        gap: spacing.xs,
        minHeight: 84,
        opacity: disabled ? 0.32 : 1,
        paddingVertical: spacing.sm,
        transform: [{ scale: pressed && !disabled ? 0.9 : 1 }]
      })}
    >
      <LinearGradient
        colors={[accent, darken(accent, 0.45)]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          alignItems: "center",
          borderRadius: radius.pill,
          boxShadow: disabled ? undefined : `0 0 18px ${accent}55, 0 6px 12px #00000088`,
          height: 56,
          justifyContent: "center",
          width: 56
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: "#0B0919",
            borderRadius: radius.pill,
            height: 48,
            justifyContent: "center",
            width: 48
          }}
        >
          <ArcadeGlyph color={accent} modeId={modeId} size={24} type={glyph} />
        </View>
      </LinearGradient>
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.gold,
          borderColor: "#0B0919",
          borderRadius: radius.pill,
          borderWidth: 2,
          height: 22,
          justifyContent: "center",
          minWidth: 24,
          paddingHorizontal: 4,
          position: "absolute",
          right: "18%",
          top: 0
        }}
      >
        <Text
          selectable={false}
          style={{ color: "#171000", fontSize: 12, fontWeight: "900" }}
        >
          {count}
        </Text>
      </View>
      <Text
        selectable={false}
        style={[
          typography.eyebrow,
          { color: colors.textSecondary, fontSize: 9.5, letterSpacing: 1.4 }
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
