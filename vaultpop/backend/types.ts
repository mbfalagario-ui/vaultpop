export type VerifiedAppleTransaction = {
  transactionId: string;
  productId: string;
  expiresAt: string | null;
  revokedAt: string | null;
};

export type LedgerBalance = {
  vaultCoins: number;
  bonusLives: number;
  chainBoosts: number;
  vaultBursts: number;
  removeAds: boolean;
  vaultPassExpiresAt: string | null;
};

export type AppliedTransaction = {
  firstGrant: boolean;
  inventoryGrantAllowed: boolean;
  balance: LedgerBalance;
};

export type AccountRole = "player" | "reviewer" | "admin";

export type PublicAccount = {
  id: string;
  email: string;
  role: AccountRole;
  active: boolean;
  createdAt: string;
};

export type SupportTicketSummary = {
  id: string;
  category: string;
  message: string;
  email: string | null;
  priority: boolean;
  tier: "premium" | "standard";
  createdAt: string;
};

export type AccountState = {
  account: PublicAccount;
  linkedInstallId: string | null;
  balance: LedgerBalance;
  supportTickets: SupportTicketSummary[];
};

export type AuthSession = {
  token: string;
  expiresAt: string;
  state: AccountState;
};

export type AdminAuditEntry = {
  id: string;
  adminAccountId: string;
  adminEmail: string;
  targetAccountId: string;
  targetInstallId: string | null;
  action: string;
  before: unknown;
  after: unknown;
  delta: unknown;
  reason: string | null;
  createdAt: string;
};

export interface PurchaseVerifier {
  verify(signedTransaction: string): Promise<VerifiedAppleTransaction>;
}

export interface LedgerStore {
  applyTransaction(
    installId: string,
    transaction: VerifiedAppleTransaction
  ): AppliedTransaction;
  getBalance(installId: string): LedgerBalance;
  createSupportTicket(input: {
    installId: string;
    category: string;
    message: string;
    email?: string;
    appVersion: string;
    buildNumber: string;
    deviceInfo: string;
    priority: boolean;
  }): string;
  /**
   * Account-deletion support: removes the install's balance row and detaches
   * retained purchase records from the install. Purchase records are kept
   * (de-identified) for duplicate-grant fraud prevention and financial
   * history.
   */
  deleteInstallData(installId: string): void;
}

export interface AccountStore {
  upsertBootstrapAccount(input: {
    email: string;
    password: string;
    role: AccountRole;
    initialBalance?: Partial<LedgerBalance>;
  }): PublicAccount;
  login(input: {
    email: string;
    password: string;
    installId: string;
    now?: Date;
  }): AuthSession | null;
  /**
   * Public self-service sign-up. Always creates a "player" role account —
   * roles can never be self-assigned. Throws on duplicate email or weak
   * password; returns a signed-in session on success.
   */
  registerPlayer(input: {
    email: string;
    password: string;
    installId: string;
    now?: Date;
  }): AuthSession;
  authenticate(token: string, now?: Date): PublicAccount | null;
  revokeSession(token: string): void;
  /** Reauthentication check for destructive self-service actions. */
  verifyAccountPassword(accountId: string, password: string): boolean;
  /**
   * Permanent self-service deletion. Removes the account, credentials, all
   * sessions, the install link, and the account balance. Returns the install
   * ID that was linked so callers can purge install-keyed data.
   */
  deleteAccount(accountId: string): { linkedInstallId: string | null };
  getAccountState(accountId: string): AccountState | null;
  getAccountStateByInstallId(installId: string): AccountState | null;
  listAccounts(input?: {
    query?: string;
    role?: AccountRole;
  }): AccountState[];
  createAccount(
    actor: PublicAccount,
    input: { email: string; password: string; role: AccountRole; reason?: string }
  ): AccountState;
  disableAccount(
    actor: PublicAccount,
    accountId: string,
    reason?: string
  ): AccountState;
  enableAccount(
    actor: PublicAccount,
    accountId: string,
    reason?: string
  ): AccountState;
  resetPassword(
    actor: PublicAccount,
    accountId: string,
    password: string,
    reason?: string
  ): AccountState;
  changeRole(
    actor: PublicAccount,
    accountId: string,
    role: AccountRole,
    reason?: string
  ): AccountState;
  adjustInventory(
    actor: PublicAccount,
    accountId: string,
    delta: Partial<
      Pick<LedgerBalance, "vaultCoins" | "bonusLives" | "chainBoosts" | "vaultBursts">
    >,
    reason?: string
  ): AccountState;
  setEntitlements(
    actor: PublicAccount,
    accountId: string,
    input: {
      removeAds?: boolean;
      vaultPassExpiresAt?: string | null;
      reason?: string;
    }
  ): AccountState;
  listAudit(actor: PublicAccount, limit?: number): AdminAuditEntry[];
}
