import { useState, useEffect, useCallback } from 'react';

interface StorageEntry<T> {
  v: T;
  t?: number;
}

export type TtlStrategy = 'absolute' | 'sliding';

export interface UseLocalStorageStateOptions<T> {
  ttl?: number;
  ttlStrategy?: TtlStrategy;
  namespace?: string;
  onExpire?: (ctx: { key: string; value: T }) => void;
  now?: () => number;
  encrypt?: ((raw: string) => string) | null;
  decrypt?: ((raw: string) => string) | null;
  serializer?: {
    stringify: (v: T) => string;
    parse: (s: string) => T;
  };
}

export type SetValue<T> = (v: T | ((prev: T) => T)) => void;

export interface GetRemainingTtlOptions {
  namespace?: string;
  decrypt?: ((raw: string) => string) | null;
  parse?: (s: string) => StorageEntry<unknown>;
  now?: () => number;
}

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

const LOCAL_SYNC_EVENT = '__localyx_sync__';

function resolveStorageKey(key: string, namespace?: string): string {
  return namespace ? `${namespace}:${key}` : key;
}

function emitLocalSync(key: string, newValue: string | null): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(LOCAL_SYNC_EVENT, { detail: { key, newValue } }));
}

function parseStorageEntry<T>(
  raw: string,
  decode: ((value: string) => string) | undefined,
  parse: (value: string) => T
): StorageEntry<T> | null {
  try {
    const decoded = decode ? decode(raw) : raw;
    return parse(decoded) as StorageEntry<T>;
  } catch {
    return null;
  }
}

export function getRemainingTtl(
  key: string,
  ttl: number,
  options: GetRemainingTtlOptions = {}
): number | null {
  const { namespace, decrypt, parse, now } = options;
  const storageKey = resolveStorageKey(key, namespace);
  const raw = lsRead(storageKey);
  if (raw === null) return null;

  const decode = decrypt === null ? undefined : (decrypt ?? b64d);
  const parseEntry = parse ?? ((s: string) => JSON.parse(s) as StorageEntry<unknown>);
  const nowFn = now ?? Date.now;

  try {
    const decoded = decode ? decode(raw) : raw;
    const entry = parseEntry(decoded);
    if (entry.t === undefined) return null;
    return Math.max(0, entry.t + ttl - nowFn());
  } catch {
    return null;
  }
}

export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageStateOptions<T> = {}
): [T, SetValue<T>, () => void] {
  const {
    ttl,
    ttlStrategy = 'absolute',
    namespace,
    onExpire,
    now,
    encrypt,
    decrypt,
    serializer,
  } = options;

  const storageKey = resolveStorageKey(key, namespace);
  const nowFn = now ?? Date.now;
  const encode = encrypt === null ? undefined : (encrypt ?? b64e);
  const decode = decrypt === null ? undefined : (decrypt ?? b64d);
  const stringify = serializer?.stringify ?? JSON.stringify;
  const parse = serializer?.parse ?? JSON.parse;
  const [expiryTick, setExpiryTick] = useState(0);

  const touchSlidingTtl = useCallback(
    (entry: StorageEntry<T>) => {
      if (ttl === undefined || entry.t === undefined || ttlStrategy !== 'sliding') return;
      const refreshed: StorageEntry<T> = { ...entry, t: nowFn() };
      const serialized = stringify(refreshed);
      const raw = encode ? encode(serialized) : serialized;
      lsWrite(storageKey, raw);
    },
    [storageKey, ttl, ttlStrategy, nowFn, stringify, encode]
  );

  const readStorage = useCallback((): T => {
    const raw = lsRead(storageKey);
    if (raw === null) return initialValue;
    const entry = parseStorageEntry(raw, decode, parse);
    if (entry === null) {
      lsDelete(storageKey);
      return initialValue;
    }
    if (ttl !== undefined && entry.t !== undefined && nowFn() >= entry.t + ttl) {
      lsDelete(storageKey);
      if (onExpire) onExpire({ key: storageKey, value: entry.v });
      return initialValue;
    }
    touchSlidingTtl(entry);
    return entry.v;
  }, [storageKey, initialValue, decode, parse, ttl, nowFn, onExpire, touchSlidingTtl]);

  const [state, setInternalState] = useState<T>(() => readStorage());

  const expireEntry = useCallback(
    (entry: StorageEntry<T>, sync: boolean) => {
      lsDelete(storageKey);
      if (onExpire) onExpire({ key: storageKey, value: entry.v });
      setInternalState(initialValue);
      if (sync) emitLocalSync(storageKey, null);
    },
    [storageKey, initialValue, onExpire, setInternalState]
  );

  const setState: SetValue<T> = useCallback(
    (valOrFn) => {
      setInternalState((prev) => {
        const next = typeof valOrFn === 'function' ? (valOrFn as (p: T) => T)(prev) : valOrFn;
        const entry: StorageEntry<T> = {
          v: next,
          ...(ttl !== undefined ? { t: nowFn() } : {}),
        };
        const serialized = stringify(entry);
        const raw = encode ? encode(serialized) : serialized;
        lsWrite(storageKey, raw);
        emitLocalSync(storageKey, raw);
        if (ttl !== undefined) setExpiryTick((v) => v + 1);
        return next;
      });
    },
    [storageKey, ttl, nowFn, stringify, encode, setInternalState]
  );

  const removeValue = useCallback(() => {
    lsDelete(storageKey);
    emitLocalSync(storageKey, null);
    if (ttl !== undefined) setExpiryTick((v) => v + 1);
    setInternalState(initialValue);
  }, [storageKey, ttl, initialValue, setInternalState]);

  useEffect(() => {
    if (!isBrowser()) return;

    const applySyncValue = (newValue: string | null) => {
      if (newValue === null) {
        setInternalState(initialValue);
        return;
      }
      const entry = parseStorageEntry(newValue, decode, parse);
      if (entry === null) {
        /* ignore invalid payloads */
        return;
      }
      if (ttl !== undefined && entry.t !== undefined && nowFn() >= entry.t + ttl) {
        expireEntry(entry, false);
        return;
      }
      touchSlidingTtl(entry);
      setInternalState(entry.v);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key !== storageKey) return;
      applySyncValue(e.newValue);
    };

    const onLocalSync = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string; newValue: string | null }>).detail;
      if (!detail || detail.key !== storageKey) return;
      applySyncValue(detail.newValue);
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(LOCAL_SYNC_EVENT, onLocalSync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(LOCAL_SYNC_EVENT, onLocalSync);
    };
  }, [storageKey, initialValue, decode, parse, ttl, nowFn, expireEntry, touchSlidingTtl]);

  useEffect(() => {
    if (ttl === undefined) return;

    const raw = lsRead(storageKey);
    if (raw === null) return;

    const entry = parseStorageEntry(raw, decode, parse);
    if (entry === null || entry.t === undefined) return;

    const remaining = entry.t + ttl - nowFn();

    const timeoutId = window.setTimeout(
      () => {
        const latestRaw = lsRead(storageKey);
        if (latestRaw === null) return;
        const latestEntry = parseStorageEntry(latestRaw, decode, parse);
        if (latestEntry === null) {
          lsDelete(storageKey);
          return;
        }
        if (latestEntry.t === undefined) return;
        if (nowFn() >= latestEntry.t + ttl) {
          expireEntry(latestEntry, true);
          return;
        }
        setExpiryTick((v) => v + 1);
      },
      remaining > 0 ? remaining : 0
    );

    return () => window.clearTimeout(timeoutId);
  }, [state, expiryTick, storageKey, ttl, decode, parse, nowFn, expireEntry]);

  return [state, setState, removeValue];
}
