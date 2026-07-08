# VaultPop Build 8 — Full App + Backend Diagnostic Report

Date: 2026-07-08 · Scope: pre-patch diagnostic (Phase 1) and post-patch state.

## Root causes found (pre-patch)

| # | Area | Finding | Severity | Status |
|---|------|---------|----------|--------|
| 1 | Leaderboards | Deployed fly.dev backend returned `404 Not found` for `/v1/leaderboard` — the leaderboard endpoints existed only in un-deployed source. This is THE reason global ranks never updated after rounds on device builds. | BLOCKER (release) | FIXED in source; requires Fly deploy |
| 2 | Leaderboards | Source implementation was in-memory only (`Map`) — every backend restart wiped all scores. | HIGH | FIXED: SQLite persistence (`backend/leaderboard-store.ts`), restart-survival test added |
| 3 | Support URL | `GET /support` served a bare two-sentence HTML page — looked abandoned/low-trust. | HIGH (App Review trust) | FIXED: polished branded landing page (`backend/support-page.ts`) |
| 4 | Rewarded ads | No server-side verification (SSV) existed anywhere; no second rewarded placement; no shared-cap enforcement tests. | HIGH | FIXED: `/api/ads/ssv_callback` + dual behavior on `/support`, fail-closed ECDSA verification, idempotent transaction ledger, shared 30/day cap with tests |
| 5 | Shop | Header wasted vertical space; VaultPass buried mid-list; single rewarded CTA at the bottom; Booster Forge gave no redemption confirmation. | MEDIUM | FIXED: compact header, VaultPass hero first, both rewarded CTAs near top, per-booster success/insufficient messages |
| 6 | Arcade Styles | Redundant standalone page duplicating Shop intent. | MEDIUM | FIXED: merged into Shop as "Styles & Customization"; `/cosmetics` kept as a redirect (no broken routes) |
| 7 | Settings | "Optional inventory and support sync" wording confusing; no account creation existed at all (accounts were admin-created only); toggles mixed with account/actions. | MEDIUM | FIXED: Create Account / Sign In / Account Sync / Sign Out / "Signed in as", new public registration endpoint (player role only, rate-limited), Gameplay Settings sub-page |
| 8 | Help | No FAQ page, no support assistant. | MEDIUM | FIXED: FAQ page (16 entries, 8 categories), structured on-device Support Assistant with escalation |
| 9 | Gameplay motion | Full-board drop cascade (tiles fell 1.4x their size with long row stagger) made every pop feel like the board was shaking; Reduced Motion removed nearly all feedback. | MEDIUM | FIXED: entrance drop reduced to a 10px settle with tighter stagger; Reduced Motion now keeps fade-in, selection glow, gentle score pulse, feedback pill fade, and a soft vault flash |
| 10 | Banned language | None found. Zero "Coin Forge", zero references to the previously-flagged third-party SSV domain, zero crypto/financial wording in consumer surfaces. | — | Audit expanded (new banned terms + "Coin Forge" now machine-checked) |

## Source sync check
`/app/frontend/src` (preview) and `/app/vaultpop/src` (canonical repo) are byte-identical after the patch, except for preview-environment-only files (`src/hooks`, `src/utils`, `app/+html.tsx`, font-loading lines in `app/_layout.tsx`) that are not part of the shipped repo. No SOURCE_SYNC_MISMATCH.

## Post-patch validation
- `pnpm run verify`: PASS (typecheck app + backend, 34/34 tests, banned-language, sample-ads, secrets, navigation, monetization audits)
- New tests: registration (role lock, 409, 400, 429), leaderboard submit/fetch/mode-filter, SQLite restart persistence, SSV signature accept/tamper/unknown-key/idempotency, /support dual behavior + page content, shared 30/day rewarded cap + rewardId idempotency, booster forge affordability, FAQ intent search
- E2E (preview): 31/31 backend API cases + 12/12 frontend flows pass (testing agent, iteration_3 report)
- Local run of the patched TS backend verified: register 201/409, leaderboard submit/fetch, persistence across process restart, SSV fail-closed 400, polished /support page (200, HTML)

## Non-blocking warnings (backlog)
1. Registration/login rate-limit keys derive from the left-most `x-forwarded-for` value (spoofable in theory; spam-accounts impact only). Consider trusting only the proxy-appended hop after deploy.
2. Preview FastAPI mirror uses wildcard CORS (preview-only, bearer tokens, not shipped).
3. Navigation stack grows on repeated "Play Again" (carried from Build 6 audit; long-session only).
4. React Native Web console deprecation warnings (pointerEvents/textShadow/useNativeDriver) — web preview only, not present in native builds.
