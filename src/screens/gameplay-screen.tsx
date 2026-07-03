import { ActionButton } from "@/components/action-button";
import { ActionLink } from "@/components/action-link";
import { CoinTile } from "@/components/coin-tile";
import { MetricCard } from "@/components/metric-card";
import { ScreenShell } from "@/components/screen-shell";
import { VaultMeter } from "@/components/vault-meter";
import { BOARD_SIZE } from "@/game/constants";
import { getDailySeed, getLocalDateKey } from "@/game/daily-seed";
import {
  advanceTimer,
  applyBonusLife,
  applyChainBoost,
  applyVaultBurst,
  createInitialRound,
  finishRound,
  resolveTap
} from "@/game/engine";
import type { GameModeId, RoundState } from "@/game/models";
import { consumeBooster, type BoosterKind } from "@/monetization/economy";
import { applyRoundResult, type DailyVaultSave } from "@/storage";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, getVisualTheme, spacing, typography } from "@/theme";
import { hasPremiumThemeAccess } from "@/monetization/entitlements";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";

function normalizeMode(value: unknown): GameModeId {
  return value === "dailyVault" || value === "streak" || value === "classic" ? value : "classic";
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
  const [profile, setProfile] = useSaveProfile();
  const activeThemeId =
    profile.cosmetics.activeThemeId === "vaultpass-prism" &&
    !hasPremiumThemeAccess(profile)
      ? "midnight-vault"
      : profile.cosmetics.activeThemeId;
  const visualTheme = getVisualTheme(activeThemeId);
  const seed = useMemo(
    () => (modeId === "dailyVault" ? getDailySeed() : `${modeId}-${Date.now()}`),
    [modeId]
  );
  const [round, setRound] = useState<RoundState>(() => createInitialRound(modeId, { seed }));
  const completedRoundRef = useRef<string | null>(null);

  const restart = useCallback(() => {
    const nextSeed = modeId === "dailyVault" ? getDailySeed() : `${modeId}-${Date.now()}`;
    completedRoundRef.current = null;
    setRound(createInitialRound(modeId, { seed: nextSeed }));
  }, [modeId]);

  useEffect(() => {
    restart();
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
    if (round.phase !== "complete" || completedRoundRef.current === round.completedAt) {
      return;
    }

    completedRoundRef.current = round.completedAt ?? "complete";
    const dailySave: DailyVaultSave | null =
      round.modeId === "dailyVault"
        ? {
            dateKey: getLocalDateKey(),
            seed: getDailySeed(),
            played: true,
            bestScore: Math.max(profile.dailyVault?.bestScore ?? 0, round.score.current)
          }
        : null;

    setProfile((currentProfile) =>
      applyRoundResult(currentProfile, round.modeId, round.score.current, dailySave)
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

  const handleTilePress = useCallback(
    (row: number, column: number) => {
      setRound((currentRound) => {
        const nextRound = resolveTap(currentRound, { row, column });
        if (nextRound !== currentRound) {
          void playHaptic(profile.settings.hapticsEnabled);
        }
        return nextRound;
      });
    },
    [profile.settings.hapticsEnabled]
  );

  const endRound = useCallback(() => {
    setRound((currentRound) => finishRound(currentRound));
  }, []);

  const pauseRound = useCallback(() => {
    setRound((currentRound) =>
      currentRound.phase === "playing"
        ? {
            ...currentRound,
            phase: "paused",
            lastEvent: "Paused"
          }
        : currentRound
    );
  }, []);

  const resumeRound = useCallback(() => {
    setRound((currentRound) =>
      currentRound.phase === "paused"
        ? {
            ...currentRound,
            phase: "playing",
            lastEvent: "Round resumed"
          }
        : currentRound
    );
  }, []);

  const useBooster = useCallback(
    (booster: BoosterKind) => {
      if (round.phase !== "playing" || profile.economy.boosters[booster] <= 0) {
        return;
      }
      setRound((currentRound) =>
        booster === "bonusLives"
          ? applyBonusLife(currentRound)
          : booster === "chainBoosts"
            ? applyChainBoost(currentRound)
            : applyVaultBurst(currentRound)
      );
      setProfile((currentProfile) => consumeBooster(currentProfile, booster));
      void playHaptic(profile.settings.hapticsEnabled);
    },
    [
      profile.economy.boosters,
      profile.settings.hapticsEnabled,
      round.phase,
      setProfile
    ]
  );

  const modeLabel =
    modeId === "dailyVault" ? "Daily Vault" : modeId === "streak" ? "Streak Mode" : "Classic Mode";

  return (
    <ScreenShell
      title={round.phase === "paused" ? "Paused" : modeLabel}
      lead={
        round.phase === "paused"
          ? "Resume this round or choose another destination."
          : "Tap 2 or more connected matching coin tiles."
      }
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <MetricCard label="Score" value={round.score.current} accent={colors.gold} />
        <MetricCard label="Time" value={`${round.secondsRemaining}s`} accent={colors.cyan} />
        <MetricCard label="Combo" value={`${round.score.comboMultiplier}x`} accent={colors.emerald} />
      </View>
      <VaultMeter
        current={round.vaultMeter.current}
        max={round.vaultMeter.max}
        opening={round.vaultMeter.opening}
      />
      <View
        style={{
          aspectRatio: 1,
          backgroundColor: visualTheme.glow,
          borderColor: visualTheme.accent,
          borderRadius: 8,
          borderWidth: 1,
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 0,
          padding: spacing.sm
        }}
      >
        {round.board.tiles.flat().map((tile) => (
          <CoinTile key={tile.id} tile={tile} onPress={() => handleTilePress(tile.row, tile.column)} />
        ))}
      </View>
      <View style={{ gap: spacing.sm }}>
        <Text selectable style={typography.sectionTitle}>
          Boosters
        </Text>
        <ActionButton
          label={`Bonus Life (${profile.economy.boosters.bonusLives})`}
          detail="Add 15 seconds to the current round."
          disabled={
            round.phase !== "playing" || profile.economy.boosters.bonusLives <= 0
          }
          onPress={() => useBooster("bonusLives")}
        />
        <ActionButton
          label={`Chain Boost (${profile.economy.boosters.chainBoosts})`}
          detail="Raise the current combo by 2x."
          disabled={
            round.phase !== "playing" || profile.economy.boosters.chainBoosts <= 0
          }
          onPress={() => useBooster("chainBoosts")}
        />
        <ActionButton
          label={`Vault Burst (${profile.economy.boosters.vaultBursts})`}
          detail="Open the vault immediately and refresh the board."
          disabled={
            round.phase !== "playing" || profile.economy.boosters.vaultBursts <= 0
          }
          onPress={() => useBooster("vaultBursts")}
        />
      </View>
      <View
        style={{
          backgroundColor: colors.surfaceRaised,
          borderRadius: 8,
          gap: spacing.xs,
          padding: spacing.md
        }}
      >
        <Text selectable style={typography.sectionTitle}>
          {round.lastEvent}
        </Text>
        <Text selectable style={typography.body}>
          {BOARD_SIZE} x {BOARD_SIZE} board. Best group: {round.score.bestGroupSize}. Streak:{" "}
          {round.score.streakCount}. Misses: {round.score.misses}
        </Text>
      </View>
      <View style={{ gap: spacing.sm }}>
        {round.phase === "paused" ? (
          <>
            <ActionButton label="Resume" detail="Continue this round." onPress={resumeRound} />
            <ActionLink href="/settings" label="Settings" />
            <ActionLink href="/modes" label="Mode Select" />
          </>
        ) : (
          <>
            <ActionButton label="Pause" detail="Stop the timer until resumed." onPress={pauseRound} />
            <ActionButton label="Restart" detail="Start this mode again." onPress={restart} />
            <ActionButton label="End Round" tone="quiet" onPress={endRound} />
          </>
        )}
      </View>
    </ScreenShell>
  );
}
