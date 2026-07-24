# Build 11 — Live Backend Deploy Verification Notes

Date: 2026-07-24
Deploy: `fly deploy -a vaultpop-api` (only `vaultpop-api` touched; no other Fly app or unrelated backend touched)
Result: SUCCESS — machine `847560c9de6498` updated, smoke + health checks passed, "Machine … is now in a good state", DNS configuration verified.

## Pre-deploy gate (all PASS)
- `pnpm run verify`: PASS — app typecheck, backend typecheck, 46/46 tests, banned-language / sample-ad-ID / secrets / navigation / monetization audits.
- Fly target confirmed from `fly.toml`: `app = "vaultpop-api"`.
- Unrelated-app references in the codebase: NONE (verified by the automated language audit, which also enforces their absence in tests).
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
- Post-deploy scan: no token material in source, logs referenced by this handoff, screenshots, or packages (the automated secret audit passes; its own detection patterns are the only place token formats are referenced).

## Unchanged (per orders)
- Production AdMob SSV URL: https://vaultpop-api.fly.dev/support
- `/api/ads/ssv_callback`: future/non-blocking only
- EAS Build 11: NOT started · App Store Connect upload: NO · App Review submission: NO

---

# Admin Operations Completion — second Build 11 deploy (2026-07-24)

Deploy: `fly deploy -a vaultpop-api` — SUCCESS after adding `src/ads/constants.ts` + `src/support/faq-data.ts` to the backend build (Dockerfile + backend/tsconfig.build.json). Machine updated, health checks passed, DNS verified. Only `vaultpop-api` touched.

## Live verification (all PASS on https://vaultpop-api.fly.dev)
| Check | Result |
|-------|--------|
| `GET /health` | 200 `{"status":"ok"}` |
| `GET /support` | 200 polished VaultPop Support page (SSV URL unchanged) |
| `GET /admin` | 200 — operator console live: Support Inbox, AI Support Agent, Rewarded Ads (24h), Purchases & Premium, User Management, Password Resets, Audit Log, Restricted Access; zero raw `id="state"` JSON dumps |
| `GET /v1/admin/analytics` / `support/tickets` / `password-resets` (no or invalid token) | 403 `{"error":"Admin authorization required."}` |
| `POST /v1/admin/accounts/:id/enable` (invalid token) | 403 |
| `POST /v1/support/tickets` (safe test, escalated) | 201 `{"ticketId":"VP-000001"}` |
| `POST /v1/auth/password-reset` (existing QA user) | 200 safe message |
| `POST /v1/auth/password-reset` (unknown email) | 200 — byte-identical response (no account-existence leak) |
| `POST /v1/ads/events` (valid) | 202 `{"recorded":true}` |
| `POST /v1/ads/events` (invalid event) | 400 `{"error":"Invalid ad event."}` |
| `POST /v1/auth/login` (live QA player) | 200 token issued |
| `GET /v1/account` (bearer) | 200 state — sync healthy |
| `POST /v1/leaderboard/submit` + fetch | 200, prior data retained |
| Unknown route / `.env` probe | 404 clean JSON, no traces |

Production admin ACTION flows (ticket reply/close, ban/unban with reasons, temp-password reset, mark-handled) verified end-to-end on an identical local build of the deployed backend — see `outputs/build11-admin-proof/` screenshots — and by 51/51 automated tests. The owner's production admin credentials are private Fly secrets and were not used or needed.

Token hygiene: same session-only handling as the first pass; token file shredded post-deploy; TOKEN_PERSISTENCE_NOT_AVAILABLE_SECURELY.
