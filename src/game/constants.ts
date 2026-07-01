import type { GameModeDefinition, TileType } from "@/game/models";

export const BOARD_SIZE = 8;
export const MIN_GROUP_SIZE = 2;
export const CLASSIC_ROUND_SECONDS = 60;
export const VAULT_METER_MAX = 100;

export const TILE_TYPES: TileType[] = [
  "gold",
  "cyan",
  "emerald",
  "violet",
  "ruby"
];

export const GAME_MODES: GameModeDefinition[] = [
  {
    id: "classic",
    title: "Classic Mode",
    summary: "60-second arcade score attack with fast restarts.",
    roundSeconds: CLASSIC_ROUND_SECONDS
  },
  {
    id: "dailyVault",
    title: "Daily Vault",
    summary: "A deterministic daily board seed saved locally.",
    roundSeconds: CLASSIC_ROUND_SECONDS
  },
  {
    id: "streak",
    title: "Streak Mode",
    summary: "Combo-focused mode with three misses before the run ends.",
    roundSeconds: CLASSIC_ROUND_SECONDS
  }
];
