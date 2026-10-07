// Data layer: full Gen 9 dex via @pkmn/dex, with the app's curated tables
// (plus the data folded in from the legacy patch files) as fallbacks.
import { Dex } from '@pkmn/dex';
import { Generations } from '@pkmn/data';
import type { TeamMon, SpeciesInfo, MoveData, Stats } from './types';
import { toId, keys, unique, emptyStats, natureModifier, CHART, mult } from './types';
import { P, FALLBACK_ABILITIES } from './data-species';
import { MOVES, REPLAY_MOVE_HINTS } from './data-moves';
import {
  EXTRA_P, EXTRA_P2, EXTRA_FALLBACK_ABILITIES, EXTRA_FALLBACK_ABILITIES2,
  EXTRA_SPECIES, EXTRA_MOVES, EXTRA_MOVES2, EXTRA_REPLAY_MOVE_HINTS,
  TRUSTED_FALLBACK_LEARNSETS,
} from './data-extra';
import { LOCAL_LEARNSETS } from './data-content';

const dex = Dex.forGen(9);
const gens = new Generations(Dex);
export const gen9 = gens.get(9);

// Local tables merged with the patch-file additions.
const LOCAL_P: Record<string, [string[], number[]]> = { ...(P as Record<string, [string[], number[]]>), ...(EXTRA_P as Record<string, [string[], number[]]>), ...EXTRA_P2 };
const LOCAL_ABILITIES: Record<string, Record<string, string>> = { ...FALLBACK_ABILITIES, ...(EXTRA_FALLBACK_ABILITIES as Record<string, Record<string, string>>), ...EXTRA_FALLBACK_ABILITIES2 };
const LOCAL_MOVES: Record<string, MoveData> = { ...(MOVES as unknown as Record<string, MoveData>), ...(EXTRA_MOVES as unknown as Record<string, MoveData>), ...(EXTRA_MOVES2 as unknown as Record<string, MoveData>) };
const ALL_REPLAY_HINTS: Record<string, MoveData> = { ...(REPLAY_MOVE_HINTS as unknown as Record<string, MoveData>), ...(EXTRA_REPLAY_MOVE_HINTS as unknown as Record<string, MoveData>) };

interface ExtraSpecies { name: string; types: string[]; baseStats: number[]; abilities: Record<string, string>; }
const EXTRA_SPECIES_BY_ID = Object.fromEntries(
  Object.entries(EXTRA_SPECIES as Record<string, ExtraSpecies>).map(([name, d]) => [toId(name), d]),
);

export const SPECIES_ALIASES: Record<string, string> = {
  // Rotom forms
  rotomw: 'Rotom-Wash', rotomwash: 'Rotom-Wash', 'rotom-w': 'Rotom-Wash',
  rotomheat: 'Rotom-Heat', rotomh: 'Rotom-Heat', 'rotom-h': 'Rotom-Heat',
  rotomfan: 'Rotom-Fan', rotomf: 'Rotom-Fan', 'rotom-f': 'Rotom-Fan',
  rotommow: 'Rotom-Mow', rotomm: 'Rotom-Mow', 'rotom-m': 'Rotom-Mow',
  rotomfrost: 'Rotom-Frost', rotomfr: 'Rotom-Frost', 'rotom-fr': 'Rotom-Frost',
  // Therian forms
  landorustherian: 'Landorus-Therian', landorust: 'Landorus-Therian', 'landorus-t': 'Landorus-Therian',
  'lando-t': 'Landorus-Therian', landot: 'Landorus-Therian',
  'tornadus-therian': 'Tornadus-Therian', tornadust: 'Tornadus-Therian', 'tornadus-t': 'Tornadus-Therian',
  tornt: 'Tornadus-Therian', tornadustherian: 'Tornadus-Therian',
  'thundurus-therian': 'Thundurus-Therian', thundurust: 'Thundurus-Therian', 'thundurus-t': 'Thundurus-Therian',
  thundt: 'Thundurus-Therian', thundurustherian: 'Thundurus-Therian',
  // Legendary forms
  giratinaorigin: 'Giratina-Origin', giratinao: 'Giratina-Origin', 'giratina-o': 'Giratina-Origin',
  // Urshifu
  urshifurapidstrike: 'Urshifu-Rapid-Strike', 'urshifu-rapid': 'Urshifu-Rapid-Strike',
  urshifur: 'Urshifu-Rapid-Strike', urshifurs: 'Urshifu-Rapid-Strike', urshifurapid: 'Urshifu-Rapid-Strike',
  // Ogerpon forms
  'ogerpon-wellspring': 'Ogerpon-Wellspring', ogerponwellspring: 'Ogerpon-Wellspring', ogerponw: 'Ogerpon-Wellspring',
  'ogerpon-hearthflame': 'Ogerpon-Hearthflame', ogerponhearthflame: 'Ogerpon-Hearthflame', ogerponhf: 'Ogerpon-Hearthflame',
  'ogerpon-cornerstone': 'Ogerpon-Cornerstone', ogerponcornerstone: 'Ogerpon-Cornerstone', ogerponcs: 'Ogerpon-Cornerstone',
  ogerponteal: 'Ogerpon', ogerpont: 'Ogerpon', ogerpontealmask: 'Ogerpon',
  // Tauros Paldea
  'tauros-paldea': 'Tauros-Paldea-Combat', taurospaldeacombat: 'Tauros-Paldea-Combat',
  taurospaldeablaze: 'Tauros-Paldea-Blaze', taurospaldeaaqua: 'Tauros-Paldea-Aqua',
  taurospaldea: 'Tauros-Paldea-Combat',
  // Common nicknames
  pult: 'Dragapult', tusk: 'Great Tusk', gambit: 'Kingambit', valiant: 'Iron Valiant',
  hoopau: 'Hoopa-Unbound', lando: 'Landorus-Therian',
};

export const id = toId;

export function speciesNames(): string[] {
  return dex.species.all().filter((s) => s && s.exists !== false && s.name && !s.isNonstandard).map((s) => s.name);
}
export function moveNames(): string[] {
  return unique([
    ...dex.moves.all().filter((m) => m && m.exists !== false && m.name && !m.isNonstandard).map((m) => m.name),
    ...keys(ALL_REPLAY_HINTS),
  ]);
}

export function resolveSpeciesName(name: unknown): string {
  const raw = String(name ?? '').trim();
  if (!raw) return '';
  const local = keys(LOCAL_P).find((k) => toId(k) === toId(raw));
  if (local) return local;
  const alias = SPECIES_ALIASES[toId(raw)] || raw;
  const direct = dex.species.get(alias);
  if (direct && direct.exists !== false && direct.name) return direct.name;
  const hit = speciesNames().find((k) => toId(k) === toId(alias));
  if (hit) return hit;
  return String(alias).replace(/\b\w/g, (c) => c.toUpperCase());
}

export function resolveMoveName(name: unknown): string {
  const raw = String(name ?? '').trim();
  if (!raw) return '';
  const local = keys(LOCAL_MOVES).find((k) => toId(k) === toId(raw));
  if (local) return local;
  const direct = dex.moves.get(raw);
  if (direct && direct.exists !== false && direct.name) return direct.name;
  const hit = dex.moves.all().filter((m) => m?.exists !== false).map((m) => m.name)
    .find((k) => toId(k) === toId(raw));
  return hit || raw;
}

export function getSpecies(name: unknown): SpeciesInfo | null {
  const n = resolveSpeciesName(name);
  const s = dex.species.get(n);
  if (s && s.exists !== false && s.baseStats) {
    return {
      name: s.name,
      types: (s.types as string[]) || ['Normal'],
      baseStats: [s.baseStats.hp, s.baseStats.atk, s.baseStats.def, s.baseStats.spa, s.baseStats.spd, s.baseStats.spe],
      abilities: (s.abilities as unknown as Record<string, string>) || {},
    };
  }
  if (LOCAL_P[n]) return { name: n, types: LOCAL_P[n][0], baseStats: LOCAL_P[n][1], abilities: LOCAL_ABILITIES[n] || {} };
  const extra = (EXTRA_SPECIES as Record<string, ExtraSpecies>)[n] || EXTRA_SPECIES_BY_ID[toId(n)];
  if (extra) return { name: extra.name, types: extra.types, baseStats: extra.baseStats, abilities: extra.abilities || {} };
  return null;
}

export function getMove(name: unknown): MoveData | null {
  const n = resolveMoveName(name);
  const m = dex.moves.get(n);
  if (m && m.exists !== false && m.name) {
    const acc = m.accuracy === true ? 100 : Number(m.accuracy) || 100;
    let extra: string | null = null;
    const mid = toId(m.name);
    if (mid === 'bodypress') extra = 'def';
    if (['psyshock', 'psystrike', 'secretsword'].includes(mid)) extra = 'targetDef';
    return [m.type || 'Normal', m.category || 'Status', m.basePower || 0, acc, m.priority || 0, extra ?? undefined];
  }
  return LOCAL_MOVES[n] || (EXTRA_MOVES as unknown as Record<string, MoveData>)[n] || null;
}

export function moveData(n: unknown): MoveData | null { return getMove(n); }

/** Like moveData, but also consults the replay move hints table for partial data. */
export function moveMeta(n: unknown): MoveData | null {
  const data = getMove(n);
  if (data) return data;
  const hint = ALL_REPLAY_HINTS[resolveMoveName(n)] || ALL_REPLAY_HINTS[String(n ?? '').trim()];
  return hint ? [hint[0], hint[1], 0, 100, hint[4] ?? 0] : null;
}

export function moveCategory(n: unknown): string { return moveMeta(n)?.[1] || 'Status'; }
export function movePriority(n: unknown): number { return Number(moveMeta(n)?.[4]) || 0; }

/**
 * Strip Showdown nickname/gender syntax and resolve the species.
 * "Nickname (Species) (M)" → Species; bare "(M)"/"(F)" markers are ignored.
 */
export function norm(s: unknown): string {
  let raw = String(s ?? '').trim();
  if (!raw) return '';
  raw = raw.replace(/\s+\((?:M|F)\)\s*$/i, '').trim();
  const matches = [...raw.matchAll(/\(([^)]+)\)/g)]
    .map((m) => m[1].trim())
    .filter((text) => !/^(?:M|F)$/i.test(text));
  if (matches.length) return resolveSpeciesName(matches[matches.length - 1]);
  return resolveSpeciesName(raw);
}
export function moveName(s: unknown): string { return resolveMoveName(s); }

export function types(m: Partial<TeamMon> | null | undefined, opt: { tera?: boolean } = {}): string[] {
  if ((m as { _defensiveTera?: string })?._defensiveTera) return [(m as { _defensiveTera: string })._defensiveTera];
  if (opt.tera && m?.tera) return [m.tera];
  return getSpecies(m?.species)?.types || ['Normal'];
}

// ----- learnsets -----
const learnsetCache = new Map<string, Set<string> | null>();
export type LearnsetStatus = 'not-loaded' | 'loading' | 'loaded' | 'fallback';
let learnsetsStatus: LearnsetStatus = 'not-loaded';

export async function warmLearnset(species: string): Promise<Set<string> | null> {
  const sid = toId(resolveSpeciesName(species));
  if (learnsetCache.has(sid)) return learnsetCache.get(sid)!;
  try {
    const set = await gen9.learnsets.learnable(species);
    const ids = new Set<string>(set ? Object.keys(set) : []);
    learnsetCache.set(sid, ids);
    learnsetsStatus = 'loaded';
    return ids;
  } catch {
    learnsetCache.set(sid, null);
    learnsetsStatus = 'fallback';
    return null;
  }
}

export async function warmLearnsetsFor(speciesList: string[]): Promise<void> {
  await Promise.all(speciesList.map((s) => warmLearnset(s)));
}

export function getLearnsetsStatus(): LearnsetStatus { return learnsetsStatus; }

/**
 * Synchronous learnset check. true = confirmed learnable, false = confirmed not,
 * null = data unavailable. Order: trusted local table → local table → warmed pkmn cache.
 */
export function canLearn(species: string, move: string): boolean | null {
  const sid = toId(resolveSpeciesName(species));
  const mid = toId(resolveMoveName(move));
  const trusted = TRUSTED_FALLBACK_LEARNSETS[resolveSpeciesName(species)]
    || TRUSTED_FALLBACK_LEARNSETS[species];
  if (trusted?.map(toId).includes(mid)) return true;
  const local = LOCAL_LEARNSETS[sid];
  if (local) return local.map(toId).includes(mid);
  const warmed = learnsetCache.get(sid);
  if (warmed) return warmed.has(mid);
  return null;
}

export function abilityOk(mon: Partial<TeamMon>): { ok: boolean; confidence: string; reason: string } {
  if (!mon.ability) return { ok: true, confidence: 'none', reason: 'No ability specified.' };
  const s = getSpecies(mon.species);
  if (!s || !keys(s.abilities).length) return { ok: true, confidence: 'unknown', reason: 'Ability data unavailable.' };
  const wanted = toId(mon.ability);
  const vals = Object.values(s.abilities).map(toId);
  return vals.includes(wanted)
    ? { ok: true, confidence: 'high', reason: 'Ability appears on species.' }
    : { ok: false, confidence: 'high', reason: `${mon.species} does not list ${mon.ability}.` };
}

// ----- derived helpers -----
export function parseEV(line: string | undefined, def = 0): Stats {
  const e = emptyStats(def);
  const map: Record<string, keyof Stats> = { hp: 'hp', atk: 'atk', def: 'def', spa: 'spa', spd: 'spd', spe: 'spe' };
  (line || '').replace(/^EVs:|^IVs:/i, '').split('/').forEach((x) => {
    const m = x.trim().match(/(\d+)\s+(HP|Atk|Def|SpA|SpD|Spe)/i);
    if (m) e[map[m[2].toLowerCase()]] = +m[1];
  });
  return e;
}

export function stats(m: Partial<TeamMon> | null | undefined, over: { evs?: Stats; nature?: string } = {}): Stats {
  const base = getSpecies(m?.species)?.baseStats || [80, 80, 80, 80, 80, 80];
  const e = over.evs || m?.evs || emptyStats(0);
  const iv = m?.ivs || emptyStats(31);
  const n = over.nature || m?.nature || 'Hardy';
  const L = m?.level || 100;
  const out = emptyStats(0);
  out.hp = Math.floor(((2 * base[0] + (iv.hp ?? 31) + Math.floor((e.hp || 0) / 4)) * L) / 100) + L + 10;
  (['atk', 'def', 'spa', 'spd', 'spe'] as const).forEach((s, i) => {
    out[s] = Math.floor((Math.floor(((2 * base[i + 1] + (iv[s] ?? 31) + Math.floor((e[s] || 0) / 4)) * L) / 100) + 5) * natureModifier(n, s));
  });
  return out;
}

export function grounded(m: Partial<TeamMon>): boolean {
  return !types(m).includes('Flying') && m.ability !== 'Levitate' && m.item !== 'Air Balloon';
}

export function hazardPct(m: Partial<TeamMon>, h: string): number {
  if (h === 'none' || m.item === 'Heavy-Duty Boots') return 0;
  if (h === 'rocks') return 12.5 * mult('Rock', types(m));
  if (!grounded(m)) return 0;
  return h === 'spikes1' ? 12.5 : h === 'spikes2' ? 16.67 : h === 'spikes3' ? 25 : 0;
}

/** Abilities that grant immunity to a move type/category. */
export function moveBlockingAbility(moveType: string, category: string, ability: string): string {
  const name = String(ability || '');
  if (!name) return '';
  if (name === 'Levitate' && moveType === 'Ground') return 'Levitate';
  if (name === 'Flash Fire' && moveType === 'Fire') return 'Flash Fire';
  if (name === 'Well-Baked Body' && moveType === 'Fire') return 'Well-Baked Body';
  if (name === 'Good as Gold' && category === 'Status') return 'Good as Gold';
  if (['Water Absorb', 'Dry Skin', 'Storm Drain'].includes(name) && moveType === 'Water') return name;
  if (['Volt Absorb', 'Motor Drive', 'Lightning Rod'].includes(name) && moveType === 'Electric') return name;
  if (name === 'Sap Sipper' && moveType === 'Grass') return 'Sap Sipper';
  if (name === 'Earth Eater' && moveType === 'Ground') return 'Earth Eater';
  return '';
}

export function loweredSpeedNature(n: string): boolean {
  return ['Brave', 'Quiet', 'Relaxed', 'Sassy'].includes(n);
}
export function boostedSpeedNature(n: string): boolean {
  return ['Jolly', 'Timid', 'Hasty', 'Naive'].includes(n);
}
export function hasMove(p: Partial<TeamMon>, moves: string[]): boolean {
  return (p.moves || []).some((x) => moves.includes(x));
}
export function offensiveMoveTypes(p: Partial<TeamMon>): string[] {
  return unique(
    (p.moves || [])
      .map((m) => [m, moveData(m)] as const)
      .filter(([, d]) => d && d[1] !== 'Status')
      .map(([, d]) => d![0]),
  );
}
export function dominantOffense(p: Partial<TeamMon>): 'physical' | 'special' | 'mixed' {
  const moves = (p.moves || []).map((m) => moveData(m)).filter(Boolean) as MoveData[];
  const phys = moves.filter((m) => m[1] === 'Physical').length;
  const spec = moves.filter((m) => m[1] === 'Special').length;
  const evPhys = (p.evs?.atk || 0) >= 160;
  const evSpec = (p.evs?.spa || 0) >= 160;
  if (evPhys || phys > spec + 1) return 'physical';
  if (evSpec || spec > phys + 1) return 'special';
  return 'mixed';
}
