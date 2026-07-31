import { ActionButton } from "@/components/action-button";
import { ActionLink } from "@/components/action-link";
import { playSfx } from "@/audio/sfx";
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
  beginRound,
  createInitialRound,
  finishRound,
  getConnectedGroup,
  resolveTap
} from "@/game/engine";
import type { GameModeId, RoundState } from "@/game/models";
import { PopParticles } from "@/components/pop-particles";
import { consumeBooster, type BoosterKind } from "@/monetization/economy";
import { hasPremiumThemeAccess } from "@/monetization/entitlements";
import { applyRoundResult, type DailyVaultSave } from "@/storage";
import { useSaveProfile } from "@/storage/use-save-profile";
import {
  colors,
  getModeHeading,
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
import { Animated, Text, useWindowDimensions, View } from "react-native";

function normalizeMode(value: unknown): GameModeId {
  return value === "dailyVault" || value === "streak" || value === "blitz" || value === "classic"
    ? value
    : "classic";
}

async function playHaptic(
  enabled: boolean,
  kind: "tick" | "medium" | "success" = "tick"
) {
  if (!enabled || process.env.EXPO_OS !== "ios") {
    return;
  }

  try {
    const Haptics = await import("expo-haptics");
    if (kind === "success") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (kind === "medium") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      await Haptics.selectionAsync();
    }
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
  const activeTheme = getVisualTheme(activeThemeId);
  const seed = useMemo(
    () => (modeId === "dailyVault" ? getDailySeed() : `${modeId}-${Date.now()}`),
    [modeId]
  );
  const [round, setRound] = useState<RoundState>(() =>
    createInitialRound(modeId, { seed, startPhase: "ready" })
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState("");
  const [boardWidth, setBoardWidth] = useState(0);
  const [countdown, setCountdown] = useState<number | "GO" | null>(null);
  const [burst, setBurst] = useState<{ key: number; color: string } | null>(null);
  const feedbackMotion = useRef(new Animated.Value(0)).current;
  const scorePulse = useRef(new Animated.Value(1)).current;
  const vaultFlash = useRef(new Animated.Value(0)).current;
  const countdownScale = useRef(new Animated.Value(1)).current;
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const inputLockedRef = useRef(false);
  const completedRoundRef = useRef<string | null>(null);
  const boostersFoundRef = useRef(0);
  const comboMilestoneRef = useRef(1);
  const settingsRef = useRef(profile.settings);

  useEffect(() => {
    settingsRef.current = profile.settings;
  }, [profile.settings]);

  // 3-2-1-GO start sequence: input and the timer stay blocked (phase
  // "ready") until GO. Ticks play a sound + haptic cue; GO gets a success
  // cue. Reduced Motion keeps the numbers static (no scale pulse).
  const runCountdown = useCallback(() => {
    countdownTimersRef.current.forEach(clearTimeout);
    countdownTimersRef.current = [];
    const steps: (number | "GO")[] = [3, 2, 1, "GO"];
    steps.forEach((step, index) => {
      countdownTimersRef.current.push(
        setTimeout(() => {
          setCountdown(step);
          if (!settingsRef.current.reducedMotion) {
            countdownScale.setValue(0.55);
            Animated.spring(countdownScale, {
              damping: 11,
              stiffness: 260,
              toValue: 1,
              useNativeDriver: true
            }).start();
          }
          if (step === "GO") {
            playSfx("zap", settingsRef.current.soundEnabled);
            void playHaptic(settingsRef.current.hapticsEnabled, "success");
            setRound((current) => beginRound(current));
            countdownTimersRef.current.push(
              setTimeout(() => setCountdown(null), 620)
            );
          } else {
            playSfx("thud", settingsRef.current.soundEnabled);
            void playHaptic(settingsRef.current.hapticsEnabled, "tick");
          }
        }, index * 700)
      );
    });
  }, [countdownScale]);

  const restart = useCallback(() => {
    const nextSeed =
      modeId === "dailyVault" ? getDailySeed() : `${modeId}-${Date.now()}`;
    completedRoundRef.current = null;
    inputLockedRef.current = false;
    boostersFoundRef.current = 0;
    comboMilestoneRef.current = 1;
    setSelectedIds(new Set());
    setFeedback("");
    setBurst(null);
    setRound(createInitialRound(modeId, { seed: nextSeed, startPhase: "ready" }));
    runCountdown();
  }, [modeId, runCountdown]);

  useEffect(() => {
    restart();
    return () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
      countdownTimersRef.current.forEach(clearTimeout);
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

  // Dopamine hooks: score pulse + vault-open gold flash.
  // Reduced Motion keeps both as gentler, opacity-first confirmations.
  useEffect(() => {
    if (round.score.current <= 0) {
      return;
    }
    if (profile.settings.reducedMotion) {
      scorePulse.setValue(1.06);
      Animated.timing(scorePulse, {
        duration: 220,
        toValue: 1,
        useNativeDriver: true
      }).start();
      return;
    }
    scorePulse.setValue(1.24);
    Animated.spring(scorePulse, {
      damping: 9,
      stiffness: 280,
      toValue: 1,
      useNativeDriver: true
    }).start();
  }, [profile.settings.reducedMotion, round.score.current, scorePulse]);

  useEffect(() => {
    if (!round.vaultMeter.opening) {
      return;
    }
    playSfx("chime", profile.settings.soundEnabled);
    // Opacity-only flash stays satisfying in Reduced Motion at lower strength.
    vaultFlash.setValue(profile.settings.reducedMotion ? 0.14 : 0.26);
    Animated.timing(vaultFlash, {
      duration: 550,
      toValue: 0,
      useNativeDriver: true
    }).start();
  }, [
    profile.settings.reducedMotion,
    profile.settings.soundEnabled,
    round.vaultMeter.opening,
    vaultFlash
  ]);

  // Hidden in-board booster reveals: celebratory feedback + cue. The effect
  // was already applied by the engine (round-only — inventory untouched).
  useEffect(() => {
    if (round.score.hiddenBoosters <= boostersFoundRef.current) {
      return;
    }
    boostersFoundRef.current = round.score.hiddenBoosters;
    const label =
      round.lastBooster === "bonusLives"
        ? "HIDDEN BOOSTER  +15 SEC"
        : round.lastBooster === "chainBoosts"
          ? "HIDDEN BOOSTER  CHAIN +2"
          : "HIDDEN VAULT BURST";
    animateFeedback(`★ ${label}`);
    playSfx("zap", settingsRef.current.soundEnabled);
    void playHaptic(settingsRef.current.hapticsEnabled, "medium");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.score.hiddenBoosters]);

  // Combo escalation milestones: x4 / x8 / x12 get their own moment.
  useEffect(() => {
    const combo = round.score.comboMultiplier;
    if (combo === 1) {
      comboMilestoneRef.current = 1;
      return;
    }
    const milestone = [12, 8, 4].find(
      (value) => combo >= value && comboMilestoneRef.current < value
    );
    if (!milestone) {
      return;
    }
    comboMilestoneRef.current = milestone;
    animateFeedback(
      milestone === 12 ? "MAX CHAIN x12!" : milestone === 8 ? "ON FIRE x8!" : "COMBO x4!"
    );
    playSfx("chime", settingsRef.current.soundEnabled);
    void playHaptic(settingsRef.current.hapticsEnabled, "medium");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.score.comboMultiplier]);

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
        vaults: String(round.score.vaultBonuses),
        boosters: String(round.score.hiddenBoosters),
        misses: String(round.score.misses)
      }
    });
  }, [profile.dailyVault?.bestScore, round, setProfile]);

  const animateFeedback = useCallback(
    (text: string) => {
      setFeedback(text);
      if (profile.settings.reducedMotion) {
        // Fade-only feedback: no scale spring, same information.
        feedbackMotion.setValue(1);
        Animated.sequence([
          Animated.delay(620),
          Animated.timing(feedbackMotion, {
            duration: 200,
            toValue: 0,
            useNativeDriver: true
          })
        ]).start();
        return;
      }
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
    [feedbackMotion, profile.settings.reducedMotion]
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
        playSfx("thud", profile.settings.soundEnabled);
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
      if (!profile.settings.reducedMotion) {
        const tileType = round.board.tiles[row]?.[column]?.type ?? "gold";
        setBurst({ key: Date.now(), color: activeTheme.tileGradients[tileType][1] });
      }
      animateFeedback(
        projected.vaultMeter.opening
          ? `VAULT OPEN +${scoreDelta}`
          : `+${scoreDelta}  ·  ${projected.score.comboMultiplier}x`
      );
      playSfx("pop", profile.settings.soundEnabled);
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
      activeTheme,
      animateFeedback,
      modeId,
      profile.settings.hapticsEnabled,
      profile.settings.reducedMotion,
      profile.settings.soundEnabled,
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
      playSfx("zap", profile.settings.soundEnabled);
      void playHaptic(profile.settings.hapticsEnabled);
    },
    [
      animateFeedback,
      profile.economy.boosters,
      profile.settings.hapticsEnabled,
      profile.settings.soundEnabled,
      round.phase,
      setProfile
    ]
  );

  const feedbackScale = feedbackMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1]
  });
  // Floating-score rise: the feedback chip drifts upward as it appears.
  const feedbackRise = feedbackMotion.interpolate({
    inputRange: [0, 1],
    outputRange: profile.settings.reducedMotion ? [0, 0] : [12, -6]
  });
  const tileSize = boardWidth > 0 ? boardWidth / 8 : 0;
  const lowTime = round.secondsRemaining <= 10;
  const combo = round.score.comboMultiplier;
  const comboColor = combo >= 8 ? colors.ruby : combo >= 4 ? colors.gold : visual.accent;
  const window = useWindowDimensions();
  // Keep the whole gameplay column on one screen: cap the board by the
  // height left after header, HUD, meter, boosters, status, and buttons.
  const boardSide = Math.max(
    260,
    Math.min(window.width - spacing.md * 2, window.height - 500)
  );

  return (
    <ScreenShell
      title={round.phase === "paused" ? "Paused" : getModeHeading(modeId)}
      accent={visual.accent}
      compact
      inlineHeader
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

        <View
          style={{
            alignItems: "center",
            flex: 1,
            minWidth: 0,
            paddingHorizontal: spacing.sm
          }}
          testID="hud-score"
        >
          <Animated.Text
            selectable={false}
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.55}
            style={[
              typography.numeral,
              {
                color: visual.energy,
                fontSize: 34,
                textAlign: "center",
                textShadowColor: `${visual.energy}55`,
                textShadowOffset: { height: 0, width: 0 },
                textShadowRadius: 16,
                transform: [{ scale: scorePulse }],
                width: "100%"
              }
            ]}
          >
            {round.score.current.toLocaleString()}
          </Animated.Text>
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
            borderColor: combo > 1 ? comboColor : colors.border,
            borderRadius: radius.pill,
            borderWidth: 1,
            boxShadow:
              combo > 1 ? `0 0 ${combo >= 4 ? 22 : 14}px ${comboColor}77` : undefined,
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
                color: combo > 1 ? comboColor : colors.textSecondary,
                fontSize: 18
              }
            ]}
          >
            {combo}x
          </Text>
          <Text
            selectable={false}
            style={[typography.eyebrow, { color: combo >= 4 ? comboColor : colors.textMuted, fontSize: 8.5 }]}
          >
            {combo >= 8 ? "ON FIRE" : modeId === "streak" ? "CHAIN" : "COMBO"}
          </Text>
        </View>
      </View>

      <VaultMeter
        current={round.vaultMeter.current}
        max={round.vaultMeter.max}
        opening={round.vaultMeter.opening}
        accent={modeId === "classic" ? visual.accent : visual.secondary}
        label={
          modeId === "streak"
            ? "Chain Core"
            : modeId === "classic"
              ? "Reactor Core"
              : modeId === "blitz"
                ? "Blitz Core"
                : "Prism Core"
        }
      />

      {/* Feedback lane — reserved strip so score pop-ups never cover gameplay */}
      <View
        testID="gameplay-feedback-lane"
        style={{ alignItems: "center", height: 36, justifyContent: "center", marginVertical: -4 }}
      >
        {feedback ? (
          <Animated.View
            style={{
              opacity: feedbackMotion,
              pointerEvents: "none",
              transform: [{ scale: feedbackScale }, { translateY: feedbackRise }]
            }}
          >
            <View
              style={{
                backgroundColor: "#05040FF2",
                borderColor: `${visual.accent}AA`,
                borderRadius: radius.pill,
                borderWidth: 1.5,
                boxShadow: `0 0 20px ${visual.accent}55`,
                paddingHorizontal: spacing.md,
                paddingVertical: 5
              }}
            >
              <Text
                selectable={false}
                style={{
                  color: visual.energy,
                  fontSize: 17,
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

      {/* Board — surface, border, tiles, and selection ring all come from the
          active customization style */}
      <View style={{ alignSelf: "center", maxWidth: boardSide, position: "relative", width: "100%" }}>
        <LinearGradient
          colors={[activeTheme.boardColors[0], activeTheme.boardColors[1]]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            borderColor: `${activeTheme.boardBorder}55`,
            borderCurve: "continuous",
            borderRadius: radius.lg,
            borderWidth: 1,
            boxShadow: `0 22px 44px #000000AA, 0 0 34px ${activeTheme.accent}30`,
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
                  theme={activeTheme}
                  tile={tile}
                />
              ))}
            </View>
          </View>
          {/* Tile-clear particle burst */}
          {burst && !profile.settings.reducedMotion ? (
            <PopParticles key={burst.key} color={burst.color} />
          ) : null}
          {/* Vault-open gold flash */}
          <Animated.View
            pointerEvents="none"
            style={{
              backgroundColor: colors.gold,
              borderRadius: radius.lg,
              bottom: 0,
              left: 0,
              opacity: vaultFlash,
              position: "absolute",
              right: 0,
              top: 0
            }}
          />
          {/* 3-2-1-GO countdown overlay: blocks nothing itself (input is
              already phase-gated) but visually holds the round until GO */}
          {countdown !== null ? (
            <View
              pointerEvents="none"
              testID="gameplay-countdown"
              style={{
                alignItems: "center",
                backgroundColor: "#05040FB0",
                borderRadius: radius.lg,
                bottom: 0,
                gap: 4,
                justifyContent: "center",
                left: 0,
                position: "absolute",
                right: 0,
                top: 0,
                zIndex: 8
              }}
            >
              <Animated.Text
                selectable={false}
                style={{
                  color: countdown === "GO" ? visual.energy : colors.textPrimary,
                  fontSize: countdown === "GO" ? 58 : 76,
                  fontStyle: "italic",
                  fontVariant: ["tabular-nums"],
                  fontWeight: "900",
                  textShadowColor:
                    countdown === "GO" ? `${visual.energy}88` : `${visual.accent}66`,
                  textShadowOffset: { height: 0, width: 0 },
                  textShadowRadius: 26,
                  transform: [{ scale: countdownScale }]
                }}
              >
                {countdown === "GO" ? "GO!" : countdown}
              </Animated.Text>
              <Text
                selectable={false}
                style={[typography.eyebrow, { color: visual.secondary, fontSize: 10, letterSpacing: 3 }]}
              >
                {countdown === "GO" ? "POP EVERYTHING" : "GET READY"}
              </Text>
            </View>
          ) : null}
        </LinearGradient>
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
            <View style={{ flex: 1 }}>
              <ActionLink href="/" label="Home" accent={visual.energy} testID="gameplay-home-link" />
            </View>
          </>
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <ActionButton
                label="Pause"
                tone="quiet"
                disabled={round.phase === "ready"}
                testID="gameplay-pause-button"
                onPress={pauseRound}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ActionButton
                label="Restart"
                tone="quiet"
                disabled={round.phase === "ready"}
                testID="gameplay-restart-button"
                onPress={restart}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ActionButton
                label="Finish"
                tone="quiet"
                disabled={round.phase === "ready"}
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
