import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword
} from "./auth";
import type {
  AccountRole,
  AccountState,
  AccountStore,
  AdminAuditEntry,
  AuthSession,
  LedgerBalance,
  PublicAccount,
  SupportTicketSummary
} from "./types";

type AccountRow = {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  role: AccountRole;
  active: number;
  created_at: string;
};

type BalanceRow = {
  vault_coins: number;
  bonus_lives: number;
  chain_boosts: number;
  vault_bursts: number;
  remove_ads: number;
  vault_pass_expires_at: string | null;
};

const EMPTY_BALANCE: LedgerBalance = {
  vaultCoins: 0,
  bonusLives: 0,
  chainBoosts: 0,
  vaultBursts: 0,
  removeAds: false,
  vaultPassExpiresAt: null
};

export class SqliteAccountStore implements AccountStore {
  private database: DatabaseSync;

  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('player', 'reviewer', 'admin')),
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS account_install_links (
        account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        install_id TEXT NOT NULL UNIQUE,
        linked_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS account_balances (
        account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        vault_coins INTEGER NOT NULL DEFAULT 0,
        bonus_lives INTEGER NOT NULL DEFAULT 0,
        chain_boosts INTEGER NOT NULL DEFAULT 0,
        vault_bursts INTEGER NOT NULL DEFAULT 0,
        remove_ads INTEGER NOT NULL DEFAULT 0,
        vault_pass_expires_at TEXT
      );
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_account_id TEXT NOT NULL,
        admin_email TEXT NOT NULL,
        target_account_id TEXT NOT NULL,
        target_install_id TEXT,
        action TEXT NOT NULL,
        before_json TEXT,
        after_json TEXT,
        delta_json TEXT,
        reason TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_account_idx ON sessions(account_id);
      CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS accounts_role_idx ON accounts(role);
    `);
  }

  upsertBootstrapAccount(input: {
    email: string;
    password: string;
    role: AccountRole;
    initialBalance?: Partial<LedgerBalance>;
  }): PublicAccount {
    const email = normalizeEmail(input.email);
    const password = hashPassword(input.password);
    const now = new Date().toISOString();
    const existing = this.findAccountByEmail(email);
    const accountId = existing?.id ?? randomUUID();

    this.database.exec("BEGIN IMMEDIATE");
    try {
      if (existing) {
        this.database
          .prepare(`
            UPDATE accounts
            SET password_hash = ?, password_salt = ?, role = ?, active = 1, updated_at = ?
            WHERE id = ?
          `)
          .run(
            password.passwordHash,
            password.passwordSalt,
            input.role,
            now,
            accountId
          );
      } else {
        this.database
          .prepare(`
            INSERT INTO accounts (
              id, email, password_hash, password_salt, role, active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
          `)
          .run(
            accountId,
            email,
            password.passwordHash,
            password.passwordSalt,
            input.role,
            now,
            now
          );
      }
      this.database
        .prepare("INSERT OR IGNORE INTO account_balances (account_id) VALUES (?)")
        .run(accountId);
      const minimum = input.initialBalance ?? {};
      this.database
        .prepare(`
          UPDATE account_balances SET
            vault_coins = MAX(vault_coins, ?),
            bonus_lives = MAX(bonus_lives, ?),
            chain_boosts = MAX(chain_boosts, ?),
            vault_bursts = MAX(vault_bursts, ?),
            remove_ads = CASE WHEN ? = 1 THEN 1 ELSE remove_ads END,
            vault_pass_expires_at = COALESCE(vault_pass_expires_at, ?)
          WHERE account_id = ?
        `)
        .run(
          Math.max(0, Math.floor(minimum.vaultCoins ?? 0)),
          Math.max(0, Math.floor(minimum.bonusLives ?? 0)),
          Math.max(0, Math.floor(minimum.chainBoosts ?? 0)),
          Math.max(0, Math.floor(minimum.vaultBursts ?? 0)),
          minimum.removeAds ? 1 : 0,
          minimum.vaultPassExpiresAt ?? null,
          accountId
        );
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }

    return this.requirePublicAccount(accountId);
  }

  login(input: {
    email: string;
    password: string;
    installId: string;
    now?: Date;
  }): AuthSession | null {
    const row = this.findAccountByEmail(normalizeEmail(input.email));
    if (
      !row ||
      row.active !== 1 ||
      !verifyPassword(input.password, row.password_hash, row.password_salt)
    ) {
      return null;
    }

    const now = input.now ?? new Date();
    const createdAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1_000).toISOString();
    const token = createSessionToken();
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database
        .prepare("DELETE FROM account_install_links WHERE install_id = ? AND account_id <> ?")
        .run(input.installId, row.id);
      this.database
        .prepare(`
          INSERT INTO account_install_links (
            account_id, install_id, linked_at, last_seen_at
          ) VALUES (?, ?, ?, ?)
          ON CONFLICT(account_id) DO UPDATE SET
            install_id = excluded.install_id,
            last_seen_at = excluded.last_seen_at
        `)
        .run(row.id, input.installId, createdAt, createdAt);
      this.database
        .prepare(`
          INSERT INTO sessions (token_hash, account_id, expires_at, created_at)
          VALUES (?, ?, ?, ?)
        `)
        .run(hashSessionToken(token), row.id, expiresAt, createdAt);
      this.database
        .prepare("DELETE FROM sessions WHERE expires_at <= ?")
        .run(createdAt);
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }

    return {
      token,
      expiresAt,
      state: this.requireAccountState(row.id)
    };
  }

  authenticate(token: string, now = new Date()): PublicAccount | null {
    const row = this.database
      .prepare(`
        SELECT a.*
        FROM sessions s
        JOIN accounts a ON a.id = s.account_id
        WHERE s.token_hash = ? AND s.expires_at > ? AND a.active = 1
      `)
      .get(hashSessionToken(token), now.toISOString()) as AccountRow | undefined;
    return row ? toPublicAccount(row) : null;
  }

  revokeSession(token: string): void {
    this.database
      .prepare("DELETE FROM sessions WHERE token_hash = ?")
      .run(hashSessionToken(token));
  }

  getAccountState(accountId: string): AccountState | null {
    const row = this.findAccountById(accountId);
    if (!row) {
      return null;
    }
    const link = this.database
      .prepare("SELECT install_id FROM account_install_links WHERE account_id = ?")
      .get(accountId) as { install_id: string } | undefined;
    return {
      account: toPublicAccount(row),
      linkedInstallId: link?.install_id ?? null,
      balance: this.getAccountBalance(accountId),
      supportTickets: link ? this.getSupportTickets(link.install_id) : []
    };
  }

  getAccountStateByInstallId(installId: string): AccountState | null {
    const row = this.database
      .prepare("SELECT account_id FROM account_install_links WHERE install_id = ?")
      .get(installId) as { account_id: string } | undefined;
    return row ? this.getAccountState(row.account_id) : null;
  }

  listAccounts(input: { query?: string; role?: AccountRole } = {}): AccountState[] {
    const query = `%${input.query?.trim().toLowerCase() ?? ""}%`;
    const rows = this.database
      .prepare(`
        SELECT DISTINCT a.*
        FROM accounts a
        LEFT JOIN account_install_links l ON l.account_id = a.id
        WHERE (? IS NULL OR a.role = ?)
          AND (
            LOWER(a.email) LIKE ?
            OR LOWER(a.id) LIKE ?
            OR LOWER(COALESCE(l.install_id, '')) LIKE ?
          )
        ORDER BY a.created_at DESC
        LIMIT 200
      `)
      .all(input.role ?? null, input.role ?? null, query, query, query) as AccountRow[];
    return rows.map((row) => this.requireAccountState(row.id));
  }

  createAccount(
    actor: PublicAccount,
    input: { email: string; password: string; role: AccountRole; reason?: string }
  ): AccountState {
    assertAdmin(actor);
    const email = normalizeEmail(input.email);
    if (this.findAccountByEmail(email)) {
      throw new Error("An account with this email already exists.");
    }
    const password = hashPassword(input.password);
    const accountId = randomUUID();
    const now = new Date().toISOString();
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database
        .prepare(`
          INSERT INTO accounts (
            id, email, password_hash, password_salt, role, active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        `)
        .run(
          accountId,
          email,
          password.passwordHash,
          password.passwordSalt,
          input.role,
          now,
          now
        );
      this.database
        .prepare("INSERT INTO account_balances (account_id) VALUES (?)")
        .run(accountId);
      const after = this.requireAccountState(accountId);
      this.recordAudit(actor, after, "account.create", null, after, null, input.reason);
      this.database.exec("COMMIT");
      return after;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  disableAccount(actor: PublicAccount, accountId: string, reason?: string): AccountState {
    assertAdmin(actor);
    const before = this.requireAccountState(accountId);
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database
        .prepare("UPDATE accounts SET active = 0, updated_at = ? WHERE id = ?")
        .run(new Date().toISOString(), accountId);
      this.database.prepare("DELETE FROM sessions WHERE account_id = ?").run(accountId);
      const after = this.requireAccountState(accountId);
      this.recordAudit(actor, after, "account.disable", before, after, null, reason);
      this.database.exec("COMMIT");
      return after;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  resetPassword(
    actor: PublicAccount,
    accountId: string,
    password: string,
    reason?: string
  ): AccountState {
    assertAdmin(actor);
    const before = this.requireAccountState(accountId);
    const next = hashPassword(password);
    this.database
      .prepare(`
        UPDATE accounts
        SET password_hash = ?, password_salt = ?, updated_at = ?
        WHERE id = ?
      `)
      .run(
        next.passwordHash,
        next.passwordSalt,
        new Date().toISOString(),
        accountId
      );
    this.database.prepare("DELETE FROM sessions WHERE account_id = ?").run(accountId);
    const after = this.requireAccountState(accountId);
    this.recordAudit(actor, after, "account.password.reset", before, after, null, reason);
    return after;
  }

  changeRole(
    actor: PublicAccount,
    accountId: string,
    role: AccountRole,
    reason?: string
  ): AccountState {
    assertAdmin(actor);
    const before = this.requireAccountState(accountId);
    this.database
      .prepare("UPDATE accounts SET role = ?, updated_at = ? WHERE id = ?")
      .run(role, new Date().toISOString(), accountId);
    const after = this.requireAccountState(accountId);
    this.recordAudit(actor, after, "account.role.change", before, after, { role }, reason);
    return after;
  }

  adjustInventory(
    actor: PublicAccount,
    accountId: string,
    delta: Partial<
      Pick<LedgerBalance, "vaultCoins" | "bonusLives" | "chainBoosts" | "vaultBursts">
    >,
    reason?: string
  ): AccountState {
    assertAdmin(actor);
    const before = this.requireAccountState(accountId);
    const afterBalance: LedgerBalance = {
      ...before.balance,
      vaultCoins: before.balance.vaultCoins + (delta.vaultCoins ?? 0),
      bonusLives: before.balance.bonusLives + (delta.bonusLives ?? 0),
      chainBoosts: before.balance.chainBoosts + (delta.chainBoosts ?? 0),
      vaultBursts: before.balance.vaultBursts + (delta.vaultBursts ?? 0)
    };
    assertNonNegative(afterBalance);
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database
        .prepare(`
          UPDATE account_balances SET
            vault_coins = ?,
            bonus_lives = ?,
            chain_boosts = ?,
            vault_bursts = ?
          WHERE account_id = ?
        `)
        .run(
          afterBalance.vaultCoins,
          afterBalance.bonusLives,
          afterBalance.chainBoosts,
          afterBalance.vaultBursts,
          accountId
        );
      const after = this.requireAccountState(accountId);
      this.recordAudit(actor, after, "inventory.adjust", before, after, delta, reason);
      this.database.exec("COMMIT");
      return after;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  setEntitlements(
    actor: PublicAccount,
    accountId: string,
    input: {
      removeAds?: boolean;
      vaultPassExpiresAt?: string | null;
      reason?: string;
    }
  ): AccountState {
    assertAdmin(actor);
    const before = this.requireAccountState(accountId);
    const next: LedgerBalance = {
      ...before.balance,
      removeAds: input.removeAds ?? before.balance.removeAds,
      vaultPassExpiresAt:
        input.vaultPassExpiresAt === undefined
          ? before.balance.vaultPassExpiresAt
          : input.vaultPassExpiresAt
    };
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database
        .prepare(`
          UPDATE account_balances
          SET remove_ads = ?, vault_pass_expires_at = ?
          WHERE account_id = ?
        `)
        .run(next.removeAds ? 1 : 0, next.vaultPassExpiresAt, accountId);
      const after = this.requireAccountState(accountId);
      this.recordAudit(actor, after, "entitlements.set", before, after, input, input.reason);
      this.database.exec("COMMIT");
      return after;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  listAudit(actor: PublicAccount, limit = 100): AdminAuditEntry[] {
    assertAdmin(actor);
    const rows = this.database
      .prepare("SELECT * FROM admin_audit_log ORDER BY id DESC LIMIT ?")
      .all(Math.max(1, Math.min(Math.floor(limit), 500))) as Array<{
      id: number;
      admin_account_id: string;
      admin_email: string;
      target_account_id: string;
      target_install_id: string | null;
      action: string;
      before_json: string | null;
      after_json: string | null;
      delta_json: string | null;
      reason: string | null;
      created_at: string;
    }>;
    return rows.map((row) => ({
      id: String(row.id),
      adminAccountId: row.admin_account_id,
      adminEmail: row.admin_email,
      targetAccountId: row.target_account_id,
      targetInstallId: row.target_install_id,
      action: row.action,
      before: parseJson(row.before_json),
      after: parseJson(row.after_json),
      delta: parseJson(row.delta_json),
      reason: row.reason,
      createdAt: row.created_at
    }));
  }

  private findAccountById(accountId: string): AccountRow | undefined {
    return this.database
      .prepare("SELECT * FROM accounts WHERE id = ?")
      .get(accountId) as AccountRow | undefined;
  }

  private findAccountByEmail(email: string): AccountRow | undefined {
    return this.database
      .prepare("SELECT * FROM accounts WHERE email = ? COLLATE NOCASE")
      .get(email) as AccountRow | undefined;
  }

  private requirePublicAccount(accountId: string): PublicAccount {
    const account = this.findAccountById(accountId);
    if (!account) {
      throw new Error("Account not found.");
    }
    return toPublicAccount(account);
  }

  private requireAccountState(accountId: string): AccountState {
    const state = this.getAccountState(accountId);
    if (!state) {
      throw new Error("Account not found.");
    }
    return state;
  }

  private getAccountBalance(accountId: string): LedgerBalance {
    const row = this.database
      .prepare("SELECT * FROM account_balances WHERE account_id = ?")
      .get(accountId) as BalanceRow | undefined;
    if (!row) {
      return { ...EMPTY_BALANCE };
    }
    return {
      vaultCoins: row.vault_coins,
      bonusLives: row.bonus_lives,
      chainBoosts: row.chain_boosts,
      vaultBursts: row.vault_bursts,
      removeAds: row.remove_ads === 1,
      vaultPassExpiresAt: row.vault_pass_expires_at
    };
  }

  private getSupportTickets(installId: string): SupportTicketSummary[] {
    try {
      const rows = this.database
        .prepare(`
          SELECT id, category, message, email, priority, created_at
          FROM support_tickets
          WHERE install_id = ?
          ORDER BY id DESC
          LIMIT 50
        `)
        .all(installId) as Array<{
        id: number;
        category: string;
        message: string;
        email: string | null;
        priority: number;
        created_at: string;
      }>;
      return rows.map((row) => ({
        id: `VP-${row.id.toString().padStart(6, "0")}`,
        category: row.category,
        message: row.message,
        email: row.email,
        priority: row.priority === 1,
        createdAt: row.created_at
      }));
    } catch {
      return [];
    }
  }

  private recordAudit(
    actor: PublicAccount,
    target: AccountState,
    action: string,
    before: unknown,
    after: unknown,
    delta: unknown,
    reason?: string
  ): void {
    this.database
      .prepare(`
        INSERT INTO admin_audit_log (
          admin_account_id, admin_email, target_account_id, target_install_id,
          action, before_json, after_json, delta_json, reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        actor.id,
        actor.email,
        target.account.id,
        target.linkedInstallId,
        action,
        before === null ? null : JSON.stringify(before),
        after === null ? null : JSON.stringify(after),
        delta === null ? null : JSON.stringify(delta),
        reason?.trim() || null,
        new Date().toISOString()
      );
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicAccount(row: AccountRow): PublicAccount {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    active: row.active === 1,
    createdAt: row.created_at
  };
}

function assertAdmin(actor: PublicAccount): void {
  if (!actor.active || actor.role !== "admin") {
    throw new Error("Admin authorization required.");
  }
}

function assertNonNegative(balance: LedgerBalance): void {
  if (
    balance.vaultCoins < 0 ||
    balance.bonusLives < 0 ||
    balance.chainBoosts < 0 ||
    balance.vaultBursts < 0
  ) {
    throw new Error("Balance cannot go below zero.");
  }
}

function parseJson(value: string | null): unknown {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
