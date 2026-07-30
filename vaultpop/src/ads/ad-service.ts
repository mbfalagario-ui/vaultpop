import { ADMOB_IOS } from "@/ads/constants";

let initialized = false;
let initializing: Promise<boolean> | null = null;
let fullScreenAdShowing = false;
let rewardedJustShown = false;
let lastAppOpenAt = 0;
let requestNonPersonalizedAdsOnly = true;
const initializationListeners = new Set<() => void>();

/**
 * Owner-visible ads diagnostics: initialization, consent, ATT, and
 * per-placement banner results. Never contains tokens or personal data.
 */
export type AdsDiagnostics = {
  supported: boolean;
  devBuild: boolean;
  initialized: boolean;
  consentStatus: string | null;
  canRequestAds: boolean | null;
  attStatus: string | null;
  lastError: string | null;
  placements: Record<string, string>;
  updatedAt: number;
};

const diagnostics: AdsDiagnostics = {
  supported: process.env.EXPO_OS === "ios",
  devBuild: __DEV__,
  initialized: false,
  consentStatus: null,
  canRequestAds: null,
  attStatus: null,
  lastError: null,
  placements: {},
  updatedAt: Date.now()
};
let diagnosticsSnapshot: AdsDiagnostics = {
  ...diagnostics,
  placements: { ...diagnostics.placements }
};
const diagnosticsListeners = new Set<() => void>();

function touchDiagnostics(patch: Partial<AdsDiagnostics>): void {
  Object.assign(diagnostics, patch, { updatedAt: Date.now() });
  diagnosticsSnapshot = { ...diagnostics, placements: { ...diagnostics.placements } };
  diagnosticsListeners.forEach((listener) => listener());
}

export function getAdsDiagnostics(): AdsDiagnostics {
  return diagnosticsSnapshot;
}

export function subscribeToAdsDiagnostics(listener: () => void): () => void {
  diagnosticsListeners.add(listener);
  return () => diagnosticsListeners.delete(listener);
}

export function reportBannerEvent(placement: string, event: string): void {
  diagnostics.placements[placement] = event;
  touchDiagnostics({});
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

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
    let canRequestAds = false;
    try {
      const consent = await ads.AdsConsent.gatherConsent();
      canRequestAds = consent.canRequestAds;
      touchDiagnostics({
        canRequestAds,
        consentStatus: String(consent.status ?? "unknown")
      });
    } catch (error: unknown) {
      // A failed consent flow (offline launch, UMP misconfiguration) must not
      // permanently disable ads. Consent from a previous session may still
      // allow ad requests.
      console.warn("VaultPop ad consent gathering failed.", error);
      const info = await ads.AdsConsent.getConsentInfo().catch(() => null);
      canRequestAds = info?.canRequestAds ?? false;
      touchDiagnostics({
        canRequestAds,
        consentStatus: info ? String(info.status ?? "unknown") : null,
        lastError: `Consent: ${errorText(error)}`
      });
    }
    if (!canRequestAds) {
      console.warn("VaultPop ads paused: consent does not allow ad requests yet.");
      touchDiagnostics({
        lastError:
          "Consent state does not allow ad requests yet (check the AdMob console consent message for your region)."
      });
      return false;
    }
    try {
      const tracking = await import("expo-tracking-transparency");
      let permission = await tracking.getTrackingPermissionsAsync();
      if (permission.status === "undetermined") {
        permission = await tracking.requestTrackingPermissionsAsync();
      }
      requestNonPersonalizedAdsOnly = permission.status !== "granted";
      touchDiagnostics({ attStatus: permission.status });
    } catch {
      // An ATT failure only limits ads to non-personalized requests.
      requestNonPersonalizedAdsOnly = true;
      touchDiagnostics({ attStatus: "unavailable" });
    }
    await ads.default().setRequestConfiguration({});
    await ads.default().initialize();
    initialized = true;
    initializationListeners.forEach((listener) => listener());
    touchDiagnostics({ initialized: true, lastError: null });
    console.log("VaultPop ads initialized.");
    return true;
  })()
    .catch((error: unknown) => {
      console.warn("VaultPop ads are unavailable.", error);
      touchDiagnostics({ lastError: errorText(error) });
      return false;
    })
    .then((result) => {
      if (!result) {
        // Reset so later triggers (screen mounts, rewarded CTAs) retry
        // instead of being stuck on a failed first attempt forever.
        initializing = null;
      }
      return result;
    });

  return initializing;
}

export function shouldRequestNonPersonalizedAdsOnly(): boolean {
  return requestNonPersonalizedAdsOnly;
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
  shown: boolean;
  rewardId?: string;
}> {
  return showRewardedAdForUnit(ADMOB_IOS.rewarded);
}

export async function showRewardedCoinsAd(): Promise<{
  rewarded: boolean;
  shown: boolean;
  rewardId?: string;
}> {
  return showRewardedAdForUnit(ADMOB_IOS.rewardedCoins);
}

async function showRewardedAdForUnit(unitId: string): Promise<{
  rewarded: boolean;
  shown: boolean;
  rewardId?: string;
}> {
  if (!(await initializeAdsAfterHome()) || fullScreenAdShowing) {
    return { rewarded: false, shown: false };
  }
  const ads = await import("react-native-google-mobile-ads");
  const ad = ads.RewardedAd.createForAdRequest(unitId, {
    requestNonPersonalizedAdsOnly
  });

  return new Promise((resolve) => {
    let rewarded = false;
    let shown = false;
    const finish = () => {
      fullScreenAdShowing = false;
      rewardedJustShown = true;
      ad.removeAllListeners();
      resolve({
        rewarded,
        shown,
        rewardId: rewarded ? `reward-${Date.now().toString(36)}` : undefined
      });
    };
    ad.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => {
      rewarded = true;
    });
    ad.addAdEventListener(ads.AdEventType.LOADED, () => {
      fullScreenAdShowing = true;
      shown = true;
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
