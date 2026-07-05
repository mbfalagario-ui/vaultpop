import { DatabaseSync } from "node:sqlite";

import { getProductDefinition } from "../src/monetization/catalog";
import { grantForTransaction } from "./grants";
import type {
  AppliedTransaction,
  LedgerBalance,
  LedgerStore,
  VerifiedAppleTransaction
} from "./types";

export class SqliteLedgerStore implements LedgerStore {
  private database: DatabaseSync;

  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS balances (
        install_id TEXT PRIMARY KEY,
        vault_coins INTEGER NOT NULL DEFAULT 0,
        bonus_lives INTEGER NOT NULL DEFAULT 0,
        chain_boosts INTEGER NOT NULL DEFAULT 0,
        vault_bursts INTEGER NOT NULL DEFAULT 0,
        remove_ads INTEGER NOT NULL DEFAULT 0,
        vault_pass_expires_at TEXT
      );
      CREATE TABLE IF NOT EXISTS transactions (
        transaction_id TEXT PRIMARY KEY,
        install_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
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
    `);
  }

  applyTransaction(
    installId: string,
    transaction: VerifiedAppleTransaction
  ): AppliedTransaction {
    const definition = getProductDefinition(transaction.productId);
    if (!definition) {
      throw new Error("Unknown product.");
    }

    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database
        .prepare("INSERT OR IGNORE INTO balances (install_id) VALUES (?)")
        .run(installId);
      const existing = this.database
        .prepare(
          "SELECT install_id FROM transactions WHERE transaction_id = ?"
        )
        .get(transaction.transactionId) as { install_id: string } | undefined;
      if (
        existing &&
        existing.install_id !== installId &&
        definition.kind === "consumable"
      ) {
        throw new Error("Transaction already belongs to another install.");
      }
      const firstGrant = !existing;
      const inventoryGrantAllowed = firstGrant || existing?.install_id === installId;
      if (firstGrant) {
        this.database
          .prepare(
            "INSERT INTO transactions (transaction_id, install_id, product_id, created_at) VALUES (?, ?, ?, ?)"
          )
          .run(
            transaction.transactionId,
            installId,
            transaction.productId,
            new Date().toISOString()
          );
      }

      const grant = grantForTransaction(transaction);
      const grantInventory = firstGrant && !transaction.revokedAt;
      this.database
        .prepare(`
          UPDATE balances SET
            vault_coins = vault_coins + ?,
            bonus_lives = bonus_lives + ?,
            chain_boosts = chain_boosts + ?,
            vault_bursts = vault_bursts + ?,
            remove_ads = CASE
              WHEN ? = 1 THEN ?
              ELSE remove_ads
            END,
            vault_pass_expires_at = CASE
              WHEN ? = 1 THEN ?
              ELSE vault_pass_expires_at
            END
          WHERE install_id = ?
        `)
        .run(
          grantInventory ? grant.vaultCoins ?? 0 : 0,
          grantInventory ? grant.bonusLives ?? 0 : 0,
          grantInventory ? grant.chainBoosts ?? 0 : 0,
          grantInventory ? grant.vaultBursts ?? 0 : 0,
          transaction.productId === "app.vaultpop.remove_ads"
            ? 1
            : 0,
          transaction.revokedAt ? 0 : 1,
          transaction.productId === "app.vaultpop.vaultpass.monthly" ? 1 : 0,
          transaction.revokedAt ? null : transaction.expiresAt,
          installId
        );
      this.database.exec("COMMIT");
      return {
        firstGrant,
        inventoryGrantAllowed,
        balance: this.getBalance(installId)
      };
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  getBalance(installId: string): LedgerBalance {
    const row = this.database
      .prepare("SELECT * FROM balances WHERE install_id = ?")
      .get(installId) as
      | {
          vault_coins: number;
          bonus_lives: number;
          chain_boosts: number;
          vault_bursts: number;
          remove_ads: number;
          vault_pass_expires_at: string | null;
        }
      | undefined;
    return {
      vaultCoins: row?.vault_coins ?? 0,
      bonusLives: row?.bonus_lives ?? 0,
      chainBoosts: row?.chain_boosts ?? 0,
      vaultBursts: row?.vault_bursts ?? 0,
      removeAds: row?.remove_ads === 1,
      vaultPassExpiresAt: row?.vault_pass_expires_at ?? null
    };
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
    const result = this.database
      .prepare(`
        INSERT INTO support_tickets (
          install_id, category, message, email, app_version,
          build_number, device_info, priority, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        new Date().toISOString()
      );
    return `VP-${Number(result.lastInsertRowid).toString().padStart(6, "0")}`;
  }
}
