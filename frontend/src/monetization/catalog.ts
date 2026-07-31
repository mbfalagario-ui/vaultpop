export type ProductKind = "consumable" | "non-consumable" | "subscription";

export type ProductGrant = {
  vaultCoins?: number;
  bonusLives?: number;
  chainBoosts?: number;
  vaultBursts?: number;
  removeAds?: boolean;
  premiumTheme?: boolean;
  prioritySupport?: boolean;
};

export type IapProductDefinition = {
  id: string;
  displayName: string;
  detail: string;
  description: string;
  kind: ProductKind;
  /**
   * Reference price used only for one-time products as offline fallback
   * copy. The VaultPass subscription intentionally has NO hardcoded price:
   * its customer-facing price must come exclusively from the localized
   * StoreKit product (Build 18 regression fix).
   */
  basePriceUsd?: string;
  badge?: "Popular" | "Best Value";
  grant: ProductGrant;
};

export const IAP_PRODUCTS = [
  {
    id: "app.vaultpop.boosters.starter",
    displayName: "Starter Booster Pack",
    detail: "5 Bonus Lives, 5 Chain Boosts, and 3 Vault Bursts",
    description:
      "A ready-to-use set for longer rounds and stronger score runs. Bonus Lives add 15 seconds, Chain Boosts add 2x to your active combo, and Vault Bursts score 750 x your combo before refreshing the board.",
    kind: "consumable",
    basePriceUsd: "US$2.99",
    grant: { bonusLives: 5, chainBoosts: 5, vaultBursts: 3 }
  },
  {
    id: "app.vaultpop.coins.small",
    displayName: "Small Coin Pack",
    detail: "1,000 Vault Coins",
    description:
      "Enough for several Booster Forge purchases. Choose Bonus Lives, Chain Boosts, or Vault Bursts whenever you need them.",
    kind: "consumable",
    basePriceUsd: "US$0.99",
    grant: { vaultCoins: 1_000 }
  },
  {
    id: "app.vaultpop.coins.medium",
    displayName: "Medium Coin Pack",
    detail: "5,500 Vault Coins",
    description:
      "A larger reserve for repeated runs. Spend only on the three fixed boosters in the Booster Forge.",
    kind: "consumable",
    basePriceUsd: "US$3.99",
    badge: "Popular",
    grant: { vaultCoins: 5_500 }
  },
  {
    id: "app.vaultpop.coins.large",
    displayName: "Large Coin Pack",
    detail: "12,000 Vault Coins",
    description:
      "The largest Vault Coin reserve for frequent play across every mode and all three Booster Forge items.",
    kind: "consumable",
    basePriceUsd: "US$8.99",
    badge: "Best Value",
    grant: { vaultCoins: 12_000 }
  },
  {
    id: "app.vaultpop.remove_ads",
    displayName: "Ad-Free Upgrade",
    detail: "Permanently removes ads and ad prompts",
    description:
      "Permanently removes banner, interstitial, app-open, and rewarded-ad prompts from VaultPop.",
    kind: "non-consumable",
    basePriceUsd: "US$4.99",
    grant: { removeAds: true }
  },
  {
    id: "app.vaultpop.vaultpass.plus.monthly",
    displayName: "VaultPass Plus Monthly",
    detail: "Each month: 10 Bonus Lives, 10 Chain Boosts, and 5 Vault Bursts",
    description:
      "Includes ad-free play, premium themes, priority support routing, and a monthly booster refill for extra time, stronger combos, and instant vault openings.",
    kind: "subscription",
    grant: {
      bonusLives: 10,
      chainBoosts: 10,
      vaultBursts: 5,
      premiumTheme: true,
      prioritySupport: true
    }
  }
] as const satisfies readonly IapProductDefinition[];

export type IapProductId = (typeof IAP_PRODUCTS)[number]["id"];

export const ONE_TIME_PRODUCT_IDS = IAP_PRODUCTS.filter(
  (product) => product.kind !== "subscription"
).map((product) => product.id);

export const SUBSCRIPTION_PRODUCT_IDS = IAP_PRODUCTS.filter(
  (product) => product.kind === "subscription"
).map((product) => product.id);

export function getProductDefinition(productId: string): IapProductDefinition | undefined {
  return IAP_PRODUCTS.find((product) => product.id === productId);
}

export function isConsumableProduct(productId: string): boolean {
  return getProductDefinition(productId)?.kind === "consumable";
}
