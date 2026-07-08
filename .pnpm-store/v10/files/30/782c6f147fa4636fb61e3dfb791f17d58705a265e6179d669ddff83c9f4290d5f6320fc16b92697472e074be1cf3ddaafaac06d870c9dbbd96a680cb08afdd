import 'react-native-nitro-modules';
import type { ExternalPurchaseCustomLinkNoticeResultIOS, ExternalPurchaseCustomLinkNoticeTypeIOS, ExternalPurchaseCustomLinkTokenResultIOS, ExternalPurchaseCustomLinkTokenTypeIOS, ExternalPurchaseNoticeResultIOS, MutationField, Product, ProductIOS, Purchase, PurchaseError, PurchaseUpdatedListenerOptions, QueryField, DeveloperProvidedBillingDetailsAndroid, UserChoiceBillingDetails } from './types';
import type { BillingProgramAndroid } from './types';
export type { RnIap, NitroProduct, NitroPurchase, NitroPurchaseResult, } from './specs/RnIap.nitro';
export * from './types';
export * from './utils/error';
export type ProductTypeInput = 'inapp' | 'in-app' | 'subs';
export interface EventSubscription {
    remove(): void;
}
export { useIAP } from './hooks/useIAP';
export { useWebhookEvents } from './hooks/useWebhookEvents';
export type { UseWebhookEventsOptions, UseWebhookEventsResult, } from './hooks/useWebhookEvents';
export { connectWebhookStream, parseWebhookEventData } from './webhook-client';
export type { WebhookEventPayload, WebhookEventStream, WebhookEventType as WebhookEventTypeName, WebhookListener, WebhookListenerError, WebhookListenerOptions, } from './webhook-client';
export { kitApi, KitApiError } from './kit-api';
export type { KitApiOptions, KitSubscription, EntitlementsResponse, StatusResponse, } from './kit-api';
/**
 * Check if Nitro runtime is ready for IAP operations.
 * This is useful for platforms like tvOS where Nitro may initialize later.
 * @returns true if Nitro is ready, false otherwise
 */
export declare const isNitroReady: () => boolean;
/**
 * Check if we're running on tvOS.
 * tvOS reports Platform.OS as 'ios' but has Platform.isTV = true.
 */
export declare const isTVOS: () => boolean;
/**
 * Check if we're running on macOS (Catalyst or native).
 * macOS may report Platform.OS as 'ios' (Catalyst) or 'macos'.
 */
export declare const isMacOS: () => boolean;
/**
 * Check if we're running on a standard iOS device (iPhone/iPad, not tvOS or macOS Catalyst).
 */
export declare const isStandardIOS: () => boolean;
/**
 * Reset all JS-level listener tracking state.
 * Called during endConnection to ensure clean re-registration on next initConnection.
 */
export declare const resetListenerState: () => void;
export declare const purchaseUpdatedListener: (listener: (purchase: Purchase) => void, options?: PurchaseUpdatedListenerOptions | null) => EventSubscription;
export declare const purchaseErrorListener: (listener: (error: PurchaseError) => void) => EventSubscription;
export declare const promotedProductListenerIOS: (listener: (product: Product) => void) => EventSubscription;
export declare const userChoiceBillingListenerAndroid: (listener: (details: UserChoiceBillingDetails) => void) => EventSubscription;
export declare const developerProvidedBillingListenerAndroid: (listener: (details: DeveloperProvidedBillingDetailsAndroid) => void) => EventSubscription;
export declare const subscriptionBillingIssueListener: (listener: (purchase: Purchase) => void) => EventSubscription;
/**
 * Retrieve products or subscriptions from the store by SKU.
 *
 * @param request `ProductRequest` — `skus` (string[]) and optional `type`
 *   (`'in-app' | 'subs' | 'all'`, defaults to `'in-app'`).
 * @returns Promise resolving to a `FetchProductsResult` union — `Product[]` for `'in-app'`,
 *   `ProductSubscription[]` for `'subs'`, a mixed array for `'all'`, or `null`
 *   (the schema retains the nullable branch for backwards compatibility).
 * @throws When the store rejects the request (empty `skus`, not connected,
 *   network/store error). Unknown SKUs are simply omitted from the result, not thrown.
 *
 * @example
 * ```ts
 * const products = await fetchProducts({
 *   skus: ['com.app.coins_100', 'com.app.premium'],
 *   type: 'in-app',
 * });
 * ```
 *
 * @remarks This is a regular promise-based call. Don't confuse with `request*` APIs
 *   (`requestPurchase`), which are event-based.
 *
 * @see {@link https://openiap.dev/docs/apis/fetch-products}
 */
export declare const fetchProducts: QueryField<'fetchProducts'>;
/**
 * List the user's unfinished purchases — non-consumables, active subscriptions, and any
 * pending transactions not yet finished.
 *
 * @param options Optional `PurchaseOptions`.
 *   - iOS: `alsoPublishToEventListenerIOS`, `onlyIncludeActiveItemsIOS`.
 *   - Android: `includeSuspendedAndroid` (include subscriptions in a paused/grace state).
 * @returns Promise resolving to an array of `Purchase` currently held by the store.
 * @throws When the platform query fails.
 *
 * @example
 * ```ts
 * const purchases = await getAvailablePurchases();
 * for (const p of purchases) {
 *   if (await verifyOnServer(p)) await finishTransaction({ purchase: p, isConsumable: false });
 * }
 * ```
 *
 * @see {@link https://openiap.dev/docs/apis/get-available-purchases}
 */
export declare const getAvailablePurchases: QueryField<'getAvailablePurchases'>;
/**
 * Request the promoted product from the App Store (iOS only)
 * @returns Promise<Product | null> - The promoted product or null if none available
 * @platform iOS
 *
 * @see {@link https://openiap.dev/docs/apis/ios/get-promoted-product-ios}
 */
export declare const getPromotedProductIOS: QueryField<'getPromotedProductIOS'>;
export declare const requestPromotedProductIOS: () => Promise<ProductIOS | null>;
/**
 * Get the storefront identifier for the user's App Store account (iOS only)
 * @returns Promise<string> - The storefront identifier (e.g., 'USA' for United States)
 * @platform iOS
 *
 * @example
 * ```typescript
 * const storefront = await getStorefrontIOS();
 * console.log('User storefront:', storefront); // e.g., 'USA', 'GBR', 'KOR'
 * ```
 *
 * @see {@link https://openiap.dev/docs/apis/ios/get-storefront-ios}
 */
export declare const getStorefrontIOS: QueryField<'getStorefrontIOS'>;
/**
 * Return the user's storefront country code.
 *
 * @see {@link https://openiap.dev/docs/apis/get-storefront}
 */
export declare const getStorefront: QueryField<'getStorefront'>;
/**
 * iOS only - Gets the original app transaction ID if the app was purchased from the App Store
 * @platform iOS
 * @description
 * This function retrieves the original app transaction information if the app was purchased
 * from the App Store. Returns null if the app was not purchased (e.g., free app or TestFlight).
 *
 * @returns {Promise<string | null>} The original app transaction ID or null
 *
 * @example
 * ```typescript
 * const appTransaction = await getAppTransactionIOS();
 * if (appTransaction) {
 *   console.log('App was purchased, transaction ID:', appTransaction);
 * } else {
 *   console.log('App was not purchased from App Store');
 * }
 * ```
 *
 * @see {@link https://openiap.dev/docs/apis/ios/get-app-transaction-ios}
 */
export declare const getAppTransactionIOS: QueryField<'getAppTransactionIOS'>;
/**
 * Get subscription status for a product (iOS only)
 * @param sku - The product SKU
 * @returns Promise<SubscriptionStatusIOS[]> - Array of subscription status objects
 * @throws Error when called on non-iOS platforms or when IAP is not initialized
 * @platform iOS
 *
 * @see {@link https://openiap.dev/docs/apis/ios/subscription-status-ios}
 */
export declare const subscriptionStatusIOS: QueryField<'subscriptionStatusIOS'>;
/**
 * Get current entitlement for a product (iOS only)
 * @param sku - The product SKU
 * @returns Promise<Purchase | null> - Current entitlement or null
 * @platform iOS
 *
 * @see {@link https://openiap.dev/docs/apis/ios/current-entitlement-ios}
 */
export declare const currentEntitlementIOS: QueryField<'currentEntitlementIOS'>;
/**
 * Get latest transaction for a product (iOS only)
 * @param sku - The product SKU
 * @returns Promise<Purchase | null> - Latest transaction or null
 * @platform iOS
 *
 * @see {@link https://openiap.dev/docs/apis/ios/latest-transaction-ios}
 */
export declare const latestTransactionIOS: QueryField<'latestTransactionIOS'>;
/**
 * Get pending transactions (iOS only)
 * @returns Promise<Purchase[]> - Array of pending transactions
 * @platform iOS
 *
 * @see {@link https://openiap.dev/docs/apis/ios/get-pending-transactions-ios}
 */
export declare const getPendingTransactionsIOS: QueryField<'getPendingTransactionsIOS'>;
/**
 * List every StoreKit transaction (finished + unfinished) for the current user.
 *
 * @see {@link https://openiap.dev/docs/apis/ios/get-all-transactions-ios}
 */
export declare const getAllTransactionsIOS: QueryField<'getAllTransactionsIOS'>;
/**
 * Show manage subscriptions screen (iOS only)
 * @returns Promise<Purchase[]> - Subscriptions where auto-renewal status changed
 * @platform iOS
 *
 * @see {@link https://openiap.dev/docs/apis/ios/show-manage-subscriptions-ios}
 */
export declare const showManageSubscriptionsIOS: MutationField<'showManageSubscriptionsIOS'>;
/**
 * Check if user is eligible for intro offer (iOS only)
 * @param groupID - The subscription group ID
 * @returns Promise<boolean> - Eligibility status
 * @platform iOS
 *
 * @see {@link https://openiap.dev/docs/apis/ios/is-eligible-for-intro-offer-ios}
 */
export declare const isEligibleForIntroOfferIOS: QueryField<'isEligibleForIntroOfferIOS'>;
/**
 * Get receipt data (iOS only)
 * @returns Promise<string> - Base64 encoded receipt data
 * @platform iOS
 *
 * @see {@link https://openiap.dev/docs/apis/ios/get-receipt-data-ios}
 */
export declare const getReceiptDataIOS: QueryField<'getReceiptDataIOS'>;
export declare const getReceiptIOS: () => Promise<string>;
export declare const requestReceiptRefreshIOS: () => Promise<string>;
/**
 * Check if transaction is verified (iOS only)
 * @param sku - The product SKU
 * @returns Promise<boolean> - Verification status
 * @platform iOS
 *
 * @see {@link https://openiap.dev/docs/apis/ios/is-transaction-verified-ios}
 */
export declare const isTransactionVerifiedIOS: QueryField<'isTransactionVerifiedIOS'>;
/**
 * Get transaction JWS representation (iOS only)
 * @param sku - The product SKU
 * @returns Promise<string | null> - JWS representation or null
 * @platform iOS
 *
 * @see {@link https://openiap.dev/docs/apis/ios/get-transaction-jws-ios}
 */
export declare const getTransactionJwsIOS: QueryField<'getTransactionJwsIOS'>;
/**
 * Initialize the store connection. Must be called before any other IAP API.
 *
 * @param config Optional connection config. Use `enableBillingProgramAndroid` (Android,
 *   Play Billing 8.2.0+) to opt into External Payments etc. iOS ignores Android-specific fields.
 * @returns Promise resolving to `true` when the platform billing client is connected.
 * @throws When the platform billing client fails to initialize.
 *
 * @example
 * ```ts
 * await initConnection();
 * await initConnection({ enableBillingProgramAndroid: 'external-offer' });
 * ```
 *
 * @remarks When using `useIAP()`, connection is auto-managed on mount/unmount —
 *   pass options to the hook instead of calling this directly.
 *
 * @see {@link https://openiap.dev/docs/apis/init-connection}
 */
export declare const initConnection: MutationField<'initConnection'>;
/**
 * Close the store connection and release resources.
 *
 * @see {@link https://openiap.dev/docs/apis/end-connection}
 */
export declare const endConnection: MutationField<'endConnection'>;
/**
 * Restore non-consumable and active subscription purchases.
 *
 * @see {@link https://openiap.dev/docs/apis/restore-purchases}
 */
export declare const restorePurchases: MutationField<'restorePurchases'>;
/**
 * Initiate a purchase or subscription flow. The result is delivered through
 * `purchaseUpdatedListener` — NOT the return value.
 *
 * @param request `RequestPurchaseProps`, discriminated by `type`:
 *   - `type: 'in-app'` — pass `request.apple.sku` (iOS) and/or `request.google.skus` (Android).
 *   - `type: 'subs'`  — same shape, plus `request.google.subscriptionOffers: [{ sku, offerToken }]`.
 * @returns The dispatched purchase payload. **Do not rely on it** for the actual outcome.
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
export declare const requestPurchase: MutationField<'requestPurchase'>;
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
export declare const finishTransaction: MutationField<'finishTransaction'>;
/**
 * Acknowledge a purchase (Android only)
 * @param purchaseToken - The purchase token to acknowledge
 * @returns Promise<boolean> - Indicates whether the acknowledgement succeeded
 *
 * @example
 * ```typescript
 * await acknowledgePurchaseAndroid('purchase_token_here');
 * ```
 *
 * @see {@link https://openiap.dev/docs/apis/android/acknowledge-purchase-android}
 */
export declare const acknowledgePurchaseAndroid: MutationField<'acknowledgePurchaseAndroid'>;
/**
 * Consume a purchase (Android only)
 * @param purchaseToken - The purchase token to consume
 * @returns Promise<boolean> - Indicates whether the consumption succeeded
 *
 * @example
 * ```typescript
 * await consumePurchaseAndroid('purchase_token_here');
 * ```
 *
 * @see {@link https://openiap.dev/docs/apis/android/consume-purchase-android}
 */
export declare const consumePurchaseAndroid: MutationField<'consumePurchaseAndroid'>;
/**
 * Validate receipt on both iOS and Android platforms
 * @deprecated Use `verifyPurchase` instead. This function will be removed in a future version.
 * @param options - Platform-specific verification options
 * @param options.apple - Apple App Store verification options (iOS)
 * @param options.google - Google Play verification options (Android)
 * @param options.horizon - Meta Horizon (Quest) verification options
 * @returns Promise<VerifyPurchaseResultIOS | VerifyPurchaseResultAndroid> - Platform-specific receipt validation result
 *
 * @example
 * ```typescript
 * // Use verifyPurchase instead:
 * const result = await verifyPurchase({
 *   apple: { sku: 'premium_monthly' },
 *   google: {
 *     sku: 'premium_monthly',
 *     packageName: 'com.example.app',
 *     purchaseToken: 'token...',
 *     accessToken: 'oauth_token...',
 *     isSub: true
 *   }
 * });
 * ```
 *
 * @see {@link https://openiap.dev/docs/apis/validate-receipt}
 */
export declare const validateReceipt: MutationField<'validateReceipt'>;
/**
 * Verify purchase with the configured providers
 *
 * This function uses the native OpenIAP verifyPurchase implementation
 * which validates purchases using platform-specific methods.
 * This is an alias for validateReceipt for API consistency with OpenIAP.
 *
 * @param options - Receipt validation options containing the SKU
 * @returns Promise resolving to receipt validation result
 *
 * @see {@link https://openiap.dev/docs/features/validation#verify-purchase}
 */
export declare const verifyPurchase: MutationField<'verifyPurchase'>;
/**
 * iOS-only receipt validation alias.
 *
 * @deprecated Use `verifyPurchase` (or `validateReceipt`) instead. Kept so
 * consumers who imported `validateReceiptIOS` — which is still declared on the
 * OpenIAP Query interface — keep working. Throws on non-iOS platforms.
 *
 * @see {@link https://openiap.dev/docs/apis/ios/validate-receipt-ios}
 */
export declare const validateReceiptIOS: QueryField<'validateReceiptIOS'>;
/**
 * Verify purchase with a specific provider (e.g., IAPKit)
 *
 * This function allows you to verify purchases using external verification
 * services like IAPKit, which provide additional validation and security.
 *
 * @param options - Verification options including provider and credentials
 * @returns Promise resolving to provider-specific verification result
 *
 * @example
 * ```typescript
 * const result = await verifyPurchaseWithProvider({
 *   provider: 'iapkit',
 *   iapkit: {
 *     apiKey: 'your-api-key',
 *     apple: { jws: purchase.purchaseToken },
 *     google: { purchaseToken: purchase.purchaseToken },
 *   },
 * });
 * ```
 *
 * @see {@link https://openiap.dev/docs/features/validation#verify-purchase-with-provider}
 */
export declare const verifyPurchaseWithProvider: MutationField<'verifyPurchaseWithProvider'>;
/**
 * Sync iOS purchases with App Store (iOS only)
 * @returns Promise<boolean>
 * @platform iOS
 *
 * @see {@link https://openiap.dev/docs/apis/ios/sync-ios}
 */
export declare const syncIOS: MutationField<'syncIOS'>;
/**
 * Present the code redemption sheet for offer codes (iOS only)
 * @returns Promise<boolean> - Indicates whether the redemption sheet was presented
 * @platform iOS
 *
 * @see {@link https://openiap.dev/docs/apis/ios/present-code-redemption-sheet-ios}
 */
export declare const presentCodeRedemptionSheetIOS: MutationField<'presentCodeRedemptionSheetIOS'>;
/**
 * Buy promoted product on iOS
 * @deprecated In StoreKit 2, promoted products can be purchased directly via the standard `requestPurchase()` flow.
 * Use `promotedProductListenerIOS` to receive the product ID when a user taps a promoted product,
 * then call `requestPurchase()` with the received SKU directly.
 *
 * @example
 * ```typescript
 * // Recommended approach
 * promotedProductListenerIOS(async (product) => {
 *   await requestPurchase({
 *     request: { apple: { sku: product.id } },
 *     type: 'in-app'
 *   });
 * });
 * ```
 *
 * @returns Promise<boolean> - true when the request triggers successfully
 * @platform iOS
 *
 * @see {@link https://openiap.dev/docs/apis/ios/request-purchase-on-promoted-product-ios}
 */
export declare const requestPurchaseOnPromotedProductIOS: () => Promise<boolean>;
/**
 * Clear unfinished transactions on iOS
 * @returns Promise<boolean>
 * @platform iOS
 *
 * @see {@link https://openiap.dev/docs/apis/ios/clear-transaction-ios}
 */
export declare const clearTransactionIOS: MutationField<'clearTransactionIOS'>;
/**
 * Begin a refund request for a product on iOS 15+
 * @param sku - The product SKU to refund
 * @returns Promise<string | null> - The refund status or null if not available
 * @platform iOS
 *
 * @see {@link https://openiap.dev/docs/apis/ios/begin-refund-request-ios}
 */
export declare const beginRefundRequestIOS: MutationField<'beginRefundRequestIOS'>;
/**
 * Deeplinks to native interface that allows users to manage their subscriptions
 * Cross-platform alias aligning with expo-iap
 *
 * @see {@link https://openiap.dev/docs/apis/deep-link-to-subscriptions}
 */
export declare const deepLinkToSubscriptions: MutationField<'deepLinkToSubscriptions'>;
export declare const deepLinkToSubscriptionsIOS: () => Promise<boolean>;
/**
 * Get all active subscriptions with detailed information (OpenIAP compliant)
 * Returns an array of active subscriptions. If subscriptionIds is not provided,
 * returns all active subscriptions. Platform-specific fields are populated based
 * on the current platform.
 *
 * On iOS, this uses the native getActiveSubscriptions method which includes
 * renewalInfoIOS with details about subscription renewal status, pending
 * upgrades/downgrades, and auto-renewal preferences.
 *
 * @param subscriptionIds - Optional array of subscription IDs to filter by
 * @returns Promise<ActiveSubscription[]> - Array of active subscriptions
 *
 * @see {@link https://openiap.dev/docs/apis/get-active-subscriptions}
 */
export declare const getActiveSubscriptions: QueryField<'getActiveSubscriptions'>;
/**
 * Check if the user has any active subscriptions (OpenIAP compliant)
 * Returns true if the user has at least one active subscription, false otherwise.
 * If subscriptionIds is provided, only checks for those specific subscriptions.
 *
 * @param subscriptionIds - Optional array of subscription IDs to check
 * @returns Promise<boolean> - True if there are active subscriptions
 *
 * @see {@link https://openiap.dev/docs/apis/has-active-subscriptions}
 */
export declare const hasActiveSubscriptions: QueryField<'hasActiveSubscriptions'>;
export { convertNitroProductToProduct, convertNitroPurchaseToPurchase, convertProductToProductSubscription, validateNitroProduct, validateNitroPurchase, checkTypeSynchronization, } from './utils/type-bridge';
/**
 * @deprecated Use acknowledgePurchaseAndroid instead
 */
export declare const acknowledgePurchase: (args: string) => Promise<boolean>;
/**
 * @deprecated Use consumePurchaseAndroid instead
 */
export declare const consumePurchase: (args: string) => Promise<boolean>;
/**
 * Check if alternative billing is available for this user/device (Android only).
 * Step 1 of alternative billing flow.
 *
 * @returns Promise<boolean> - true if available, false otherwise
 * @throws Error if billing client not ready
 * @platform Android
 *
 * @example
 * ```typescript
 * const isAvailable = await checkAlternativeBillingAvailabilityAndroid();
 * if (isAvailable) {
 *   // Proceed with alternative billing flow
 * }
 * ```
 *
 * @see {@link https://openiap.dev/docs/apis/android/check-alternative-billing-availability-android}
 */
export declare const checkAlternativeBillingAvailabilityAndroid: MutationField<'checkAlternativeBillingAvailabilityAndroid'>;
/**
 * Show alternative billing information dialog to user (Android only).
 * Step 2 of alternative billing flow.
 * Must be called BEFORE processing payment in your payment system.
 *
 * @returns Promise<boolean> - true if user accepted, false if user canceled
 * @throws Error if billing client not ready
 * @platform Android
 *
 * @example
 * ```typescript
 * const userAccepted = await showAlternativeBillingDialogAndroid();
 * if (userAccepted) {
 *   // Process payment in your payment system
 *   const success = await processCustomPayment();
 *   if (success) {
 *     // Create reporting token
 *     const token = await createAlternativeBillingTokenAndroid();
 *     // Send token to your backend for Google Play reporting
 *   }
 * }
 * ```
 *
 * @see {@link https://openiap.dev/docs/apis/android/show-alternative-billing-dialog-android}
 */
export declare const showAlternativeBillingDialogAndroid: MutationField<'showAlternativeBillingDialogAndroid'>;
/**
 * Create external transaction token for Google Play reporting (Android only).
 * Step 3 of alternative billing flow.
 * Must be called AFTER successful payment in your payment system.
 * Token must be reported to Google Play backend within 24 hours.
 *
 * @param sku - Optional product SKU that was purchased
 * @returns Promise<string | null> - Token string or null if creation failed
 * @throws Error if billing client not ready
 * @platform Android
 *
 * @example
 * ```typescript
 * const token = await createAlternativeBillingTokenAndroid('premium_subscription');
 * if (token) {
 *   // Send token to your backend
 *   await fetch('/api/report-transaction', {
 *     method: 'POST',
 *     body: JSON.stringify({ token, sku: 'premium_subscription' })
 *   });
 * }
 * ```
 *
 * @see {@link https://openiap.dev/docs/apis/android/create-alternative-billing-token-android}
 */
export declare const createAlternativeBillingTokenAndroid: MutationField<'createAlternativeBillingTokenAndroid'>;
/**
 * Enable a billing program before initConnection (Android only).
 * Must be called BEFORE initConnection() to configure the BillingClient.
 *
 * @param program - The billing program to enable (external-content-link or external-offer)
 * @platform Android
 * @since Google Play Billing Library 8.2.0+
 *
 * @example
 * ```typescript
 * // Enable external offers before connecting
 * enableBillingProgramAndroid('external-offer');
 * await initConnection();
 * ```
 */
export declare const enableBillingProgramAndroid: (program: BillingProgramAndroid) => void;
/**
 * Check if a billing program is available for this user/device (Android only).
 *
 * @param program - The billing program to check
 * @returns Promise with availability result
 * @platform Android
 * @since Google Play Billing Library 8.2.0+
 *
 * @example
 * ```typescript
 * const result = await isBillingProgramAvailableAndroid('external-offer');
 * if (result.isAvailable) {
 *   // External offers are available for this user
 * }
 * ```
 *
 * @see {@link https://openiap.dev/docs/apis/android/is-billing-program-available-android}
 */
export declare const isBillingProgramAvailableAndroid: MutationField<'isBillingProgramAvailableAndroid'>;
/**
 * Create billing program reporting details for external transactions (Android only).
 * Used to get the external transaction token needed for reporting to Google.
 *
 * @param program - The billing program to create reporting details for
 * @returns Promise with reporting details including external transaction token
 * @platform Android
 * @since Google Play Billing Library 8.2.0+
 *
 * @example
 * ```typescript
 * const details = await createBillingProgramReportingDetailsAndroid('external-offer');
 * // Use details.externalTransactionToken to report the transaction
 * await fetch('/api/report-external-transaction', {
 *   method: 'POST',
 *   body: JSON.stringify({ token: details.externalTransactionToken })
 * });
 * ```
 *
 * @see {@link https://openiap.dev/docs/apis/android/create-billing-program-reporting-details-android}
 */
export declare const createBillingProgramReportingDetailsAndroid: MutationField<'createBillingProgramReportingDetailsAndroid'>;
/**
 * Launch external link for external offers or app download (Android only).
 *
 * @param params - Parameters for launching the external link
 * @returns Promise<boolean> - true if user accepted, false otherwise
 * @platform Android
 * @since Google Play Billing Library 8.2.0+
 *
 * @example
 * ```typescript
 * const success = await launchExternalLinkAndroid({
 *   billingProgram: 'external-offer',
 *   launchMode: 'launch-in-external-browser-or-app',
 *   linkType: 'link-to-digital-content-offer',
 *   linkUri: 'https://your-website.com/purchase'
 * });
 * if (success) {
 *   console.log('User accepted external link');
 * }
 * ```
 *
 * @see {@link https://openiap.dev/docs/apis/android/launch-external-link-android}
 */
export declare const launchExternalLinkAndroid: MutationField<'launchExternalLinkAndroid'>;
/**
 * Check if the device can present an external purchase notice sheet (iOS 17.4+).
 *
 * Wraps `ExternalPurchase.canPresent`, which Apple introduced in iOS 17.4.
 * Note: the notice sheet itself (`presentExternalPurchaseNoticeSheetIOS`)
 * still requires iOS 18.2+; only the eligibility check is available earlier.
 *
 * @returns Promise<boolean> - true if notice sheet can be presented
 * @platform iOS
 *
 * @example
 * ```typescript
 * const canPresent = await canPresentExternalPurchaseNoticeIOS();
 * if (canPresent) {
 *   // Present notice before external purchase
 *   const result = await presentExternalPurchaseNoticeSheetIOS();
 * }
 * ```
 *
 * @see {@link https://openiap.dev/docs/apis/ios/can-present-external-purchase-notice-ios}
 */
export declare const canPresentExternalPurchaseNoticeIOS: QueryField<'canPresentExternalPurchaseNoticeIOS'>;
/**
 * Present an external purchase notice sheet to inform users about external purchases (iOS 18.2+).
 * This must be called before opening an external purchase link.
 *
 * @returns Promise<ExternalPurchaseNoticeResultIOS> - Result with action and error if any
 * @platform iOS
 *
 * @example
 * ```typescript
 * const result = await presentExternalPurchaseNoticeSheetIOS();
 * if (result.result === 'continue') {
 *   // User chose to continue, open external purchase link
 *   await presentExternalPurchaseLinkIOS('https://your-website.com/purchase');
 * }
 * ```
 *
 * @see {@link https://openiap.dev/docs/apis/ios/present-external-purchase-notice-sheet-ios}
 */
export declare const presentExternalPurchaseNoticeSheetIOS: () => Promise<ExternalPurchaseNoticeResultIOS>;
/**
 * Present an external purchase link to redirect users to your website (iOS 16.0+).
 *
 * @param url - The external purchase URL to open
 * @returns Promise<ExternalPurchaseLinkResultIOS> - Result with success status and error if any
 * @platform iOS
 *
 * @example
 * ```typescript
 * const result = await presentExternalPurchaseLinkIOS('https://your-website.com/purchase');
 * if (result.success) {
 *   console.log('User completed external purchase');
 * }
 * ```
 *
 * @see {@link https://openiap.dev/docs/apis/ios/present-external-purchase-link-ios}
 */
export declare const presentExternalPurchaseLinkIOS: MutationField<'presentExternalPurchaseLinkIOS'>;
/**
 * Check if app is eligible for ExternalPurchaseCustomLink API (iOS 18.1+).
 * Returns true if the app can use custom external purchase links.
 *
 * @returns Promise<boolean> - true if eligible
 * @platform iOS
 * @see https://developer.apple.com/documentation/storekit/externalpurchasecustomlink/iseligible
 *
 * @example
 * ```typescript
 * const isEligible = await isEligibleForExternalPurchaseCustomLinkIOS();
 * if (isEligible) {
 *   // App can use custom external purchase links
 * }
 * ```
 *
 * @see {@link https://openiap.dev/docs/apis/ios/is-eligible-for-external-purchase-custom-link-ios}
 */
export declare const isEligibleForExternalPurchaseCustomLinkIOS: () => Promise<boolean>;
/**
 * Get external purchase token for reporting to Apple (iOS 18.1+).
 * Use this token with Apple's External Purchase Server API to report transactions.
 *
 * @param tokenType - Token type: 'acquisition' (new customers) or 'services' (existing customers)
 * @returns Promise<ExternalPurchaseCustomLinkTokenResultIOS> - Result with token string or error
 * @platform iOS
 * @see https://developer.apple.com/documentation/storekit/externalpurchasecustomlink/token(for:)
 *
 * @example
 * ```typescript
 * // For new customer acquisition
 * const result = await getExternalPurchaseCustomLinkTokenIOS('acquisition');
 * if (result.token) {
 *   // Report token to Apple's External Purchase Server API
 *   await reportToApple(result.token);
 * }
 * ```
 *
 * @see {@link https://openiap.dev/docs/apis/ios/get-external-purchase-custom-link-token-ios}
 */
export declare const getExternalPurchaseCustomLinkTokenIOS: (tokenType: ExternalPurchaseCustomLinkTokenTypeIOS) => Promise<ExternalPurchaseCustomLinkTokenResultIOS>;
/**
 * Show ExternalPurchaseCustomLink notice sheet (iOS 18.1+).
 * Displays the system disclosure notice sheet for custom external purchase links.
 * Call this after a deliberate customer interaction before linking out to external purchases.
 *
 * @param noticeType - Notice type: 'browser' (external purchases displayed in browser)
 * @returns Promise<ExternalPurchaseCustomLinkNoticeResultIOS> - Result with continued status and error if any
 * @platform iOS
 * @see https://developer.apple.com/documentation/storekit/externalpurchasecustomlink/shownotice(type:)
 *
 * @example
 * ```typescript
 * const result = await showExternalPurchaseCustomLinkNoticeIOS('browser');
 * if (result.continued) {
 *   // User agreed to continue to external purchase
 *   await Linking.openURL('https://your-store.com/checkout');
 * }
 * ```
 *
 * @see {@link https://openiap.dev/docs/apis/ios/show-external-purchase-custom-link-notice-ios}
 */
export declare const showExternalPurchaseCustomLinkNoticeIOS: (noticeType: ExternalPurchaseCustomLinkNoticeTypeIOS) => Promise<ExternalPurchaseCustomLinkNoticeResultIOS>;
//# sourceMappingURL=index.d.ts.map