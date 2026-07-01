import { colors, spacing, typography } from "@/theme";
import type { BoardTile } from "@/game/models";
import { Pressable, Text } from "react-native";

const tileColors = {
  gold: colors.gold,
  cyan: colors.cyan,
  emerald: colors.emerald,
  violet: colors.violet,
  ruby: colors.ruby
};

const tileLabels = {
  gold: "G",
  cyan: "C",
  emerald: "E",
  violet: "V",
  ruby: "R"
};

type CoinTileProps = {
  tile: BoardTile;
  onPress: () => void;
};

export function CoinTile({ tile, onPress }: CoinTileProps) {
  const accent = tileColors[tile.type];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tile.type} coin tile row ${tile.row + 1} column ${tile.column + 1}`}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        aspectRatio: 1,
        backgroundColor: pressed ? colors.surface : `${accent}22`,
        borderColor: accent,
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: "center",
        margin: 1,
        width: "12%"
      })}
    >
      <Text
        selectable={false}
        style={[
          typography.button,
          {
            color: accent,
            fontSize: 15,
            lineHeight: 18,
            paddingTop: spacing.xs
          }
        ]}
      >
        {tileLabels[tile.type]}
      </Text>
    </Pressable>
  );
}

