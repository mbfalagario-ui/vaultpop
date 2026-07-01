import { canShowBanner, type AdPlacement } from "@/ads/ad-policy";
import { ADMOB_IOS } from "@/ads/constants";
import { initializeAdsAfterHome, isAdsInitialized } from "@/ads/ad-service";
import { isAdFree } from "@/monetization/entitlements";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, spacing } from "@/theme";
import { useEffect, useState } from "react";
import { InteractionManager, View } from "react-native";

type AdsModule = typeof import("react-native-google-mobile-ads");

export function AdBanner({ placement }: { placement: AdPlacement }) {
  const [profile] = useSaveProfile();
  const [adsModule, setAdsModule] = useState<AdsModule | null>(null);

  useEffect(() => {
    let active = true;
    const task = InteractionManager.runAfterInteractions(() => {
      void initializeAdsAfterHome().then(async (ready) => {
        if (ready && active) {
          setAdsModule(await import("react-native-google-mobile-ads"));
        }
      });
    });
    return () => {
      active = false;
      task.cancel();
    };
  }, []);

  const eligible = canShowBanner(placement, {
    adFree: isAdFree(profile),
    adsInitialized: isAdsInitialized(),
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
        backgroundColor: colors.surface,
        minHeight: 60,
        paddingVertical: spacing.xs
      }}
    >
      <Banner
        unitId={ADMOB_IOS.banner}
        size={adsModule.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}
