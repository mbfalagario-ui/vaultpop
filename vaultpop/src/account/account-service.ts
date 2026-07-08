import type {
  AccountBalanceSnapshot,
  SaveProfile
} from "@/storage/save-model";

export type AccountRole = "player" | "reviewer" | "admin";

export type AccountStateResponse = {
  account: {
    id: string;
    email: string;
    role: AccountRole;
    active: boolean;
    createdAt: string;
  };
  linkedInstallId: string | null;
  balance: AccountBalanceSnapshot;
};

export type AccountLoginResponse = {
  token: string;
  expiresAt: string;
  state: AccountStateResponse;
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_VAULTPOP_API_URL ?? "https://vaultpop-api.fly.dev";

export async function signInAccount(input: {
  email: string;
  password: string;
  installId: string;
}): Promise<AccountLoginResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const body = (await response.json()) as AccountLoginResponse & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? "Sign in failed.");
  }
  return body;
}

export async function registerAccount(input: {
  email: string;
  password: string;
  installId: string;
}): Promise<AccountLoginResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const body = (await response.json()) as AccountLoginResponse & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? "Account creation failed.");
  }
  return body;
}

export async function signOutAccount(token: string | null): Promise<void> {
  if (!token) {
    return;
  }
  await fetch(`${API_BASE_URL}/v1/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  }).catch(() => undefined);
}

export async function refreshAccountState(
  token: string
): Promise<AccountStateResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/account`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = (await response.json()) as {
    state?: AccountStateResponse;
    error?: string;
  };
  if (!response.ok || !body.state) {
    throw new Error(body.error ?? "Account refresh failed.");
  }
  return body.state;
}

export function applyAccountLogin(
  profile: SaveProfile,
  login: AccountLoginResponse,
  now = new Date()
): SaveProfile {
  const sameAccount = profile.account.accountId === login.state.account.id;
  const prior = sameAccount ? profile.account.balanceSnapshot : null;
  const balance = login.state.balance;
  const purchasedAdFree = Boolean(profile.entitlements.removeAdsTransactionId);
  const purchasedPassExpiresAt = profile.entitlements.vaultPassTransactionId
    ? profile.entitlements.vaultPassExpiresAt
    : null;

  return {
    ...profile,
    updatedAt: now.toISOString(),
    economy: {
      ...profile.economy,
      vaultCoins: reconcileAmount(
        profile.economy.vaultCoins,
        prior?.vaultCoins ?? 0,
        balance.vaultCoins
      ),
      boosters: {
        bonusLives: reconcileAmount(
          profile.economy.boosters.bonusLives,
          prior?.bonusLives ?? 0,
          balance.bonusLives
        ),
        chainBoosts: reconcileAmount(
          profile.economy.boosters.chainBoosts,
          prior?.chainBoosts ?? 0,
          balance.chainBoosts
        ),
        vaultBursts: reconcileAmount(
          profile.economy.boosters.vaultBursts,
          prior?.vaultBursts ?? 0,
          balance.vaultBursts
        )
      }
    },
    entitlements: {
      ...profile.entitlements,
      removeAds: purchasedAdFree || balance.removeAds,
      vaultPassExpiresAt: latestExpiration(
        purchasedPassExpiresAt,
        balance.vaultPassExpiresAt
      )
    },
    account: {
      accountId: login.state.account.id,
      email: login.state.account.email,
      role: login.state.account.role,
      sessionToken: login.token,
      sessionExpiresAt: login.expiresAt,
      linkedInstallId: login.state.linkedInstallId,
      balanceSnapshot: { ...balance }
    }
  };
}

export function applyAccountRefresh(
  profile: SaveProfile,
  state: AccountStateResponse,
  now = new Date()
): SaveProfile {
  if (!profile.account.sessionToken || !profile.account.sessionExpiresAt) {
    return profile;
  }
  return applyAccountLogin(
    profile,
    {
      token: profile.account.sessionToken,
      expiresAt: profile.account.sessionExpiresAt,
      state
    },
    now
  );
}

export function clearAccountSession(
  profile: SaveProfile,
  now = new Date()
): SaveProfile {
  return {
    ...profile,
    updatedAt: now.toISOString(),
    account: {
      ...profile.account,
      sessionToken: null,
      sessionExpiresAt: null
    }
  };
}

export function isAccountSignedIn(profile: SaveProfile, now = new Date()): boolean {
  return Boolean(
    profile.account.sessionToken &&
      profile.account.sessionExpiresAt &&
      new Date(profile.account.sessionExpiresAt).getTime() > now.getTime()
  );
}

function reconcileAmount(
  localAmount: number,
  priorServerAmount: number,
  nextServerAmount: number
): number {
  return Math.max(
    0,
    localAmount + Math.max(0, Math.floor(nextServerAmount)) -
      Math.max(0, Math.floor(priorServerAmount))
  );
}

function latestExpiration(
  first: string | null,
  second: string | null
): string | null {
  if (!first) {
    return second;
  }
  if (!second) {
    return first;
  }
  return new Date(first).getTime() >= new Date(second).getTime() ? first : second;
}
