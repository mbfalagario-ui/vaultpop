import { getProductDefinition } from "../src/monetization/catalog";
import { grantForTransaction } from "./grants";
import type {
  AppliedTransaction,
  LedgerBalance,
  LedgerStore,
  VerifiedAppleTransaction
} from "./types";

const EMPTY_BALANCE: LedgerBalance = {
  vaultCoins: 0,
  bonusLives: 0,
  chainBoosts: 0,
  vaultBursts: 0,
  removeAds: false,
  vaultPassExpiresAt: null
};

export class MemoryLedgerStore implements LedgerStore {
  private balances = new Map<string, LedgerBalance>();
  private transactions = new Map<string, string>();
  private tickets = new Map<string, object>();

  applyTransaction(
    installId: string,
    transaction: VerifiedAppleTransaction
  ): AppliedTransaction {
    const definition = getProductDefinition(transaction.productId);
    if (!definition) {
      throw new Error("Unknown product.");
    }
    const priorInstallId = this.transactions.get(transaction.transactionId);
    const firstGrant = !priorInstallId;
    const inventoryGrantAllowed = firstGrant || priorInstallId === installId;
    if (
      priorInstallId &&
      priorInstallId !== installId &&
      definition.kind === "consumable"
    ) {
      throw new Error("Transaction already belongs to another install.");
    }

    const current = this.getBalance(installId);
    const grant = grantForTransaction(transaction);
    const shouldGrantInventory = firstGrant && !transaction.revokedAt;
    const next: LedgerBalance = {
      vaultCoins:
        current.vaultCoins + (shouldGrantInventory ? grant.vaultCoins ?? 0 : 0),
      bonusLives:
        current.bonusLives + (shouldGrantInventory ? grant.bonusLives ?? 0 : 0),
      chainBoosts:
        current.chainBoosts + (shouldGrantInventory ? grant.chainBoosts ?? 0 : 0),
      vaultBursts:
        current.vaultBursts + (shouldGrantInventory ? grant.vaultBursts ?? 0 : 0),
      removeAds:
        transaction.productId === "app.vaultpop.remove_ads"
          ? !transaction.revokedAt
          : current.removeAds,
      vaultPassExpiresAt:
        transaction.productId === "app.vaultpop.vaultpass.plus.monthly"
          ? transaction.revokedAt
            ? null
            : transaction.expiresAt
          : current.vaultPassExpiresAt
    };

    this.transactions.set(transaction.transactionId, priorInstallId ?? installId);
    this.balances.set(installId, next);
    return { firstGrant, inventoryGrantAllowed, balance: next };
  }

  getBalance(installId: string): LedgerBalance {
    return { ...(this.balances.get(installId) ?? EMPTY_BALANCE) };
  }

  createSupportTicket(input: {
    installId: string;
    category: string;
    message: string;
    email?: string;
    appVersion: string;
    buildNumber: string;
    deviceInfo: string;
    priority: boolean;
  }): string {
    const ticketId = `VP-${(this.tickets.size + 1).toString().padStart(6, "0")}`;
    this.tickets.set(ticketId, input);
    return ticketId;
  }
}
