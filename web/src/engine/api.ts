// UI-facing facade: the React app only imports from this file (or './index').
import type {
  AnalysisResult, IdentityResult, MatchupRow, ReasoningReport,
  Suggestion, SynergyResult, TeamMon, TeamProfile, ValidationRow,
} from './types';
import { parseTeam } from './team';
import { analyze } from './analysis';
import { buildReasoningReport, buildMarkdownReport } from './report';

export * from './index';
export { parseTeam, monBlock, teamToText } from './team';
export { analyze } from './analysis';
export { profileTeam, detectIdentities, evaluateSynergy, evaluateMatchups, isDefensiveAnchor, isDefensiveWall } from './identity';
export { validateTeam, validateTeamAdvanced } from './validate';
export { suggestAdditions, diversifySuggestions, needsForReport, swapOptionsFor, enrichSuggestionSwaps, fetchSmogonSets, mergeSuggestSets, SmogonProvider, smogonSetToText } from './suggest';
export type { SuggestReport, LaneSuggestion, SmogonData, SmogonSetsData, SwapOption, TeamNeed } from './suggest';
export { buildTeraPlan, teraPlanMarkdown } from './tera';
export type { TeraPlan, TeraPlanRow } from './tera';
export { buildReasoningReport, buildMarkdownReport, teamReasoner, verdict, scoreGroupSummary, scoreDisplayName, v35ActiveReport } from './report';
export type { ReasoningOptions } from './report';
export { ReplayParser, parseReplay, analyzeReplay, buildReplaySummary, BATTLELOG_DEMO } from './replay';
export { buildDetectiveRead } from './detective';
export { dmg, nHitChance, normalizeBattleState, battleStateSummary, swapBattleState, clampStage, stageMultiplier, spreadDamageApplies, getAgentFacts, detectPriorityBlockReveal, PriorityTerrainTracker } from './ko';
export type { BattleStateInput, BattleState, KoRoll, KoMon, KoHitInput } from './ko';

/** Full clinic pipeline in one call. Returns everything the UI renders. */
export interface ClinicResult {
  team: TeamMon[];
  analysis: AnalysisResult;
  profile: TeamProfile;
  identity: IdentityResult;
  synergy: SynergyResult;
  matchups: MatchupRow[];
  validation: ValidationRow[];
  suggestions: Suggestion[];
  report: ReasoningReport;
  markdown: string;
}

export function runClinic(teamText: string): ClinicResult {
  const team = parseTeam(teamText);
  const a = analyze(team);
  const report = buildReasoningReport(team, a);
  if (!report) throw new Error('Could not build a report for this team.');
  return {
    team,
    analysis: a,
    profile: report.profile,
    identity: report.identity,
    synergy: report.synergy,
    matchups: report.matchups ?? [],
    validation: report.validation ?? [],
    suggestions: report.suggestions ?? [],
    report,
    markdown: buildMarkdownReport(report),
  };
}

// ---- shareable team links ----
export function encodeTeamLink(teamText: string): string {
  return `#team=${btoa(unescape(encodeURIComponent(teamText))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}
export function decodeTeamLink(hash: string): string {
  const m = /[#&]team=([A-Za-z0-9_-]+)/.exec(hash);
  if (!m) return '';
  try { return decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')))); } catch { return ''; }
}

// ---- sprite URLs (Showdown public CDN) ----
export function spriteUrl(species: string): string {
  return `https://play.pokemonshowdown.com/sprites/gen5/${species.toLowerCase().replace(/[^a-z0-9]+/g, '')}.png`;
}
export function itemIconUrl(item: string): string {
  return `https://play.pokemonshowdown.com/sprites/itemicons/${item.toLowerCase().replace(/[^a-z0-9]+/g, '')}.png`;
}
export function typeIconUrl(type: string): string {
  return `https://play.pokemonshowdown.com/sprites/types/${type}.png`;
}

// ============================ v4 feature layer ============================
// Speed tiers, coverage matrix, survival matrix — engine additions on top
// of the ported modules.

import { getSpecies } from './dex';
import { stats as calcStats, moveData } from './dex';
import { CHART, TYPES } from './types';
import { dmg } from './ko';
import type { KoMon } from './ko';

/** Rough Spe stat of a species at a given nature bias; Showdown singles default Lv100. */
function rawSpeed(base: number, plus: boolean, iv = 31, ev = 252, level = 100): number {
  const s = Math.floor((Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5) * (plus ? 1.1 : 1.0));
  return s;
}

export interface SpeedTierRow {
  name: string;
  speed: number;
  side: 'team' | 'meta';
  note: string;
}

const META_SPEED_BENCHMARKS: { name: string; plus?: boolean }[] = [
  { name: 'Deoxys-Speed', plus: true },
  { name: 'Regieleki', plus: true },
  { name: 'Dragapult', plus: true },
  { name: 'Iron Valiant', plus: true },
  { name: 'Roaring Moon', plus: true },
  { name: 'Garchomp', plus: true },
  { name: 'Ogerpon-Wellspring', plus: true },
  { name: 'Landorus-Therian', plus: true },
  { name: 'Great Tusk', plus: true },
  { name: 'Kingambit' },
  { name: 'Samurott-Hisui', plus: true },
  { name: 'Rillaboom', plus: true },
  { name: 'Primarina' },
  { name: 'Corviknight' },
  { name: 'Slowking-Galar' },
];

export function speedTiers(team: TeamMon[]): SpeedTierRow[] {
  const rows: SpeedTierRow[] = team.map((m) => {
    const s = calcStats(m);
    const invested = (m.evs?.spe ?? 0) > 0;
    return {
      name: m.species || '???',
      speed: s.spe,
      side: 'team' as const,
      note: `${m.nature || 'neutral'}${invested ? ' · invested' : ' · uninvested'} · Lv${m.level || 100}`,
    };
  });
  for (const b of META_SPEED_BENCHMARKS) {
    const sp = getSpecies(b.name);
    if (!sp) continue;
    rows.push({
      name: b.name,
      speed: rawSpeed(sp.baseStats[5] ?? 0, !!b.plus, 31, 252, 100),
      side: 'meta',
      note: `${b.plus ? '252+' : '252'} meta benchmark · Lv100`,
    });
  }
  rows.sort((a, b) => b.speed - a.speed || a.name.localeCompare(b.name));
  return rows;
}

export interface CoverageRow {
  type: string;
  hitters: string[]; // team mons whose attacking types hit this type super-effectively
  resistedBy: number; // count of team's attacking types this type resists/immune
}

/** Offensive coverage: for each of the 18 defending types, which team members hit it SE. */
export function coverageMatrix(team: TeamMon[]): CoverageRow[] {
  return TYPES.map((defType) => {
    const hitters: string[] = [];
    for (const m of team) {
      const moveTypes = new Set(
        (m.moves || [])
          .map((mv) => moveData(mv))
          .filter((md) => md && (md[2] || 0) > 0)
          .map((md) => md![0]),
      );
      for (const attType of moveTypes) {
        const mult = CHART[defType]?.[attType] ?? 1;
        if (mult > 1) { hitters.push(m.species || '???'); break; }
      }
    }
    return { type: defType, hitters, resistedBy: 0 };
  });
}

export interface SurvivalCell { ko: number; hko: number; minp: number; maxp: number; bestMove: string; }
export interface SurvivalMatrix { attackers: string[]; defenders: string[]; cells: SurvivalCell[][]; }

/** Every attacker's strongest move vs every defender (team-internal grid). */
export function survivalMatrix(team: TeamMon[]): SurvivalMatrix {
  const names = team.map((m) => m.species || '???');
  const cells: SurvivalCell[][] = team.map((att) =>
    team.map((def) => {
      let best: SurvivalCell = { ko: 0, hko: 0, minp: 0, maxp: 0, bestMove: '—' };
      for (const mv of att.moves || []) {
        const md = moveData(mv);
        if (!md || (md[2] || 0) <= 0) continue;
        const r = dmg(att as KoMon, def as KoMon, mv, {});
        if (r.maxp > best.maxp) {
          const hko = r.ko >= 1 ? 1 : Math.ceil(100 / Math.max(r.maxp, 0.01));
          best = { ko: r.ko, hko, minp: r.minp, maxp: r.maxp, bestMove: mv };
        }
      }
      return best;
    }),
  );
  return { attackers: names, defenders: names, cells };
}

// ---- @smogon/calc cross-check (real Showdown rolls) ----
import { calculate, Generations, Pokemon as CalcPokemon, Move as CalcMove, Field } from '@smogon/calc';
import type { Stats } from './types';

const calcGen9 = Generations.get(9);

export interface SmogonCalcResult {
  range: string; // e.g. "42.8 - 50.6%"
  desc: string;
  koChance?: string;
}

function toCalcMon(m: Partial<TeamMon>, teraType?: string): CalcPokemon | null {
  const species = m.species ? String(m.species) : '';
  if (!species) return null;
  const evs = m.evs || ({} as Stats);
  try {
    return new CalcPokemon(calcGen9, species, {
      item: m.item || undefined,
      ability: m.ability || undefined,
      nature: m.nature || undefined,
      level: m.level || 50,
      teraType: teraType || undefined,
      evs: {
        hp: evs.hp || 0, atk: evs.atk || 0, def: evs.def || 0,
        spa: evs.spa || 0, spd: evs.spd || 0, spe: evs.spe || 0,
      },
    } as never);
  } catch { return null; }
}

/** Cross-check vs the real Showdown calc. `tera` mirrors the KO Lab toggles:
 * a mon only terastallizes here when its corresponding flag is on — matching
 * dmg()'s opt.attackerTera/defenderTera semantics, so the two rows agree. */
export function smogonCalcRange(att: Partial<TeamMon>, def: Partial<TeamMon>, mv: string,
  tera: { attackerTeraType?: string; defenderTeraType?: string } = {}): SmogonCalcResult | null {
  const a = toCalcMon(att, tera.attackerTeraType);
  const d = toCalcMon(def, tera.defenderTeraType);
  if (!a || !d) return null;
  try {
    const result = calculate(calcGen9, a, d, new CalcMove(calcGen9, mv), new Field());
    const ko = result.kochance();
    return { range: result.desc(), desc: result.desc(), koChance: ko?.text };
  } catch { return null; }
}
