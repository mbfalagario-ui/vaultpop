# VaultPop — Premium UI Rescue (PRD / Memory)

## Original Problem Statement
User attached the VaultPop source ZIP (Expo/React Native coin puzzle arcade game, iOS-first, local-first, fictional in-game currency). Previous UI was rejected as childish/amateur/dashboard-like. Task: senior mobile-game UI rescue implemented in the actual app, screenshots-first, NO build, NO App Store upload, NO changes to bundle ID / signing / IAP product IDs / AdMob IDs, all functionality preserved (gameplay, modes, boosters, shop/IAP, ads deferral, account refresh, admin/reviewer login, support/legal).

## Architecture
- Canonical VaultPop project: `/app/vaultpop` (Expo 56, pnpm, TS strict, Node/TS backend for accounts+IAP verify, audit scripts, tests).
- Live preview harness: `/app/frontend` (platform Expo 54 template) running the SAME `src/` + `app/` routes; tsconfig `@/* -> ./src/*`; native-only modules (react-native-google-mobile-ads, react-native-iap, nitro) installed for Metro resolution but runtime-guarded (`process.env.EXPO_OS !== "ios"` guard added to `purchase-service.ts` — also synced to canonical project).
- `/app/frontend/app/_layout.tsx` is a preview-harness merge (keeps template icon-font prewarm); `/app/vaultpop/app/_layout.tsx` remains the original.
- `/app/backend` (FastAPI template) is unused by this app.
- Node 22 installed at `/opt/node22` (needed for `node:sqlite` in backend tests; run verify with `PATH=/opt/node22/bin:$PATH pnpm run verify` in `/app/vaultpop`).

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
- P1: Sound effects (settings toggle exists, no audio engine yet); haptics only on iOS.
- P1: Board clear cascade animation (tiles above falling) — currently instant refill with entrance spring.
- P2: Extract gameplay HUD/board/booster panel into components (file ~640 lines); shop card extraction.
- P2: textShadow*/useNativeDriver web-only dev warnings (harmless; migrate when RN versions align).
- P2: App icon / splash art pass to match new identity.
