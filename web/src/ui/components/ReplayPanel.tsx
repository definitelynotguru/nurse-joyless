import { useState } from 'react';
import { analyzeReplay, BATTLELOG_DEMO } from '../../engine/api';
import Panel from './Panel';

interface TurnEvidence { turn?: number; label?: string; detail?: string; kind?: string; }
interface ReplayResult {
  summary?: string;
  turns?: { turn: number; evidence: TurnEvidence[] }[];
  targets?: { species: string; notes: string[] }[];
  [k: string]: unknown;
}

export default function ReplayPanel() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ReplayResult | null>(null);
  const [err, setErr] = useState('');

  const run = () => {
    setErr('');
    try {
      const r = analyzeReplay(text) as ReplayResult;
      setResult(r);
    } catch (e) { setErr(String(e)); }
  };

  return (
    <Panel id="observer-section" num="06" title="Replay Observer" blurb="Battle log autopsy" art="observer.png"
      action={<>
        <button className="ghost small" onClick={() => setText(BATTLELOG_DEMO || text)}>Load battlelog demo</button>
        <button className="primary small" onClick={run}>Analyze log</button>
      </>}>
      <div className="workbench">
        <div className="terminal-card">
          <label className="label-title" htmlFor="replayInput">Showdown replay log or battle state</label>
          <textarea id="replayInput" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="|turn|3&#10;|move|p2a: Dragapult|Shadow Ball|p1a: Great Tusk&#10;|-damage|p1a: Great Tusk|43/100&#10;|upkeep&#10;|-damage|p2a: Dragapult|88/100|[from] Stealth Rock&#10;..." />
        </div>
        <div id="replayResults" className="replay-results">
          {err && <div className="empty">Replay module pending: {err}</div>}
          {!err && !result && <div className="empty">Paste a replay log to see turn-by-turn evidence.</div>}
          {result && (
            <>
              <div className="timeline">
                {(result.turns ?? []).map((t, i) => (
                  <div className="turn-card" key={i}>
                    <h4>Turn {t.turn}</h4>
                    <div className="evidence-list">
                      {t.evidence.map((ev, j) => (
                        <div className={`evidence-item ${ev.kind || ''}`} key={j}>
                          <span className="evidence-icon">{evIcon(ev.kind)}</span>
                          <div><p><strong>{ev.label}</strong> {ev.detail}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {result.targets && result.targets.length > 0 && (
                <div className="replay-target-grid">
                  {result.targets.map((t, i) => (
                    <div className="replay-target-card box" key={i}>
                      <strong>{t.species}</strong>
                      <ul>{t.notes.map((n, j) => <li key={j}>{n}</li>)}</ul>
                    </div>
                  ))}
                </div>
              )}
              {result.summary && <div className="replay-summary"><h4>Summary</h4><p>{result.summary}</p></div>}
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}

function evIcon(kind?: string): string {
  return ({ hazard: '▲', status: '◆', damage: '✚', reveal: '★' } as Record<string, string>)[kind || ''] || '•';
}
