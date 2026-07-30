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
export const ADMIN_CONSOLE_URL = `${API_BASE_URL}/admin`;
const REQUEST_TIMEOUT_MS = 15_000;

export class SessionExpiredError extends Error {}

type ApiResult = {
  ok: boolean;
  status: number;
  body: Record<string, any> | null;
};

/**
 * Fetch with a hard timeout and safe JSON parsing. Never throws a raw
 * SyntaxError: proxy HTML error pages, empty bodies, and stalled requests
 * all resolve to friendly, user-presentable failures.
 */
export async function requestJson(
  path: string,
  options: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<ApiResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal
    });
  } catch {
    throw new Error(
      controller.signal.aborted
        ? "The VaultPop service took too long to respond. Please try again."
        : "The VaultPop service could not be reached. Check your connection and try again."
    );
  } finally {
    clearTimeout(timer);
  }
  const text = await response.text().catch(() => "");
  let body: Record<string, any> | null = null;
  if (text) {
    try {
      body = JSON.parse(text) as Record<string, any>;
    } catch {
      body = null;
    }
  }
  return { ok: response.ok, status: response.status, body };
}

function errorMessage(result: ApiResult, fallback: string): string {
  return typeof result.body?.error === "string" ? result.body.error : fallback;
}

export async function signInAccount(input: {
  email: string;
  password: string;
  installId: string;
}): Promise<AccountLoginResponse> {
  const result = await requestJson("/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!result.ok || typeof result.body?.token !== "string") {
    throw new Error(errorMessage(result, "Sign in failed. Please try again."));
  }
  return result.body as AccountLoginResponse;
}

export async function registerAccount(input: {
  email: string;
  password: string;
  installId: string;
}): Promise<AccountLoginResponse> {
  const result = await requestJson("/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!result.ok || typeof result.body?.token !== "string") {
    throw new Error(errorMessage(result, "Account creation failed. Please try again."));
  }
  return result.body as AccountLoginResponse;
}

/**
 * Safe self-service reset request. The backend never reveals whether the
 * email exists; with no email provider configured, requests queue for an
 * admin-assisted reset.
 */
export async function requestPasswordReset(email: string): Promise<string> {
  const result = await requestJson("/v1/auth/password-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  if (!result.ok) {
    throw new Error(
      errorMessage(result, "Password reset is unavailable right now. Try again later.")
    );
  }
  return typeof result.body?.message === "string"
    ? result.body.message
    : "If an account exists for this email, a reset request has been received.";
}

/**
 * Exchanges the signed-in admin session for a short-lived single-use handoff
 * code and returns the console URL that consumes it. The backend then sets a
 * secure HttpOnly cookie session for /admin, so the owner is never asked to
 * sign in a second time. Raw session tokens never appear in any URL.
 */
export async function requestAdminConsoleHandoffUrl(token: string): Promise<string> {
  const result = await requestJson("/v1/admin/handoff", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  if (!result.ok || typeof result.body?.code !== "string") {
    throw new Error(errorMessage(result, "Admin Console is unavailable right now."));
  }
  return `${API_BASE_URL}/admin/handoff?code=${encodeURIComponent(result.body.code)}`;
}

export async function signOutAccount(token: string | null): Promise<void> {
  if (!token) {
    return;
  }
  await requestJson("/v1/auth/logout", {
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
  const result = await requestJson("/v1/account", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (result.status === 401) {
    throw new SessionExpiredError("Your session expired. Sign in again to sync.");
  }
  if (!result.ok || !result.body?.state) {
    throw new Error(errorMessage(result, "Account refresh failed."));
  }
  return result.body.state as AccountStateResponse;
}

/**
 * Permanent self-service account deletion. Requires the current session
 * token PLUS the account password (fresh reauthentication) and sends the
 * explicit typed confirmation. The backend deletes the account, revokes all
 * sessions, and purges/de-identifies linked server-side data.
 */
export async function deleteAccountPermanently(
  token: string,
  password: string
): Promise<void> {
  const result = await requestJson("/v1/account/delete", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password, confirm: "DELETE" })
  });
  if (result.status === 401) {
    throw new SessionExpiredError(
      "Your session expired. Sign in again, then retry deletion."
    );
  }
  if (!result.ok || result.body?.deleted !== true) {
    throw new Error(errorMessage(result, "Account deletion failed. Please try again."));
  }
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
