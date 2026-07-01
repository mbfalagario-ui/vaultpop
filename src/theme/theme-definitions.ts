import { colors } from "@/theme/colors";

export type VisualThemeId =
  | "midnight-vault"
  | "cyan-circuit"
  | "emerald-pulse"
  | "violet-neon"
  | "vaultpass-prism";

export type VisualTheme = {
  id: VisualThemeId;
  title: string;
  description: string;
  cost: number;
  accent: string;
  glow: string;
};

export const visualThemes: VisualTheme[] = [
  {
    id: "midnight-vault",
    title: "Midnight Vault",
    description: "Deep navy board glow with gold coin tiles.",
    cost: 0,
    accent: colors.gold,
    glow: "#2B2148"
  },
  {
    id: "cyan-circuit",
    title: "Cyan Circuit",
    description: "Cool electric highlights for fast score runs.",
    cost: 12,
    accent: colors.cyan,
    glow: "#123342"
  },
  {
    id: "emerald-pulse",
    title: "Emerald Pulse",
    description: "Green vault trails for clean combo chains.",
    cost: 20,
    accent: colors.emerald,
    glow: "#123B2A"
  },
  {
    id: "violet-neon",
    title: "Violet Neon",
    description: "Soft violet highlights for late-round boards.",
    cost: 28,
    accent: colors.violet,
    glow: "#2F2352"
  },
  {
    id: "vaultpass-prism",
    title: "VaultPass Prism",
    description: "Premium multi-color highlights for active VaultPass members.",
    cost: 0,
    accent: colors.cyan,
    glow: "#23304A"
  }
];

export function getVisualTheme(themeId: string): VisualTheme {
  return visualThemes.find((theme) => theme.id === themeId) ?? visualThemes[0]!;
}
