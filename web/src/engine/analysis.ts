// Structural team analysis: type triage rows, role buckets, signals, risk list,
// and the report-level scoreGroupSummary/verdict helpers from src/app.js.
import type { TeamMon } from './types';
import { TYPES, mult, clamp, unique } from './types';
import { types, stats, movePriority, moveData } from './dex';
import type { IdentityResult, SynergyResult, MatchupRow } from './identity';

// ---------- contracts ----------

export type Severity = 'crit' | 'bad' | 'warn' | 'good';

export interface TriageRow {
  tp: string;
  weak: number;
  four: number;
  res: number;
  imm: number;
  score: number;
  sev: Severity | string;
}

export interface Roles {
  hazards: string[];
  removal: string[];
  speed: string[];
  priority: string[];
  pivot: string[];
  recovery: string[];
  status: string[];
  setup: string[];
  trickRoom: string[];
  physicalWall: string[];
  specialWall: string[];
  wallbreaker: string[];
  [key: string]: string[];
}

export interface AnalysisResult {
  rows: TriageRow[];
  roles: Roles;
  missing: string[];
  red: string[];
  issue: number;
  status: string;
  typeCounts: Record<string, number>;
}

export interface TeamSignals {
  count: number;
  typeCounts: Record<string, number>;
  moveTypes: Record<string, number>;
  items: Record<string, number>;
  abilities: Record<string, number>;
  moves: Record<string, number>;
  offensiveItems: number;
  choiceItems: number;
  boots: number;
  leftovers: number;
  setup: number;
  hazards: number;
  removal: number;
  recovery: number;
  status: number;
  pivot: number;
  priority: number;
  trickRoom: number;
  walls: number;
  wallbreakers: number;
  highSpeed: number;
  slowAbusers: number;
  zeroSpe: number;
  weather: { sun: boolean; rain: boolean; sand: boolean; snow: boolean };
  weatherAbusers: number;
  magicBounce: boolean;
}

export interface RiskEntry {
  level: Severity | string;
  type: string;
  detail: string;
}

/** Minimal reasoning-report shape scoreGroupSummary/verdict consume. */
export interface ReportLike {
  identity?: Pick<IdentityResult, 'primary'> | { primary?: { name?: string; score?: number } } | null;
  synergy?: Pick<SynergyResult, 'issues'> & Partial<Pick<SynergyResult, 'fieldControl'>> & { scores?: Partial<Record<keyof SynergyResult['scores'], number>> };
  matchups?: Pick<MatchupRow, 'score'>[] | null;
}

export interface ScoreGroupSummary {
  identityConfidence: number;
  structuralQuality: number;
  battleReliability: number;
  matchupAverage: number;
}

// ---------- analyze ----------

export function analyze(t: TeamMon[]): AnalysisResult {
  const rows: TriageRow[] = TYPES.map((tp: string) => {
    const ms = t.map((p) => mult(tp, types(p)));
    const weak = ms.filter((x) => x > 1).length;
    const four = ms.filter((x) => x >= 4).length;
    const res = ms.filter((x) => x > 0 && x < 1).length;
    const imm = ms.filter((x) => x === 0).length;
    const score = weak * 2 + four * 3 - res - imm * 1.5;
    const sev = score >= 7 ? 'crit' : score >= 4 ? 'bad' : score >= 2 ? 'warn' : 'good';
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

// ---------- teamSignals ----------

export function teamSignals(t: TeamMon[], a: AnalysisResult): TeamSignals {
  const s = {
    count: t.length, typeCounts: {} as Record<string, number>, moveTypes: {} as Record<string, number>,
    items: {} as Record<string, number>, abilities: {} as Record<string, number>, moves: {} as Record<string, number>,
    offensiveItems: 0, choiceItems: 0, boots: 0, leftovers: 0,
    setup: a.roles.setup.length, hazards: a.roles.hazards.length, removal: a.roles.removal.length,
    recovery: a.roles.recovery.length, status: a.roles.status.length, pivot: a.roles.pivot.length,
    priority: a.roles.priority.length, trickRoom: a.roles.trickRoom.length,
    walls: unique([...a.roles.physicalWall, ...a.roles.specialWall]).length,
    wallbreakers: a.roles.wallbreaker.length,
    highSpeed: 0, slowAbusers: 0, zeroSpe: 0,
    weather: { sun: false, rain: false, sand: false, snow: false },
    weatherAbusers: 0, magicBounce: false,
  };
  t.forEach((p) => {
    types(p).forEach((x) => s.typeCounts[x] = (s.typeCounts[x] || 0) + 1);
    s.items[p.item] = (s.items[p.item] || 0) + 1;
    s.abilities[p.ability] = (s.abilities[p.ability] || 0) + 1;
    if (['Choice Specs', 'Choice Band', 'Life Orb', 'Expert Belt', 'Charcoal', 'Flame Orb'].includes(p.item)) s.offensiveItems++;
    if (p.item.startsWith('Choice')) s.choiceItems++;
    if (p.item === 'Heavy-Duty Boots') s.boots++;
    if (p.item === 'Leftovers') s.leftovers++;
    if (['Drought'].includes(p.ability)) s.weather.sun = true;
    if (['Drizzle'].includes(p.ability)) s.weather.rain = true;
    if (['Sand Stream'].includes(p.ability)) s.weather.sand = true;
    if (['Snow Warning'].includes(p.ability)) s.weather.snow = true;
    if (['Solar Power', 'Chlorophyll', 'Swift Swim', 'Sand Rush', 'Slush Rush'].includes(p.ability)) s.weatherAbusers++;
    if (p.ability === 'Magic Bounce') s.magicBounce = true;
    const st = stats(p);
    if (st.spe >= 330) s.highSpeed++;
    if ((p.ivs?.spe === 0 || ['Brave', 'Quiet', 'Relaxed', 'Sassy'].includes(p.nature)) && (st.atk > 280 || st.spa > 280)) s.slowAbusers++;
    if (p.ivs?.spe === 0) s.zeroSpe++;
    p.moves.forEach((m) => {
      s.moves[m] = (s.moves[m] || 0) + 1;
      const md = moveData(m);
      if (md && md[1] !== 'Status') s.moveTypes[md[0]] = (s.moveTypes[md[0]] || 0) + 1;
    });
  });
  return s;
}

// ---------- small detect helpers used by the reasoner ----------

export function hasRole(a: AnalysisResult, r: string): boolean {
  return (a.roles[r] || []).length > 0;
}

export function resistCount(t: TeamMon[], tp: string): number {
  return t.filter((p) => mult(tp, types(p)) < 1).length + t.filter((p) => mult(tp, types(p)) === 0).length * 1.5;
}

export function weakCount(t: TeamMon[], tp: string): number {
  return t.filter((p) => mult(tp, types(p)) > 1).length;
}

export function typeCoverageCount(s: Pick<TeamSignals, 'moveTypes'>): number {
  return Object.keys(s.moveTypes).filter((t) => s.moveTypes[t] > 0).length;
}

// ---------- riskList ----------

export function riskList(t: TeamMon[], a: AnalysisResult, s?: Pick<TeamSignals, 'typeCounts' | 'removal' | 'hazards' | 'trickRoom'> | null): RiskEntry[] {
  const sig = s || teamSignals(t, a);
  const out: RiskEntry[] = [];
  a.rows.slice(0, 4).forEach((r) => { if (r.score >= 4) out.push({ level: r.sev, type: r.tp, detail: `${r.weak} weak, ${r.res} resist, ${r.imm} immune` }); });
  if (Math.max(...Object.values(sig.typeCounts), 0) >= 4) {
    const [type, count] = Object.entries(sig.typeCounts).sort((x, y) => y[1] - x[1])[0];
    out.push({ level: 'crit', type: 'Type stacking', detail: `${count} ${type}-type members create repeated matchup liabilities` });
  }
  if (!sig.removal) out.push({ level: 'bad', type: 'Hazard control', detail: 'No removal detected' });
  if (!sig.hazards) out.push({ level: 'warn', type: 'Hazard pressure', detail: 'No entry hazards detected' });
  if (sig.trickRoom && sig.trickRoom < 2) out.push({ level: 'warn', type: 'Trick Room reliability', detail: 'Only one Trick Room setter detected' });
  return out.slice(0, 8);
}

// ---------- report-level helpers ----------

export function scoreGroupSummary(r: ReportLike | null | undefined): ScoreGroupSummary {
  const s = r?.synergy?.scores || {};
  const m = r?.matchups || [];
  const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + (+b || 0), 0) / (arr.length || 1));
  const matchupAvg = avg(m.map((x) => x.score));
  const structuralQuality = avg([s.typeSynergy, s.roleCompression, s.offensiveCoverage, s.defensiveBackbone, s.fieldControl, s.speedControl, s.winReliability].map((x) => x || 0));
  const battleReliability = avg([s.winReliability || 0, s.defensiveBackbone || 0, s.fieldControl || 0, s.speedControl || 0, matchupAvg]);
  return { identityConfidence: r?.identity?.primary?.score || 0, structuralQuality, battleReliability, matchupAverage: matchupAvg };
}

export function verdict(r: ReportLike | null | undefined): string {
  const p = r?.identity?.primary?.name || '';
  const g = scoreGroupSummary(r);
  const issues = (r?.synergy?.issues || []).slice(0, 2).map((x) => x.title).join(' + ');
  const caution = `Identity confidence is ${g.identityConfidence}/100, structural quality is ${g.structuralQuality}/100, and battle reliability is ${g.battleReliability}/100.`;
  if (p.includes('Hazard')) return `This is hazard-centric only if it can deny removal and abuse switches. ${caution} Next medicine: ${issues || 'tighten removal denial and chip loops'}.`;
  if (p.includes('Balance')) return `This is trying to be balance, not automatically a perfect team. ${caution} Next medicine: ${issues || 'reduce overload and protect the win path'}.`;
  if (p.includes('Dragon')) return `This is Dragon pressure with a siren on it. ${caution} Patch Fairy/Ice/Dragon counterplay before trusting it.`;
  if (p.includes('Sun Room')) return `This is Sun Room: create sun, flip speed with Trick Room, and cash out quickly. ${caution}`;
  if (p.includes('Trick Room')) return `This is speed inversion. ${caution} Protect setters and avoid wasting Room turns.`;
  if (p.includes('Stall')) return `This is low-tempo attrition only if offensive pressure stays minimal. ${caution}`;
  return `The team has a readable plan. ${caution} Patch the weakest matchup before calling it healthy.`;
}

// clamp is re-exported for parity with the legacy reasoner surface (unused locally).
void clamp;
