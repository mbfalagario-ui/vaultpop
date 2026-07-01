import { canShowAppOpen } from "@/ads/ad-policy";
import {
  isAdsInitialized,
  isFullScreenAdShowing,
  showAppOpenAd,
  wasRewardedJustShown
} from "@/ads/ad-service";
import { isAdFree } from "@/monetization/entitlements";
import { useSaveProfile } from "@/storage/use-save-profile";
import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

export function AdLifecycle() {
  const [profile] = useSaveProfile();
  const pathname = usePathname();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const returning =
        /background|inactive/.test(appStateRef.current) && nextState === "active";
      appStateRef.current = nextState;
      if (!returning) {
        return;
      }
      const eligible = canShowAppOpen({
        adFree: isAdFree(profile),
        adsInitialized: isAdsInitialized(),
        completedRounds: profile.ads.completedRounds,
        lastInterstitialRound: profile.ads.lastInterstitialRound,
        fullScreenAdShowing: isFullScreenAdShowing(),
        rewardedCountToday: 0,
        rewardedJustShown: wasRewardedJustShown(),
        firstColdLaunch: false,
        gameplayActive: pathname === "/gameplay"
      });
      if (eligible) {
        void showAppOpenAd();
      }
    });
    return () => subscription.remove();
  }, [pathname, profile]);

  return null;
}
