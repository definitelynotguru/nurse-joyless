// Suggestion engine — port of the effective v35 pipeline in app.js:
//   smogonCandidatePool + candidateRoles + scoreSmogonCandidate (raw candidates)
//   → v35LaneScore / v35AllCandidates / diversifySuggestions (lane ranking)
//   → suggestAdditions (public entry, app.js:2419)
// plus needsForReport, swapOptionsFor, enrichSuggestionsFromApi and the
// SmogonProvider data layer. localStorage caching from the browser version is
// replaced with an in-memory cache so the module stays DOM-free.

import type {
  AnalysisResult,
  IdentityResult,
  MatchupRow,
  Suggestion,
  SynergyResult,
  TeamMon,
  TeamProfile,
  TriageRow,
  ValidationRow,
} from './types';
import { clamp, mult, unique } from './types';
import { id, resolveSpeciesName, types } from './dex';
import { SUGGEST_SETS } from './data-sets';
import { detectIdentities, evaluateSynergy, profileTeam } from './identity';

// ---------------------------------------------------------------------------
// Report plumbing types. The authored ReasoningReport lives in types.ts; these
// structural aliases keep this module decoupled from the exact contract.

export interface ReportMon {
  species: string;
  item?: string;
  ability?: string;
  tera?: string;
  nature?: string;
  evs?: TeamMon['evs'];
  ivs?: TeamMon['ivs'];
  moves?: string[];
  types?: string[];
}

/** Structural report shape consumed by the suggest/needs/swap helpers. */
export interface SuggestReport {
  generatedAt?: string;
  team?: ReportMon[];
  profile?: TeamProfile | null;
  identity?: IdentityResult | null;
  synergy?: SynergyResult | null;
  matchups?: MatchupRow[];
  validation?: ValidationRow[];
  diagnosis?: { status?: string; topWeaknesses?: TriageRow[]; missingRoles?: string[]; redundancy?: string[] };
  suggestions?: Suggestion[];
  suggestionPool?: Suggestion[];
  suggestionSource?: string;
  needs?: { label: string; why: string }[];
}

interface Candidate { species: string; set: string; }
interface ScoredCandidate extends Candidate {
  score: number;
  roles: string[];
  why: string[];
  source: string;
}
export interface LaneSuggestion extends ScoredCandidate {
  lane: string;
  laneScore: number;
}

// ---------------------------------------------------------------------------
// Fallback set table — legacy SMOGON_FALLBACK_SETS = SUGGEST_SETS + __ADVSETS +
// the inline extras (data-sets.ts only carries the SUGGEST_SETS core).

const EXTRA_FALLBACK_SETS: Record<string, string> = {
  Amoonguss: `Amoonguss @ Leftovers\nAbility: Regenerator\nTera Type: Water\nEVs: 252 HP / 172 Def / 84 SpD\nBold Nature\nIVs: 0 Atk\n- Spore\n- Giga Drain\n- Sludge Bomb\n- Foul Play`,
  Toxapex: `Toxapex @ Heavy-Duty Boots\nAbility: Regenerator\nTera Type: Steel\nEVs: 252 HP / 252 Def / 4 SpD\nBold Nature\n- Recover\n- Toxic\n- Haze\n- Surf`,
  Alomomola: `Alomomola @ Heavy-Duty Boots\nAbility: Regenerator\nTera Type: Ghost\nEVs: 4 HP / 252 Def / 252 SpD\nRelaxed Nature\n- Wish\n- Protect\n- Flip Turn\n- Scald`,
  'Slowking-Galar': `Slowking-Galar @ Heavy-Duty Boots\nAbility: Regenerator\nTera Type: Water\nEVs: 252 HP / 16 Def / 240 SpD\nSassy Nature\nIVs: 0 Atk / 0 Spe\n- Future Sight\n- Sludge Bomb\n- Chilly Reception\n- Slack Off`,
  'Samurott-Hisui': `Samurott-Hisui @ Focus Sash\nAbility: Sharpness\nTera Type: Dark\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Ceaseless Edge\n- Razor Shell\n- Knock Off\n- Sucker Punch`,
  'Landorus-Therian': `Landorus-Therian @ Choice Scarf\nAbility: Intimidate\nTera Type: Flying\nEVs: 252 Atk / 4 Def / 252 Spe\nJolly Nature\n- Earthquake\n- U-turn\n- Stone Edge\n- Knock Off`,
  Zapdos: `Zapdos @ Heavy-Duty Boots\nAbility: Static\nTera Type: Steel\nEVs: 248 HP / 220 Def / 40 Spe\nBold Nature\n- Volt Switch\n- Hurricane\n- Roost\n- Thunder Wave`,
  Clefable: `Clefable @ Leftovers\nAbility: Magic Guard\nTera Type: Water\nEVs: 252 HP / 200 Def / 56 SpD\nBold Nature\n- Moonblast\n- Knock Off\n- Thunder Wave\n- Soft-Boiled`,
  'Ting-Lu': `Ting-Lu @ Leftovers\nAbility: Vessel of Ruin\nTera Type: Water\nEVs: 252 HP / 4 Atk / 252 SpD\nCareful Nature\n- Stealth Rock\n- Ruination\n- Whirlwind\n- Earthquake`,
};

export const SMOGON_FALLBACK_SETS: Record<string, string> = { ...SUGGEST_SETS, ...EXTRA_FALLBACK_SETS };

// ---------------------------------------------------------------------------
// Smogon data layer (data.pkmn.cc). Module-scoped cache; no localStorage.

export interface SmogonSetBlock {
  item?: string | string[];
  ability?: string | string[];
  nature?: string | string[];
  teraTypes?: string | string[];
  evs?: Record<string, number>;
  ivs?: Record<string, number>;
  moves?: (string | string[])[];
}
export type SmogonSetsData = Record<string, Record<string, SmogonSetBlock>>;
export interface SmogonData { sets?: SmogonSetsData | null; analyses?: unknown; stats?: Record<string, unknown> | null; }

const smogonCache = new Map<string, Promise<SmogonData>>();

const STAT_LABELS: Record<string, string> = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

function evsText(evs: Record<string, number> | undefined): string {
  const parts = Object.entries(evs || {})
    .filter(([, v]) => +v)
    .map(([k, v]) => `${v} ${STAT_LABELS[k] || k}`);
  return parts.length ? parts.join(' / ') : '252 HP / 4 Def / 252 SpD';
}

/** Serialize a data.pkmn.cc set block into Showdown text (legacy format). */
export function smogonSetToText(species: string, set: SmogonSetBlock | null | undefined): string {
  if (!set) return '';
  const item = Array.isArray(set.item) ? set.item[0] : set.item;
  const ability = Array.isArray(set.ability) ? set.ability[0] : set.ability || 'Ability';
  const tera = Array.isArray(set.teraTypes) ? set.teraTypes[0] : set.teraTypes || 'Water';
  const nature = Array.isArray(set.nature) ? set.nature[0] : set.nature || 'Careful';
  const moves = (set.moves || []).flat().slice(0, 4);
  if (!item || !moves.length) return '';
  return `${species} @ ${item}\nAbility: ${ability}\nTera Type: ${tera}\nEVs: ${evsText(set.evs)}\n${nature} Nature\n- ${moves.join('\n- ')}`;
}

export const SmogonProvider = {
  base: 'https://data.pkmn.cc',

  async json(path: string): Promise<unknown> {
    const res = await fetch(`${this.base}${path}`, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`Smogon data ${res.status}`);
    return res.json();
  },

  async load(format = 'gen9ou'): Promise<SmogonData> {
    const cached = smogonCache.get(format);
    if (cached) return cached;
    const promise = Promise.allSettled([
      this.json(`/sets/${format}.json`),
      this.json(`/analyses/${format}.json`),
      this.json(`/stats/${format}.json`),
    ]).then(([sets, analyses, stats]) => {
      const data = {
        sets: sets.status === 'fulfilled' ? (sets.value as SmogonSetsData) : null,
        analyses: analyses.status === 'fulfilled' ? analyses.value : null,
        stats: stats.status === 'fulfilled' ? (stats.value as Record<string, unknown>) : null,
      };
      // don't cache a total failure — a transient outage shouldn't poison
      // every later load() in this isolate
      if (!data.sets && !data.analyses && !data.stats) smogonCache.delete(format);
      return data;
    });
    smogonCache.set(format, promise);
    return promise;
  },

  pickSet(name: string, sets: SmogonSetsData | null | undefined): SmogonSetBlock | null {
    const block = sets?.[name] || sets?.[resolveSpeciesName(name)] || sets?.[String(name).replace('-', ' ')] || sets?.[resolveKey(sets, name)];
    if (!block) return null;
    const first = block[Object.keys(block)[0]];
    return first || null;
  },

  usageScore(name: string, stats: Record<string, unknown> | null | undefined): number {
    try {
      const key = id(name);
      const entries = (stats?.pokemon || stats?.data || stats?.stats || stats) as Record<string, unknown> | undefined;
      const hit = Object.entries(entries || {}).find(([k]) => id(k) === key);
      const entry = hit?.[1];
      const val = entry && typeof entry === 'object' ? ((entry as Record<string, unknown>).usage || (entry as Record<string, unknown>).weight || (entry as Record<string, unknown>).raw || 0) : 0;
      return Math.min(20, Math.sqrt(+val || 0));
    } catch {
      return 0;
    }
  },

  async suggest(report: SuggestReport): Promise<ScoredCandidate[]> {
    const data = await this.load('gen9ou');
    return smogonCandidatePool(report)
      .map((c) => scoreSmogonCandidate(c, report, data))
      .filter((x): x is ScoredCandidate => Boolean(x))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  },
};

function resolveKey(sets: SmogonSetsData | null | undefined, name: string): string {
  if (!sets) return '';
  const target = id(name);
  return Object.keys(sets).find((k) => id(k) === target) || '';
}

/**
 * Fetch Smogon OU set text keyed by species. Falls back to the local
 * SUGGEST_SETS table when the endpoint is unreachable or returns no usable
 * data, so callers always get a non-empty record.
 */
export async function fetchSmogonSets(format = 'gen9ou'): Promise<Record<string, string>> {
  try {
    const data = await SmogonProvider.load(format);
    const sets = data.sets || {};
    const out: Record<string, string> = {};
    for (const [species, block] of Object.entries(sets)) {
      const text = smogonSetToText(species, block[Object.keys(block)[0]]);
      if (text) out[species] = text;
    }
    if (Object.keys(out).length) return out;
    return { ...SUGGEST_SETS };
  } catch {
    return { ...SUGGEST_SETS };
  }
}

/** Merge fetched set text into the live fallback table so subsequent
 * suggestAdditions() runs see the remote sets. Returns the merged table. */
export function mergeSuggestSets(remote?: Record<string, string> | null): Record<string, string> {
  Object.assign(SMOGON_FALLBACK_SETS, remote || {});
  return SMOGON_FALLBACK_SETS;
}

// ---------------------------------------------------------------------------
// Candidate pool + scoring (app.js smogonCandidatePool / candidateRoles /
// scoreSmogonCandidate)

const PREFERRED = [
  'Gholdengo', 'Kingambit', 'Slowking-Galar', 'Corviknight', 'Skarmory', 'Primarina', 'Heatran', 'Rotom-Wash',
  'Toxapex', 'Alomomola', 'Samurott-Hisui', 'Great Tusk', 'Landorus-Therian', 'Zapdos', 'Clefable', 'Ting-Lu',
];

function smogonCandidatePool(report: SuggestReport): Candidate[] {
  const present = new Set((report.team || []).map((p) => id(p.species)));
  return PREFERRED.filter((x) => !present.has(id(x))).map((species) => ({
    species,
    set: SMOGON_FALLBACK_SETS[species] || SUGGEST_SETS[species] || '',
  }));
}

function candidateRoles(species: string): string[] {
  return (
    ({
      Gholdengo: ['removal denial', 'Steel glue', 'offensive pressure', 'hazard support'],
      Kingambit: ['Steel glue', 'priority', 'late-game wincon', 'Dark pressure'],
      'Slowking-Galar': ['special sponge', 'pivot', 'Regenerator glue', 'Future Sight'],
      Corviknight: ['hazard removal', 'pivot', 'physical backbone', 'Ground immunity'],
      Skarmory: ['Spikes', 'physical backbone', 'phazing', 'hazard stack'],
      Primarina: ['Water resist', 'Dragon check', 'special breaker', 'balance glue'],
      Heatran: ['Steel glue', 'special wall', 'Stealth Rock', 'trap pressure'],
      'Rotom-Wash': ['Water check', 'pivot', 'burn support', 'Ground immunity'],
      Toxapex: ['Water check', 'Haze', 'Regenerator glue', 'status'],
      Alomomola: ['Wish pivot', 'Water check', 'Regenerator glue', 'slow pivot'],
      'Samurott-Hisui': ['hazard pressure', 'offensive lead', 'Knock Off', 'priority'],
      'Great Tusk': ['hazard removal', 'Stealth Rock', 'physical backbone', 'Knock Off'],
      'Landorus-Therian': ['pivot', 'Ground immunity', 'Choice Scarf', 'Intimidate'],
      Zapdos: ['pivot', 'static punish', 'hazard removal', 'Flying check'],
      Clefable: ['Fairy glue', 'status', 'Wish', 'setup check'],
      'Ting-Lu': ['special backbone', 'hazards', 'phazing', 'Electric immunity'],
    }) as Record<string, string[]>
  )[species] || ['role compression'];
}

function scoreSmogonCandidate(c: Candidate, report: SuggestReport, data: SmogonData = {}): ScoredCandidate | null {
  if (!c?.species) return null;
  const p = report.profile;
  const ident = report.identity?.primary?.name || '';
  const roles = candidateRoles(c.species);
  const mon = { species: c.species, types: types({ species: c.species }) };
  let score = 35;
  const why: string[] = [];
  for (const w of (report.diagnosis?.topWeaknesses || []).slice(0, 4)) {
    const m = mult(w.tp, mon.types);
    if (m === 0) {
      score += 13;
      why.push(`immune to ${w.tp} pressure`);
    } else if (m < 1) {
      score += 10;
      why.push(`resists ${w.tp} pressure`);
    } else if (m > 1) score -= 6;
  }
  if (ident.includes('Balance')) {
    if (roles.some((r) => /pivot|glue|backbone|sponge|Regenerator/i.test(r))) {
      score += 15;
      why.push('preserves balance instead of turning the team passive');
    }
    if (roles.includes('removal denial')) score += 12;
  }
  if (ident.includes('Hazard') || (report.synergy?.fieldControl?.removalDenial ?? 100) < 35) {
    if (roles.includes('removal denial')) {
      score += 22;
      why.push('adds real hazard-removal denial');
    }
    if (roles.includes('Spikes') || roles.includes('hazard pressure')) score += 8;
  }
  if (
    report.matchups?.find((m) => m.name === 'Rain' && m.score < 55) &&
    roles.some((r) => /Water check|Water resist|special sponge|Regenerator/.test(r))
  ) {
    score += 15;
    why.push('stabilizes the Rain matchup');
  }
  if ((report.synergy?.scores?.winReliability ?? 100) < 60 && roles.some((r) => /wincon|priority|offensive pressure|special breaker/.test(r))) {
    score += 10;
    why.push('adds a clearer closing path');
  }
  if (c.species === 'Forretress' && ident.includes('Balance')) score -= 25;
  if (c.species === 'Gholdengo' && p?.hazards?.length) score += 10;
  if (data.sets && SmogonProvider.pickSet(c.species, data.sets)) {
    score += 8;
    why.push('Smogon OU set data available');
  }
  score += SmogonProvider.usageScore(c.species, data.stats);
  let set = c.set;
  const setFromData = SmogonProvider.pickSet(c.species, data.sets);
  if (setFromData) {
    try {
      const item = Array.isArray(setFromData.item) ? setFromData.item[0] : setFromData.item;
      const ability = Array.isArray(setFromData.ability) ? setFromData.ability[0] : setFromData.ability || 'Ability';
      const tera = Array.isArray(setFromData.teraTypes) ? setFromData.teraTypes[0] : 'Water';
      const moves = (setFromData.moves || []).flat().slice(0, 4);
      if (item && moves.length) {
        set = `${c.species} @ ${item}\nAbility: ${ability}\nTera Type: ${tera}\nEVs: 252 HP / 4 Def / 252 SpD\nCareful Nature\n- ${moves.join('\n- ')}`;
      }
    } catch { /* keep fallback set */ }
  }
  return {
    species: c.species,
    score: Math.round(clamp(score)),
    roles,
    why: unique(why).slice(0, 5),
    set,
    source: data.sets ? 'Smogon OU data' : 'local metagame fallback',
  };
}

// ---------------------------------------------------------------------------
// v35 lane-diverse suggestion layer.

function v35RoleText(c: Candidate): string {
  return [...(c as Partial<ScoredCandidate>).roles || [], ...(candidateRoles(c.species) || [])].join(' ');
}

function v35CandidateResists(c: Candidate, tp: string): number {
  try {
    const m = mult(tp, types({ species: c.species }));
    return m === 0 ? 2 : m < 1 ? 1 : m > 1 ? -1 : 0;
  } catch {
    return 0;
  }
}

function v35LaneScore(c: Candidate, lane: string, report: SuggestReport): { score: number; why: string[] } {
  const text = v35RoleText(c);
  const primary = report.identity?.primary?.name || '';
  const syn = report.synergy?.scores || ({} as SynergyResult['scores']);
  const fc = report.synergy?.fieldControl || ({} as SynergyResult['fieldControl']);
  const rain = report.matchups?.find((m) => m.name === 'Rain')?.score ?? 60;
  const worst = (report.diagnosis?.topWeaknesses || []).slice(0, 4);
  let s = 0;
  const why: string[] = [];
  if (lane === 'matchup') {
    worst.forEach((w) => {
      const r = v35CandidateResists(c, w.tp);
      if (r > 0) {
        s += r === 2 ? 18 : 12;
        why.push(`${r === 2 ? 'immune to' : 'resists'} ${w.tp} pressure`);
      } else if (r < 0) s -= 8;
    });
    if (rain < 55 && /Water resist|Water check|Regenerator|Grass|Dragon check/i.test(text)) {
      s += 14;
      why.push('directly addresses the Rain dependency');
    }
  } else if (lane === 'field control') {
    if (/removal denial|Good as Gold|Ghost|Magic Bounce/i.test(text)) {
      s += 18;
      why.push('adds removal-denial texture');
    }
    if (/hazard removal|Defog|Rapid Spin|Court Change/i.test(text)) {
      s += 14;
      why.push('improves hazard removal');
    }
    if (/Spikes|hazard pressure|hazard stack|Stealth Rock/i.test(text)) {
      s += 12;
      why.push('improves hazard pressure');
    }
    if (fc?.setterOverload || report.profile?.overloaded?.length) {
      s += 8;
      why.push('helps relieve overloaded field-control slots');
    }
  } else if (lane === 'win condition') {
    if (/wincon|priority|breaker|pressure|Choice Scarf|speed control/i.test(text)) {
      s += 18;
      why.push('creates a clearer closing path');
    }
    if ((syn.winReliability ?? 100) < 65) {
      s += 10;
      why.push('targets low win-condition reliability');
    }
  } else if (lane === 'defensive glue') {
    if (/glue|backbone|sponge|check|Regenerator|Water resist|Dragon check|Ground immunity/i.test(text)) {
      s += 18;
      why.push('stabilizes switching structure');
    }
    if ((syn.defensiveBackbone ?? 100) < 70) {
      s += 10;
      why.push('targets weak defensive backbone');
    }
  } else if (lane === 'speed control') {
    if (/priority|Choice Scarf|speed control|Thunder Wave|pivot/i.test(text)) {
      s += 18;
      why.push('adds tempo or revenge-kill control');
    }
    if ((syn.speedControl ?? 100) < 65) {
      s += 10;
      why.push('targets moderate speed-control score');
    }
  } else if (lane === 'identity fit') {
    if (/Hazard/.test(primary) && /removal denial|Spikes|hazard pressure|Magic Bounce/i.test(text)) {
      s += 18;
      why.push('preserves hazard-centric identity');
    }
    if (/Balance|Bulky/.test(primary) && /pivot|glue|Regenerator|check|backbone/i.test(text)) {
      s += 18;
      why.push('preserves balance structure');
    }
    if (/Hyper Offense|Dragon/.test(primary) && /priority|breaker|speed control|Steel glue|Fairy/i.test(text)) {
      s += 18;
      why.push('fits the offensive identity without losing too much tempo');
    }
    if (/Stall/.test(primary) && /Regenerator|wall|sponge|Haze|status/i.test(text)) {
      s += 18;
      why.push('preserves attrition structure');
    }
  }
  const genericGlue = /Gholdengo|Hatterene|Primarina|Rotom-Wash|Slowking-Galar|Corviknight|Amoonguss/.test(c.species);
  if (genericGlue && s < 14) s -= 7;
  return { score: s, why: unique(why) };
}

const LANES = ['matchup', 'field control', 'win condition', 'defensive glue', 'speed control', 'identity fit'];
const EXTRA_CANDIDATES = [
  'Amoonguss', 'Clefable', 'Iron Crown', 'Landorus-Therian', 'Zapdos', 'Ting-Lu', 'Great Tusk', 'Skarmory',
  'Heatran', 'Kingambit', 'Gholdengo', 'Primarina', 'Rotom-Wash', 'Toxapex', 'Alomomola', 'Slowking-Galar',
  'Corviknight', 'Hatterene',
];

function v35AllCandidates(report: SuggestReport, data: SmogonData = {}): ScoredCandidate[] {
  const raw = smogonCandidatePool(report)
    .map((c) => scoreSmogonCandidate(c, report, data))
    .filter((x): x is ScoredCandidate => Boolean(x));
  const seen = new Set(raw.map((x) => id(x.species)));
  EXTRA_CANDIDATES.forEach((species) => {
    if (!seen.has(id(species)) && !(report.team || []).some((p) => id(p.species) === id(species))) {
      const c: Candidate = { species, set: SMOGON_FALLBACK_SETS[species] || SUGGEST_SETS[species] || '' };
      const s = scoreSmogonCandidate(c, report, data);
      if (s) raw.push(s);
    }
  });
  return raw;
}

/** Lane-diverse ranking — one best-per-lane pick first, then score order to 18. */
export function diversifySuggestions(report: SuggestReport, data: SmogonData = {}): LaneSuggestion[] {
  const pool = v35AllCandidates(report, data)
    .map((c) => {
      const laneRanks = LANES.map((l) => ({ lane: l, ...v35LaneScore(c, l, report) })).sort((a, b) => b.score - a.score);
      const best = laneRanks[0];
      return {
        ...c,
        lane: best.lane,
        laneScore: best.score,
        why: unique([...(best.why || []), ...(c.why || [])]).slice(0, 5),
        roles: unique([best.lane, ...(c.roles || []), ...(candidateRoles(c.species) || [])]).slice(0, 5),
        score: Math.round(clamp((c.score || 45) + best.score * 0.65)),
      };
    })
    .sort((a, b) => b.score - a.score || b.laneScore - a.laneScore);
  const selected: LaneSuggestion[] = [];
  const used = new Set<string>();
  for (const lane of LANES) {
    const pick = pool.find((c) => c.lane === lane && !used.has(id(c.species)));
    if (pick) {
      selected.push(pick);
      used.add(id(pick.species));
    }
  }
  for (const c of pool) {
    if (selected.length >= 18) break;
    const key = id(c.species);
    if (!used.has(key)) {
      selected.push(c);
      used.add(key);
    }
  }
  return selected.map((s) => ({
    ...s,
    source: data.sets ? 'Smogon OU sets/stats + V3.5 lane ranking' : 'V3.5 lane-diverse local metagame brain',
  }));
}

/**
 * Public entry — app.js suggestAdditions (v35 lane version). `p`, `identity`,
 * `synergy` default to the contracted chain when omitted.
 */
export function suggestAdditions(
  t: TeamMon[],
  a: AnalysisResult,
  p: TeamProfile = profileTeam(t, a),
  identity: IdentityResult = detectIdentities(t, a, p),
  synergy: SynergyResult = evaluateSynergy(t, a, p),
  matchups: MatchupRow[] = [],
): LaneSuggestion[] {
  const base: SuggestReport = {
    team: t.map((mon) => ({
      species: mon.species,
      item: mon.item,
      ability: mon.ability,
      tera: mon.tera,
      nature: mon.nature,
      evs: mon.evs,
      ivs: mon.ivs,
      moves: mon.moves,
      types: types(mon),
    })),
    profile: p,
    identity,
    synergy,
    matchups,
    diagnosis: { topWeaknesses: (a?.rows || []).slice(0, 6) },
  };
  return diversifySuggestions(base, {});
}

// ---------------------------------------------------------------------------
// Report-side helpers (needsForReport / swapOptionsFor / enrichment glue).

export interface TeamNeed { label: string; why: string; }

export function needsForReport(report: SuggestReport): TeamNeed[] {
  const out: TeamNeed[] = [];
  const syn = report.synergy?.scores || ({} as SynergyResult['scores']);
  const weak = report.diagnosis?.topWeaknesses || [];
  weak.slice(0, 4).forEach((w) => {
    if (w.sev === 'crit' || w.sev === 'bad') {
      out.push({ label: `${w.tp} counterplay`, why: `${w.weak} weak / ${w.res} resist / ${w.imm} immune` });
    }
  });
  if ((syn.fieldControl ?? 100) < 65) out.push({ label: 'field control', why: 'hazards, removal, denial, or chip loops are unstable' });
  if ((syn.winReliability ?? 100) < 60) out.push({ label: 'closing path', why: 'endgame line is fragile or overdependent' });
  if ((syn.defensiveBackbone ?? 100) < 70) out.push({ label: 'defensive glue', why: 'switching structure is matchup-dependent' });
  if (report.matchups?.find((m) => m.name === 'Rain' && m.score < 55)) {
    out.push({ label: 'rain insurance', why: 'water pressure can snowball quickly' });
  }
  return out.slice(0, 6);
}

export interface SwapOption { teamIndex: number; species: string; score: number; reasons: string[]; }

export function swapOptionsFor(s: { roles?: string[] }, report: SuggestReport): SwapOption[] {
  const weak = report.diagnosis?.topWeaknesses || [];
  return (report.team || [])
    .map((mon, i) => {
      let score = 0;
      const reasons: string[] = [];
      weak.slice(0, 4).forEach((w) => {
        const m = mult(w.tp, types(mon));
        if (m > 1) {
          score += 8;
          reasons.push(`eases ${w.tp} pressure`);
        }
      });
      if (report.profile?.overloaded?.includes(mon.species)) {
        score += 9;
        reasons.push('removes an overloaded slot');
      }
      if (report.profile?.typeCounts) {
        types(mon).forEach((tp) => {
          if ((report.profile?.typeCounts?.[tp] || 0) >= 3) {
            score += 5;
            reasons.push(`cuts ${tp} stacking`);
          }
        });
      }
      if (report.profile?.defensiveAnchors?.includes(mon.species) && /check|glue|backbone|Regenerator|wall|sponge/i.test((s.roles || []).join(' '))) {
        score += 3;
        reasons.push('keeps a defensive slot');
      }
      return { teamIndex: i, species: mon.species, score, reasons: unique(reasons).slice(0, 3) };
    })
    .sort((a, b) => b.score - a.score);
}

/** Attach swapOptions to every suggestion in a report (legacy render glue). */
export function enrichSuggestionSwaps(report: SuggestReport): SuggestReport {
  (report.suggestionPool || report.suggestions || []).forEach((s) => {
    if (!(s as Suggestion & { swapOptions?: SwapOption[] }).swapOptions) {
      (s as Suggestion & { swapOptions?: SwapOption[] }).swapOptions = swapOptionsFor(s, report);
    }
  });
  return report;
}

/** Refresh a report's suggestions from the Smogon data layer when reachable. */
export async function enrichSuggestionsFromApi(report: SuggestReport): Promise<boolean> {
  let data: SmogonData = {};
  try {
    data = (await SmogonProvider.load('gen9ou')) || {};
  } catch (e) {
    report.suggestionSource = `V3.5 local lane ranking (${e instanceof Error ? e.message : 'Smogon unavailable'})`;
  }
  const pool = diversifySuggestions(report, data).map((s) => ({ ...s, swapOptions: swapOptionsFor(s, report) }));
  report.suggestionPool = pool.slice(0, 18) as Suggestion[];
  report.suggestions = report.suggestionPool.slice(0, 6);
  report.suggestionSource = data?.sets ? 'Smogon OU sets/stats + V3.5 lane ranking' : report.suggestionSource || 'V3.5 lane-diverse local metagame brain';
  report.needs = needsForReport(report);
  return true;
}

