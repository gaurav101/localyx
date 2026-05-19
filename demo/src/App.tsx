import { useState, useEffect } from 'react';
import { useLocalStorageState } from '@gks101/localyx';
import {
  Key,
  Copy,
  Check,
  Shield,
  Zap,
  Hourglass,
  RefreshCw,
  Github,
  Star,
  Sun,
  Moon,
  Scale,
} from 'lucide-react';
import { BasicStateCard } from './components/BasicStateCard';
import { TTLSessionCard } from './components/TTLSessionCard';
import { CustomEncryptionCard } from './components/CustomEncryptionCard';

function App() {
  const [theme, setTheme] = useLocalStorageState<'light' | 'dark'>('demo_theme', 'dark');
  const [copied, setCopied] = useState(false);
  const installCmd = 'npm install @gks101/localyx';

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme || 'dark');
  }, [theme]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <header className="header-nav">
        <div className="logo-container">
          <Key size={24} style={{ color: '#a78bfa' }} />
          <span className="logo-text">Localyx</span>
        </div>
        <div className="nav-actions">
          <a
            href="https://github.com/gaurav101/localyx"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
          >
            <Github size={18} />
            <span>Star on GitHub</span>
            <span className="star-badge">
              <Star size={12} fill="currentColor" /> Star
            </span>
          </a>
          <button onClick={toggleTheme} className="theme-toggle" title="Toggle Theme">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <div className="hero-section">
        <h1>
          Localyx{' '}
          <Key
            size={40}
            style={{ verticalAlign: 'baseline', color: '#a78bfa', marginLeft: '10px' }}
          />
        </h1>
        <p className="subtitle" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>
          The ultimate React hook for advanced LocalStorage state management.
        </p>

        <div className="npm-badge" onClick={copyToClipboard} title="Click to copy install command">
          <span>{installCmd}</span>
          {copied ? <Check size={16} style={{ color: '#10b981' }} /> : <Copy size={16} />}
        </div>
      </div>

      <div className="features-section">
        <h3>Why `@gks101/localyx`?</h3>
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-item-icon">
              <RefreshCw size={20} />
            </div>
            <h4>Real-time Sync</h4>
            <p>
              Instantly syncs state across multiple browser tabs and windows without complex setup
              or custom event managers.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-item-icon">
              <Hourglass size={20} />
            </div>
            <h4>Time-To-Live (TTL)</h4>
            <p>
              Set expiration policies to automatically expire cached data, tokens, or sessions,
              reducing memory bloat.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-item-icon">
              <Shield size={20} />
            </div>
            <h4>Built-in Encryption</h4>
            <p>
              Secure state using simple Base64 obfuscation or map custom encryption layers (like AES
              or ROT13) easily.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-item-icon">
              <Zap size={20} />
            </div>
            <h4>SSR & Typesafe</h4>
            <p>
              Built entirely in TypeScript with defensive SSR execution guard rails, guaranteeing
              zero server-rendering crashes.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-item-icon">
              <Scale size={20} />
            </div>
            <h4>Featherweight Footprint</h4>
            <p>
              Low size, high impact: only <strong>754B</strong> minified + gzipped (and 1.5 kB
              minified) with zero dependencies.
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard">
        <BasicStateCard />
        <TTLSessionCard />
        <CustomEncryptionCard />
      </div>
    </>
  );
}

export default App;
