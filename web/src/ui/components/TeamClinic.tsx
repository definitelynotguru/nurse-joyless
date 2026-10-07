import { useState } from 'react';
import type { ClinicResult } from '../../engine/api';
import Panel from './Panel';
import MonCard from './MonCard';

interface Props {
  teamText: string;
  setTeamText: (s: string) => void;
  clinic: ClinicResult | null;
  onAnalyze: () => void;
  onShare: () => void;
}

function pokepasteRawUrl(input: string): string | null {
  const m = input.trim().match(/(?:pokepast\.es\/)?([0-9a-zA-Z]+)\s*$/) || input.trim().match(/pokepast\.es\/([0-9a-zA-Z]+)/);
  return m ? `https://pokepast.es/${m[1]}/raw` : null;
}

export default function TeamClinic({ teamText, setTeamText, clinic, onAnalyze, onShare }: Props) {
  const [pasteUrl, setPasteUrl] = useState('');
  const [pasteErr, setPasteErr] = useState('');
  const [loading, setLoading] = useState(false);

  const importPaste = async () => {
    const url = pokepasteRawUrl(pasteUrl);
    if (!url) { setPasteErr('Not a pokepast.es link.'); return; }
    setPasteErr(''); setLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const text = await res.text();
      if (!text.trim()) throw new Error('empty');
      setTeamText(text.trim());
      setPasteUrl('');
    } catch {
      setPasteErr('Could not fetch that paste.');
    } finally { setLoading(false); }
  };

  return (
    <Panel id="team-clinic" num="01" title="Team Clinic" blurb="Paste the patient"
      action={<>
        <button className="primary small" onClick={onAnalyze}>Analyze patient</button>
        <button className="ghost small" onClick={onShare}>Copy share link</button>
      </>}>
      <div className="workbench two-column">
        <div className="terminal-card">
          <label className="label-title" htmlFor="teamInput">Showdown importable team</label>
          <textarea id="teamInput" spellCheck={false} value={teamText}
            onChange={(e) => setTeamText(e.target.value)}
            placeholder="Charizard @ Heavy-Duty Boots&#10;Ability: Blaze&#10;EVs: 4 Def / 252 SpA / 252 Spe&#10;Timid Nature&#10;- Flamethrower&#10;..." />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input value={pasteUrl} onChange={(e) => setPasteUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') importPaste(); }}
              placeholder="pokepast.es/… link or id" style={{ flex: 1 }} />
            <button className="ghost small" onClick={importPaste} disabled={loading}>
              {loading ? 'Importing…' : 'Import paste'}
            </button>
          </div>
          {pasteErr && <p className="meta" style={{ color: 'var(--bad)' }}>{pasteErr}</p>}
        </div>
        <div id="teamCards" className="cards">
          {clinic ? clinic.team.map((m, i) => <MonCard key={i} mon={m} />) : (
            <div className="empty">No patient on the chart yet. Paste a team or load the demo.</div>
          )}
        </div>
      </div>
    </Panel>
  );
}
