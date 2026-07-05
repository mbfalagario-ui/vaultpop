import { initializeAdsAfterHome } from "@/ads/ad-service";
import { isAdFree } from "@/monetization/entitlements";
import { useSaveProfile } from "@/storage/use-save-profile";
import { useEffect } from "react";

export function AdLifecycle() {
  const [profile] = useSaveProfile();

  useEffect(() => {
    if (!isAdFree(profile)) {
      void initializeAdsAfterHome();
    }
  }, [profile]);

  return null;
}
