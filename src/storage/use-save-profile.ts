import { useCallback, useEffect } from "react";

import { STORAGE_KEYS } from "@/storage/keys";
import {
  createDefaultSaveProfile,
  normalizeSaveProfile,
  type SaveProfile
} from "@/storage/save-model";
import { useStoredValue } from "@/storage/client-storage";

type SaveProfileUpdater = SaveProfile | ((profile: SaveProfile) => SaveProfile);
const installDefaultProfile = createDefaultSaveProfile();

export function useSaveProfile() {
  const [storedProfile, setStoredProfile] = useStoredValue<SaveProfile>(
    STORAGE_KEYS.saveProfile,
    installDefaultProfile
  );

  const profile = normalizeSaveProfile(storedProfile);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEYS.saveProfile) === null) {
      setStoredProfile(installDefaultProfile);
    }
  }, [setStoredProfile]);

  const setProfile = useCallback(
    (updater: SaveProfileUpdater) => {
      const currentProfile = normalizeSaveProfile(
        clientSafeValue(STORAGE_KEYS.saveProfile, profile)
      );
      const nextProfile =
        typeof updater === "function" ? updater(currentProfile) : normalizeSaveProfile(updater);
      setStoredProfile(nextProfile);
    },
    [profile, setStoredProfile]
  );

  return [profile, setProfile] as const;
}

function clientSafeValue(key: string, fallback: SaveProfile): SaveProfile {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as SaveProfile) : fallback;
  } catch {
    return fallback;
  }
}
