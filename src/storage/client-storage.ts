import "expo-sqlite/localStorage/install";

import { useSyncExternalStore } from "react";

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();

function emit(key: string): void {
  listeners.get(key)?.forEach((listener) => listener());
}

export const clientStorage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const rawValue = localStorage.getItem(key);
      return rawValue ? (JSON.parse(rawValue) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
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

export function useStoredValue<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const value = useSyncExternalStore(
    (callback) => clientStorage.subscribe(key, callback),
    () => clientStorage.get(key, defaultValue),
    () => defaultValue
  );

  return [value, (nextValue: T) => clientStorage.set(key, nextValue)];
}

