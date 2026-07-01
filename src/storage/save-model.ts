import type { GameModeId } from "@/game/models";

export type HighScoreTable = Record<GameModeId, number>;

export type DailyVaultSave = {
  dateKey: string;
  seed: string;
  played: boolean;
  bestScore: number;
};

export type CosmeticProgression = {
  activeThemeId: string;
  unlockedThemeIds: string[];
  fictionalPoints: number;
};

export type SettingsSave = {
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  soundEnabled: boolean;
};

export type BoosterInventory = {
  bonusLives: number;
  chainBoosts: number;
  vaultBursts: number;
};

export type EconomySave = {
  vaultCoins: number;
  boosters: BoosterInventory;
  processedTransactionIds: string[];
  rewardedAds: {
    dateKey: string;
    count: number;
    rewardIds: string[];
  };
};

export type EntitlementSave = {
  removeAds: boolean;
  removeAdsTransactionId: string | null;
  vaultPassExpiresAt: string | null;
  vaultPassTransactionId: string | null;
};

export type SupportSave = {
  installId: string;
};

export type AdProgressSave = {
  completedRounds: number;
  lastInterstitialRound: number;
};

export type SaveProfile = {
  schemaVersion: 2;
  createdAt: string;
  updatedAt: string;
  highScores: HighScoreTable;
  dailyVault: DailyVaultSave | null;
  cosmetics: CosmeticProgression;
  settings: SettingsSave;
  economy: EconomySave;
  entitlements: EntitlementSave;
  support: SupportSave;
  ads: AdProgressSave;
};

export function createDefaultSaveProfile(now = new Date()): SaveProfile {
  const timestamp = now.toISOString();
  return {
    schemaVersion: 2,
    createdAt: timestamp,
    updatedAt: timestamp,
    highScores: {
      classic: 0,
      dailyVault: 0,
      streak: 0
    },
    dailyVault: null,
    cosmetics: {
      activeThemeId: "midnight-vault",
      unlockedThemeIds: ["midnight-vault"],
      fictionalPoints: 0
    },
    settings: {
      hapticsEnabled: true,
      reducedMotion: false,
      soundEnabled: true
    },
    economy: {
      vaultCoins: 0,
      boosters: {
        bonusLives: 0,
        chainBoosts: 0,
        vaultBursts: 0
      },
      processedTransactionIds: [],
      rewardedAds: {
        dateKey: "",
        count: 0,
        rewardIds: []
      }
    },
    entitlements: {
      removeAds: false,
      removeAdsTransactionId: null,
      vaultPassExpiresAt: null,
      vaultPassTransactionId: null
    },
    support: {
      installId: createInstallId(now)
    },
    ads: {
      completedRounds: 0,
      lastInterstitialRound: 0
    }
  };
}

export const defaultSaveProfile: SaveProfile = createDefaultSaveProfile(
  new Date("2026-01-01T00:00:00.000Z")
);

export function normalizeSaveProfile(input: Partial<SaveProfile> | null | undefined): SaveProfile {
  const fallback = createDefaultSaveProfile();
  return {
    schemaVersion: 2,
    createdAt: input?.createdAt ?? fallback.createdAt,
    updatedAt: input?.updatedAt ?? fallback.updatedAt,
    highScores: {
      ...fallback.highScores,
      ...(input?.highScores ?? {})
    },
    dailyVault: input?.dailyVault ?? null,
    cosmetics: {
      ...fallback.cosmetics,
      ...(input?.cosmetics ?? {}),
      unlockedThemeIds:
        input?.cosmetics?.unlockedThemeIds && input.cosmetics.unlockedThemeIds.length > 0
          ? input.cosmetics.unlockedThemeIds
          : fallback.cosmetics.unlockedThemeIds
    },
    settings: {
      ...fallback.settings,
      ...(input?.settings ?? {})
    },
    economy: {
      ...fallback.economy,
      ...(input?.economy ?? {}),
      boosters: {
        ...fallback.economy.boosters,
        ...(input?.economy?.boosters ?? {})
      },
      processedTransactionIds: input?.economy?.processedTransactionIds ?? [],
      rewardedAds: {
        ...fallback.economy.rewardedAds,
        ...(input?.economy?.rewardedAds ?? {}),
        rewardIds: input?.economy?.rewardedAds?.rewardIds ?? []
      }
    },
    entitlements: {
      ...fallback.entitlements,
      ...(input?.entitlements ?? {})
    },
    support: {
      installId: input?.support?.installId ?? createInstallId(new Date(input?.createdAt ?? Date.now()))
    },
    ads: {
      ...fallback.ads,
      ...(input?.ads ?? {})
    }
  };
}

export function applyRoundResult(
  profile: SaveProfile,
  modeId: GameModeId,
  score: number,
  daily: DailyVaultSave | null = null
): SaveProfile {
  const pointsDelta = Math.max(0, Math.floor(score / 250));
  return {
    ...profile,
    updatedAt: new Date().toISOString(),
    highScores: {
      ...profile.highScores,
      [modeId]: Math.max(profile.highScores[modeId] ?? 0, score)
    },
    dailyVault: daily ?? profile.dailyVault,
    cosmetics: {
      ...profile.cosmetics,
      fictionalPoints: profile.cosmetics.fictionalPoints + pointsDelta
    },
    ads: {
      ...profile.ads,
      completedRounds: profile.ads.completedRounds + 1
    }
  };
}

export function unlockTheme(profile: SaveProfile, themeId: string, cost: number): SaveProfile {
  if (profile.cosmetics.unlockedThemeIds.includes(themeId)) {
    return {
      ...profile,
      cosmetics: {
        ...profile.cosmetics,
        activeThemeId: themeId
      }
    };
  }

  if (profile.cosmetics.fictionalPoints < cost) {
    return profile;
  }

  return {
    ...profile,
    updatedAt: new Date().toISOString(),
    cosmetics: {
      ...profile.cosmetics,
      activeThemeId: themeId,
      fictionalPoints: profile.cosmetics.fictionalPoints - cost,
      unlockedThemeIds: [...profile.cosmetics.unlockedThemeIds, themeId]
    }
  };
}

export function updateSettings(
  profile: SaveProfile,
  settings: Partial<SettingsSave>
): SaveProfile {
  return {
    ...profile,
    updatedAt: new Date().toISOString(),
    settings: {
      ...profile.settings,
      ...settings
    }
  };
}

export function resetLocalProgress(profile: SaveProfile, now = new Date()): SaveProfile {
  const reset = createDefaultSaveProfile(now);
  return {
    ...reset,
    createdAt: profile.createdAt,
    economy: {
      ...profile.economy,
      rewardedAds: reset.economy.rewardedAds
    },
    entitlements: profile.entitlements,
    support: profile.support,
    ads: reset.ads
  };
}

export function recordInterstitialShown(profile: SaveProfile, now = new Date()): SaveProfile {
  return {
    ...profile,
    updatedAt: now.toISOString(),
    ads: {
      ...profile.ads,
      lastInterstitialRound: profile.ads.completedRounds
    }
  };
}

function createInstallId(now: Date): string {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `vp-${now.getTime().toString(36)}-${randomPart}`;
}

/*
 * Retained as a literal snapshot for tests and docs. Runtime callers should use
 * createDefaultSaveProfile so timestamps represent the current install.
 */
export const defaultSaveProfileSnapshot: SaveProfile = {
  schemaVersion: 2,
  createdAt: "",
  updatedAt: "",
  highScores: {
    classic: 0,
    dailyVault: 0,
    streak: 0
  },
  dailyVault: null,
  cosmetics: {
    activeThemeId: "midnight-vault",
    unlockedThemeIds: ["midnight-vault"],
    fictionalPoints: 0
  },
  settings: {
    hapticsEnabled: true,
    reducedMotion: false,
    soundEnabled: true
  },
  economy: {
    vaultCoins: 0,
    boosters: {
      bonusLives: 0,
      chainBoosts: 0,
      vaultBursts: 0
    },
    processedTransactionIds: [],
    rewardedAds: {
      dateKey: "",
      count: 0,
      rewardIds: []
    }
  },
  entitlements: {
    removeAds: false,
    removeAdsTransactionId: null,
    vaultPassExpiresAt: null,
    vaultPassTransactionId: null
  },
  support: {
    installId: "vp-snapshot"
  },
  ads: {
    completedRounds: 0,
    lastInterstitialRound: 0
  }
};
