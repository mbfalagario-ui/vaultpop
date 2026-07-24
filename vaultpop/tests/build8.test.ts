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
import { MemoryOpsStore } from "../backend/ops-store";
import { MemoryLedgerStore } from "../backend/memory-ledger";
import { handleSsvCallback, StaticSsvKeyProvider } from "../backend/ssv";
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
  const accounts = new MemoryAccountStore();
  return {
    leaderboard,
    handler: createApiHandler({
      verifier: noopVerifier,
      ledger: new MemoryLedgerStore(),
      accounts,
      leaderboard,
      rewards: leaderboard,
      ssvKeys: new StaticSsvKeyProvider(keys),
      ops: new MemoryOpsStore(accounts)
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
  assert.equal(await valid.text(), "OK");

  // Idempotency: the same transaction is recorded exactly once.
  assert.equal(
    leaderboard.recordOnce({ transactionId: "txn-001" } as never),
    false
  );

  // Duplicate delivery of the same signed callback still returns 200.
  const duplicate = await handler(
    new Request(`https://api.example/api/ads/ssv_callback?${message}&signature=${signature}`)
  );
  assert.equal(duplicate.status, 200);

  // Tampered reward amount must fail closed.
  const tampered = await handler(
    new Request(
      `https://api.example/api/ads/ssv_callback?${message.replace("reward_amount=10", "reward_amount=9999")}&signature=${signature}`
    )
  );
  assert.equal(tampered.status, 400);

  // Unknown key id fails closed (after one forced key refresh).
  const unknownKey = await handler(
    new Request(
      `https://api.example/api/ads/ssv_callback?${message.replace("key_id=1", "key_id=7")}&signature=${signature}`
    )
  );
  assert.equal(unknownKey.status, 400);

  // AdMob console URL-validation probe: bare GET/HEAD (no params) must get a
  // 200 readiness response WITHOUT granting anything or leaking details.
  const bareGet = await handler(
    new Request("https://api.example/api/ads/ssv_callback")
  );
  assert.equal(bareGet.status, 200);
  assert.match(bareGet.headers.get("content-type") ?? "", /text\/plain/);
  assert.equal(await bareGet.text(), "VaultPop AdMob SSV endpoint ready.");
  const bareHead = await handler(
    new Request("https://api.example/api/ads/ssv_callback", { method: "HEAD" })
  );
  assert.equal(bareHead.status, 200);

  // Unsigned params (no signature/key_id) still fail closed with 400.
  const unsigned = await handler(
    new Request(
      "https://api.example/api/ads/ssv_callback?transaction_id=test-invalid&reward_item=VaultCoins&reward_amount=10"
    )
  );
  assert.equal(unsigned.status, 400);
});

test("SSV grantable callbacks accept both numeric and full ad unit formats", async () => {
  const fixture = createSsvFixture();
  const { handler, leaderboard } = createApi({ ssvPem: fixture.pem });

  // Full ca-app-pub format for the bonus-life unit.
  const fullFormat =
    "ad_network=5450213213286189855&ad_unit=ca-app-pub-6035003811280283%2F3409891849" +
    "&reward_amount=1&reward_item=bonus_life&timestamp=1750000008&transaction_id=txn-full-unit&user_id=install-2&key_id=1";
  const full = await handler(
    new Request(
      `https://api.example/api/ads/ssv_callback?${fullFormat}&signature=${fixture.signQuery(decodeURIComponent(fullFormat))}`
    )
  );
  assert.equal(full.status, 200);
  assert.equal(await full.text(), "OK");
  assert.equal(
    leaderboard.recordOnce({ transactionId: "txn-full-unit" } as never),
    false
  );

  // Numeric format for the vault-coins unit.
  const numericFormat =
    "ad_network=5450213213286189855&ad_unit=9333822278&reward_amount=10" +
    "&reward_item=vault_coins&timestamp=1750000009&transaction_id=txn-numeric-unit&user_id=install-3&key_id=1";
  const numeric = await handler(
    new Request(
      `https://api.example/api/ads/ssv_callback?${numericFormat}&signature=${fixture.signQuery(numericFormat)}`
    )
  );
  assert.equal(numeric.status, 200);
  assert.equal(await numeric.text(), "OK");

  // Unrecognized reward mapping (amount outside VaultPop bounds): 200 no grant.
  const badMapping =
    "ad_network=5450213213286189855&ad_unit=9333822278&reward_amount=500" +
    "&reward_item=vault_coins&timestamp=1750000010&transaction_id=txn-bad-map&user_id=install-3&key_id=1";
  const noMap = await handler(
    new Request(
      `https://api.example/api/ads/ssv_callback?${badMapping}&signature=${fixture.signQuery(badMapping)}`
    )
  );
  assert.equal(noMap.status, 200);
  assert.equal(
    await noMap.text(),
    "Verified SSV callback received. No reward granted."
  );
  assert.equal(
    leaderboard.recordOnce({ transactionId: "txn-bad-map" } as never),
    true
  );
});

test("SSV signatures over percent-DECODED content verify (real Google canonicalization)", async () => {
  // Proven from live Fly diagnostics: Google's console verification callback
  // signs the percent-decoded query content when values contain encoded
  // characters (e.g. a reward_item with a space).
  const fixture = createSsvFixture();
  const { handler } = createApi({ ssvPem: fixture.pem });
  const wireMessage =
    "ad_network=5450213213286189855&ad_unit=3409891849&reward_amount=1" +
    "&reward_item=Bonus%20life&timestamp=1750000007&transaction_id=txn-encoded-1&key_id=1";
  // Google signs the DECODED form of the content.
  const signature = fixture.signQuery(decodeURIComponent(wireMessage));

  const verified = await handler(
    new Request(
      `https://api.example/api/ads/ssv_callback?${wireMessage}&signature=${signature}`
    )
  );
  assert.equal(verified.status, 200);

  // A signature that matches NEITHER the raw nor decoded content still fails.
  const forged = await handler(
    new Request(
      `https://api.example/api/ads/ssv_callback?${wireMessage.replace("reward_amount=1", "reward_amount=9")}&signature=${signature}`
    )
  );
  assert.equal(forged.status, 400);
});

test("valid Google-signed SSV callbacks that are not grantable return 200 without granting", async () => {
  const fixture = createSsvFixture();
  const { handler, leaderboard } = createApi({ ssvPem: fixture.pem });
  const noGrantBody = "Verified SSV callback received. No reward granted.";

  // AdMob console verification style: validly signed, NO user_id/custom_data.
  const consoleMessage =
    "ad_network=5450213213286189855&ad_unit=3409891849&reward_amount=1" +
    "&reward_item=Reward&timestamp=1750000002&transaction_id=txn-console-1&key_id=1";
  const consoleTest = await handler(
    new Request(
      `https://api.example/api/ads/ssv_callback?${consoleMessage}&signature=${fixture.signQuery(consoleMessage)}`
    )
  );
  assert.equal(consoleTest.status, 200);
  assert.equal(await consoleTest.text(), noGrantBody);
  // Nothing was granted/recorded for the console test transaction.
  assert.equal(
    leaderboard.recordOnce({ transactionId: "txn-console-1" } as never),
    true
  );

  // Valid signature but user_id does not map to a VaultPop install context.
  const unknownUserMessage =
    "ad_network=5450213213286189855&ad_unit=3409891849&reward_amount=1" +
    "&reward_item=Reward&timestamp=1750000003&transaction_id=txn-unknown-user&user_id=x&key_id=1";
  const unknownUser = await handler(
    new Request(
      `https://api.example/api/ads/ssv_callback?${unknownUserMessage}&signature=${fixture.signQuery(unknownUserMessage)}`
    )
  );
  assert.equal(unknownUser.status, 200);
  assert.equal(await unknownUser.text(), noGrantBody);

  // Valid signature but the ad unit is not an approved VaultPop rewarded unit.
  const wrongUnitMessage =
    "ad_network=5450213213286189855&ad_unit=1111111111&reward_amount=1" +
    "&reward_item=Reward&timestamp=1750000004&transaction_id=txn-wrong-unit&user_id=install-1&key_id=1";
  const wrongUnit = await handler(
    new Request(
      `https://api.example/api/ads/ssv_callback?${wrongUnitMessage}&signature=${fixture.signQuery(wrongUnitMessage)}`
    )
  );
  assert.equal(wrongUnit.status, 200);
  assert.equal(await wrongUnit.text(), noGrantBody);
});

test("unknown SSV key ids trigger exactly one key refresh before failing or succeeding", async () => {
  const fixture = createSsvFixture();
  const message =
    "ad_network=5450213213286189855&ad_unit=9333822278&reward_amount=10" +
    "&reward_item=vault_coins&timestamp=1750000005&transaction_id=txn-rotate&user_id=install-1&key_id=2";
  const signature = fixture.signQuery(message);

  // Key 2 is unknown initially but appears after one refresh (rotation).
  const rotatingProvider = new StaticSsvKeyProvider(
    new Map<number, string>([[1, fixture.pem]]),
    new Map<number, string>([
      [1, fixture.pem],
      [2, fixture.pem]
    ])
  );
  const rotated = await handleSsvCallback(
    new URL(`https://api.example/api/ads/ssv_callback?${message}&signature=${signature}`),
    rotatingProvider,
    new MemoryLeaderboardStore()
  );
  assert.equal(rotatingProvider.refreshCount, 1);
  assert.equal(rotated.status, 200);

  // Still-unknown key after the single refresh fails closed.
  const staleProvider = new StaticSsvKeyProvider(
    new Map<number, string>([[1, fixture.pem]])
  );
  const stale = await handleSsvCallback(
    new URL(`https://api.example/api/ads/ssv_callback?${message}&signature=${signature}`),
    staleProvider,
    new MemoryLeaderboardStore()
  );
  assert.equal(staleProvider.refreshCount, 1);
  assert.equal(stale.status, 400);
});

test("SSV grants enforce the shared 30/day rewarded cap per user", async () => {
  const fixture = createSsvFixture();
  const { handler, leaderboard } = createApi({ ssvPem: fixture.pem });
  for (let index = 0; index < 30; index += 1) {
    leaderboard.recordOnce({
      transactionId: `txn-cap-${index}`,
      userId: "install-capped"
    } as never);
  }
  const message =
    "ad_network=5450213213286189855&ad_unit=9333822278&reward_amount=10" +
    "&reward_item=vault_coins&timestamp=1750000006&transaction_id=txn-cap-31&user_id=install-capped&key_id=1";
  const capped = await handler(
    new Request(
      `https://api.example/api/ads/ssv_callback?${message}&signature=${fixture.signQuery(message)}`
    )
  );
  assert.equal(capped.status, 200);
  assert.equal(
    await capped.text(),
    "Verified SSV callback received. No reward granted."
  );
  // The capped transaction was NOT recorded as a grant.
  assert.equal(
    leaderboard.recordOnce({ transactionId: "txn-cap-31" } as never),
    true
  );
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
  // The dual-behavior test callback carries no user_id, so it is verified
  // but not grantable.
  assert.equal(
    await dual.text(),
    "Verified SSV callback received. No reward granted."
  );

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
