import { randomBytes } from "node:crypto";
import { accessSync, constants as fsConstants } from "node:fs";
import { dirname } from "node:path";

import { ADMOB_IOS, REWARDED_DAILY_CAP } from "../src/ads/constants";
import { getProductDefinition } from "../src/monetization/catalog";
import { FAQ_CATEGORIES } from "../src/support/faq-data";
import { adminPage } from "./admin-page";
import { grantForTransaction } from "./grants";
import { renderPrivacyPage, renderTermsPage } from "./legal-pages";
import type { LeaderboardStore } from "./leaderboard-store";
import type { OpsStore } from "./ops-store";
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
const passwordResetAttempts = new Map<string, { count: number; resetAt: number }>();
const LEADERBOARD_MODES = new Set(["classic", "dailyVault", "streak", "blitz"]);
const AD_EVENT_KINDS = new Set(["granted", "failed"]);
const AD_REWARD_TYPES = new Set(["bonus_life", "vault_coins"]);

/**
 * The bootstrap owner email (env-configured, case-insensitive). The owner
 * account can never be demoted or disabled through the admin API, so admin
 * access cannot regress even by accident.
 */
function ownerEmail(): string {
  return (process.env.VAULTPOP_ADMIN_EMAIL ?? "mbfalagario@gmail.com")
    .trim()
    .toLowerCase();
}

function isProtectedOwnerAccount(accounts: AccountStore, accountId: string): boolean {
  const state = accounts.getAccountState(accountId);
  return state?.account.email.trim().toLowerCase() === ownerEmail();
}

/**
 * Short-lived single-use admin handoff codes. The app exchanges its
 * authenticated session for a code; the in-app WebView then loads
 * GET /admin/handoff?code=... which consumes the code and sets a secure
 * HttpOnly admin session cookie for /admin. Raw session tokens never appear
 * in URLs, and codes expire after 60 seconds.
 */
const ADMIN_HANDOFF_TTL_MS = 60_000;
const adminHandoffCodes = new Map<string, { token: string; expiresAt: number }>();

const ADMIN_COOKIE_NAME = "vp_admin";
const ADMIN_COOKIE_CLEAR = `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export function createApiHandler(dependencies: {
  verifier: PurchaseVerifier;
  ledger: LedgerStore;
  accounts: AccountStore;
  leaderboard: LeaderboardStore;
  rewards: RewardEventStore;
  ssvKeys: SsvKeyProvider;
  ops: OpsStore;
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
      return htmlPage(renderPrivacyPage());
    }
    if (request.method === "GET" && url.pathname === "/terms") {
      return htmlPage(renderTermsPage());
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
      return handleSsvCallback(
        url,
        dependencies.ssvKeys,
        dependencies.rewards,
        request.headers.get("x-vaultpop-raw-query") ?? undefined
      );
    }
    if (request.method === "GET" && url.pathname === "/support") {
      // Dual behavior: if AdMob still targets /support as its SSV callback,
      // detect the SSV parameters and process the callback safely. Normal
      // browser visits always receive the polished public support page.
      if (isSsvCallback(url)) {
        return handleSsvCallback(
          url,
          dependencies.ssvKeys,
          dependencies.rewards,
          request.headers.get("x-vaultpop-raw-query") ?? undefined
        );
      }
      return new Response(renderSupportPage(), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300"
        }
      });
    }
    if (request.method === "GET" && url.pathname === "/admin/handoff") {
      // Consumes a single-use handoff code and starts a cookie-backed admin
      // session for the /admin console. Fail-closed: invalid, expired, or
      // reused codes redirect to the normal /admin login with no cookie.
      const code = url.searchParams.get("code") ?? "";
      const entry = adminHandoffCodes.get(code);
      if (entry) {
        adminHandoffCodes.delete(code);
      }
      const account =
        entry && entry.expiresAt > Date.now()
          ? dependencies.accounts.authenticate(entry.token)
          : null;
      const headers = new Headers({
        Location: "/admin",
        "Cache-Control": "no-store"
      });
      if (account && account.active && account.role === "admin") {
        headers.set(
          "Set-Cookie",
          `${ADMIN_COOKIE_NAME}=${entry!.token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`
        );
      }
      return new Response(null, { status: 303, headers });
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
      const token = sessionTokenFromRequest(request);
      if (token) {
        dependencies.accounts.revokeSession(token);
      }
      return json({ signedOut: true }, 200, { "Set-Cookie": ADMIN_COOKIE_CLEAR });
    }

    if (request.method === "POST" && url.pathname === "/v1/auth/password-reset") {
      const body = await readJson(request);
      if (!isEmail(body.email)) {
        return json({ error: "Enter a valid email address." }, 400);
      }
      // Never reveal whether an account exists; rate-limited per IP.
      const attemptKey = registrationKey(request);
      if (resetBlocked(attemptKey)) {
        return json({ error: "Too many reset requests. Please try again later." }, 429);
      }
      recordResetAttempt(attemptKey);
      const email = body.email.trim().toLowerCase();
      const exists = dependencies.accounts
        .listAccounts({ query: email })
        .some((state) => state.account.email === email);
      if (exists) {
        dependencies.ops.createPasswordResetRequest(email);
      }
      return json({
        accepted: true,
        message:
          "If an account exists for this email, a reset request has been received. Support will follow up."
      });
    }

    if (request.method === "GET" && url.pathname === "/v1/account") {
      const account = authenticatedAccount(request, dependencies.accounts);
      if (!account) {
        return json({ error: "Authentication required." }, 401);
      }
      return json({ state: dependencies.accounts.getAccountState(account.id) });
    }

    if (request.method === "POST" && url.pathname === "/v1/account/delete") {
      // Self-service permanent account deletion (Apple Guideline 5.1.1(v)).
      // Requires a valid session PLUS fresh reauthentication (the account
      // password) and an explicit typed confirmation. There is no target
      // parameter: users can only ever delete the account their session
      // belongs to, so horizontal deletion is impossible by construction.
      const account = authenticatedAccount(request, dependencies.accounts);
      if (!account) {
        return json({ error: "Authentication required." }, 401);
      }
      const body = await readJson(request);
      if (body.confirm !== "DELETE") {
        return json({ error: "Type DELETE to confirm account deletion." }, 400);
      }
      if (!isShortString(body.password, 200)) {
        return json({ error: "Enter your password to confirm deletion." }, 400);
      }
      if (isProtectedOwnerAccount(dependencies.accounts, account.id)) {
        return json({ error: "The owner account cannot be deleted from the app." }, 400);
      }
      // Reauthentication failures share the sign-in brute-force limiter.
      const attemptKey = loginAttemptKey(request, account.email);
      if (loginBlocked(attemptKey)) {
        return json({ error: "Too many attempts. Try again later." }, 429);
      }
      if (!dependencies.accounts.verifyAccountPassword(account.id, body.password)) {
        recordLoginFailure(attemptKey);
        return json({ error: "Password is incorrect." }, 403);
      }
      loginAttempts.delete(attemptKey);
      const { linkedInstallId } = dependencies.accounts.deleteAccount(account.id);
      dependencies.ops.purgeAccountData(linkedInstallId, account.email);
      if (linkedInstallId) {
        dependencies.ledger.deleteInstallData(linkedInstallId);
        dependencies.leaderboard.deleteInstallData(linkedInstallId);
      }
      return json({ deleted: true }, 200, { "Set-Cookie": ADMIN_COOKIE_CLEAR });
    }

    if (url.pathname.startsWith("/v1/admin/")) {
      return handleAdminRequest(request, url, dependencies.accounts, dependencies.ops);
    }

    if (request.method === "POST" && url.pathname === "/v1/ads/events") {
      // Analytics-only event from the app (rewarded ad watched or failed).
      // Grants NOTHING — reward grants remain SSV/local-economy controlled.
      const body = await readJson(request);
      if (
        !isShortString(body.installId, 200) ||
        (body.installId as string).length < 4 ||
        !AD_EVENT_KINDS.has(body.event) ||
        !AD_REWARD_TYPES.has(body.rewardType)
      ) {
        return json({ error: "Invalid ad event." }, 400);
      }
      dependencies.ops.recordAdEvent({
        installId: body.installId,
        event: body.event,
        rewardType: body.rewardType
      });
      return json({ recorded: true }, 202);
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
        if (applied.firstGrant) {
          dependencies.ops.recordPurchase({
            transactionId: transaction.transactionId,
            productId: transaction.productId
          });
        }
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
      const ticketId = dependencies.ops.createTicket({
        installId: body.installId,
        category: body.category,
        message: body.message.trim(),
        email: body.email?.trim() || undefined,
        appVersion: body.appVersion,
        buildNumber: body.buildNumber,
        deviceInfo: body.deviceInfo,
        priority,
        escalated: body.escalated === true
      });
      return json({ ticketId }, 201);
    }

    return json({ error: "Not found." }, 404);
  };
}

async function handleAdminRequest(
  request: Request,
  url: URL,
  accounts: AccountStore,
  ops: OpsStore
): Promise<Response> {
  const actor = authenticatedAccount(request, accounts);
  if (!actor || actor.role !== "admin") {
    return json({ error: "Admin authorization required." }, 403);
  }

  try {
    if (request.method === "POST" && url.pathname === "/v1/admin/handoff") {
      const token = sessionTokenFromRequest(request);
      if (!token) {
        return json({ error: "Admin authorization required." }, 403);
      }
      const now = Date.now();
      for (const [key, value] of adminHandoffCodes) {
        if (value.expiresAt <= now) {
          adminHandoffCodes.delete(key);
        }
      }
      const code = randomBytes(32).toString("base64url");
      adminHandoffCodes.set(code, { token, expiresAt: now + ADMIN_HANDOFF_TTL_MS });
      return json({ code, expiresInSeconds: ADMIN_HANDOFF_TTL_MS / 1_000 }, 201);
    }

    if (request.method === "GET" && url.pathname === "/v1/admin/diagnostics") {
      let database: "ok" | "error" = "ok";
      try {
        // Exercises a real store read; returns null harmlessly when healthy.
        accounts.authenticate("vp-diagnostics-probe");
      } catch {
        database = "error";
      }
      let storage: "ok" | "error" = "ok";
      try {
        const dbPath = process.env.VAULTPOP_DATABASE_PATH;
        accessSync(dbPath ? dirname(dbPath) : ".", fsConstants.W_OK);
      } catch {
        storage = "error";
      }
      return json({
        api: "ok",
        adminApi: "ok",
        database,
        storage,
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
      });
    }

    if (request.method === "GET" && url.pathname === "/v1/admin/analytics") {
      const now = new Date();
      const purchases = ops.purchaseAnalytics(now);
      const premium = ops.premiumCounts(now);
      return json({
        ads: {
          ...ops.adsAnalytics(now),
          dailyCap: REWARDED_DAILY_CAP,
          ssvUrl: "https://vaultpop-api.fly.dev/support",
          adUnits: {
            bonusLife: ADMOB_IOS.rewarded,
            vaultCoins: ADMOB_IOS.rewardedCoins
          }
        },
        purchases: {
          ...purchases,
          activeVaultPass: premium.vaultPass,
          removeAdsUsers: premium.removeAds,
          estimatedGrossUsd: estimatedGrossUsd(purchases.productCounts),
          revenueNote: "Estimated gross based on configured product prices."
        },
        support: {
          ...ops.supportStats(),
          assistant: "on-device",
          categoriesCovered: FAQ_CATEGORIES
        },
        passwordResets: { pending: ops.countPendingPasswordResets() }
      });
    }

    if (request.method === "GET" && url.pathname === "/v1/admin/support/tickets") {
      const filterValue = url.searchParams.get("status");
      const filter =
        filterValue === "open" ||
        filterValue === "closed" ||
        filterValue === "escalated" ||
        filterValue === "premium" ||
        filterValue === "standard"
          ? filterValue
          : undefined;
      return json({ tickets: ops.listTickets(filter) });
    }

    const ticketMatch = url.pathname.match(
      /^\/v1\/admin\/support\/tickets\/([^/]+)(?:\/(reply|status))?$/
    );
    if (ticketMatch) {
      const ticketId = decodeURIComponent(ticketMatch[1] ?? "");
      const ticketAction = ticketMatch[2];
      if (request.method === "GET" && !ticketAction) {
        const ticket = ops.getTicket(ticketId);
        return ticket ? json({ ticket }) : json({ error: "Ticket not found." }, 404);
      }
      if (request.method === "POST" && ticketAction === "reply") {
        const body = await readJson(request);
        if (!isShortString(body.message, 2_000)) {
          return json({ error: "Reply must be 1-2,000 characters." }, 400);
        }
        const ticket = ops.addReply(ticketId, "admin", body.message.trim());
        ops.logAdminAction(actor, "support.reply", ticketId);
        return json({ ticket });
      }
      if (request.method === "POST" && ticketAction === "status") {
        const body = await readJson(request);
        if (body.status !== "open" && body.status !== "closed") {
          return json({ error: "Status must be open or closed." }, 400);
        }
        const ticket = ops.setTicketStatus(ticketId, body.status);
        ops.logAdminAction(
          actor,
          `support.${body.status === "closed" ? "close" : "reopen"}`,
          ticketId
        );
        return json({ ticket });
      }
      return json({ error: "Not found." }, 404);
    }

    if (request.method === "GET" && url.pathname === "/v1/admin/password-resets") {
      return json({ requests: ops.listPasswordResetRequests() });
    }

    const resetMatch = url.pathname.match(
      /^\/v1\/admin\/password-resets\/([^/]+)\/handled$/
    );
    if (resetMatch && request.method === "POST") {
      const requestId = decodeURIComponent(resetMatch[1] ?? "");
      const handled = ops.markPasswordResetHandled(requestId, actor.email);
      ops.logAdminAction(actor, "password.reset.handled", handled.email);
      return json({ request: handled });
    }

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
      /^\/v1\/admin\/accounts\/([^/]+)(?:\/(inventory|entitlements|disable|enable|password|role))?$/
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
      if (isProtectedOwnerAccount(accounts, accountId)) {
        return json({ error: "The owner account cannot be disabled." }, 400);
      }
      return json({
        state: accounts.disableAccount(actor, accountId, optionalReason(body.reason))
      });
    }
    if (action === "enable") {
      return json({
        state: accounts.enableAccount(actor, accountId, optionalReason(body.reason))
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
      if (body.role !== "admin" && isProtectedOwnerAccount(accounts, accountId)) {
        return json({ error: "The owner account role is protected and stays admin." }, 400);
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

/**
 * Session token from the Authorization header, or — for the browser-based
 * /admin console — from the secure HttpOnly admin session cookie set by the
 * single-use handoff flow. SameSite=Lax protects cookie-authenticated POSTs.
 */
function sessionTokenFromRequest(request: Request): string | null {
  const bearer = bearerToken(request);
  if (bearer) {
    return bearer;
  }
  const cookies = request.headers.get("cookie") ?? "";
  const match = cookies.match(/(?:^|;\s*)vp_admin=([^;\s]+)/);
  return match ? match[1] : null;
}

function authenticatedAccount(
  request: Request,
  accounts: AccountStore
): PublicAccount | null {
  const token = sessionTokenFromRequest(request);
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

function json(
  body: object,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
      ...extraHeaders
    }
  });
}

function htmlPage(markup: string): Response {
  return new Response(markup, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  });
}

function resetBlocked(key: string, now = Date.now()): boolean {
  const attempt = passwordResetAttempts.get(key);
  if (!attempt) {
    return false;
  }
  if (attempt.resetAt <= now) {
    passwordResetAttempts.delete(key);
    return false;
  }
  return attempt.count >= 5;
}

function recordResetAttempt(key: string, now = Date.now()): void {
  const current = passwordResetAttempts.get(key);
  passwordResetAttempts.set(key, {
    count: current && current.resetAt > now ? current.count + 1 : 1,
    resetAt: current && current.resetAt > now ? current.resetAt : now + 60 * 60 * 1_000
  });
}

function estimatedGrossUsd(productCounts: Record<string, number>): number {
  let total = 0;
  for (const [productId, count] of Object.entries(productCounts)) {
    const definition = getProductDefinition(productId);
    const price = definition
      ? Number(/([0-9]+\.[0-9]{2})/.exec(definition.basePriceUsd)?.[1] ?? 0)
      : 0;
    total += price * count;
  }
  return Math.round(total * 100) / 100;
}

