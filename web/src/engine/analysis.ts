// Structural team analysis: type triage rows and role buckets.
import type { TeamMon } from './types';
import { TYPES, mult } from './types';
import { types, stats, movePriority } from './dex';

// ---------- contracts (shared shape lives in ./types) ----------

import type { TriageRow, Roles, AnalysisResult } from './types';
export type { TriageRow, Roles, AnalysisResult };
export type Severity = TriageRow['sev'];

// ---------- analyze ----------

export function analyze(t: TeamMon[]): AnalysisResult {
  const rows: TriageRow[] = TYPES.map((tp: string) => {
    const ms = t.map((p) => mult(tp, types(p)));
    const weak = ms.filter((x) => x > 1).length;
    const four = ms.filter((x) => x >= 4).length;
    const res = ms.filter((x) => x > 0 && x < 1).length;
    const imm = ms.filter((x) => x === 0).length;
    const score = weak * 2 + four * 3 - res - imm * 1.5;
    const sev: Severity = score >= 7 ? 'crit' : score >= 4 ? 'bad' : score >= 2 ? 'warn' : 'good';
    return { tp, weak, four, res, imm, score, sev };
  }).sort((a, b) => b.score - a.score);
  const roles: Roles = { hazards: [], removal: [], speed: [], priority: [], pivot: [], recovery: [], status: [], setup: [], trickRoom: [], physicalWall: [], specialWall: [], wallbreaker: [] };
  const H = ['Stealth Rock', 'Spikes', 'Toxic Spikes', 'Sticky Web'];
  const R = ['Rapid Spin', 'Defog'];
  const Piv = ['U-turn', 'Volt Switch', 'Flip Turn'];
  const Rec = ['Recover', 'Roost', 'Slack Off', 'Wish', 'Protect', 'Moonlight', 'Giga Drain', 'Drain Punch'];
  const St = ['Will-O-Wisp', 'Toxic', 'Thunder Wave', 'Spore', 'Roar'];
  const Set = ['Dragon Dance', 'Swords Dance', 'Nasty Plot', 'Calm Mind', 'Bulk Up', 'Quiver Dance'];
  t.forEach((p) => {
    const st = stats(p);
    const m = p.moves;
    if (m.some((x) => H.includes(x))) roles.hazards.push(p.species);
    if (m.some((x) => R.includes(x))) roles.removal.push(p.species);
    if (p.item === 'Choice Scarf' || m.some((x) => movePriority(x) > 0) || st.spe >= 350) roles.speed.push(p.species);
    if (m.some((x) => movePriority(x) > 0)) roles.priority.push(p.species);
    if (m.some((x) => Piv.includes(x))) roles.pivot.push(p.species);
    if (m.some((x) => Rec.includes(x))) roles.recovery.push(p.species);
    if (m.some((x) => St.includes(x))) roles.status.push(p.species);
    if (m.some((x) => Set.includes(x))) roles.setup.push(p.species);
    if (m.includes('Trick Room')) roles.trickRoom.push(p.species);
    if (st.hp + st.def > 650 || (st.def > 300 && (p.evs?.hp || 0) > 100)) roles.physicalWall.push(p.species);
    if (st.hp + st.spd > 650 || (st.spd > 300 && (p.evs?.hp || 0) > 100) || p.item === 'Assault Vest') roles.specialWall.push(p.species);
    if (['Choice Specs', 'Choice Band', 'Life Orb', 'Expert Belt', 'Charcoal', 'Flame Orb'].includes(p.item) || st.atk > 350 || st.spa > 350) roles.wallbreaker.push(p.species);
  });
  const missing = Object.entries(roles).filter(([k, v]) => !['setup', 'priority', 'trickRoom'].includes(k) && !v.length).map(([k]) => k);
  const tc: Record<string, number> = {};
  t.forEach((p) => types(p).forEach((x) => tc[x] = (tc[x] || 0) + 1));
  const red = Object.entries(tc).filter(([, c]) => c >= 4).map(([x, c]) => `${c} ${x}-types`);
  if (roles.setup.length >= 3) red.push(`${roles.setup.length} setup sweepers`);
  const issue = rows.slice(0, 5).reduce((s, r) => s + Math.max(0, r.score), 0) + missing.length * 2 + red.length;
  const status = issue > 32 ? 'Unsaveable' : issue > 22 ? 'Critical' : issue > 14 ? 'Concerning' : 'Stable';
  return { rows, roles, missing, red, issue, status, typeCounts: tc };
}

