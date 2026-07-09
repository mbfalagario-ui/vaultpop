# VaultPop — Premium UI Rescue (PRD / Memory)

## Build 8 Shop Polish Correction (2026-07-09, latest)
Audit-failed visual QA correction, no scope broadening. Verify PASS (34/34 + audits).
- Shop rebuilt on clean grid: Inventory → VaultPass hero (compact, production copy, price w/o "/month" dup) → DAILY REWARDS section (premium RewardCard components w/ WATCH AD chips, ready/loading/capped/unavailable states, N/30 progress bar) → Booster Forge → Styles & Customization → Coin Packs & Upgrades → Restore/legal.
- ROOT CAUSE FIX: screen-shell ambient Animated.loops now isInteraction:false (they permanently blocked InteractionManager → store session init stalled, incl. on device); shop now inits store session directly (no InteractionManager gate).
- ActionLink labels single-line auto-fit (fixed "Create Account" wrap).
- Fly token PROVIDED by user & verified READ-ONLY: can access vaultpop-api (fly v0.4.68 at /root/.fly/bin; token in session env only, NEVER in files/commits). DEPLOY NOT RUN — awaits explicit user approval post visual review.
- New proof: vaultpop-build8-polish-correction-proof.zip (15 shots + contact sheet) served at /api/proof/build8-correction; source zip rebuilt (incl. correction proof + updated handoff/reports).
- Audit-navigation shop copy expectations updated (DAILY REWARDS/WATCH AD strings).
- Status: awaiting USER VISUAL REVIEW before Build 8 + Fly deploy approval.

## Build 8 Readiness Patch (2026-07-08)
User-approved full patch, all phases complete, verify PASS (34/34 tests + 5 audits), E2E 31/31 backend + 12/12 UI flows.
- ROOT CAUSE leaderboards: live fly.dev backend is OLD (404 on /v1/leaderboard) — source now has SQLite persistence (backend/leaderboard-store.ts); FLY DEPLOY still required by user (no Fly token in env → deploy portion BLOCKED, documented in BUILD8_HANDOFF.md).
- /support: polished branded page (backend/support-page.ts) + AdMob SSV dual behavior; preferred SSV endpoint /api/ads/ssv_callback (backend/ssv.ts — ECDSA fail-closed, idempotent, SQLite ledger).
- Public registration: POST /v1/auth/register (player-only, scrypt, 5/hr/IP) in TS backend + FastAPI preview mirror (/api/v1/auth/*, /api/v1/support/tickets in server.py, Mongo).
- Shop reworked: compact header, VaultPass hero w/ AD-FREE + PRIORITY SUPPORT chips, both rewarded CTAs top (new unit .../9333822278 = 10 Vault Coins; grantRewardedVaultCoins shares 30/day cap), Booster Forge confirmations, Styles & Customization merged in (cosmetics-screen.tsx = Redirect to /shop).
- Settings hub: Gameplay Settings page (/gameplay-settings), Create Account/Sign In/Account Sync/Sign Out wording, FAQ (/faq), Support Assistant (/assistant, structured FAQ intents only — NO LLM), support links.
- Motion rebalance: coin entrance 10px settle (was 1.4x drop), reduced-motion keeps fades/glow/score pulse/vault flash.
- Audits expanded: banned-language now includes Coin Forge/hashrate/cryptocurrency/gambling; navigation + monetization updated; new tests tests/build8.test.ts.
- Deliverables (also served): /api/proof/build8, /api/export/build8-final-source; BUILD8_HANDOFF.md + 3 reports in /app/vaultpop/docs/release/.
- Env notes: Node22 + pnpm10 must be reinstalled after fork (npm i -g pnpm@10; node22 → /opt/node22). Python playwright must use /pw-browsers/chromium_headless_shell-1208/chrome-linux/headless_shell (system chrome crashes under playwright). Local TS backend test run: port 8787 w/ APPLE_ROOT_CA_PATHS=backend/certs/*.
- Preview creds: qa.player@vaultpop.app / VaultPopQA2026!x (see /app/memory/test_credentials.md).
- Status: awaiting USER VISUAL REVIEW before Build 8. Do not build/deploy/submit.

## Iteration 4 Polish Patch (2026-07-06)
- Merged gameplay header into ONE line per mode via `getModeHeading()` in theme/mode-visuals.ts (exported from @/theme): "Vault Reactor - Classic", "Prism Chain - Daily Vault", "VaultPop Run - Streak", "VaultPop Blitz" (label deduped when name already contains it). Gameplay ScreenShell no longer passes eyebrow; inline BackChip title got numberOfLines=1 + adjustsFontSizeToFit (minScale 0.6). Results eyebrow also uses getModeHeading.
- Home navigation added: results screen "Home" ActionLink (testID result-home) under "Choose Another Mode"; mode-select "Home" link (modes-home) above ad banner; gameplay paused row now Resume/Modes/Home (gameplay-home-link). Click-through verified via Playwright.
- Also from prior turn (user-approved, carried over): two-line centered tagline, cinematic backgrounds, feedback lane.
- Files synced BOTH copies: /app/frontend/src/** (live preview) AND /app/vaultpop/src/** (canonical repo w/ verify). Keep them in sync!
- Proof: /app/vaultpop/outputs/iteration4-proof (12 screens + contact sheet), zip /app/vaultpop-iteration4-polish-proof.zip, capture script /app/capture_iteration4_proof.py (python playwright, chrome at /usr/bin/google-chrome).
- Verify PASS with Node 22: typechecks, 26/26 tests, all audits (banned-language = zero "Coin Forge").
- Status: awaiting user visual review (FINAL VERDICT block delivered).

## Iteration 3 Polish Patch (2026-07-05)
- Brand fix: "Coin Forge" removed everywhere → streak mode renamed "VaultPop Run", meter label "Chain Core"; blitz eyebrow "VaultPop Blitz". Zero occurrences in src/app/proof assets.
- New 4th mode **Blitz** (`blitz`): 30s speed run, magenta/cyan identity. Touched: models.ts (GameModeId), constants.ts (GAME_MODES, roundSeconds 30), engine.ts (createInitialRound uses getModeDefinition roundSeconds), mode-visuals.ts, save-model.ts (highScores.blitz in defaults + fallback), normalizeMode in gameplay+results, MODE_GLYPHS maps (mode-card/results/share-card/leaderboard/home), leaderboard MODES chips, backend VALID_MODES (FastAPI) + LEADERBOARD_MODES (TS backend), how-to-play copy.
- Home Pick Your Vault → deterministic 2×2 grid (explicit row pairs, each tile wrapped in flex:1 View — Link asChild alone did NOT stretch equally on web).
- Gameplay formatting: score uses adjustsFontSizeToFit/minimumFontScale 0.55 (no combo/timer collision), board height-capped via useWindowDimensions (min(width-2md, height-460), floor 260) so gameplay fits without scrolling on small iPhones, shell top padding insets.top+md.
- Button depth pass (all screens via shared components): ActionButton quiet/danger + ActionLink non-prominent now use vertical gradient (#232048→#141126 / ruby-tinted), borderBright, drop shadow + accent glow, top hairline sheen.
- Proof: /app/vaultpop/outputs/iteration3-proof (12 screens + contact sheet), zip /app/vaultpop-iteration3-polish-proof.zip. Verify PASS; testing agent iteration_3 PASS (backend 12/12 incl blitz).
- NOTE: /opt/node22 gets wiped between sessions — reinstall Node 22 (nodejs.org arm64) + `npm i -g pnpm@10` before running `pnpm run verify` in /app/vaultpop.

## Original Problem Statement
User attached the VaultPop source ZIP (Expo/React Native coin puzzle arcade game, iOS-first, local-first, fictional in-game currency). Previous UI was rejected as childish/amateur/dashboard-like. Task: senior mobile-game UI rescue implemented in the actual app, screenshots-first, NO build, NO App Store upload, NO changes to bundle ID / signing / IAP product IDs / AdMob IDs, all functionality preserved (gameplay, modes, boosters, shop/IAP, ads deferral, account refresh, admin/reviewer login, support/legal).

## Architecture
- Canonical VaultPop project: `/app/vaultpop` (Expo 56, pnpm, TS strict, Node/TS backend for accounts+IAP verify, audit scripts, tests).
- Live preview harness: `/app/frontend` (platform Expo 54 template) running the SAME `src/` + `app/` routes; tsconfig `@/* -> ./src/*`; native-only modules (react-native-google-mobile-ads, react-native-iap, nitro) installed for Metro resolution but runtime-guarded (`process.env.EXPO_OS !== "ios"` guard added to `purchase-service.ts` — also synced to canonical project).
- `/app/frontend/app/_layout.tsx` is a preview-harness merge (keeps template icon-font prewarm); `/app/vaultpop/app/_layout.tsx` remains the original.
- `/app/backend` (FastAPI template) is unused by this app.
- Node 22 installed at `/opt/node22` (needed for `node:sqlite` in backend tests; run verify with `PATH=/opt/node22/bin:$PATH pnpm run verify` in `/app/vaultpop`).

## What Was Implemented — Iteration 2 (2026-07-05)
1. Gameplay formatting fixes: compact inline header (back chip + mode label in one row via ScreenShell `inlineHeader`), screen fits 844pt viewport without scroll; shell root `overflow: hidden` fixed the white page gap + pale aurora blob leaking below content on web; violet blob switched to rgba.
2. Global leaderboard (fills home bottom gap): FastAPI endpoints in /app/backend/server.py (`POST /api/v1/leaderboard/submit`, `GET /api/v1/leaderboard`, Mongo `leaderboard_scores`, max-score-per-install upsert, rank calc); matching in-memory routes added to /app/vaultpop/backend/app.ts; `src/social/leaderboard-service.ts` (base URL: EXPO_PUBLIC_VAULTPOP_API_URL — added to frontend/.env pointing at preview /api), `player-identity.ts` (auto handle "Vault-XXXX"); home GLOBAL VAULT RANKS card (15s poll) + /leaderboard screen (mode chips, podium, 10s poll, YOU highlight); auto-submit on results.
3. Dopamine pass: score pulse on change, combo tier colors (accent→gold@4x→ruby "ON FIRE"@8x), vault-open gold flash (0.26 peak) + chime, cascade tile drops (fall from above, bottom rows first, per-row stagger), coin confetti rain on results, PLAY button pulse loop, all gated by reducedMotion.
4. New features: daily streak tracker (`src/social/streak-tracker.ts`, own storage key `vaultpop.streak.v1` — save-model untouched) + /streaks calendar screen + home/results streak chips; share-score-card image export (`share-score-card.tsx` ViewShot + expo-sharing, ScoreCardHandle imperative capture, graceful web fallback note); SFX engine (`src/audio/sfx.ts`, expo-audio, generated WAVs in assets/sfx: pop/thud/chime/zap/win, gated by soundEnabled); new app icon (assets/icon/icon.png, 1024 gold coin on dark radial) + splash mark (frontend/assets/images/splash-image.png).
- Deps added (both projects): expo-audio, react-native-view-shot, expo-sharing, (iter1: expo-linear-gradient).
- Validation: `pnpm run verify` PASS; testing agent iteration 2: backend 10/10 + all frontend flows PASS (test_reports/iteration_2.json); backend tests at /app/backend/tests/test_leaderboard.py.

## What Was Implemented (2026-07-05)
Design system rewrite (identical source in both trees):
- `src/theme/`: colors (deep navy-violet base + gold/cyan/emerald/violet/magenta accents), typography scale (900-weight display/numerals, spaced eyebrows), spacing + radius tokens, color-utils (lighten/darken), mode-visuals (per-mode auroras, tile gradient palettes).
- `src/components/`: screen-shell (cinematic layered-gradient background + aurora glows), coin-face (premium coin: gradient face, rim, minting ring, specular, solid glyph), coin-tile (measured size, selection halo, pop-burst ring, entrance spring), arcade-glyph (solid mature glyphs: diamond/bolt/delta/ring/spark), vault-meter ("vault core" with lock medallion, segment ticks, glow fill, gold flare on open), booster-control (power-up medallions + gold count badges), action-button/action-link (gold gradient primary, glass secondary), mode-card (cinematic gradient cards + PLAY pill), hud-stat, metric-card, status-pill, game-logo (VAULT white / POP gold italic 900 wordmark).
- `src/screens/`: home (hero coin cluster + giant PLAY + status band + mode teasers + quiet footer), mode-select, gameplay (cinematic HUD: time pill / glowing score / combo badge, framed board, booster arcade panel, feedback pop pill), results (medal + rays, count-up score, NEW PERSONAL BEST badge, rewards, PLAY AGAIN), shop (premium product cards w/ coin medallions + badges, Booster Forge, restore, fictional-currency disclaimer), account, settings, cosmetics, pause. how-to-play/support/legal inherit the new system.
- All logic (engine, storage, monetization, ads policy, account service) untouched except the web guard in purchase-service.
- testIDs added across all interactive elements.

## Validation
- `pnpm run verify` in /app/vaultpop: PASS (typecheck app+backend, 26/26 tests, banned-language, sample-ads, secrets, navigation, monetization audits).
- Testing agent: 19/19 frontend flows PASS (test_reports/iteration_1.json).
- Proof: `/app/vaultpop/outputs/premium-ui-proof/*.png` (8 screens @2x + contact-sheet.png), zip at `/app/vaultpop-premium-ui-proof.zip`.

## Constraints Honored
No build/upload/submission; bundle ID, signing, IAP IDs, AdMob IDs unchanged; no crypto/earning language (audit-enforced); no secrets printed/committed.

## Backlog / Next
- P2: Their TS backend leaderboard store is in-memory (resets on deploy restart) — persist to sqlite if they want durable global ranks on fly.io.
- P2: Editable player handle; leaderboard pagination.
- P2: textShadow*/useNativeDriver web-only dev warnings (harmless; migrate when RN versions align).
- P2: Extract gameplay HUD/board/booster panel into components; shop card extraction.

## Build 8 Backend Deploy + Handoff — COMPLETE (2026-07-09, forked session)
- Prior `fly deploy -a vaultpop-api` HAD COMPLETED (CLI timeout was cosmetic). NO redeploy run. Fly token NOT present in this forked env (was session-only) and was NOT needed.
- Live verification ALL PASS on https://vaultpop-api.fly.dev: /health 200; /support polished HTML; /api/ads/ssv_callback fail-closed 400 (no params + forged key_id); /support SSV dual behavior fail-closed; leaderboard submit/fetch 200 with SQLite persistence across live machine restart; auth register (409 dup)/login 200/bad-pw 401/bad-JSON 400; security probes clean (404 JSON, /.env 404, admin 403, no stack traces/secrets).
- Live reliability caveat documented (NOT app code): behind fly-proxy, request after a POST-with-body can stall 15-60s and occasionally trip health-check restart (503 burst, self-recovers). Reproduced live 4x; local Node 24 load tests (keep-alive, chunked, 10x parallel) all clean. Recommendation in handoff: min_machines_running=1 before launch.
- `pnpm run verify` rerun with local Node 24.4.1 (/tmp/node-v24.4.1-linux-arm64/bin): PASS 34/34 + all audits. Banned-language scan: zero Hashrate/Coin Forge/crypto refs.
- BUILD8_HANDOFF.md updated: Live Deploy Verification addendum (all Step-3 fields), stale "old backend"/"404s"/"deploy pending" lines corrected, FLY DEPLOY section marked COMPLETED & VERIFIED, next step = external Build 8 execution + AdMob SSV URL pointing.
- /app/vaultpop-build8-final-source.zip REBUILT (311 files, includes updated handoff + embedded correction proof zip; no .env/dist/node_modules). Proof zip + 3 release reports confirmed present.
- EAS Build 8 / ASC upload / App Review: NOT started (per orders). Hashrate app: untouched.
