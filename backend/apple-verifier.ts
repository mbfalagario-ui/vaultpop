import {
  Environment,
  SignedDataVerifier
} from "@apple/app-store-server-library";
import { readFileSync } from "node:fs";

import type { PurchaseVerifier, VerifiedAppleTransaction } from "./types";

const BUNDLE_ID = "app.vaultpop";
const APP_APPLE_ID = 6784736480;

export class ApplePurchaseVerifier implements PurchaseVerifier {
  private productionVerifier: SignedDataVerifier;
  private sandboxVerifier: SignedDataVerifier;

  constructor(certificatePaths: string[]) {
    if (certificatePaths.length === 0) {
      throw new Error("Apple root certificate paths are required.");
    }
    const certificates = certificatePaths.map((path) => readFileSync(path));
    this.productionVerifier = new SignedDataVerifier(
      certificates,
      true,
      Environment.PRODUCTION,
      BUNDLE_ID,
      APP_APPLE_ID
    );
    this.sandboxVerifier = new SignedDataVerifier(
      certificates,
      true,
      Environment.SANDBOX,
      BUNDLE_ID
    );
  }

  async verify(signedTransaction: string): Promise<VerifiedAppleTransaction> {
    let decoded;
    try {
      decoded =
        await this.productionVerifier.verifyAndDecodeTransaction(signedTransaction);
    } catch {
      decoded =
        await this.sandboxVerifier.verifyAndDecodeTransaction(signedTransaction);
    }
    if (!decoded.transactionId || !decoded.productId || decoded.bundleId !== BUNDLE_ID) {
      throw new Error("Signed transaction is missing required app data.");
    }
    return {
      transactionId: decoded.transactionId,
      productId: decoded.productId,
      expiresAt: decoded.expiresDate
        ? new Date(decoded.expiresDate).toISOString()
        : null,
      revokedAt: decoded.revocationDate
        ? new Date(decoded.revocationDate).toISOString()
        : null
    };
  }
}
