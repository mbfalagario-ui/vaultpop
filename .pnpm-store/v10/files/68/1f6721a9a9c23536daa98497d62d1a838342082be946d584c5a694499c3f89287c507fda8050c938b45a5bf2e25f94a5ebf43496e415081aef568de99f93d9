import type { ProductQueryType, RequestPurchaseProps, AlternativeBillingModeAndroid, BillingProgramAndroid, UserChoiceBillingDetails, VerifyPurchaseProps, VerifyPurchaseResult, VerifyPurchaseWithProviderProps, VerifyPurchaseWithProviderResult, PurchaseOptions } from '../types';
import type { ActiveSubscription, Product, Purchase, PurchaseError, PurchaseUpdatedListenerOptions, ProductSubscription } from '../types';
import type { MutationFinishTransactionArgs } from '../types';
type UseIap = {
    connected: boolean;
    products: Product[];
    subscriptions: ProductSubscription[];
    availablePurchases: Purchase[];
    promotedProductIOS?: Product;
    activeSubscriptions: ActiveSubscription[];
    /**
     * Complete a purchase transaction. Call after server-side verification to remove it
     * from the queue.
     *
     * @param args.purchase The `Purchase` to finalize.
     * @param args.isConsumable `true` for consumables (consumes the token so the SKU can be
     *   re-bought, e.g. coins); `false` (default) for non-consumables and subscriptions.
     * @returns Promise that resolves once the platform finalizes the transaction.
     * @throws When the platform finalize call fails.
     *
     * @example
     * ```ts
     * purchaseUpdatedListener(async (purchase) => {
     *   if (await verifyOnServer(purchase)) {
     *     await finishTransaction({ purchase, isConsumable: false });
     *   }
     * });
     * ```
     *
     * @remarks **Critical:** Android purchases must be finalized within 3 days or Google
     *   auto-refunds. iOS unfinished transactions replay on every app launch.
     *
     * @see {@link https://openiap.dev/docs/apis/finish-transaction}
     */
    finishTransaction: (args: MutationFinishTransactionArgs) => Promise<void>;
    /**
     * List the user's unfinished purchases — non-consumables, active subscriptions, and any
     * pending transactions not yet finished.
     *
     * @param options Optional `PurchaseOptions`.
     *   - iOS: `alsoPublishToEventListenerIOS`, `onlyIncludeActiveItemsIOS`.
     *   - Android: `includeSuspendedAndroid` (include subscriptions in a paused/grace state).
     * @returns Promise that resolves when the request is dispatched; results land in the
     *   hook's reactive `availablePurchases` state — read from there, don't expect a return value.
     * @throws When the platform query fails.
     *
     * @example
     * ```ts
     * const { availablePurchases, getAvailablePurchases, finishTransaction } = useIAP();
     *
     * useEffect(() => {
     *   void getAvailablePurchases();
     * }, [getAvailablePurchases]);
     *
     * useEffect(() => {
     *   for (const p of availablePurchases) {
     *     void verifyOnServer(p).then((ok) => {
     *       if (ok) finishTransaction({ purchase: p, isConsumable: false });
     *     });
     *   }
     * }, [availablePurchases, finishTransaction]);
     * ```
     *
     * @see {@link https://openiap.dev/docs/apis/get-available-purchases}
     */
    getAvailablePurchases: (options?: PurchaseOptions) => Promise<void>;
    /**
     * Retrieve products or subscriptions from the store by SKU.
     *
     * @param params `ProductRequest` — `skus` (string[]) and optional `type`
     *   (`'in-app' | 'subs' | 'all'`, defaults to `'in-app'`).
     * @returns Promise that resolves when the request is dispatched; results land in the
     *   hook's reactive `products` / `subscriptions` state — read from there, don't expect a return value.
     * @throws When the store rejects the request (empty `skus`, not connected,
     *   network/store error). Unknown SKUs are simply omitted from the result, not thrown.
     *
     * @example
     * ```ts
     * const { products, fetchProducts } = useIAP();
     *
     * useEffect(() => {
     *   void fetchProducts({
     *     skus: ['com.app.coins_100', 'com.app.premium'],
     *     type: 'in-app',
     *   });
     * }, [fetchProducts]);
     *
     * // Render `products` directly from hook state.
     * ```
     *
     * @remarks This is a regular promise-based call. Don't confuse with `request*` APIs
     *   (`requestPurchase`), which are event-based.
     *
     * @see {@link https://openiap.dev/docs/apis/fetch-products}
     */
    fetchProducts: (params: {
        skus: string[];
        type?: ProductQueryType | null;
    }) => Promise<void>;
    /**
     * Initiate a purchase or subscription flow. The result is delivered through
     * `purchaseUpdatedListener` — NOT the return value.
     *
     * @param props `RequestPurchaseProps`, discriminated by `type`:
     *   - `type: 'in-app'` — pass `request.apple.sku` (iOS) and/or `request.google.skus` (Android).
     *   - `type: 'subs'`  — same shape, plus `request.google.subscriptionOffers: [{ sku, offerToken }]`.
     * @returns Promise that resolves when the request is dispatched; results land in the
     *   hook's `onPurchaseSuccess` / `onPurchaseError` callbacks.
     * @throws Synchronous rejection from the store (e.g. `E_NOT_PREPARED`, validation failure).
     *
     * @example
     * ```ts
     * await requestPurchase({
     *   request: {
     *     apple: { sku: 'com.app.premium' },
     *     google: { skus: ['com.app.premium'] },
     *   },
     *   type: 'in-app',
     * });
     * ```
     *
     * @remarks Event-based. Listen for the result via {@link purchaseUpdatedListener} /
     *   {@link purchaseErrorListener}, or use `useIAP({ onPurchaseSuccess, onPurchaseError })`.
     *
     * @see {@link https://openiap.dev/docs/apis/request-purchase}
     */
    requestPurchase: (params: RequestPurchaseProps) => Promise<void>;
    /**
     * @deprecated Use `verifyPurchase` instead. This function will be removed in a future version.
     *
     * @see {@link https://openiap.dev/docs/apis/validate-receipt}
     */
    validateReceipt: (options: VerifyPurchaseProps) => Promise<VerifyPurchaseResult>;
    /**
     * Verify a purchase against your own backend (returns isValid + raw store metadata).
     *
     * @see {@link https://openiap.dev/docs/features/validation#verify-purchase}
     */
    verifyPurchase: (options: VerifyPurchaseProps) => Promise<VerifyPurchaseResult>;
    /**
     * Verify via a managed provider — currently only `iapkit` (IAPKit). The PurchaseVerificationProvider enum exposes no other provider literal today.
     *
     * @see {@link https://openiap.dev/docs/features/validation#verify-purchase-with-provider}
     */
    verifyPurchaseWithProvider: (options: VerifyPurchaseWithProviderProps) => Promise<VerifyPurchaseWithProviderResult>;
    /**
     * Restore non-consumable and active subscription purchases.
     *
     * @see {@link https://openiap.dev/docs/apis/restore-purchases}
     */
    restorePurchases: (options?: PurchaseOptions) => Promise<void>;
    /**
     * Read the App Store-promoted product, if any.
     *
     * @see {@link https://openiap.dev/docs/apis/ios/get-promoted-product-ios}
     */
    getPromotedProductIOS: () => Promise<Product | null>;
    /**
     * Buy the currently promoted product.
     *
     * @see {@link https://openiap.dev/docs/apis/ios/request-purchase-on-promoted-product-ios}
     */
    requestPurchaseOnPromotedProductIOS: () => Promise<boolean>;
    /**
     * Get details of all currently active subscriptions.
     *
     * @see {@link https://openiap.dev/docs/apis/get-active-subscriptions}
     */
    getActiveSubscriptions: (subscriptionIds?: string[]) => Promise<ActiveSubscription[]>;
    /**
     * Check whether the user has any active subscription.
     *
     * @see {@link https://openiap.dev/docs/apis/has-active-subscriptions}
     */
    hasActiveSubscriptions: (subscriptionIds?: string[]) => Promise<boolean>;
    /**
     * Manually retry the store connection.
     * Useful when the initial auto-connect fails (e.g., Play Store not ready at mount time).
     * Updates the `connected` state on success.
     */
    reconnect: () => Promise<boolean>;
    /**
     * Check whether alternative billing is available for the user.
     *
     * @see {@link https://openiap.dev/docs/apis/android/check-alternative-billing-availability-android}
     */
    checkAlternativeBillingAvailabilityAndroid?: () => Promise<boolean>;
    /**
     * Display Google's alternative billing information dialog.
     *
     * @see {@link https://openiap.dev/docs/apis/android/show-alternative-billing-dialog-android}
     */
    showAlternativeBillingDialogAndroid?: () => Promise<boolean>;
    /**
     * Create a reporting token for an alternative billing flow.
     *
     * @see {@link https://openiap.dev/docs/apis/android/create-alternative-billing-token-android}
     */
    createAlternativeBillingTokenAndroid?: (sku?: string) => Promise<string | null>;
};
export interface UseIapOptions {
    onPurchaseSuccess?: (purchase: Purchase) => void;
    /**
     * Options for the purchase success listener. iOS defaults to suppressing
     * StoreKit replay events for the same transaction ID; set
     * `dedupeTransactionIOS` to false only for diagnostics.
     */
    purchaseUpdatedListenerOptions?: PurchaseUpdatedListenerOptions | null;
    onPurchaseError?: (error: PurchaseError) => void;
    /** Callback for non-purchase errors (fetchProducts, getAvailablePurchases, etc.) */
    onError?: (error: Error) => void;
    onPromotedProductIOS?: (product: Product) => void;
    onUserChoiceBillingAndroid?: (details: UserChoiceBillingDetails) => void;
    /**
     * Fires when an active subscription enters a billing-issue state
     * (StoreKit 2 Message.billingIssue on iOS 18+, Purchase.isSuspended on
     * Play Billing 8.1+). Not invoked on Meta Horizon.
     *
     * Recommended: call deepLinkToSubscriptions on the returned purchase so
     * the user can update their payment method in the platform subscription
     * center.
     */
    onSubscriptionBillingIssue?: (purchase: Purchase) => void;
    /**
     * @deprecated Use enableBillingProgramAndroid instead.
     * - 'user-choice' → 'user-choice-billing'
     * - 'alternative-only' → 'external-offer'
     */
    alternativeBillingModeAndroid?: AlternativeBillingModeAndroid;
    /**
     * Enable a specific billing program for Android (8.2.0+)
     * Use 'user-choice-billing' for User Choice Billing (7.0+).
     * Use 'external-offer' for External Offer program.
     * Use 'external-payments' for Developer Provided Billing (Japan only, 8.3.0+).
     */
    enableBillingProgramAndroid?: BillingProgramAndroid;
}
/**
 * React Hook for managing In-App Purchases.
 * See documentation at https://react-native-iap.hyo.dev/docs/hooks/useIAP
 */
export declare function useIAP(options?: UseIapOptions): UseIap;
export {};
//# sourceMappingURL=useIAP.d.ts.map