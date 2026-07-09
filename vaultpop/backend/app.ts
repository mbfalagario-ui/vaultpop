import { getProductDefinition } from "../src/monetization/catalog";
import { adminPage } from "./admin-page";
import { grantForTransaction } from "./grants";
import type { LeaderboardStore } from "./leaderboard-store";
import {
  handleSsvCallback,
  isSsvCallback,
  type RewardEventStore,
  type SsvKeyProvider
} from "./ssv";
import { renderSupportPage } from "./support-page";
import type {
  AccountRole,
  AccountStore,
  LedgerBalance,
  LedgerStore,
  PublicAccount,
  PurchaseVerifier
} from "./types";

const SUPPORT_CATEGORIES = new Set([
  "Purchase issue",
  "Ads issue",
  "Gameplay issue",
  "Bug report",
  "Privacy request",
  "Other"
]);
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const registrationAttempts = new Map<string, { count: number; resetAt: number }>();
const LEADERBOARD_MODES = new Set(["classic", "dailyVault", "streak", "blitz"]);

export function createApiHandler(dependencies: {
  verifier: PurchaseVerifier;
  ledger: LedgerStore;
  accounts: AccountStore;
  leaderboard: LeaderboardStore;
  rewards: RewardEventStore;
  ssvKeys: SsvKeyProvider;
}) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ status: "ok" });
    }
    if (request.method === "POST" && url.pathname === "/v1/leaderboard/submit") {
      const body = (await request.json().catch(() => null)) as {
        installId?: string;
        handle?: string;
        mode?: string;
        score?: number;
      } | null;
      const mode = body?.mode ?? "";
      const installId = (body?.installId ?? "").slice(0, 80);
      const handle = (body?.handle ?? "").slice(0, 24);
      const score = Math.max(0, Math.min(10_000_000, Math.floor(body?.score ?? -1)));
      if (!LEADERBOARD_MODES.has(mode) || installId.length < 4 || handle.length < 2 || (body?.score ?? -1) < 0) {
        return json({ accepted: false, error: "Invalid leaderboard submission." }, 400);
      }
      const result = dependencies.leaderboard.submit({
        mode,
        installId,
        handle,
        score
      });
      return json({ accepted: true, bestScore: result.bestScore, rank: result.rank });
    }
    if (request.method === "GET" && url.pathname === "/v1/leaderboard") {
      const mode = url.searchParams.get("mode") ?? "classic";
      if (!LEADERBOARD_MODES.has(mode)) {
        return json({ entries: [], players: 0, yourRank: null });
      }
      const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? 50) || 50));
      const installId = url.searchParams.get("installId") ?? "";
      return json(dependencies.leaderboard.top(mode, limit, installId));
    }
    if (request.method === "GET" && url.pathname === "/privacy") {
      return html(
        "VaultPop Privacy",
        "VaultPop stores core game progress on your device. Optional account login links an email address, role, session, install ID, and account inventory to the VaultPop service. Apple processes purchases. Google AdMob may process device identifiers, coarse location, product interaction, advertising, performance, crash, and diagnostic data under its SDK disclosures for ad delivery, consent, measurement, and fraud prevention. VaultPop asks for consent and App Tracking Transparency permission when advertising initialization requires it. Private support requests may include a category, message, optional email, install ID, app and build version, device model, and priority-routing status."
      );
    }
    if (
      (request.method === "GET" || request.method === "HEAD") &&
      url.pathname === "/api/ads/ssv_callback"
    ) {
      // Preferred AdMob rewarded-ad SSV endpoint. Fail closed, idempotent.
      // The AdMob console validates a callback URL with a bare GET/HEAD probe
      // before saving it; that probe carries no query parameters and must get
      // a 200 or the console rejects the URL as invalid. Real SSV callbacks
      // always carry query parameters and remain fail-closed: nothing below
      // grants a reward without a verified Google signature.
      if (![...url.searchParams.keys()].length) {
        return new Response("VaultPop AdMob SSV endpoint ready.", {
          status: 200,
          headers: { "Cache-Control": "no-store", "Content-Type": "text/plain" }
        });
      }
      return handleSsvCallback(url, dependencies.ssvKeys, dependencies.rewards);
    }
    if (request.method === "GET" && url.pathname === "/support") {
      // Dual behavior: if AdMob still targets /support as its SSV callback,
      // detect the SSV parameters and process the callback safely. Normal
      // browser visits always receive the polished public support page.
      if (isSsvCallback(url)) {
        return handleSsvCallback(url, dependencies.ssvKeys, dependencies.rewards);
      }
      return new Response(renderSupportPage(), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300"
        }
      });
    }
    if (request.method === "GET" && url.pathname === "/admin") {
      return adminPage();
    }

    if (request.method === "POST" && url.pathname === "/v1/auth/register") {
      const body = await readJson(request);
      if (
        !isEmail(body.email) ||
        !isShortString(body.password, 200) ||
        !isShortString(body.installId, 200)
      ) {
        return json({ error: "Enter a valid email and password." }, 400);
      }
      // Public sign-ups create "player" accounts only and are IP rate-limited.
      const attemptKey = registrationKey(request);
      if (registrationBlocked(attemptKey)) {
        return json(
          { error: "Too many account creations. Please try again later." },
          429
        );
      }
      recordRegistrationAttempt(attemptKey);
      try {
        const session = dependencies.accounts.registerPlayer({
          email: body.email,
          password: body.password,
          installId: body.installId
        });
        return json(session, 201);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Registration failed.";
        return json({ error: message }, message.includes("already exists") ? 409 : 400);
      }
    }

    if (request.method === "POST" && url.pathname === "/v1/auth/login") {
      const body = await readJson(request);
      if (
        !isEmail(body.email) ||
        !isShortString(body.password, 200) ||
        !isShortString(body.installId, 200)
      ) {
        return json({ error: "Invalid sign-in request." }, 400);
      }
      const attemptKey = loginAttemptKey(request, body.email);
      if (loginBlocked(attemptKey)) {
        return json({ error: "Too many sign-in attempts. Try again later." }, 429);
      }
      const session = dependencies.accounts.login({
        email: body.email,
        password: body.password,
        installId: body.installId
      });
      if (!session) {
        recordLoginFailure(attemptKey);
      } else {
        loginAttempts.delete(attemptKey);
      }
      return session
        ? json(session)
        : json({ error: "Email or password is incorrect." }, 401);
    }

    if (request.method === "POST" && url.pathname === "/v1/auth/logout") {
      const token = bearerToken(request);
      if (token) {
        dependencies.accounts.revokeSession(token);
      }
      return json({ signedOut: true });
    }

    if (request.method === "GET" && url.pathname === "/v1/account") {
      const account = authenticatedAccount(request, dependencies.accounts);
      if (!account) {
        return json({ error: "Authentication required." }, 401);
      }
      return json({ state: dependencies.accounts.getAccountState(account.id) });
    }

    if (url.pathname.startsWith("/v1/admin/")) {
      return handleAdminRequest(request, url, dependencies.accounts);
    }

    if (request.method === "POST" && url.pathname === "/v1/purchases/verify") {
      const body = await readJson(request);
      if (!isShortString(body.installId, 200) || !isShortString(body.signedTransaction, 20_000)) {
        return json({ error: "Invalid purchase verification request." }, 400);
      }
      try {
        const transaction = await dependencies.verifier.verify(body.signedTransaction);
        const product = getProductDefinition(transaction.productId);
        if (!product) {
          return json({ error: "Unknown product." }, 400);
        }
        const applied = dependencies.ledger.applyTransaction(body.installId, transaction);
        const fullGrant = grantForTransaction(transaction);
        const grant = applied.inventoryGrantAllowed
          ? fullGrant
          : {
              removeAds: fullGrant.removeAds,
              premiumTheme: fullGrant.premiumTheme,
              prioritySupport: fullGrant.prioritySupport
            };
        return json({
          verified: true,
          transactionId: transaction.transactionId,
          productId: transaction.productId,
          grant,
          expiresAt: transaction.expiresAt,
          revokedAt: transaction.revokedAt
        });
      } catch {
        return json({ error: "Purchase verification failed." }, 422);
      }
    }

    if (
      request.method === "GET" &&
      (url.pathname === "/v1/entitlements" || url.pathname === "/v1/ledger")
    ) {
      const installId = url.searchParams.get("installId");
      if (!installId || installId.length > 200) {
        return json({ error: "A valid install ID is required." }, 400);
      }
      const balance = dependencies.ledger.getBalance(installId);
      const vaultPassActive = Boolean(
        balance.vaultPassExpiresAt &&
          new Date(balance.vaultPassExpiresAt).getTime() > Date.now()
      );
      return json({
        ...balance,
        vaultPassActive,
        adFree: balance.removeAds || vaultPassActive
      });
    }

    if (request.method === "POST" && url.pathname === "/v1/support/tickets") {
      const body = await readJson(request);
      if (
        !isShortString(body.installId, 200) ||
        !SUPPORT_CATEGORIES.has(body.category) ||
        !isShortString(body.message, 2_000) ||
        body.message.trim().length < 10 ||
        (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) ||
        !isShortString(body.appVersion, 50) ||
        !isShortString(body.buildNumber, 50) ||
        !isShortString(body.deviceInfo, 200)
      ) {
        return json({ error: "Invalid support request." }, 400);
      }
      const balance = dependencies.ledger.getBalance(body.installId);
      const accountBalance =
        dependencies.accounts.getAccountStateByInstallId(body.installId)?.balance;
      const priority = Boolean(
        (balance.vaultPassExpiresAt &&
          new Date(balance.vaultPassExpiresAt).getTime() > Date.now()) ||
          (accountBalance?.vaultPassExpiresAt &&
            new Date(accountBalance.vaultPassExpiresAt).getTime() > Date.now())
      );
      const ticketId = dependencies.ledger.createSupportTicket({
        installId: body.installId,
        category: body.category,
        message: body.message.trim(),
        email: body.email?.trim() || undefined,
        appVersion: body.appVersion,
        buildNumber: body.buildNumber,
        deviceInfo: body.deviceInfo,
        priority
      });
      return json({ ticketId }, 201);
    }

    return json({ error: "Not found." }, 404);
  };
}

async function handleAdminRequest(
  request: Request,
  url: URL,
  accounts: AccountStore
): Promise<Response> {
  const actor = authenticatedAccount(request, accounts);
  if (!actor || actor.role !== "admin") {
    return json({ error: "Admin authorization required." }, 403);
  }

  try {
    if (request.method === "GET" && url.pathname === "/v1/admin/accounts") {
      const roleValue = url.searchParams.get("role");
      const role = isAccountRole(roleValue) ? roleValue : undefined;
      return json({
        accounts: accounts.listAccounts({
          query: url.searchParams.get("q") ?? undefined,
          role
        })
      });
    }

    if (request.method === "GET" && url.pathname === "/v1/admin/audit") {
      return json({
        entries: accounts.listAudit(actor, Number(url.searchParams.get("limit") ?? 100))
      });
    }

    if (request.method === "POST" && url.pathname === "/v1/admin/accounts") {
      const body = await readJson(request);
      if (
        !isEmail(body.email) ||
        !isShortString(body.password, 200) ||
        !isAccountRole(body.role)
      ) {
        return json({ error: "Invalid account request." }, 400);
      }
      return json({
        state: accounts.createAccount(actor, {
          email: body.email,
          password: body.password,
          role: body.role,
          reason: optionalReason(body.reason)
        })
      }, 201);
    }

    const match = url.pathname.match(
      /^\/v1\/admin\/accounts\/([^/]+)(?:\/(inventory|entitlements|disable|password|role))?$/
    );
    if (!match) {
      return json({ error: "Not found." }, 404);
    }
    const accountId = decodeURIComponent(match[1] ?? "");
    const action = match[2];
    if (request.method === "GET" && !action) {
      const state = accounts.getAccountState(accountId);
      return state ? json(state) : json({ error: "Account not found." }, 404);
    }
    if (request.method !== "POST" || !action) {
      return json({ error: "Not found." }, 404);
    }

    const body = await readJson(request);
    if (action === "inventory") {
      const delta = parseInventoryDelta(body.delta);
      if (!delta) {
        return json({ error: "Invalid inventory adjustment." }, 400);
      }
      return json({
        state: accounts.adjustInventory(
          actor,
          accountId,
          delta,
          optionalReason(body.reason)
        )
      });
    }
    if (action === "entitlements") {
      if (
        body.removeAds !== undefined &&
        typeof body.removeAds !== "boolean"
      ) {
        return json({ error: "Invalid entitlement request." }, 400);
      }
      if (
        body.vaultPassExpiresAt !== undefined &&
        body.vaultPassExpiresAt !== null &&
        !isIsoDate(body.vaultPassExpiresAt)
      ) {
        return json({ error: "Invalid VaultPass expiration." }, 400);
      }
      return json({
        state: accounts.setEntitlements(actor, accountId, {
          removeAds: body.removeAds,
          vaultPassExpiresAt: body.vaultPassExpiresAt,
          reason: optionalReason(body.reason)
        })
      });
    }
    if (action === "disable") {
      return json({
        state: accounts.disableAccount(actor, accountId, optionalReason(body.reason))
      });
    }
    if (action === "password") {
      if (!isShortString(body.password, 200)) {
        return json({ error: "Invalid password request." }, 400);
      }
      return json({
        state: accounts.resetPassword(
          actor,
          accountId,
          body.password,
          optionalReason(body.reason)
        )
      });
    }
    if (action === "role") {
      if (!isAccountRole(body.role)) {
        return json({ error: "Invalid role request." }, 400);
      }
      return json({
        state: accounts.changeRole(
          actor,
          accountId,
          body.role,
          optionalReason(body.reason)
        )
      });
    }
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Admin operation failed." },
      422
    );
  }
  return json({ error: "Not found." }, 404);
}

async function readJson(request: Request): Promise<Record<string, any>> {
  try {
    return (await request.json()) as Record<string, any>;
  } catch {
    return {};
  }
}

function isShortString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isEmail(value: unknown): value is string {
  return (
    isShortString(value, 320) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;
}

function authenticatedAccount(
  request: Request,
  accounts: AccountStore
): PublicAccount | null {
  const token = bearerToken(request);
  return token ? accounts.authenticate(token) : null;
}

function isAccountRole(value: unknown): value is AccountRole {
  return value === "player" || value === "reviewer" || value === "admin";
}

function optionalReason(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 500)
    : undefined;
}

function parseInventoryDelta(
  value: unknown
): Partial<
  Pick<LedgerBalance, "vaultCoins" | "bonusLives" | "chainBoosts" | "vaultBursts">
> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const result: Record<string, number> = {};
  for (const key of ["vaultCoins", "bonusLives", "chainBoosts", "vaultBursts"]) {
    const amount = record[key] ?? 0;
    if (
      typeof amount !== "number" ||
      !Number.isInteger(amount) ||
      Math.abs(amount) > 1_000_000
    ) {
      return null;
    }
    result[key] = amount;
  }
  return result;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(new Date(value).getTime());
}

function registrationKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor ?? "unknown";
}

function registrationBlocked(key: string, now = Date.now()): boolean {
  const attempt = registrationAttempts.get(key);
  if (!attempt) {
    return false;
  }
  if (attempt.resetAt <= now) {
    registrationAttempts.delete(key);
    return false;
  }
  return attempt.count >= 5;
}

function recordRegistrationAttempt(key: string, now = Date.now()): void {
  const current = registrationAttempts.get(key);
  registrationAttempts.set(key, {
    count: current && current.resetAt > now ? current.count + 1 : 1,
    resetAt: current && current.resetAt > now ? current.resetAt : now + 60 * 60 * 1_000
  });
}

function loginAttemptKey(request: Request, email: string): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${forwardedFor ?? "unknown"}:${email.trim().toLowerCase()}`;
}

function loginBlocked(key: string, now = Date.now()): boolean {
  const attempt = loginAttempts.get(key);
  if (!attempt) {
    return false;
  }
  if (attempt.resetAt <= now) {
    loginAttempts.delete(key);
    return false;
  }
  return attempt.count >= 5;
}

function recordLoginFailure(key: string, now = Date.now()): void {
  const current = loginAttempts.get(key);
  loginAttempts.set(key, {
    count: current && current.resetAt > now ? current.count + 1 : 1,
    resetAt: current && current.resetAt > now ? current.resetAt : now + 15 * 60 * 1_000
  });
}

function json(body: object, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json"
    }
  });
}

function html(title: string, body: string): Response {
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{background:#070A12;color:#F8FBFF;font:17px/1.6 system-ui;max-width:720px;margin:auto;padding:48px 24px}h1{color:#F6C65B}p{color:#AAB6CE}</style><h1>${title}</h1><p>${body}</p>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300"
      }
    }
  );
}
