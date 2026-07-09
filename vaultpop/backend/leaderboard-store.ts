import { DatabaseSync } from "node:sqlite";

import type { RewardEventStore } from "./ssv";

export type LeaderboardSnapshot = {
  entries: {
    handle: string;
    score: number;
    mode: string;
    updatedAt: string;
    you: boolean;
  }[];
  players: number;
  yourRank: number | null;
};

export interface LeaderboardStore {
  submit(input: {
    mode: string;
    installId: string;
    handle: string;
    score: number;
  }): { bestScore: number; rank: number };
  top(mode: string, limit: number, installId: string): LeaderboardSnapshot;
}

/** Persistent leaderboard + rewarded-ad event storage (survives restarts). */
export class SqliteLeaderboardStore implements LeaderboardStore, RewardEventStore {
  private database: DatabaseSync;

  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS leaderboard_scores (
        mode TEXT NOT NULL,
        install_id TEXT NOT NULL,
        handle TEXT NOT NULL,
        score INTEGER NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (mode, install_id)
      );
      CREATE INDEX IF NOT EXISTS leaderboard_mode_score_idx
        ON leaderboard_scores(mode, score DESC);
      CREATE TABLE IF NOT EXISTS rewarded_ad_events (
        transaction_id TEXT PRIMARY KEY,
        ad_unit TEXT NOT NULL,
        reward_item TEXT NOT NULL,
        reward_amount INTEGER NOT NULL,
        user_id TEXT,
        created_at TEXT NOT NULL
      );
    `);
  }

  submit(input: {
    mode: string;
    installId: string;
    handle: string;
    score: number;
  }): { bestScore: number; rank: number } {
    const existing = this.database
      .prepare(
        "SELECT score FROM leaderboard_scores WHERE mode = ? AND install_id = ?"
      )
      .get(input.mode, input.installId) as { score: number } | undefined;
    const best = Math.max(existing?.score ?? 0, input.score);
    this.database
      .prepare(`
        INSERT INTO leaderboard_scores (mode, install_id, handle, score, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(mode, install_id) DO UPDATE SET
          handle = excluded.handle,
          score = MAX(leaderboard_scores.score, excluded.score),
          updated_at = excluded.updated_at
      `)
      .run(input.mode, input.installId, input.handle, best, new Date().toISOString());
    const above = this.database
      .prepare(
        "SELECT COUNT(*) AS count FROM leaderboard_scores WHERE mode = ? AND score > ?"
      )
      .get(input.mode, best) as { count: number };
    return { bestScore: best, rank: above.count + 1 };
  }

  top(mode: string, limit: number, installId: string): LeaderboardSnapshot {
    const rows = this.database
      .prepare(`
        SELECT handle, score, install_id, updated_at
        FROM leaderboard_scores
        WHERE mode = ?
        ORDER BY score DESC, updated_at ASC
        LIMIT ?
      `)
      .all(mode, limit) as {
      handle: string;
      score: number;
      install_id: string;
      updated_at: string;
    }[];
    const players = (
      this.database
        .prepare("SELECT COUNT(*) AS count FROM leaderboard_scores WHERE mode = ?")
        .get(mode) as { count: number }
    ).count;
    let yourRank: number | null = null;
    if (installId) {
      const own = this.database
        .prepare(
          "SELECT score FROM leaderboard_scores WHERE mode = ? AND install_id = ?"
        )
        .get(mode, installId) as { score: number } | undefined;
      if (own) {
        const above = this.database
          .prepare(
            "SELECT COUNT(*) AS count FROM leaderboard_scores WHERE mode = ? AND score > ?"
          )
          .get(mode, own.score) as { count: number };
        yourRank = above.count + 1;
      }
    }
    return {
      entries: rows.map((row) => ({
        handle: row.handle,
        score: row.score,
        mode,
        updatedAt: row.updated_at,
        you: Boolean(installId) && row.install_id === installId
      })),
      players,
      yourRank
    };
  }

  recordOnce(input: {
    transactionId: string;
    adUnit: string;
    rewardItem: string;
    rewardAmount: number;
    userId: string | null;
  }): boolean {
    const result = this.database
      .prepare(`
        INSERT OR IGNORE INTO rewarded_ad_events (
          transaction_id, ad_unit, reward_item, reward_amount, user_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        input.transactionId,
        input.adUnit,
        input.rewardItem,
        input.rewardAmount,
        input.userId,
        new Date().toISOString()
      );
    return Number(result.changes) > 0;
  }

  countRecentForUser(userId: string, sinceIso: string): number {
    const row = this.database
      .prepare(
        "SELECT COUNT(*) AS total FROM rewarded_ad_events WHERE user_id = ? AND created_at >= ?"
      )
      .get(userId, sinceIso) as { total: number };
    return Number(row.total);
  }
}

/** In-memory implementation for tests. */
export class MemoryLeaderboardStore implements LeaderboardStore, RewardEventStore {
  private rows = new Map<
    string,
    { installId: string; handle: string; score: number; updatedAt: string }
  >();
  private rewardIds = new Set<string>();

  submit(input: {
    mode: string;
    installId: string;
    handle: string;
    score: number;
  }): { bestScore: number; rank: number } {
    const key = `${input.mode}:${input.installId}`;
    const existing = this.rows.get(key);
    const best = Math.max(existing?.score ?? 0, input.score);
    this.rows.set(key, {
      installId: input.installId,
      handle: input.handle,
      score: best,
      updatedAt: new Date().toISOString()
    });
    const rank =
      [...this.rows.entries()].filter(
        ([rowKey, row]) => rowKey.startsWith(`${input.mode}:`) && row.score > best
      ).length + 1;
    return { bestScore: best, rank };
  }

  top(mode: string, limit: number, installId: string): LeaderboardSnapshot {
    const rows = [...this.rows.entries()]
      .filter(([key]) => key.startsWith(`${mode}:`))
      .map(([, row]) => row)
      .sort((a, b) => b.score - a.score);
    const ownIndex = installId
      ? rows.findIndex((row) => row.installId === installId)
      : -1;
    return {
      entries: rows.slice(0, limit).map((row) => ({
        handle: row.handle,
        score: row.score,
        mode,
        updatedAt: row.updatedAt,
        you: Boolean(installId) && row.installId === installId
      })),
      players: rows.length,
      yourRank: ownIndex >= 0 ? ownIndex + 1 : null
    };
  }

  recordOnce(input: { transactionId: string; userId: string | null }): boolean {
    if (this.rewardIds.has(input.transactionId)) {
      return false;
    }
    this.rewardIds.add(input.transactionId);
    this.rewardEvents.push({
      userId: input.userId,
      createdAt: new Date().toISOString()
    });
    return true;
  }

  countRecentForUser(userId: string, sinceIso: string): number {
    return this.rewardEvents.filter(
      (event) => event.userId === userId && event.createdAt >= sinceIso
    ).length;
  }

  private rewardEvents: { userId: string | null; createdAt: string }[] = [];
}
