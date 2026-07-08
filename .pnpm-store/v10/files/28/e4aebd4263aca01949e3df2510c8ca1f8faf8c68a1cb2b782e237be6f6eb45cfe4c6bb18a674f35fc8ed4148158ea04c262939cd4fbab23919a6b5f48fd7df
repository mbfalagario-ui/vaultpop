export type WebhookEventType = "SubscriptionStarted" | "SubscriptionRenewed" | "SubscriptionExpired" | "SubscriptionInGracePeriod" | "SubscriptionInBillingRetry" | "SubscriptionRecovered" | "SubscriptionCanceled" | "SubscriptionUncanceled" | "SubscriptionRevoked" | "SubscriptionPriceChange" | "SubscriptionProductChanged" | "SubscriptionPaused" | "SubscriptionResumed" | "PurchaseRefunded" | "PurchaseConsumptionRequest" | "TestNotification";
export declare const WEBHOOK_EVENT_TYPES: readonly ["SubscriptionStarted", "SubscriptionRenewed", "SubscriptionExpired", "SubscriptionInGracePeriod", "SubscriptionInBillingRetry", "SubscriptionRecovered", "SubscriptionCanceled", "SubscriptionUncanceled", "SubscriptionRevoked", "SubscriptionPriceChange", "SubscriptionProductChanged", "SubscriptionPaused", "SubscriptionResumed", "PurchaseRefunded", "PurchaseConsumptionRequest", "TestNotification"];
export type WebhookEventPayload = {
    id: string;
    type: WebhookEventType;
    source: string;
    platform: "IOS" | "Android";
    environment: "Production" | "Sandbox" | "Xcode";
    projectId: string;
    occurredAt: number;
    receivedAt: number;
    purchaseToken?: string;
    productId?: string;
    subscriptionState?: string;
    expiresAt?: number;
    renewsAt?: number;
    cancellationReason?: string;
    currency?: string;
    priceAmountMicros?: number;
    rawSignedPayload?: string;
};
export type WebhookListenerOptions = {
    /**
     * Project API key. Embedded in the URL path because Apple ASN
     * registration cannot send custom headers; the same path is reused
     * here for symmetry.
     */
    apiKey: string;
    /**
     * Override the kit base URL. Defaults to https://kit.openiap.dev.
     * In tests, point this at a local server.
     */
    baseUrl?: string;
    /** Called on every successfully-parsed webhook event. */
    onEvent: (event: WebhookEventPayload) => void;
    /**
     * Called on transport errors. The connection auto-reconnects
     * unconditionally; this callback exists for telemetry / surfacing
     * to the host UI.
     */
    onError?: (error: WebhookListenerError) => void;
    /**
     * Optional injection of an EventSource constructor. Lets RN /
     * Expo plug in `react-native-event-source` when running on a JS
     * runtime that lacks the global, or vitest plug in a stub.
     */
    eventSourceFactory?: (url: string, headers: Record<string, string>) => WebhookEventStream;
};
export interface WebhookEventStream {
    close(): void;
    onmessage: ((event: {
        data: string;
        lastEventId?: string;
    }) => void) | null;
    onerror: ((error: unknown) => void) | null;
    addEventListener?: (type: string, listener: (event: {
        data: string;
        lastEventId?: string;
    }) => void) => void;
}
export type WebhookListener = {
    /** Tear down the connection and stop receiving events. */
    close(): void;
};
export type WebhookListenerError = {
    code: "TRANSPORT_ERROR" | "PARSE_ERROR" | "MALFORMED_EVENT" | "NO_EVENTSOURCE";
    message: string;
    cause?: unknown;
};
export declare function connectWebhookStream(options: WebhookListenerOptions): WebhookListener;
export type ParsedEventResult = {
    kind: "ok";
    event: WebhookEventPayload;
} | {
    kind: "skip";
    reason: "heartbeat" | "stream-control";
} | {
    kind: "error";
    message: string;
};
export declare function parseWebhookEventData(raw: string): ParsedEventResult;
//# sourceMappingURL=webhook-client.d.ts.map