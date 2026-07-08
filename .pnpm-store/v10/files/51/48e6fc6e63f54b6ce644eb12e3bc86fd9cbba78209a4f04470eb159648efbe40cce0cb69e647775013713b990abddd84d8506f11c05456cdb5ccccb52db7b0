import { type WebhookEventPayload, type WebhookEventStream, type WebhookListenerError } from '../webhook-client';
export type UseWebhookEventsOptions = {
    /**
     * kit project API key — same value used for receipt verification.
     * Must be non-empty to start the stream; pass `null`/`undefined` to
     * disable the listener (e.g. before the user is logged in).
     */
    apiKey: string | null | undefined;
    /**
     * Override the kit base URL. Defaults to https://kit.openiap.dev.
     */
    baseUrl?: string;
    /**
     * Optional EventSource factory. Required on React Native because RN
     * does not ship a global EventSource — pass an instance from
     * `react-native-sse` (or any compatible polyfill).
     */
    eventSourceFactory?: (url: string, headers: Record<string, string>) => WebhookEventStream;
    /**
     * Maximum number of events to retain in the in-memory ring buffer
     * surfaced as `events`. Older entries are discarded. Defaults to 50.
     * Set 0 to opt out of the buffer entirely (consume only via
     * `onEvent`).
     */
    bufferSize?: number;
    /**
     * Called for every received event in addition to being appended to
     * the buffer. Useful for side effects (toast, analytics, granting
     * entitlement). Called with the latest stable callback identity.
     */
    onEvent?: (event: WebhookEventPayload) => void;
    /**
     * Called when the stream surfaces a transport / parse error.
     * EventSource auto-reconnects regardless of this hook — this is
     * primarily for telemetry + UI surfacing.
     */
    onError?: (error: WebhookListenerError) => void;
};
export type UseWebhookEventsResult = {
    /** Most recent N events (most-recent-first). Capped at bufferSize. */
    events: WebhookEventPayload[];
    /** Last error reported by the underlying stream. Null when healthy. */
    lastError: WebhookListenerError | null;
    /**
     * True once the first webhook event has been received from the
     * stream. Remains false if the connection is open but idle (the
     * underlying SSE bridge doesn't surface a "stream opened"
     * lifecycle event we can hook into; isConnected is therefore an
     * activity indicator, not a raw socket-state flag). Reset to
     * false on cleanup / apiKey change.
     */
    isConnected: boolean;
};
export declare function useWebhookEvents({ apiKey, baseUrl, eventSourceFactory, bufferSize, onEvent, onError, }: UseWebhookEventsOptions): UseWebhookEventsResult;
//# sourceMappingURL=useWebhookEvents.d.ts.map