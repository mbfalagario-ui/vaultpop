import type { SaveProfile } from "@/storage/save-model";

export function hasActiveVaultPass(profile: SaveProfile, now = new Date()): boolean {
  const expiresAt = profile.entitlements.vaultPassExpiresAt;
  return Boolean(expiresAt && new Date(expiresAt).getTime() > now.getTime());
}

export function isAdFree(profile: SaveProfile, now = new Date()): boolean {
  return profile.entitlements.removeAds || hasActiveVaultPass(profile, now);
}

export function hasPremiumThemeAccess(profile: SaveProfile, now = new Date()): boolean {
  return hasActiveVaultPass(profile, now);
}

export function hasPrioritySupport(profile: SaveProfile, now = new Date()): boolean {
  return hasActiveVaultPass(profile, now);
}
