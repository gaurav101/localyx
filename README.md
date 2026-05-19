# @gks101/localyx

A robust React hook for managing state in `localStorage` with built-in support for TTL (Time to Live) and cross-tab synchronization.

## Features

- **SSR-Safe:** Works seamlessly with Next.js and other SSR frameworks.
- **Cross-Tab Sync:** Automatically syncs state changes across browser tabs.
- **TTL Support:** Set an expiration time for your local storage data.
- **Custom Serialization & Encryption:** Pass custom `serializer` or `encrypt`/`decrypt` functions.
- **TypeScript:** Written in TypeScript with full type definitions.

## Installation

```bash
npm install @gks101/localyx
```

## Usage

### Basic Usage

```tsx
import { useLocalStorageState } from '@gks101/localyx';

function App() {
  const [theme, setTheme] = useLocalStorageState('theme', 'light');

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>Toggle Theme</button>
    </div>
  );
}
```

### With TTL (Time to Live)

Expire the storage data after a specific amount of time (in milliseconds).

```tsx
import { useLocalStorageState } from '@gks101/localyx';

function SessionApp() {
  // Session data will expire after 1 hour (3600000 ms)
  const [session, setSession, clearSession] = useLocalStorageState('session_id', null, {
    ttl: 3600000,
  });

  return (
    <div>
      <p>Session: {session}</p>
      <button onClick={() => setSession('new_session_id')}>Login</button>
      <button onClick={clearSession}>Logout</button>
    </div>
  );
}
```

### With Custom Encryption (e.g. Base64)

The hook has basic Base64 obfuscation built-in by default if you pass `encrypt: null`.
However, you can specify your own logic if needed:

```tsx
import { useLocalStorageState } from '@gks101/localyx';

const myCustomEncrypt = (str: string) => btoa(str);
const myCustomDecrypt = (str: string) => atob(str);

function SecureApp() {
  const [secret, setSecret] = useLocalStorageState('secret_key', 'hidden', {
    encrypt: myCustomEncrypt,
    decrypt: myCustomDecrypt,
  });

  return <div>{secret}</div>;
}
```

## API

### `useLocalStorageState<T>(key, initialValue, options)`

Returns a tuple `[state, setState, removeValue]`.

- `key`: The `localStorage` key.
- `initialValue`: The initial value (used if no value is found or if it's expired).
- `options`:
  - `ttl` (number): Time to live in milliseconds.
  - `encrypt` ((raw: string) => string): Custom encryption function.
  - `decrypt` ((raw: string) => string): Custom decryption function.
  - `serializer`: Object containing `stringify` and `parse` methods.

## License

MIT
