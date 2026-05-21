import { renderHook, act } from '@testing-library/react';
import { useLocalStorageState, getRemainingTtl } from './index';

function decodeDefaultStorage(raw: string): { v: unknown; t?: number } {
  const decoded = decodeURIComponent(escape(atob(raw)));
  return JSON.parse(decoded);
}

describe('useLocalStorageState', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('initializes with initial value when storage is empty', () => {
    const { result } = renderHook(() => useLocalStorageState('key:init', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('reads existing value from localStorage', () => {
    localStorage.setItem('key:read', JSON.stringify({ v: 'stored' }));
    const { result } = renderHook(() => useLocalStorageState('key:read', 'default'));
    expect(result.current[0]).toBe('stored');
  });

  it('writes encoded payload to localStorage', () => {
    const { result } = renderHook(() => useLocalStorageState('key:write', 'default'));

    act(() => {
      result.current[1]('next');
    });

    expect(result.current[0]).toBe('next');
    const raw = localStorage.getItem('key:write');
    expect(raw).not.toBeNull();
    const stored = decodeDefaultStorage(raw as string);
    expect(stored.v).toBe('next');
    expect(stored.t).toBeUndefined();
  });

  it('removes value and resets state', () => {
    const { result } = renderHook(() => useLocalStorageState('key:remove', 'default'));

    act(() => {
      result.current[1]('next');
      result.current[2]();
    });

    expect(result.current[0]).toBe('default');
    expect(localStorage.getItem('key:remove')).toBeNull();
  });

  it('expires value in-tab automatically after ttl', () => {
    const { result } = renderHook(() =>
      useLocalStorageState('key:ttl:auto', 'default', { ttl: 1000 })
    );

    act(() => {
      result.current[1]('session');
    });
    expect(result.current[0]).toBe('session');

    act(() => {
      vi.advanceTimersByTime(1001);
    });

    expect(result.current[0]).toBe('default');
    expect(localStorage.getItem('key:ttl:auto')).toBeNull();
  });

  it('calls onExpire once when ttl is exceeded', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() =>
      useLocalStorageState('key:ttl:callback', 'default', { ttl: 500, onExpire })
    );

    act(() => {
      result.current[1]('token');
    });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(onExpire).toHaveBeenCalledWith({ key: 'key:ttl:callback', value: 'token' });
    expect(result.current[0]).toBe('default');
  });

  it('supports namespaced keys', () => {
    const { result } = renderHook(() =>
      useLocalStorageState('session', 'default', { namespace: 'app:v1' })
    );

    act(() => {
      result.current[1]('ns-value');
    });

    expect(localStorage.getItem('session')).toBeNull();
    expect(localStorage.getItem('app:v1:session')).not.toBeNull();
  });

  it('syncs state in same tab across hook instances', () => {
    const first = renderHook(() => useLocalStorageState('key:same-tab', 'default'));
    const second = renderHook(() => useLocalStorageState('key:same-tab', 'default'));

    act(() => {
      first.result.current[1]('shared');
    });

    expect(first.result.current[0]).toBe('shared');
    expect(second.result.current[0]).toBe('shared');
  });

  it('syncs state across tabs with storage event', () => {
    const { result } = renderHook(() => useLocalStorageState('key:cross-tab', 'default'));

    act(() => {
      const event = new StorageEvent('storage', {
        key: 'key:cross-tab',
        newValue: JSON.stringify({ v: 'remote' }),
      });
      window.dispatchEvent(event);
    });

    expect(result.current[0]).toBe('remote');
  });

  it('ignores invalid cross-tab payloads for the same key', () => {
    const { result } = renderHook(() => useLocalStorageState('key:invalid-sync', 'default'));

    act(() => {
      const event = new StorageEvent('storage', {
        key: 'key:invalid-sync',
        newValue: '%%%not-valid-json%%%',
      });
      window.dispatchEvent(event);
    });

    expect(result.current[0]).toBe('default');
  });

  it('supports ttlStrategy sliding by extending expiration on access', () => {
    const ttl = 1000;
    const first = renderHook(() =>
      useLocalStorageState('key:sliding', 'default', { ttl, ttlStrategy: 'sliding' })
    );

    act(() => {
      first.result.current[1]('session');
    });

    act(() => {
      vi.advanceTimersByTime(800);
    });

    const second = renderHook(() =>
      useLocalStorageState('key:sliding', 'default', { ttl, ttlStrategy: 'sliding' })
    );
    expect(second.result.current[0]).toBe('session');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(first.result.current[0]).toBe('session');

    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(first.result.current[0]).toBe('default');
  });

  it('supports sliding ttl with plain JSON storage when encrypt/decrypt are null', () => {
    const originalTs = Date.now() - 200;
    localStorage.setItem('key:sliding:plain', JSON.stringify({ v: 'plain', t: originalTs }));

    const { result } = renderHook(() =>
      useLocalStorageState('key:sliding:plain', 'default', {
        ttl: 5000,
        ttlStrategy: 'sliding',
        encrypt: null,
        decrypt: null,
      })
    );

    expect(result.current[0]).toBe('plain');
    const refreshedRaw = localStorage.getItem('key:sliding:plain') as string;
    const refreshed = JSON.parse(refreshedRaw) as { v: string; t?: number };
    expect(refreshed.v).toBe('plain');
    expect(typeof refreshed.t).toBe('number');
    expect((refreshed.t as number) >= originalTs).toBe(true);
  });

  it('handles storage unavailability and noops local sync emission', () => {
    vi.stubGlobal('localStorage', undefined);
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    expect(getRemainingTtl('no-storage', 1000)).toBeNull();

    const { result } = renderHook(() => useLocalStorageState('key:no-storage', 'default'));
    expect(result.current[0]).toBe('default');

    act(() => {
      result.current[1]((prev) => `${prev}-next`);
    });
    expect(result.current[0]).toBe('default-next');
    expect(dispatchSpy).not.toHaveBeenCalled();

    act(() => {
      result.current[2]();
    });
    expect(result.current[0]).toBe('default');
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('clears corrupted payloads and falls back to initial value', () => {
    localStorage.setItem('key:corrupt', 'not-json-and-not-base64');
    const { result } = renderHook(() => useLocalStorageState('key:corrupt', 'default'));
    expect(result.current[0]).toBe('default');
    expect(localStorage.getItem('key:corrupt')).toBeNull();
  });

  it('uses encrypt/decrypt when provided and supports disabling default base64', () => {
    const encrypt = (raw: string) => raw.split('').reverse().join('');
    const decrypt = (raw: string) => raw.split('').reverse().join('');

    const { result } = renderHook(() =>
      useLocalStorageState('key:crypto', 'default', {
        encrypt,
        decrypt,
      })
    );

    act(() => {
      result.current[1]('secret');
    });

    const raw = localStorage.getItem('key:crypto') as string;
    expect(raw).not.toContain('secret');

    const plain = renderHook(() =>
      useLocalStorageState('key:plain', 'default', {
        encrypt: null,
        decrypt: null,
      })
    );

    act(() => {
      plain.result.current[1]('raw-value');
    });

    const plainRaw = localStorage.getItem('key:plain') as string;
    expect(plainRaw).toContain('raw-value');
  });

  it('uses custom serializer parse/stringify', () => {
    const serializer = {
      stringify: (v: { value: string }) => `${v.value}::encoded`,
      parse: (s: string) => ({ value: s.replace('::encoded', '') }),
    };

    const { result } = renderHook(() =>
      useLocalStorageState('key:serializer', { value: 'default' }, { serializer })
    );

    act(() => {
      result.current[1]({ value: 'next' });
    });

    expect(result.current[0]).toEqual({ value: 'next' });
  });

  it('handles expired payload during initial read and fires onExpire', () => {
    const onExpire = vi.fn();
    const oldTs = Date.now() - 5000;
    localStorage.setItem('key:expired:init', JSON.stringify({ v: 'stale', t: oldTs }));

    const { result } = renderHook(() =>
      useLocalStorageState('key:expired:init', 'default', { ttl: 1000, onExpire, decrypt: null })
    );

    expect(result.current[0]).toBe('default');
    expect(localStorage.getItem('key:expired:init')).toBeNull();
    expect(onExpire).toHaveBeenCalledWith({ key: 'key:expired:init', value: 'stale' });
  });

  it('handles expired storage-event payload with ttl and triggers onExpire', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() =>
      useLocalStorageState('key:expired:event', 'default', { ttl: 1000, onExpire, decrypt: null })
    );

    act(() => {
      const oldTs = Date.now() - 3000;
      const event = new StorageEvent('storage', {
        key: 'key:expired:event',
        newValue: JSON.stringify({ v: 'remote-stale', t: oldTs }),
      });
      window.dispatchEvent(event);
    });

    expect(result.current[0]).toBe('default');
    expect(onExpire).toHaveBeenCalledWith({ key: 'key:expired:event', value: 'remote-stale' });
  });

  it('ignores storage events for unrelated keys', () => {
    const { result } = renderHook(() =>
      useLocalStorageState('key:mine', 'default', { decrypt: null })
    );

    act(() => {
      const event = new StorageEvent('storage', {
        key: 'key:not-mine',
        newValue: JSON.stringify({ v: 'other' }),
      });
      window.dispatchEvent(event);
    });

    expect(result.current[0]).toBe('default');
  });

  it('supports removeValue ttl path without errors', () => {
    const { result } = renderHook(() =>
      useLocalStorageState('key:remove:ttl', 'default', { ttl: 1000 })
    );
    act(() => {
      result.current[1]('x');
      result.current[2]();
    });
    expect(result.current[0]).toBe('default');
  });

  it('handles btoa failure by storing raw serialized content', () => {
    const btoaSpy = vi.spyOn(globalThis, 'btoa').mockImplementation(() => {
      throw new Error('btoa fail');
    });

    const { result } = renderHook(() => useLocalStorageState('key:btoa', 'default'));
    act(() => {
      result.current[1]('plain-fallback');
    });

    const raw = localStorage.getItem('key:btoa') as string;
    expect(raw).toContain('plain-fallback');
    btoaSpy.mockRestore();
  });

  it('ttl scheduler handles entries without timestamps', () => {
    localStorage.setItem('key:ttl:no-t', JSON.stringify({ v: 'no-ts' }));
    const { result } = renderHook(() =>
      useLocalStorageState('key:ttl:no-t', 'default', { ttl: 1000, decrypt: null })
    );
    expect(result.current[0]).toBe('no-ts');
  });

  it('ttl timeout callback handles deleted latest value', () => {
    const { result } = renderHook(() =>
      useLocalStorageState('key:ttl:deleted-latest', 'default', { ttl: 1000 })
    );
    act(() => {
      result.current[1]('value');
      localStorage.removeItem('key:ttl:deleted-latest');
      vi.advanceTimersByTime(1000);
    });
    expect(result.current[0]).toBe('value');
  });

  it('ttl timeout callback handles latest payload without timestamp', () => {
    const { result } = renderHook(() =>
      useLocalStorageState('key:ttl:no-latest-t', 'default', { ttl: 1000, decrypt: null })
    );
    act(() => {
      result.current[1]('value');
      localStorage.setItem('key:ttl:no-latest-t', JSON.stringify({ v: 'value' }));
      vi.advanceTimersByTime(1000);
    });
    expect(result.current[0]).toBe('value');
  });

  it('ttl timeout callback expires via latest-entry branch', () => {
    let skew = 0;
    const now = () => Date.now() + skew;
    const onExpire = vi.fn();

    const { result } = renderHook(() =>
      useLocalStorageState('key:ttl:latest-expire', 'default', { ttl: 1000, now, onExpire })
    );

    act(() => {
      result.current[1]('value');
    });

    act(() => {
      vi.advanceTimersByTime(1);
      skew = 10;
      vi.advanceTimersByTime(1000);
    });

    expect(result.current[0]).toBe('default');
    expect(onExpire).toHaveBeenCalledWith({ key: 'key:ttl:latest-expire', value: 'value' });
  });

  it('ttl timeout callback handles invalid latest payload', () => {
    const { result } = renderHook(() =>
      useLocalStorageState('key:ttl:invalid-latest', 'default', { ttl: 1000 })
    );

    act(() => {
      result.current[1]('value');
    });

    act(() => {
      localStorage.setItem('key:ttl:invalid-latest', '%%%');
      vi.advanceTimersByTime(1001);
    });

    expect(localStorage.getItem('key:ttl:invalid-latest')).toBeNull();
  });

  it('uses zero-delay ttl scheduling when remaining time is non-positive', () => {
    let calls = 0;
    const now = () => {
      calls += 1;
      return calls === 1 ? 1000 : 2501;
    };
    localStorage.setItem('key:ttl:zero-delay', JSON.stringify({ v: 'value', t: 1000 }));
    const onExpire = vi.fn();

    const { result } = renderHook(() =>
      useLocalStorageState('key:ttl:zero-delay', 'default', { ttl: 1500, decrypt: null, now, onExpire })
    );
    expect(result.current[0]).toBe('value');

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(result.current[0]).toBe('default');
    expect(onExpire).toHaveBeenCalledWith({ key: 'key:ttl:zero-delay', value: 'value' });
  });

  it('gracefully handles localStorage read/write/remove errors', () => {
    const getSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('read failed');
    });
    const { result } = renderHook(() => useLocalStorageState('key:errors', 'default'));
    expect(result.current[0]).toBe('default');
    getSpy.mockRestore();

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('write failed');
    });
    act(() => {
      result.current[1]('next');
    });
    expect(warnSpy).toHaveBeenCalled();

    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('remove failed');
    });
    act(() => {
      result.current[2]();
    });
    expect(result.current[0]).toBe('default');
  });
});

describe('getRemainingTtl', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns remaining ttl for a valid timestamped entry', () => {
    const now = Date.now();
    localStorage.setItem('ttl:key', JSON.stringify({ v: 'x', t: now }));
    const remaining = getRemainingTtl('ttl:key', 1000, { decrypt: null });
    expect(remaining).not.toBeNull();
    expect(remaining as number).toBeGreaterThanOrEqual(0);
    expect(remaining as number).toBeLessThanOrEqual(1000);
  });

  it('returns null for missing or non-ttl entries and respects namespace', () => {
    expect(getRemainingTtl('missing', 1000)).toBeNull();

    localStorage.setItem('app:v1:user', JSON.stringify({ v: 'u', t: Date.now() }));
    const namespaced = getRemainingTtl('user', 5000, { namespace: 'app:v1', decrypt: null });
    expect(namespaced).not.toBeNull();

    localStorage.setItem('plain', JSON.stringify({ v: 'x' }));
    expect(getRemainingTtl('plain', 1000, { decrypt: null })).toBeNull();
  });

  it('returns null for invalid payloads', () => {
    localStorage.setItem('bad', '%%%');
    expect(getRemainingTtl('bad', 1000)).toBeNull();
  });

  it('supports custom parse/now options', () => {
    localStorage.setItem('custom:ttl', 'raw');
    const remaining = getRemainingTtl('custom:ttl', 1000, {
      decrypt: null,
      parse: () => ({ v: 'x', t: 5000 }),
      now: () => 4500,
    });
    expect(remaining).toBe(1500);
  });
});
