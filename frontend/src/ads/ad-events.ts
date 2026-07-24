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
