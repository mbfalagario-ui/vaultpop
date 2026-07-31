import type { TileType } from "@/game/models";
import { colors } from "@/theme/colors";
import { TILE_GRADIENTS, type TileGradient } from "@/theme/mode-visuals";

export type VisualThemeId =
  | "midnight-vault"
  | "cyan-circuit"
  | "emerald-pulse"
  | "violet-neon"
  | "vaultpass-prism";

export type TileShape = "coin" | "square" | "gem";

export type VisualTheme = {
  id: VisualThemeId;
  title: string;
  description: string;
  cost: number;
  accent: string;
  glow: string;
  /**
   * Live renderer properties (Build 20): every selectable style changes at
   * least three of these, so switching styles visibly changes actual play —
   * tile palettes, tile silhouette, board surface, and the selection ring.
   */
  tileShape: TileShape;
  tileGradients: Record<TileType, TileGradient>;
  boardColors: readonly [string, string];
  boardBorder: string;
  selectionColor: string;
};

export const visualThemes: VisualTheme[] = [
  {
    id: "midnight-vault",
    title: "Midnight Vault",
    description: "Deep navy board glow with classic gold coin tiles.",
    cost: 0,
    accent: colors.gold,
    glow: "#2B2148",
    tileShape: "coin",
    tileGradients: TILE_GRADIENTS,
    boardColors: ["#1E1740", "#0B0819"],
    boardBorder: "#FFC93E",
    selectionColor: "#FFFFFF"
  },
  {
    id: "cyan-circuit",
    title: "Cyan Circuit",
    description: "Square circuit chips on a cold steel board.",
    cost: 12,
    accent: colors.cyan,
    glow: "#123342",
    tileShape: "square",
    tileGradients: {
      gold: ["#FFF3B0", "#FFD84D", "#8A6A00"],
      cyan: ["#C9FBFF", "#4FE3FF", "#0A85D9"],
      emerald: ["#C2FFE9", "#3BEFC0", "#0A8A66"],
      violet: ["#D4E4FF", "#7FA8FF", "#2E4ED9"],
      ruby: ["#FFD3EC", "#FF6FB5", "#B01D74"]
    },
    boardColors: ["#0E2C3D", "#04121C"],
    boardBorder: "#35DBFF",
    selectionColor: "#8FF2FF"
  },
  {
    id: "emerald-pulse",
    title: "Emerald Pulse",
    description: "Verdant coin palette over a jungle-glass board.",
    cost: 20,
    accent: colors.emerald,
    glow: "#123B2A",
    tileShape: "coin",
    tileGradients: {
      gold: ["#F6FFC2", "#D8F04F", "#7C8A05"],
      cyan: ["#B8FFF2", "#3BE8D2", "#0B8A78"],
      emerald: ["#C8FFD9", "#4CF08F", "#0B8A47"],
      violet: ["#E1D9FF", "#9F86FF", "#4A2BC9"],
      ruby: ["#FFD9C9", "#FF7F5E", "#B03415"]
    },
    boardColors: ["#0D3524", "#04140C"],
    boardBorder: "#3BE88C",
    selectionColor: "#A2FFC9"
  },
  {
    id: "violet-neon",
    title: "Violet Neon",
    description: "Gem-cut tiles glowing over an ultraviolet board.",
    cost: 28,
    accent: colors.violet,
    glow: "#2F2352",
    tileShape: "gem",
    tileGradients: {
      gold: ["#FFE2B8", "#FFB44D", "#B0640E"],
      cyan: ["#D9E2FF", "#8FA1FF", "#3A3ADF"],
      emerald: ["#D2FFE4", "#5FE8A8", "#128A5A"],
      violet: ["#EBD9FF", "#B57FFF", "#5C1DD9"],
      ruby: ["#FFC9E8", "#FF5FAE", "#B00D6E"]
    },
    boardColors: ["#2A1B4D", "#0D0620"],
    boardBorder: "#9D6BFF",
    selectionColor: "#E8CFFF"
  },
  {
    id: "vaultpass-prism",
    title: "VaultPass Prism",
    description: "Premium prism-cut tiles for active VaultPass members.",
    cost: 0,
    accent: colors.cyan,
    glow: "#23304A",
    tileShape: "gem",
    tileGradients: {
      gold: ["#FFF6C9", "#FFDD3B", "#C28A00"],
      cyan: ["#D6FCFF", "#3FE9FF", "#0077D9"],
      emerald: ["#DBFFE8", "#3FF598", "#00915A"],
      violet: ["#EFDDFF", "#AF6FFF", "#5E0DD9"],
      ruby: ["#FFDBEA", "#FF478F", "#C2005E"]
    },
    boardColors: ["#1B2B52", "#070D22"],
    boardBorder: "#7FD8FF",
    selectionColor: "#BFF4FF"
  }
];

export function getVisualTheme(themeId: string): VisualTheme {
  return visualThemes.find((theme) => theme.id === themeId) ?? visualThemes[0]!;
}
