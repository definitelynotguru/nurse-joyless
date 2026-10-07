import { useState } from 'react';
import type { ClinicResult } from '../../engine/api';
import { teamToText } from '../../engine/api';
import Panel from './Panel';

export default function Prescription({ clinic, onApply }: { clinic: ClinicResult | null; onApply: (teamText: string) => void }) {
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [prescription, setPrescription] = useState('');

  const toggle = (i: number) => setFavorites((f) => {
    const n = new Set(f); n.has(i) ? n.delete(i) : n.add(i); return n;
  });

  const rebuild = () => {
    if (!clinic) return;
    const suggs = clinic.suggestions ?? [];
    const keep = clinic.team.filter((_, i) => favorites.has(i));
    const used = new Set(keep.map((m) => m.species.toLowerCase()));
    const add: string[] = [];
    for (const s of suggs) {
      if (keep.length + add.length >= 6) break;
      if (s.set && !used.has(s.species.toLowerCase())) { add.push(s.set); used.add(s.species.toLowerCase()); }
    }
    const sets = [...keep.map((m) => teamToText([m]).trim()), ...add];
    setPrescription(sets.join('\n\n'));
  };

  return (
    <Panel id="prescription-section" num="05" title="Prescription" blurb="Preserve favorites, fix the crime scene"
      action={<button className="primary small" disabled={!clinic} onClick={rebuild}>Prescribe rebuild</button>}>
      {!clinic ? <div className="empty">Analyze a team first.</div> : (
        <>
          <div id="favorites">
            <p className="label-title">Emotional core — keep these:</p>
            <div className="form pixel-form" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {clinic.team.map((m, i) => (
                <label key={i} className="check">
                  <input type="checkbox" checked={favorites.has(i)} onChange={() => toggle(i)} /> {m.species}
                </label>
              ))}
            </div>
          </div>
          <div id="prescription" style={{ marginTop: 14 }}>
            {prescription ? (
              <>
                <pre className="code" style={{ maxHeight: 360, overflow: 'auto' }}>{prescription}</pre>
                <button className="primary small" style={{ marginTop: 10 }} onClick={() => onApply(prescription)}>Adopt rebuilt team</button>
              </>
            ) : <div className="empty">No prescription yet.</div>}
          </div>
        </>
      )}
    </Panel>
  );
}
