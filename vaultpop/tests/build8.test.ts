import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createApiHandler } from "../backend/app";
import {
  MemoryLeaderboardStore,
  SqliteLeaderboardStore
} from "../backend/leaderboard-store";
import { MemoryAccountStore } from "../backend/memory-account-store";
import { MemoryLedgerStore } from "../backend/memory-ledger";
import { StaticSsvKeyProvider } from "../backend/ssv";
import type { PurchaseVerifier } from "../backend/types";
import {
  getRewardedCount,
  grantRewardedBonusLife,
  grantRewardedVaultCoins,
  purchaseBoosterWithCoins
} from "../src/monetization/economy";
import { createDefaultSaveProfile } from "../src/storage/save-model";
import { FAQ_ENTRIES, searchFaq } from "../src/support/faq-data";

const noopVerifier: PurchaseVerifier = {
  async verify() {
    throw new Error("Not used in this test.");
  }
};

function createSsvFixture() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1"
  });
  const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const signQuery = (message: string) =>
    sign("sha256", Buffer.from(message, "utf8"), privateKey).toString("base64url");
  return { pem, signQuery };
}

function createApi(options?: { ssvPem?: string }) {
  const leaderboard = new MemoryLeaderboardStore();
  const keys = new Map<number, string>();
  if (options?.ssvPem) {
    keys.set(1, options.ssvPem);
  }
  return {
    leaderboard,
    handler: createApiHandler({
      verifier: noopVerifier,
      ledger: new MemoryLedgerStore(),
      accounts: new MemoryAccountStore(),
      leaderboard,
      rewards: leaderboard,
      ssvKeys: new StaticSsvKeyProvider(keys)
    })
  };
}

test("public registration creates player accounts only, with validation and rate limits", async () => {
  const { handler } = createApi();
  const register = (body: object, ip: string) =>
    handler(
      new Request("https://api.example/v1/auth/register", {
        method: "POST",
        headers: { "x-forwarded-for": ip },
        body: JSON.stringify(body)
      })
    );

  const created = await register(
    { email: "new.player@example.com", password: "a-long-password-123", installId: "install-1" },
    "10.0.0.1"
  );
  assert.equal(created.status, 201);
  const session = (await created.json()) as {
    token: string;
    state: { account: { role: string; email: string } };
  };
  assert.equal(session.state.account.role, "player");
  assert.equal(session.state.account.email, "new.player@example.com");
  assert.ok(session.token.length > 20);
  assert.ok(!JSON.stringify(session).includes("passwordHash"));

  const duplicate = await register(
    { email: "new.player@example.com", password: "a-long-password-123", installId: "install-2" },
    "10.0.0.2"
  );
  assert.equal(duplicate.status, 409);

  const weak = await register(
    { email: "weak@example.com", password: "short", installId: "install-3" },
    "10.0.0.3"
  );
  assert.equal(weak.status, 400);

  // 5 attempts allowed per IP per hour; the 6th is throttled.
  for (let index = 0; index < 5; index += 1) {
    await register(
      { email: `player${index}@ratelimit.example`, password: "a-long-password-123", installId: "rl" },
      "10.9.9.9"
    );
  }
  const throttled = await register(
    { email: "player6@ratelimit.example", password: "a-long-password-123", installId: "rl" },
    "10.9.9.9"
  );
  assert.equal(throttled.status, 429);
});

test("leaderboard submits on round end, keeps best score, filters by mode", async () => {
  const { handler } = createApi();
  const submit = (body: object) =>
    handler(
      new Request("https://api.example/v1/leaderboard/submit", {
        method: "POST",
        body: JSON.stringify(body)
      })
    );

  await submit({ mode: "classic", installId: "install-a", handle: "Vault-A", score: 900 });
  await submit({ mode: "classic", installId: "install-a", handle: "Vault-A", score: 500 }); // lower — ignored
  await submit({ mode: "classic", installId: "install-b", handle: "Vault-B", score: 1200 });
  await submit({ mode: "blitz", installId: "install-a", handle: "Vault-A", score: 300 });

  const classic = await handler(
    new Request("https://api.example/v1/leaderboard?mode=classic&installId=install-a")
  );
  assert.equal(classic.status, 200);
  const classicBody = (await classic.json()) as {
    entries: { handle: string; score: number; you: boolean }[];
    players: number;
    yourRank: number | null;
  };
  assert.equal(classicBody.players, 2);
  assert.equal(classicBody.entries[0]?.handle, "Vault-B");
  assert.equal(classicBody.entries[1]?.score, 900); // best kept, not 500
  assert.equal(classicBody.yourRank, 2);
  assert.equal(classicBody.entries[1]?.you, true);

  const blitz = await handler(
    new Request("https://api.example/v1/leaderboard?mode=blitz&installId=install-a")
  );
  const blitzBody = (await blitz.json()) as { players: number };
  assert.equal(blitzBody.players, 1);

  const rejected = await submit({ mode: "bogus", installId: "install-a", handle: "Vault-A", score: 10 });
  assert.equal(rejected.status, 400);
  const invalidMode = await handler(
    new Request("https://api.example/v1/leaderboard?mode=bogus")
  );
  const invalidBody = (await invalidMode.json()) as { players: number };
  assert.equal(invalidBody.players, 0);
});

test("sqlite leaderboard persists scores across restarts", () => {
  const path = join(mkdtempSync(join(tmpdir(), "vaultpop-lb-")), "test.sqlite");
  const first = new SqliteLeaderboardStore(path);
  first.submit({ mode: "classic", installId: "a", handle: "Vault-A", score: 750 });
  first.submit({ mode: "dailyVault", installId: "b", handle: "Vault-B", score: 400 });

  // Simulate a backend restart with a fresh store over the same file.
  const second = new SqliteLeaderboardStore(path);
  const classic = second.top("classic", 10, "a");
  assert.equal(classic.players, 1);
  assert.equal(classic.entries[0]?.score, 750);
  assert.equal(classic.yourRank, 1);
  const daily = second.top("dailyVault", 10, "");
  assert.equal(daily.entries[0]?.handle, "Vault-B");
});

test("AdMob SSV callbacks verify signatures, stay idempotent, and fail closed", async () => {
  const fixture = createSsvFixture();
  const { handler, leaderboard } = createApi({ ssvPem: fixture.pem });
  const message =
    "ad_network=5450213213286189855&ad_unit=9333822278&reward_amount=10" +
    "&reward_item=vault_coins&timestamp=1750000000&transaction_id=txn-001&user_id=install-1&key_id=1";
  const signature = fixture.signQuery(message);

  const valid = await handler(
    new Request(`https://api.example/api/ads/ssv_callback?${message}&signature=${signature}`)
  );
  assert.equal(valid.status, 200);

  // Idempotency: the same transaction is recorded exactly once.
  assert.equal(leaderboard.recordOnce({ transactionId: "txn-001" } as never), false);

  // Tampered reward amount must fail closed.
  const tampered = await handler(
    new Request(
      `https://api.example/api/ads/ssv_callback?${message.replace("reward_amount=10", "reward_amount=9999")}&signature=${signature}`
    )
  );
  assert.equal(tampered.status, 400);

  // Unknown key id fails closed.
  const unknownKey = await handler(
    new Request(
      `https://api.example/api/ads/ssv_callback?${message.replace("key_id=1", "key_id=7")}&signature=${signature}`
    )
  );
  assert.equal(unknownKey.status, 400);
});

test("/support serves the polished public page for browsers and SSV dual behavior for AdMob", async () => {
  const fixture = createSsvFixture();
  const { handler } = createApi({ ssvPem: fixture.pem });

  const page = await handler(new Request("https://api.example/support"));
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type") ?? "", /text\/html/);
  const body = await page.text();
  assert.ok(body.includes("support@vaultpop.app"));
  assert.ok(body.includes("fictional in-game content"));
  assert.ok(body.includes("VaultPop Support"));
  assert.ok(body.includes("Frequently asked questions"));
  assert.ok(!body.includes("Coin Forge"));
  assert.ok(!/hashrate/i.test(body));

  const message =
    "ad_network=5450213213286189855&ad_unit=3409891849&reward_amount=1" +
    "&reward_item=bonus_life&timestamp=1750000001&transaction_id=txn-support-1&key_id=1";
  const dual = await handler(
    new Request(`https://api.example/support?${message}&signature=${fixture.signQuery(message)}`)
  );
  assert.equal(dual.status, 200);
  assert.equal(await dual.text(), "OK");

  const badDual = await handler(
    new Request(`https://api.example/support?${message}&signature=not-a-signature`)
  );
  assert.equal(badDual.status, 400);
});

test("rewarded grants share the 30/day cap and stay idempotent per reward", () => {
  let profile = createDefaultSaveProfile();
  const dateKey = "2026-07-06";

  profile = grantRewardedVaultCoins(profile, dateKey, "reward-1");
  assert.equal(profile.economy.vaultCoins, 10);
  assert.equal(getRewardedCount(profile, dateKey), 1);

  // Duplicate rewardId is ignored.
  profile = grantRewardedVaultCoins(profile, dateKey, "reward-1");
  assert.equal(profile.economy.vaultCoins, 10);

  profile = grantRewardedBonusLife(profile, dateKey, "reward-2");
  assert.equal(profile.economy.boosters.bonusLives, 1);
  assert.equal(getRewardedCount(profile, dateKey), 2);

  // Fill the SHARED cap with mixed reward kinds.
  for (let index = 3; index <= 30; index += 1) {
    profile =
      index % 2 === 0
        ? grantRewardedVaultCoins(profile, dateKey, `reward-${index}`)
        : grantRewardedBonusLife(profile, dateKey, `reward-${index}`);
  }
  assert.equal(getRewardedCount(profile, dateKey), 30);
  const capped = grantRewardedVaultCoins(profile, dateKey, "reward-31");
  assert.equal(capped.economy.vaultCoins, profile.economy.vaultCoins);
  assert.equal(getRewardedCount(capped, dateKey), 30);

  // A new day resets the shared counter.
  const nextDay = grantRewardedVaultCoins(profile, "2026-07-07", "reward-32");
  assert.equal(getRewardedCount(nextDay, "2026-07-07"), 1);
});

test("booster forge spends coins only when affordable", () => {
  let profile = createDefaultSaveProfile();
  profile = { ...profile, economy: { ...profile.economy, vaultCoins: 260 } };

  const forged = purchaseBoosterWithCoins(profile, "bonusLives");
  assert.equal(forged.economy.vaultCoins, 10);
  assert.equal(forged.economy.boosters.bonusLives, profile.economy.boosters.bonusLives + 1);

  // Not enough coins for a second forge — profile unchanged.
  const denied = purchaseBoosterWithCoins(forged, "bonusLives");
  assert.equal(denied.economy.vaultCoins, 10);
  assert.equal(denied.economy.boosters.bonusLives, forged.economy.boosters.bonusLives);
});

test("FAQ search returns relevant intents and falls back to escalation", () => {
  assert.equal(searchFaq("", null).length, FAQ_ENTRIES.length);
  const cancel = searchFaq("cancel my subscription", null);
  assert.ok(cancel.length > 0);
  assert.equal(cancel[0]?.category, "VaultPass");
  const reward = searchFaq("watched an ad but no reward", null);
  assert.ok(reward.some((entry) => entry.category === "Rewarded Ads"));
  assert.equal(searchFaq("zzzzqqq nonsense", null).length, 0);
});
