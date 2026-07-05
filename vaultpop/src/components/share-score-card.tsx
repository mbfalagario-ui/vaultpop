import { CoinFace } from "@/components/coin-face";
import { GameLogo } from "@/components/game-logo";
import type { GameModeId, TileType } from "@/game/models";
import { colors, getModeVisual, radius, spacing, typography } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { Text, View } from "react-native";
import ViewShot from "react-native-view-shot";

const MODE_GLYPHS: Record<GameModeId, TileType> = {
  classic: "violet",
  dailyVault: "cyan",
  streak: "gold",
  blitz: "ruby"
};

type ViewShotInstance = { capture?: () => Promise<string> };

export type ScoreCardHandle = { capture: () => Promise<string> };

type ShareScoreCardProps = {
  mode: GameModeId;
  score: number;
  best: number;
  combo: string;
  handle: string;
};

/**
 * The exportable score card. Wrapped in ViewShot so the results screen can
 * capture it as an image and hand it to the iOS share sheet.
 */
export const ShareScoreCard = forwardRef<ScoreCardHandle, ShareScoreCardProps>(
  function ShareScoreCard({ mode, score, best, combo, handle }, ref) {
    const visual = getModeVisual(mode);
    const shotRef = useRef<ViewShotInstance | null>(null);

    useImperativeHandle(ref, () => ({
      capture: async () => {
        const capture = shotRef.current?.capture;
        if (!capture) {
          throw new Error("Score card capture is unavailable.");
        }
        return capture();
      }
    }));

    return (
      <ViewShot
        ref={(node: unknown) => {
          shotRef.current = node as ViewShotInstance | null;
        }}
        options={{ format: "png", quality: 1 }}
      >
        <LinearGradient
          colors={["#151027", "#08060F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={{
            alignItems: "center",
            borderColor: `${visual.accent}55`,
            borderRadius: radius.lg,
            borderWidth: 1,
            gap: spacing.md,
            overflow: "hidden",
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.xl
          }}
        >
          <LinearGradient
            colors={[`${visual.accent}30`, `${visual.accent}00`]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              borderRadius: 999,
              height: 220,
              pointerEvents: "none",
              position: "absolute",
              right: -80,
              top: -80,
              width: 220
            }}
          />
          <GameLogo compact />
          <CoinFace type={MODE_GLYPHS[mode]} size={72} glow />
          <View style={{ alignItems: "center" }}>
            <Text
              selectable={false}
              style={{
                color: visual.energy,
                fontSize: 52,
                fontStyle: "italic",
                fontVariant: ["tabular-nums"],
                fontWeight: "900",
                letterSpacing: -1
              }}
            >
              {score.toLocaleString()}
            </Text>
            <Text
              selectable={false}
              style={[typography.eyebrow, { color: colors.textMuted, fontSize: 10 }]}
            >
              {visual.kicker}
            </Text>
          </View>
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.lg }}>
            <Text selectable={false} style={[typography.caption, { color: colors.textSecondary, fontWeight: "700" }]}>
              {handle}
            </Text>
            <Text selectable={false} style={[typography.caption, { color: visual.accent, fontWeight: "800" }]}>
              BEST {best.toLocaleString()}
            </Text>
            <Text selectable={false} style={[typography.caption, { color: colors.gold, fontWeight: "800" }]}>
              CHAIN {combo}
            </Text>
          </View>
          <Text
            selectable={false}
            style={{ color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 2 }}
          >
            VAULTPOP · POP COINS. COMPLETE THE CHAIN.
          </Text>
        </LinearGradient>
      </ViewShot>
    );
  }
);
