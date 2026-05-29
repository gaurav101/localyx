# @gks101/localyx
[![npm version](https://img.shields.io/npm/v/@gks101/localyx.svg?style=flat-flat)](https://www.npmjs.com/package/@gks101/localyx)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@gks101/localyx?label=bundle%20size)](https://bundlephobia.com/package/@gks101/localyx)
[![npm downloads](https://img.shields.io/npm/dm/@gks101/localyx.svg?style=flat-flat)](https://www.npmjs.com/package/@gks101/localyx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight (<1kb gzip+minified )React hook for persistent `localStorage` state with TTL expiry, same-tab and cross-tab sync, and optional encoding/serialization controls.

## Installation

```bash
npm install @gks101/localyx
```

## Quick Start

```tsx
import { useLocalStorageState } from '@gks101/localyx';

function ThemeToggle() {
  const [theme, setTheme, clearTheme] = useLocalStorageState<'light' | 'dark'>('theme', 'dark');

  return (
    <div>
      <p>Theme: {theme}</p>
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Toggle</button>
      <button onClick={clearTheme}>Reset</button>
    </div>
  );
}
```

## Features

- SSR-safe access guards.
- Same-tab and cross-tab synchronization.
- TTL expiry with automatic in-tab cleanup.
- Expiry strategies: `absolute` and `sliding`.
- `onExpire` lifecycle callback.
- Optional namespaced keys.
- Custom serializer and encrypt/decrypt functions.
- Utility: `getRemainingTtl(...)`.

## TTL Example (`absolute` + callback)

```tsx
import { useLocalStorageState } from '@gks101/localyx';

function Session() {
  const [token, setToken, clearToken] = useLocalStorageState<string | null>('session', null, {
    ttl: 30 * 60 * 1000, // 30m
    ttlStrategy: 'absolute',
    onExpire: ({ key }) => {
      console.log(`Expired key: ${key}`);
    },
  });

  return (
    <div>
      <p>{token ?? 'No active token'}</p>
      <button onClick={() => setToken(`token_${Date.now()}`)}>Login</button>
      <button onClick={clearToken}>Logout</button>
    </div>
  );
}
```

## Sliding TTL Example

```tsx
const [cache] = useLocalStorageState('search_cache', '', {
  ttl: 5 * 60 * 1000,
  ttlStrategy: 'sliding',
});
```

`sliding` refreshes the timestamp on read/sync access so active values remain alive.

## Namespaced Keys

```tsx
const [user] = useLocalStorageState('profile', null, {
  namespace: 'app:v1',
});
```

This stores under `app:v1:profile`.

## Remaining TTL Utility

```tsx
import { getRemainingTtl } from '@gks101/localyx';

const remainingMs = getRemainingTtl('session', 30 * 60 * 1000, {
  namespace: 'app:v1',
});
```

Returns:

- `number` (ms remaining),
- `0` when expired-but-not-yet-cleaned,
- `null` when key is missing, not timestamped, or invalid.

## Encryption / Serialization Notes

- Default behavior applies Base64 obfuscation.
- Use `encrypt: null` and `decrypt: null` to store plain JSON.
- Base64 is not cryptographic encryption; provide custom crypto functions for real security.

## API

### `useLocalStorageState<T>(key, initialValue, options?)`

Returns `[state, setState, removeValue]`.

`options`:

- `ttl?: number`
- `ttlStrategy?: 'absolute' | 'sliding'` (default: `'absolute'`)
- `namespace?: string`
- `onExpire?: (ctx: { key: string; value: T }) => void`
- `now?: () => number`
- `encrypt?: ((raw: string) => string) | null`
- `decrypt?: ((raw: string) => string) | null`
- `serializer?: { stringify: (v: T) => string; parse: (s: string) => T }`

### `getRemainingTtl(key, ttl, options?)`

`options`:

- `namespace?: string`
- `decrypt?: ((raw: string) => string) | null`
- `parse?: (s: string) => { v: unknown; t?: number }`
- `now?: () => number`

## Production Patterns

- Auth/session token cache with hard expiry.
- Feature flag payload cache with short TTL.
- Local stale-while-revalidate snapshot cache.

## Troubleshooting

- Value not syncing in same tab:
  - ensure both hooks use the same key and namespace.
- Value not expiring:
  - confirm `ttl` is set and data was written by this hook.
- Unexpected reset:
  - invalid/corrupted payloads are wiped by design.

## License

MIT
