import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StorageEntry<T> {
  v: T; // value
  t?: number; // timestamp (ms) when written
}

export interface UseLocalStorageStateOptions<T> {
  ttl?: number; // ms until expiry; omit = never
  encrypt?: (raw: string) => string; // custom serializer / obfuscator
  decrypt?: (raw: string) => string; // custom deserializer / deobfuscator
  serializer?: {
    stringify: (v: T) => string;
    parse: (s: string) => T;
  };
}

export type SetValue<T> = (v: T | ((prev: T) => T)) => void;

// ─── Lightweight built-in obfuscation (Base64) ────────────────────────────────

const b64e = (s: string): string => {
  try {
    return btoa(unescape(encodeURIComponent(s)));
  } catch {
    return s;
  }
};
const b64d = (s: string): string => {
  try {
    return decodeURIComponent(escape(atob(s)));
  } catch {
    return s;
  }
};

// ─── SSR-safe localStorage helpers ───────────────────────────────────────────

const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof localStorage !== 'undefined';

function lsRead(key: string): string | null {
  try {
    return isBrowser() ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function lsWrite(key: string, value: string): void {
  try {
    if (isBrowser()) localStorage.setItem(key, value);
  } catch (e) {
    // QuotaExceededError — fail silently; state is still accurate in-memory
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[useLocalStorageState] write failed:', e);
    }
  }
}

function lsDelete(key: string): void {
  try {
    if (isBrowser()) localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

// ─── Core hook ───────────────────────────────────────────────────────────────

export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageStateOptions<T> = {}
): [T, SetValue<T>, () => void] {
  const { ttl, encrypt, decrypt, serializer } = options;

  // Determine encode / decode pipeline once
  const encode = encrypt ?? (encrypt === null ? undefined : b64e);
  const decode = decrypt ?? (decrypt === null ? undefined : b64d);
  const stringify = serializer?.stringify ?? JSON.stringify;
  const parse = serializer?.parse ?? JSON.parse;

  // ── Read from storage (handles TTL + corruption) ─────────────────────────
  const readStorage = useCallback((): T => {
    const raw = lsRead(key);
    if (raw === null) return initialValue;
    try {
      const decoded = decode ? decode(raw) : raw;
      const entry: StorageEntry<T> = parse(decoded);
      if (ttl !== undefined && entry.t !== undefined) {
        if (Date.now() > entry.t + ttl) {
          lsDelete(key);
          return initialValue;
        }
      }
      return entry.v;
    } catch {
      lsDelete(key); // corrupted — wipe it
      return initialValue;
    }
  }, [key, ttl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── State ─────────────────────────────────────────────────────────────────
  const [state, setInternalState] = useState<T>(() => readStorage());

  // Keep a ref so the storage event handler always sees the latest setter
  const setRef = useRef(setInternalState);
  useEffect(() => {
    setRef.current = setInternalState;
  }, []);

  // ── Write to storage ──────────────────────────────────────────────────────
  const setState: SetValue<T> = useCallback(
    (valOrFn) => {
      setInternalState((prev) => {
        const next = typeof valOrFn === 'function' ? (valOrFn as (p: T) => T)(prev) : valOrFn;
        const entry: StorageEntry<T> = {
          v: next,
          ...(ttl !== undefined ? { t: Date.now() } : {}),
        };
        const serialized = stringify(entry);
        lsWrite(key, encode ? encode(serialized) : serialized);
        return next;
      });
    },
    [key, ttl, encode, stringify]
  );

  // ── Remove / reset ────────────────────────────────────────────────────────
  const removeValue = useCallback(() => {
    lsDelete(key);
    setInternalState(initialValue);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cross-tab sync ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isBrowser()) return;

    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      // null newValue means the key was deleted
      if (e.newValue === null) {
        setRef.current(initialValue);
        return;
      }
      try {
        const decoded = decode ? decode(e.newValue) : e.newValue;
        const entry: StorageEntry<T> = parse(decoded);
        if (ttl !== undefined && entry.t !== undefined) {
          if (Date.now() > entry.t + ttl) return; // expired in other tab
        }
        setRef.current(entry.v);
      } catch {
        /* corrupted data from other tab — ignore */
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, ttl, decode, parse]); // eslint-disable-line react-hooks/exhaustive-deps

  return [state, setState, removeValue];
}
