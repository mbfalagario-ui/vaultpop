import { useCallback, useEffect } from "react";

import { STORAGE_KEYS } from "@/storage/keys";
import {
  createDefaultSaveProfile,
  normalizeSaveProfile,
  type SaveProfile
} from "@/storage/save-model";
import { clientStorage, useStoredValue } from "@/storage/client-storage";

type SaveProfileUpdater = SaveProfile | ((profile: SaveProfile) => SaveProfile);
const installDefaultProfile = createDefaultSaveProfile();

export function useSaveProfile() {
  const [storedProfile, setStoredProfile] = useStoredValue<SaveProfile>(
    STORAGE_KEYS.saveProfile,
    installDefaultProfile
  );

  const profile = normalizeSaveProfile(storedProfile);

  useEffect(() => {
    if (!clientStorage.has(STORAGE_KEYS.saveProfile)) {
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
  return clientStorage.get(key, fallback);
}
