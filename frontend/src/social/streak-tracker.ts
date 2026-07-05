import { getLocalDateKey } from "@/game/daily-seed";
import { clientStorage } from "@/storage/client-storage";

const STREAK_KEY = "vaultpop.streak.v1";

type StreakData = {
  dates: string[];
};

export type StreakInfo = {
  current: number;
  best: number;
  playedToday: boolean;
  dates: string[];
};

function readData(): StreakData {
  const data = clientStorage.get<StreakData>(STREAK_KEY, { dates: [] });
  return Array.isArray(data.dates) ? data : { dates: [] };
}

function dateKeyFor(offsetDays: number, from = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() - offsetDays);
  return getLocalDateKey(date);
}

export function recordPlayToday(): StreakInfo {
  const data = readData();
  const today = getLocalDateKey();
  if (!data.dates.includes(today)) {
    const dates = [...data.dates, today].sort().slice(-400);
    clientStorage.set(STREAK_KEY, { dates });
  }
  return getStreakInfo();
}

export function getStreakInfo(): StreakInfo {
  const { dates } = readData();
  const set = new Set(dates);
  const playedToday = set.has(getLocalDateKey());

  let current = 0;
  let cursor = playedToday ? 0 : 1;
  while (set.has(dateKeyFor(cursor))) {
    current += 1;
    cursor += 1;
  }

  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const key of [...set].sort()) {
    if (previous) {
      const prevDate = new Date(`${previous}T12:00:00`);
      prevDate.setDate(prevDate.getDate() + 1);
      run = getLocalDateKey(prevDate) === key ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    previous = key;
  }

  return { current, best, playedToday, dates };
}
