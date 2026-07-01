import {
  getProductDefinition,
  isConsumableProduct,
  ONE_TIME_PRODUCT_IDS,
  SUBSCRIPTION_PRODUCT_IDS,
  type IapProductId
} from "@/monetization/catalog";
import type { VerifiedPurchaseGrant } from "@/monetization/economy";
import type { Product, ProductSubscription, Purchase, PurchaseError } from "react-native-iap";

export type StoreProduct = Product | ProductSubscription;

export type StoreSession = {
  close: () => Promise<void>;
  fetchCatalog: () => Promise<StoreProduct[]>;
  purchase: (productId: IapProductId) => Promise<void>;
  restore: () => Promise<Purchase[]>;
  finish: (purchase: Purchase) => Promise<void>;
};

type StoreSessionHandlers = {
  onPurchase: (purchase: Purchase) => void | Promise<void>;
  onError: (message: string) => void;
};

export async function createStoreSession(
  handlers: StoreSessionHandlers
): Promise<StoreSession> {
  const iap = await import("react-native-iap");
  await iap.initConnection();
  const purchaseSubscription = iap.purchaseUpdatedListener((purchase) => {
    void handlers.onPurchase(purchase);
  });
  const errorSubscription = iap.purchaseErrorListener((error: PurchaseError) => {
    handlers.onError(toFriendlyPurchaseError(error));
  });

  return {
    close: async () => {
      purchaseSubscription.remove();
      errorSubscription.remove();
      await iap.endConnection();
    },
    fetchCatalog: async () => {
      const [products, subscriptions] = await Promise.all([
        iap.fetchProducts({ skus: [...ONE_TIME_PRODUCT_IDS], type: "in-app" }),
        iap.fetchProducts({ skus: [...SUBSCRIPTION_PRODUCT_IDS], type: "subs" })
      ]);
      return [...(products ?? []), ...(subscriptions ?? [])];
    },
    purchase: async (productId) => {
      const definition = getProductDefinition(productId);
      if (!definition) {
        throw new Error("This product is not available.");
      }
      await iap.requestPurchase({
        type: definition.kind === "subscription" ? "subs" : "in-app",
        request: {
          apple: { sku: productId }
        }
      });
    },
    restore: () =>
      iap.getAvailablePurchases({
        onlyIncludeActiveItemsIOS: true
      }),
    finish: (purchase) =>
      iap.finishTransaction({
        purchase,
        isConsumable: isConsumableProduct(purchase.productId)
      })
  };
}

export async function verifyPurchaseWithServer(
  purchase: Purchase,
  installId: string
): Promise<VerifiedPurchaseGrant> {
  if (purchase.purchaseState !== "purchased") {
    throw new Error("This purchase is still pending.");
  }
  if (!purchase.purchaseToken) {
    throw new Error("The App Store did not provide a signed transaction.");
  }

  const baseUrl = process.env.EXPO_PUBLIC_VAULTPOP_API_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("Purchase verification is temporarily unavailable.");
  }

  const response = await fetch(`${baseUrl}/v1/purchases/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      installId,
      signedTransaction: purchase.purchaseToken
    })
  });
  const body = (await response.json().catch(() => null)) as
    | (VerifiedPurchaseGrant & { error?: never })
    | { error?: string }
    | null;

  if (!response.ok || !body || !("verified" in body) || body.verified !== true) {
    throw new Error(body && "error" in body && body.error ? body.error : "Purchase verification failed.");
  }
  return body;
}

function toFriendlyPurchaseError(error: PurchaseError): string {
  if (error.code === "user-cancelled") {
    return "Purchase cancelled. Nothing was charged.";
  }
  if (error.code === "deferred-payment") {
    return "Purchase pending approval. No items have been granted.";
  }
  return "The purchase did not complete. Please try again.";
}
