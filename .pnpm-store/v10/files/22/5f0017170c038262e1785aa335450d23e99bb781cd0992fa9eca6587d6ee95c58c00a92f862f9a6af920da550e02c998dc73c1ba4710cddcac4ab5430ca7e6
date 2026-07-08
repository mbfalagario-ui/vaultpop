"use strict";

// External dependencies
import { useCallback, useEffect, useState, useRef } from 'react';
import { Platform } from 'react-native';
import { RnIapConsole } from "../utils/debug.js";

// Internal modules
import { initConnection, purchaseErrorListener, purchaseUpdatedListener, promotedProductListenerIOS, getAvailablePurchases, finishTransaction as finishTransactionInternal, requestPurchase as requestPurchaseInternal, fetchProducts, validateReceipt as validateReceiptInternal, verifyPurchase as verifyPurchaseTopLevel, verifyPurchaseWithProvider as verifyPurchaseWithProviderTopLevel, getActiveSubscriptions, hasActiveSubscriptions, syncIOS, getPromotedProductIOS, requestPurchaseOnPromotedProductIOS, checkAlternativeBillingAvailabilityAndroid, showAlternativeBillingDialogAndroid, createAlternativeBillingTokenAndroid, userChoiceBillingListenerAndroid, subscriptionBillingIssueListener, isStandardIOS } from "../index.js";

// Types
import { ErrorCode } from "../types.js";

// Types for event subscriptions

/**
 * React Hook for managing In-App Purchases.
 * See documentation at https://react-native-iap.hyo.dev/docs/hooks/useIAP
 */
export function useIAP(options) {
  const [connected, setConnected] = useState(false);
  const [products, setProducts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [availablePurchases, setAvailablePurchases] = useState([]);
  const [promotedProductIOS, setPromotedProductIOS] = useState();
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const optionsRef = useRef(options);
  const connectedRef = useRef(false);

  // Helper function to merge arrays with duplicate checking
  const mergeWithDuplicateCheck = useCallback((existingItems, newItems, getKey) => {
    const merged = [...existingItems];
    newItems.forEach(newItem => {
      const isDuplicate = merged.some(existingItem => getKey(existingItem) === getKey(newItem));
      if (!isDuplicate) {
        merged.push(newItem);
      }
    });
    return merged;
  }, []);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);
  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);
  const subscriptionsRef = useRef({});

  // Track if component is mounted to prevent listener leaks on early unmount
  const isMountedRef = useRef(true);
  const subscriptionsRefState = useRef([]);
  useEffect(() => {
    subscriptionsRefState.current = subscriptions;
  }, [subscriptions]);

  // Helper function to invoke onError callback
  const invokeOnError = useCallback(error => {
    if (optionsRef.current?.onError) {
      optionsRef.current.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }, []);
  const fetchProductsInternal = useCallback(async params => {
    if (!connectedRef.current) {
      RnIapConsole.warn('[useIAP] fetchProducts called before connection; skipping');
      return;
    }
    try {
      const requestType = params.type ?? 'in-app';
      RnIapConsole.debug('[useIAP] Calling fetchProducts with:', {
        skus: params.skus,
        type: requestType
      });
      const result = await fetchProducts({
        skus: params.skus,
        type: requestType
      });
      RnIapConsole.debug('[useIAP] fetchProducts result:', result);
      const items = result ?? [];

      // fetchProducts already returns properly filtered results based on type
      if (requestType === 'subs') {
        // All items are already subscriptions
        setSubscriptions(prevSubscriptions => mergeWithDuplicateCheck(prevSubscriptions, items, subscription => subscription.id));
        return;
      }
      if (requestType === 'all') {
        // fetchProducts already properly separates products and subscriptions
        const newProducts = items.filter(item => item.type === 'in-app');
        const newSubscriptions = items.filter(item => item.type === 'subs');
        setProducts(prevProducts => mergeWithDuplicateCheck(prevProducts, newProducts, product => product.id));
        setSubscriptions(prevSubscriptions => mergeWithDuplicateCheck(prevSubscriptions, newSubscriptions, subscription => subscription.id));
        return;
      }

      // For 'in-app' type, all items are already products
      setProducts(prevProducts => mergeWithDuplicateCheck(prevProducts, items, product => product.id));
    } catch (error) {
      RnIapConsole.error('Error fetching products:', error);
      invokeOnError(error);
    }
  }, [mergeWithDuplicateCheck, invokeOnError]);
  const getAvailablePurchasesInternal = useCallback(async options => {
    try {
      const result = await getAvailablePurchases({
        alsoPublishToEventListenerIOS: options?.alsoPublishToEventListenerIOS ?? false,
        onlyIncludeActiveItemsIOS: options?.onlyIncludeActiveItemsIOS ?? true,
        includeSuspendedAndroid: options?.includeSuspendedAndroid ?? false
      });
      setAvailablePurchases(result);
    } catch (error) {
      RnIapConsole.error('Error fetching available purchases:', error);
      invokeOnError(error);
    }
  }, [invokeOnError]);
  const getActiveSubscriptionsInternal = useCallback(async subscriptionIds => {
    try {
      const result = await getActiveSubscriptions(subscriptionIds);
      setActiveSubscriptions(result);
      return result;
    } catch (error) {
      RnIapConsole.error('Error getting active subscriptions:', error);
      invokeOnError(error);
      return [];
    }
  }, [invokeOnError]);
  const hasActiveSubscriptionsInternal = useCallback(async subscriptionIds => {
    try {
      return await hasActiveSubscriptions(subscriptionIds);
    } catch (error) {
      RnIapConsole.error('Error checking active subscriptions:', error);
      invokeOnError(error);
      return false;
    }
  }, [invokeOnError]);
  const finishTransaction = useCallback(async args => {
    // Directly delegate to root API finishTransaction without catching errors.
    // This allows the root API's error handling logic to work correctly, including:
    // - iOS: treating "Transaction not found" as success (already-finished transactions)
    // - Proper validation and error messages for required fields
    // Users should handle errors in their onPurchaseSuccess callback if needed.
    await finishTransactionInternal(args);
  }, []);
  const requestPurchase = useCallback(async requestObj => {
    await requestPurchaseInternal(requestObj);
  }, []);
  const restorePurchases = useCallback(async options => {
    try {
      if (Platform.OS === 'ios') {
        await syncIOS();
      }
      await getAvailablePurchasesInternal(options);
    } catch (error) {
      RnIapConsole.warn('Failed to restore purchases:', error);
      invokeOnError(error);
    }
  }, [getAvailablePurchasesInternal, invokeOnError]);
  const validateReceipt = useCallback(async options => validateReceiptInternal(options), []);
  const verifyPurchase = useCallback(async options => {
    return verifyPurchaseTopLevel(options);
  }, []);
  const verifyPurchaseWithProvider = useCallback(async options => {
    return verifyPurchaseWithProviderTopLevel(options);
  }, []);

  // Shared helper: build Android billing config from options
  const buildAndroidConfig = useCallback(() => {
    let config;
    if (Platform.OS === 'android') {
      if (optionsRef.current?.enableBillingProgramAndroid) {
        config = {
          enableBillingProgramAndroid: optionsRef.current.enableBillingProgramAndroid
        };
      } else if (optionsRef.current?.alternativeBillingModeAndroid) {
        config = {
          alternativeBillingModeAndroid: optionsRef.current.alternativeBillingModeAndroid
        };
      }
    }
    return config;
  }, []);

  // Shared helper: register event listeners if not already active
  const registerListeners = useCallback(() => {
    if (!subscriptionsRef.current.purchaseUpdate) {
      subscriptionsRef.current.purchaseUpdate = purchaseUpdatedListener(async purchase => {
        try {
          await getActiveSubscriptionsInternal();
          await getAvailablePurchasesInternal();
        } catch (e) {
          RnIapConsole.warn('[useIAP] post-purchase refresh failed:', e);
        }
        if (optionsRef.current?.onPurchaseSuccess) {
          optionsRef.current.onPurchaseSuccess(purchase);
        }
      }, optionsRef.current?.purchaseUpdatedListenerOptions);
    }
    if (!subscriptionsRef.current.purchaseError) {
      subscriptionsRef.current.purchaseError = purchaseErrorListener(error => {
        if (error.code === ErrorCode.InitConnection && !connectedRef.current) {
          return;
        }
        if (optionsRef.current?.onPurchaseError) {
          optionsRef.current.onPurchaseError(error);
        }
      });
    }
    if (isStandardIOS() && !subscriptionsRef.current.promotedProductIOS) {
      subscriptionsRef.current.promotedProductIOS = promotedProductListenerIOS(product => {
        setPromotedProductIOS(product);
        if (optionsRef.current?.onPromotedProductIOS) {
          optionsRef.current.onPromotedProductIOS(product);
        }
      });
    }
    if (Platform.OS === 'android' && optionsRef.current?.onUserChoiceBillingAndroid && !subscriptionsRef.current.userChoiceBillingAndroid) {
      subscriptionsRef.current.userChoiceBillingAndroid = userChoiceBillingListenerAndroid(details => {
        if (optionsRef.current?.onUserChoiceBillingAndroid) {
          optionsRef.current.onUserChoiceBillingAndroid(details);
        }
      });
    }

    // Always attach so callers that supply `onSubscriptionBillingIssue` later
    // (after the hook has already set up listeners) still receive events.
    if (!subscriptionsRef.current.subscriptionBillingIssue) {
      subscriptionsRef.current.subscriptionBillingIssue = subscriptionBillingIssueListener(purchase => {
        optionsRef.current?.onSubscriptionBillingIssue?.(purchase);
      });
    }
  }, [getActiveSubscriptionsInternal, getAvailablePurchasesInternal]);

  // Shared helper: clean up all listeners
  const cleanupListeners = useCallback(() => {
    subscriptionsRef.current.purchaseUpdate?.remove();
    subscriptionsRef.current.purchaseError?.remove();
    subscriptionsRef.current.promotedProductIOS?.remove();
    subscriptionsRef.current.userChoiceBillingAndroid?.remove();
    subscriptionsRef.current.subscriptionBillingIssue?.remove();
    subscriptionsRef.current.purchaseUpdate = undefined;
    subscriptionsRef.current.purchaseError = undefined;
    subscriptionsRef.current.promotedProductIOS = undefined;
    subscriptionsRef.current.userChoiceBillingAndroid = undefined;
    subscriptionsRef.current.subscriptionBillingIssue = undefined;
  }, []);
  const initIapWithSubscriptions = useCallback(async () => {
    const config = buildAndroidConfig();
    try {
      const result = await initConnection(config);
      if (!isMountedRef.current) {
        return;
      }
      if (!result) {
        setConnected(false);
        RnIapConsole.warn('[useIAP] initConnection returned false');
        return;
      }
      registerListeners();
      setConnected(true);
    } catch (error) {
      RnIapConsole.error('initConnection failed:', error);
      cleanupListeners();
      if (isMountedRef.current) {
        setConnected(false);
      }
      invokeOnError(error);
    }
  }, [buildAndroidConfig, registerListeners, cleanupListeners, invokeOnError]);
  const reconnect = useCallback(async () => {
    const config = buildAndroidConfig();
    try {
      const result = await initConnection(config);
      if (!isMountedRef.current) {
        return false;
      }
      if (result) {
        registerListeners();
        setConnected(true);
        return true;
      }
      setConnected(false);
      return false;
    } catch (error) {
      RnIapConsole.error('[useIAP] reconnect failed:', error);
      cleanupListeners();
      if (isMountedRef.current) {
        setConnected(false);
      }
      invokeOnError(error);
      return false;
    }
  }, [buildAndroidConfig, registerListeners, cleanupListeners, invokeOnError]);
  useEffect(() => {
    isMountedRef.current = true;
    initIapWithSubscriptions();
    return () => {
      isMountedRef.current = false;
      cleanupListeners();
      // Keep connection alive across screens to avoid race conditions
      setConnected(false);
    };
  }, [initIapWithSubscriptions, cleanupListeners]);
  return {
    connected,
    products,
    subscriptions,
    finishTransaction,
    availablePurchases,
    promotedProductIOS,
    activeSubscriptions,
    getAvailablePurchases: getAvailablePurchasesInternal,
    fetchProducts: fetchProductsInternal,
    requestPurchase,
    validateReceipt,
    verifyPurchase,
    verifyPurchaseWithProvider,
    restorePurchases,
    getPromotedProductIOS,
    requestPurchaseOnPromotedProductIOS,
    getActiveSubscriptions: getActiveSubscriptionsInternal,
    hasActiveSubscriptions: hasActiveSubscriptionsInternal,
    reconnect,
    // Alternative billing (Android only)
    ...(Platform.OS === 'android' ? {
      checkAlternativeBillingAvailabilityAndroid,
      showAlternativeBillingDialogAndroid,
      createAlternativeBillingTokenAndroid
    } : {})
  };
}
//# sourceMappingURL=useIAP.js.map