// KO Actuary engine: damage rolls, multi-hit KO odds, and the battle-state model.
// Ports the legacy globals with the patch files folded in, in script order:
// app.js dmg/nHitChance/getAgentFacts → ko-upgrades.js (battle state, stages,
// screens, status, crit, terrain, end-step chip) → ko-spread-move-upgrades.js
// (spread-hit penalty) → ko-defensive-ability-upgrades.js (Multiscale/Filter/
// Thick Fat/... damage adjustments) → priority-blocking-upgrades.js (Armor
// Tail/Dazzling/Queenly Majesty + Psychic Terrain priority denial).
// DOM-bound legacy wrappers (renderKo, readKoBattleState, setStageOptions, the
// replay-parser prototype patches) are intentionally not ported — the React UI
// and the replay module own those seams. The pure helpers they used are
// exported here so callers can compose the same behavior.

import { Dex } from '@pkmn/dex';
import type { MoveData, Stats, TeamMon } from './types';
import { mult, toId } from './types';
import {
  getSpecies,
  grounded,
  hazardPct,
  moveBlockingAbility as typeBlockingAbility,
  moveCategory,
  moveData,
  movePriority,
  resolveMoveName,
  stats,
  types,
} from './dex';

const dex = Dex.forGen(9); // move target metadata for spread detection

export type KoMon = Partial<TeamMon> & { _defensiveTera?: string };
export interface KoStatOverride {
  evs?: Stats;
  nature?: string;
  item?: string;
}

// ---------------------------------------------------------------------------
// Battle state (ko-upgrades.js + ko-spread-move-upgrades.js)
// ---------------------------------------------------------------------------

export interface BattleState {
  weather: string;
  terrain: string;
  helpingHand: boolean;
  attackerProtect: string;
  defenderProtect: string;
  attackerOffenseStage: number;
  attackerBulkStage: number;
  defenderOffenseStage: number;
  defenderBulkStage: number;
  attackerStatus: string;
  criticalHit: boolean;
  extraEndSteps: number;
  defenderEndStepDamagePct: number;
  spreadDamage: boolean;
}

/** Loose inputs accepted by the battle-state helpers; `field` is the legacy combined weather/screen select. */
export type BattleStateInput = Partial<BattleState> & { field?: unknown };

export function clampStage(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-6, Math.min(6, Math.trunc(n)));
}

export function stageMultiplier(stage: number): number {
  const n = clampStage(stage);
  return n >= 0 ? (2 + n) / 2 : 2 / (2 - n);
}

/** Replaces the DOM-reading readKoBattleState: pass the raw field values in. */
export function normalizeBattleState(opt: BattleStateInput = {}): BattleState {
  const legacyField = String(opt.field || 'none');
  const legacyProtect = ['reflect', 'screen', 'auroraveil'].includes(legacyField) ? legacyField : 'none';
  const state: BattleState = {
    weather: String(opt.weather || (legacyField === 'rain' || legacyField === 'sun' ? legacyField : 'none') || 'none'),
    terrain: String(opt.terrain || 'none'),
    helpingHand: !!opt.helpingHand,
    attackerProtect: String(opt.attackerProtect || 'none'),
    defenderProtect: String(opt.defenderProtect || 'none'),
    attackerOffenseStage: clampStage(opt.attackerOffenseStage),
    attackerBulkStage: clampStage(opt.attackerBulkStage),
    defenderOffenseStage: clampStage(opt.defenderOffenseStage),
    defenderBulkStage: clampStage(opt.defenderBulkStage),
    attackerStatus: String(opt.attackerStatus || 'none'),
    criticalHit: !!opt.criticalHit,
    extraEndSteps: Math.max(0, Math.min(3, Math.trunc(Number(opt.extraEndSteps) || 0))),
    defenderEndStepDamagePct: Math.max(0, Math.min(100, Number(opt.defenderEndStepDamagePct) || 0)),
    spreadDamage: !!opt.spreadDamage,
  };
  if (state.attackerProtect === 'none' && state.defenderProtect === 'none' && legacyProtect !== 'none') {
    state.defenderProtect = legacyProtect;
  }
  return state;
}

export function swapBattleState(state: BattleStateInput = {}): BattleState {
  const battle = normalizeBattleState(state);
  return {
    weather: battle.weather,
    terrain: battle.terrain,
    helpingHand: false,
    attackerProtect: battle.defenderProtect,
    defenderProtect: battle.attackerProtect,
    attackerOffenseStage: battle.defenderOffenseStage,
    attackerBulkStage: battle.defenderBulkStage,
    defenderOffenseStage: battle.attackerOffenseStage,
    defenderBulkStage: battle.attackerBulkStage,
    attackerStatus: 'none',
    criticalHit: false,
    extraEndSteps: 0,
    defenderEndStepDamagePct: 0,
    spreadDamage: false,
  };
}

const protectionLabel = (protect = ''): string =>
  ({ reflect: 'Reflect', screen: 'Light Screen', auroraveil: 'Aurora Veil' })[protect] || '';
const terrainLabel = (terrain = ''): string =>
  ({ electric: 'Electric Terrain', grassy: 'Grassy Terrain', psychic: 'Psychic Terrain', misty: 'Misty Terrain' })[terrain] || '';
const statusLabel = (status = ''): string =>
  ({ burn: 'Burned', poison: 'Poisoned', toxic: 'Badly poisoned', paralysis: 'Paralyzed' })[status] || '';
const signedStage = (n: number, label: string): string => {
  const v = clampStage(n);
  return v ? `${v > 0 ? '+' : ''}${v} ${label}` : '';
};

export function battleStateSummary(state: BattleStateInput = {}): string {
  const battle = normalizeBattleState(state);
  const parts: string[] = [];
  if (battle.weather === 'rain') parts.push('Rain');
  if (battle.weather === 'sun') parts.push('Sun');
  if (battle.terrain !== 'none') parts.push(terrainLabel(battle.terrain));
  if (battle.helpingHand) parts.push('Helping Hand');
  if (battle.attackerProtect !== 'none') parts.push(`attacker ${protectionLabel(battle.attackerProtect)}`);
  if (battle.defenderProtect !== 'none') parts.push(`defender ${protectionLabel(battle.defenderProtect)}`);
  if (battle.attackerOffenseStage) parts.push(`attacker ${signedStage(battle.attackerOffenseStage, 'offense')}`);
  if (battle.attackerBulkStage) parts.push(`attacker ${signedStage(battle.attackerBulkStage, 'bulk')}`);
  if (battle.defenderOffenseStage) parts.push(`defender ${signedStage(battle.defenderOffenseStage, 'offense')}`);
  if (battle.defenderBulkStage) parts.push(`defender ${signedStage(battle.defenderBulkStage, 'bulk')}`);
  if (battle.attackerStatus !== 'none') parts.push(`attacker ${statusLabel(battle.attackerStatus)}`);
  if (battle.criticalHit) parts.push('critical hit');
  if (battle.extraEndSteps) parts.push(`${battle.extraEndSteps} extra end step${battle.extraEndSteps === 1 ? '' : 's'}`);
  if (battle.defenderEndStepDamagePct) parts.push(`defender loses ${battle.defenderEndStepDamagePct}% each end step`);
  const summary = parts.length ? parts.join(' • ') : 'Neutral';
  if (!battle.spreadDamage) return summary;
  return summary === 'Neutral' ? 'Spread hit penalty' : `${summary} • Spread hit penalty`;
}

// ---------------------------------------------------------------------------
// Damage roll shape
// ---------------------------------------------------------------------------

export interface KoRoll {
  att: KoMon;
  def: KoMon;
  mv: string;
  move: MoveData;
  moveType: string;
  rolls: number[];
  max: number;
  ehp: number;
  hz: number;
  min: number;
  maxd: number;
  minp: number;
  maxp: number;
  ko: number;
  two: number;
  three: number;
  eff: number;
  hit: number;
  blockedBy: string;
  battleState: BattleState;
  spreadAdjusted?: boolean;
  spreadModifier?: number;
  defensiveAbilityMultiplier: number;
  defensiveAbilityNotes: string[];
}

export interface KoHitInput {
  ehp: number;
  max: number;
  hit: number;
  rolls: number[];
  def?: KoMon | null;
  battleState?: Partial<BattleState> | null;
}

// ---------------------------------------------------------------------------
// Priority blocking (priority-blocking-upgrades.js)
// ---------------------------------------------------------------------------

export const PRIORITY_BLOCKING_ABILITIES: ReadonlySet<string> = new Set([
  'Armor Tail',
  'Dazzling',
  'Queenly Majesty',
]);

export const NON_BLOCKABLE_PRIORITY_MOVES: ReadonlySet<string> = new Set([
  'After You',
  'Ally Switch',
  'Baneful Bunker',
  'Burning Bulwark',
  'Crafty Shield',
  'Detect',
  'Endure',
  'Follow Me',
  'Helping Hand',
  "King's Shield",
  'Magic Coat',
  'Mat Block',
  'Obstruct',
  'Protect',
  'Quick Guard',
  'Rage Powder',
  'Silk Trap',
  'Snatch',
  'Spiky Shield',
  'Spotlight',
  'Wide Guard',
]);

/** Terrain context accepted by the priority helpers: a BattleState, {terrain}, or {battleState:{terrain}}. */
export interface PriorityContext {
  terrain?: string;
  battleState?: { terrain?: string } | null;
}

/** Maps replay/label text like 'move: Grassy Terrain' or 'Grassy Terrain' to an engine terrain id ('' when none). */
export function normalizedTerrain(raw: unknown): string {
  const label = String(raw || '').replace(/^(move|ability): /, '').trim().toLowerCase();
  if (!label || label === 'none') return '';
  if (label.includes('electric')) return 'electric';
  if (label.includes('grassy')) return 'grassy';
  if (label.includes('misty')) return 'misty';
  if (label.includes('psychic')) return 'psychic';
  return '';
}

function priorityContextTerrain(context: PriorityContext | null | undefined): string {
  return normalizedTerrain(context?.terrain || context?.battleState?.terrain);
}

export function movePriorityValue(move: unknown, context: PriorityContext | null = null): number {
  let priority = Number(movePriority(move));
  if (!Number.isFinite(priority)) priority = 0;
  if (resolveMoveName(move) === 'Grassy Glide' && priorityContextTerrain(context) === 'grassy') {
    priority = Math.max(priority, 1);
  }
  return priority;
}

function moveCategoryValue(move: unknown): string {
  return String(moveCategory(move) || '');
}

type AbilityBypassMode = 'all' | 'status' | '';

function abilityBypassMode(ability: unknown): AbilityBypassMode {
  const name = String(ability || '').trim();
  if (['Mold Breaker', 'Teravolt', 'Turboblaze'].includes(name)) return 'all';
  if (name === 'Mycelium Might') return 'status';
  return '';
}

export function attackerBypassesPriorityBlocker(ability: unknown, move: unknown = ''): boolean {
  const mode = abilityBypassMode(ability);
  if (mode === 'all') return true;
  if (mode === 'status') return moveCategoryValue(move) === 'Status';
  return false;
}

export function isPriorityBlockingAbility(ability: unknown): boolean {
  return PRIORITY_BLOCKING_ABILITIES.has(String(ability || '').trim());
}

export function isBlockablePriorityMove(move: unknown, context: PriorityContext | null = null): boolean {
  const name = resolveMoveName(move);
  return movePriorityValue(name, context) > 0 && !NON_BLOCKABLE_PRIORITY_MOVES.has(name);
}

export function isDirectPriorityAttack(move: unknown, context: PriorityContext | null = null): boolean {
  return isBlockablePriorityMove(move, context) && moveCategoryValue(move) !== 'Status';
}

export function canBePriorityBlockedWithProof(move: unknown, context: PriorityContext | null = null): boolean {
  if (isBlockablePriorityMove(move, context)) return true;
  return resolveMoveName(move) === 'Grassy Glide';
}

export function priorityBlockingAbility(ability: unknown, move: unknown = '', context: PriorityContext | null = null): string {
  const name = String(ability || '').trim();
  if (!isPriorityBlockingAbility(name)) return '';
  return isBlockablePriorityMove(move, context) ? name : '';
}

function detectiveAbilityPool(species: unknown): string[] {
  const data = getSpecies(species);
  return [...new Set(Object.values(data?.abilities || {}).filter(Boolean))];
}

/** Abilities on the species that would block the given move — the contradiction pool for landed priority. */
export function priorityBlockedAbilities(species: unknown, move: unknown = '', context: PriorityContext | null = null): string[] {
  if (!isBlockablePriorityMove(move, context)) return [];
  return detectiveAbilityPool(species).filter((ability) => priorityBlockingAbility(ability, move, context));
}

export function normalizeAbilityLabel(raw: unknown): string {
  return String(raw || '').replace(/^(ability|move): /, '').trim();
}

export function priorityBlockerClueLabel(
  ability: unknown,
  move: unknown = '',
  context: PriorityContext | null = null,
  assumeTriggered = false,
): string {
  const blocker = assumeTriggered
    ? String(ability || '').trim()
    : priorityBlockingAbility(ability, move, context);
  if (!blocker || !move) return `${ability} revealed`;
  return `${blocker} blocked ${move}`;
}

/** Priority-aware clue label with an "assume it triggered" proof mode; falls back to `${ability} revealed`. */
export function priorityBlockerClueLabelWithProof(
  ability: unknown,
  move: unknown = '',
  context: PriorityContext | null = null,
  assumeTriggered = false,
): string {
  const triggered =
    priorityBlockingAbility(ability, move, context) ||
    (!!assumeTriggered && canBePriorityBlockedWithProof(move, context) && isPriorityBlockingAbility(ability));
  if (move && triggered) {
    const label = priorityBlockerClueLabel(ability, move, context, assumeTriggered);
    if (label !== `${ability} revealed`) return label;
  }
  return `${ability} revealed`;
}

/** The patched abilityRewardText contribution: priority blockers get their tactical reward named. */
export function priorityBlockerRewardText(ability: unknown): string {
  return isPriorityBlockingAbility(ability) ? 'blanking opposing priority attacks' : '';
}

export interface TurnMoveEventLike {
  slot?: string;
  move?: string;
  species?: string;
}

export interface ReplayEventLike {
  type?: string;
  target?: string;
  effect?: string;
  from?: string;
  details?: string;
}

export interface PriorityBlockReveal {
  ability: string;
  species: string;
  slot: string;
  moveEvent: TurnMoveEventLike;
  text: string;
  label: string;
}

/**
 * The `-activate` branch of the patched ReplayParser.extractEvidence: an Armor
 * Tail/Dazzling/Queenly Majesty activation paired with the most recent opposing
 * blockable priority move yields an ability reveal, or null.
 */
export function detectPriorityBlockReveal(
  event: ReplayEventLike | null | undefined,
  turnMoves: TurnMoveEventLike[] = [],
  context: PriorityContext | null = null,
): PriorityBlockReveal | null {
  if (!event || event.type !== '-activate' || !event.target) return null;
  const ability = normalizeAbilityLabel(event.effect || event.from || '');
  if (!isPriorityBlockingAbility(ability)) return null;
  const slot = String(event.target).split(':')[0].trim();
  const species =
    String(event.details || '').split(',')[0].trim() ||
    String(event.target).split(':').slice(1).join(':').trim();
  const moveEvent = [...(turnMoves || [])]
    .reverse()
    .find((entry) => entry?.move && entry.slot && entry.slot !== slot);
  const move = String(moveEvent?.move || '').trim();
  if (!moveEvent || !move || !isBlockablePriorityMove(move, context)) return null;
  return {
    ability,
    species,
    slot,
    moveEvent,
    text: `${species} revealed ${ability} by blocking ${move}`,
    label: priorityBlockerClueLabel(ability, move, context, true),
  };
}

/** Standalone replay-terrain tracker extracted from the patched ReplayParser methods. */
export class PriorityTerrainTracker {
  private currentTerrain = '';

  record(effect: unknown): void {
    const terrain = normalizedTerrain(effect);
    if (terrain) this.currentTerrain = terrain;
  }

  clear(effect: unknown): void {
    const terrain = normalizedTerrain(effect);
    if (terrain && this.currentTerrain === terrain) this.currentTerrain = '';
  }

  current(): string {
    return this.currentTerrain;
  }
}

/** Extended move-blocking check: priority-blocking abilities first, then the base type/category immunities. */
export function moveBlockingAbility(
  moveType: string,
  category: string,
  ability: string,
  move: unknown = '',
  context: PriorityContext | null = null,
): string {
  const blocker = priorityBlockingAbility(ability, move, context);
  if (blocker) return blocker;
  return typeBlockingAbility(moveType, category, ability);
}

// ---------------------------------------------------------------------------
// Spread moves (ko-spread-move-upgrades.js)
// ---------------------------------------------------------------------------

const KNOWN_SPREAD_MOVES = new Set([
  'Blizzard',
  'Bleakwind Storm',
  'Breaking Swipe',
  'Bulldoze',
  'Dazzling Gleam',
  'Discharge',
  'Earthquake',
  'Eerie Spell',
  'Electroweb',
  'Expanding Force',
  'Heat Wave',
  'Hyper Voice',
  'Icy Wind',
  'Lava Plume',
  'Make It Rain',
  'Magnitude',
  'Muddy Water',
  'Petal Blizzard',
  'Razor Leaf',
  'Rock Slide',
  'Snarl',
  'Struggle Bug',
  'Surf',
  'Twister',
]);
const MULTI_TARGET_VALUES = new Set(['alladjacent', 'alladjacentfoes', 'all']);

/** Whether the move hits multiple targets — the spread-penalty gate. */
export function spreadDamageApplies(move: unknown): boolean {
  const name = resolveMoveName(move);
  if (!name) return false;
  const dexMove = dex.moves.get(name);
  const target = (dexMove as { target?: string } | undefined)?.target;
  if (MULTI_TARGET_VALUES.has(String(target || '').trim().toLowerCase())) return true;
  return KNOWN_SPREAD_MOVES.has(name);
}

function scalePositiveDamage(value: unknown, multiplier = 0.75): number {
  const n = Number(value) || 0;
  if (n <= 0) return 0;
  return Math.max(1, Math.floor(n * multiplier));
}

export function nHitChance(r: KoHitInput, hits: number): number {
  const battle = r?.battleState || {};
  const extraEndSteps = Math.max(0, Number(battle.extraEndSteps) || 0);
  const endStepsPerGap = 1 + extraEndSteps;
  const leftoversPerTick = r.def?.item === 'Leftovers' ? Math.floor(r.max / 16) : 0;
  const grassyRecoveryPerTick =
    battle.terrain === 'grassy' && r.def && grounded(r.def) ? Math.floor(r.max / 16) : 0;
  const passiveChipPct = Math.max(0, Number(battle.defenderEndStepDamagePct) || 0);
  const passiveChipPerTick = passiveChipPct ? Math.floor(r.max * passiveChipPct / 100) : 0;
  const gaps = Math.max(0, hits - 1);
  const threshold = Math.max(
    1,
    r.ehp +
      (leftoversPerTick + grassyRecoveryPerTick) * endStepsPerGap * gaps -
      passiveChipPerTick * endStepsPerGap * gaps,
  );
  let sums: Record<number, number> = { 0: 1 };
  for (let i = 0; i < hits; i++) {
    const next: Record<number, number> = {};
    Object.entries(sums).forEach(([sum, count]) =>
      r.rolls.forEach((d) => {
        const ns = +sum + d;
        next[ns] = (next[ns] || 0) + count;
      }),
    );
    sums = next;
  }
  const total = 16 ** hits;
  const success = Object.entries(sums).reduce((a, [s, c]) => a + (+s >= threshold ? c : 0), 0);
  return (success / total) * (r.hit ** hits);
}

type KoRollLike = KoRoll & { [k: string]: unknown };

function recomputeKoOdds(roll: KoRollLike): KoRollLike {
  const next: KoRollLike = { ...roll };
  const rolls = Array.isArray(next.rolls) ? next.rolls : [];
  const ehp = Math.max(1, Number(next.ehp) || 1);
  const hit = Number(next.hit) || 1;
  next.min = rolls.length ? Math.min(...rolls) : 0;
  next.maxd = rolls.length ? Math.max(...rolls) : 0;
  next.minp = next.max ? (next.min / next.max) * 100 : 0;
  next.maxp = next.max ? (next.maxd / next.max) * 100 : 0;
  next.ko = (rolls.filter((value) => value >= ehp).length / 16) * hit;
  next.two = nHitChance(next, 2);
  next.three = nHitChance(next, 3);
  return next;
}

/** Applies the 0.75 doubles spread penalty when the battle-state flag and move agree. */
export function applySpreadDamagePenalty(roll: KoRoll, mv = ''): KoRoll {
  if (!roll?.battleState?.spreadDamage) return roll;
  if (roll.blockedBy || roll.eff === 0) return roll;
  if (!spreadDamageApplies(mv)) return roll;
  const category = String(roll.move?.[1] || '');
  if (category === 'Status') return roll;
  const scaledRolls = (roll.rolls || []).map((v) => scalePositiveDamage(v));
  return recomputeKoOdds({ ...roll, rolls: scaledRolls, spreadAdjusted: true, spreadModifier: 0.75 });
}

// ---------------------------------------------------------------------------
// Defensive ability damage adjustments (ko-defensive-ability-upgrades.js)
// ---------------------------------------------------------------------------

const SOUND_MOVES = new Set([
  'Alluring Voice',
  'Boomburst',
  'Bug Buzz',
  'Clanging Scales',
  'Disarming Voice',
  'Echoed Voice',
  'Hyper Voice',
  'Overdrive',
  'Parting Shot',
  'Psychic Noise',
  'Relic Song',
  'Round',
  'Snarl',
  'Snore',
  'Sparkling Aria',
  'Torch Song',
  'Uproar',
]);

const isSoundMove = (move: unknown): boolean => SOUND_MOVES.has(String(move || '').trim());

function fullHpAbilityWindowActive(roll: Pick<KoRoll, 'max' | 'ehp' | 'hz'>): boolean {
  const max = Number(roll?.max) || 0;
  const ehp = Number(roll?.ehp) || 0;
  const hz = Number(roll?.hz) || 0;
  return max > 0 && ehp >= max && hz <= 0;
}

function attackerBypassesDefensiveAbility(roll: KoRoll, mv = ''): boolean {
  const mode = abilityBypassMode(roll?.att?.ability);
  if (mode === 'all') return true;
  if (mode === 'status') return String(roll?.move?.[1] || '') === 'Status' || !mv;
  return false;
}

function defensiveAbilityAdjustments(roll: KoRoll, mv = ''): { multiplier: number; notes: string[] } {
  const ability = String(roll?.def?.ability || '').trim();
  const notes: string[] = [];
  let multiplier = 1;
  if (!ability || roll?.blockedBy || Number(roll?.eff) === 0 || attackerBypassesDefensiveAbility(roll, mv)) {
    return { multiplier, notes };
  }
  const rollMoveType = String(roll?.moveType || roll?.move?.[0] || '').trim();
  const rollMoveCategory = String(roll?.move?.[1] || '').trim();
  if (['Multiscale', 'Shadow Shield'].includes(ability) && fullHpAbilityWindowActive(roll)) {
    multiplier *= 0.5;
    notes.push(`${ability} was active at full HP, halving the hit.`);
  }
  if (['Filter', 'Solid Rock', 'Prism Armor'].includes(ability) && Number(roll?.eff) > 1) {
    multiplier *= 0.75;
    notes.push(`${ability} softened the super-effective hit.`);
  }
  if (ability === 'Thick Fat' && ['Fire', 'Ice'].includes(rollMoveType)) {
    multiplier *= 0.5;
    notes.push(`Thick Fat reduced the ${rollMoveType} damage.`);
  }
  if (ability === 'Heatproof' && rollMoveType === 'Fire') {
    multiplier *= 0.5;
    notes.push('Heatproof reduced the Fire damage.');
  }
  if (ability === 'Dry Skin' && rollMoveType === 'Fire') {
    multiplier *= 1.25;
    notes.push('Dry Skin made the Fire hit stronger.');
  }
  if (ability === 'Water Bubble' && rollMoveType === 'Fire') {
    multiplier *= 0.5;
    notes.push('Water Bubble reduced the Fire damage.');
  }
  if (ability === 'Purifying Salt' && rollMoveType === 'Ghost') {
    multiplier *= 0.5;
    notes.push('Purifying Salt reduced the Ghost damage.');
  }
  if (ability === 'Punk Rock' && isSoundMove(mv)) {
    multiplier *= 0.5;
    notes.push(`Punk Rock reduced the sound-based damage from ${String(mv || '').trim()}.`);
  }
  if (ability === 'Fur Coat' && rollMoveCategory === 'Physical') {
    multiplier *= 0.5;
    notes.push('Fur Coat cut the physical damage in half.');
  }
  if (ability === 'Ice Scales' && rollMoveCategory === 'Special') {
    multiplier *= 0.5;
    notes.push('Ice Scales cut the special damage in half.');
  }
  return { multiplier, notes };
}

/** Rescales the roll for defender damage-modifying abilities; annotates with defensiveAbilityNotes. */
export function applyDefensiveAbilityAdjustments(roll: KoRoll, mv = ''): KoRoll {
  const adjustment = defensiveAbilityAdjustments(roll, mv);
  if (adjustment.multiplier === 1) {
    return {
      ...roll,
      defensiveAbilityMultiplier: 1,
      defensiveAbilityNotes: adjustment.notes,
    };
  }
  return recomputeKoOdds({
    ...roll,
    rolls: (roll.rolls || []).map((value) => scalePositiveDamage(value, adjustment.multiplier)),
    defensiveAbilityMultiplier: adjustment.multiplier,
    defensiveAbilityNotes: adjustment.notes,
  });
}

// ---------------------------------------------------------------------------
// dmg pipeline
// ---------------------------------------------------------------------------

export interface KoOptions extends BattleStateInput {
  hpPct?: number | string;
  hazards?: string;
  attackerTera?: boolean;
  attackerTeraType?: string;
  defenderTera?: boolean;
  defenderTeraType?: string;
  attOver?: KoStatOverride;
  defOver?: KoStatOverride;
}

function effectiveSet(
  m: KoMon,
  opts: { attackerTera?: boolean; defenderTera?: boolean; teraType?: string } = {},
): KoMon {
  const copy = { ...m };
  if (opts.attackerTera || opts.defenderTera) copy.tera = opts.teraType || m.tera;
  return copy;
}

function baseDamage(att: KoMon, def: KoMon, mv: string, opt: KoOptions = {}): KoRoll {
  const m = moveData(mv);
  if (!m) throw Error('Unknown move: ' + mv);
  if (m[1] === 'Status') throw Error(mv + ' is a status move.');
  const battle = normalizeBattleState(opt);
  const aa = effectiveSet(att, { attackerTera: opt.attackerTera, teraType: opt.attackerTeraType });
  const dd = effectiveSet(def, { defenderTera: opt.defenderTera, teraType: opt.defenderTeraType });
  const sa = stats(aa, opt.attOver || {});
  const sd = stats(dd, opt.defOver || {});
  const cat = m[1];
  let A = cat === 'Physical' ? sa.atk : sa.spa;
  let D = cat === 'Physical' ? sd.def : sd.spd;
  if (m[5] === 'def') A = sa.def;
  if (m[5] === 'targetDef') D = sd.def;
  const atkStage = m[5] === 'def' ? battle.attackerBulkStage : battle.attackerOffenseStage;
  const attackerOffenseStage = battle.criticalHit ? Math.max(0, atkStage) : atkStage;
  const defenderBulkStage = battle.criticalHit ? Math.min(0, battle.defenderBulkStage) : battle.defenderBulkStage;
  A *= stageMultiplier(attackerOffenseStage);
  D *= stageMultiplier(defenderBulkStage);
  const ai = opt.attOver?.item || aa.item || '';
  const di = opt.defOver?.item || dd.item || '';
  if (cat === 'Physical' && ai === 'Choice Band') A *= 1.5;
  if (cat === 'Special' && ai === 'Choice Specs') A *= 1.5;
  if (cat === 'Special' && di === 'Assault Vest') D *= 1.5;
  let bp = m[2];
  const moveId = toId(mv);
  if (moveId === 'weatherball' && (battle.weather === 'sun' || battle.weather === 'rain')) bp = 100;
  let moveType = m[0];
  if (moveId === 'weatherball' && battle.weather === 'sun') moveType = 'Fire';
  if (moveId === 'weatherball' && battle.weather === 'rain') moveType = 'Water';
  const attackerGrounded = grounded(aa);
  const defenderGrounded = grounded(dd);
  if (moveId === 'facade' && battle.attackerStatus !== 'none') bp *= 2;
  if (battle.terrain === 'grassy' && defenderGrounded && ['earthquake', 'bulldoze', 'magnitude'].includes(moveId)) bp *= 0.5;
  const base = Math.floor(Math.floor(Math.floor(((2 * (aa.level || 100)) / 5 + 2) * bp * A / D) / 50) + 2);
  const aTera = opt.attackerTeraType || aa.tera || types(aa)[0];
  const dTera = opt.defenderTeraType || dd.tera || types(dd)[0];
  // Stellar keeps the mon's original typing (defensively it's not a type at
  // all; offensively it keeps STAB — the one-time 1.2×/2× per-type bonus isn't
  // modeled by this single-call engine)
  const atkTypes = opt.attackerTera && aTera !== 'Stellar' ? [aTera] : types(aa);
  const defTypes = opt.defenderTera && dTera !== 'Stellar' ? [dTera] : types(dd);
  const blockedBy = typeBlockingAbility(moveType, cat, dd.ability || '');
  const eff = blockedBy ? 0 : mult(moveType, defTypes);
  const stab = atkTypes.includes(moveType) ? 1.5 : 1;
  let mod = eff * stab;
  if (battle.helpingHand) mod *= 1.5;
  if (ai === 'Life Orb') mod *= 1.3;
  if (ai === 'Expert Belt' && eff > 1) mod *= 1.2;
  if (ai === 'Black Glasses' && moveType === 'Dark') mod *= 1.2;
  if (ai === 'Charcoal' && moveType === 'Fire') mod *= 1.2;
  if (cat === 'Physical' && battle.attackerStatus === 'burn' && aa.ability !== 'Guts') mod *= 0.5;
  if (cat === 'Physical' && battle.attackerStatus !== 'none' && aa.ability === 'Guts') mod *= 1.5;
  if (aa.ability === 'Solar Power' && battle.weather === 'sun' && cat === 'Special') mod *= 1.5;
  if (battle.weather === 'rain' && moveType === 'Water') mod *= 1.5;
  if (battle.weather === 'rain' && moveType === 'Fire') mod *= 0.5;
  if (battle.weather === 'sun' && moveType === 'Fire') mod *= 1.5;
  if (battle.weather === 'sun' && moveType === 'Water') mod *= 0.5;
  if (battle.terrain === 'electric' && attackerGrounded && moveType === 'Electric') mod *= 1.3;
  if (battle.terrain === 'grassy' && attackerGrounded && moveType === 'Grass') mod *= 1.3;
  if (battle.terrain === 'psychic' && attackerGrounded && moveType === 'Psychic') mod *= 1.3;
  if (battle.terrain === 'misty' && defenderGrounded && moveType === 'Dragon') mod *= 0.5;
  if ((battle.defenderProtect === 'reflect' || battle.defenderProtect === 'auroraveil') && cat === 'Physical') mod *= 0.5;
  if ((battle.defenderProtect === 'screen' || battle.defenderProtect === 'auroraveil') && cat === 'Special') mod *= 0.5;
  if (battle.criticalHit) mod *= 1.5;
  const rolls: number[] = [];
  if (blockedBy) for (let i = 0; i < 16; i++) rolls.push(0);
  else for (let r = 85; r <= 100; r++) rolls.push(Math.max(1, Math.floor((base * mod * r) / 100)));
  const hpPct = +opt.hpPct! || 100;
  const hz = hazardPct(dd, opt.hazards || 'none');
  const max = sd.hp;
  const ehp = Math.max(1, Math.floor((max * Math.max(0, hpPct - hz)) / 100));
  const hit = (m[3] || 100) / 100;
  const ko = (rolls.filter((x) => x >= ehp).length / 16) * hit;
  const chanceN = (n = 2): number => {
    let combos = [0];
    for (let i = 0; i < n; i++) {
      const next: number[] = [];
      for (const c of combos) for (const r of rolls) next.push(c + r);
      combos = next;
    }
    return (combos.filter((x) => x >= ehp).length / combos.length) * Math.pow(hit, n);
  };
  return {
    att: aa,
    def: dd,
    mv,
    move: m,
    moveType,
    rolls,
    max,
    ehp,
    hz,
    min: Math.min(...rolls),
    maxd: Math.max(...rolls),
    minp: (Math.min(...rolls) / max) * 100,
    maxp: (Math.max(...rolls) / max) * 100,
    ko,
    two: chanceN(2),
    three: chanceN(3),
    eff,
    hit,
    blockedBy,
    battleState: battle,
    defensiveAbilityMultiplier: 1,
    defensiveAbilityNotes: [],
  };
}

function zeroPriorityRoll(roll: KoRoll, blocker: string): KoRoll {
  return {
    ...roll,
    blockedBy: blocker,
    eff: 0,
    rolls: new Array(16).fill(0),
    min: 0,
    maxd: 0,
    minp: 0,
    maxp: 0,
    ko: 0,
    two: 0,
    three: 0,
  };
}

function groundedTarget(target: KoMon | undefined): boolean {
  if (!target) return false;
  try {
    return !!grounded(target);
  } catch {
    return false;
  }
}

function psychicTerrainPriorityBlock(roll: KoRoll, move: unknown): string {
  if (roll?.blockedBy) return '';
  if (priorityContextTerrain(roll) !== 'psychic') return '';
  if (!isDirectPriorityAttack(move, roll?.battleState)) return '';
  return groundedTarget(roll?.def) ? 'Psychic Terrain' : '';
}

/** Zeroes the roll when a blocker ability or grounded Psychic Terrain denies a direct priority attack. */
export function applyPriorityBlocking(roll: KoRoll, mv: string): KoRoll {
  const blocker =
    isDirectPriorityAttack(mv, roll?.battleState) && !attackerBypassesPriorityBlocker(roll.att?.ability, mv)
      ? priorityBlockingAbility(roll.def?.ability, mv, roll?.battleState)
      : '';
  if (blocker) return zeroPriorityRoll(roll, blocker);
  const terrainBlocker = psychicTerrainPriorityBlock(roll, mv);
  if (terrainBlocker) return zeroPriorityRoll(roll, terrainBlocker);
  return roll;
}

export function dmg(att: KoMon, def: KoMon, mv: string, opt: KoOptions = {}): KoRoll {
  const roll = applySpreadDamagePenalty(baseDamage(att, def, mv, opt), mv);
  const adjusted = applyDefensiveAbilityAdjustments(roll, mv);
  return applyPriorityBlocking(adjusted, mv);
}

// ---------------------------------------------------------------------------
// Agent facts (app.js getAgentFacts + ko-upgrades.js actuary patch)
// ---------------------------------------------------------------------------

export interface AgentFactsAnalysis {
  status?: unknown;
  rows?: { tp?: string }[];
  typeCounts?: unknown;
  missing?: unknown;
  red?: unknown;
}

export interface AgentFactsReasoner {
  identity?: { primary?: { name?: string } | null } | null;
  suggestions?: { pokemon?: string }[] | null;
}

export interface DetectiveTopRead {
  item?: string;
  nature?: string;
  ability?: string;
  prob?: number;
}

export interface DetectiveReadLike {
  input?: { species?: string };
  top?: DetectiveTopRead[];
  summary?: { confidence?: { label?: string }; verdict?: string; notes?: string[] };
}

export interface ReplayTargetLike {
  species?: string;
  revealedItem?: string;
  movedFirst?: boolean;
  evidenceCount?: number;
  detectiveBranchCount?: number;
  notes?: string[];
}

export interface ReplayReadLike {
  strongest?: ReplayTargetLike | null;
  targets?: unknown[];
}

export interface AgentFactsContext extends KoOptions {
  analysis?: AgentFactsAnalysis | null;
  reasoner?: AgentFactsReasoner | null;
  /** Legacy called runReasoner() before reading reasoner output; supply the real one or omit. */
  runReasoner?: () => void;
  attacker?: KoMon | null;
  defender?: KoMon | null;
  move?: string;
  detectiveRead?: DetectiveReadLike | null;
  replayRead?: ReplayReadLike | null;
}

export function getAgentFacts(agent: string, ctx: AgentFactsContext = {}): Record<string, unknown> {
  const facts: Record<string, unknown> = {};
  const analysis = ctx.analysis ?? null;
  if (analysis) {
    ctx.runReasoner?.();
    facts.status = analysis.status;
    facts.weaknesses = analysis.rows?.slice(0, 3);
    facts.typeCounts = analysis.typeCounts;
    facts.missing = analysis.missing;
    facts.redundancies = analysis.red;
    facts.worstType = analysis.rows?.[0]?.tp;
    facts.identity = ctx.reasoner?.identity?.primary?.name;
    facts.topSuggestion = ctx.reasoner?.suggestions?.[0]?.pokemon;
  }
  if (agent === 'actuary') {
    const a = ctx.attacker;
    const d = ctx.defender;
    const move = ctx.move;
    if (a && d && move) {
      const battleState = normalizeBattleState(ctx);
      const r = dmg(a, d, move, {
        hpPct: Number(ctx.hpPct) || 100,
        hazards: ctx.hazards || 'none',
        attackerTera: ctx.attackerTera,
        defenderTera: ctx.defenderTera,
        attackerTeraType: ctx.attackerTeraType,
        defenderTeraType: ctx.defenderTeraType,
        ...battleState,
      });
      facts.attacker = a.species;
      facts.defender = d.species;
      facts.move = move;
      facts.koChance = (r.ko * 100).toFixed(1);
      try {
        const rm = (d.moves || []).find((x) => moveData(x) && moveCategory(x) !== 'Status') || 'Earthquake';
        const rev = dmg(d, a, rm, { hpPct: 100, ...swapBattleState(battleState) });
        facts.reverseKo = (rev.ko * 100).toFixed(1);
        facts.reverseMove = rm;
      } catch {
        facts.reverseKo = '?';
      }
    }
  }
  if (agent === 'detective') {
    const read = ctx.detectiveRead ?? null;
    const replay = ctx.replayRead?.strongest ?? null;
    if (read?.top?.length) {
      const top = read.top[0];
      facts.species = read.input?.species;
      facts.topItem = top.item;
      facts.topNature = top.ability ? `${top.nature} with ${top.ability}` : top.nature;
      facts.topAbility = top.ability;
      facts.prob = top.prob;
      facts.confidence = read.summary?.confidence?.label || `${((top.prob || 0) * 100).toFixed(1)}%`;
      facts.verdict = read.summary?.verdict;
      facts.notes = read.summary?.notes || [];
    } else if (replay) {
      facts.species = replay.species;
      facts.topItem = replay.revealedItem || 'Unconfirmed item';
      facts.topNature = replay.movedFirst ? 'fast line favored' : 'nature still open';
      facts.prob = 0.5;
      facts.confidence = 'Replay-only';
      const trackedTargets = ctx.replayRead?.targets?.length || 1;
      const branches = replay.detectiveBranchCount || 0;
      facts.verdict = `Replay Observer has ${replay.evidenceCount} structured clue(s) on ${replay.species}${
        branches > 1 ? `, including ${branches} detective-ready branches` : ''
      }${
        trackedTargets > 1 ? `, while keeping ${trackedTargets - 1} other replay-backed target${trackedTargets - 1 === 1 ? '' : 's'} live` : ''
      }.`;
      facts.notes = replay.notes || [];
    }
  }
  return facts;
}
