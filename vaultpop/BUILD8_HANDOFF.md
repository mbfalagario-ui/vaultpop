# VAULTPOP — BUILD 8 HANDOFF

## Project Identity
- Expo account (owner): `pastrypuffz` · project (slug): `vaultpop` · EAS Project ID: `d9c9d243-9f5d-4839-ab0c-61d905857554`
- App name: **VaultPop** · Version: `1.0.0` · Bundle ID: `app.vaultpop` (unchanged)
- Build target: **iOS Build 8** · Purpose: **TestFlight / physical-device QA first**
- App Review submission: **NO — not authorized**

## Source State
- This zip is the exact Build 8 readiness patch state (see commit hash in `docs/release/diagnostic-report-build8.md` era; working tree committed at export time).
- Validation: `pnpm run verify` **PASS** (typecheck app+backend, **34/34 tests**, banned-language / sample-ads / secrets / navigation / monetization audits all green). Requires **Node >= 22.13** and **pnpm 10**.
- Preview E2E: 31/31 backend + 12/12 frontend flows pass.
- Code changed after the security/code audit: **NO** (audits ran on this exact state).

## Build Command (when explicitly authorized)
```bash
pnpm install --frozen-lockfile
pnpm run verify
eas build --platform ios --profile production
```
- EAS uses **REMOTE build numbers** (`cli.appVersionSource: "remote"`, production `autoIncrement: true`). Local `app.json` `ios.buildNumber` is ignored; EAS will assign Build 8's number — confirm in the EAS dashboard.
- Apple signing: managed EAS credentials on the `pastrypuffz` account (`appleTeamId UHF3KNM9F9`, `ascAppId 6784736480`). Nothing signing-related changed in this patch.

## Support URL status
- Source now serves a polished, responsive, branded support page at `GET /support` (FAQ, categories, support@vaultpop.app, fictional-content disclaimer, privacy reassurance; no debug output, no secrets).
- **The LIVE page at https://vaultpop-api.fly.dev/support still runs the OLD backend until the Fly deploy below is performed.**

## Rewarded SSV endpoint status
- Preferred endpoint implemented: `GET /api/ads/ssv_callback` — ECDSA-verified against Google's keys, fail-closed, idempotent per transaction_id (SQLite).
- Dual behavior implemented: if AdMob still calls `/support`, SSV parameters are detected and handled identically; normal browsers always get the support page.
- ACTION (owner, in AdMob console): set SSV callback for BOTH rewarded units (`.../3409891849` bonus life, `.../9333822278` vault coins) to `https://vaultpop-api.fly.dev/api/ads/ssv_callback`.
- The previously-flagged third-party SSV URL appears NOWHERE in source/config/docs (machine-audited).

## Leaderboard status
- Endpoints: `POST /v1/leaderboard/submit`, `GET /v1/leaderboard?mode=&installId=&limit=` — now SQLite-persisted (survives restarts; test-covered). Submits on round end; home card + leaderboard screen poll-refresh; 4 mode filters.
- **Live fly.dev currently 404s these routes — deploy required for device builds to show global ranks.**

## FLY DEPLOY READINESS
- Fly token available: **NO** (no Fly CLI or token exists in this build environment)
- Token can access vaultpop-api: **N/A — BLOCKED - FLY_TOKEN_DOES_NOT_ACCESS_VAULTPOP_API** (deploy portion only; source patching, validation, proof, and handoff are complete and unaffected)
- Target app for future deploy: **vaultpop-api** ONLY
- Hashrate Cloud Miner app touched: **NO** (and no such domain/callback/config exists anywhere in VaultPop)
- Fly deploy command (run from the repo root after `fly auth whoami` succeeds and `fly status -a vaultpop-api` confirms the target):
  ```bash
  fly deploy -a vaultpop-api
  ```
  Required server env (already expected by `backend/server.ts`): `VAULTPOP_ADMIN_PASSWORD`, `VAULTPOP_REVIEWER_PASSWORD`, `APPLE_ROOT_CA_PATHS`, optional `VAULTPOP_DATABASE_PATH` (must point at a persistent volume so leaderboards survive restarts).
- Post-deploy checks required:
  - `GET https://vaultpop-api.fly.dev/health` -> `{"status":"ok"}`
  - `GET https://vaultpop-api.fly.dev/support` -> polished branded page (mobile + desktop)
  - `GET https://vaultpop-api.fly.dev/api/ads/ssv_callback?signature=x&key_id=1` -> 4xx (fail closed, never 200 for invalid)
  - `POST /v1/leaderboard/submit` then `GET /v1/leaderboard?mode=classic` -> submitted score returned; repeat after `fly apps restart` to confirm persistence
- Secrets printed: **NO**

## Known non-blocking warnings (backlog — do not patch for Build 8)
1. Rate-limit keys trust left-most `x-forwarded-for` (junk-account spam only) — switch to `Fly-Client-IP` post-deploy.
2. Nav stack grows on repeated "Play Again" (long sessions only).
3. RN-Web console deprecation warnings (web preview only; absent in native builds).
4. Preview FastAPI mirror: wildcard CORS + unauthenticated zip delivery endpoints (preview-only, not shipped).

## Required next step
**USER VISUAL REVIEW of `vaultpop-build8-readiness-proof.zip` BEFORE Build 8.** Do not build, upload, or submit until explicitly approved.
