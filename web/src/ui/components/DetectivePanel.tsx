import { useState } from 'react';
import type { ClinicResult } from '../../engine/api';
import { buildDetectiveRead, speciesNames, moveNames } from '../../engine/api';
import Panel from './Panel';

interface Observation {
  oppSpecies: string;
  evidence: 'they_hit_me' | 'i_hit_them';
  obsMove: string;
  obsPct: number;
  statusMove: boolean;
  hazardTell: boolean;
  repeatTell: boolean;
  speedTell: boolean;
}

export default function DetectivePanel({ clinic }: { clinic: ClinicResult | null }) {
  const [obs, setObs] = useState<Observation>({
    oppSpecies: '', evidence: 'they_hit_me', obsMove: '', obsPct: 43,
    statusMove: false, hazardTell: true, repeatTell: false, speedTell: false,
  });
  const [reads, setReads] = useState<unknown[]>([]);
  const set = (p: Partial<Observation>) => setObs((o) => ({ ...o, ...p }));
  const species = speciesNames().slice(0, 400);
  const moves = moveNames().slice(0, 400);

  const runDetective = () => {
    try {
      const read = buildDetectiveRead({ ...obs, team: clinic?.team ?? [] });
      setReads((r) => [read, ...r].slice(0, 8));
    } catch (e) {
      setReads((r) => [{ error: String(e) }, ...r]);
    }
  };

  return (
    <Panel id="detective-section" num="04" title="Detective" blurb="Hidden information reads"
      action={<button className="primary small" onClick={runDetective}>Update read</button>}>
      <div className="form detective pixel-form">
        <label>Opponent
          <select value={obs.oppSpecies} onChange={(e) => set({ oppSpecies: e.target.value })}>
            <option value="">— pick —</option>
            {species.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>Evidence
          <select value={obs.evidence} onChange={(e) => set({ evidence: e.target.value as Observation['evidence'] })}>
            <option value="they_hit_me">They hit me</option>
            <option value="i_hit_them">I hit them</option>
          </select>
        </label>
        <label>Move
          <select value={obs.obsMove} onChange={(e) => set({ obsMove: e.target.value })}>
            <option value="">— pick —</option>
            {moves.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        <label>Observed damage %
          <input type="number" min={1} max={100} value={obs.obsPct} onChange={(e) => set({ obsPct: +e.target.value })} />
        </label>
        <label className="check"><input type="checkbox" checked={obs.statusMove} onChange={(e) => set({ statusMove: e.target.checked })} /> Used status move</label>
        <label className="check"><input type="checkbox" checked={obs.hazardTell} onChange={(e) => set({ hazardTell: e.target.checked })} /> Took hazard damage</label>
        <label className="check"><input type="checkbox" checked={obs.repeatTell} onChange={(e) => set({ repeatTell: e.target.checked })} /> Repeated damaging move</label>
        <label className="check"><input type="checkbox" checked={obs.speedTell} onChange={(e) => set({ speedTell: e.target.checked })} /> Moved first</label>
      </div>
      <div id="detective">
        {reads.length === 0 ? <div className="empty">No detective read yet.</div> :
          reads.map((r, i) => <DetectiveReadCard key={i} read={r} />)}
      </div>
    </Panel>
  );
}

function DetectiveReadCard({ read }: { read: unknown }) {
  const r = read as Record<string, unknown>;
  if (r?.error) return <div className="empty" style={{ marginTop: 12 }}>Detective module pending: {String(r.error)}</div>;
  if (!r) return null;
  const items = (r.reads || r.observations || r.results || []) as { label?: string; detail?: string; confidence?: string }[];
  return (
    <div className="box" style={{ marginTop: 12 }}>
      <strong>{String(r.title || r.species || 'Detective read')}</strong>
      {items.length > 0 ? (
        <ul>
          {items.map((it, i) => <li key={i}><strong>{it.label}</strong> {it.detail} {it.confidence && <em className="meta">{it.confidence}</em>}</li>)}
        </ul>
      ) : (
        <pre className="code">{JSON.stringify(r, null, 2).slice(0, 2000)}</pre>
      )}
    </div>
  );
}
