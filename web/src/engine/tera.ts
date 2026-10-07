// Tera plan analysis — port of src/tera-plan.js (NurseJoylessTeraPlan.analyze +
// markdown). DOM rendering/injection/clipboard glue from the legacy IIFE is out
// of scope; this module is pure data.

import type { TeamMon } from './types';
import { TYPES, mult, toId, unique } from './types';
import { getSpecies, moveData, moveName } from './dex';

const clamp = (n: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
const round = (n: number): number => Math.round(Number.isFinite(n) ? n : 0);
const isRealType = (t: unknown): boolean => TYPES.includes(String(t ?? '').trim());
const isStellar = (t: unknown): boolean => toId(t) === 'stellar';

interface SpeciesData { name: string; types: string[]; baseStats: number[]; }
interface MoveInfo { name: string; type: string; category: string; power: number; priority: number; }

export interface TeraPressure { type: string; weak: number; resist: number; immune: number; pressure: number; }
export interface TeraValue { score: number; notes: string[]; }
export interface TeraDependency { score: number; notes: string[]; }
export interface TeraPlanRow {
  species: string;
  tera: string;
  defensive: number;
  offensive: number;
  dependency: number;
  notes: string[];
}
export interface TeraHunger { species: string; tera: string; reasons: string[]; score: number; }
export interface TeraPlan {
  score: number;
  status: string;
  reliabilityModifier: number;
  identityFit: number;
  worstPressures: TeraPressure[];
  bestDefensive: { species: string; tera: string; score: number; notes: string[] };
  bestOffensive: { species: string; tera: string; score: number; notes: string[] };
  hunger: TeraHunger[];
  overloaded: boolean;
  rows: TeraPlanRow[];
  notes: string[];
  recommendation: string;
}

function speciesData(mon: Partial<TeamMon> | null | undefined): SpeciesData {
  try {
    const data = getSpecies(mon?.species);
    if (data) return data;
  } catch { /* fall through */ }
  return { name: mon?.species || 'Unknown', types: ['Normal'], baseStats: [80, 80, 80, 80, 80, 80] };
}

function moveInfo(move: string): MoveInfo {
  try {
    const name = moveName(move);
    const data = moveData(name);
    if (data) return { name, type: data[0], category: String(data[1]), power: Number(data[2]) || 0, priority: Number(data[4]) || 0 };
  } catch { /* fall through */ }
  return { name: String(move || ''), type: '', category: 'Status', power: 0, priority: 0 };
}

const movesOf = (mon: Partial<TeamMon>): MoveInfo[] => (mon?.moves || []).map(moveInfo);
const hasMove = (mon: Partial<TeamMon>, matcher: (m: MoveInfo) => boolean): boolean => movesOf(mon).some(matcher);

interface RoleHints {
  recovery: boolean; setup: boolean; pivot: boolean; priority: boolean;
  hazards: boolean; removal: boolean; defensiveItem: boolean; offensiveItem: boolean;
  fast: boolean; bulky: boolean; breaker: boolean;
  bulkInvestment: number; speedInvestment: number; attackInvestment: number;
}

function roleHints(mon: Partial<TeamMon>): RoleHints {
  const moves = movesOf(mon);
  const item = String(mon?.item || '');
  const evs = mon?.evs || ({} as TeamMon['evs']);
  const data = speciesData(mon);
  const bst = data.baseStats || [80, 80, 80, 80, 80, 80];
  const bulkInvestment = (evs.hp || 0) + (evs.def || 0) + (evs.spd || 0);
  const speedInvestment = evs.spe || 0;
  const attackInvestment = (evs.atk || 0) + (evs.spa || 0);
  const recovery = moves.some((m) => /recover|roost|slackoff|moonlight|synthesis|shoreup|softboiled|wish|protect/i.test(toId(m.name)));
  const setup = moves.some((m) => /dragondance|swordsdance|nastyplot|calmmind|bulkup|quiverdance|curse/i.test(toId(m.name)));
  const pivot = moves.some((m) => /uturn|voltswitch|flipturn|partingshot|chillyreception|batonpass/i.test(toId(m.name)));
  const priority = moves.some(
    (m) => (m.priority || 0) > 0 || /suckerpunch|extremespeed|thunderclap|aquajet|iceshard|bulletpunch|machpunch|shadow sneak/i.test(String(m.name || '').toLowerCase()),
  );
  const hazards = moves.some((m) => /stealthrock|spikes|toxicspikes|stickyweb/i.test(toId(m.name)));
  const removal = moves.some((m) => /rapidspin|defog|tidyup|courtchange/i.test(toId(m.name)));
  const defensiveItem = /leftovers|heavy-duty boots|rocky helmet|assault vest|eviolite|black sludge/i.test(item);
  const offensiveItem = /choice band|choice specs|life orb|booster energy|expert belt|loaded dice|choice scarf/i.test(item);
  const fast = (bst[5] || 0) >= 100 || speedInvestment >= 200 || /choice scarf/i.test(item);
  const bulky = bulkInvestment >= 300 || recovery || defensiveItem || (bst[0] + bst[2] + bst[4] >= 285);
  const breaker = attackInvestment >= 300 || offensiveItem || setup || moves.some((m) => m.power >= 110);
  return { recovery, setup, pivot, priority, hazards, removal, defensiveItem, offensiveItem, fast, bulky, breaker, bulkInvestment, speedInvestment, attackInvestment };
}

const monLabel = (mon: Partial<TeamMon>): string => `${mon?.species || 'Unknown'}${mon?.tera ? ` Tera ${mon.tera}` : ''}`;

function pressureProfile(team: Partial<TeamMon>[]): TeraPressure[] {
  return TYPES.map((type) => {
    let weak = 0;
    let resist = 0;
    let immune = 0;
    let net = 0;
    (team || []).forEach((mon) => {
      const eff = mult(type, speciesData(mon).types || ['Normal']);
      if (eff > 1) weak += eff >= 4 ? 2 : 1;
      if (eff < 1 && eff > 0) resist += 1;
      if (eff === 0) immune += 1;
      net += eff > 1 ? eff : eff === 0 ? -1.25 : eff < 1 ? -0.55 : 0;
    });
    const pressure = Math.max(0, weak * 18 - resist * 9 - immune * 13 + net * 4);
    return { type, weak, resist, immune, pressure: round(pressure) };
  }).sort((a, b) => b.pressure - a.pressure);
}

function defensiveTeraValue(mon: Partial<TeamMon>, pressures: TeraPressure[]): TeraValue {
  const tera = String(mon?.tera || '').trim();
  if (!isRealType(tera)) {
    return { score: 0, notes: isStellar(tera) ? ['Stellar does not change defensive typing, so it is not counted as a defensive patch.'] : [] };
  }
  const natural = speciesData(mon).types || ['Normal'];
  const top = (pressures || []).slice(0, 6);
  let score = 0;
  const notes: string[] = [];
  top.forEach((p) => {
    const before = mult(p.type, natural);
    const after = mult(p.type, [tera]);
    if (before > 1 && after < before) {
      const gain = before >= 4 && after <= 1 ? 18 : before > 1 && after <= 1 ? 12 : 7;
      score += gain + Math.min(8, p.pressure / 8);
      notes.push(`patches ${p.type} pressure (${before}x -> ${after}x)`);
    } else if (before <= 1 && after > 1 && p.pressure > 30) {
      score -= 8;
      notes.push(`creates ${p.type} exposure into an already pressured lane`);
    }
  });
  const role = roleHints(mon);
  if (role.bulky) score += 10;
  if (role.recovery || role.pivot) score += 6;
  if (role.defensiveItem) score += 4;
  if (role.fast && !role.bulky) score -= 5;
  return { score: clamp(score, 0, 100), notes: unique(notes).slice(0, 4) };
}

function offensiveTeraValue(mon: Partial<TeamMon>): TeraValue {
  const tera = String(mon?.tera || '').trim();
  const moves = movesOf(mon).filter((m) => m.category !== 'Status');
  const naturalTypes = speciesData(mon).types || [];
  const role = roleHints(mon);
  let score = 0;
  const notes: string[] = [];
  if (isStellar(tera)) {
    const attackingTypes = unique(moves.map((m) => m.type)).length;
    score += Math.min(38, 12 + attackingTypes * 5);
    if (attackingTypes >= 3) notes.push('Stellar supports a mixed or broad-coverage breaker without changing defensive typing');
  } else if (isRealType(tera)) {
    const teraMoves = moves.filter((m) => m.type === tera);
    const sameType = naturalTypes.includes(tera);
    if (teraMoves.length) {
      const bestPower = Math.max(...teraMoves.map((m) => m.power || 0), 0);
      score += (sameType ? 26 : 18) + Math.min(20, bestPower / 5);
      notes.push(sameType ? `boosts existing ${tera} STAB` : `adds ${tera} damage pressure`);
    }
    if (hasMove(mon, (m) => toId(m.name) === 'terablast')) {
      score += naturalTypes.includes(tera) ? 4 : 18;
      notes.push('Tera Blast depends on spending Tera for full value');
    }
    if (tera === 'Normal' && hasMove(mon, (m) => /extremespeed|quickattack|facade|boomburst/i.test(toId(m.name)))) {
      score += 22;
      notes.push('Normal Tera boosts priority or high-value Normal damage');
    }
    if (tera === 'Dark' && /kingambit|roaring moon|meowscarada|samurott/i.test(mon?.species || '')) score += 12;
    if (tera === 'Ghost' && /dragapult|gholdengo|ceruledge/i.test(mon?.species || '')) score += 10;
    if (tera === 'Water' && hasMove(mon, (m) => /water|steam eruption|surf|hydro/i.test(String(`${m.type} ${m.name}`)))) score += 8;
    if (tera === 'Fire' && hasMove(mon, (m) => /fire|flame|eruption|overheat/i.test(String(`${m.type} ${m.name}`)))) score += 8;
  }
  if (role.setup) {
    score += 12;
    notes.push('setup user can convert one Tera turn into a win path');
  }
  if (role.priority) {
    score += 7;
    notes.push('priority makes offensive Tera more reliable into offense');
  }
  if (role.breaker) score += 8;
  if (!moves.length) score -= 10;
  return { score: clamp(score, 0, 100), notes: unique(notes).slice(0, 4) };
}

function teraDependency(mon: Partial<TeamMon>, defensive: TeraValue, offensive: TeraValue): TeraDependency {
  const role = roleHints(mon);
  const tera = String(mon?.tera || '').trim();
  let score = 0;
  const notes: string[] = [];
  if (!tera) return { score: 0, notes };
  if (defensive.score >= 45) {
    score += 2;
    notes.push('important defensive escape');
  }
  if (offensive.score >= 55 && (role.setup || role.priority || hasMove(mon, (m) => toId(m.name) === 'terablast'))) {
    score += 2;
    notes.push('important offensive conversion');
  }
  if (isStellar(tera) && offensive.score >= 45) {
    score += 1;
    notes.push('Stellar wants the once-per-game resource but gives no defensive emergency button');
  }
  if (defensive.score >= 45 && offensive.score >= 55) {
    score += 1;
    notes.push('competes between defensive bailout and offensive win line');
  }
  return { score, notes };
}

interface ReasonerLike {
  primaryIdentity?: { name?: string };
  identity?: { primary?: { name?: string }; name?: string };
  archetype?: string;
  primary?: string;
}

function inferIdentityName(reasoner: ReasonerLike | null | undefined): string {
  const candidates = [
    reasoner?.primaryIdentity?.name,
    reasoner?.identity?.primary?.name,
    reasoner?.identity?.name,
    reasoner?.archetype,
    reasoner?.primary,
  ];
  return String(candidates.find(Boolean) || '').trim();
}

interface InternalRow {
  mon: Partial<TeamMon>;
  species: string;
  tera: string;
  defensive: TeraValue;
  offensive: TeraValue;
  dependency: TeraDependency;
}

// Legacy quirk, ported verbatim: analyzeTeraPlan passes the best DEFENSIVE/
// OFFENSIVE *rows* into identityFit, but the checks below read `.score` on
// the row itself. Rows only carry `.defensive.score`/`.offensive.score`, so
// every bestDef/bestOff threshold comparison here evaluates `undefined >= n`
// and always takes the "missing" path. Do not "fix" — the legacy plan's
// identityFit output depends on it.
const rowScore = (row: InternalRow): number | undefined => (row as unknown as { score?: number }).score;

function identityFit(identity: string, team: Partial<TeamMon>[], bestDef: InternalRow, bestOff: InternalRow, hungerCount: number): TeraValue {
  const name = String(identity || '').toLowerCase();
  let score = 45;
  const notes: string[] = [];
  if (/stall|fat|balance/.test(name)) {
    score += (rowScore(bestDef) || 0) >= 45 ? 20 : -8;
    score += hungerCount <= 2 ? 10 : -8;
    notes.push((rowScore(bestDef) || 0) >= 45 ? 'defensive Tera supports the slower structure' : 'no clear defensive Tera for a slower structure');
  } else if (/hyper|offense|spam/.test(name)) {
    score += (rowScore(bestOff) || 0) >= 50 ? 20 : -10;
    score += (rowScore(bestDef) || 0) >= 35 ? 6 : 0;
    notes.push((rowScore(bestOff) || 0) >= 50 ? 'offensive Tera fits the pressure plan' : 'offensive structure lacks a clear Tera closer');
  } else if (/rain|sun|weather/.test(name)) {
    score += team.some((mon) => offensiveTeraValue(mon).score >= 55) ? 16 : 0;
    score += (rowScore(bestDef) || 0) >= 40 ? 8 : 0;
    notes.push('weather teams value Tera as either damage amplification or emergency defensive cover');
  } else if (/trick/.test(name)) {
    score += (rowScore(bestOff) || 0) >= 50 ? 14 : 0;
    score += hungerCount <= 2 ? 8 : -6;
    notes.push('Trick Room prefers one decisive breaker Tera, not several competing Teras');
  } else {
    score += (rowScore(bestDef) || 0) >= 45 ? 12 : 0;
    score += (rowScore(bestOff) || 0) >= 50 ? 12 : 0;
    score += hungerCount <= 2 ? 6 : -6;
    notes.push('mixed teams want one emergency Tera and one realistic conversion line');
  }
  return { score: clamp(score, 0, 100), notes: unique(notes) };
}

function summarizeRow(row: InternalRow, lane: 'defensive' | 'offensive') {
  const part = lane === 'defensive' ? row.defensive : row.offensive;
  return {
    species: row.mon?.species || '',
    tera: row.mon?.tera || '',
    score: round(part?.score),
    notes: (part?.notes || []).slice(0, 4),
  };
}

function teraRecommendation(score: number, overloaded: boolean, bestDef: InternalRow, bestOff: InternalRow, hunger: InternalRow[]): string {
  if (score >= 78 && !overloaded) return 'Keep the plan: one Tera can either patch the worst pressure lane or close the game without creating resource chaos.';
  if (overloaded) return `Reduce Tera dependency: ${hunger.length} teammates are asking for the same once-per-game resource. Pick one defensive emergency button and one offensive closer.`;
  if ((bestDef.defensive?.score || 0) < 35) return "Add a clearer defensive Tera that flips the team's worst pressure lane instead of only boosting damage.";
  if ((bestOff.offensive?.score || 0) < 40) return 'Add a clearer offensive Tera conversion line so Battle Reliability is not only defensive patchwork.';
  return 'Functional but matchup-sensitive: the Tera plan helps, but the team still needs careful resource timing.';
}

/**
 * Per-mon Tera plan: defensive patch value, offensive conversion value, and
 * once-per-game resource dependency. `reasoner` is an optional identity-shaped
 * object ({ primaryIdentity } or { identity.primary }) used only for its name.
 */
export function buildTeraPlan(inputTeam: Partial<TeamMon>[], reasoner?: ReasonerLike | null): TeraPlan {
  const currentTeam = Array.isArray(inputTeam) && inputTeam.length ? inputTeam : [];
  const pressures = pressureProfile(currentTeam);
  const rows: InternalRow[] = currentTeam.map((mon) => {
    const defensive = defensiveTeraValue(mon, pressures);
    const offensive = offensiveTeraValue(mon);
    const dependency = teraDependency(mon, defensive, offensive);
    return { mon, species: mon?.species || '', tera: mon?.tera || '', defensive, offensive, dependency };
  });
  const bestDefensive = rows.reduce<InternalRow>(
    (best, row) => (row.defensive.score > (best.defensive?.score ?? -1) ? row : best),
    { defensive: { score: 0, notes: [] }, mon: {}, species: '', tera: '', offensive: { score: 0, notes: [] }, dependency: { score: 0, notes: [] } },
  );
  const bestOffensive = rows.reduce<InternalRow>(
    (best, row) => (row.offensive.score > (best.offensive?.score ?? -1) ? row : best),
    { offensive: { score: 0, notes: [] }, mon: {}, species: '', tera: '', defensive: { score: 0, notes: [] }, dependency: { score: 0, notes: [] } },
  );
  const hunger = rows.filter((row) => row.dependency.score >= 2);
  const overloaded =
    hunger.length >= 4 ||
    (rows.filter((row) => row.defensive.score >= 45).length >= 3 && rows.filter((row) => row.offensive.score >= 55).length >= 2);
  const identity = inferIdentityName(reasoner);
  const fit = identityFit(identity, currentTeam, bestDefensive, bestOffensive, hunger.length);
  const defensiveScore = bestDefensive.defensive.score;
  const offensiveScore = bestOffensive.offensive.score;
  const dependencyPenalty = Math.min(28, Math.max(0, hunger.length - 2) * 9 + (overloaded ? 8 : 0));
  const redundancyBonus = rows.filter((row) => row.defensive.score >= 30 || row.offensive.score >= 35).length >= 3 ? 5 : 0;
  const score = clamp(24 + defensiveScore * 0.25 + offensiveScore * 0.24 + fit.score * 0.28 + redundancyBonus - dependencyPenalty, 0, 100);
  let status = 'Weak';
  if (score >= 78 && !overloaded) status = 'Clean';
  else if (score >= 62) status = overloaded ? 'Functional but overloaded' : 'Functional';
  else if (score >= 45) status = 'Volatile';
  const positiveModifier = score >= 80 ? 12 : score >= 70 ? 9 : score >= 60 ? 6 : score >= 50 ? 3 : 0;
  const negativeModifier = overloaded ? Math.min(10, 4 + Math.max(0, hunger.length - 3) * 2) : score < 40 ? 4 : 0;
  const reliabilityModifier = clamp(positiveModifier - negativeModifier, -10, 12);
  const notes: string[] = [];
  if (bestDefensive.mon?.species) notes.push(`Best defensive Tera: ${monLabel(bestDefensive.mon)} (${round(bestDefensive.defensive.score)}/100) ${bestDefensive.defensive.notes[0] ? `- ${bestDefensive.defensive.notes[0]}` : ''}`);
  if (bestOffensive.mon?.species) notes.push(`Best offensive Tera: ${monLabel(bestOffensive.mon)} (${round(bestOffensive.offensive.score)}/100) ${bestOffensive.offensive.notes[0] ? `- ${bestOffensive.offensive.notes[0]}` : ''}`);
  if (hunger.length) notes.push(`${hunger.length} Tera-hungry slot${hunger.length === 1 ? '' : 's'}: ${hunger.map((row) => row.species).join(', ')}`);
  if (overloaded) notes.push('Tera is overloaded: several teammates compete for the same once-per-game resource.');
  if (!currentTeam.length) notes.push('No team loaded.');
  const worstPressures = pressures.filter((p) => p.pressure > 0).slice(0, 4);
  return {
    score: round(score),
    status,
    reliabilityModifier,
    identityFit: round(fit.score),
    worstPressures,
    bestDefensive: summarizeRow(bestDefensive, 'defensive'),
    bestOffensive: summarizeRow(bestOffensive, 'offensive'),
    hunger: hunger.map((row) => ({ species: row.species, tera: row.tera, reasons: row.dependency.notes, score: row.dependency.score })),
    overloaded,
    rows: rows.map((row) => ({
      species: row.species,
      tera: row.tera,
      defensive: round(row.defensive.score),
      offensive: round(row.offensive.score),
      dependency: row.dependency.score,
      notes: unique([...(row.defensive.notes || []), ...(row.offensive.notes || []), ...(row.dependency.notes || [])]).slice(0, 5),
    })),
    notes: unique([...notes, ...fit.notes]),
    recommendation: teraRecommendation(score, overloaded, bestDefensive, bestOffensive, hunger),
  };
}

/** Markdown export — port of NurseJoylessTeraPlan.markdown. */
export function teraPlanMarkdown(plan: TeraPlan | null | undefined): string {
  if (!plan) return '';
  const lines: string[] = [];
  lines.push('## Tera Plan');
  lines.push('');
  lines.push(`**${plan.status}** — ${plan.score}/100`);
  lines.push('');
  lines.push(`- Reliability impact: ${plan.reliabilityModifier > 0 ? '+' : ''}${plan.reliabilityModifier}`);
  lines.push(`- Best defensive Tera: ${plan.bestDefensive.species || 'None'}${plan.bestDefensive.tera ? ` Tera ${plan.bestDefensive.tera}` : ''} (${plan.bestDefensive.score}/100)`);
  if ((plan.bestDefensive.notes || [])[0]) lines.push(`  - ${plan.bestDefensive.notes[0]}`);
  lines.push(`- Best offensive Tera: ${plan.bestOffensive.species || 'None'}${plan.bestOffensive.tera ? ` Tera ${plan.bestOffensive.tera}` : ''} (${plan.bestOffensive.score}/100)`);
  if ((plan.bestOffensive.notes || [])[0]) lines.push(`  - ${plan.bestOffensive.notes[0]}`);
  lines.push(`- Tera dependency: ${plan.hunger.length ? plan.hunger.map((x) => `${x.species} (${x.tera})`).join(', ') : 'low'}`);
  lines.push(`- Verdict: ${plan.recommendation}`);
  lines.push('');
  return lines.join('\n');
}
