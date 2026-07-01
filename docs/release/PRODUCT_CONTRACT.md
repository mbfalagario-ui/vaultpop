# VaultPop Product Contract

## Product

VaultPop is a crypto-inspired arcade puzzle game. Players clear connected coin tiles, build combos, fill a vault meter, and chase local high scores. It is a game only: no real cryptocurrency, mining, wallets, trading, staking, NFTs, financial rewards, cash-out, investment products, gambling, sweepstakes, or real-world prizes.

Public positioning:

- VaultPop
- Pop Coins. Complete the Chain.

## Platform

- Expo React Native, TypeScript, and Expo Router.
- iPhone-only, portrait, Bundle ID `app.vaultpop`.
- EAS production build and submit configuration for iOS only.
- No Android scope.
- Base gameplay works offline.
- No account or public social system.

## Gameplay

- 8x8 board with five tile types.
- Groups of two or more matching tiles clear.
- Gravity, refill, combo scoring, vault meter, and vault bonus.
- Classic, Daily Vault, and Streak modes.
- Pause, restart, results, local scores, and local themes.

## Monetization

- Apple In-App Purchase only; no external payment path.
- Three fixed Vault Coin consumables.
- One fixed starter booster consumable.
- One permanent Ad-Free Upgrade.
- One monthly VaultPass subscription with fixed benefits.
- Vault Coins are fictional, do not expire, and are usable only for boosters and cosmetics.
- Purchased boosters do not expire.
- All paid grants are deterministic and transaction-idempotent.
- Pending, failed, cancelled, unverified, and revoked transactions grant nothing.
- Restore Purchases restores the permanent entitlement and active subscription, never consumed consumables.

## Ads

- Google AdMob iOS only.
- Contextual/non-personalized requests by default.
- No ATT request or IDFA access.
- No ad before first paint or on first cold launch.
- No ad during active gameplay.
- Ad-Free Upgrade and active VaultPass suppress all placements and prompts.

## Support Backend

The minimal service is limited to:

- `GET /health`
- `POST /v1/purchases/verify`
- `GET /v1/entitlements`
- `GET /v1/ledger`
- `POST /v1/support/tickets`

Apple-signed transaction verification fails closed. SQLite enforces unique transaction IDs. Support has no public chat, user-generated content, account system, or in-app admin panel.

## Screens

Home, Mode Select, Gameplay, Pause, Results, Shop, Cosmetics, Settings, Support, and Privacy/Legal.
