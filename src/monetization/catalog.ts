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
  basePriceUsd: string;
  badge?: "Popular" | "Best Value";
  grant: ProductGrant;
};

export const IAP_PRODUCTS = [
  {
    id: "app.vaultpop.boosters.starter",
    displayName: "Starter Booster Pack",
    detail: "5 Bonus Lives, 5 Chain Boosts, and 3 Vault Bursts",
    description: "Adds a fixed starter set of boosters for extra arcade puzzle help.",
    kind: "consumable",
    basePriceUsd: "US$2.99",
    grant: { bonusLives: 5, chainBoosts: 5, vaultBursts: 3 }
  },
  {
    id: "app.vaultpop.coins.small",
    displayName: "Small Coin Pack",
    detail: "1,000 Vault Coins",
    description: "Adds 1,000 Vault Coins to use on fixed in-game boosters.",
    kind: "consumable",
    basePriceUsd: "US$0.99",
    grant: { vaultCoins: 1_000 }
  },
  {
    id: "app.vaultpop.coins.medium",
    displayName: "Medium Coin Pack",
    detail: "5,500 Vault Coins",
    description: "Adds 5,500 Vault Coins to use on fixed in-game boosters.",
    kind: "consumable",
    basePriceUsd: "US$3.99",
    badge: "Popular",
    grant: { vaultCoins: 5_500 }
  },
  {
    id: "app.vaultpop.coins.large",
    displayName: "Large Coin Pack",
    detail: "12,000 Vault Coins",
    description: "Adds 12,000 Vault Coins to use on fixed in-game boosters.",
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
    id: "app.vaultpop.vaultpass.monthly",
    displayName: "VaultPass Plus Monthly",
    detail: "Ad-free play, fixed monthly boosters, premium theme, and priority support routing",
    description:
      "Monthly VaultPass Plus membership with ad-free play, premium themes, priority support routing, and a fixed monthly booster grant.",
    kind: "subscription",
    basePriceUsd: "US$2.99/month",
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
