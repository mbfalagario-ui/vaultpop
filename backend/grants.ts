import { getProductDefinition } from "../src/monetization/catalog";
import type { ProductGrant } from "../src/monetization/catalog";
import type { VerifiedAppleTransaction } from "./types";

export function grantForTransaction(
  transaction: VerifiedAppleTransaction
): ProductGrant {
  if (transaction.revokedAt) {
    return {};
  }
  return getProductDefinition(transaction.productId)?.grant ?? {};
}
