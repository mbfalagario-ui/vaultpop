import type { GameModeId } from "@/game/models";

export type LeaderboardEntry = {
  handle: string;
  score: number;
  mode: string;
  updatedAt: string;
  you: boolean;
};

export type LeaderboardSnapshot = {
  entries: LeaderboardEntry[];
  players: number;
  yourRank: number | null;
};

function apiBase(): string | null {
  const base = process.env.EXPO_PUBLIC_VAULTPOP_API_URL;
  return base ? base.replace(/\/$/, "") : null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  const base = apiBase();
  if (!base) {
    return null;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function submitLeaderboardScore(input: {
  installId: string;
  handle: string;
  mode: GameModeId;
  score: number;
}): Promise<{ accepted: boolean; bestScore?: number; rank?: number } | null> {
  if (input.score <= 0) {
    return null;
  }
  return request("/v1/leaderboard/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export async function fetchLeaderboard(
  mode: GameModeId,
  limit: number,
  installId: string
): Promise<LeaderboardSnapshot | null> {
  const params = new URLSearchParams({
    mode,
    limit: String(limit),
    installId
  });
  return request(`/v1/leaderboard?${params.toString()}`);
}
