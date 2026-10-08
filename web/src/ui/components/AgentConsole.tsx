import { useEffect, useState } from 'react';
import type { ClinicResult } from '../../engine/api';
import { getAgentFacts } from '../../engine/api';

type AgentTab = 'surgeon' | 'actuary' | 'detective' | 'goblin' | 'summary';
type AgentMode = 'local' | 'kimi' | 'ollama';

const TABS: { id: AgentTab; label: string }[] = [
  { id: 'surgeon', label: 'Surgeon' },
  { id: 'actuary', label: 'Actuary' },
  { id: 'detective', label: 'Detective' },
  { id: 'goblin', label: 'Goblin' },
  { id: 'summary', label: 'Summary' },
];

export default function AgentConsole({ clinic, open, onClose }: { clinic: ClinicResult | null; open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<AgentTab>('surgeon');
  const [mode, setMode] = useState<AgentMode>((localStorage.getItem('nj-agent-mode') as AgentMode) || 'local');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [kimiKey, setKimiKey] = useState(sessionStorage.getItem('nj-kimi-key') || '');
  const [ollamaKey, setOllamaKey] = useState(sessionStorage.getItem('nj-ollama-key') || '');
  const [ollamaModel, setOllamaModel] = useState(localStorage.getItem('nj-ollama-model') || 'gpt-oss:20b');
  const [ollamaUrl, setOllamaUrl] = useState(localStorage.getItem('nj-ollama-url') || '');
  const [output, setOutput] = useState('Select an agent to analyze your data.');
  const [status, setStatus] = useState('');

  useEffect(() => { localStorage.setItem('nj-agent-mode', mode); }, [mode]);

  const save = () => {
    // API keys live in sessionStorage: cleared when the tab closes instead of
    // persisting on-device indefinitely. Non-secret prefs stay in localStorage.
    sessionStorage.setItem('nj-kimi-key', kimiKey);
    sessionStorage.setItem('nj-ollama-key', ollamaKey);
    localStorage.setItem('nj-ollama-model', ollamaModel);
    localStorage.setItem('nj-ollama-url', ollamaUrl);
    setStatus('saved ✓'); setTimeout(() => setStatus(''), 1400);
  };

  const localFacts = (): string => {
    try {
      const facts = getAgentFacts(tab, { team: clinic?.team, report: clinic?.report } as never);
      return JSON.stringify(facts, null, 2);
    } catch {
      if (!clinic) return `${tab}: no patient loaded — analyze a team first.`;
      const a = clinic.analysis;
      const lines = [
        `${tab.toUpperCase()} — local read`,
        `issue load: ${a.issue} (${a.status})`,
        `missing roles: ${a.missing.join(', ') || 'none'}`,
        `top weaknesses: ${a.rows.filter((r) => r.weak).slice(0, 3).map((r) => `${r.tp} ×${r.weak}`).join(', ') || 'none'}`,
        `identity: ${clinic.identity?.primary?.name ?? 'unknown'}`,
      ];
      return lines.join('\n');
    }
  };

  const askCloud = async (): Promise<string> => {
    const facts = localFacts();
    const prompt = `You are Nurse Joyless's "${tab}" analyst agent. Be terse and clinical.\n\nDATA:\n${facts}`;
    if (mode === 'kimi') {
      if (!kimiKey) return 'Kimi mode: enter an API key in settings below.';
      const r = await fetch('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kimiKey}` },
        body: JSON.stringify({ model: 'kimi-k2-0711-preview', messages: [{ role: 'user', content: prompt }] }),
      });
      const j = await r.json();
      return j?.choices?.[0]?.message?.content ?? `kimi error: ${JSON.stringify(j).slice(0, 200)}`;
    }
    if (!ollamaUrl) return 'Ollama mode: enter your proxy URL in settings below.';
    const r = await fetch(`${ollamaUrl.replace(/\/$/, '')}/api/ollama/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(ollamaKey ? { Authorization: `Bearer ${ollamaKey}` } : {}) },
      body: JSON.stringify({ model: ollamaModel, messages: [{ role: 'user', content: prompt }] }),
    });
    const j = await r.json();
    return j?.message?.content ?? j?.response ?? `ollama error: ${JSON.stringify(j).slice(0, 200)}`;
  };

  const run = async () => {
    setOutput('…');
    try {
      setOutput(mode === 'local' ? localFacts() : await askCloud());
    } catch (e) { setOutput(`error: ${String(e).slice(0, 300)}`); }
  };

  return (
    <aside className={`agent-panel${open ? ' open' : ''}`} aria-label="Agent Console">
      <div className="agent-header">
        <h3>AGENT CONSOLE</h3>
        <button className="ghost small" onClick={onClose}>✕</button>
      </div>
      <div className="agent-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`agent-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => { setTab(t.id); }}>{t.label}</button>
        ))}
      </div>
      <div className="agent-terminal">
        <pre className="agent-response">{output}</pre>
      </div>
      <div className="agent-settings">
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="primary small" style={{ flex: 1 }} onClick={run}>Run agent</button>
          <button className="ghost small" onClick={() => setSettingsOpen(!settingsOpen)}>⚙</button>
        </div>
        <label style={{ marginTop: 10 }}>Agent Mode</label>
        <div className="mode-toggle">
          {(['local', 'kimi', 'ollama'] as AgentMode[]).map((m) => (
            <button key={m} className={`mode-btn${mode === m ? ' active' : ''}`} onClick={() => setMode(m)}>
              {mode === m ? '●' : '○'} {m === 'ollama' ? 'Ollama Cloud' : m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        {settingsOpen && (
          <div className="api-settings">
            <label>Kimi API Key<input type="password" value={kimiKey} onChange={(e) => setKimiKey(e.target.value)} placeholder="sk-..." /></label>
            <label>Ollama Cloud API Key<input type="password" value={ollamaKey} onChange={(e) => setOllamaKey(e.target.value)} placeholder="ollama_..." /></label>
            <label>Ollama Cloud Model<input type="text" value={ollamaModel} onChange={(e) => setOllamaModel(e.target.value)} /></label>
            <label>Ollama Proxy URL<input type="text" value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)} placeholder="https://your-worker.workers.dev" /></label>
            <button className="primary small" onClick={save}>Save</button>
            {status && <div className="api-status ok">{status}</div>}
          </div>
        )}
      </div>
    </aside>
  );
}
