import { canShowBanner, type AdPlacement } from "@/ads/ad-policy";
import { ADMOB_IOS } from "@/ads/constants";
import {
  isAdsInitialized,
  shouldRequestNonPersonalizedAdsOnly,
  subscribeToAdsInitialization
} from "@/ads/ad-service";
import { isAdFree } from "@/monetization/entitlements";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, spacing } from "@/theme";
import { useEffect, useState, useSyncExternalStore } from "react";
import { View } from "react-native";

type AdsModule = typeof import("react-native-google-mobile-ads");

export function AdBanner({ placement }: { placement: AdPlacement }) {
  const [profile] = useSaveProfile();
  const [adsModule, setAdsModule] = useState<AdsModule | null>(null);
  const [loaded, setLoaded] = useState(false);
  const adsInitialized = useSyncExternalStore(
    subscribeToAdsInitialization,
    isAdsInitialized,
    () => false
  );

  useEffect(() => {
    if (!adsInitialized) {
      return undefined;
    }
    let active = true;
    void import("react-native-google-mobile-ads")
      .then((module) => {
        if (active) {
          setAdsModule(module);
        }
      })
      .catch((error: unknown) => {
        console.warn("VaultPop banner ads are unavailable.", error);
      });

    return () => {
      active = false;
    };
  }, [adsInitialized]);

  const eligible = canShowBanner(placement, {
    adFree: isAdFree(profile),
    adsInitialized,
    completedRounds: profile.ads.completedRounds,
    lastInterstitialRound: profile.ads.lastInterstitialRound,
    fullScreenAdShowing: false,
    rewardedCountToday: 0,
    rewardedJustShown: false,
    firstColdLaunch: false,
    gameplayActive: placement === "gameplay"
  });

  if (!adsModule || !eligible) {
    return null;
  }

  const Banner = adsModule.BannerAd;
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: loaded ? colors.surface : "transparent",
        minHeight: loaded ? 60 : 0,
        paddingVertical: loaded ? spacing.xs : 0
      }}
    >
      <Banner
        unitId={ADMOB_IOS.banner}
        size={adsModule.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: shouldRequestNonPersonalizedAdsOnly()
        }}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={(error: Error) => {
          console.warn(`VaultPop banner failed to load (${placement}).`, error);
        }}
      />
    </View>
  );
}
