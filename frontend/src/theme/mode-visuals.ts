import type { GameModeId, TileType } from "@/game/models";

export type TileGradient = readonly [string, string, string];

export type ModeVisual = {
  id: GameModeId;
  name: string;
  kicker: string;
  tagline: string;
  accent: string;
  secondary: string;
  energy: string;
  surface: string;
  surfaceRaised: string;
  board: string;
  aurora: readonly [string, string];
  tileColors: Record<TileType, string>;
  tileGradients: Record<TileType, TileGradient>;
};

export const TILE_GRADIENTS: Record<TileType, TileGradient> = {
  gold: ["#FFE690", "#FFC33B", "#B86E05"],
  cyan: ["#9DF4FF", "#2FCFFF", "#0968BC"],
  emerald: ["#A9FFCE", "#35E184", "#077E43"],
  violet: ["#D9BDFF", "#9D6BFF", "#4C1DB4"],
  ruby: ["#FFAECB", "#FF4D8D", "#A80D59"]
};

export const MODE_VISUALS: Record<GameModeId, ModeVisual> = {
  classic: {
    id: "classic",
    name: "Vault Reactor",
    kicker: "60 SEC SCORE ATTACK",
    tagline: "Chase combos before the clock hits zero.",
    accent: "#A875FF",
    secondary: "#36D9FF",
    energy: "#FFC93E",
    surface: "#150F2E",
    surfaceRaised: "#1E1740",
    board: "#0B0819",
    aurora: ["#6A34E0", "#0E86D4"],
    tileColors: {
      gold: "#FFCA4E",
      cyan: "#26CFFF",
      emerald: "#3EE69A",
      violet: "#9B6CFF",
      ruby: "#FF4F91"
    },
    tileGradients: TILE_GRADIENTS
  },
  dailyVault: {
    id: "dailyVault",
    name: "Prism Chain",
    kicker: "TODAY'S VAULT",
    tagline: "One board for everyone. One shot a day.",
    accent: "#31DEFF",
    secondary: "#FF4E86",
    energy: "#56F39A",
    surface: "#0A1B28",
    surfaceRaised: "#0F2838",
    board: "#06121B",
    aurora: ["#0E86D4", "#0E9E58"],
    tileColors: {
      gold: "#FFC84A",
      cyan: "#31DEFF",
      emerald: "#68E970",
      violet: "#9B76FF",
      ruby: "#FF4E86"
    },
    tileGradients: TILE_GRADIENTS
  },
  streak: {
    id: "streak",
    name: "Coin Forge",
    kicker: "THREE MISSES END THE RUN",
    tagline: "Protect the chain. Every tap counts.",
    accent: "#FFB53D",
    secondary: "#2FD9EE",
    energy: "#5BEF73",
    surface: "#1D150A",
    surfaceRaised: "#2A1F10",
    board: "#120C05",
    aurora: ["#D98A0B", "#C4136B"],
    tileColors: {
      gold: "#F7B83D",
      cyan: "#36BDF2",
      emerald: "#66D85C",
      violet: "#AF76D8",
      ruby: "#F05B48"
    },
    tileGradients: TILE_GRADIENTS
  }
};

export function getModeVisual(modeId: GameModeId): ModeVisual {
  return MODE_VISUALS[modeId];
}
