import type { BoosterKind } from "@/monetization/economy";

export type BoosterGuideItem = {
  id: BoosterKind;
  label: string;
  shortEffect: string;
  description: string;
};

export const BOOSTER_GUIDE: readonly BoosterGuideItem[] = [
  {
    id: "bonusLives",
    label: "Bonus Life",
    shortEffect: "+15 seconds",
    description:
      "Adds 15 seconds to the active round, up to the 99-second timer limit."
  },
  {
    id: "chainBoosts",
    label: "Chain Boost",
    shortEffect: "+2x combo",
    description:
      "Raises the active combo multiplier by 2x, up to the 12x combo limit."
  },
  {
    id: "vaultBursts",
    label: "Vault Burst",
    shortEffect: "Instant vault",
    description:
      "Scores 750 x your current combo, counts one vault bonus, and refreshes the board."
  }
];
