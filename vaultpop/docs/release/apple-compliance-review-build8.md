# VaultPop Build 8 — Apple Policy / Guideline Compliance Review

Date: 2026-07-08 · Report-only. Target: iOS Build 8, TestFlight/physical QA. App Review submission: NOT authorized.

## 2.1 App Completeness — PASS
- All routes resolve (navigation audit green): Home, Modes (x4 incl. Blitz), Gameplay, Pause, Results, Shop (incl. Styles & Customization), FAQ, Support Assistant, Support, Account, Settings, Gameplay Settings, Legal. `/cosmetics` redirects (no dead route).
- No placeholder/static dead buttons: App Store buttons disable with a clear status when the catalog is unavailable; Booster Forge disables until affordable and confirms on success; every style card is locked/unlocked/equipped state-driven.

## 2.3 Accurate Metadata — PASS (verify at submission time)
- App name VaultPop, bundle `app.vaultpop`, version 1.0. Build number remote via EAS.
- Support URL now serves a credible branded page (required for App Store Connect "Support URL").
- App Review notes updated (Blitz mode, both rewarded placements, SSV endpoint, public support page, optional account creation, on-device assistant).

## 3.1 In-App Purchase — PASS
- 6 products unchanged (IDs untouched per Build 8 rules). Purchases verified server-side with Apple `SignedDataVerifier`; consumables ledgered by transactionId; revoked/pending grant nothing.
- Vault Coins/boosters clearly disclosed as fictional, fixed-value, in-game only — in Shop footer, FAQ, public support page, and review notes.
- Subscription (VaultPass Plus): price + "Renews monthly until cancelled. Manage or cancel in Apple account settings." shown directly on the purchase card; benefits accurately listed (ad-free, premium themes, priority support, fixed monthly boosters); Restore Purchases in Shop and Settings.

## 3.2.2 / 2.5.18 Advertising — PASS
- Production AdMob IDs only (app + 5 units incl. new rewarded coins unit `.../9333822278`); zero Google sample IDs (audit enforced).
- No banners during gameplay; no first-launch ads; interstitials only at natural post-round breaks; app-open gated. Rewarded ads strictly user-initiated, optional, capped at 30/day shared, and fail closed (no confirmation -> no grant). SSV endpoint owned by VaultPop.
- ATT: `NSUserTrackingUsageDescription` present; consent gathered before ad requests; denial falls back to non-personalized ads without restricting gameplay.

## 5.1 Privacy — PASS
- Local-first game; optional account links email + inventory only; support tickets contain user-entered text + disclosed device/app info.
- Registration: scrypt-hashed passwords, opaque hashed session tokens, player-role-only, rate-limited. No secrets in client.
- Support Assistant + FAQ are fully on-device (no external AI/LLM service, no player text leaves the device) — no new privacy-label impact.
- Public support page states privacy reassurance and links the privacy policy.

## 4.7 / 5.3 Prohibited content — PASS
- Zero cryptocurrency/financial-product/wagering language in consumer surfaces (machine-audited banned-terms list expanded this build, including "Coin Forge" and the previously-flagged third-party domain).
- All currencies/rewards/scores explicitly fictional with no real-world value — stated in-app, on the public support page, and in review notes.

## Game Center — PASS (not integrated)
- No GameKit entitlement/usage; leaderboards are VaultPop's own server (anonymous arcade handles only).

## Reviewer access — PASS
- Reviewer account documented in APP_REVIEW_NOTES.md (bootstrapped server-side); gameplay requires no login.

## Conditions before any App Review submission (out of scope for Build 8 QA)
1. Deploy the patched backend to fly.dev so the live Support URL and leaderboard/SSV endpoints match the app (currently the LIVE fly.dev still runs the old backend).
2. Confirm App Store Connect subscription metadata (group, localized description, EULA link) matches the in-app card.
3. Enter the SSV callback URL `https://vaultpop-api.fly.dev/api/ads/ssv_callback` in the AdMob console for both rewarded units (dual behavior on `/support` remains as a safety net).

## Verdict
No APPLE_POLICY_RISK blockers for Build 8 TestFlight/physical QA. Items above are deploy-time/submission-time tasks, not code blockers.
