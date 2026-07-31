import { INTERSTITIAL_ROUND_INTERVAL, REWARDED_DAILY_CAP } from "@/ads/constants";

export type AdPlacement =
  | "home"
  | "mode-select"
  | "shop"
  | "cosmetics"
  | "support"
  | "results"
  | "gameplay";

export type AdPolicyState = {
  adFree: boolean;
  adsInitialized: boolean;
  completedRounds: number;
  lastInterstitialRound: number;
  fullScreenAdShowing: boolean;
  rewardedCountToday: number;
  rewardedJustShown: boolean;
  firstColdLaunch: boolean;
  gameplayActive: boolean;
  /** Effective per-user daily cap (admin override); defaults to 30. */
  rewardedDailyCap?: number;
};

const BANNER_PLACEMENTS = new Set<AdPlacement>([
  "home",
  "mode-select",
  "shop",
  "cosmetics",
  "support",
  "results"
]);

export function canShowBanner(placement: AdPlacement, state: AdPolicyState): boolean {
  return (
    state.adsInitialized &&
    !state.adFree &&
    !state.gameplayActive &&
    BANNER_PLACEMENTS.has(placement)
  );
}

export function canShowInterstitial(state: AdPolicyState): boolean {
  return (
    state.adsInitialized &&
    !state.adFree &&
    !state.gameplayActive &&
    !state.fullScreenAdShowing &&
    !state.rewardedJustShown &&
    state.completedRounds > 0 &&
    state.completedRounds - state.lastInterstitialRound >= INTERSTITIAL_ROUND_INTERVAL
  );
}

export function canShowRewarded(state: AdPolicyState): boolean {
  return (
    state.adsInitialized &&
    !state.adFree &&
    !state.gameplayActive &&
    !state.fullScreenAdShowing &&
    state.rewardedCountToday < (state.rewardedDailyCap ?? REWARDED_DAILY_CAP)
  );
}

export function canShowAppOpen(state: AdPolicyState): boolean {
  return (
    state.adsInitialized &&
    !state.adFree &&
    !state.firstColdLaunch &&
    !state.gameplayActive &&
    !state.fullScreenAdShowing &&
    !state.rewardedJustShown &&
    state.completedRounds > 0
  );
}
