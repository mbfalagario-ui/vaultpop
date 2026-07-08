export type KitApiOptions = {
    apiKey: string;
    baseUrl?: string;
    fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
};
export type KitSubscription = {
    id: string;
    productId: string;
    platform: "IOS" | "Android";
    state: string;
    expiresAt?: number;
    renewsAt?: number;
    willRenew?: boolean;
    cancellationReason?: string;
    currency?: string;
    priceAmountMicros?: number;
    startedAt: number;
    updatedAt: number;
    purchaseToken: string;
    userId?: string;
};
export type EntitlementsResponse = {
    userId: string;
    productIds: string[];
    subscriptions: KitSubscription[];
};
export type StatusResponse = {
    active: boolean;
    subscription: KitSubscription | null;
};
export declare class KitApiError extends Error {
    readonly status: number;
    readonly body: unknown;
    constructor(status: number, body: unknown, message: string);
}
export declare function kitApi(options: KitApiOptions): {
    apiKey: string;
    baseUrl: string;
    /** GET /v1/subscriptions/status — the `active` boolean is the
     * fastest gate for "is this user paying?". */
    status: (userId: string) => Promise<StatusResponse>;
    /** GET /v1/subscriptions/entitlements — every productId the user
     * is entitled to. Use this when feature gating depends on which
     * specific tier the user owns. */
    entitlements: (userId: string) => Promise<EntitlementsResponse>;
    /** POST /v1/subscriptions/bind-user — call after a successful
     * verifyReceipt so kit knows which userId owns the verified
     * `purchaseToken`. Idempotent. */
    bindUser: (purchaseToken: string, userId: string) => Promise<{
        ok: boolean;
        bound: boolean;
    }>;
};
//# sourceMappingURL=kit-api.d.ts.map