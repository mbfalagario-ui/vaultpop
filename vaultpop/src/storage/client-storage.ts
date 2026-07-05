import { useSyncExternalStore } from "react";

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();
const valueCache = new Map<string, unknown>();
let persistentStorage = resolvePersistentStorage();
let initialization: Promise<boolean> | null = null;

function emit(key: string): void {
  listeners.get(key)?.forEach((listener) => listener());
}

export const clientStorage = {
  get<T>(key: string, defaultValue: T): T {
    if (valueCache.has(key)) {
      return valueCache.get(key) as T;
    }
    try {
      const rawValue = persistentStorage?.getItem(key);
      if (!rawValue) {
        return defaultValue;
      }
      const parsedValue = JSON.parse(rawValue) as T;
      valueCache.set(key, parsedValue);
      return parsedValue;
    } catch {
      return defaultValue;
    }
  },

  has(key: string): boolean {
    if (valueCache.has(key)) {
      return true;
    }
    if (!persistentStorage) {
      return false;
    }
    try {
      return persistentStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  },

  set<T>(key: string, value: T): void {
    valueCache.set(key, value);
    try {
      persistentStorage?.setItem(key, JSON.stringify(value));
    } catch {
      // The in-memory cache keeps gameplay usable if device storage is unavailable.
    }
    emit(key);
  },

  subscribe(key: string, listener: Listener): () => void {
    if (!listeners.has(key)) {
      listeners.set(key, new Set());
    }
    listeners.get(key)?.add(listener);
    return () => {
      listeners.get(key)?.delete(listener);
    };
  }
};

export function initializePersistentStorage(): Promise<boolean> {
  if (persistentStorage) {
    return Promise.resolve(true);
  }
  if (initialization) {
    return initialization;
  }

  initialization = import("expo-sqlite/localStorage/install")
    .then(() => {
      persistentStorage = resolvePersistentStorage();
      if (!persistentStorage) {
        return false;
      }

      for (const [key, cachedValue] of valueCache) {
        const storedValue = persistentStorage.getItem(key);
        if (storedValue === null) {
          persistentStorage.setItem(key, JSON.stringify(cachedValue));
          continue;
        }
        try {
          valueCache.set(key, JSON.parse(storedValue) as unknown);
          emit(key);
        } catch {
          persistentStorage.setItem(key, JSON.stringify(cachedValue));
        }
      }
      return true;
    })
    .catch((error: unknown) => {
      console.warn("VaultPop persistent storage is unavailable; using session storage.", error);
      return false;
    });

  return initialization;
}

export function useStoredValue<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const value = useSyncExternalStore(
    (callback) => clientStorage.subscribe(key, callback),
    () => clientStorage.get(key, defaultValue),
    () => defaultValue
  );

  return [value, (nextValue: T) => clientStorage.set(key, nextValue)];
}

function resolvePersistentStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
