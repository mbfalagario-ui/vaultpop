# VaultPop Compliance Rulebook

## Product Truth

VaultPop is an arcade puzzle game with fictional coin tiles and fictional in-game currency. It has no real cryptocurrency, mining, wallet, trading, staking, NFT, cash-out, investment, gambling, sweepstakes, or real-world prize functionality.

## Purchase Rules

- Apple In-App Purchase is the only payment path.
- No QR unlock, license key, external checkout, or crypto payment.
- No random paid reward, loot box, odds-based pack, or guaranteed outcome claim.
- Server verification is required before delivery.
- Transaction IDs are granted once.
- Pending, cancelled, failed, unverified, or revoked transactions grant nothing.
- Restore does not duplicate consumed consumables.
- Permanent Ad-Free Upgrade remains active after VaultPass lapses.
- VaultPass lapse removes subscription-only access without deleting purchased items.

## Ad Rules

- Do not initialize before first paint.
- Do not show an ad on first cold launch.
- Do not show banners or full-screen ads during gameplay.
- Interstitial frequency is at most one per three completed rounds.
- Rewarded ads are user-initiated and grant one Bonus Life only after the reward callback.
- Rewarded grants are capped at 30 per local day.
- App-open ads require a prior completed round and a background return.
- Paid ad-free users see no ad placement or rewarded prompt.
- No sample ad IDs in source or production configuration.

## Privacy

- Contextual ads by default.
- No ATT request and no IDFA use.
- Purchases send App Store signed transaction data plus an anonymous install ID to the verification service.
- Support may collect category, message, optional email, anonymous install ID, app/build version, device model, and priority-routing status.
- No analytics SDK, account profile, location, contacts, camera, microphone, or photo access.

## Banned Promotional Language

The following are permitted only in legal/compliance disclaimers that state the feature is absent:

- earn crypto
- earn money
- cash out
- profit
- passive income
- Bitcoin
- Ethereum
- Satoshi
- Hash
- mining
- miner
- wallet
- trading
- staking
- NFT
- airdrop
- investment
- real rewards
- financial freedom

Secrets and private keys must remain environment-only or outside git tracking. They must never be committed, printed, or embedded in app source.
