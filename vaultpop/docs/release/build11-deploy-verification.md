# Build 11 — Live Backend Deploy Verification Notes

Date: 2026-07-24
Deploy: `fly deploy -a vaultpop-api` (only `vaultpop-api` touched; Hashrate Cloud Miner untouched)
Result: SUCCESS — machine `847560c9de6498` updated, smoke + health checks passed, "Machine … is now in a good state", DNS configuration verified.

## Pre-deploy gate (all PASS)
- `pnpm run verify`: PASS — app typecheck, backend typecheck, 46/46 tests, banned-language / sample-ad-ID / secrets / navigation / monetization audits.
- Fly target confirmed from `fly.toml`: `app = "vaultpop-api"`.
- HashrateCloudMiner functional references: NONE (only compliance assertions that it is absent, plus the test that enforces absence).
- EAS Build 11: NOT started.

## Live verification on https://vaultpop-api.fly.dev (all PASS)

| Check | Result |
|-------|--------|
| `GET /health` | 200 `{"status":"ok"}` |
| `GET /support` | 200 polished VaultPop Support HTML (`<title>VaultPop Support</title>`, 7,979 bytes) |
| `GET /admin` | 200 — NEW Build 11 console live; verified markers: "VaultPop Admin Console", "Restricted Access", "Owner Status", "Operations Health", "Monetization Status", "Support &amp; Account Tools", `[hidden]{display:none!important}`, timeout guard (`controller.signal.aborted`) |
| `GET /v1/admin/audit` (no auth) | 403 `{"error":"Admin authorization required."}` |
| `GET /v1/admin/accounts` (invalid bearer) | 403 `{"error":"Admin authorization required."}` |
| `POST /v1/auth/login` (live QA player account) | 200 — token issued, role `player` |
| `GET /v1/account` (valid bearer) | 200 `{state: …}` — account sync data path healthy |
| `GET /v1/account` (bogus bearer) | 401 `{"error":"Authentication required."}` — drives the app's new SessionExpiredError handling |
| `POST /v1/leaderboard/submit` | 200 `{"accepted":true,"bestScore":4321,"rank":2}` |
| `GET /v1/leaderboard?mode=classic` | 200 — includes pre-deploy entry from 2026-07-09 ⇒ SQLite volume persisted across deploy |
| `GET /does-not-exist` | 404 JSON `{"error":"Not found."}` (no stack trace) |
| `GET /.env` | 404 JSON (no file disclosure) |
| `POST /v1/auth/login` (malformed JSON body) | 400 `{"error":"Invalid sign-in request."}` (no crash, no trace) |

## Secrets / token hygiene
- Fly token used session-only from a temp env file outside the repo; shredded immediately after deploy.
- TOKEN_PERSISTENCE_NOT_AVAILABLE_SECURELY: no secure persistent secret store exists in this environment, so the token was NOT stored for future deploys.
- Post-deploy scan: no token material in source, logs referenced by this handoff, screenshots, or packages (the only `FlyV1|fm2_` match in the repo is the secret-scan regex itself in `scripts/audit-secrets.mjs`).

## Unchanged (per orders)
- Production AdMob SSV URL: https://vaultpop-api.fly.dev/support
- `/api/ads/ssv_callback`: future/non-blocking only
- EAS Build 11: NOT started · App Store Connect upload: NO · App Review submission: NO
