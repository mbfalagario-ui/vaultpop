export type TileType = "gold" | "cyan" | "emerald" | "violet" | "ruby";

/**
 * Hidden in-board booster kinds. They reuse the existing booster mechanics
 * (Bonus Life = +15s, Chain Boost = combo +2, Vault Burst = 750 x combo +
 * board refresh) but apply ONLY to the active round — they never touch the
 * player's persistent booster inventory.
 */
export type HiddenBoosterType = "bonusLives" | "chainBoosts" | "vaultBursts";

export type GameModeId = "classic" | "dailyVault" | "streak" | "blitz";

export type GameModeDefinition = {
  id: GameModeId;
  title: string;
  summary: string;
  roundSeconds: number;
};

export type BoardPosition = {
  row: number;
  column: number;
};

export type BoardTile = BoardPosition & {
  id: string;
  type: TileType;
  selected: boolean;
  /** Hidden until the tile is cleared as part of a matching group. */
  booster?: HiddenBoosterType;
};

export type BoardState = {
  size: 8;
  tiles: BoardTile[][];
  seed: string;
  turn: number;
};

export type ScoreState = {
  current: number;
  comboMultiplier: number;
  streakCount: number;
  bestGroupSize: number;
  vaultBonuses: number;
  misses: number;
  /** Hidden in-board boosters revealed this round. */
  hiddenBoosters: number;
};

export type VaultMeterState = {
  current: number;
  max: number;
  opening: boolean;
};

export type RoundPhase = "ready" | "playing" | "paused" | "vaultBonus" | "complete";

export type RoundState = {
  modeId: GameModeId;
  phase: RoundPhase;
  board: BoardState;
  score: ScoreState;
  vaultMeter: VaultMeterState;
  secondsRemaining: number;
  startedAt: string;
  completedAt: string | null;
  lastEvent: string;
  /** Most recently revealed hidden booster (for UI feedback). */
  lastBooster: HiddenBoosterType | null;
};

export type ClearResult = {
  clearedTileIds: string[];
  groupSize: number;
  scoreDelta: number;
  vaultDelta: number;
  nextComboMultiplier: number;
  vaultTriggered: boolean;
};
