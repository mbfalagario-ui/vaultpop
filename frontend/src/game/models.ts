export type TileType = "gold" | "cyan" | "emerald" | "violet" | "ruby";

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
};

export type ClearResult = {
  clearedTileIds: string[];
  groupSize: number;
  scoreDelta: number;
  vaultDelta: number;
  nextComboMultiplier: number;
  vaultTriggered: boolean;
};
