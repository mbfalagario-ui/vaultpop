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
    summary: "Race the clock and stack explosive combos.",
    roundSeconds: CLASSIC_ROUND_SECONDS
  },
  {
    id: "dailyVault",
    title: "Daily Vault",
    summary: "One board per day. Make every chain count.",
    roundSeconds: CLASSIC_ROUND_SECONDS
  },
  {
    id: "streak",
    title: "Streak Mode",
    summary: "Three misses. Protect the chain.",
    roundSeconds: CLASSIC_ROUND_SECONDS
  },
  {
    id: "blitz",
    title: "Blitz Mode",
    summary: "30 second speed run. Pop fast, score faster.",
    roundSeconds: 30
  }
];
