const API_BASE_URL =
  process.env.EXPO_PUBLIC_VAULTPOP_API_URL ?? "https://vaultpop-api.fly.dev";

export type RewardedAdEventInput = {
  event: "granted" | "failed";
  rewardType: "bonus_life" | "vault_coins";
};

/**
 * Fire-and-forget analytics ping for the owner console. Grants nothing and
 * never blocks or affects the reward flow.
 */
export function reportRewardedAdEvent(
  installId: string,
  input: RewardedAdEventInput
): void {
  fetch(`${API_BASE_URL}/v1/ads/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ installId, ...input })
  }).catch(() => undefined);
}

/**
 * Fetches this user's effective rewarded-ad daily cap (default or per-user
 * admin override) from the backend. Returns null on any failure so callers
 * fall back to the built-in default — never blocks the reward flow.
 */
export async function fetchRewardedCap(userId: string): Promise<number | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/v1/ads/quota?userId=${encodeURIComponent(userId)}`
    );
    if (!response.ok) {
      return null;
    }
    const body = (await response.json().catch(() => null)) as { cap?: unknown } | null;
    return typeof body?.cap === "number" && body.cap >= 0
      ? Math.floor(body.cap)
      : null;
  } catch {
    return null;
  }
}
