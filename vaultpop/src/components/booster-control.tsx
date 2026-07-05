import { ArcadeGlyph } from "@/components/arcade-glyph";
import type { GameModeId, TileType } from "@/game/models";
import { colors, spacing, typography } from "@/theme";
import { Pressable, Text, View } from "react-native";

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
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        flex: 1,
        gap: spacing.xs,
        minHeight: 78,
        opacity: disabled ? 0.38 : pressed ? 0.74 : 1,
        paddingVertical: spacing.sm
      })}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: `${accent}1F`,
          borderColor: accent,
          borderRadius: 999,
          borderWidth: 2,
          boxShadow: `0 0 18px ${accent}55`,
          height: 52,
          justifyContent: "center",
          width: 52
        }}
      >
        <ArcadeGlyph color={accent} modeId={modeId} size={24} type={glyph} />
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.background,
            borderColor: accent,
            borderRadius: 999,
            borderWidth: 1,
            bottom: -6,
            height: 22,
            justifyContent: "center",
            position: "absolute",
            right: -6,
            width: 22
          }}
        >
          <Text selectable style={[typography.caption, { color: accent, fontWeight: "800" }]}>
            {count}
          </Text>
        </View>
      </View>
      <Text selectable style={[typography.caption, { color: colors.textPrimary, fontSize: 11 }]}>
        {label}
      </Text>
    </Pressable>
  );
}
