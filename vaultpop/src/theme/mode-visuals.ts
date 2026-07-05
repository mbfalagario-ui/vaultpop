import type { GameModeId, TileType } from "@/game/models";

export type ModeVisual = {
  id: GameModeId;
  name: string;
  kicker: string;
  accent: string;
  secondary: string;
  energy: string;
  surface: string;
  surfaceRaised: string;
  board: string;
  tileColors: Record<TileType, string>;
};

export const MODE_VISUALS: Record<GameModeId, ModeVisual> = {
  classic: {
    id: "classic",
    name: "Vault Reactor",
    kicker: "60 SEC SCORE ATTACK",
    accent: "#A875FF",
    secondary: "#36D9FF",
    energy: "#F6C85F",
    surface: "#111026",
    surfaceRaised: "#191534",
    board: "#0A0917",
    tileColors: {
      gold: "#FFCA4E",
      cyan: "#26CFFF",
      emerald: "#3EE69A",
      violet: "#9B6CFF",
      ruby: "#FF4F91"
    }
  },
  dailyVault: {
    id: "dailyVault",
    name: "Prism Chain",
    kicker: "TODAY'S VAULT",
    accent: "#31DEFF",
    secondary: "#FF4E86",
    energy: "#56F39A",
    surface: "#081722",
    surfaceRaised: "#0E2530",
    board: "#061117",
    tileColors: {
      gold: "#FFC84A",
      cyan: "#31DEFF",
      emerald: "#68E970",
      violet: "#9B76FF",
      ruby: "#FF4E86"
    }
  },
  streak: {
    id: "streak",
    name: "Coin Forge",
    kicker: "PROTECT THE CHAIN",
    accent: "#F7B83D",
    secondary: "#27D9EE",
    energy: "#5BEF73",
    surface: "#17140C",
    surfaceRaised: "#252014",
    board: "#0C0B08",
    tileColors: {
      gold: "#F7B83D",
      cyan: "#36BDF2",
      emerald: "#66D85C",
      violet: "#AF76D8",
      ruby: "#F05B48"
    }
  }
};

export function getModeVisual(modeId: GameModeId): ModeVisual {
  return MODE_VISUALS[modeId];
}
