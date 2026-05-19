import { renderHook, act } from '@testing-library/react';
import { useLocalStorageState } from './index';

describe('useLocalStorageState', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with the initial value', () => {
    const { result } = renderHook(() => useLocalStorageState('testKey', 'defaultValue'));
    expect(result.current[0]).toBe('defaultValue');
  });

  it('should read from localStorage if present', () => {
    localStorage.setItem('testKey', JSON.stringify({ v: 'storedValue' }));
    const { result } = renderHook(() => useLocalStorageState('testKey', 'defaultValue'));
    expect(result.current[0]).toBe('storedValue');
  });

  it('should update localStorage when state changes', () => {
    const { result } = renderHook(() => useLocalStorageState('testKey', 'defaultValue'));

    act(() => {
      result.current[1]('newValue');
    });

    expect(result.current[0]).toBe('newValue');
    const raw = localStorage.getItem('testKey') || '{}';
    const decoded = decodeURIComponent(escape(atob(raw)));
    const stored = JSON.parse(decoded);
    expect(stored.v).toBe('newValue');
  });

  it('should clear localStorage and reset to initial value when removeValue is called', () => {
    const { result } = renderHook(() => useLocalStorageState('testKey', 'defaultValue'));

    act(() => {
      result.current[1]('newValue');
    });

    act(() => {
      result.current[2]();
    });

    expect(result.current[0]).toBe('defaultValue');
    expect(localStorage.getItem('testKey')).toBeNull();
  });

  it('should expire value if ttl is exceeded', () => {
    const ttl = 1000;
    const { result } = renderHook(() => useLocalStorageState('testKey', 'defaultValue', { ttl }));

    act(() => {
      result.current[1]('temporaryValue');
    });

    expect(result.current[0]).toBe('temporaryValue');

    // Advance time past TTL
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Re-render hook to trigger readStorage again (simulate reload or remount)
    const { result: newResult } = renderHook(() =>
      useLocalStorageState('testKey', 'defaultValue', { ttl })
    );

    expect(newResult.current[0]).toBe('defaultValue');
    expect(localStorage.getItem('testKey')).toBeNull();
  });

  it('should sync state across tabs via storage event', () => {
    const { result } = renderHook(() => useLocalStorageState('testKey', 'defaultValue'));

    act(() => {
      const event = new StorageEvent('storage', {
        key: 'testKey',
        newValue: JSON.stringify({ v: 'fromAnotherTab' }),
      });
      window.dispatchEvent(event);
    });

    expect(result.current[0]).toBe('fromAnotherTab');
  });
});
