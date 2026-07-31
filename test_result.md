#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================
## Build 11 Admin Operations Completion (2026-07-24) — pending testing_agent verification
user_problem_statement: |
  Build 11 targeted correction: Admin Console was status-only, not operational. Required: Support Inbox
  (list/detail/reply/close, escalation visibility), AI Support Agent visibility, ads analytics (24h by
  reward type + failures + 30/day cap + SSV URL), purchase/premium analytics (estimated gross labeled),
  user management (ban/unban with reason + audit), password reset (admin-assisted + user "Forgot password?").
  Also fixed: preview mirror lacked /api/v1/auth/password-reset (app showed "reset unavailable").
backend:
  - task: "Ops endpoints on preview mirror: POST /api/v1/auth/password-reset (safe non-revealing), POST /api/v1/ads/events (202 valid / 400 invalid)"
    file: /app/backend/server.py
    status: needs_retesting
frontend:
  - task: "Account screen: 'Forgot password?' link under Sign In → safe message 'If an account exists...'"
    file: /app/frontend/src/screens/account-screen.tsx
    status: needs_retesting
  - task: "Shop rewarded buttons: press shows 'Loading ad...' then 'Ad unavailable right now. Try again later.' on web preview (ads unavailable); VaultPass unavailable message visible"
    file: /app/frontend/src/screens/shop-screen.tsx
    status: needs_retesting
  - task: "Account sign-in + Account Sync still work (qa.player@vaultpop.app / VaultPopQA2026!x) with 'Account synced.' confirmation"
    file: /app/frontend/src/screens/account-screen.tsx
    status: needs_retesting
notes: |
  Production TS backend (fly.dev) and its /admin operator console are OUT OF SCOPE for the testing agent
  (already live-verified via curl + identical local build screenshots + 51/51 node tests). Test ONLY the
  preview app (expo web) + preview FastAPI mirror /api endpoints.

## Build 15 QA Regression Fixes (2026-07-24) — pending testing_agent verification
user_problem_statement: |
  Build 15 critical QA regressions: (1) Admin Console missing for owner/admin account; (2) VaultPass Plus
  shows "Currently Unavailable"; (3) banner ads missing. Fixes: in-app Admin Console entry gated on
  role==="admin" (account + settings screens, opens backend /admin console); backend owner-protection
  guard (owner account cannot be demoted/disabled); resilient StoreKit catalog fetch (Promise.allSettled,
  missing-SKU diagnostics, Retry Loading Products button on VaultPass hero); resilient AdMob init
  (consent-failure fallback, retry on failed init, banner load/fail diagnostics, ATT-aware NPA flag).
backend:
  - task: "TS backend owner guard: demote/disable of owner account returns 400 (verified locally: login case-insensitive, analytics 200, demote 400, disable 400, role stays admin, /admin 200)"
    file: /app/vaultpop/backend/app.ts
    status: verified_by_main_agent_locally
frontend:
  - task: "Account screen: sign in as ADMIN qa.owner.b15@vaultpop.test / B15OwnerVerify!234 → 'Owner account' label + OWNER TOOLS section + 'Admin Console' button (testID account-admin-console-button)"
    file: /app/frontend/src/screens/account-screen.tsx
    status: needs_retesting
  - task: "Account screen negative: sign in as PLAYER qa.player@vaultpop.app / VaultPopQA2026!x → NO Admin Console button, 'Player account' label"
    file: /app/frontend/src/screens/account-screen.tsx
    status: needs_retesting
  - task: "Settings screen: while signed in as admin → 'Admin Console' button (testID settings-admin-console-button); while signed in as player → hidden"
    file: /app/frontend/src/screens/settings-screen.tsx
    status: needs_retesting
  - task: "Shop: on web preview StoreKit is unavailable → VaultPass hero shows 'Currently Unavailable' + unavailable caption + 'Retry Loading Products' button (testID shop-catalog-retry-button); retry press re-runs load and returns to unavailable state gracefully (no crash)"
    file: /app/frontend/src/screens/shop-screen.tsx
    status: needs_retesting
  - task: "Regression: existing flows still work — sign in/sync/sign out, Forgot password message, shop sections render (DAILY REWARDS, BOOSTER FORGE, coin packs)"
    file: /app/frontend/src/screens/*
    status: needs_retesting
notes: |
  AdMob banners and StoreKit purchases are NATIVE-iOS-ONLY and intentionally inert on web preview
  (AdBanner renders null; store session throws in web/Expo Go) — do NOT report these as bugs.
  Production TS backend (fly.dev) out of scope; owner guard verified locally by main agent.
  Admin QA account exists only in preview Mongo mirror (role flipped via DB).

## Build 17 Native Linking + Admin WebView Fix (2026-07-27) — pending testing_agent verification
user_problem_statement: |
  Build 16 failed on-device QA: native modules (AdMob/StoreKit) were not linked because frontend/app.json
  (the config the Emergent EAS build reads) lacked the react-native-google-mobile-ads and react-native-iap
  config plugins. Also the Admin Console used Linking.openURL (external Safari, forced second sign-in).
  Fixes: both app.json files now declare the mobile-ads plugin (prod app ID ca-app-pub-6035003811280283~7349136854,
  iOS+Android) + react-native-iap; new in-app /admin-console screen (WebView on native, browser-tab fallback on
  web preview) using a short-lived single-use handoff code -> secure HttpOnly cookie session (no token in URLs,
  no second sign-in); shop VaultPass owner-only diagnostics line + fallback copy.
backend:
  - task: "TS backend handoff endpoints (POST /v1/admin/handoff bearer-admin-only 201, GET /admin/handoff single-use 303 + Set-Cookie vp_admin HttpOnly/Secure/Lax, cookie auth on admin APIs, logout clears+revokes) — VERIFIED locally 10/10 by main agent, OUT OF SCOPE for testing agent"
    file: /app/vaultpop/backend/app.ts
    status: verified_by_main_agent_locally
  - task: "Preview mirror handoff: POST /api/v1/admin/handoff (201 admin / 403 player+anon), GET /api/admin/handoff?code= (200 once, 403 replay)"
    file: /app/backend/server.py
    status: needs_retesting
frontend:
  - task: "Admin entry now navigates in-app: account screen OWNER TOOLS 'Admin Console' link (testID account-admin-console-button) -> /admin-console route; settings has settings-admin-console-button; NO external Linking.openURL"
    file: /app/frontend/src/screens/account-screen.tsx, /app/frontend/src/screens/settings-screen.tsx
    status: needs_retesting
  - task: "/admin-console screen (admin qa.owner.b15@vaultpop.test / B15OwnerVerify!234): shows OWNER TOOLS header + 'Open Admin Console' button (testID admin-console-open-button) on web preview after session handoff; player/signed-out users see RESTRICTED view with testID admin-console-restricted-account-link"
    file: /app/frontend/src/screens/admin-console-screen.tsx
    status: needs_retesting
  - task: "Shop VaultPass: caption now 'VaultPass is unavailable right now. Please try again later.'; Retry button (shop-catalog-retry-button) still works; ADMIN user additionally sees diagnostics line (testID shop-vaultpass-diagnostics) naming requested SKU app.vaultpop.vaultpass.monthly; player does NOT see diagnostics"
    file: /app/frontend/src/screens/shop-screen.tsx
    status: needs_retesting
  - task: "Regression: player sign-in/sync/sign-out, forgot password, shop sections (DAILY REWARDS/BOOSTER FORGE/coin packs), no admin buttons for player"
    file: /app/frontend/src/screens/*
    status: needs_retesting
notes: |
  WebView renders ONLY on native iOS/Android builds — on web preview the admin-console screen intentionally
  shows the 'Open Admin Console' browser-tab fallback; do NOT report that as a bug. AdMob/StoreKit remain
  native-only and inert on web. Production TS backend out of scope (verified 10/10 locally by main agent).

## Build 17 VaultPass Product ID Reconciliation (2026-07-28) — pending testing_agent verification
user_problem_statement: |
  App Store Connect ground truth shows the VaultPass subscription product ID is
  app.vaultpop.vaultpass.plus.monthly (status Prepare for Submission), NOT app.vaultpop.vaultpass.monthly.
  All source references updated to the ASC ID (catalog, economy, shop/settings screens, backend ledgers,
  tests, monetization audit, docs, mirror copies). New test asserts exactly one VaultPass SKU in source
  matching ASC. UI name stays "VaultPass Plus".
frontend:
  - task: "Shop (web preview, StoreKit inert): VaultPass hero still stable — disabled 'Currently Unavailable', caption 'VaultPass is unavailable right now. Please try again later.', Retry button works without crash; ADMIN (qa.owner.b15@vaultpop.test / B15OwnerVerify!234) sees diagnostics line (testID shop-vaultpass-diagnostics) now containing app.vaultpop.vaultpass.plus.monthly (the NEW ID, not the old one); PLAYER (qa.player@vaultpop.app / VaultPopQA2026!x) does not see diagnostics"
    file: /app/frontend/src/screens/shop-screen.tsx
    status: needs_retesting
  - task: "Quick regression: shop sections render (DAILY REWARDS, BOOSTER FORGE, COIN PACKS); settings VaultPass restore row unaffected; admin console entry still works in-app"
    file: /app/frontend/src/screens/*
    status: needs_retesting
notes: |
  This is a small targeted change (SKU string swap). Frontend-only verification needed; backend mirror has
  no SKU references. WebView/StoreKit/AdMob remain native-only — not bugs on web preview.

## Build 18 Pre-Review: Diagnostics + Dopamine Visual Refresh (2026-07-30) — pending testing_agent verification
user_problem_statement: |
  Final pre-review fixes: (1) ads init now records owner-visible diagnostics (consent/ATT/init state,
  per-placement banner results); (2) StoreKit diagnostics (requested/returned/missing SKUs, errors) in an
  owner-only card on Settings; (3) backend /v1/admin/diagnostics + admin-page Run Checks rewrite (staged
  cold-start retries, DB/storage/adminApi/uptime rows) — deployed to Fly; (4) dopamine visual refresh:
  deep navy/black base, electric cyan/neon emerald/magenta accents, glowing PLAY pulse, aspirational
  VaultPass hero, stronger button glow + press scale. NO functional flow changes intended.
frontend:
  - task: "Visual refresh regression pass: Home (PLAY glow, metric band, mode cards), Shop (VaultPass hero with MEMBER PICK magenta eyebrow, retry flow, rewarded cards, coin packs), Mode Select, Support, Settings, Account all render correctly with new navy/neon palette — no blank screens, no unreadable text, no broken layout"
    file: /app/frontend/src/theme/colors.ts, /app/frontend/src/components/screen-shell.tsx
    status: needs_retesting
  - task: "Owner diagnostics card: sign in as ADMIN qa.owner.b15@vaultpop.test / B15OwnerVerify!234 -> /settings shows OWNER DIAGNOSTICS card (testID owner-diagnostics-card) with ads + STOREKIT sections; PLAYER qa.player@vaultpop.app / VaultPopQA2026!x does NOT see it"
    file: /app/frontend/src/components/owner-diagnostics-card.tsx, /app/frontend/src/screens/settings-screen.tsx
    status: needs_retesting
  - task: "Shop VaultPass unchanged behavior: 'Currently Unavailable' + caption + Retry button still stable (web preview, StoreKit inert); admin diagnostics line shows app.vaultpop.vaultpass.plus.monthly"
    file: /app/frontend/src/screens/shop-screen.tsx
    status: needs_retesting
  - task: "Core flows regression: sign in/out, account sync, admin console entry -> /admin-console, gameplay round can start from PLAY (just verify navigation, not full gameplay)"
    file: /app/frontend/src/screens/*
    status: needs_retesting
notes: |
  Production TS backend diagnostics endpoint deployed + verified by main agent (200 w/ admin auth locally,
  403 anon in production; /admin page serves new Run Checks UI). Preview FastAPI mirror does NOT implement
  /v1/admin/diagnostics — do not test it there, not a bug. Ads/StoreKit/WebView native-only on web preview.

## Build 20 FINAL: Shop reliability + per-user ad caps + live customization + gameplay polish (2026-07-31) — pending testing_agent verification
user_problem_statement: |
  BUILD 20 consolidated regression fix: (1) Shop purchase-busy state now ALWAYS clears on cancel/failure
  (root cause of swallowed taps: onError never cleared busyProductId); purchase diagnostics classify
  initial/renewal/restore/duplicate-ignored/no-grant-due. (2) Rewarded cap is per account/install + UTC day:
  client SSV options now send userId, backend cap is admin-configurable (default + per-user override +
  usage + reset) via /v1/admin/rewarded-caps*, public GET /v1/ads/quota; client fetches its cap.
  (3) Customization styles now drive the real renderer: per-style tile gradients, tile shape
  (coin/square/gem), board surface/border, selection ring; preview rows in shop. (4) Gameplay: 3-2-1-GO
  countdown blocks input+timer until GO with sound/haptic cues, hidden in-board boosters (round-only
  effects, never persistent inventory), squash-pop tiles, particles, floating score, combo milestones
  (x4/x8/x12), richer round summary (two stat rows + hidden-boosters chip).
backend:
  - task: "Preview mirror GET /api/v1/ads/quota?userId=... returns {userId,cap:30,remaining,utcDay}; userId <4 chars -> 400"
    file: /app/backend/server.py
    status: needs_retesting
  - task: "Production TS backend (fly.dev) — ALREADY VERIFIED BY MAIN AGENT: /health 200, /v1/ads/quota 200, /v1/admin/rewarded-caps 403 anon, /admin page 200. 91/91 local tests incl. two-user cap isolation + admin cap CRUD. DO NOT hammer production."
    file: /app/vaultpop/backend/app.ts, /app/vaultpop/backend/ops-store.ts, /app/vaultpop/backend/ssv.ts
    status: passed
frontend:
  - task: "Gameplay countdown: PLAY -> /gameplay shows 3-2-1-GO overlay (testID gameplay-countdown); timer stays at 60s until GO; taps during countdown do nothing; Pause/Restart/Finish disabled during countdown; after GO round plays normally, tiles pop with floating score feedback"
    file: /app/frontend/src/screens/gameplay-screen.tsx
    status: needs_retesting
  - task: "Customization live renderer: Shop -> Styles & Customization shows a 5-coin preview row per style (different palettes; Cyan Circuit = square chips, Violet Neon/VaultPass Prism = gem cut); board in gameplay uses active style surface + tiles"
    file: /app/frontend/src/screens/shop-screen.tsx, /app/frontend/src/components/coin-face.tsx, /app/frontend/src/components/coin-tile.tsx
    status: needs_retesting
  - task: "Shop busy-state never sticks (web preview: StoreKit inert -> tapping buy shows 'App Store is unavailable' and buttons stay tappable); rewarded section reads 'X / 30 rewarded ads used today (your account)' and 'Daily limit per player: 30'"
    file: /app/frontend/src/screens/shop-screen.tsx
    status: needs_retesting
  - task: "Round summary: finish a round -> /results shows two stat rows (BEST/CHAIN/VAULTS + BEST GROUP/POPS/HIDDEN BOOSTERS) and a violet 'HIDDEN BOOSTERS FOUND' chip when boosters > 0"
    file: /app/frontend/src/screens/round-result-screen.tsx
    status: needs_retesting
  - task: "Core regression: sign in (qa.player@vaultpop.app / VaultPopQA2026!x), settings, shop scroll, support, admin console entry for qa.owner.b15@vaultpop.test / B15OwnerVerify!234"
    file: /app/frontend/src/screens/*
    status: needs_retesting
notes: |
  Ads/StoreKit/haptics are native-only: on web preview rewarded buttons report unavailable and StoreKit
  buys show 'App Store is unavailable' — NOT bugs. Hidden boosters are invisible by design until popped
  (feedback chip '★ HIDDEN ...' appears). Countdown lasts ~2.8s. Style unlocks cost style points earned
  by playing; verifying the preview rows + default style application is sufficient.
