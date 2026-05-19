import { useLocalStorageState } from '@gks101/localyx';
import { Trash2, RefreshCw } from 'lucide-react';
import { CodeEditorView } from './CodeEditorView';

export function BasicStateCard() {
  const [name, setName, removeName] = useLocalStorageState('demo_name', '');

  const basicCodeHTML = `<span class="token-keyword">import</span> <span class="token-punctuation">{</span> useLocalStorageState <span class="token-punctuation">}</span> <span class="token-keyword">from</span> <span class="token-string">'@gks101/localyx'</span><span class="token-punctuation">;</span>

<span class="token-keyword">const</span> <span class="token-punctuation">[</span>name<span class="token-punctuation">,</span> setName<span class="token-punctuation">,</span> removeName<span class="token-punctuation">]</span> <span class="token-punctuation">=</span> <span class="token-function">useLocalStorageState</span><span class="token-punctuation">(</span>
  <span class="token-string">'demo_name'</span><span class="token-punctuation">,</span>
  <span class="token-string">''</span>
<span class="token-punctuation">)</span><span class="token-punctuation">;</span>`;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon">
          <RefreshCw size={24} />
        </div>
        <h2>Basic & Cross-Tab Sync</h2>
      </div>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Open this page in a new tab. When you change the value here, it will instantly sync across
        all tabs without a reload!
      </p>

      <div className="control-group">
        <label>Your Name (State)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Type something..."
        />
      </div>

      <div className="control-group">
        <label>Current Value</label>
        <div className="value-display">{name || <span style={{ opacity: 0.5 }}>Empty</span>}</div>
      </div>

      <div className="button-group">
        <button className="danger" onClick={removeName}>
          <Trash2 size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          Clear Data
        </button>
      </div>

      <CodeEditorView title="BasicUsage.tsx" codeHTML={basicCodeHTML} />
    </div>
  );
}
