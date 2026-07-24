# VAULTPOP BUILD 11 TARGETED QA CORRECTION — PATCH HANDOFF

> ## FINAL HANDOFF STATUS (2026-07-24 — deploy addendum)
> - **Build 10 completed before this patch: YES**
> - **Patch target: Build 11**
> - **Backend deployed to vaultpop-api: YES** (`fly deploy -a vaultpop-api`, machine 847560c9de6498 updated to a good state, DNS verified; only `vaultpop-api` touched)
> - **Fly token stored securely for future VaultPop deploys: NO**
>   - Reason: TOKEN_PERSISTENCE_NOT_AVAILABLE_SECURELY — this environment has no secure persistent secret store; the token was used session-only from a temp env file outside the repo and shredded immediately after deploy. It appears in no source, logs, screenshots, or packages.
> - **Live backend verification (all on https://vaultpop-api.fly.dev):**
>   - /health: PASS — 200 `{"status":"ok"}`
>   - /support: PASS — 200 polished VaultPop Support HTML page (7,979 bytes)
>   - admin verification: PASS — new `/admin` console live (all Build 11 markers present: Restricted Access, Owner Status / Operations Health / Monetization Status / Support & Account Tools cards, safe-parse + timeout guards); `/v1/admin/*` without or with an invalid token → 403 `{"error":"Admin authorization required."}`
>   - account login: PASS — 200 with session token (live QA player account)
>   - account sync: PASS — `GET /v1/account` with session token → 200 `{state:…}`; bogus token → 401 JSON (feeds the app's new session-expired handling)
>   - leaderboard: PASS — submit 200 (`{"accepted":true,"bestScore":4321,"rank":2}`) and fetch 200; pre-deploy entries retained (SQLite volume persistence intact across deploy)
>   - security probes: PASS — unknown route 404 JSON, `/.env` 404, malformed JSON login body 400; no secrets, debug output, or stack traces exposed
> - **Admin JSON parse fixed: YES** · **Admin Console reconfigured: YES** · **Sign-in speed fixed: YES** · **Account Sync fixed: YES** · **VaultPass handling fixed: YES** · **Rewarded ads UX fixed: YES** (details below)
> - **Production AdMob SSV URL: https://vaultpop-api.fly.dev/support** (unchanged)
> - **/api/ads/ssv_callback: future/non-blocking only** (unchanged)
> - **pnpm run verify: PASS** — app + backend typecheck, 46/46 tests, all 5 audits (re-confirmed immediately before deploy)
> - **EAS Build 11 started: NO** · **App Store Connect upload: NO** · **App Review submission: NO**
> - **Downloadable package URL:** https://vaultpop-premium.preview.emergentagent.com/api/export/build11-complete-package
>   (serves `vaultpop-build11-complete-handoff-package.zip` containing `vaultpop-build11-final-source.zip`, this handoff, `vaultpop-build11-patch-proof.zip`, and the live deploy verification notes)

Date: 2026-07-24 (preview environment date 2026-06)
Scope: 5 user-verified Build 10 failures. Code-only patch for the next external build (Build 11).
No EAS build run. No App Store Connect upload. No App Review submission. No Hashrate Cloud Miner changes.
Bundle ID, signing, IAP product IDs, and AdMob IDs unchanged. AdMob SSV untouched.
Production AdMob SSV URL remains: https://vaultpop-api.fly.dev/support
/api/ads/ssv_callback remains future/non-blocking only.

---

## ROOT CAUSE TABLE

| # | Reported failure | Root cause |
|---|------------------|-----------|
| 1 | Admin Console JSON parse error | The `/admin` console's `api()` helper called `await response.json()` unconditionally — no timeout, no HTTP-status guard, no content-type/empty-body check. Fly-proxy HTML error pages (502/504 during machine cold start), empty bodies, or stalled responses threw a raw `SyntaxError: JSON Parse error` shown verbatim. |
| 2 | Admin Console layout | Single flat page of bare forms + raw `JSON.stringify` dumps; no VaultPop styling, no card grouping; non-admin sign-in produced only a thrown error string instead of a Restricted Access state. |
| 3 | Sign-in takes too long | `signInAccount()` used bare `fetch` with no AbortController timeout. Fly machine cold start (~10s) / fly-proxy stalls (15–60s) left the UI on "Signing in..." indefinitely; unguarded `response.json()` surfaced proxy HTML as parse errors. |
| 4 | Account Sync fails silently | `refreshAccountState()` shared the same untimed fetch + unguarded parse. Stalls left "Syncing account..." stuck forever; 401 (expired session) showed a generic message without clearing the session; no explicit success/failure copy. |
| 5 | VaultPass Plus unavailable | `app.vaultpop.vaultpass.monthly` IS correctly requested via `fetchProducts({type:"subs"})`, but when StoreKit returned no product the hero silently rendered a disabled "Available on the App Store" button with no explanation. |
| 6 | Rewarded ads give no feedback | `watchRewarded()` was `try/finally` with NO catch — ad init/show rejections escaped the voided promise silently. No immediate "Loading ad..." message, no "Daily reward limit reached." message, and load-failure vs closed-without-reward were indistinguishable. |

---

## FIXES APPLIED (targeted, no unrelated changes)

### 1+2 — Admin Console (`backend/admin-page.ts`, rebuilt)
- Safe `api()` helper: 15s AbortController timeout; body read as text, `JSON.parse` guarded; empty/HTML/non-JSON bodies map to friendly messages ("The request timed out. Please try again." / "The VaultPop service returned an unexpected response (STATUS)."). No raw parse errors can escape.
- Non-admin sign-in now lands on a dedicated **Restricted Access** panel ("This console is available to the VaultPop owner account only.") and the issued non-admin session is revoked immediately. 401/403 mid-session returns to sign-in with "Your session ended. Sign in again."
- Layout reconfigured into VaultPop-styled cards on the VaultPop palette (deep navy, gold/cyan/violet/emerald accents):
  - **Owner Status** — signed-in email, role, session expiry, console build.
  - **Operations Health** — live `/health` probe with latency + accounts-service probe, "Run Checks" button.
  - **Monetization Status** — purchase-verification probe (empty-body POST must return 400 → "LIVE · FAIL-CLOSED"), rewarded SSV readiness probe ("READY · FAIL-CLOSED"), production SSV URL display (`/support`).
  - **Support & Account Tools** — existing account search/manage, inventory + entitlement forms, audit log (all owner operations preserved).
- `[hidden]{display:none!important}` added so panel visibility is never overridden by card styles.
- CSP unchanged (`frame-ancestors 'none'`, self-only connect/form-action).

### 3 — Sign-in speed (`src/account/account-service.ts`)
- New `requestJson()` helper: hard 15s timeout via AbortController + safe text-first JSON parsing for **all** account endpoints (login, register, logout, account state).
- Timeout → "The VaultPop service took too long to respond. Please try again."; network failure → "…could not be reached. Check your connection and try again." No infinite spinner is possible; the button re-enables on every path.
- Primary sign-in updates the UI immediately on completion; nothing else blocks it (no secondary fetches exist in that flow).

### 4 — Account Sync (`src/account/account-service.ts`, `src/screens/account-screen.tsx`)
- Sync uses the same timed, parse-safe `requestJson()` and sends the session token as before.
- Explicit outcomes: success → **"Account synced."**; failure → **"Sync unavailable. Try again."**
- 401 now throws typed `SessionExpiredError` → the app clears the stale session and shows "Your session expired. Sign in again to sync."

### 5 — VaultPass Plus handling (`src/screens/shop-screen.tsx`)
- New `catalogState` (loading / ready / unavailable). While loading the button reads "Connecting to the App Store...".
- If StoreKit returns no product, the hero shows **"VaultPass is unavailable right now. Products load from the App Store on your device."** with a quiet "Currently Unavailable" button.
- "Restore Purchases" remains visible at all times. Product ID unchanged (`app.vaultpop.vaultpass.monthly`).

### 6 — Rewarded ads feedback (`src/screens/shop-screen.tsx`, `src/ads/ad-service.ts`)
- Immediate press states: **"Loading ad..."** (cyan, pending) → outcome.
- Full `try/catch/finally`: any ad init/show failure now shows **"Ad unavailable right now. Try again later."** — silent failures are impossible.
- **"Daily reward limit reached."** shows when a capped card is tapped (capped cards stay tappable for feedback; the pill still reads "DAILY LIMIT").
- `ad-service` rewarded results now include `shown`, so a load failure ("Ad unavailable right now…") is distinguished from an ad closed without reward ("The reward was not confirmed, so nothing was granted.").
- Eligibility check corrected: ads initialize first, then `canShowRewarded` gates the show (previously an ineligible state could still attempt to show).

---

## VALIDATION

- `pnpm run verify`: **PASS** — app typecheck, backend typecheck, **46/46 tests** (39 prior + 7 new Build 11 tests), banned-language / sample-ad-ID / secrets / navigation / monetization audits all green.
- New tests (`tests/build11.test.ts`):
  1. Sign-in surfaces friendly error on HTML-instead-of-JSON proxy responses (no SyntaxError).
  2. Sign-in handles empty response bodies without a parse crash.
  3. Real server error messages pass through to the UI.
  4. Stalled requests time out with a clear message instead of hanging.
  5. Account sync maps 401 → explicit `SessionExpiredError`.
  6. Account sync tolerates non-JSON responses without a parse crash.
  7. Admin console ships VaultPop cards + Restricted Access + safe JSON handling + intact CSP/no-store headers.

## VISUAL PROOF (`outputs/build11-proof/`, 7 shots)

- `admin-01-login.jpeg` — VaultPop-styled owner sign-in card only.
- `admin-02-dashboard.jpeg` — Owner Status / Operations Health (ONLINE, 5 ms) / Monetization Status (LIVE · FAIL-CLOSED, READY · FAIL-CLOSED, `/support`) / Support & Account Tools cards after admin login.
- `admin-03-restricted.jpeg` — player account login → Restricted Access panel.
- `account-01-signed-in.jpeg` — sign-in completed with immediate UI update.
- `account-02-synced.jpeg` — Account Sync → "Account synced." confirmation.
- `shop-01-vaultpass-unavailable.jpeg` — VaultPass hero with clean unavailable message.
- `shop-02-rewarded-feedback.jpeg` — rewarded press → "Ad unavailable right now. Try again later." feedback.

(Admin proofs captured against the real TS backend running locally with throwaway bootstrap credentials in a temp SQLite DB; nothing persisted or committed. App proofs captured on the live preview.)

## FILES CHANGED

- `backend/admin-page.ts` (rebuilt console)
- `src/account/account-service.ts` (timed, parse-safe requests + SessionExpiredError)
- `src/screens/account-screen.tsx` (sync outcome copy + session-expiry handling)
- `src/screens/shop-screen.tsx` (VaultPass unavailable state + rewarded feedback states)
- `src/ads/ad-service.ts` (rewarded result `shown` flag)
- `tests/build11.test.ts` (new, 7 tests)

## NOT DONE (per orders)

- EAS Build 11: NOT started. App Store Connect upload: NO. App Review submission: NO.
- AdMob SSV: untouched; production URL remains `https://vaultpop-api.fly.dev/support`; `/api/ads/ssv_callback` remains future/non-blocking.
- Hashrate Cloud Miner: untouched. No new features, no unrelated redesigns.

## NEXT STEP

Deploy the updated backend (`fly deploy -a vaultpop-api`) so the new `/admin` console goes live, then run the external **Build 11** through the standard preflight when approved.
