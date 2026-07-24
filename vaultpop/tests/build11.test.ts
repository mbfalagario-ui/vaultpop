import assert from "node:assert/strict";
import test from "node:test";

import { adminPage } from "../backend/admin-page";
import {
  refreshAccountState,
  requestJson,
  SessionExpiredError,
  signInAccount
} from "../src/account/account-service";

const realFetch = globalThis.fetch;

test("sign in surfaces a friendly error when the proxy returns HTML instead of JSON", async () => {
  globalThis.fetch = (async () =>
    new Response("<html><body>502 Bad Gateway</body></html>", {
      status: 502,
      headers: { "Content-Type": "text/html" }
    })) as unknown as typeof fetch;
  try {
    await assert.rejects(
      signInAccount({ email: "a@b.co", password: "pw", installId: "test-install" }),
      (error: unknown) =>
        !(error instanceof SyntaxError) &&
        error instanceof Error &&
        error.message === "Sign in failed. Please try again."
    );
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("sign in handles an empty response body without a JSON parse crash", async () => {
  globalThis.fetch = (async () =>
    new Response("", { status: 200 })) as unknown as typeof fetch;
  try {
    await assert.rejects(
      signInAccount({ email: "a@b.co", password: "pw", installId: "test-install" }),
      /Sign in failed/
    );
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("sign in passes real server error messages through", async () => {
  globalThis.fetch = (async () =>
    Response.json(
      { error: "Email or password is incorrect." },
      { status: 401 }
    )) as unknown as typeof fetch;
  try {
    await assert.rejects(
      signInAccount({ email: "a@b.co", password: "pw", installId: "test-install" }),
      /Email or password is incorrect\./
    );
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("stalled requests time out with a clear message instead of hanging forever", async () => {
  globalThis.fetch = ((_url: unknown, options: { signal: AbortSignal }) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("aborted")));
    })) as unknown as typeof fetch;
  try {
    await assert.rejects(
      requestJson("/v1/auth/login", { method: "POST" }, 30),
      /took too long to respond/
    );
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("account sync maps 401 responses to an explicit session-expired failure", async () => {
  globalThis.fetch = (async () =>
    Response.json(
      { error: "Authentication required." },
      { status: 401 }
    )) as unknown as typeof fetch;
  try {
    await assert.rejects(
      refreshAccountState("expired-token"),
      (error: unknown) =>
        error instanceof SessionExpiredError && /session expired/i.test(error.message)
    );
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("account sync tolerates non-JSON responses without a parse crash", async () => {
  globalThis.fetch = (async () =>
    new Response("upstream connect error", {
      status: 503,
      headers: { "Content-Type": "text/plain" }
    })) as unknown as typeof fetch;
  try {
    await assert.rejects(refreshAccountState("token"), /Account refresh failed\./);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("admin console ships VaultPop cards, restricted access, and safe JSON handling", async () => {
  const response = adminPage();
  const html = await response.text();
  for (const marker of [
    "Restricted Access",
    "Support Inbox",
    "Rewarded Ads (24h)",
    "Purchases &amp; Premium",
    "Operations",
    "Audit Log",
    "VaultPop Admin Console"
  ]) {
    assert.ok(html.includes(marker), `admin page must include "${marker}"`);
  }
  // Safe fetch contract: timeout guard + guarded JSON.parse, no blind .json().
  assert.ok(html.includes("controller.signal.aborted"));
  assert.ok(html.includes("JSON.parse(text)"));
  assert.ok(!html.includes("await response.json()"));
  assert.ok(
    response.headers.get("Content-Security-Policy")?.includes("frame-ancestors 'none'")
  );
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
