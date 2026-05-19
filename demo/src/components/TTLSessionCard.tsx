import { useState, useEffect } from 'react';
import { useLocalStorageState } from '@gks101/localyx';
import { Settings, Clock } from 'lucide-react';
import { CodeEditorView } from './CodeEditorView';

export function TTLSessionCard() {
  const TTL_MS = 5000; // 5 seconds for demo purposes
  const [sessionToken, setSessionToken, clearSession] = useLocalStorageState<string | null>(
    'demo_session',
    null,
    {
      ttl: TTL_MS,
    }
  );

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!sessionToken) return;

    // Try to get exactly when it was created to sync progress bar
    const raw = localStorage.getItem('demo_session');
    if (!raw) return;

    try {
      const decoded = decodeURIComponent(escape(atob(raw)));
      const parsed = JSON.parse(decoded);
      const timestamp = parsed.t;

      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - timestamp;
        const remaining = Math.max(0, TTL_MS - elapsed);

        if (remaining <= 0) {
          // Force a re-render/read to trigger the hook's internal TTL check
          setSessionToken((prev: string | null) => prev);
          clearInterval(interval);
          setProgress(0);
        } else {
          setProgress((remaining / TTL_MS) * 100);
        }
      }, 50);
      return () => clearInterval(interval);
    } catch {
      // Ignored for demo
    }
  }, [sessionToken, setSessionToken]);

  const generateSession = () => {
    setSessionToken(`token_${Math.random().toString(36).substring(2, 9)}`);
  };

  const ttlCodeHTML = `<span class="token-keyword">import</span> <span class="token-punctuation">{</span> useLocalStorageState <span class="token-punctuation">}</span> <span class="token-keyword">from</span> <span class="token-string">'@gks101/localyx'</span><span class="token-punctuation">;</span>

<span class="token-keyword">const</span> <span class="token-punctuation">[</span>session<span class="token-punctuation">,</span> setSession<span class="token-punctuation">]</span> <span class="token-punctuation">=</span> <span class="token-function">useLocalStorageState</span><span class="token-punctuation">&lt;</span><span class="token-type">string | null</span><span class="token-punctuation">&gt;(</span>
  <span class="token-string">'demo_session'</span><span class="token-punctuation">,</span>
  <span class="token-keyword">null</span><span className="token-punctuation">,</span>
  <span class="token-punctuation">{</span> ttl<span class="token-punctuation">:</span> <span class="token-number">5000</span> <span class="token-punctuation">}</span> <span class="token-comment">// 5 seconds</span>
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
        Data automatically expires after a set duration. For this demo, sessions expire in exactly 5
        seconds.
      </p>

      <div className="control-group">
        <label>Session Token</label>
        <div className="value-display">
          {sessionToken ? sessionToken : <span style={{ opacity: 0.5 }}>No active session</span>}
        </div>
        {sessionToken && (
          <div className="progress-container">
            <div className="progress-fill" style={{ width: `${sessionToken ? progress : 0}%` }} />
          </div>
        )}
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
