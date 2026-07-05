# VaultPop — Premium UI Rescue (PRD / Memory)

## Iteration 3 Polish Patch (2026-07-05, latest)
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
