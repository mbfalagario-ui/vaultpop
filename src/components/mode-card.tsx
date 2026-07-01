import { ActionLink } from "@/components/action-link";
import { MetricCard } from "@/components/metric-card";
import { colors, spacing, typography } from "@/theme";
import type { GameModeDefinition } from "@/game/models";
import { Text, View } from "react-native";

type ModeCardProps = {
  mode: GameModeDefinition;
  bestScore: number;
  detail?: string;
};

export function ModeCard({ mode, bestScore, detail }: ModeCardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.surfaceRaised,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        gap: spacing.md,
        padding: spacing.md
      }}
    >
      <View style={{ gap: spacing.xs }}>
        <Text selectable style={typography.sectionTitle}>
          {mode.title}
        </Text>
        <Text selectable style={typography.body}>
          {mode.summary}
        </Text>
        {detail ? (
          <Text selectable style={typography.caption}>
            {detail}
          </Text>
        ) : null}
      </View>
      <MetricCard label="Best Score" value={bestScore} accent={colors.gold} />
      <ActionLink
        href={{ pathname: "/gameplay", params: { mode: mode.id } }}
        label={`Play ${mode.title}`}
      />
    </View>
  );
}

