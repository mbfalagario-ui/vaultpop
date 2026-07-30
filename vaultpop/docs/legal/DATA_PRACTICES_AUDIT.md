# VaultPop Data Practices Audit (Build 18)

Audit date: July 30, 2026
Method: direct inspection of the VaultPop app source (`/app/vaultpop/src`, `/app/vaultpop/app`) and backend source (`/app/vaultpop/backend`), plus the production configuration (`app.json`, `fly.toml`). Nothing below is inferred from SDK capability alone; every "collected" claim cites the code that performs the collection.

Categories:
- **[1P]** collected directly by VaultPop (stored on the `vaultpop-api` backend, Fly.io — Toronto/yyz region)
- **[APPLE]** processed by Apple, not received by VaultPop
- **[GOOGLE]** processed by Google AdMob under Google's SDK disclosures
- **[LOCAL]** generated and stored only on the device
- **[NONE]** not collected

| Item | Collected? | Evidence | Purpose | Linked to account/user | Used for tracking | Shared with third party | Retention / deletion |
|---|---|---|---|---|---|---|---|
| Account email address | YES [1P] (optional sign-in) | `backend/sqlite-account-store.ts` `accounts` table; `POST /v1/auth/register`, `/v1/auth/login` in `backend/app.ts` | Account sign-in, recovery, role | YES | NO | NO | Kept while account exists; removed on request (support) — no automated schedule |
| Authentication records | YES [1P] | `backend/auth.ts` — passwords scrypt-hashed with unique salt (`hashPassword`); session tokens stored hashed (`hashSessionToken`); sessions expire after 24h (`sqlite-account-store.ts`) | Authentication | YES | NO | NO | Sessions expire after 24 hours; hashes kept while account exists |
| Account ID | YES [1P] | UUID in `accounts` table | Account reference | YES | NO | NO | Same as account |
| Install/device ID | YES [1P] — an app-generated random install ID (NOT the Apple IDFA/IDFV) | `account_install_links`, `support_tickets.install_id`, `rewarded_ad_events.install_id`, `transactions` (`sqlite-account-store.ts`, `ops-store.ts`, `sqlite-ledger.ts`) | Link inventory/rewards/support to an install without requiring an account | YES (when signed in) | NO | Echoed back by Google's rewarded-ad SSV callback as custom reward data (reward crediting only) | Kept with associated records; removed on request |
| Gameplay progress (scores, rounds, streaks, settings) | NO server-side — [LOCAL] | `src/storage/save-model.ts` (local save profile) | Gameplay | n/a | NO | NO | On-device; removed by deleting the app |
| Game history | [LOCAL] only | same as above | Gameplay | n/a | NO | NO | On-device |
| Inventory & virtual items (Vault Coins, boosters) | [LOCAL] + server-side purchase-grant ledger [1P] | local save profile; `backend/sqlite-ledger.ts` `transactions` (verified purchase grants) | Restore purchases, prevent duplicate grants | YES (install/account) | NO | NO | Kept as purchase record; removed on request |
| Leaderboard information | YES [1P] | `backend/leaderboard-store.ts` `leaderboard_scores` (mode, chosen handle, score, install ID, timestamp) | Global leaderboards | Pseudonymous (handle + install ID) | NO | Displayed publicly in-app (handle + score only) | Kept while on the board; removed on request |
| Purchase records | YES [1P] | `backend/sqlite-ledger.ts` `transactions` — Apple transaction ID, product ID, install ID, timestamp | Purchase verification, restore, duplicate prevention | YES | NO | Received FROM Apple (signed transaction); not shared onward | Kept as financial record; removal on request where legally permitted |
| Payment card details | [APPLE] only — never received by VaultPop | No payment fields anywhere in source; StoreKit only (`src/monetization/purchase-service.ts`) | Payment | n/a | NO | n/a | Apple's policies apply |
| Subscription / VaultPass entitlement | YES [1P] | `vault_pass_expires_at` (`sqlite-account-store.ts`, ledger) | Entitlement gating, ad suppression | YES | NO | NO | Kept while relevant |
| Rewarded-ad events | YES [1P] | `rewarded_ad_events` / `ad_events` tables (`ops-store.ts`, `leaderboard-store.ts`): install ID, granted/failed, reward type, timestamp — populated via Google SSV callback | Reward crediting + fraud prevention | Install-level | NO | Data ORIGINATES from Google's SSV callback | Kept as reward record |
| Advertising diagnostics (owner card) | [LOCAL] only | `src/ads/ad-service.ts` `AdsDiagnostics` — in-memory on device, never transmitted | Owner debugging | n/a | NO | NO | In-memory only, cleared on app restart |
| Support tickets & messages | YES [1P] | `support_tickets` + `support_ticket_replies` (`ops-store.ts`): category, message, optional email, app version, build, device model string, priority flag, install ID | Customer support | YES if email given; otherwise install-level | NO | NO | Kept until resolved/removed on request |
| Password-reset requests | YES [1P] | `password_reset_requests` table (`ops-store.ts`) | Account recovery (admin-fulfilled) | YES | NO | NO | Kept until processed/removed on request |
| Crash reports | NOT collected by VaultPop — no crash SDK in `package.json` (no Sentry/Crashlytics/Firebase). [APPLE] may share opt-in crash data via App Store Connect; [GOOGLE] AdMob SDK reports its own crash/performance diagnostics per Google's disclosures | `package.json` dependency list | — | NO | NO | Apple/Google per their policies | Per Apple/Google |
| Application diagnostics | [GOOGLE] AdMob SDK performance/diagnostic data per https://developers.google.com/admob/ios/privacy | AdMob SDK presence (`react-native-google-mobile-ads`) | Ad serving quality | NO (per Google disclosure) | NO | Google | Google's policies |
| IP address / server-request logs | Transient. App backend logs method, path, **parameter names only**, status, duration (`backend/server.ts` `logRequestRedacted`) — no IPs, no query values, no tokens, written to ephemeral stdout. Fly.io (hosting) processes IPs transiently for routing/security | `backend/server.ts:93-113` | Operations | NO | NO | Hosting infrastructure (Fly.io) as processor | Ephemeral (not stored in the app database) |
| Device information | YES [1P] minimal — device model string + app version/build ONLY inside support tickets the user sends | `src/screens/support-screen.tsx`, `ops-store.ts` | Support triage | With ticket | NO | NO | With ticket |
| Advertising identifiers (IDFA) | [GOOGLE] — collected by the AdMob SDK only when the user grants the ATT permission; VaultPop's own servers never receive the IDFA | `src/ads/ad-service.ts` (ATT gate before personalized ads); no IDFA reference in backend | Personalized advertising | NO (not by VaultPop) | YES (Google, with ATT consent) | Google | Google's policies; user-revocable in iOS Settings |
| App Tracking Transparency state | [LOCAL] (iOS permission state) | `expo-tracking-transparency` usage in `ad-service.ts` | Determines personalized vs non-personalized ads | n/a | NO | NO | Managed by iOS |
| AdMob consent state (UMP) | [LOCAL] (stored on device by Google UMP SDK) | `AdsConsent.gatherConsent()` in `ad-service.ts` | Regional consent compliance | n/a | NO | Google SDK local storage | Managed by Google UMP |
| Analytics SDKs | [NONE] — no analytics SDK is included | `package.json` | — | — | — | — | — |
| Third-party data processors | Apple (payments, App Store), Google AdMob (advertising), Fly.io (hosting) | config + source | — | — | — | — | — |
| Retention & deletion behaviour | Sessions auto-expire (24h). No other automated retention schedule is implemented. **Build 18: in-app self-service account deletion exists (Settings → Account → Delete Account; `POST /v1/account/delete`)** — deletes account/sessions/install link/balances/leaderboard/tickets/reset requests; de-identifies retained purchase + SSV records (see `ACCOUNT_DELETION_IMPLEMENTATION.md`). Deletion also remains available on request via support@vaultpop.app / in-app support; admin tools can disable accounts and remove data. | source-wide | — | — | — | — | — |

## UNVERIFIED — OWNER CONFIRMATION REQUIRED
1. **Legal entity & governing jurisdiction** — no business entity name or address exists in source. The Terms use neutral operator wording; confirm your jurisdiction and entity.
2. **Google ad-serving specifics** (exact data elements Google collects per app configuration) — the guides link Google's authoritative disclosures; confirm your AdMob account settings match.
3. ~~Apple App Review account-deletion rule (Guideline 5.1.1(v))~~ **RESOLVED
   (Build 18)**: account deletion can now be initiated in-app (Settings →
   Account → Delete Account). See `ACCOUNT_DELETION_IMPLEMENTATION.md`.

## Summary for Apple disclosure purposes
- VaultPop first-party: email (optional), user/install IDs, purchase records, support content, leaderboard handle+score. None used for tracking.
- Google AdMob: device/advertising identifiers (ATT-gated), coarse location (IP-derived), ad interaction, performance/diagnostics — the identifier + advertising data are "used for tracking" in Apple's sense when ATT is granted.
- Apple: payment processing, opt-in crash data.
- Local only: gameplay saves, coins/boosters, settings, diagnostics, consent/ATT state.
