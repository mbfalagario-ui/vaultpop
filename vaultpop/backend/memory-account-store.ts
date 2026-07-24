import { randomUUID } from "node:crypto";

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
  PublicAccount
} from "./types";

type InternalAccount = PublicAccount & {
  passwordHash: string;
  passwordSalt: string;
  linkedInstallId: string | null;
};

const EMPTY_BALANCE: LedgerBalance = {
  vaultCoins: 0,
  bonusLives: 0,
  chainBoosts: 0,
  vaultBursts: 0,
  removeAds: false,
  vaultPassExpiresAt: null
};

export class MemoryAccountStore implements AccountStore {
  private accounts = new Map<string, InternalAccount>();
  private balances = new Map<string, LedgerBalance>();
  private sessions = new Map<string, { accountId: string; expiresAt: string }>();
  private audit: AdminAuditEntry[] = [];

  upsertBootstrapAccount(input: {
    email: string;
    password: string;
    role: AccountRole;
    initialBalance?: Partial<LedgerBalance>;
  }): PublicAccount {
    const email = normalizeEmail(input.email);
    const existing = [...this.accounts.values()].find((account) => account.email === email);
    const password = hashPassword(input.password);
    const account: InternalAccount = existing
      ? {
          ...existing,
          active: true,
          role: input.role,
          passwordHash: password.passwordHash,
          passwordSalt: password.passwordSalt
        }
      : {
          id: randomUUID(),
          email,
          role: input.role,
          active: true,
          createdAt: new Date().toISOString(),
          linkedInstallId: null,
          passwordHash: password.passwordHash,
          passwordSalt: password.passwordSalt
        };
    this.accounts.set(account.id, account);
    const current = this.balances.get(account.id) ?? EMPTY_BALANCE;
    this.balances.set(account.id, ensureMinimumBalance(current, input.initialBalance));
    return toPublicAccount(account);
  }

  login(input: {
    email: string;
    password: string;
    installId: string;
    now?: Date;
  }): AuthSession | null {
    const account = [...this.accounts.values()].find(
      (candidate) => candidate.email === normalizeEmail(input.email)
    );
    if (
      !account?.active ||
      !verifyPassword(input.password, account.passwordHash, account.passwordSalt)
    ) {
      return null;
    }
    account.linkedInstallId = input.installId;
    const now = input.now ?? new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1_000).toISOString();
    const token = createSessionToken();
    this.sessions.set(hashSessionToken(token), { accountId: account.id, expiresAt });
    return {
      token,
      expiresAt,
      state: this.requireAccountState(account.id)
    };
  }

  registerPlayer(input: {
    email: string;
    password: string;
    installId: string;
    now?: Date;
  }): AuthSession {
    const email = normalizeEmail(input.email);
    if ([...this.accounts.values()].some((account) => account.email === email)) {
      throw new Error("An account with this email already exists.");
    }
    const password = hashPassword(input.password);
    const account: InternalAccount = {
      id: randomUUID(),
      email,
      role: "player",
      active: true,
      createdAt: (input.now ?? new Date()).toISOString(),
      linkedInstallId: null,
      passwordHash: password.passwordHash,
      passwordSalt: password.passwordSalt
    };
    this.accounts.set(account.id, account);
    this.balances.set(account.id, { ...EMPTY_BALANCE });
    const session = this.login({
      email,
      password: input.password,
      installId: input.installId,
      now: input.now
    });
    if (!session) {
      throw new Error("Registration failed.");
    }
    return session;
  }

  authenticate(token: string, now = new Date()): PublicAccount | null {
    const tokenHash = hashSessionToken(token);
    const session = this.sessions.get(tokenHash);
    if (!session || new Date(session.expiresAt).getTime() <= now.getTime()) {
      this.sessions.delete(tokenHash);
      return null;
    }
    const account = this.accounts.get(session.accountId);
    return account?.active ? toPublicAccount(account) : null;
  }

  revokeSession(token: string): void {
    this.sessions.delete(hashSessionToken(token));
  }

  getAccountState(accountId: string): AccountState | null {
    const account = this.accounts.get(accountId);
    if (!account) {
      return null;
    }
    return {
      account: toPublicAccount(account),
      linkedInstallId: account.linkedInstallId,
      balance: { ...(this.balances.get(accountId) ?? EMPTY_BALANCE) },
      supportTickets: []
    };
  }

  getAccountStateByInstallId(installId: string): AccountState | null {
    const account = [...this.accounts.values()].find(
      (candidate) => candidate.linkedInstallId === installId
    );
    return account ? this.getAccountState(account.id) : null;
  }

  listAccounts(input: { query?: string; role?: AccountRole } = {}): AccountState[] {
    const query = input.query?.trim().toLowerCase() ?? "";
    return [...this.accounts.values()]
      .filter((account) => !input.role || account.role === input.role)
      .filter(
        (account) =>
          !query ||
          account.id.toLowerCase().includes(query) ||
          account.email.includes(query) ||
          account.linkedInstallId?.toLowerCase().includes(query)
      )
      .map((account) => this.requireAccountState(account.id));
  }

  createAccount(
    actor: PublicAccount,
    input: { email: string; password: string; role: AccountRole; reason?: string }
  ): AccountState {
    assertAdmin(actor);
    const email = normalizeEmail(input.email);
    if ([...this.accounts.values()].some((account) => account.email === email)) {
      throw new Error("An account with this email already exists.");
    }
    const password = hashPassword(input.password);
    const account: InternalAccount = {
      id: randomUUID(),
      email,
      role: input.role,
      active: true,
      createdAt: new Date().toISOString(),
      linkedInstallId: null,
      passwordHash: password.passwordHash,
      passwordSalt: password.passwordSalt
    };
    this.accounts.set(account.id, account);
    this.balances.set(account.id, { ...EMPTY_BALANCE });
    const state = this.requireAccountState(account.id);
    this.recordAudit(actor, state, "account.create", null, state, null, input.reason);
    return state;
  }

  disableAccount(actor: PublicAccount, accountId: string, reason?: string): AccountState {
    assertAdmin(actor);
    const before = this.requireAccountState(accountId);
    const account = this.requireInternalAccount(accountId);
    account.active = false;
    for (const [tokenHash, session] of this.sessions) {
      if (session.accountId === accountId) {
        this.sessions.delete(tokenHash);
      }
    }
    const after = this.requireAccountState(accountId);
    this.recordAudit(actor, after, "account.disable", before, after, null, reason);
    return after;
  }

  enableAccount(actor: PublicAccount, accountId: string, reason?: string): AccountState {
    assertAdmin(actor);
    const before = this.requireAccountState(accountId);
    this.requireInternalAccount(accountId).active = true;
    const after = this.requireAccountState(accountId);
    this.recordAudit(actor, after, "account.enable", before, after, null, reason);
    return after;
  }

  resetPassword(
    actor: PublicAccount,
    accountId: string,
    password: string,
    reason?: string
  ): AccountState {
    assertAdmin(actor);
    const before = this.requireAccountState(accountId);
    const account = this.requireInternalAccount(accountId);
    const next = hashPassword(password);
    account.passwordHash = next.passwordHash;
    account.passwordSalt = next.passwordSalt;
    for (const [tokenHash, session] of this.sessions) {
      if (session.accountId === accountId) {
        this.sessions.delete(tokenHash);
      }
    }
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
    this.requireInternalAccount(accountId).role = role;
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
    const balance = before.balance;
    const afterBalance = {
      ...balance,
      vaultCoins: balance.vaultCoins + (delta.vaultCoins ?? 0),
      bonusLives: balance.bonusLives + (delta.bonusLives ?? 0),
      chainBoosts: balance.chainBoosts + (delta.chainBoosts ?? 0),
      vaultBursts: balance.vaultBursts + (delta.vaultBursts ?? 0)
    };
    assertNonNegative(afterBalance);
    this.balances.set(accountId, afterBalance);
    const after = this.requireAccountState(accountId);
    this.recordAudit(actor, after, "inventory.adjust", before, after, delta, reason);
    return after;
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
    this.balances.set(accountId, {
      ...before.balance,
      removeAds: input.removeAds ?? before.balance.removeAds,
      vaultPassExpiresAt:
        input.vaultPassExpiresAt === undefined
          ? before.balance.vaultPassExpiresAt
          : input.vaultPassExpiresAt
    });
    const after = this.requireAccountState(accountId);
    this.recordAudit(actor, after, "entitlements.set", before, after, input, input.reason);
    return after;
  }

  listAudit(actor: PublicAccount, limit = 100): AdminAuditEntry[] {
    assertAdmin(actor);
    return this.audit.slice(-Math.max(1, Math.min(limit, 500))).reverse();
  }

  private requireInternalAccount(accountId: string): InternalAccount {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error("Account not found.");
    }
    return account;
  }

  private requireAccountState(accountId: string): AccountState {
    const state = this.getAccountState(accountId);
    if (!state) {
      throw new Error("Account not found.");
    }
    return state;
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
    this.audit.push({
      id: String(this.audit.length + 1),
      adminAccountId: actor.id,
      adminEmail: actor.email,
      targetAccountId: target.account.id,
      targetInstallId: target.linkedInstallId,
      action,
      before,
      after,
      delta,
      reason: reason?.trim() || null,
      createdAt: new Date().toISOString()
    });
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicAccount(account: InternalAccount): PublicAccount {
  return {
    id: account.id,
    email: account.email,
    role: account.role,
    active: account.active,
    createdAt: account.createdAt
  };
}

function ensureMinimumBalance(
  current: LedgerBalance,
  minimum: Partial<LedgerBalance> = {}
): LedgerBalance {
  return {
    vaultCoins: Math.max(current.vaultCoins, minimum.vaultCoins ?? 0),
    bonusLives: Math.max(current.bonusLives, minimum.bonusLives ?? 0),
    chainBoosts: Math.max(current.chainBoosts, minimum.chainBoosts ?? 0),
    vaultBursts: Math.max(current.vaultBursts, minimum.vaultBursts ?? 0),
    removeAds: current.removeAds || Boolean(minimum.removeAds),
    vaultPassExpiresAt: current.vaultPassExpiresAt ?? minimum.vaultPassExpiresAt ?? null
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
