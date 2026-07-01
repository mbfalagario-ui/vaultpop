import { getProductDefinition } from "../src/monetization/catalog";
import { grantForTransaction } from "./grants";
import type { LedgerStore, PurchaseVerifier } from "./types";

const SUPPORT_CATEGORIES = new Set([
  "Purchase issue",
  "Ads issue",
  "Gameplay issue",
  "Bug report",
  "Privacy request",
  "Other"
]);

export function createApiHandler(dependencies: {
  verifier: PurchaseVerifier;
  ledger: LedgerStore;
}) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ status: "ok" });
    }
    if (request.method === "GET" && url.pathname === "/privacy") {
      return html(
        "VaultPop Privacy",
        "VaultPop stores game progress on your device. Apple processes purchases. Google AdMob serves contextual ads by default. Purchase verification uses an anonymous install ID and Apple-signed transaction data. Private support requests may include a category, message, optional email, anonymous install ID, app and build version, device model, and priority-routing status. VaultPop does not request App Tracking Transparency or access IDFA."
      );
    }
    if (request.method === "GET" && url.pathname === "/support") {
      return html(
        "VaultPop Support",
        "Open Support inside VaultPop to send a private request. Choose a category, describe the issue, and optionally include an email address for a reply."
      );
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
      const priority = Boolean(
        balance.vaultPassExpiresAt &&
          new Date(balance.vaultPassExpiresAt).getTime() > Date.now()
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
