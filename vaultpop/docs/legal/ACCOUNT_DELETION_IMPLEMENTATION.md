# VaultPop Account Deletion — Implementation Record (Build 18)

Last updated: July 30, 2026
Feature: in-app self-service permanent account deletion (Apple Guideline
5.1.1(v)).

## User flow (in-app)

1. Settings → Account → **Delete Account** (also directly at route
   `/delete-account`; only reachable meaningfully when signed in).
2. The screen explains that deletion is permanent and lists exactly what is
   removed (email/sign-in, sessions, synced inventory and virtual items,
   leaderboard identity, support history, local device data).
3. The screen explains that deleting the VaultPop account does **not** cancel
   an Apple subscription, shows a prominent warning when VaultPass Plus is
   active, and provides a button to
   https://apps.apple.com/account/subscriptions
4. Reauthentication: the user must re-enter their account password.
5. Deliberate confirmation: the user must type `DELETE`.
6. Final destructive action: **Permanently Delete Account** (disabled until
   both inputs are valid; one accidental tap cannot delete anything).
7. On success the app wipes ALL local state (account, session, progress,
   inventory, entitlement cache, install ID → replaced by a fresh signed-out
   profile) and shows a completion screen returning to Home.

## Backend endpoint

`POST /v1/account/delete` (production TS backend, `backend/app.ts`)

- Requires a valid Bearer session (401 otherwise).
- Requires body `{ "password": "<account password>", "confirm": "DELETE" }`.
  Missing/incorrect typed confirmation → 400. Wrong password → 403 and counts
  toward the shared sign-in brute-force limiter (429 after 5 failures).
- No target parameter exists: the endpoint only ever deletes the account the
  session belongs to. Horizontal deletion is impossible by construction.
- The bootstrap owner/admin account is protected and returns 400.
- On success returns `{ "deleted": true }` and clears the admin cookie.

## Data store matrix

| Store / table | Action on deletion | Reason for retention (if any) |
|---|---|---|
| `accounts` (email, scrypt password hash + salt, role) | **DELETED** | — |
| `sessions` (hashed session tokens, all devices) | **DELETED** (FK cascade) | — |
| Admin handoff codes (in-memory, 60s TTL) | **UNUSABLE** — consuming a code re-authenticates the session, which no longer exists | — |
| `account_install_links` (account ↔ install) | **DELETED** (FK cascade) | — |
| `account_balances` (synced inventory/virtual items, entitlement linkage) | **DELETED** (FK cascade) | — |
| `balances` (install-level ledger inventory/entitlement cache) | **DELETED** | Purchases restorable later through Apple "Restore Purchases" |
| `transactions` (Apple transaction ID, product ID) | **ANONYMIZED** — `install_id` set to `deleted-account`; Apple transaction/product IDs and timestamps retained | Duplicate-consumable-grant fraud prevention; financial record-keeping |
| `leaderboard_scores` (handle, scores) | **DELETED** | — |
| `rewarded_ad_events` (SSV reward records) | **ANONYMIZED** — `user_id` cleared; Google transaction IDs retained | SSV idempotency / reward-fraud prevention |
| `support_tickets` + `support_ticket_replies` | **DELETED** (for the linked install) | — |
| `ad_events` (rewarded-ad analytics counters) | **DELETED** (for the linked install) | — |
| `password_reset_requests` | **DELETED** (for the account email) | — |
| `admin_audit_log` entries targeting the account | **ANONYMIZED** — serialized before/after/delta snapshots (which can contain the email) cleared; action, internal IDs, and timestamps retained | Security / abuse auditing of admin actions |
| Local device save profile (progress, inventory, settings, install ID) | **DELETED** — replaced by a fresh default profile with a NEW install ID | — |

No active credentials or usable authentication tokens are retained anywhere.
Shared/global data (other players' scores, aggregate analytics of other
installs, product catalog) is untouched.

## Recreation safety

- Sessions are revoked server-side (cascade) and wiped locally; any stale
  token gets 401 and the app clears its session state instead of re-creating
  anything.
- Account sync (`GET /v1/account`) can never create an account.
- Registering the same email again afterwards creates a brand-new, empty
  account (explicit user action, not automatic recreation).

## Sign in with Apple

VaultPop supports email + password sign-in only. No Sign in with Apple, no
OAuth providers.

SIGN_IN_WITH_APPLE_REVOCATION: NOT APPLICABLE
