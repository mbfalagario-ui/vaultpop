import { ADMOB_IOS } from "@/ads/constants";

let initialized = false;
let initializing: Promise<boolean> | null = null;
let fullScreenAdShowing = false;
let rewardedJustShown = false;
let lastAppOpenAt = 0;
let requestNonPersonalizedAdsOnly = true;
const initializationListeners = new Set<() => void>();

export async function initializeAdsAfterHome(): Promise<boolean> {
  if (__DEV__ || process.env.EXPO_OS !== "ios") {
    return false;
  }
  if (initialized) {
    return true;
  }
  if (initializing) {
    return initializing;
  }

  initializing = (async () => {
    const ads = await import("react-native-google-mobile-ads");
    const consent = await ads.AdsConsent.gatherConsent();
    if (!consent.canRequestAds) {
      return false;
    }
    const tracking = await import("expo-tracking-transparency");
    let permission = await tracking.getTrackingPermissionsAsync();
    if (permission.status === "undetermined") {
      permission = await tracking.requestTrackingPermissionsAsync();
    }
    requestNonPersonalizedAdsOnly = permission.status !== "granted";
    await ads.default().setRequestConfiguration({});
    await ads.default().initialize();
    initialized = true;
    initializationListeners.forEach((listener) => listener());
    return true;
  })().catch((error: unknown) => {
    initializing = null;
    console.warn("VaultPop ads are unavailable.", error);
    return false;
  });

  return initializing;
}

export function isAdsInitialized(): boolean {
  return initialized;
}

export function subscribeToAdsInitialization(listener: () => void): () => void {
  initializationListeners.add(listener);
  return () => initializationListeners.delete(listener);
}

export function isFullScreenAdShowing(): boolean {
  return fullScreenAdShowing;
}

export function wasRewardedJustShown(): boolean {
  return rewardedJustShown;
}

export function clearRewardedCooldown(): void {
  rewardedJustShown = false;
}

export async function showInterstitialAd(): Promise<boolean> {
  if (!(await initializeAdsAfterHome()) || fullScreenAdShowing) {
    return false;
  }
  const ads = await import("react-native-google-mobile-ads");
  const ad = ads.InterstitialAd.createForAdRequest(ADMOB_IOS.interstitial, {
    requestNonPersonalizedAdsOnly
  });
  return showFullScreenAd(ad, ads.AdEventType);
}

export async function showAppOpenAd(): Promise<boolean> {
  if (
    !initialized ||
    fullScreenAdShowing ||
    Date.now() - lastAppOpenAt < 4 * 60 * 60 * 1_000
  ) {
    return false;
  }
  const ads = await import("react-native-google-mobile-ads");
  const ad = ads.AppOpenAd.createForAdRequest(ADMOB_IOS.appOpen, {
    requestNonPersonalizedAdsOnly
  });
  const shown = await showFullScreenAd(ad, ads.AdEventType);
  if (shown) {
    lastAppOpenAt = Date.now();
  }
  return shown;
}

export async function showRewardedBonusLifeAd(): Promise<{
  rewarded: boolean;
  rewardId?: string;
}> {
  if (!(await initializeAdsAfterHome()) || fullScreenAdShowing) {
    return { rewarded: false };
  }
  const ads = await import("react-native-google-mobile-ads");
  const ad = ads.RewardedAd.createForAdRequest(ADMOB_IOS.rewarded, {
    requestNonPersonalizedAdsOnly
  });

  return new Promise((resolve) => {
    let rewarded = false;
    const finish = () => {
      fullScreenAdShowing = false;
      rewardedJustShown = true;
      ad.removeAllListeners();
      resolve({
        rewarded,
        rewardId: rewarded ? `reward-${Date.now().toString(36)}` : undefined
      });
    };
    ad.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => {
      rewarded = true;
    });
    ad.addAdEventListener(ads.AdEventType.LOADED, () => {
      fullScreenAdShowing = true;
      void ad.show();
    });
    ad.addAdEventListener(ads.AdEventType.ERROR, finish);
    ad.addAdEventListener(ads.AdEventType.CLOSED, finish);
    ad.load();
  });
}

async function showFullScreenAd(
  ad: {
    addAdEventListener: (type: never, listener: () => void) => void;
    load: () => void;
    removeAllListeners: () => void;
    show: () => Promise<void>;
  },
  eventType: { LOADED: string; ERROR: string; CLOSED: string }
): Promise<boolean> {
  return new Promise((resolve) => {
    let shown = false;
    const finish = () => {
      fullScreenAdShowing = false;
      ad.removeAllListeners();
      resolve(shown);
    };
    ad.addAdEventListener(eventType.LOADED as never, () => {
      fullScreenAdShowing = true;
      shown = true;
      void ad.show();
    });
    ad.addAdEventListener(eventType.ERROR as never, finish);
    ad.addAdEventListener(eventType.CLOSED as never, finish);
    ad.load();
  });
}
