import { useState, useEffect } from 'react';
import { useLocalStorageState, getRemainingTtl } from '@gks101/localyx';
import type { TtlStrategy } from '@gks101/localyx';
import { Settings, Clock } from 'lucide-react';
import { CodeEditorView } from './CodeEditorView';

export function TTLSessionCard() {
  const TTL_MS = 5000;
  const STORAGE_KEY = 'session_token';
  const NAMESPACE = 'demo:v2';
  const [strategy, setStrategy] = useState<TtlStrategy>('absolute');
  const [expireCount, setExpireCount] = useState(0);

  const [sessionToken, setSessionToken, clearSession] = useLocalStorageState<string | null>(
    STORAGE_KEY,
    null,
    {
      ttl: TTL_MS,
      ttlStrategy: strategy,
      namespace: NAMESPACE,
      onExpire: () => setExpireCount((count) => count + 1),
    }
  );

  const [progress, setProgress] = useState(0);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionToken) {
      return;
    }

    const updateRemaining = () => {
      const remaining = getRemainingTtl(STORAGE_KEY, TTL_MS, { namespace: NAMESPACE });
      if (remaining === null) {
        setRemainingMs(null);
        setProgress(0);
        return;
      }
      setRemainingMs(remaining);
      setProgress((remaining / TTL_MS) * 100);
    };

    updateRemaining();
    const interval = window.setInterval(updateRemaining, 100);
    return () => window.clearInterval(interval);
  }, [sessionToken]);

  const generateSession = () => {
    setSessionToken(`token_${Math.random().toString(36).substring(2, 9)}`);
  };

  const ttlCodeHTML = `<span class="token-keyword">const</span> <span class="token-punctuation">[</span>token<span class="token-punctuation">,</span> setToken<span class="token-punctuation">]</span> <span class="token-punctuation">=</span> <span class="token-function">useLocalStorageState</span><span class="token-punctuation">(</span>
  <span class="token-string">'session_token'</span><span class="token-punctuation">,</span> <span class="token-keyword">null</span><span class="token-punctuation">,</span> <span class="token-punctuation">{</span>
    ttl<span class="token-punctuation">:</span> <span class="token-number">5000</span><span class="token-punctuation">,</span>
    ttlStrategy<span class="token-punctuation">:</span> <span class="token-string">'absolute'</span><span class="token-punctuation">,</span>
    namespace<span class="token-punctuation">:</span> <span class="token-string">'demo:v2'</span><span class="token-punctuation">,</span>
    onExpire<span class="token-punctuation">:</span> <span class="token-punctuation">(</span><span class="token-punctuation">)</span> <span class="token-punctuation">=&gt;</span> <span class="token-function">logOut</span><span class="token-punctuation">(</span><span class="token-punctuation">)</span>
  <span class="token-punctuation">}</span>
<span class="token-punctuation">)</span><span class="token-punctuation">;</span>`;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon">
          <Clock size={24} />
        </div>
        <h2>Time-To-Live (TTL)</h2>
      </div>

      <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Sessions expire in 5 seconds. Switch strategy to compare absolute vs sliding TTL behavior.
      </p>

      <div className="control-group">
        <label>Expiry Strategy</label>
        <div className="button-group" style={{ marginTop: 0, marginBottom: 0 }}>
          <button
            onClick={() => setStrategy('absolute')}
            className={strategy === 'absolute' ? '' : 'danger'}
          >
            Absolute
          </button>
          <button
            onClick={() => setStrategy('sliding')}
            className={strategy === 'sliding' ? '' : 'danger'}
          >
            Sliding
          </button>
        </div>
      </div>

      <div className="control-group">
        <label>Session Token</label>
        <div className="value-display">
          {sessionToken ? sessionToken : <span style={{ opacity: 0.5 }}>No active session</span>}
        </div>
        {sessionToken && (
          <div className="progress-container">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="control-group">
        <label>Remaining TTL / Expiry Count</label>
        <div className="value-display" style={{ fontSize: '0.85rem' }}>
          {sessionToken && remainingMs !== null ? `${Math.ceil(remainingMs)} ms` : 'N/A'} | expired{' '}
          {expireCount} time(s)
        </div>
      </div>

      <div className="button-group">
        <button onClick={generateSession}>
          <Settings size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          Login (5s TTL)
        </button>
        <button className="danger" onClick={clearSession} disabled={!sessionToken}>
          Logout
        </button>
      </div>

      <CodeEditorView title="TTLUsage.tsx" codeHTML={ttlCodeHTML} />
    </div>
  );
}
