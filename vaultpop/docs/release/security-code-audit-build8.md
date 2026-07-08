# VaultPop Build 8 — Security / Code Audit Report

Date: 2026-07-08 · Report-only audit of all Build 8 patch surfaces (independent security agent + repo audits).

## Verdict: PASS — Build 8 QA safe to proceed
No CRITICAL, HIGH, or MEDIUM functional issues on any new surface.

## What was audited
1. Public registration (`backend/app.ts`, both account stores, preview FastAPI mirror)
2. AdMob SSV verification (`backend/ssv.ts`) + dual behavior on `/support` + `/api/ads/ssv_callback`
3. SQLite leaderboard/reward persistence (`backend/leaderboard-store.ts`)
4. Public support page (`backend/support-page.ts`)
5. Rewarded economy (shared cap/idempotency), new ad unit, account/assistant screens

## Confirmed positive controls
- Registration can ONLY create `role="player"` (hardcoded in SQL/insert in all three implementations); no self-assigned roles; scrypt + per-user salt; timing-safe comparisons; opaque 32-byte session tokens stored SHA-256-hashed with 24h expiry; duplicate email -> 409; weak password -> 400; 5/hr/IP throttle -> 429.
- SSV: ECDSA/SHA-256 verification against Google's published verifier keys; message is the exact query-string prefix per the AdMob spec; unknown key, tampered params, or missing keys FAIL CLOSED (4xx/503, no acknowledgement); transaction ids recorded idempotently (`INSERT OR IGNORE` primary key). Browser visits to `/support` never see callback output.
- All SQLite and Mongo access is parameterized — no injection paths.
- Support page is static, HTML-escaped, no secrets/env/debug/stack output, cacheable 5 min.
- Client: rewarded grants are idempotent per rewardId with a SHARED 30/day cap across both placements; grants happen only after the ad SDK's EARNED_REWARD event; failure paths grant nothing and show friendly status.
- New rewarded unit is a production VaultPop AdMob ID (sample-ID audit green).
- Support Assistant/FAQ: zero network calls — fully on-device intent search.
- Secret scan green; no tokens/credentials/certificates in source; server secrets come from env only.
- Banned-language audit expanded (now machine-checks "Coin Forge", the previously-flagged third-party domain, and financial/crypto vocabulary): green across 148 files.

## LOW findings (non-blocking, backlog)
| ID | Finding | Location | Note |
|----|---------|----------|------|
| SEC-001 | Registration (and login) throttle keys use left-most `x-forwarded-for`, which a direct client can spoof to mint junk player accounts. No privilege or money impact. | `backend/app.ts` registrationKey/loginAttemptKey; preview `server.py` | After Fly deploy, key off the trusted proxy hop (e.g. `Fly-Client-IP`). |
| SEC-002 | Preview FastAPI mirror pairs wildcard CORS with credentials. Bearer-token auth blunts impact; preview-only, not shipped. | `/app/backend/server.py` CORS block | Pin origins if the preview outlives QA. |
| H-1 | Preview mirror serves source/proof zips unauthenticated (delivery convenience for the owner). Contents verified secret-free. | `/app/backend/server.py` | Remove endpoints when no longer needed. |
| H-2 | Preview mirror login lacks a throttle (registration has one). | `/app/backend/server.py` | Preview-only. |

## Validation status
- `pnpm run verify` PASS — typecheck (app + backend), 34/34 tests, all 5 audits.
- Preview E2E: 31/31 backend cases + 12/12 UI flows (test report `/app/test_reports/iteration_3.json`).
- Secrets printed or committed: NO.
