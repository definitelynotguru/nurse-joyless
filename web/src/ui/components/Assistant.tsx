import { useState } from 'react';
import type { ClinicResult, Suggestion } from '../../engine/api';
import { spriteUrl, fetchSmogonSets, mergeSuggestSets } from '../../engine/api';
import Panel from './Panel';

export default function Assistant({ clinic, onApply, onReplace, onRefresh }: {
  clinic: ClinicResult | null;
  onApply: (setText: string) => void;
  onReplace: (teamIndex: number, setText: string) => void;
  onRefresh: () => void;
}) {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const suggs = clinic?.suggestions ?? [];

  const goOnline = async () => {
    setLoading(true);
    try {
      const sets = await fetchSmogonSets('gen9ou');
      if (Object.keys(sets).length) { mergeSuggestSets(sets); setOnline(true); onRefresh(); }
    } catch { setOnline(false); }
    setLoading(false);
  };

  return (
    <Panel id="assistant-section" num="10" title="Team Builder Assistant" blurb="Suggest a Pokémon" art="team-builder-assistant.png"
      action={<button className="ghost small" onClick={goOnline} disabled={loading}>{loading ? 'Loading…' : online ? 'Online dex ✓' : 'Use Online Pokédex'}</button>}>
      {!clinic ? <div className="empty">Run Sparring Lab or analyze a team to receive targeted additions.</div> : (
        <div className="suggest-grid">
          {suggs.slice(0, 6).map((s) => <SuggestCard key={s.species} s={s} onApply={onApply} onReplace={onReplace} />)}
          {suggs.length === 0 && <div className="empty">No targeted additions — the team is already covering its bases.</div>}
        </div>
      )}
    </Panel>
  );
}

function SuggestCard({ s, onApply, onReplace }: {
  s: Suggestion;
  onApply: (setText: string) => void;
  onReplace: (teamIndex: number, setText: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={`suggest-card ${menuOpen ? 'menu-open' : ''}`}>
      <div className="suggest-card-head">
        <div>
          <img className="sprite" src={spriteUrl(s.species)} alt={s.species} width={72} height={72}
            onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
          <strong>{s.species}</strong>
        </div>
        {s.set && <button className="suggest-more-btn" onClick={() => setMenuOpen(!menuOpen)} title="Options">⋯</button>}
      </div>
      <div className="odds">{s.score}</div>
      <p className="meta">{s.roles?.join(' · ')}{s.lane ? ` · ${s.lane}` : ''}</p>
      <ul>{(s.why || []).slice(0, 4).map((w, i) => <li key={i}>{w}</li>)}</ul>
      {s.set && (
        <>
          <details>
            <summary>Suggested set</summary>
            <pre className="code">{s.set}</pre>
          </details>
          <div className="suggest-menu">
            <p className="suggest-menu-title">Actions</p>
            <button className="suggest-menu-item" onClick={() => onApply(s.set)}>Add to team</button>
            {s.swapOptions?.slice(0, 3).map((sw, i) => (
              <button key={i} className="suggest-menu-item" onClick={() => onReplace(sw.teamIndex, s.set)}
                title={sw.reasons?.join(', ')}>
                Replace {sw.species} ({sw.score})
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
