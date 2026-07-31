import { DatabaseSync } from "node:sqlite";

import type { AccountStore, PublicAccount } from "./types";

export type TicketStatus = "open" | "closed";
export type TicketFilter = "open" | "closed" | "escalated" | "premium" | "standard";
export type SupportTier = "premium" | "standard";
export type TicketSource = "in-app" | "email" | "admin";
export type EmailDeliveryResult = "queued" | "sent" | "failed" | "not_configured";
export type AdEventKind = "granted" | "failed";
export type AdRewardType = "bonus_life" | "vault_coins";

export type SupportTicketRecord = {
  id: string;
  status: TicketStatus;
  escalated: boolean;
  priority: boolean;
  /** Premium = active VaultPass entitlement at submission; Standard otherwise. */
  tier: SupportTier;
  source: TicketSource;
  /** No email provider is configured for VaultPop: always "not_configured" today. */
  emailDelivery: EmailDeliveryResult;
  category: string;
  message: string;
  email: string | null;
  installId: string;
  appVersion: string;
  buildNumber: string;
  deviceInfo: string;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SupportTicketDetail = SupportTicketRecord & {
  replies: { author: "admin" | "user"; message: string; createdAt: string }[];
};

export type SupportStats = {
  total: number;
  open: number;
  closed: number;
  escalatedOpen: number;
};

export type AdsAnalytics = {
  granted24h: number;
  failed24h: number;
  byType: { bonusLife: number; vaultCoins: number };
  ssvGranted24h: number;
};

export type PurchaseAnalytics = {
  total: number;
  last24h: number;
  productCounts: Record<string, number>;
  recent: { productId: string; createdAt: string }[];
};

export type PremiumCounts = { vaultPass: number; removeAds: number };

export type PasswordResetRequest = {
  id: string;
  email: string;
  status: "pending" | "handled";
  createdAt: string;
  handledAt: string | null;
  handledBy: string | null;
};

export type CreateTicketInput = {
  installId: string;
  category: string;
  message: string;
  email?: string;
  appVersion: string;
  buildNumber: string;
  deviceInfo: string;
  priority: boolean;
  escalated: boolean;
};

/**
 * Operational store powering the owner console: support inbox, ad analytics,
 * purchase aggregation, and admin-assisted password resets. Reads the ledger's
 * existing tables for aggregation; never stores secrets, raw SSV payloads, or
 * plaintext passwords.
 */
export interface OpsStore {
  createTicket(input: CreateTicketInput): string;
  listTickets(filter?: TicketFilter): SupportTicketRecord[];
  getTicket(ticketId: string): SupportTicketDetail | null;
  addReply(
    ticketId: string,
    author: "admin" | "user",
    message: string
  ): SupportTicketDetail;
  setTicketStatus(ticketId: string, status: TicketStatus): SupportTicketDetail;
  supportStats(): SupportStats;
  recordAdEvent(input: {
    installId: string;
    event: AdEventKind;
    rewardType: AdRewardType;
  }): void;
  adsAnalytics(now?: Date): AdsAnalytics;
  recordPurchase(input: { transactionId: string; productId: string }): void;
  purchaseAnalytics(now?: Date): PurchaseAnalytics;
  premiumCounts(now?: Date): PremiumCounts;
  createPasswordResetRequest(email: string): void;
  listPasswordResetRequests(): PasswordResetRequest[];
  markPasswordResetHandled(id: string, adminEmail: string): PasswordResetRequest;
  countPendingPasswordResets(): number;
  /**
   * Account-deletion support: removes the install's support tickets and
   * replies, its ad analytics events, and any pending password-reset
   * requests for the deleted email.
   */
  purgeAccountData(installId: string | null, email: string | null): void;
  /* ---- Rewarded-ad daily caps (per account/install + UTC day) ---- */
  /** App-wide default per-user daily rewarded cap (falls back to 30). */
  getDefaultRewardedCap(): number;
  setDefaultRewardedCap(cap: number): void;
  /** Per-user override, or null when the user follows the default. */
  getRewardedCapOverride(userId: string): number | null;
  setRewardedCapOverride(userId: string, cap: number): void;
  clearRewardedCapOverride(userId: string): void;
  listRewardedCapOverrides(): { userId: string; cap: number; updatedAt: string }[];
  /** Override when present, otherwise the default cap. */
  getEffectiveRewardedCap(userId: string): number;
  logAdminAction(
    actor: PublicAccount,
    action: string,
    target: string,
    reason?: string
  ): void;
}

const DAY_MS = 24 * 60 * 60 * 1_000;
const DEFAULT_REWARDED_DAILY_CAP = 30;
const MAX_REWARDED_DAILY_CAP = 500;

function clampCap(cap: number): number {
  return Math.max(0, Math.min(MAX_REWARDED_DAILY_CAP, Math.floor(cap)));
}

function ticketNumber(ticketId: string): number {
  const value = Number(ticketId.replace(/^VP-/, ""));
  return Number.isInteger(value) && value > 0 ? value : -1;
}

function formatTicketId(rowId: number | bigint): string {
  return `VP-${Number(rowId).toString().padStart(6, "0")}`;
}

export class SqliteOpsStore implements OpsStore {
  private database: DatabaseSync;

  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS support_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        install_id TEXT NOT NULL,
        category TEXT NOT NULL,
        message TEXT NOT NULL,
        email TEXT,
        app_version TEXT NOT NULL,
        build_number TEXT NOT NULL,
        device_info TEXT NOT NULL,
        priority INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS support_ticket_replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        author TEXT NOT NULL CHECK (author IN ('admin', 'user')),
        message TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS support_ticket_replies_ticket_idx
        ON support_ticket_replies(ticket_id);
      CREATE TABLE IF NOT EXISTS ad_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        install_id TEXT NOT NULL,
        event TEXT NOT NULL CHECK (event IN ('granted', 'failed')),
        reward_type TEXT NOT NULL CHECK (reward_type IN ('bonus_life', 'vault_coins')),
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ad_events_time_idx ON ad_events(created_at);
      CREATE TABLE IF NOT EXISTS password_reset_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'handled')),
        created_at TEXT NOT NULL,
        handled_at TEXT,
        handled_by TEXT
      );
      CREATE TABLE IF NOT EXISTS rewarded_cap_settings (
        key TEXT PRIMARY KEY,
        value INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS rewarded_cap_overrides (
        user_id TEXT PRIMARY KEY,
        cap INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    // Existing production support_tickets rows predate ticket operations —
    // add the new columns in place (safe, defaulted).
    this.ensureColumn("support_tickets", "status", "status TEXT NOT NULL DEFAULT 'open'");
    this.ensureColumn("support_tickets", "updated_at", "updated_at TEXT");
    this.ensureColumn(
      "support_tickets",
      "escalated",
      "escalated INTEGER NOT NULL DEFAULT 0"
    );
    this.ensureColumn(
      "support_tickets",
      "source",
      "source TEXT NOT NULL DEFAULT 'in-app'"
    );
    this.ensureColumn(
      "support_tickets",
      "email_delivery",
      "email_delivery TEXT NOT NULL DEFAULT 'not_configured'"
    );
  }

  createTicket(input: CreateTicketInput): string {
    const now = new Date().toISOString();
    const result = this.database
      .prepare(`
        INSERT INTO support_tickets (
          install_id, category, message, email, app_version, build_number,
          device_info, priority, created_at, status, updated_at, escalated,
          source, email_delivery
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, 'in-app', 'not_configured')
      `)
      .run(
        input.installId,
        input.category,
        input.message,
        input.email ?? null,
        input.appVersion,
        input.buildNumber,
        input.deviceInfo,
        input.priority ? 1 : 0,
        now,
        now,
        input.escalated ? 1 : 0
      );
    return formatTicketId(result.lastInsertRowid);
  }

  listTickets(filter?: TicketFilter): SupportTicketRecord[] {
    const where =
      filter === "open"
        ? "WHERE t.status = 'open'"
        : filter === "closed"
          ? "WHERE t.status = 'closed'"
          : filter === "escalated"
            ? "WHERE t.escalated = 1"
            : filter === "premium"
              ? "WHERE t.priority = 1"
              : filter === "standard"
                ? "WHERE t.priority = 0"
                : "";
    const rows = this.database
      .prepare(`
        SELECT t.*, (
          SELECT COUNT(*) FROM support_ticket_replies r WHERE r.ticket_id = t.id
        ) AS reply_count
        FROM support_tickets t
        ${where}
        ORDER BY COALESCE(t.updated_at, t.created_at) DESC
        LIMIT 100
      `)
      .all() as TicketRow[];
    return rows.map(toTicketRecord);
  }

  getTicket(ticketId: string): SupportTicketDetail | null {
    const row = this.findTicketRow(ticketId);
    if (!row) {
      return null;
    }
    const replies = this.database
      .prepare(`
        SELECT author, message, created_at
        FROM support_ticket_replies
        WHERE ticket_id = ?
        ORDER BY id ASC
      `)
      .all(row.id) as { author: "admin" | "user"; message: string; created_at: string }[];
    return {
      ...toTicketRecord(row),
      replies: replies.map((reply) => ({
        author: reply.author,
        message: reply.message,
        createdAt: reply.created_at
      }))
    };
  }

  addReply(
    ticketId: string,
    author: "admin" | "user",
    message: string
  ): SupportTicketDetail {
    const row = this.requireTicketRow(ticketId);
    const now = new Date().toISOString();
    this.database
      .prepare(`
        INSERT INTO support_ticket_replies (ticket_id, author, message, created_at)
        VALUES (?, ?, ?, ?)
      `)
      .run(row.id, author, message, now);
    this.database
      .prepare("UPDATE support_tickets SET updated_at = ? WHERE id = ?")
      .run(now, row.id);
    return this.getTicket(ticketId)!;
  }

  setTicketStatus(ticketId: string, status: TicketStatus): SupportTicketDetail {
    const row = this.requireTicketRow(ticketId);
    this.database
      .prepare("UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?")
      .run(status, new Date().toISOString(), row.id);
    return this.getTicket(ticketId)!;
  }

  supportStats(): SupportStats {
    const row = this.database
      .prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed,
          SUM(CASE WHEN escalated = 1 AND status = 'open' THEN 1 ELSE 0 END) AS escalated_open
        FROM support_tickets
      `)
      .get() as { total: number; open: number | null; closed: number | null; escalated_open: number | null };
    return {
      total: Number(row.total),
      open: Number(row.open ?? 0),
      closed: Number(row.closed ?? 0),
      escalatedOpen: Number(row.escalated_open ?? 0)
    };
  }

  recordAdEvent(input: {
    installId: string;
    event: AdEventKind;
    rewardType: AdRewardType;
  }): void {
    this.database
      .prepare(`
        INSERT INTO ad_events (install_id, event, reward_type, created_at)
        VALUES (?, ?, ?, ?)
      `)
      .run(input.installId, input.event, input.rewardType, new Date().toISOString());
  }

  adsAnalytics(now = new Date()): AdsAnalytics {
    const since = new Date(now.getTime() - DAY_MS).toISOString();
    const row = this.database
      .prepare(`
        SELECT
          SUM(CASE WHEN event = 'granted' THEN 1 ELSE 0 END) AS granted,
          SUM(CASE WHEN event = 'failed' THEN 1 ELSE 0 END) AS failed,
          SUM(CASE WHEN event = 'granted' AND reward_type = 'bonus_life' THEN 1 ELSE 0 END) AS life,
          SUM(CASE WHEN event = 'granted' AND reward_type = 'vault_coins' THEN 1 ELSE 0 END) AS coins
        FROM ad_events WHERE created_at >= ?
      `)
      .get(since) as {
      granted: number | null;
      failed: number | null;
      life: number | null;
      coins: number | null;
    };
    let ssvGranted24h = 0;
    try {
      const ssv = this.database
        .prepare(
          "SELECT COUNT(*) AS total FROM rewarded_ad_events WHERE created_at >= ?"
        )
        .get(since) as { total: number };
      ssvGranted24h = Number(ssv.total);
    } catch {
      ssvGranted24h = 0;
    }
    return {
      granted24h: Number(row.granted ?? 0),
      failed24h: Number(row.failed ?? 0),
      byType: {
        bonusLife: Number(row.life ?? 0),
        vaultCoins: Number(row.coins ?? 0)
      },
      ssvGranted24h
    };
  }

  recordPurchase(): void {
    // No-op: verified purchases are already persisted in the ledger's
    // `transactions` table, which purchaseAnalytics() reads directly.
  }

  purchaseAnalytics(now = new Date()): PurchaseAnalytics {
    const since = new Date(now.getTime() - DAY_MS).toISOString();
    try {
      const totals = this.database
        .prepare(`
          SELECT COUNT(*) AS total,
            SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS recent
          FROM transactions
        `)
        .get(since) as { total: number; recent: number | null };
      const byProduct = this.database
        .prepare(
          "SELECT product_id, COUNT(*) AS total FROM transactions GROUP BY product_id"
        )
        .all() as { product_id: string; total: number }[];
      const recent = this.database
        .prepare(
          "SELECT product_id, created_at FROM transactions ORDER BY created_at DESC LIMIT 10"
        )
        .all() as { product_id: string; created_at: string }[];
      return {
        total: Number(totals.total),
        last24h: Number(totals.recent ?? 0),
        productCounts: Object.fromEntries(
          byProduct.map((row) => [row.product_id, Number(row.total)])
        ),
        recent: recent.map((row) => ({
          productId: row.product_id,
          createdAt: row.created_at
        }))
      };
    } catch {
      return { total: 0, last24h: 0, productCounts: {}, recent: [] };
    }
  }

  premiumCounts(now = new Date()): PremiumCounts {
    const nowIso = now.toISOString();
    let vaultPass = 0;
    let removeAds = 0;
    for (const table of ["balances", "account_balances"]) {
      try {
        const row = this.database
          .prepare(`
            SELECT
              SUM(CASE WHEN vault_pass_expires_at IS NOT NULL AND vault_pass_expires_at > ? THEN 1 ELSE 0 END) AS pass,
              SUM(CASE WHEN remove_ads = 1 THEN 1 ELSE 0 END) AS adfree
            FROM ${table}
          `)
          .get(nowIso) as { pass: number | null; adfree: number | null };
        vaultPass += Number(row.pass ?? 0);
        removeAds += Number(row.adfree ?? 0);
      } catch {
        // Table not present in this database — skip.
      }
    }
    return { vaultPass, removeAds };
  }

  createPasswordResetRequest(email: string): void {
    const pending = this.database
      .prepare(
        "SELECT id FROM password_reset_requests WHERE email = ? AND status = 'pending'"
      )
      .get(email) as { id: number } | undefined;
    if (pending) {
      return;
    }
    this.database
      .prepare(
        "INSERT INTO password_reset_requests (email, created_at) VALUES (?, ?)"
      )
      .run(email, new Date().toISOString());
  }

  listPasswordResetRequests(): PasswordResetRequest[] {
    const rows = this.database
      .prepare(`
        SELECT * FROM password_reset_requests
        ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, id DESC
        LIMIT 50
      `)
      .all() as ResetRow[];
    return rows.map(toResetRequest);
  }

  markPasswordResetHandled(id: string, adminEmail: string): PasswordResetRequest {
    const numeric = Number(id);
    const row = this.database
      .prepare("SELECT * FROM password_reset_requests WHERE id = ?")
      .get(numeric) as ResetRow | undefined;
    if (!row) {
      throw new Error("Reset request not found.");
    }
    this.database
      .prepare(`
        UPDATE password_reset_requests
        SET status = 'handled', handled_at = ?, handled_by = ?
        WHERE id = ?
      `)
      .run(new Date().toISOString(), adminEmail, numeric);
    const updated = this.database
      .prepare("SELECT * FROM password_reset_requests WHERE id = ?")
      .get(numeric) as ResetRow;
    return toResetRequest(updated);
  }

  countPendingPasswordResets(): number {
    const row = this.database
      .prepare(
        "SELECT COUNT(*) AS total FROM password_reset_requests WHERE status = 'pending'"
      )
      .get() as { total: number };
    return Number(row.total);
  }

  purgeAccountData(installId: string | null, email: string | null): void {
    if (installId) {
      this.database
        .prepare(`
          DELETE FROM support_ticket_replies WHERE ticket_id IN (
            SELECT id FROM support_tickets WHERE install_id = ?
          )
        `)
        .run(installId);
      this.database
        .prepare("DELETE FROM support_tickets WHERE install_id = ?")
        .run(installId);
      this.database
        .prepare("DELETE FROM ad_events WHERE install_id = ?")
        .run(installId);
      this.database
        .prepare("DELETE FROM rewarded_cap_overrides WHERE user_id = ?")
        .run(installId);
    }
    if (email) {
      this.database
        .prepare("DELETE FROM password_reset_requests WHERE email = ?")
        .run(email.trim().toLowerCase());
    }
  }

  getDefaultRewardedCap(): number {
    const row = this.database
      .prepare("SELECT value FROM rewarded_cap_settings WHERE key = 'default_cap'")
      .get() as { value: number } | undefined;
    return row ? clampCap(Number(row.value)) : DEFAULT_REWARDED_DAILY_CAP;
  }

  setDefaultRewardedCap(cap: number): void {
    this.database
      .prepare(`
        INSERT INTO rewarded_cap_settings (key, value) VALUES ('default_cap', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `)
      .run(clampCap(cap));
  }

  getRewardedCapOverride(userId: string): number | null {
    const row = this.database
      .prepare("SELECT cap FROM rewarded_cap_overrides WHERE user_id = ?")
      .get(userId) as { cap: number } | undefined;
    return row ? clampCap(Number(row.cap)) : null;
  }

  setRewardedCapOverride(userId: string, cap: number): void {
    this.database
      .prepare(`
        INSERT INTO rewarded_cap_overrides (user_id, cap, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          cap = excluded.cap, updated_at = excluded.updated_at
      `)
      .run(userId, clampCap(cap), new Date().toISOString());
  }

  clearRewardedCapOverride(userId: string): void {
    this.database
      .prepare("DELETE FROM rewarded_cap_overrides WHERE user_id = ?")
      .run(userId);
  }

  listRewardedCapOverrides(): { userId: string; cap: number; updatedAt: string }[] {
    const rows = this.database
      .prepare(
        "SELECT user_id, cap, updated_at FROM rewarded_cap_overrides ORDER BY updated_at DESC LIMIT 100"
      )
      .all() as { user_id: string; cap: number; updated_at: string }[];
    return rows.map((row) => ({
      userId: row.user_id,
      cap: clampCap(Number(row.cap)),
      updatedAt: row.updated_at
    }));
  }

  getEffectiveRewardedCap(userId: string): number {
    return this.getRewardedCapOverride(userId) ?? this.getDefaultRewardedCap();
  }

  logAdminAction(
    actor: PublicAccount,
    action: string,
    target: string,
    reason?: string
  ): void {
    try {
      this.database
        .prepare(`
          INSERT INTO admin_audit_log (
            admin_account_id, admin_email, target_account_id, target_install_id,
            action, before_json, after_json, delta_json, reason, created_at
          ) VALUES (?, ?, ?, NULL, ?, NULL, NULL, NULL, ?, ?)
        `)
        .run(
          actor.id,
          actor.email,
          target,
          action,
          reason?.trim() || null,
          new Date().toISOString()
        );
    } catch {
      // Audit table owned by the account store; absent only in isolated tests.
    }
  }

  private ensureColumn(table: string, column: string, ddl: string): void {
    const columns = this.database
      .prepare(`PRAGMA table_info(${table})`)
      .all() as { name: string }[];
    if (!columns.some((item) => item.name === column)) {
      this.database.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    }
  }

  private findTicketRow(ticketId: string): TicketRow | undefined {
    const numeric = ticketNumber(ticketId);
    if (numeric < 0) {
      return undefined;
    }
    return this.database
      .prepare(`
        SELECT t.*, (
          SELECT COUNT(*) FROM support_ticket_replies r WHERE r.ticket_id = t.id
        ) AS reply_count
        FROM support_tickets t WHERE t.id = ?
      `)
      .get(numeric) as TicketRow | undefined;
  }

  private requireTicketRow(ticketId: string): TicketRow {
    const row = this.findTicketRow(ticketId);
    if (!row) {
      throw new Error("Ticket not found.");
    }
    return row;
  }
}

type TicketRow = {
  id: number;
  install_id: string;
  category: string;
  message: string;
  email: string | null;
  app_version: string;
  build_number: string;
  device_info: string;
  priority: number;
  created_at: string;
  status: TicketStatus | null;
  updated_at: string | null;
  escalated: number | null;
  source: string | null;
  email_delivery: string | null;
  reply_count: number;
};

type ResetRow = {
  id: number;
  email: string;
  status: "pending" | "handled";
  created_at: string;
  handled_at: string | null;
  handled_by: string | null;
};

function toTicketRecord(row: TicketRow): SupportTicketRecord {
  return {
    id: formatTicketId(row.id),
    status: row.status === "closed" ? "closed" : "open",
    escalated: row.escalated === 1,
    priority: row.priority === 1,
    tier: row.priority === 1 ? "premium" : "standard",
    source: row.source === "email" || row.source === "admin" ? row.source : "in-app",
    emailDelivery:
      row.email_delivery === "queued" ||
      row.email_delivery === "sent" ||
      row.email_delivery === "failed"
        ? row.email_delivery
        : "not_configured",
    category: row.category,
    message: row.message,
    email: row.email,
    installId: row.install_id,
    appVersion: row.app_version,
    buildNumber: row.build_number,
    deviceInfo: row.device_info,
    replyCount: Number(row.reply_count),
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at
  };
}

function toResetRequest(row: ResetRow): PasswordResetRequest {
  return {
    id: String(row.id),
    email: row.email,
    status: row.status,
    createdAt: row.created_at,
    handledAt: row.handled_at,
    handledBy: row.handled_by
  };
}

/** In-memory implementation for tests. */
export class MemoryOpsStore implements OpsStore {
  private tickets: (Omit<SupportTicketDetail, "replyCount"> & { numericId: number })[] =
    [];
  private adEvents: {
    installId: string;
    event: AdEventKind;
    rewardType: AdRewardType;
    createdAt: string;
  }[] = [];
  private purchases: { transactionId: string; productId: string; createdAt: string }[] =
    [];
  private resets: PasswordResetRequest[] = [];
  private adminActions: { action: string; target: string; createdAt: string }[] = [];
  private defaultRewardedCap = DEFAULT_REWARDED_DAILY_CAP;
  private capOverrides = new Map<string, { cap: number; updatedAt: string }>();

  constructor(private accounts?: AccountStore) {}

  createTicket(input: CreateTicketInput): string {
    const now = new Date().toISOString();
    const numericId = this.tickets.length + 1;
    this.tickets.push({
      numericId,
      id: formatTicketId(numericId),
      status: "open",
      escalated: input.escalated,
      priority: input.priority,
      tier: input.priority ? "premium" : "standard",
      source: "in-app",
      emailDelivery: "not_configured",
      category: input.category,
      message: input.message,
      email: input.email ?? null,
      installId: input.installId,
      appVersion: input.appVersion,
      buildNumber: input.buildNumber,
      deviceInfo: input.deviceInfo,
      createdAt: now,
      updatedAt: now,
      replies: []
    });
    return formatTicketId(numericId);
  }

  listTickets(filter?: TicketFilter): SupportTicketRecord[] {
    return this.tickets
      .filter((ticket) =>
        filter === "open"
          ? ticket.status === "open"
          : filter === "closed"
            ? ticket.status === "closed"
            : filter === "escalated"
              ? ticket.escalated
              : filter === "premium"
                ? ticket.priority
                : filter === "standard"
                  ? !ticket.priority
                  : true
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 100)
      .map((ticket) => ({ ...ticket, replyCount: ticket.replies.length }));
  }

  getTicket(ticketId: string): SupportTicketDetail | null {
    const ticket = this.tickets.find((item) => item.id === ticketId);
    return ticket
      ? { ...ticket, replyCount: ticket.replies.length, replies: [...ticket.replies] }
      : null;
  }

  addReply(
    ticketId: string,
    author: "admin" | "user",
    message: string
  ): SupportTicketDetail {
    const ticket = this.tickets.find((item) => item.id === ticketId);
    if (!ticket) {
      throw new Error("Ticket not found.");
    }
    const now = new Date().toISOString();
    ticket.replies.push({ author, message, createdAt: now });
    ticket.updatedAt = now;
    return this.getTicket(ticketId)!;
  }

  setTicketStatus(ticketId: string, status: TicketStatus): SupportTicketDetail {
    const ticket = this.tickets.find((item) => item.id === ticketId);
    if (!ticket) {
      throw new Error("Ticket not found.");
    }
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    return this.getTicket(ticketId)!;
  }

  supportStats(): SupportStats {
    return {
      total: this.tickets.length,
      open: this.tickets.filter((ticket) => ticket.status === "open").length,
      closed: this.tickets.filter((ticket) => ticket.status === "closed").length,
      escalatedOpen: this.tickets.filter(
        (ticket) => ticket.escalated && ticket.status === "open"
      ).length
    };
  }

  recordAdEvent(input: {
    installId: string;
    event: AdEventKind;
    rewardType: AdRewardType;
  }): void {
    this.adEvents.push({ ...input, createdAt: new Date().toISOString() });
  }

  adsAnalytics(now = new Date()): AdsAnalytics {
    const since = new Date(now.getTime() - DAY_MS).toISOString();
    const recent = this.adEvents.filter((event) => event.createdAt >= since);
    return {
      granted24h: recent.filter((event) => event.event === "granted").length,
      failed24h: recent.filter((event) => event.event === "failed").length,
      byType: {
        bonusLife: recent.filter(
          (event) => event.event === "granted" && event.rewardType === "bonus_life"
        ).length,
        vaultCoins: recent.filter(
          (event) => event.event === "granted" && event.rewardType === "vault_coins"
        ).length
      },
      ssvGranted24h: 0
    };
  }

  recordPurchase(input: { transactionId: string; productId: string }): void {
    if (this.purchases.some((item) => item.transactionId === input.transactionId)) {
      return;
    }
    this.purchases.push({ ...input, createdAt: new Date().toISOString() });
  }

  purchaseAnalytics(now = new Date()): PurchaseAnalytics {
    const since = new Date(now.getTime() - DAY_MS).toISOString();
    const productCounts: Record<string, number> = {};
    for (const purchase of this.purchases) {
      productCounts[purchase.productId] = (productCounts[purchase.productId] ?? 0) + 1;
    }
    return {
      total: this.purchases.length,
      last24h: this.purchases.filter((item) => item.createdAt >= since).length,
      productCounts,
      recent: [...this.purchases]
        .reverse()
        .slice(0, 10)
        .map((item) => ({ productId: item.productId, createdAt: item.createdAt }))
    };
  }

  premiumCounts(now = new Date()): PremiumCounts {
    if (!this.accounts) {
      return { vaultPass: 0, removeAds: 0 };
    }
    const states = this.accounts.listAccounts();
    return {
      vaultPass: states.filter(
        (state) =>
          state.balance.vaultPassExpiresAt &&
          new Date(state.balance.vaultPassExpiresAt).getTime() > now.getTime()
      ).length,
      removeAds: states.filter((state) => state.balance.removeAds).length
    };
  }

  createPasswordResetRequest(email: string): void {
    if (this.resets.some((item) => item.email === email && item.status === "pending")) {
      return;
    }
    this.resets.push({
      id: String(this.resets.length + 1),
      email,
      status: "pending",
      createdAt: new Date().toISOString(),
      handledAt: null,
      handledBy: null
    });
  }

  listPasswordResetRequests(): PasswordResetRequest[] {
    return [...this.resets]
      .sort((a, b) =>
        a.status === b.status
          ? b.createdAt.localeCompare(a.createdAt)
          : a.status === "pending"
            ? -1
            : 1
      )
      .slice(0, 50);
  }

  markPasswordResetHandled(id: string, adminEmail: string): PasswordResetRequest {
    const request = this.resets.find((item) => item.id === id);
    if (!request) {
      throw new Error("Reset request not found.");
    }
    request.status = "handled";
    request.handledAt = new Date().toISOString();
    request.handledBy = adminEmail;
    return { ...request };
  }

  countPendingPasswordResets(): number {
    return this.resets.filter((item) => item.status === "pending").length;
  }

  purgeAccountData(installId: string | null, email: string | null): void {
    if (installId) {
      this.tickets = this.tickets.filter((ticket) => ticket.installId !== installId);
      this.adEvents = this.adEvents.filter((event) => event.installId !== installId);
      this.capOverrides.delete(installId);
    }
    if (email) {
      const normalized = email.trim().toLowerCase();
      this.resets = this.resets.filter((item) => item.email !== normalized);
    }
  }

  getDefaultRewardedCap(): number {
    return this.defaultRewardedCap;
  }

  setDefaultRewardedCap(cap: number): void {
    this.defaultRewardedCap = clampCap(cap);
  }

  getRewardedCapOverride(userId: string): number | null {
    return this.capOverrides.get(userId)?.cap ?? null;
  }

  setRewardedCapOverride(userId: string, cap: number): void {
    this.capOverrides.set(userId, {
      cap: clampCap(cap),
      updatedAt: new Date().toISOString()
    });
  }

  clearRewardedCapOverride(userId: string): void {
    this.capOverrides.delete(userId);
  }

  listRewardedCapOverrides(): { userId: string; cap: number; updatedAt: string }[] {
    return [...this.capOverrides.entries()]
      .map(([userId, value]) => ({ userId, ...value }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 100);
  }

  getEffectiveRewardedCap(userId: string): number {
    return this.getRewardedCapOverride(userId) ?? this.defaultRewardedCap;
  }

  logAdminAction(_actor: PublicAccount, action: string, target: string): void {
    this.adminActions.push({ action, target, createdAt: new Date().toISOString() });
  }
}
