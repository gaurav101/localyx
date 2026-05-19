import { useLocalStorageState } from '@gks101/localyx';
import { Trash2, Lock } from 'lucide-react';
import { CodeEditorView } from './CodeEditorView';
import { customEncrypt, customDecrypt } from '../utils/encryption';

export function CustomEncryptionCard() {
  const [secret, setSecret, clearSecret] = useLocalStorageState('demo_secret', '', {
    encrypt: customEncrypt,
    decrypt: customDecrypt,
  });

  // Get raw localstorage value directly to show the user what it looks like on disk
  const rawDiskValue = localStorage.getItem('demo_secret');

  const encryptionCodeHTML = `<span class="token-keyword">import</span> <span class="token-punctuation">{</span> useLocalStorageState <span class="token-punctuation">}</span> <span class="token-keyword">from</span> <span class="token-string">'@gks101/localyx'</span><span class="token-punctuation">;</span>

<span class="token-keyword">const</span> <span class="token-function">customEncrypt</span> <span class="token-punctuation">=</span> <span class="token-punctuation">(</span>raw<span class="token-punctuation">)</span> <span class="token-punctuation">=&gt;</span> <span class="token-function">btoa</span><span class="token-punctuation">(</span><span class="token-function">rot13</span><span class="token-punctuation">(</span>raw<span class="token-punctuation">)</span><span class="token-punctuation">)</span><span class="token-punctuation">;</span>
<span class="token-keyword">const</span> <span class="token-function">customDecrypt</span> <span class="token-punctuation">=</span> <span class="token-punctuation">(</span>raw<span class="token-punctuation">)</span> <span class="token-punctuation">=&gt;</span> <span class="token-function">rot13</span><span class="token-punctuation">(</span><span class="token-function">atob</span><span class="token-punctuation">(</span>raw<span class="token-punctuation">)</span><span class="token-punctuation">)</span><span class="token-punctuation">;</span>

<span class="token-keyword">const</span> <span class="token-punctuation">[</span>secret<span class="token-punctuation">,</span> setSecret<span class="token-punctuation">]</span> <span class="token-punctuation">=</span> <span class="token-function">useLocalStorageState</span><span class="token-punctuation">(</span>
  <span class="token-string">'demo_secret'</span><span class="token-punctuation">,</span> <span class="token-string">''</span><span class="token-punctuation">,</span> <span class="token-punctuation">{</span>
    encrypt<span class="token-punctuation">:</span> customEncrypt<span class="token-punctuation">,</span>
    decrypt<span class="token-punctuation">:</span> customDecrypt
  <span class="token-punctuation">}</span>
<span class="token-punctuation">)</span><span class="token-punctuation">;</span>`;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon">
          <Lock size={24} />
        </div>
        <h2>Custom Encryption</h2>
      </div>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Provide your own custom \`encrypt\` and \`decrypt\` functions. Default is standard Base64
        obfuscation.
      </p>

      <div className="control-group">
        <label>Secret Message</label>
        <input
          type="text"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Enter top secret data..."
        />
      </div>

      <div className="control-group">
        <label>Stored in LocalStorage (Disk View)</label>
        <div className="value-display" style={{ fontSize: '0.85rem', color: '#a78bfa' }}>
          {rawDiskValue || <span style={{ opacity: 0.5 }}>Empty</span>}
        </div>
      </div>

      <div className="button-group">
        <button className="danger" onClick={clearSecret}>
          <Trash2 size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          Clear Secret
        </button>
      </div>

      <CodeEditorView title="EncryptionUsage.tsx" codeHTML={encryptionCodeHTML} />
    </div>
  );
}
