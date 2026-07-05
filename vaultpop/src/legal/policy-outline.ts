export const legalOutline = {
  privacy: [
    "Scores, settings, fictional currency balances, boosters, and entitlement state are saved locally.",
    "Optional account sign-in links an email address, account role, install ID, session, and account inventory to the VaultPop service. Core gameplay does not require sign-in.",
    "Google AdMob may process device identifiers, coarse location, product interaction, advertising, performance, crash, and diagnostic data under its SDK disclosures.",
    "Advertising initializes only after the first screen. VaultPop requests consent and App Tracking Transparency permission when advertising requires it.",
    "Apple processes in-app purchases. The verification service receives App Store signed transaction data and an anonymous install ID.",
    "Support requests may include the selected category, message, optional email, anonymous install ID, app version, build number, device model, and priority-routing flag.",
    "No analytics SDK is included in v1."
  ],
  support: [
    "Support email: support@vaultpop.app.",
    "Privacy policy: https://vaultpop-api.fly.dev/privacy.",
    "Support and privacy requests can be sent from the in-app Support screen."
  ],
  gameRules: [
    "VaultPop is a puzzle arcade game. It does not include real cryptocurrency, mining, wallets, trading, staking, NFTs, cash-out, financial rewards, gambling, or real-world prizes.",
    "Vault Coins are fictional in-game currency only and have no real-world value.",
    "The app includes optional Apple in-app purchases, contextual Google AdMob placements, and private in-app support.",
    "Paid packs contain fixed items only. No paid random rewards or chance-based contents are included."
  ]
} as const;
