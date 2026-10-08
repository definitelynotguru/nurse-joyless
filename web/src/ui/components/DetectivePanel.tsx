import { useState } from 'react';
import type { ClinicResult } from '../../engine/api';
import { buildDetectiveRead, speciesNames, moveNames } from '../../engine/api';
import type { DetectiveRead } from '../../engine/detective';
import Panel from './Panel';

interface Observation {
  oppSpecies: string;
  evidence: 'they_hit_me' | 'i_hit_them' | 'clue_only';
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
  const [reads, setReads] = useState<(DetectiveRead | { error: string })[]>([]);
  const set = (p: Partial<Observation>) => setObs((o) => ({ ...o, ...p }));
  const species = speciesNames();
  const moves = moveNames();

  const runDetective = () => {
    try {
      const read = buildDetectiveRead({
        species: obs.oppSpecies,
        evidence: obs.evidence,
        move: obs.obsMove || undefined,
        observedDamage: obs.evidence === 'clue_only' ? null : obs.obsPct,
        usedStatusMove: obs.statusMove,
        tookHazardDamage: obs.hazardTell,
        repeatedDamagingMove: obs.repeatTell,
        movedFirst: obs.speedTell,
        team: clinic?.team ?? [],
      });
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
            <option value="clue_only">Clues only</option>
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

function DetectiveReadCard({ read }: { read: DetectiveRead | { error: string } }) {
  if ('error' in read) return <div className="empty" style={{ marginTop: 12 }}>{read.error}</div>;
  const { summary, top, eliminated } = read;
  return (
    <div className="box" style={{ marginTop: 12 }}>
      <strong>{read.input.species || 'Detective read'} — <span className={summary.confidence.label === 'High' ? 'good' : summary.confidence.label === 'Blocked' ? 'bad' : 'warn'}>{summary.confidence.label}</span></strong>
      <p>{summary.verdict}</p>
      {top.slice(0, 4).map((c, i) => (
        <div className="set" key={i} style={{ marginTop: 8 }}>
          <h3>{Math.round(c.prob * 100)}% — {c.item} · {c.ability}</h3>
          <p className="meta">{c.nature} {c.profile}</p>
          {c.reasons.slice(0, 3).map((r, j) => <p key={j} className="meta">· {r}</p>)}
        </div>
      ))}
      {eliminated.length > 0 && <p className="meta" style={{ marginTop: 8 }}>Eliminated: {eliminated.slice(0, 5).map(c => `${c.item} ${c.ability}`).join(' · ')}</p>}
      {summary.notes.slice(0, 3).map((n, i) => <p key={i} className="meta">· {n}</p>)}
    </div>
  );
}
