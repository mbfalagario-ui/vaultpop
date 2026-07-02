import assert from "node:assert/strict";
import test from "node:test";

import { clientStorage } from "../src/storage/client-storage";

test("client storage returns stable snapshots after a value is set", () => {
  const key = "test.stable-snapshot";
  const value = { score: 42 };

  clientStorage.set(key, value);

  assert.strictEqual(clientStorage.get(key, { score: 0 }), value);
  assert.strictEqual(clientStorage.get(key, { score: 0 }), value);
});

test("client storage keeps an offline fallback before persistence is ready", () => {
  const key = `test.offline-fallback.${Date.now()}.${Math.random()}`;
  const fallback = { ready: true };

  assert.strictEqual(clientStorage.get(key, fallback), fallback);
  assert.equal(clientStorage.has(key), false);
});
