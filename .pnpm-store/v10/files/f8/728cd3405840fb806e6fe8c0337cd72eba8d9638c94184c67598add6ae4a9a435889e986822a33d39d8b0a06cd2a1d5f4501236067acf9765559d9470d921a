"use strict";

import { useEffect, useRef, useState } from 'react';
import { connectWebhookStream } from "../webhook-client.js";
// React hook wrapping the SSE webhook stream. Lifecycle:
//   - opens on mount (once `apiKey` is non-empty),
//   - closes on unmount,
//   - reconnects automatically when EventSource raises a transport
//     error (the underlying client auto-reconnects via the EventSource
//     spec; this hook just surfaces the error and re-renders).
//
// Why a hook: openiap's UX guidance is that consumers consume webhook
// events from React state (granting entitlement, refreshing the
// subscription view) rather than via an imperative listener. The
// hook's `events` buffer + `onEvent` callback cover both styles.
export function useWebhookEvents({
  apiKey,
  baseUrl,
  eventSourceFactory,
  bufferSize = 50,
  onEvent,
  onError
}) {
  const [events, setEvents] = useState([]);
  const [lastError, setLastError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Stash callbacks in refs so reconnects don't fire on every render.
  // The underlying SSE connection should only restart when `apiKey` /
  // `baseUrl` change. `eventSourceFactory` is held in a ref too so
  // anonymous-function callers don't tear down the connection every
  // render (a common React pitfall — was previously documented as a
  // caller-side constraint, now enforced by the hook). `bufferSize`
  // is also a ref so adjusting the buffer cap from the host component
  // doesn't tear down the stream and lose in-flight events.
  const onEventRef = useRef(onEvent);
  const onErrorRef = useRef(onError);
  const eventSourceFactoryRef = useRef(eventSourceFactory);
  const bufferSizeRef = useRef(bufferSize);
  onEventRef.current = onEvent;
  onErrorRef.current = onError;
  eventSourceFactoryRef.current = eventSourceFactory;
  bufferSizeRef.current = bufferSize;

  // Trim the visible buffer immediately when bufferSize is lowered
  // mid-stream. The ref-based update would otherwise only take
  // effect on the next event.
  useEffect(() => {
    setEvents(prev => bufferSize > 0 ? prev.slice(0, bufferSize) : []);
  }, [bufferSize]);
  useEffect(() => {
    // Fresh stream → fresh state. Resetting events + lastError on
    // (re)connect prevents a stale payload from the previous
    // apiKey/baseUrl from briefly leaking into the new context.
    setEvents([]);
    setLastError(null);
    if (!apiKey) {
      return;
    }
    let listener = null;
    let mounted = true;
    try {
      listener = connectWebhookStream({
        apiKey,
        baseUrl,
        eventSourceFactory: eventSourceFactoryRef.current,
        onEvent: event => {
          if (!mounted) {
            return;
          }
          setIsConnected(true);
          const cap = bufferSizeRef.current;
          if (cap > 0) {
            setEvents(prev => [event, ...prev].slice(0, cap));
          }
          onEventRef.current?.(event);
        },
        onError: error => {
          if (!mounted) {
            return;
          }
          setLastError(error);
          onErrorRef.current?.(error);
        }
      });
    } catch (error) {
      const wrapped = {
        code: 'TRANSPORT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to open webhook stream',
        cause: error
      };
      setLastError(wrapped);
      onErrorRef.current?.(wrapped);
    }
    return () => {
      mounted = false;
      listener?.close();
      setIsConnected(false);
    };
    // `eventSourceFactory` deliberately omitted from deps — held in a
    // ref above so anonymous-function callers don't trigger reconnects
    // on every render. The connection is only re-opened when apiKey or
    // baseUrl changes; a runtime factory swap is picked up on that
    // next reconnect via the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, baseUrl]);
  return {
    events,
    lastError,
    isConnected
  };
}
//# sourceMappingURL=useWebhookEvents.js.map