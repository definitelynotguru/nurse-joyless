import { useMemo, useState } from 'react';
import type { ClinicResult } from '../../engine/api';
import {
  dmg, nHitChance, normalizeBattleState, battleStateSummary, swapBattleState,
  survivalMatrix, moveData, TYPES, smogonCalcRange, type BattleStateInput, type KoOptions, type KoRoll,
} from '../../engine/api';
import Panel from './Panel';

const PROTECT_OPTS = [['none', 'None'], ['reflect', 'Reflect'], ['screen', 'Light Screen'], ['auroraveil', 'Aurora Veil']];
const STAGE_OPTS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label>{label}{children}</label>;
}

export default function KoLab({ clinic }: { clinic: ClinicResult | null }) {
  const team = useMemo(() => clinic?.team ?? [], [clinic]);
  const [att, setAtt] = useState(0);
  const [def, setDef] = useState(1);
  const [mv, setMv] = useState('');
  const [hp, setHp] = useState(100);
  const [state, setState] = useState<BattleStateInput>({});
  const [attTera, setAttTera] = useState(false);
  const [defTera, setDefTera] = useState(false);
  const [attTeraType, setAttTeraType] = useState('Normal');
  const [defTeraType, setDefTeraType] = useState('Steel');
  const [hazards, setHazards] = useState('none');

  const attacker = team[att];
  const defender = team[def];
  const attMoves = attacker?.moves?.filter((m) => (moveData(m)?.[2] ?? 0) > 0) ?? [];
  const move = attMoves.includes(mv) ? mv : attMoves[0] ?? '';

  const set = (patch: Partial<BattleStateInput>) => setState((s) => ({ ...s, ...patch }));

  const result: KoRoll | null = useMemo(() => {
    if (!attacker || !defender || !move) return null;
    const opt = {
      ...normalizeBattleState(state),
      extraEndSteps: state.extraEndSteps ?? 0,
      hpPct: hp,
      hazards,
      attackerTera: attTera,
      attackerTeraType: attTeraType,
      defenderTera: defTera,
      defenderTeraType: defTeraType,
    } as KoOptions;
    // shallow clones: the ported dmg() may annotate fields on the mons it receives
    return dmg({ ...attacker }, { ...defender }, move, opt);
  }, [attacker, defender, move, state, hp, hazards, attTera, defTera, attTeraType, defTeraType]);

  const sd = useMemo(() => {
    if (!attacker || !defender || !move) return null;
    return smogonCalcRange({ ...attacker }, { ...defender }, move, {
      attackerTeraType: attTera ? attTeraType : undefined,
      defenderTeraType: defTera ? defTeraType : undefined,
    });
  }, [attacker, defender, move, attTera, attTeraType, defTera, defTeraType]);

  const matrix = useMemo(() => (team.length >= 2 ? survivalMatrix(team.map(m => ({ ...m }))) : null), [team]);

  const koTwo = result ? nHitChance(result, 2) : null;
  const koThree = result ? nHitChance(result, 3) : null;

  return (
    <Panel id="ko-section" num="03" title="KO Lab" blurb="Damage, odds, survival"
      action={<>
        <button className="ghost small" onClick={() => setState(swapBattleState(state))} title="Swap attacker/defender context">Swap sides</button>
      </>}>
      {!team.length ? <div className="empty">Analyze a team first.</div> : (
        <>
          <div className="form pixel-form detective">
            <Field label="Attacker">
              <select value={att} onChange={(e) => { setAtt(+e.target.value); setMv(''); }}>
                {team.map((m, i) => <option key={i} value={i}>{m.species}</option>)}
              </select>
            </Field>
            <Field label="Move">
              <select value={move} onChange={(e) => setMv(e.target.value)}>
                {attMoves.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Defender">
              <select value={def} onChange={(e) => setDef(+e.target.value)}>
                {team.map((m, i) => <option key={i} value={i}>{m.species}</option>)}
              </select>
            </Field>
            <Field label="Defender HP %">
              <input type="number" min={1} max={100} value={hp} onChange={(e) => setHp(+e.target.value)} />
            </Field>
            <Field label="Hazards">
              <select value={hazards} onChange={(e) => setHazards(e.target.value)}>
                <option value="none">None</option><option value="rocks">Stealth Rock</option>
                <option value="spikes1">1 Spikes</option><option value="spikes2">2 Spikes</option><option value="spikes3">3 Spikes</option>
              </select>
            </Field>
            <Field label="Weather">
              <select value={state.weather || 'none'} onChange={(e) => set({ weather: e.target.value })}>
                <option value="none">Neutral</option><option value="rain">Rain</option>
                <option value="sun">Sun</option><option value="sand">Sand</option><option value="snow">Snow</option>
              </select>
            </Field>
            <Field label="Terrain">
              <select value={state.terrain || 'none'} onChange={(e) => set({ terrain: e.target.value })}>
                <option value="none">None</option><option value="electric">Electric</option>
                <option value="grassy">Grassy</option><option value="psychic">Psychic</option><option value="misty">Misty</option>
              </select>
            </Field>
            <Field label="Attacker screen">
              <select value={state.attackerProtect || 'none'} onChange={(e) => set({ attackerProtect: e.target.value })}>
                {PROTECT_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Defender screen">
              <select value={state.defenderProtect || 'none'} onChange={(e) => set({ defenderProtect: e.target.value })}>
                {PROTECT_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Att. offense stage">
              <select value={state.attackerOffenseStage ?? 0} onChange={(e) => set({ attackerOffenseStage: +e.target.value })}>
                {STAGE_OPTS.map((v) => <option key={v} value={v}>{v > 0 ? `+${v}` : v}</option>)}
              </select>
            </Field>
            <Field label="Att. bulk stage">
              <select value={state.attackerBulkStage ?? 0} onChange={(e) => set({ attackerBulkStage: +e.target.value })}>
                {STAGE_OPTS.map((v) => <option key={v} value={v}>{v > 0 ? `+${v}` : v}</option>)}
              </select>
            </Field>
            <Field label="Def. offense stage">
              <select value={state.defenderOffenseStage ?? 0} onChange={(e) => set({ defenderOffenseStage: +e.target.value })}>
                {STAGE_OPTS.map((v) => <option key={v} value={v}>{v > 0 ? `+${v}` : v}</option>)}
              </select>
            </Field>
            <Field label="Def. bulk stage">
              <select value={state.defenderBulkStage ?? 0} onChange={(e) => set({ defenderBulkStage: +e.target.value })}>
                {STAGE_OPTS.map((v) => <option key={v} value={v}>{v > 0 ? `+${v}` : v}</option>)}
              </select>
            </Field>
            <Field label="Attacker status">
              <select value={state.attackerStatus || 'none'} onChange={(e) => set({ attackerStatus: e.target.value })}>
                <option value="none">Healthy</option><option value="burn">Burned</option>
                <option value="poison">Poisoned</option><option value="toxic">Badly poisoned</option><option value="paralysis">Paralyzed</option>
              </select>
            </Field>
            <label className="check"><input type="checkbox" checked={!!state.helpingHand} onChange={(e) => set({ helpingHand: e.target.checked })} /> Helping Hand</label>
            <label className="check"><input type="checkbox" checked={!!state.spreadDamage} onChange={(e) => set({ spreadDamage: e.target.checked })} /> Spread hit</label>
            <label className="check"><input type="checkbox" checked={!!state.criticalHit} onChange={(e) => set({ criticalHit: e.target.checked })} /> Critical hit</label>
            <label className="check"><input type="checkbox" checked={attTera} onChange={(e) => setAttTera(e.target.checked)} /> Attacker Tera</label>
            <Field label="Att. tera type">
              <select value={attTeraType} onChange={(e) => setAttTeraType(e.target.value)} disabled={!attTera}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <label className="check"><input type="checkbox" checked={defTera} onChange={(e) => setDefTera(e.target.checked)} /> Defender Tera</label>
            <Field label="Def. tera type">
              <select value={defTeraType} onChange={(e) => setDefTeraType(e.target.value)} disabled={!defTera}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <div id="ko">
            {!result ? <div className="empty">No KO read yet.</div> : (
              <div className="metric-grid" style={{ marginTop: 16 }}>
                <div className={`metric-card ${result.ko >= 1 ? 'bad' : (koTwo ?? 0) >= 1 ? 'warn' : 'good'}`}>
                  <span>Damage range</span><strong>{result.minp.toFixed(1)}–{result.maxp.toFixed(1)}%</strong>
                </div>
                <div className="metric-card"><span>OHKO</span><strong>{(result.ko * 100).toFixed(1)}%</strong></div>
                {koTwo !== null && <div className="metric-card"><span>2HKO</span><strong>{(koTwo * 100).toFixed(1)}%</strong></div>}
                {koThree !== null && <div className="metric-card"><span>3HKO</span><strong>{(koThree * 100).toFixed(1)}%</strong></div>}
                <div className="metric-card"><span>Accuracy</span><strong>{(result.hit * 100).toFixed(0)}%</strong></div>
                {result.blockedBy && <div className="metric-card bad"><span>Priority blocked by</span><strong style={{ fontSize: 16 }}>{result.blockedBy}</strong></div>}
              </div>
            )}
            {result && (
              <p className="meta" style={{ marginTop: 10 }}>
                {battleStateSummary(state) || 'Clean conditions'}
                {result.defensiveAbilityNotes?.length ? ` · ${result.defensiveAbilityNotes.join(' · ')}` : ''}
              </p>
            )}
            {sd && <p className="meta" style={{ marginTop: 6 }} title={sd.desc}>Showdown calc: {sd.desc}</p>}
          </div>
          {matrix && (
            <>
              <h3 style={{ marginTop: 22 }}>Survival matrix — best move each attacker has into each defender</h3>
              <div className="triage-table" style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>Att ↓ / Def →</th>{matrix.defenders.map((d) => <th key={d}>{d}</th>)}</tr></thead>
                  <tbody>
                    {matrix.attackers.map((a, i) => (
                      <tr key={a}>
                        <td><strong>{a}</strong></td>
                        {matrix.cells[i].map((c, j) => (
                          <td key={j} className={c.ko >= 1 ? 'bad' : c.hko > 0 && c.hko <= 2 ? 'warn' : c.maxp > 0 ? '' : 'muted'}
                            title={c.bestMove !== '—' ? `${c.bestMove}: ${c.minp.toFixed(1)}–${c.maxp.toFixed(1)}%` : 'no damaging move'}>
                            {c.maxp > 0 ? `${c.minp.toFixed(0)}–${c.maxp.toFixed(0)}%` : '—'}{c.hko ? ` (${c.hko}HKO)` : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </Panel>
  );
}
