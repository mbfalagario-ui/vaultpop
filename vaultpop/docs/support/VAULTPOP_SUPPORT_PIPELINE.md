# VaultPop Support Pipeline (Build 18)

Last updated: July 30, 2026

## One ticket system

VaultPop uses a single ticket pipeline: the in-app Support form posts to
`POST /v1/support/tickets` on the production backend (`vaultpop-api`,
Fly.io); tickets are stored in the `support_tickets` (+ `support_ticket_replies`)
tables and surfaced in the existing Admin Console Support Inbox at `/admin`.
There are no duplicate systems.

## Premium vs Standard classification

- **PREMIUM SUPPORT** — the submitting install/account has an **active
  VaultPass Plus entitlement** at submission time. The backend checks both
  the install-level ledger balance and the linked account balance
  (`vault_pass_expires_at > now`).
- **STANDARD SUPPORT** — everyone else. Free users always receive support;
  no ticket is ever rejected because of tier.
- **Remove Ads alone does NOT grant Premium Support** (source requirement:
  `hasPrioritySupport()` = `hasActiveVaultPass()` only).
- No response time is guaranteed for either tier (documented in Terms §10 and
  on the public support page).

## Ticket record fields

Every ticket confirms: VaultPop ticket ID (`VP-000123`), install ID, optional
email, **tier** (`premium`/`standard`, derived from the priority entitlement
check), category, message, open/closed status, escalation flag (AI assistant
escalations), created/updated timestamps, full reply history,
**source** (`in-app` — the only creation path today; `email`/`admin` values
reserved), and **email delivery result**
(`queued` / `sent` / `failed` / `not_configured`).

## Admin Console integration

- Support Inbox filter now includes **Premium** and **Standard** alongside
  All / Open / Closed / Escalated
  (`GET /v1/admin/support/tickets?status=premium|standard`).
- Premium tickets are labeled `[PREMIUM]` in the list and show a gold
  **PREMIUM SUPPORT** pill in the ticket detail.
- Reply, close/reopen, and the AI-escalation card are unchanged.

## AI escalation (preserved)

The on-device support assistant escalates unresolved conversations into the
same ticket pipeline with `escalated = true`; the Admin Console AI card and
the `escalated` filter continue to work unchanged.

## Email flow and fallback

- **Provider**: none is configured on the VaultPop backend (no SMTP/API
  credentials exist in this codebase). Every ticket records
  `emailDelivery: "not_configured"`.
- **EMAIL_ALIAS_NOT_VERIFIED** — `support@vaultpop.app` cannot be verified as
  a live, monitored mailbox from this environment. Until the owner confirms
  it, the public support contact is the support site:
  **https://vaultpop-api.fly.dev/support** (plus the in-app Support form).
- **Failure fallback**: tickets are database-first. Email delivery state can
  never discard a ticket — the Admin Console record exists regardless. The
  app additionally offers a client-side `mailto:` fallback only when the
  ticket API itself is unreachable.
- Email rules for any future provider: VaultPop branding, `[VaultPop]`
  subject prefix, and never include passwords, tokens, raw receipts, session
  data, or secrets. When a provider is added, set `email_delivery` to
  `queued`/`sent`/`failed` accordingly.

## Separation from Hashrate Cloud Miner

VaultPop's support pipeline is entirely self-contained: its own database
tables on the `vaultpop-api` Fly app, its own Admin Console, its own ticket
IDs (`VP-`). No Hashrate Cloud Miner code, data, secrets, mailboxes, or
queues are referenced, shared, or modified. The same *pattern* (DB-first
tickets + admin inbox) is reused conceptually only.
