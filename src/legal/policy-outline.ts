export const legalOutline = {
  privacy: [
    "Scores, settings, fictional currency balances, boosters, and entitlement state are saved locally.",
    "No account system is included in v1.",
    "Google AdMob serves contextual ads by default. VaultPop does not request App Tracking Transparency or access IDFA.",
    "Apple processes in-app purchases. The verification service receives App Store signed transaction data and an anonymous install ID.",
    "Support requests may include the selected category, message, optional email, anonymous install ID, app version, build number, device model, and priority-routing flag.",
    "No analytics SDK is included in v1."
  ],
  support: [
    "Support email: support@vaultpop.app.",
    "Privacy policy: https://vaultpop-api.fly.dev/privacy.",
    "Support and privacy requests can be sent from the in-app Support screen."
  ],
  reviewNotes: [
    "VaultPop is a puzzle arcade game. It does not include real cryptocurrency, mining, wallets, trading, staking, NFTs, cash-out, financial rewards, gambling, or real-world prizes.",
    "Vault Coins are fictional in-game currency only and have no real-world value.",
    "The app includes optional Apple in-app purchases, contextual Google AdMob placements, and private in-app support.",
    "Paid packs contain fixed items only. No paid random rewards or chance-based contents are included."
  ]
} as const;
