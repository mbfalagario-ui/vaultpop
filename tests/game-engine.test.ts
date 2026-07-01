import assert from "node:assert/strict";
import test from "node:test";

import { getDailySeed } from "../src/game/daily-seed";
import {
  advanceTimer,
  calculateClearScore,
  calculateVaultDelta,
  createBoard,
  createInitialRound,
  getConnectedGroup,
  resolveTap
} from "../src/game/engine";
import type { BoardState, BoardTile, TileType } from "../src/game/models";
import {
  applyRoundResult,
  createDefaultSaveProfile,
  normalizeSaveProfile,
  unlockTheme,
  updateSettings
} from "../src/storage/save-model";

function tile(type: TileType, row: number, column: number): BoardTile {
  return {
    id: `${row}-${column}-${type}`,
    row,
    column,
    type,
    selected: false
  };
}

function boardFromTypes(types: TileType[][]): BoardState {
  return {
    size: 8,
    seed: "test-board",
    turn: 0,
    tiles: types.map((row, rowIndex) =>
      row.map((type, columnIndex) => tile(type, rowIndex, columnIndex))
    )
  };
}

const mixedBoard = boardFromTypes([
  ["gold", "gold", "cyan", "emerald", "violet", "ruby", "gold", "cyan"],
  ["gold", "cyan", "cyan", "emerald", "violet", "ruby", "gold", "cyan"],
  ["ruby", "ruby", "cyan", "emerald", "gold", "gold", "gold", "cyan"],
  ["violet", "ruby", "emerald", "emerald", "cyan", "violet", "ruby", "ruby"],
  ["violet", "violet", "emerald", "gold", "cyan", "cyan", "ruby", "gold"],
  ["gold", "violet", "ruby", "gold", "gold", "cyan", "emerald", "emerald"],
  ["gold", "cyan", "ruby", "violet", "gold", "cyan", "emerald", "violet"],
  ["cyan", "cyan", "ruby", "violet", "violet", "cyan", "emerald", "violet"]
]);

test("connected-group detection returns orthogonal matches only", () => {
  const group = getConnectedGroup(mixedBoard, { row: 0, column: 0 });
  assert.deepEqual(
    group
      .map((position) => `${position.row}:${position.column}`)
      .sort(),
    ["0:0", "0:1", "1:0"]
  );

  const cyanGroup = getConnectedGroup(mixedBoard, { row: 0, column: 2 });
  assert.equal(cyanGroup.length, 4);
});

test("scoring grows with group size, combo multiplier, and mode", () => {
  assert.equal(calculateClearScore(3, 1, "classic"), 90);
  assert.equal(calculateClearScore(3, 2, "classic"), 180);
  assert.ok(calculateClearScore(3, 2, "streak") > calculateClearScore(3, 2, "classic"));
});

test("vault meter fills and triggers a board-clearing bonus", () => {
  const round = createInitialRound("classic", {
    now: new Date("2026-06-26T12:00:00.000Z"),
    seed: "vault-test"
  });
  const almostFull = {
    ...round,
    board: mixedBoard,
    vaultMeter: {
      ...round.vaultMeter,
      current: 98
    }
  };

  const resolved = resolveTap(almostFull, { row: 0, column: 0 });
  assert.equal(resolved.vaultMeter.current, 0);
  assert.equal(resolved.score.vaultBonuses, 1);
  assert.ok(resolved.score.current > calculateClearScore(3, 1, "classic"));
});

test("daily seed is deterministic for a local date", () => {
  const date = new Date("2026-06-26T15:30:00.000Z");
  assert.equal(getDailySeed(date), getDailySeed(date));
  assert.notEqual(getDailySeed(date), getDailySeed(new Date("2026-06-27T15:30:00.000Z")));
});

test("board generation is deterministic for a seed", () => {
  const first = createBoard("same-seed");
  const second = createBoard("same-seed");
  assert.deepEqual(
    first.tiles.map((row) => row.map((tileItem) => tileItem.type)),
    second.tiles.map((row) => row.map((tileItem) => tileItem.type))
  );
});

test("timer ends the round at zero", () => {
  const round = createInitialRound("classic", {
    now: new Date("2026-06-26T12:00:00.000Z"),
    seed: "timer-test"
  });
  const finished = advanceTimer(round, 60, new Date("2026-06-26T12:01:00.000Z"));
  assert.equal(finished.phase, "complete");
  assert.equal(finished.secondsRemaining, 0);
});

test("timer does not tick while paused", () => {
  const round = createInitialRound("classic", {
    now: new Date("2026-06-26T12:00:00.000Z"),
    seed: "paused-timer-test"
  });
  const paused = {
    ...round,
    phase: "paused" as const
  };
  const nextRound = advanceTimer(paused, 10);
  assert.equal(nextRound.secondsRemaining, 60);
  assert.equal(nextRound.phase, "paused");
});

test("local save model normalizes, scores, settings, and cosmetic unlocks", () => {
  const profile = createDefaultSaveProfile(new Date("2026-06-26T12:00:00.000Z"));
  const normalized = normalizeSaveProfile({ highScores: { classic: 100 } });
  assert.equal(normalized.highScores.classic, 100);
  assert.equal(normalized.highScores.dailyVault, 0);

  const afterRound = applyRoundResult(profile, "classic", 1250);
  assert.equal(afterRound.highScores.classic, 1250);
  assert.equal(afterRound.cosmetics.fictionalPoints, 5);

  const changedSettings = updateSettings(afterRound, { soundEnabled: false });
  assert.equal(changedSettings.settings.soundEnabled, false);

  const unlocked = unlockTheme(
    {
      ...changedSettings,
      cosmetics: {
        ...changedSettings.cosmetics,
        fictionalPoints: 30
      }
    },
    "cyan-circuit",
    12
  );
  assert.equal(unlocked.cosmetics.activeThemeId, "cyan-circuit");
  assert.ok(unlocked.cosmetics.unlockedThemeIds.includes("cyan-circuit"));
});
