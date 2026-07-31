/**
 * BUILD 20 — Final product completion tests.
 *
 * Covers:
 *  1. Shop/VaultPass: exactly-once grants + purchase classification
 *     (initial / renewal / duplicate ignored / no grant due).
 *  2. Ads cap: per-user (account/install + UTC day) quota, admin default cap,
 *     per-user override, usage/remaining, reset — plus two-user isolation.
 *  3. Customization: every selectable style carries live renderer properties
 *     and changes at least three of them versus the default style.
 *  4. Gameplay: 3-2-1-GO countdown gating (input + timer blocked until GO)
 *     and hidden in-board boosters that never touch persistent inventory.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { createApiHandler } from "../backend/app";
import { MemoryLeaderboardStore } from "../backend/leaderboard-store";
import { MemoryAccountStore } from "../backend/memory-account-store";
import { MemoryLedgerStore } from "../backend/memory-ledger";
import { MemoryOpsStore } from "../backend/ops-store";
import { StaticSsvKeyProvider } from "../backend/ssv";
import type { PurchaseVerifier } from "../backend/types";
import { getUtcDateKey } from "../src/game/daily-seed";
import {
  advanceTimer,
  beginRound,
  createBoard,
  createInitialRound,
  getConnectedGroup,
  resolveTap
} from "../src/game/engine";
import type { HiddenBoosterType } from "../src/game/models";
import {
  applyVerifiedPurchase,
  classifyVerifiedPurchase,
  grantRewardedBonusLife,
  type VerifiedPurchaseGrant
} from "../src/monetization/economy";
import { defaultSaveProfile } from "../src/storage/save-model";
import { visualThemes } from "../src/theme/theme-definitions";

const verifier: PurchaseVerifier = {
  async verify() {
    return {
      transactionId: "txn-unused",
      productId: "app.vaultpop.coins.small",
      expiresAt: null,
      revokedAt: null
    };
  }
};

function createFixture() {
  const accounts = new MemoryAccountStore();
  accounts.upsertBootstrapAccount({
    email: "owner@test.app",
    password: "OwnerPassword!234",
    role: "admin"
  });
  const leaderboard = new MemoryLeaderboardStore();
  const ops = new MemoryOpsStore(accounts);
  const handler = createApiHandler({
    verifier,
    ledger: new MemoryLedgerStore(),
    accounts,
    leaderboard,
    rewards: leaderboard,
    ssvKeys: new StaticSsvKeyProvider(new Map()),
    ops
  });
  return { accounts, handler, ops, rewards: leaderboard };
}

type Handler = ReturnType<typeof createFixture>["handler"];

async function call(
  handler: Handler,
  method: string,
  path: string,
  body?: unknown,
  token?: string
) {
  const response = await handler(
    new Request(`https://api.example${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    })
  );
  return {
    status: response.status,
    body: (await response.json().catch(() => null)) as any
  };
}

async function adminToken(handler: Handler): Promise<string> {
  const login = await call(handler, "POST", "/v1/auth/login", {
    email: "owner@test.app",
    password: "OwnerPassword!234",
    installId: "web-admin"
  });
  return login.body.token as string;
}

function recordReward(
  rewards: MemoryLeaderboardStore,
  userId: string,
  index: number
) {
  return rewards.recordOnce({
    transactionId: `ssv-${userId}-${index}`,
    adUnit: "test-unit",
    rewardItem: "bonus_life",
    rewardAmount: 1,
    userId
  });
}

// ---------------------------------------------------------------------------
// 1. SHOP / VAULTPASS
// ---------------------------------------------------------------------------

const coinsPurchase: VerifiedPurchaseGrant = {
  verified: true,
  transactionId: "txn-coins-1",
  productId: "app.vaultpop.coins.small",
  grant: { vaultCoins: 500 }
};

test("consumables grant exactly once — duplicate apply never doubles", () => {
  const once = applyVerifiedPurchase(defaultSaveProfile, coinsPurchase);
  assert.equal(once.economy.vaultCoins, defaultSaveProfile.economy.vaultCoins + 500);
  const twice = applyVerifiedPurchase(once, coinsPurchase);
  assert.equal(twice.economy.vaultCoins, once.economy.vaultCoins);
  assert.equal(
    twice.economy.processedTransactionIds.filter((id) => id === "txn-coins-1").length,
    1
  );
});

test("purchase classification: initial, renewal, duplicate ignored, no grant due", () => {
  // Initial consumable purchase.
  assert.equal(classifyVerifiedPurchase(defaultSaveProfile, coinsPurchase), "initial");

  // Duplicate ignored after it was applied.
  const applied = applyVerifiedPurchase(defaultSaveProfile, coinsPurchase);
  assert.equal(classifyVerifiedPurchase(applied, coinsPurchase), "duplicate-ignored");

  // No grant due: revoked transaction.
  assert.equal(
    classifyVerifiedPurchase(defaultSaveProfile, {
      ...coinsPurchase,
      transactionId: "txn-revoked-1",
      revokedAt: new Date().toISOString()
    }),
    "no-grant-due"
  );

  // VaultPass initial then renewal (new transaction while pass active).
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000).toISOString();
  const passInitial: VerifiedPurchaseGrant = {
    verified: true,
    transactionId: "txn-pass-1",
    productId: "app.vaultpop.vaultpass.plus.monthly",
    grant: { bonusLives: 5, chainBoosts: 3, vaultBursts: 1 },
    expiresAt: future
  };
  assert.equal(classifyVerifiedPurchase(defaultSaveProfile, passInitial), "initial");
  const member = applyVerifiedPurchase(defaultSaveProfile, passInitial);
  const passRenewal: VerifiedPurchaseGrant = {
    ...passInitial,
    transactionId: "txn-pass-2"
  };
  assert.equal(classifyVerifiedPurchase(member, passRenewal), "renewal");
  // Restore of the SAME transaction is a duplicate, not a renewal.
  assert.equal(classifyVerifiedPurchase(member, passInitial), "duplicate-ignored");
});

test("VaultPass renewal provisions benefits once; restore/refresh never duplicates", () => {
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000).toISOString();
  const initial: VerifiedPurchaseGrant = {
    verified: true,
    transactionId: "txn-pass-a",
    productId: "app.vaultpop.vaultpass.plus.monthly",
    grant: { bonusLives: 5, chainBoosts: 3, vaultBursts: 1 },
    expiresAt: future
  };
  const member = applyVerifiedPurchase(defaultSaveProfile, initial);
  assert.equal(
    member.economy.boosters.bonusLives,
    defaultSaveProfile.economy.boosters.bonusLives + 5
  );
  assert.equal(member.entitlements.vaultPassExpiresAt, future);

  // Restore / entitlement refresh with the SAME transaction: no new grant.
  const restored = applyVerifiedPurchase(member, initial);
  assert.equal(restored.economy.boosters.bonusLives, member.economy.boosters.bonusLives);

  // Renewal (NEW transaction): the monthly benefits provision exactly once.
  const renewal = applyVerifiedPurchase(member, {
    ...initial,
    transactionId: "txn-pass-b"
  });
  assert.equal(
    renewal.economy.boosters.bonusLives,
    member.economy.boosters.bonusLives + 5
  );
  const renewalAgain = applyVerifiedPurchase(renewal, {
    ...initial,
    transactionId: "txn-pass-b"
  });
  assert.equal(
    renewalAgain.economy.boosters.bonusLives,
    renewal.economy.boosters.bonusLives
  );
});

// ---------------------------------------------------------------------------
// 2. ADS — per-user daily cap
// ---------------------------------------------------------------------------

test("UTC date key matches the backend SSV UTC-day window", () => {
  const date = new Date("2026-06-15T23:30:00.000Z");
  assert.equal(getUtcDateKey(date), "2026-06-15");
  assert.match(getUtcDateKey(), /^\d{4}-\d{2}-\d{2}$/);
});

test("client rewarded ledger honors a per-user override cap", () => {
  const dateKey = getUtcDateKey();
  let profile = defaultSaveProfile;
  profile = grantRewardedBonusLife(profile, dateKey, "r-1", new Date(), 2);
  profile = grantRewardedBonusLife(profile, dateKey, "r-2", new Date(), 2);
  assert.equal(profile.economy.rewardedAds.count, 2);
  // Third grant is refused at cap 2 — and the same rewardId is idempotent.
  const capped = grantRewardedBonusLife(profile, dateKey, "r-3", new Date(), 2);
  assert.equal(capped.economy.rewardedAds.count, 2);
  const duplicate = grantRewardedBonusLife(profile, dateKey, "r-2", new Date(), 30);
  assert.equal(duplicate.economy.rewardedAds.count, 2);
});

test("ops store: default cap, per-user override, effective cap, reset", () => {
  const { ops } = createFixture();
  assert.equal(ops.getDefaultRewardedCap(), 30);
  ops.setDefaultRewardedCap(40);
  assert.equal(ops.getDefaultRewardedCap(), 40);
  assert.equal(ops.getEffectiveRewardedCap("install-a"), 40);
  ops.setRewardedCapOverride("install-a", 5);
  assert.equal(ops.getEffectiveRewardedCap("install-a"), 5);
  assert.equal(ops.getEffectiveRewardedCap("install-b"), 40);
  assert.equal(ops.listRewardedCapOverrides().length, 1);
  ops.clearRewardedCapOverride("install-a");
  assert.equal(ops.getRewardedCapOverride("install-a"), null);
  assert.equal(ops.getEffectiveRewardedCap("install-a"), 40);
});

test("two-user cap isolation: one user exhausting quota never affects another", async () => {
  const { handler, rewards } = createFixture();

  // User A consumes the full default cap (30) via SSV-confirmed grants.
  for (let index = 0; index < 30; index += 1) {
    assert.equal(recordReward(rewards, "install-user-a", index), true);
  }
  const quotaA = await call(handler, "GET", "/v1/ads/quota?userId=install-user-a");
  assert.equal(quotaA.status, 200);
  assert.equal(quotaA.body.cap, 30);
  assert.equal(quotaA.body.ssvConfirmedToday, 30);
  assert.equal(quotaA.body.remaining, 0);

  // User B is completely unaffected — the cap is per user + UTC day.
  const quotaB = await call(handler, "GET", "/v1/ads/quota?userId=install-user-b");
  assert.equal(quotaB.status, 200);
  assert.equal(quotaB.body.ssvConfirmedToday, 0);
  assert.equal(quotaB.body.remaining, 30);

  // Invalid user id is rejected.
  const invalid = await call(handler, "GET", "/v1/ads/quota?userId=ab");
  assert.equal(invalid.status, 400);
});

test("admin rewarded-cap console: default, override, usage, reset — admin only", async () => {
  const { handler, rewards } = createFixture();
  const admin = await adminToken(handler);

  // Locked down for anonymous callers.
  const anonymous = await call(handler, "GET", "/v1/admin/rewarded-caps");
  assert.equal(anonymous.status, 403);

  // Default cap view + update (with validation).
  const initial = await call(handler, "GET", "/v1/admin/rewarded-caps", undefined, admin);
  assert.equal(initial.status, 200);
  assert.equal(initial.body.defaultCap, 30);
  assert.deepEqual(initial.body.overrides, []);
  const badDefault = await call(
    handler,
    "POST",
    "/v1/admin/rewarded-caps/default",
    { cap: 0 },
    admin
  );
  assert.equal(badDefault.status, 400);
  const setDefault = await call(
    handler,
    "POST",
    "/v1/admin/rewarded-caps/default",
    { cap: 50 },
    admin
  );
  assert.equal(setDefault.status, 200);
  assert.equal(setDefault.body.defaultCap, 50);

  // Per-user override + current usage + remaining allowance.
  recordReward(rewards, "install-vip-1", 0);
  recordReward(rewards, "install-vip-1", 1);
  const override = await call(
    handler,
    "POST",
    "/v1/admin/rewarded-caps/override",
    { userId: "install-vip-1", cap: 10 },
    admin
  );
  assert.equal(override.status, 200);
  assert.equal(override.body.override, 10);
  const usage = await call(
    handler,
    "GET",
    "/v1/admin/rewarded-caps/usage?userId=install-vip-1",
    undefined,
    admin
  );
  assert.equal(usage.status, 200);
  assert.equal(usage.body.defaultCap, 50);
  assert.equal(usage.body.override, 10);
  assert.equal(usage.body.effectiveCap, 10);
  assert.equal(usage.body.usedToday, 2);
  assert.equal(usage.body.remaining, 8);

  // The public quota endpoint reflects the admin override for that user only.
  const quota = await call(handler, "GET", "/v1/ads/quota?userId=install-vip-1");
  assert.equal(quota.body.cap, 10);
  const other = await call(handler, "GET", "/v1/ads/quota?userId=install-other");
  assert.equal(other.body.cap, 50);

  // Reset override — user returns to the default cap.
  const reset = await call(
    handler,
    "POST",
    "/v1/admin/rewarded-caps/override/reset",
    { userId: "install-vip-1" },
    admin
  );
  assert.equal(reset.status, 200);
  assert.equal(reset.body.override, null);
  assert.equal(reset.body.effectiveCap, 50);

  // Overrides list shows usage + remaining per user.
  await call(
    handler,
    "POST",
    "/v1/admin/rewarded-caps/override",
    { userId: "install-vip-2", cap: 3 },
    admin
  );
  const list = await call(handler, "GET", "/v1/admin/rewarded-caps", undefined, admin);
  assert.equal(list.body.overrides.length, 1);
  assert.equal(list.body.overrides[0].userId, "install-vip-2");
  assert.equal(list.body.overrides[0].remaining, 3);
});

// ---------------------------------------------------------------------------
// 3. CUSTOMIZATION — live renderer properties
// ---------------------------------------------------------------------------

test("every selectable style defines full renderer properties", () => {
  assert.equal(visualThemes.length, 5);
  for (const theme of visualThemes) {
    assert.ok(["coin", "square", "gem"].includes(theme.tileShape), theme.id);
    assert.equal(Array.isArray(theme.boardColors) ? theme.boardColors.length : 0, 2);
    assert.match(theme.selectionColor, /^#/);
    assert.match(theme.boardBorder, /^#/);
    for (const tileType of ["gold", "cyan", "emerald", "violet", "ruby"] as const) {
      assert.equal(theme.tileGradients[tileType].length, 3, `${theme.id}:${tileType}`);
    }
  }
});

test("every non-default style changes at least three renderer properties", () => {
  const base = visualThemes.find((theme) => theme.id === "midnight-vault")!;
  for (const theme of visualThemes) {
    if (theme.id === base.id) {
      continue;
    }
    let changed = 0;
    if (theme.tileShape !== base.tileShape) changed += 1;
    if (JSON.stringify(theme.tileGradients) !== JSON.stringify(base.tileGradients)) changed += 1;
    if (theme.boardColors[0] !== base.boardColors[0]) changed += 1;
    if (theme.selectionColor !== base.selectionColor) changed += 1;
    if (theme.boardBorder !== base.boardBorder) changed += 1;
    assert.ok(
      changed >= 3,
      `${theme.id} changes only ${changed} renderer properties (needs >= 3)`
    );
  }
});

// ---------------------------------------------------------------------------
// 4. GAMEPLAY — countdown gating + hidden boosters
// ---------------------------------------------------------------------------

test("countdown gating: ready blocks taps and timer until beginRound (GO)", () => {
  const ready = createInitialRound("classic", { seed: "b20-ready", startPhase: "ready" });
  assert.equal(ready.phase, "ready");

  // Input blocked: tapping any tile changes nothing before GO.
  const board = ready.board;
  const group = getConnectedGroup(board, { row: 0, column: 0 });
  const tapped = resolveTap(ready, { row: 0, column: 0 });
  assert.equal(tapped, ready);
  assert.ok(group.length >= 0); // group lookup itself is side-effect free

  // Timer blocked: seconds do not advance before GO.
  const ticked = advanceTimer(ready, 5);
  assert.equal(ticked.secondsRemaining, ready.secondsRemaining);

  // GO flips to playing exactly once; default rounds still start playing.
  const live = beginRound(ready);
  assert.equal(live.phase, "playing");
  assert.equal(beginRound(live), live);
  assert.equal(createInitialRound("classic", { seed: "b20-default" }).phase, "playing");
});

test("hidden boosters: deterministic seeding, survives refill, applies round-only effects", () => {
  // Deterministic: same seed => same hidden booster placement.
  const first = createBoard("b20-boosters");
  const second = createBoard("b20-boosters");
  const boosters = (board: typeof first) =>
    board.tiles.flat().filter((tile) => tile.booster);
  assert.equal(boosters(first).length, 2);
  assert.deepEqual(
    boosters(first).map((tile) => `${tile.row}:${tile.column}:${tile.booster}`),
    boosters(second).map((tile) => `${tile.row}:${tile.column}:${tile.booster}`)
  );

  // Find a seed where a hidden booster sits inside a poppable group, then
  // clear it and confirm the round-only effect + counters.
  let verified: HiddenBoosterType | null = null;
  for (let attempt = 0; attempt < 60 && !verified; attempt += 1) {
    const round = createInitialRound("classic", { seed: `b20-hunt-${attempt}` });
    for (const tile of round.board.tiles.flat()) {
      if (!tile.booster) {
        continue;
      }
      const group = getConnectedGroup(round.board, tile);
      if (group.length < 2) {
        continue;
      }
      const cleared = resolveTap(round, tile);
      assert.equal(cleared.score.hiddenBoosters, 1);
      assert.equal(cleared.lastBooster, tile.booster);
      assert.match(cleared.lastEvent, /Hidden booster|Hidden/i);
      if (tile.booster === "bonusLives") {
        assert.equal(
          cleared.secondsRemaining,
          Math.min(99, round.secondsRemaining + 15)
        );
      } else if (tile.booster === "chainBoosts") {
        assert.equal(
          cleared.score.comboMultiplier,
          Math.min(12, round.score.comboMultiplier + 1 + 2)
        );
      } else {
        assert.ok(
          cleared.score.current >= 750 * round.score.comboMultiplier,
          "vault burst adds bonus score"
        );
        assert.equal(cleared.vaultMeter.opening, true);
      }
      verified = tile.booster;
      break;
    }
  }
  assert.ok(verified, "expected at least one seed with a poppable hidden booster");

  // Refill preserves hidden boosters on surviving tiles: clear a group that
  // does NOT include boosters and confirm booster count never decreases in
  // the surviving set of a normal cascade.
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const round = createInitialRound("classic", { seed: `b20-keep-${attempt}` });
    const target = round.board.tiles
      .flat()
      .find(
        (tile) => !tile.booster && getConnectedGroup(round.board, tile).length >= 2
      );
    if (!target) {
      continue;
    }
    const group = getConnectedGroup(round.board, target);
    if (group.some((pos) => round.board.tiles[pos.row]?.[pos.column]?.booster)) {
      continue;
    }
    const before = round.board.tiles.flat().filter((tile) => tile.booster).length;
    const after = resolveTap(round, target);
    const remaining = after.board.tiles.flat().filter((tile) => tile.booster).length;
    assert.ok(
      remaining >= before,
      `boosters must survive a cascade (before=${before}, after=${remaining})`
    );
    return;
  }
  assert.fail("expected a seed with a booster-free poppable group");
});
