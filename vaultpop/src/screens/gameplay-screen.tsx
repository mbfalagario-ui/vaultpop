import { ActionButton } from "@/components/action-button";
import { ActionLink } from "@/components/action-link";
import { BoosterControl } from "@/components/booster-control";
import { CoinTile } from "@/components/coin-tile";
import { HudStat } from "@/components/hud-stat";
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
  spacing,
  typography
} from "@/theme";
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
          delay: 280,
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
        animateFeedback(modeId === "streak" ? "CHAIN LOST" : "TRY A GROUP");
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
          : `+${scoreDelta}  CHAIN ${projected.score.comboMultiplier}x`
      );
      void playHaptic(profile.settings.hapticsEnabled);

      const delay = profile.settings.reducedMotion ? 0 : 150;
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

  const useBooster = useCallback(
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
    outputRange: [0.78, 1]
  });

  return (
    <ScreenShell
      eyebrow={visual.name}
      title={round.phase === "paused" ? "Paused" : modeLabel}
      accent={visual.accent}
      compact
    >
      <View
        style={{
          backgroundColor: visual.surface,
          borderColor: `${visual.accent}88`,
          borderCurve: "continuous",
          borderRadius: 12,
          borderWidth: 1,
          flexDirection: "row",
          paddingVertical: spacing.md
        }}
      >
        <HudStat label="SCORE" value={round.score.current} accent={visual.energy} />
        <View style={{ backgroundColor: `${visual.accent}44`, width: 1 }} />
        <HudStat label="TIME" value={`${round.secondsRemaining}s`} accent={visual.secondary} />
        <View style={{ backgroundColor: `${visual.accent}44`, width: 1 }} />
        <HudStat
          label={modeId === "streak" ? "CHAIN" : "COMBO"}
          value={`${round.score.comboMultiplier}x`}
          accent={visual.accent}
        />
      </View>

      {modeId !== "streak" ? (
        <VaultMeter
          current={round.vaultMeter.current}
          max={round.vaultMeter.max}
          opening={round.vaultMeter.opening}
          accent={modeId === "classic" ? visual.accent : visual.secondary}
          label={modeId === "classic" ? "Reactor Charge" : "Prism Charge"}
        />
      ) : null}

      <View style={{ position: "relative" }}>
        <View
          style={{
            backgroundColor: visual.board,
            borderColor: `${visual.accent}77`,
            borderCurve: "continuous",
            borderRadius: modeId === "streak" ? 8 : 16,
            borderWidth: 1,
            boxShadow: `0 12px 34px ${cosmeticGlow.accent}30`,
            flexDirection: "row",
            overflow: "hidden",
            padding: modeId === "streak" ? 5 : 7
          }}
        >
          <View
            pointerEvents="none"
            style={{
              backgroundColor: cosmeticGlow.accent,
              height: 2,
              left: 12,
              opacity: 0.72,
              position: "absolute",
              right: 12,
              top: 0,
              zIndex: 2
            }}
          />
          <View
            style={{
              aspectRatio: 1,
              flex: 1,
              flexDirection: "row",
              flexWrap: "wrap"
            }}
          >
            {round.board.tiles.flat().map((tile) => (
              <CoinTile
                key={tile.id}
                modeId={modeId}
                onPress={() => handleTilePress(tile.row, tile.column)}
                reducedMotion={profile.settings.reducedMotion}
                selected={selectedIds.has(tile.id)}
                tile={tile}
              />
            ))}
          </View>
          {modeId === "streak" ? (
            <View
              style={{
                alignItems: "center",
                backgroundColor: "#020807",
                borderColor: `${visual.energy}66`,
                borderRadius: 999,
                borderWidth: 1,
                justifyContent: "flex-end",
                marginLeft: 5,
                overflow: "hidden",
                width: 14
              }}
            >
              <View
                style={{
                  backgroundColor: visual.energy,
                  boxShadow: `0 0 12px ${visual.energy}`,
                  height: `${Math.max(
                    3,
                    (round.vaultMeter.current / round.vaultMeter.max) * 100
                  )}%`,
                  width: "100%"
                }}
              />
            </View>
          ) : null}
        </View>

        {feedback ? (
          <Animated.View
            pointerEvents="none"
            style={{
              alignItems: "center",
              left: 0,
              opacity: feedbackMotion,
              position: "absolute",
              right: 0,
              top: "44%",
              transform: [{ scale: feedbackScale }]
            }}
          >
            <Text
              selectable={false}
              style={[
                typography.sectionTitle,
                {
                  backgroundColor: "#05060BDD",
                  borderColor: visual.accent,
                  borderRadius: 10,
                  borderWidth: 1,
                  boxShadow: `0 0 24px ${visual.accent}99`,
                  color: visual.energy,
                  fontSize: 22,
                  fontWeight: "900",
                  overflow: "hidden",
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm
                }
              ]}
            >
              {feedback}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      <View
        style={{
          backgroundColor: `${visual.surfaceRaised}CC`,
          borderColor: `${visual.accent}55`,
          borderCurve: "continuous",
          borderRadius: 12,
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
          onPress={() => useBooster("bonusLives")}
        />
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
          onPress={() => useBooster("chainBoosts")}
        />
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
          onPress={() => useBooster("vaultBursts")}
        />
      </View>

      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between"
        }}
      >
        <Text selectable style={[typography.caption, { color: visual.secondary, flex: 1 }]}>
          {round.lastEvent}
        </Text>
        <Text selectable style={[typography.caption, { color: colors.textMuted }]}>
          Best group {round.score.bestGroupSize}
          {modeId === "streak" ? `  •  Misses ${round.score.misses}/3` : ""}
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {round.phase === "paused" ? (
          <>
            <View style={{ flex: 1 }}>
              <ActionButton
                label="Resume"
                accent={visual.accent}
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
              <ActionButton label="Pause" tone="quiet" onPress={pauseRound} />
            </View>
            <View style={{ flex: 1 }}>
              <ActionButton label="Restart" tone="quiet" onPress={restart} />
            </View>
            <View style={{ flex: 1 }}>
              <ActionButton label="Finish" tone="quiet" onPress={endRound} />
            </View>
          </>
        )}
      </View>
    </ScreenShell>
  );
}
