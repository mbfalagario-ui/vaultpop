import { ActionButton } from "@/components/action-button";
import { ActionLink } from "@/components/action-link";
import { BoosterControl } from "@/components/booster-control";
import { CoinTile } from "@/components/coin-tile";
import { ScreenShell } from "@/components/screen-shell";
import { VaultMeter } from "@/components/vault-meter";
import { getDailySeed, getLocalDateKey } from "@/game/daily-seed";
import {
  advanceTimer,
  applyBonusLife,
  applyChainBoost,
  applyVaultBurst,
  createInitialRound,
  finishRound,
  getConnectedGroup,
  resolveTap
} from "@/game/engine";
import type { GameModeId, RoundState } from "@/game/models";
import { consumeBooster, type BoosterKind } from "@/monetization/economy";
import { hasPremiumThemeAccess } from "@/monetization/entitlements";
import { applyRoundResult, type DailyVaultSave } from "@/storage";
import { useSaveProfile } from "@/storage/use-save-profile";
import {
  colors,
  getModeVisual,
  getVisualTheme,
  radius,
  spacing,
  typography
} from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Animated, Text, View } from "react-native";

function normalizeMode(value: unknown): GameModeId {
  return value === "dailyVault" || value === "streak" || value === "classic"
    ? value
    : "classic";
}

async function playHaptic(enabled: boolean) {
  if (!enabled || process.env.EXPO_OS !== "ios") {
    return;
  }

  try {
    const Haptics = await import("expo-haptics");
    await Haptics.selectionAsync();
  } catch {
    // Haptics are optional and must never block gameplay.
  }
}

export function GameplayScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const modeId = normalizeMode(params.mode);
  const visual = getModeVisual(modeId);
  const [profile, setProfile] = useSaveProfile();
  const activeThemeId =
    profile.cosmetics.activeThemeId === "vaultpass-prism" &&
    !hasPremiumThemeAccess(profile)
      ? "midnight-vault"
      : profile.cosmetics.activeThemeId;
  const cosmeticGlow = getVisualTheme(activeThemeId);
  const seed = useMemo(
    () => (modeId === "dailyVault" ? getDailySeed() : `${modeId}-${Date.now()}`),
    [modeId]
  );
  const [round, setRound] = useState<RoundState>(() =>
    createInitialRound(modeId, { seed })
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState("");
  const [boardWidth, setBoardWidth] = useState(0);
  const feedbackMotion = useRef(new Animated.Value(0)).current;
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputLockedRef = useRef(false);
  const completedRoundRef = useRef<string | null>(null);

  const restart = useCallback(() => {
    const nextSeed =
      modeId === "dailyVault" ? getDailySeed() : `${modeId}-${Date.now()}`;
    completedRoundRef.current = null;
    inputLockedRef.current = false;
    setSelectedIds(new Set());
    setFeedback("");
    setRound(createInitialRound(modeId, { seed: nextSeed }));
  }, [modeId]);

  useEffect(() => {
    restart();
    return () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
    };
  }, [restart]);

  useEffect(() => {
    if (round.phase !== "playing") {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setRound((currentRound) => advanceTimer(currentRound));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [round.phase]);

  useEffect(() => {
    if (
      round.phase !== "complete" ||
      completedRoundRef.current === round.completedAt
    ) {
      return;
    }

    completedRoundRef.current = round.completedAt ?? "complete";
    const dailySave: DailyVaultSave | null =
      round.modeId === "dailyVault"
        ? {
            dateKey: getLocalDateKey(),
            seed: getDailySeed(),
            played: true,
            bestScore: Math.max(
              profile.dailyVault?.bestScore ?? 0,
              round.score.current
            )
          }
        : null;

    setProfile((currentProfile) =>
      applyRoundResult(
        currentProfile,
        round.modeId,
        round.score.current,
        dailySave
      )
    );

    router.replace({
      pathname: "/results",
      params: {
        mode: round.modeId,
        score: String(round.score.current),
        combo: String(round.score.comboMultiplier),
        group: String(round.score.bestGroupSize),
        streak: String(round.score.streakCount),
        vaults: String(round.score.vaultBonuses)
      }
    });
  }, [profile.dailyVault?.bestScore, round, setProfile]);

  const animateFeedback = useCallback(
    (text: string) => {
      setFeedback(text);
      feedbackMotion.setValue(0);
      Animated.sequence([
        Animated.spring(feedbackMotion, {
          damping: 10,
          stiffness: 220,
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.timing(feedbackMotion, {
          delay: 300,
          duration: 220,
          toValue: 0,
          useNativeDriver: true
        })
      ]).start();
    },
    [feedbackMotion]
  );

  const handleTilePress = useCallback(
    (row: number, column: number) => {
      if (round.phase !== "playing" || inputLockedRef.current) {
        return;
      }

      const group = getConnectedGroup(round.board, { row, column });
      if (group.length < 2) {
        setRound((current) => resolveTap(current, { row, column }));
        animateFeedback(modeId === "streak" ? "CHAIN LOST" : "FIND A GROUP");
        void playHaptic(profile.settings.hapticsEnabled);
        return;
      }

      const projected = resolveTap(round, { row, column });
      const scoreDelta = projected.score.current - round.score.current;
      const ids = group
        .map((position) => round.board.tiles[position.row]?.[position.column]?.id)
        .filter((id): id is string => Boolean(id));

      inputLockedRef.current = true;
      setSelectedIds(new Set(ids));
      animateFeedback(
        projected.vaultMeter.opening
          ? `VAULT OPEN +${scoreDelta}`
          : `+${scoreDelta}  ·  ${projected.score.comboMultiplier}x`
      );
      void playHaptic(profile.settings.hapticsEnabled);

      const delay = profile.settings.reducedMotion ? 0 : 230;
      clearTimerRef.current = setTimeout(() => {
        setRound((current) =>
          current.board.turn === round.board.turn
            ? resolveTap(current, { row, column })
            : current
        );
        setSelectedIds(new Set());
        inputLockedRef.current = false;
      }, delay);
    },
    [
      animateFeedback,
      modeId,
      profile.settings.hapticsEnabled,
      profile.settings.reducedMotion,
      round
    ]
  );

  const endRound = useCallback(() => {
    setRound((currentRound) => finishRound(currentRound));
  }, []);

  const pauseRound = useCallback(() => {
    setRound((currentRound) =>
      currentRound.phase === "playing"
        ? { ...currentRound, phase: "paused", lastEvent: "Paused" }
        : currentRound
    );
  }, []);

  const resumeRound = useCallback(() => {
    setRound((currentRound) =>
      currentRound.phase === "paused"
        ? { ...currentRound, phase: "playing", lastEvent: "Round resumed" }
        : currentRound
    );
  }, []);

  const activateBooster = useCallback(
    (booster: BoosterKind) => {
      if (
        round.phase !== "playing" ||
        profile.economy.boosters[booster] <= 0
      ) {
        return;
      }
      setRound((currentRound) =>
        booster === "bonusLives"
          ? applyBonusLife(currentRound)
          : booster === "chainBoosts"
            ? applyChainBoost(currentRound)
            : applyVaultBurst(currentRound)
      );
      setProfile((currentProfile) =>
        consumeBooster(currentProfile, booster)
      );
      animateFeedback(
        booster === "bonusLives"
          ? "+15 SEC"
          : booster === "chainBoosts"
            ? "CHAIN +2"
            : "VAULT BURST"
      );
      void playHaptic(profile.settings.hapticsEnabled);
    },
    [
      animateFeedback,
      profile.economy.boosters,
      profile.settings.hapticsEnabled,
      round.phase,
      setProfile
    ]
  );

  const modeLabel =
    modeId === "dailyVault"
      ? "Daily Vault"
      : modeId === "streak"
        ? "Streak"
        : "Classic";

  const feedbackScale = feedbackMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1]
  });
  const tileSize = boardWidth > 0 ? boardWidth / 8 : 0;
  const lowTime = round.secondsRemaining <= 10;

  return (
    <ScreenShell
      eyebrow={visual.name}
      title={round.phase === "paused" ? "Paused" : modeLabel}
      accent={visual.accent}
      compact
    >
      {/* Cinematic HUD */}
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between"
        }}
      >
        <View
          testID="hud-time"
          style={{
            alignItems: "center",
            backgroundColor: colors.surfaceGlass,
            borderColor: lowTime ? colors.ruby : colors.border,
            borderRadius: radius.pill,
            borderWidth: 1,
            boxShadow: lowTime ? `0 0 14px ${colors.ruby}66` : undefined,
            flexDirection: "row",
            gap: 7,
            minWidth: 86,
            justifyContent: "center",
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm
          }}
        >
          <View
            style={{
              backgroundColor: lowTime ? colors.ruby : visual.secondary,
              borderRadius: 999,
              boxShadow: `0 0 8px ${lowTime ? colors.ruby : visual.secondary}`,
              height: 7,
              width: 7
            }}
          />
          <Text
            selectable={false}
            style={[
              typography.numeral,
              { color: lowTime ? colors.ruby : colors.textPrimary, fontSize: 18 }
            ]}
          >
            {round.secondsRemaining}s
          </Text>
        </View>

        <View style={{ alignItems: "center", flex: 1 }} testID="hud-score">
          <Text
            selectable={false}
            style={[
              typography.numeral,
              {
                color: visual.energy,
                fontSize: 38,
                textShadowColor: `${visual.energy}55`,
                textShadowOffset: { height: 0, width: 0 },
                textShadowRadius: 16
              }
            ]}
          >
            {round.score.current.toLocaleString()}
          </Text>
          <Text
            selectable={false}
            style={[typography.eyebrow, { color: colors.textMuted, fontSize: 9, letterSpacing: 2.4 }]}
          >
            SCORE
          </Text>
        </View>

        <View
          testID="hud-combo"
          style={{
            alignItems: "center",
            backgroundColor: colors.surfaceGlass,
            borderColor: round.score.comboMultiplier > 1 ? visual.accent : colors.border,
            borderRadius: radius.pill,
            borderWidth: 1,
            boxShadow:
              round.score.comboMultiplier > 1 ? `0 0 14px ${visual.accent}66` : undefined,
            flexDirection: "row",
            gap: 6,
            minWidth: 86,
            justifyContent: "center",
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm
          }}
        >
          <Text
            selectable={false}
            style={[
              typography.numeral,
              {
                color:
                  round.score.comboMultiplier > 1 ? visual.accent : colors.textSecondary,
                fontSize: 18
              }
            ]}
          >
            {round.score.comboMultiplier}x
          </Text>
          <Text
            selectable={false}
            style={[typography.eyebrow, { color: colors.textMuted, fontSize: 8.5 }]}
          >
            {modeId === "streak" ? "CHAIN" : "COMBO"}
          </Text>
        </View>
      </View>

      <VaultMeter
        current={round.vaultMeter.current}
        max={round.vaultMeter.max}
        opening={round.vaultMeter.opening}
        accent={modeId === "classic" ? visual.accent : visual.secondary}
        label={modeId === "streak" ? "Forge Core" : modeId === "classic" ? "Reactor Core" : "Prism Core"}
      />

      {/* Board */}
      <View style={{ position: "relative" }}>
        <LinearGradient
          colors={[visual.surfaceRaised, visual.board]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            borderColor: `${visual.accent}44`,
            borderCurve: "continuous",
            borderRadius: radius.lg,
            borderWidth: 1,
            boxShadow: `0 22px 44px #000000AA, 0 0 34px ${cosmeticGlow.accent}22`,
            padding: 8
          }}
        >
          <View
            style={{
              backgroundColor: "#00000055",
              borderColor: "#FFFFFF0F",
              borderRadius: radius.md,
              borderWidth: 1,
              overflow: "hidden",
              padding: 4
            }}
          >
            <View
              onLayout={(event) => setBoardWidth(event.nativeEvent.layout.width)}
              style={{
                aspectRatio: 1,
                flexDirection: "row",
                flexWrap: "wrap",
                width: "100%"
              }}
            >
              {round.board.tiles.flat().map((tile) => (
                <CoinTile
                  key={tile.id}
                  modeId={modeId}
                  size={tileSize}
                  onPress={() => handleTilePress(tile.row, tile.column)}
                  reducedMotion={profile.settings.reducedMotion}
                  selected={selectedIds.has(tile.id)}
                  tile={tile}
                />
              ))}
            </View>
          </View>
        </LinearGradient>

        {feedback ? (
          <Animated.View
            pointerEvents="none"
            style={{
              alignItems: "center",
              left: 0,
              opacity: feedbackMotion,
              position: "absolute",
              right: 0,
              top: "42%",
              transform: [{ scale: feedbackScale }],
              zIndex: 3
            }}
          >
            <View
              style={{
                backgroundColor: "#05040FE8",
                borderColor: `${visual.accent}AA`,
                borderRadius: radius.pill,
                borderWidth: 1.5,
                boxShadow: `0 0 30px ${visual.accent}77`,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm
              }}
            >
              <Text
                selectable={false}
                style={{
                  color: visual.energy,
                  fontSize: 24,
                  fontStyle: "italic",
                  fontVariant: ["tabular-nums"],
                  fontWeight: "900",
                  letterSpacing: 0.5
                }}
              >
                {feedback}
              </Text>
            </View>
          </Animated.View>
        ) : null}
      </View>

      {/* Booster arcade panel */}
      <View
        style={{
          backgroundColor: colors.surfaceGlass,
          borderColor: colors.border,
          borderCurve: "continuous",
          borderRadius: radius.lg,
          borderWidth: 1,
          flexDirection: "row",
          paddingHorizontal: spacing.sm
        }}
      >
        <BoosterControl
          accent={visual.secondary}
          count={profile.economy.boosters.bonusLives}
          disabled={
            round.phase !== "playing" ||
            profile.economy.boosters.bonusLives <= 0
          }
          glyph="cyan"
          label="TIME"
          modeId={modeId}
          onPress={() => activateBooster("bonusLives")}
        />
        <View style={{ alignSelf: "center", backgroundColor: colors.border, height: 44, width: 1 }} />
        <BoosterControl
          accent={visual.accent}
          count={profile.economy.boosters.chainBoosts}
          disabled={
            round.phase !== "playing" ||
            profile.economy.boosters.chainBoosts <= 0
          }
          glyph="violet"
          label="CHAIN"
          modeId={modeId}
          onPress={() => activateBooster("chainBoosts")}
        />
        <View style={{ alignSelf: "center", backgroundColor: colors.border, height: 44, width: 1 }} />
        <BoosterControl
          accent={visual.energy}
          count={profile.economy.boosters.vaultBursts}
          disabled={
            round.phase !== "playing" ||
            profile.economy.boosters.vaultBursts <= 0
          }
          glyph="gold"
          label="BURST"
          modeId={modeId}
          onPress={() => activateBooster("vaultBursts")}
        />
      </View>

      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between"
        }}
      >
        <Text selectable style={[typography.caption, { color: visual.secondary, flex: 1, fontSize: 12 }]}>
          {round.lastEvent}
        </Text>
        <Text selectable style={[typography.caption, { color: colors.textMuted, fontSize: 12 }]}>
          Best group {round.score.bestGroupSize}
          {modeId === "streak" ? `  ·  Misses ${round.score.misses}/3` : ""}
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {round.phase === "paused" ? (
          <>
            <View style={{ flex: 1 }}>
              <ActionButton
                label="Resume"
                accent={visual.accent}
                testID="gameplay-resume-button"
                onPress={resumeRound}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ActionLink href="/modes" label="Modes" accent={visual.secondary} />
            </View>
          </>
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <ActionButton
                label="Pause"
                tone="quiet"
                testID="gameplay-pause-button"
                onPress={pauseRound}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ActionButton
                label="Restart"
                tone="quiet"
                testID="gameplay-restart-button"
                onPress={restart}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ActionButton
                label="Finish"
                tone="quiet"
                testID="gameplay-finish-button"
                onPress={endRound}
              />
            </View>
          </>
        )}
      </View>
    </ScreenShell>
  );
}
