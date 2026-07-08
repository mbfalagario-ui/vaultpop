export type FaqCategory =
  | "Gameplay"
  | "Store & Purchases"
  | "VaultPass"
  | "Rewarded Ads"
  | "Account"
  | "Leaderboards"
  | "Privacy"
  | "Support";

export type FaqEntry = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  keywords: string[];
};

export const FAQ_CATEGORIES: FaqCategory[] = [
  "Gameplay",
  "Store & Purchases",
  "VaultPass",
  "Rewarded Ads",
  "Account",
  "Leaderboards",
  "Privacy",
  "Support"
];

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: "gameplay-basics",
    category: "Gameplay",
    question: "How do I play VaultPop?",
    answer:
      "Tap any group of 2 or more touching, matching coins to pop them. Bigger groups score more, back-to-back pops build your combo multiplier, and filling the vault meter opens a vault for a big bonus.",
    keywords: ["play", "rules", "how", "pop", "coins", "tap", "board"]
  },
  {
    id: "gameplay-modes",
    category: "Gameplay",
    question: "What are the four modes?",
    answer:
      "Classic is a 60-second score attack. Daily Vault is one shared board per day for everyone. Streak rewards consecutive daily runs. Blitz is a faster, higher-pressure sprint.",
    keywords: ["modes", "classic", "daily", "streak", "blitz", "vault"]
  },
  {
    id: "gameplay-boosters",
    category: "Gameplay",
    question: "What do the boosters do?",
    answer:
      "Bonus Life adds 15 seconds to the round. Chain Boost adds 2x to your active combo. Vault Burst scores 750 x your combo and refreshes the board. Use them from the booster bar during a round.",
    keywords: ["booster", "bonus life", "chain boost", "vault burst", "forge"]
  },
  {
    id: "gameplay-motion",
    category: "Gameplay",
    question: "The animations feel like too much (or too little).",
    answer:
      "Open Settings > Gameplay Settings and toggle Reduced Motion. Standard mode keeps local coin pops, glow, and score pulses; Reduced Motion removes larger movement while keeping color and score feedback.",
    keywords: ["motion", "animation", "shake", "reduced", "dizzy", "sick", "settings"]
  },
  {
    id: "store-missing",
    category: "Store & Purchases",
    question: "My purchase didn't arrive. What now?",
    answer:
      "Open Shop and tap Restore Purchases first — it re-checks the Ad-Free Upgrade and VaultPass with Apple. Coin and booster packs deliver after Apple confirms payment. Still missing? Send a support request with your approximate purchase time.",
    keywords: ["purchase", "missing", "restore", "iap", "refund", "coins", "pack", "buy"]
  },
  {
    id: "store-adfree",
    category: "Store & Purchases",
    question: "What does the Ad-Free Upgrade include?",
    answer:
      "A one-time purchase that permanently removes banner, interstitial, app-open, and rewarded-ad prompts from VaultPop on your Apple account. Use Restore Purchases on any new device.",
    keywords: ["ad free", "remove ads", "no ads", "upgrade"]
  },
  {
    id: "vaultpass-benefits",
    category: "VaultPass",
    question: "What is VaultPass Plus?",
    answer:
      "A monthly auto-renewing subscription with ad-free play, premium themes, priority support routing, and a monthly refill of 10 Bonus Lives, 10 Chain Boosts, and 5 Vault Bursts.",
    keywords: ["vaultpass", "subscription", "monthly", "premium", "priority"]
  },
  {
    id: "vaultpass-cancel",
    category: "VaultPass",
    question: "How do I cancel VaultPass Plus?",
    answer:
      "Subscriptions are managed by Apple: open iPhone Settings > your name > Subscriptions > VaultPass Plus > Cancel. Benefits stay active through the current paid period.",
    keywords: ["cancel", "unsubscribe", "renew", "subscription", "manage"]
  },
  {
    id: "ads-rewarded",
    category: "Rewarded Ads",
    question: "How do rewarded ads work?",
    answer:
      "Watching an optional rewarded ad grants 1 Bonus Life or 10 Vault Coins. All rewarded placements share one limit of 30 ads per day. Rewards are granted only after the ad network confirms the view.",
    keywords: ["rewarded", "watch", "ad", "free", "bonus life", "10 coins", "limit"]
  },
  {
    id: "ads-not-granted",
    category: "Rewarded Ads",
    question: "I watched an ad but got no reward.",
    answer:
      "Rewards are confirmed by the ad network before granting, so a closed or failed ad grants nothing. Check your connection and try again. If it keeps happening, send a support request from Settings > Support.",
    keywords: ["reward", "not received", "no reward", "ad failed", "watch"]
  },
  {
    id: "account-create",
    category: "Account",
    question: "How do I create an account?",
    answer:
      "Open Settings > Create Account, enter an email and a password of at least 12 characters. Accounts are free, optional, and only add inventory sync and support history — gameplay always works without one.",
    keywords: ["create", "account", "sign up", "register", "email", "password"]
  },
  {
    id: "account-sync",
    category: "Account",
    question: "What does Account Sync do?",
    answer:
      "Account Sync refreshes your linked inventory and access (coins, boosters, Ad-Free, VaultPass) from the VaultPop server onto this device. Use it after buying on another device.",
    keywords: ["sync", "refresh", "link", "inventory", "transfer", "device"]
  },
  {
    id: "leaderboard-update",
    category: "Leaderboards",
    question: "When do leaderboards update?",
    answer:
      "Your score submits automatically when a round ends while online. Only your best score per mode counts. The home card and leaderboard screen refresh automatically every few seconds.",
    keywords: ["leaderboard", "rank", "global", "score", "submit", "update"]
  },
  {
    id: "leaderboard-handle",
    category: "Leaderboards",
    question: "What name shows on the leaderboard?",
    answer:
      "A generated arcade handle tied to this installation. No email or personal detail is ever shown on the global board.",
    keywords: ["handle", "name", "username", "anonymous"]
  },
  {
    id: "privacy-data",
    category: "Privacy",
    question: "What data does VaultPop collect?",
    answer:
      "Game progress stays on your device. An optional account links only an email and inventory. Support requests contain what you type plus app version info. Vault Coins and all rewards are fictional in-game content with no real-world value.",
    keywords: ["privacy", "data", "collect", "personal", "gdpr", "delete"]
  },
  {
    id: "support-contact",
    category: "Support",
    question: "How do I contact support?",
    answer:
      "Use Settings > Support to send a request in-app (VaultPass members get priority routing), or email support@vaultpop.app. Typical replies arrive within 1-2 business days.",
    keywords: ["contact", "support", "email", "help", "human", "ticket"]
  }
];

/** Simple keyword scoring for the structured Support Assistant. */
export function searchFaq(query: string, category?: FaqCategory | null): FaqEntry[] {
  const pool = category
    ? FAQ_ENTRIES.filter((entry) => entry.category === category)
    : FAQ_ENTRIES;
  const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2);
  if (terms.length === 0) {
    return pool;
  }
  return pool
    .map((entry) => {
      const haystack = `${entry.question} ${entry.answer} ${entry.keywords.join(" ")}`.toLowerCase();
      const score = terms.reduce(
        (total, term) => total + (haystack.includes(term) ? 1 : 0),
        0
      );
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.entry);
}
