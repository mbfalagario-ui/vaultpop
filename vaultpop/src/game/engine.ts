import {
  BOARD_SIZE,
  CLASSIC_ROUND_SECONDS,
  MIN_GROUP_SIZE,
  TILE_TYPES,
  VAULT_METER_MAX
} from "@/game/constants";
import { getDailySeed } from "@/game/daily-seed";
import { getModeDefinition } from "@/game/modes";
import type {
  BoardPosition,
  BoardState,
  BoardTile,
  ClearResult,
  GameModeId,
  RoundState,
  TileType
} from "@/game/models";

type CreateRoundOptions = {
  now?: Date;
  seed?: string;
};

function stringToSeedNumber(value: string): number {
  let total = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    total ^= value.charCodeAt(index);
    total = Math.imul(total, 16777619);
  }
  return total >>> 0;
}

function createRandom(seed: string) {
  let state = stringToSeedNumber(seed);
  return () => {
    state += 0x6d2b79f5;
    let result = state;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function createBoard(seed: string, turn = 0): BoardState {
  const random = createRandom(`${seed}:${turn}`);
  const tiles: BoardTile[][] = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    const line: BoardTile[] = [];
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      const type = TILE_TYPES[Math.floor(random() * TILE_TYPES.length)] ?? TILE_TYPES[0];
      line.push({
        id: `${turn}-${row}-${column}-${type}`,
        row,
        column,
        type,
        selected: false
      });
    }
    tiles.push(line);
  }

  return {
    size: BOARD_SIZE,
    seed,
    tiles,
    turn
  };
}

export function createInitialRound(modeId: GameModeId, options: CreateRoundOptions = {}): RoundState {
  const now = options.now ?? new Date();
  const seed =
    options.seed ??
    (modeId === "dailyVault" ? getDailySeed(now) : `${modeId}-${now.toISOString()}`);

  return {
    modeId,
    phase: "playing",
    board: createBoard(seed),
    score: {
      current: 0,
      comboMultiplier: 1,
      streakCount: 0,
      bestGroupSize: 0,
      vaultBonuses: 0,
      misses: 0
    },
    vaultMeter: {
      current: 0,
      max: VAULT_METER_MAX,
      opening: false
    },
    secondsRemaining: getModeDefinition(modeId)?.roundSeconds ?? CLASSIC_ROUND_SECONDS,
    startedAt: now.toISOString(),
    completedAt: null,
    lastEvent: "Ready"
  };
}

function isInsideBoard(board: BoardState, position: BoardPosition): boolean {
  return (
    position.row >= 0 &&
    position.column >= 0 &&
    position.row < board.size &&
    position.column < board.size
  );
}

function getTile(board: BoardState, position: BoardPosition): BoardTile | null {
  if (!isInsideBoard(board, position)) {
    return null;
  }
  return board.tiles[position.row]?.[position.column] ?? null;
}

export function getConnectedGroup(board: BoardState, start: BoardPosition): BoardPosition[] {
  const startTile = getTile(board, start);
  if (!startTile) {
    return [];
  }

  const visited = new Set<string>();
  const group: BoardPosition[] = [];
  const queue: BoardPosition[] = [start];

  while (queue.length > 0) {
    const position = queue.shift();
    if (!position) {
      continue;
    }

    const key = `${position.row}:${position.column}`;
    if (visited.has(key)) {
      continue;
    }
    visited.add(key);

    const tile = getTile(board, position);
    if (!tile || tile.type !== startTile.type) {
      continue;
    }

    group.push(position);
    queue.push(
      { row: position.row - 1, column: position.column },
      { row: position.row + 1, column: position.column },
      { row: position.row, column: position.column - 1 },
      { row: position.row, column: position.column + 1 }
    );
  }

  return group;
}

export function calculateClearScore(
  groupSize: number,
  comboMultiplier: number,
  modeId: GameModeId
): number {
  const base = groupSize * groupSize * 10;
  const streakBonus = modeId === "streak" ? groupSize * comboMultiplier * 8 : 0;
  const dailyBonus = modeId === "dailyVault" ? groupSize * 5 : 0;
  return base * comboMultiplier + streakBonus + dailyBonus;
}

export function calculateVaultDelta(groupSize: number, comboMultiplier: number): number {
  return Math.min(VAULT_METER_MAX, groupSize * 6 + comboMultiplier * 4);
}

function refillBoard(board: BoardState, removed: BoardPosition[]): BoardState {
  const removedKeys = new Set(removed.map((position) => `${position.row}:${position.column}`));
  const nextTurn = board.turn + 1;
  const random = createRandom(`${board.seed}:refill:${nextTurn}`);
  const nextTiles: BoardTile[][] = Array.from({ length: board.size }, () => []);

  for (let column = 0; column < board.size; column += 1) {
    const remaining: TileType[] = [];

    for (let row = board.size - 1; row >= 0; row -= 1) {
      const tile = board.tiles[row]?.[column];
      if (tile && !removedKeys.has(`${row}:${column}`)) {
        remaining.push(tile.type);
      }
    }

    while (remaining.length < board.size) {
      const type = TILE_TYPES[Math.floor(random() * TILE_TYPES.length)] ?? TILE_TYPES[0];
      remaining.push(type);
    }

    for (let row = board.size - 1; row >= 0; row -= 1) {
      const type = remaining[board.size - 1 - row] ?? TILE_TYPES[0];
      nextTiles[row]![column] = {
        id: `${nextTurn}-${row}-${column}-${type}`,
        row,
        column,
        type,
        selected: false
      };
    }
  }

  return {
    ...board,
    tiles: nextTiles,
    turn: nextTurn
  };
}

function refillWholeBoard(board: BoardState): BoardState {
  return createBoard(board.seed, board.turn + 1);
}

export function resolveTap(round: RoundState, position: BoardPosition): RoundState {
  if (round.phase !== "playing") {
    return round;
  }

  const group = getConnectedGroup(round.board, position);
  if (group.length < MIN_GROUP_SIZE) {
    const misses = round.score.misses + 1;
    const streakEnded = round.modeId === "streak" && misses >= 3;
    return {
      ...round,
      phase: streakEnded ? "complete" : round.phase,
      completedAt: streakEnded ? new Date().toISOString() : round.completedAt,
      score: {
        ...round.score,
        comboMultiplier: 1,
        streakCount: 0,
        misses
      },
      lastEvent: streakEnded ? "Streak ended" : "Choose a larger matching group"
    };
  }

  const scoreDelta = calculateClearScore(
    group.length,
    round.score.comboMultiplier,
    round.modeId
  );
  const vaultDelta = calculateVaultDelta(group.length, round.score.comboMultiplier);
  const nextVaultValue = round.vaultMeter.current + vaultDelta;
  const vaultTriggered = nextVaultValue >= round.vaultMeter.max;
  const clearedTileIds = group
    .map((groupPosition) => getTile(round.board, groupPosition)?.id)
    .filter((id): id is string => Boolean(id));
  const boardAfterClear = refillBoard(round.board, group);
  const boardAfterVault = vaultTriggered ? refillWholeBoard(boardAfterClear) : boardAfterClear;
  const vaultScore = vaultTriggered ? 750 * round.score.comboMultiplier : 0;
  const nextComboMultiplier = Math.min(round.score.comboMultiplier + 1, 12);
  const result: ClearResult = {
    clearedTileIds,
    groupSize: group.length,
    scoreDelta: scoreDelta + vaultScore,
    vaultDelta,
    nextComboMultiplier,
    vaultTriggered
  };

  return {
    ...round,
    board: boardAfterVault,
    score: {
      current: round.score.current + result.scoreDelta,
      comboMultiplier: result.nextComboMultiplier,
      streakCount: round.score.streakCount + 1,
      bestGroupSize: Math.max(round.score.bestGroupSize, group.length),
      vaultBonuses: round.score.vaultBonuses + (vaultTriggered ? 1 : 0),
      misses: round.score.misses
    },
    vaultMeter: {
      ...round.vaultMeter,
      current: vaultTriggered ? 0 : nextVaultValue,
      opening: vaultTriggered
    },
    lastEvent: vaultTriggered
      ? `Vault bonus +${vaultScore}`
      : `Cleared ${group.length} coin tiles`
  };
}

export function advanceTimer(round: RoundState, seconds = 1, now = new Date()): RoundState {
  if (round.phase !== "playing") {
    return round;
  }

  const secondsRemaining = Math.max(0, round.secondsRemaining - seconds);
  return {
    ...round,
    phase: secondsRemaining === 0 ? "complete" : round.phase,
    secondsRemaining,
    completedAt: secondsRemaining === 0 ? now.toISOString() : round.completedAt,
    lastEvent: secondsRemaining === 0 ? "Round complete" : round.lastEvent
  };
}

export function finishRound(round: RoundState, now = new Date()): RoundState {
  return {
    ...round,
    phase: "complete",
    secondsRemaining: 0,
    completedAt: round.completedAt ?? now.toISOString(),
    lastEvent: "Round complete"
  };
}

export function applyBonusLife(round: RoundState): RoundState {
  if (round.phase !== "playing") {
    return round;
  }
  return {
    ...round,
    secondsRemaining: Math.min(99, round.secondsRemaining + 15),
    lastEvent: "Bonus Life added 15 seconds"
  };
}

export function applyChainBoost(round: RoundState): RoundState {
  if (round.phase !== "playing") {
    return round;
  }
  return {
    ...round,
    score: {
      ...round.score,
      comboMultiplier: Math.min(12, round.score.comboMultiplier + 2)
    },
    lastEvent: "Chain Boost raised the combo"
  };
}

export function applyVaultBurst(round: RoundState): RoundState {
  if (round.phase !== "playing") {
    return round;
  }
  const scoreDelta = 750 * round.score.comboMultiplier;
  return {
    ...round,
    board: refillWholeBoard(round.board),
    score: {
      ...round.score,
      current: round.score.current + scoreDelta,
      vaultBonuses: round.score.vaultBonuses + 1
    },
    vaultMeter: {
      ...round.vaultMeter,
      current: 0,
      opening: true
    },
    lastEvent: `Vault Burst +${scoreDelta}`
  };
}
