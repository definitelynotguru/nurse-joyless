import { useState } from 'react';
import { analyzeReplay, buildReplaySummary, BATTLELOG_DEMO } from '../../engine/api';
import type { ReplayAnalysis, ReplayEvidence, ReplayTarget } from '../../engine/replay';
import Panel from './Panel';

export default function ReplayPanel() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ReplayAnalysis | null>(null);
  const [err, setErr] = useState('');

  const run = () => {
    setErr('');
    try {
      setResult(analyzeReplay(text));
    } catch (e) { setErr(String(e)); }
  };

  const turns = result ? Object.entries(result.evidenceByTurn).sort((a, b) => +a[0] - +b[0]) : [];
  const targets = result?.read?.targets ?? [];
  const summary = result ? buildReplaySummary(result.read) : null;

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
          {err && <div className="empty">Could not analyze that log: {err}</div>}
          {!err && !result && <div className="empty">Paste a replay log to see turn-by-turn evidence.</div>}
          {result && (
            <>
              <div className="timeline">
                {turns.map(([t, evs]) => (
                  <div className="turn-card" key={t}>
                    <h4>Turn {t}</h4>
                    <div className="evidence-list">
                      {evs.map((ev, j) => <EvidenceItem key={j} ev={ev} />)}
                    </div>
                  </div>
                ))}
                {turns.length === 0 && <div className="empty">No evidence parsed from that log.</div>}
              </div>
              {targets.length > 0 && (
                <div className="replay-target-grid">
                  {targets.map((t, i) => <TargetCard key={i} t={t} strongest={result.strongest === t} />)}
                </div>
              )}
              {summary && summary.text && (
                <div className="replay-summary"><h4>Summary</h4><p>{summary.text}</p></div>
              )}
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}

function EvidenceItem({ ev }: { ev: ReplayEvidence }) {
  const kind = ev.hard ? 'hazard' : ev.source.includes('status') || ev.source.includes('item') ? 'status' : ev.source.includes('damage') ? 'damage' : 'reveal';
  const icon = ({ hazard: '▲', status: '◆', damage: '✚', reveal: '★' } as Record<string, string>)[kind] || '•';
  return (
    <div className={`evidence-item ${kind}`}>
      <span className="evidence-icon">{icon}</span>
      <div>
        <p><strong>{ev.species}</strong> {ev.text}</p>
        {ev.conclusion && <p className="meta">{ev.conclusion}{ev.hard ? ' · hard evidence' : ''}</p>}
      </div>
    </div>
  );
}

function TargetCard({ t, strongest }: { t: ReplayTarget; strongest: boolean }) {
  return (
    <div className="replay-target-card box">
      <strong>{t.displaySpecies || t.species}{strongest ? ' — primary suspect' : ''}</strong>
      <p className="meta">score {t.score} · {t.evidenceCount} clues</p>
      <ul>
        {t.revealedItem && <li>Revealed item: <strong>{t.revealedItem}</strong></li>}
        {t.removedItem && <li>Lost item: <strong>{t.removedItem}</strong></li>}
        {t.revealedAbility && <li>Revealed ability: <strong>{t.revealedAbility}</strong></li>}
        {t.ruledOutAbilities.length > 0 && <li>Ruled out: {t.ruledOutAbilities.join(', ')}</li>}
        {t.notes.map((n, j) => <li key={j}>{n}</li>)}
      </ul>
    </div>
  );
}
