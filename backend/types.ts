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
}
