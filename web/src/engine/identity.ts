// Team profiling, archetype identity detection, synergy scoring, and matchup framing.
// Ported from src/app.js plus the identity patch stack, applied in index.html script
// order: weather-identity-upgrades → balance-identity-upgrades →
// weather-turn-economy-upgrades → trick-room-identity-upgrades →
// tailwind-identity-upgrades → screens-identity-upgrades → webs-identity-upgrades.
// Each patch wraps the previous functions; this module composes them as sequential
// passes so the merged semantics match the last-applied wrapper chain exactly.
//
// Legacy test harnesses pass mons carrying ad-hoc fields (baseStats/offensiveTypes/
// types/isDefensiveAnchor/isRemovalDenial/airborne) that production parseTeam mons
// never populate; this port honors those overrides when present and otherwise falls
// back to dex-derived data, which is the production-correct behavior.

import type { StatKey, TeamMon } from './types';
import { clamp, unique, mult } from './types';
import {
  types, stats, boostedSpeedNature, loweredSpeedNature, hasMove,
  offensiveMoveTypes, dominantOffense, movePriority,
} from './dex';
import type { AnalysisResult, Roles } from './analysis';

// ---------- contracts ----------

export interface IdentityRow {
  name: string;
  score: number;
  evidence: string[];
  plan?: string;
}

export interface IdentityResult {
  primary: IdentityRow;
  secondary: IdentityRow[];
  all: IdentityRow[];
}

export interface FieldControl {
  hazardSetting: number;
  hazardRemoval: number;
  removalDenial: number;
  chipAbuse: number;
  pivotAbuse: number;
  setterOverload: number;
  score: number;
}

export interface SynergyIssue {
  severity: string;
  title: string;
  detail: string;
}

export interface SynergyScores {
  typeSynergy: number;
  roleCompression: number;
  offensiveCoverage: number;
  defensiveBackbone: number;
  fieldControl: number;
  speedControl: number;
  winReliability: number;
}

export interface SynergyResult {
  scores: SynergyScores;
  fieldControl: FieldControl;
  roleQualityOverloads: string[];
  issues: SynergyIssue[];
}

export interface MatchupRow {
  name: string;
  score: number;
  class: string;
  reason: string;
  advice: string;
}

/** Merged TeamProfile: base app.js fields + every patch-added field. */
export interface TeamProfile {
  // base
  typeCounts: Record<string, number>;
  fast: string[];
  slow: string[];
  priority: string[];
  scarf: string[];
  choice: string[];
  offensiveItems: string[];
  setup: string[];
  recovery: string[];
  hazards: string[];
  layers: string[];
  removal: string[];
  bounce: string[];
  goodAsGold: string[];
  spinblock: string[];
  taunt: string[];
  removalDenial: string[];
  pivot: string[];
  status: string[];
  trickRoom: string[];
  drought: string[];
  drizzle: string[];
  sunAbuse: string[];
  rainAbuse: string[];
  wallbreakers: string[];
  fastBreakers: string[];
  physicalAttackers: string[];
  specialAttackers: string[];
  mixedAttackers: string[];
  boots: string[];
  leftovers: string[];
  defensiveWalls: string[];
  defensiveAnchors: string[];
  wincons: string[];
  attackingTypes: string[];
  roles: Roles;
  forcedSwitch: string[];
  progressTools: string[];
  overloaded: string[];
  // weather-identity-upgrades
  fireTypes: string[];
  waterTypes: string[];
  fireAttackers: string[];
  waterAttackers: string[];
  rainSpeedAbusers: string[];
  rainSetters: string[];
  rainSignalAttackers: string[];
  rainDedicatedPayoffs: string[];
  rainExternalPayoffs: string[];
  sunSetters: string[];
  sunSignalAttackers: string[];
  sunPayoffAttackers: string[];
  sunDedicatedPayoffs: string[];
  sunExternalPayoffs: string[];
  weatherConflict: boolean;
  /** Ability-only automatic weather setters. The weather-shell gates (thin manual
   * rain/sun, overstretched, manual handoff) read these rather than the base
   * drizzle/drought fields: the legacy patch test harnesses profile drizzle as
   * ability-only, and the base field's Rain Dance count would otherwise dead-lock
   * every manual-weather shell. */
  autoDrizzle: string[];
  autoDrought: string[];
  trickRoomSetters: string[];
  fastAttackers: string[];
  setupAttackers: string[];
  recoveryAnchors: string[];
  screenSetters: string[];
  hyperOffenseClosers: string[];
  bulkyOffenseClosers: string[];
  trickRoomPayoffs: string[];
  trickRoomPayoffMoves: string[];
  hazardPayoffAttackers: string[];
  hazardClosers: string[];
  stallAnchors: string[];
  stallProgressPieces: string[];
  stallClosers: string[];
  stallPivots: string[];
  dragonTypes: string[];
  dragonPressureAttackers: string[];
  dragonClosers: string[];
  // weather-turn-economy-upgrades
  rainHandoffSetters: string[];
  rainSelfSufficientSetters: string[];
  sunHandoffSetters: string[];
  sunSelfSufficientSetters: string[];
  // trick-room-identity-upgrades (trickRoomSetters above is overwritten identically)
  trickRoomAbusers: string[];
  trickRoomExternalAbusers: string[];
  trickRoomHandoffSetters: string[];
  trickRoomSelfSufficientSetters: string[];
  trickRoomFastPressure: string[];
  // tailwind-identity-upgrades
  tailwindSetters: string[];
  tailwindAbusers: string[];
  tailwindExternalAbusers: string[];
  tailwindHandoffSetters: string[];
  tailwindSelfSufficientSetters: string[];
  tailwindFastPressure: string[];
  // screens-identity-upgrades
  screensSetters: string[];
  screensDualSetters: string[];
  screensClaySetters: string[];
  screensHandoffSetters: string[];
  screensSelfSufficientSetters: string[];
  screensAbusers: string[];
  screensClosers: string[];
  screensExternalAbusers: string[];
  screensExternalClosers: string[];
  screensRecoveryAnchors: string[];
  // webs-identity-upgrades
  websSetters: string[];
  websGroundedAbusers: string[];
  websGroundedClosers: string[];
  websExternalGroundedAbusers: string[];
  websExternalGroundedClosers: string[];
  websSelfSufficientSetters: string[];
  websNativeFastPressure: string[];
  websImmuneOffense: string[];
  websRecoveryAnchors: string[];
}

// ---------- mon access helpers ----------

/** TeamMon plus the ad-hoc fields legacy test fixtures (and old patches) attach. */
export type IdentityMon = TeamMon & {
  baseStats?: Partial<Record<StatKey, number>>;
  offensiveTypes?: string[];
  types?: string[];
  isDefensiveAnchor?: boolean;
  isRemovalDenial?: boolean;
  airborne?: boolean;
  recoveryAnchor?: boolean;
  pivot?: boolean;
};

type Mon = IdentityMon;


/** weather-identity-upgrades baseSpeed: finite override or null — reads the
 * mon's own baseStats field only (no dex fallback); parsed mons lack it, so
 * these predicates are inert for parsed teams, exactly as in the legacy app. */
function baseSpeedOrNull(m: Mon): number | null {
  const raw = Number(m?.baseStats?.spe);
  return Number.isFinite(raw) ? raw : null;
}

/** trick-room/tailwind/screens/webs baseSpeed: declared override or 0. */
function baseSpeedNum(m: Mon): number {
  const raw = Number(m?.baseStats?.spe);
  return Number.isFinite(raw) ? raw : 0;
}

function baseStatNum(m: Mon, key: StatKey): number {
  const raw = Number(m?.baseStats?.[key]);
  return Number.isFinite(raw) ? raw : 0;
}

function highestAttackStat(m: Mon): number {
  return Math.max(baseStatNum(m, 'atk'), baseStatNum(m, 'spa'));
}

/** weather patch calls root.offensiveMoveTypes — always derived from moves. */
function moveDerivedOffensiveTypes(m: Mon): string[] {
  return offensiveMoveTypes(m) || [];
}

/** later patches read mon.offensiveTypes directly; no fallback — parsed mons
 * have no such field, so this is 0 for them (faithful to legacy). */
function offensiveTypeCount(m: Mon): number {
  return Array.isArray(m?.offensiveTypes) ? m.offensiveTypes.length : 0;
}

/** webs patch reads mon.types declared-only — no dex fallback (parsed mons
 * lack the field, so Flying/Dragon immunity checks are stub-only in legacy). */
function declaredMonTypes(m: Mon): string[] {
  return Array.isArray(m?.types) ? m.types : [];
}

function hasAnyMove(mon: Mon | null | undefined, names: readonly string[] = []): boolean {
  const wanted = new Set((Array.isArray(names) ? names : []).map((name) => String(name || '').trim()).filter(Boolean));
  if (!wanted.size) return false;
  return (Array.isArray(mon?.moves) ? mon.moves : []).some((move) => wanted.has(String(move || '').trim()));
}

function moveCount(mon: Mon | null | undefined, names: readonly string[] = []): number {
  const wanted = new Set((Array.isArray(names) ? names : []).map((name) => String(name || '').trim()).filter(Boolean));
  if (!wanted.size) return 0;
  return (Array.isArray(mon?.moves) ? mon.moves : []).filter((move) => wanted.has(String(move || '').trim())).length;
}

function overlap(values: string[] = [], otherValues: string[] = []): string[] {
  const wanted = new Set((otherValues || []).map((value) => String(value || '').trim()).filter(Boolean));
  return unique((values || []).filter((value) => wanted.has(String(value || '').trim())));
}

function externalWeatherPayoffs(payoffs: string[] = [], setters: string[] = []): string[] {
  const setterIds = new Set((setters || []).map((name) => String(name || '').trim()).filter(Boolean));
  return unique((payoffs || []).filter((name) => name && !setterIds.has(String(name || '').trim())));
}

function njCap(v: number, cap = 96): number {
  return Math.round(Math.max(0, Math.min(cap, v)));
}

function cloneIdentityRow(row: Partial<IdentityRow> = {}): IdentityRow {
  return { name: row.name ?? '', score: row.score ?? 0, evidence: [...(row.evidence || [])], plan: row.plan };
}

function addEvidence(row: IdentityRow | undefined | null, label = ''): void {
  const text = String(label || '').trim();
  if (!row || !text) return;
  row.evidence = unique([...(row.evidence || []), text]).slice(0, 5);
}

function isGhost(p: Mon): boolean {
  return types(p).includes('Ghost');
}

export function isDefensiveAnchor(p: Mon): boolean {
  const st = stats(p);
  return st.hp + Math.max(st.def, st.spd) >= 620
    || ['Dondozo', 'Garganacl', 'Ting-Lu', 'Alomomola', 'Toxapex', 'Corviknight',
      'Skarmory', 'Blissey', 'Clodsire', 'Slowking-Galar', 'Zapdos', 'Weezing-Galar'].includes(p.species);
}

/**
 * The wall check analyze() uses for roles.physicalWall / roles.specialWall.
 * Not a named legacy function — surfaced here because the port contract requires it.
 */
export function isDefensiveWall(p: Mon): boolean {
  const st = stats(p);
  const phys = st.hp + st.def > 650 || (st.def > 300 && (p.evs?.hp || 0) > 100);
  const spec = st.hp + st.spd > 650 || (st.spd > 300 && (p.evs?.hp || 0) > 100) || p.item === 'Assault Vest';
  return phys || spec;
}

function isFastBreaker(p: Mon): boolean {
  const st = stats(p);
  return st.spe >= 330
    && (['Choice Specs', 'Choice Band', 'Life Orb', 'Booster Energy', 'Choice Scarf'].includes(p.item)
      || st.atk >= 330 || st.spa >= 330);
}

function progressToolCount(p: Mon): number {
  let n = 0;
  if (hasMove(p, ['Knock Off', 'Salt Cure', 'Toxic', 'Will-O-Wisp', 'Thunder Wave', 'Psychic Noise', 'Roar', 'Dragon Tail'])) n++;
  if (hasMove(p, ['U-turn', 'Volt Switch', 'Flip Turn', 'Parting Shot'])) n++;
  if (hasMove(p, ['Stealth Rock', 'Spikes', 'Toxic Spikes', 'Sticky Web'])) n++;
  return n;
}

export function fieldControlBreakdown(p: TeamProfile): FieldControl {
  const hazardSetting = clamp(15 + p.hazards.length * 22 + p.layers.length * 12);
  const hazardRemoval = clamp(10 + p.removal.length * 27 + p.bounce.length * 18 + p.boots.length * 4);
  const removalDenial = clamp(p.removalDenial.length * 25 + (p.goodAsGold.length ? 25 : 0) + (p.spinblock.length ? 12 : 0));
  const chipAbuse = clamp(10 + p.progressTools.length * 9 + p.forcedSwitch.length * 7 + p.layers.length * 12);
  const pivotAbuse = clamp(10 + p.pivot.length * 18 + p.forcedSwitch.length * 4);
  const setterOverload = p.hazards.filter((x) => p.removal.includes(x)).length;
  const score = clamp(hazardSetting * 0.25 + hazardRemoval * 0.2 + removalDenial * 0.25 + chipAbuse * 0.2 + pivotAbuse * 0.1 - setterOverload * 10);
  return {
    hazardSetting: Math.round(hazardSetting), hazardRemoval: Math.round(hazardRemoval),
    removalDenial: Math.round(removalDenial), chipAbuse: Math.round(chipAbuse),
    pivotAbuse: Math.round(pivotAbuse), setterOverload, score: Math.round(score),
  };
}

function criticalPenalty(a?: AnalysisResult | null): number {
  return (a?.rows || []).filter((r) => r.sev === 'crit').length * 8;
}

function scoreClass(s: number): string {
  return s >= 70 ? 'good' : s >= 45 ? 'warn' : 'bad';
}

// ---------- patch move tables ----------

const W_SUN_MOVES = ['Weather Ball', 'Solar Beam', 'Solar Blade'];
const W_SUN_SETTER_MOVES = ['Sunny Day'];
const W_RAIN_SIGNAL_MOVES = ['Hurricane', 'Thunder'];
const W_RAIN_SETTER_MOVES = ['Rain Dance'];
const ROOM_SERVICE_ITEM = 'Room Service';
const W_SETUP_MOVES = ['Dragon Dance', 'Swords Dance', 'Nasty Plot', 'Calm Mind', 'Bulk Up', 'Quiver Dance', 'Curse'];
const W_OFFENSIVE_ITEMS = ['Choice Specs', 'Choice Band', 'Choice Scarf', 'Life Orb', 'Expert Belt', 'Booster Energy', 'Black Glasses', 'Charcoal', 'Flame Orb'];
const W_RECOVERY_MOVES = ['Recover', 'Roost', 'Soft-Boiled', 'Slack Off', 'Moonlight', 'Morning Sun', 'Shore Up', 'Strength Sap', 'Wish', 'Rest', 'Milk Drink', 'Synthesis', 'Heal Order'];
const W_ATTRITION_MOVES = ['Toxic', 'Toxic Spikes', 'Thunder Wave', 'Will-O-Wisp', 'Glare', 'Leech Seed', 'Salt Cure', 'Ruination', 'Whirlwind', 'Dragon Tail', 'Roar', 'Haze', 'Knock Off', 'Yawn', 'Encore'];
const W_PIVOT_MOVES = ['U-turn', 'Volt Switch', 'Flip Turn', 'Parting Shot', 'Teleport'];
const W_SCREEN_MOVES = ['Reflect', 'Light Screen', 'Aurora Veil'];
const TE_HANDOFF_MOVES = ['U-turn', 'Volt Switch', 'Flip Turn', 'Parting Shot', 'Teleport', 'Memento', 'Healing Wish', 'Baton Pass', 'Chilly Reception'];
const TR_TRICK_ROOM_MOVES = ['Trick Room'];
const TR_HANDOFF_MOVES = ['Teleport', 'U-turn', 'Volt Switch', 'Flip Turn', 'Parting Shot', 'Memento', 'Healing Wish', 'Lunar Dance', 'Baton Pass', 'Chilly Reception', 'Explosion', 'Final Gambit'];
const TW_TAILWIND_MOVES = ['Tailwind'];
const TW_HANDOFF_MOVES = ['U-turn', 'Volt Switch', 'Flip Turn', 'Parting Shot', 'Teleport', 'Memento', 'Healing Wish', 'Lunar Dance', 'Baton Pass', 'Chilly Reception', 'Explosion', 'Final Gambit'];
const SC_SCREEN_MOVES = ['Reflect', 'Light Screen', 'Aurora Veil'];
const SC_HANDOFF_MOVES = ['U-turn', 'Volt Switch', 'Flip Turn', 'Parting Shot', 'Teleport', 'Memento', 'Healing Wish', 'Lunar Dance', 'Baton Pass', 'Explosion', 'Final Gambit', 'Chilly Reception'];
const SC_SETUP_MOVES = ['Dragon Dance', 'Swords Dance', 'Nasty Plot', 'Calm Mind', 'Bulk Up', 'Quiver Dance', 'Agility', 'Rock Polish', 'Shell Smash', 'Trailblaze', 'Curse'];
const SC_OFFENSIVE_ITEMS = ['Choice Specs', 'Choice Band', 'Choice Scarf', 'Life Orb', 'Booster Energy', 'Expert Belt', 'Loaded Dice', 'Black Glasses', 'Lum Berry', 'Focus Sash', 'Weakness Policy'];
const WB_WEBS_MOVES = ['Sticky Web'];
const WB_SETUP_MOVES = SC_SETUP_MOVES;
const WB_OFFENSIVE_ITEMS = SC_OFFENSIVE_ITEMS;
const WEBS_IMMUNE_ABILITIES = ['Levitate'];
const WEBS_IMMUNE_ITEMS = ['Heavy-Duty Boots', 'Air Balloon'];
const GROUND_TYPES = ['Flying'];

const PRIORITY_BASE: Record<string, number> = { 'Sun Room': 30, 'Trick Room Offense': 24, 'Hazard Stack Fat Balance': 22, 'Dragon Spam Offense': 20, 'Rain Offense': 18, 'Sun Offense': 16, 'Balance': 12, 'Bulky Offense': 10, 'Hyper Offense': 8, 'Stall': 4 };
const PRIORITY_BALANCE: Record<string, number> = { 'Balance': 12, 'Stall': 4 };
const PRIORITY_TRICK_ROOM: Record<string, number> = { 'Sun Room': 30, 'Trick Room Offense': 24, 'Balance': 12, 'Bulky Offense': 10, 'Hyper Offense': 8, 'Stall': 4 };
const PRIORITY_TAILWIND: Record<string, number> = { 'Tailwind Offense': 28, 'Sun Room': 26, 'Trick Room Offense': 24, 'Hazard Stack Fat Balance': 22, 'Dragon Spam Offense': 20, 'Rain Offense': 18, 'Sun Offense': 16, 'Balance': 12, 'Bulky Offense': 10, 'Hyper Offense': 8, 'Stall': 4 };
const PRIORITY_SCREENS: Record<string, number> = { 'Screens Offense': 27, 'Sun Room': 26, 'Tailwind Offense': 24, 'Trick Room Offense': 22, 'Hazard Stack Fat Balance': 20, 'Dragon Spam Offense': 18, 'Rain Offense': 16, 'Sun Offense': 14, 'Balance': 12, 'Bulky Offense': 10, 'Hyper Offense': 8, 'Stall': 4 };
const PRIORITY_WEBS: Record<string, number> = { 'Webs Offense': 29, 'Screens Offense': 27, 'Sun Room': 26, 'Tailwind Offense': 24, 'Trick Room Offense': 22, 'Hazard Stack Fat Balance': 20, 'Dragon Spam Offense': 18, 'Rain Offense': 16, 'Sun Offense': 14, 'Balance': 12, 'Bulky Offense': 10, 'Hyper Offense': 8, 'Stall': 4 };

// ---------- weather-identity-upgrades mon predicates ----------

function wIsOffensiveMon(m: Mon): boolean {
  const attackStat = Math.max(Number(m?.baseStats?.atk) || 0, Number(m?.baseStats?.spa) || 0);
  return moveDerivedOffensiveTypes(m).length >= 2 || attackStat >= 105;
}

function wHighestAttackStat(m: Mon): number {
  // weather patch reads mon.baseStats.atk/spa directly — no dex fallback.
  return Math.max(Number(m?.baseStats?.atk) || 0, Number(m?.baseStats?.spa) || 0);
}

function isKnownDefensiveAnchor(m: Mon): boolean {
  if (m?.isDefensiveAnchor) return true;
  return isDefensiveAnchor(m);
}

function isSlowRoomPayoff(m: Mon): boolean {
  const speed = baseSpeedOrNull(m);
  if (speed === null) return false;
  if (String(m?.item || '').trim() === ROOM_SERVICE_ITEM) return true;
  return speed <= 70 && wIsOffensiveMon(m);
}

function isFastAttacker(m: Mon): boolean {
  const speed = baseSpeedOrNull(m);
  if (speed === null) return false;
  return speed >= 85 && wIsOffensiveMon(m);
}

function isSetupAttacker(m: Mon): boolean {
  return wIsOffensiveMon(m) && hasAnyMove(m, W_SETUP_MOVES);
}

function isRecoveryAnchor(m: Mon): boolean {
  const speed = baseSpeedOrNull(m);
  const bulky = Math.max(baseStatNum(m, 'def'), baseStatNum(m, 'spd')) >= 90;
  return hasAnyMove(m, W_RECOVERY_MOVES) && (isKnownDefensiveAnchor(m) || (bulky && (speed === null || speed <= 105)));
}

function isScreenSetterW(m: Mon): boolean {
  return hasAnyMove(m, W_SCREEN_MOVES);
}

function isHyperOffenseCloser(m: Mon): boolean {
  if (!wIsOffensiveMon(m)) return false;
  const attackStat = wHighestAttackStat(m);
  const item = String(m?.item || '').trim();
  return hasAnyMove(m, W_SETUP_MOVES) || W_OFFENSIVE_ITEMS.includes(item) || attackStat >= 120 || (baseSpeedOrNull(m) || 0) >= 110;
}

function isBulkyOffenseCloser(m: Mon): boolean {
  if (!wIsOffensiveMon(m)) return false;
  const attackStat = wHighestAttackStat(m);
  const item = String(m?.item || '').trim();
  return hasAnyMove(m, W_SETUP_MOVES) || W_OFFENSIVE_ITEMS.includes(item) || attackStat >= 110 || (baseSpeedOrNull(m) || 0) >= 95;
}

function isHazardPayoffAttacker(m: Mon): boolean {
  if (!wIsOffensiveMon(m)) return false;
  const item = String(m?.item || '').trim();
  if (W_OFFENSIVE_ITEMS.includes(item)) return true;
  if (hasAnyMove(m, W_SETUP_MOVES)) return true;
  return moveDerivedOffensiveTypes(m).length >= 2;
}

function isHazardCloser(m: Mon): boolean {
  if (!isHazardPayoffAttacker(m)) return false;
  const attackStat = wHighestAttackStat(m);
  const item = String(m?.item || '').trim();
  return hasAnyMove(m, W_SETUP_MOVES) || W_OFFENSIVE_ITEMS.includes(item) || attackStat >= 120;
}

function isStallAnchor(m: Mon): boolean {
  const speed = baseSpeedOrNull(m);
  const bulky = Math.max(baseStatNum(m, 'def'), baseStatNum(m, 'spd')) >= 95;
  return isKnownDefensiveAnchor(m) || (bulky && hasAnyMove(m, W_RECOVERY_MOVES) && (speed === null || speed <= 90));
}

function isStallProgressPiece(m: Mon): boolean {
  return hasAnyMove(m, W_ATTRITION_MOVES) || hasAnyMove(m, W_RECOVERY_MOVES);
}

function isStallCloser(m: Mon): boolean {
  if (!wIsOffensiveMon(m)) return false;
  if (hasAnyMove(m, W_SETUP_MOVES)) return true;
  if (W_OFFENSIVE_ITEMS.includes(String(m?.item || '').trim())) return true;
  return (baseSpeedOrNull(m) || 0) >= 95;
}

function isStallPivot(m: Mon): boolean {
  return hasAnyMove(m, W_PIVOT_MOVES);
}

function isDragonPressureMon(m: Mon): boolean {
  return moveDerivedOffensiveTypes(m).includes('Dragon') && wIsOffensiveMon(m);
}

function isDragonCloser(m: Mon): boolean {
  if (!moveDerivedOffensiveTypes(m).includes('Dragon')) return false;
  const attackStat = wHighestAttackStat(m);
  const item = String(m?.item || '').trim();
  return hasAnyMove(m, W_SETUP_MOVES) || W_OFFENSIVE_ITEMS.includes(item) || attackStat >= 120 || (baseSpeedOrNull(m) || 0) >= 100;
}

// ---------- weather shells ----------

function weatherTension(profile: TeamProfile) {
  return {
    mixedWeatherPenalty: profile?.weatherConflict ? 30 : 0,
    rainFirePenalty: Math.max(0, (profile?.fireTypes || []).length - 1) * 8,
    sunWaterPenalty: Math.max(0, (profile?.waterTypes || []).length - 2) * 6,
  };
}

function fakeRainShell(p: TeamProfile): boolean {
  if ((p?.rainSetters || []).length) return false;
  const fireAttackers = (p?.fireAttackers || []).length;
  const waterAttackers = (p?.waterAttackers || []).length;
  const waterTypes = (p?.waterTypes || []).length;
  const swiftSwim = (p?.rainSpeedAbusers || []).length;
  const rainSignals = (p?.rainSignalAttackers || []).length;
  return fireAttackers >= 3 && waterAttackers <= 1 && waterTypes <= 1 && swiftSwim === 0 && rainSignals >= 2;
}
function fakeRainPenalty(p: TeamProfile): number {
  if (!fakeRainShell(p)) return 0;
  const fireAttackers = (p?.fireAttackers || []).length;
  const rainSignals = (p?.rainSignalAttackers || []).length;
  return 24 + Math.max(0, fireAttackers - 3) * 4 + Math.max(0, rainSignals - 2) * 3;
}
function shallowRainShell(p: TeamProfile): boolean {
  if (!(p?.autoDrizzle?.length) || p?.weatherConflict) return false;
  const fireAttackers = (p.fireAttackers || []).length;
  const waterTypes = (p.waterTypes || []).length;
  const swiftSwim = (p.rainSpeedAbusers || []).length;
  return fireAttackers >= 4 && swiftSwim === 0 && waterTypes <= 1;
}
function shallowRainPenalty(p: TeamProfile): number {
  if (!shallowRainShell(p)) return 0;
  const fireTypes = (p.fireTypes || []).length;
  const fireAttackers = (p.fireAttackers || []).length;
  const waterAttackers = (p.waterAttackers || []).length;
  return 22 + Math.max(0, fireTypes - 3) * 5 + Math.max(0, fireAttackers - waterAttackers) * 4;
}
function thinManualRainShell(p: TeamProfile): boolean {
  if (p?.autoDrizzle?.length || p?.weatherConflict) return false;
  const setters = (p?.rainSetters || []).length;
  const dedicatedPayoffs = (p?.rainDedicatedPayoffs || []).length;
  const waterAttackers = (p?.waterAttackers || []).length;
  const swiftSwim = (p?.rainSpeedAbusers || []).length;
  return setters === 1 && dedicatedPayoffs <= 2 && waterAttackers <= 1 && swiftSwim === 0;
}
function thinManualRainPenalty(p: TeamProfile): number {
  if (!thinManualRainShell(p)) return 0;
  const dedicatedPayoffs = (p?.rainDedicatedPayoffs || []).length;
  return 18 + Math.max(0, 2 - dedicatedPayoffs) * 4;
}
function overstretchedManualRainShell(p: TeamProfile): boolean {
  if (p?.autoDrizzle?.length || p?.weatherConflict) return false;
  const setters = (p?.rainSetters || []).length;
  const dedicatedPayoffs = (p?.rainDedicatedPayoffs || []).length;
  const waterAttackers = (p?.waterAttackers || []).length;
  const swiftSwim = (p?.rainSpeedAbusers || []).length;
  const externalPayoffs = (p?.rainExternalPayoffs || []).length;
  return (setters >= 2 && dedicatedPayoffs <= Math.max(2, setters) && waterAttackers <= 1 && swiftSwim === 0)
    || (setters >= 2 && externalPayoffs < setters && waterAttackers <= 1 && swiftSwim === 0);
}
function overstretchedManualRainPenalty(p: TeamProfile): number {
  if (!overstretchedManualRainShell(p)) return 0;
  const setters = (p?.rainSetters || []).length;
  const dedicatedPayoffs = (p?.rainDedicatedPayoffs || []).length;
  const externalPayoffs = (p?.rainExternalPayoffs || []).length;
  return 18 + Math.max(0, setters - 2) * 4 + Math.max(0, Math.max(2, setters) - dedicatedPayoffs) * 4 + Math.max(0, setters - externalPayoffs) * 4;
}
function shallowSunShell(p: TeamProfile): boolean {
  if (!(p?.autoDrought?.length) || p?.weatherConflict) return false;
  const waterAttackers = (p.waterAttackers || []).length;
  const waterTypes = (p.waterTypes || []).length;
  const fireAttackers = (p.fireAttackers || []).length;
  const sunPayoffs = (p.sunPayoffAttackers || []).length;
  return waterAttackers >= 3 && waterTypes >= 2 && fireAttackers <= 2 && sunPayoffs <= 1;
}
function shallowSunPenalty(p: TeamProfile): number {
  if (!shallowSunShell(p)) return 0;
  const waterTypes = (p.waterTypes || []).length;
  const waterAttackers = (p.waterAttackers || []).length;
  const fireAttackers = (p.fireAttackers || []).length;
  return 18 + Math.max(0, waterTypes - 3) * 5 + Math.max(0, waterAttackers - fireAttackers) * 4;
}
function fakeSunShell(p: TeamProfile): boolean {
  if ((p?.sunSetters || []).length) return false;
  const fireAttackers = (p?.fireAttackers || []).length;
  const waterAttackers = (p?.waterAttackers || []).length;
  const waterTypes = (p?.waterTypes || []).length;
  const sunSignals = (p?.sunSignalAttackers || []).length;
  return fireAttackers >= 2 && waterAttackers <= 1 && waterTypes <= 1 && sunSignals >= 2;
}
function fakeSunPenalty(p: TeamProfile): number {
  if (!fakeSunShell(p)) return 0;
  const fireAttackers = (p?.fireAttackers || []).length;
  const sunSignals = (p?.sunSignalAttackers || []).length;
  return 20 + Math.max(0, fireAttackers - 2) * 4 + Math.max(0, sunSignals - 2) * 3;
}
function thinManualSunShell(p: TeamProfile): boolean {
  if (p?.autoDrought?.length || p?.weatherConflict) return false;
  const setters = (p?.sunSetters || []).length;
  const dedicatedPayoffs = (p?.sunDedicatedPayoffs || []).length;
  const waterAttackers = (p?.waterAttackers || []).length;
  return setters === 1 && dedicatedPayoffs <= 2 && waterAttackers >= 1;
}
function thinManualSunPenalty(p: TeamProfile): number {
  if (!thinManualSunShell(p)) return 0;
  const dedicatedPayoffs = (p?.sunDedicatedPayoffs || []).length;
  return 16 + Math.max(0, 2 - dedicatedPayoffs) * 4;
}
function overstretchedManualSunShell(p: TeamProfile): boolean {
  if (p?.autoDrought?.length || p?.weatherConflict) return false;
  const setters = (p?.sunSetters || []).length;
  const dedicatedPayoffs = (p?.sunDedicatedPayoffs || []).length;
  const waterAttackers = (p?.waterAttackers || []).length;
  const externalPayoffs = (p?.sunExternalPayoffs || []).length;
  return (setters >= 2 && dedicatedPayoffs <= Math.max(2, setters) && waterAttackers >= 1)
    || (setters >= 2 && externalPayoffs < setters && waterAttackers >= 1);
}
function overstretchedManualSunPenalty(p: TeamProfile): number {
  if (!overstretchedManualSunShell(p)) return 0;
  const setters = (p?.sunSetters || []).length;
  const dedicatedPayoffs = (p?.sunDedicatedPayoffs || []).length;
  const externalPayoffs = (p?.sunExternalPayoffs || []).length;
  return 16 + Math.max(0, setters - 2) * 4 + Math.max(0, Math.max(2, setters) - dedicatedPayoffs) * 4 + Math.max(0, setters - externalPayoffs) * 4;
}
function shallowTrickRoomShell(p: TeamProfile): boolean {
  const setters = (p?.trickRoomSetters || []).length;
  const slowPayoffs = (p?.trickRoomPayoffs || []).length;
  const fastAttackers = (p?.fastAttackers || []).length;
  return setters >= 2 && slowPayoffs <= 1 && fastAttackers >= 3;
}
function shallowTrickRoomPenalty(p: TeamProfile): number {
  if (!shallowTrickRoomShell(p)) return 0;
  const setters = (p?.trickRoomSetters || []).length;
  const slowPayoffs = (p?.trickRoomPayoffs || []).length;
  const fastAttackers = (p?.fastAttackers || []).length;
  return 20 + Math.max(0, setters - 2) * 4 + Math.max(0, fastAttackers - 2) * 5 + Math.max(0, 1 - slowPayoffs) * 6;
}
function stagnantHazardShell(p: TeamProfile): boolean {
  const hazards = (p?.hazards || []).length;
  const layers = (p?.layers || []).length;
  const denial = (p?.removalDenial || []).length;
  const anchors = (p?.defensiveAnchors || []).length;
  const payoffs = (p?.hazardPayoffAttackers || []).length;
  return hazards >= 2 && (layers >= 1 || denial >= 1) && anchors >= 4 && payoffs <= 1;
}
function thinHazardConversionShell(p: TeamProfile): boolean {
  const hazards = (p?.hazards || []).length;
  const layers = (p?.layers || []).length;
  const denial = (p?.removalDenial || []).length;
  const anchors = (p?.defensiveAnchors || []).length;
  const payoffs = (p?.hazardPayoffAttackers || []).length;
  const closers = (p?.hazardClosers || []).length;
  return hazards >= 2 && (layers >= 1 || denial >= 1) && anchors >= 4 && payoffs <= 2 && closers <= 1;
}
function stagnantHazardPenalty(p: TeamProfile): number {
  if (!stagnantHazardShell(p)) return 0;
  const anchors = (p?.defensiveAnchors || []).length;
  const payoffs = (p?.hazardPayoffAttackers || []).length;
  return 22 + Math.max(0, anchors - 4) * 4 + Math.max(0, 1 - payoffs) * 8;
}
function thinHazardConversionPenalty(p: TeamProfile): number {
  if (!thinHazardConversionShell(p) || stagnantHazardShell(p)) return 0;
  const anchors = (p?.defensiveAnchors || []).length;
  const payoffs = (p?.hazardPayoffAttackers || []).length;
  const closers = (p?.hazardClosers || []).length;
  return 16 + Math.max(0, anchors - 4) * 3 + Math.max(0, 2 - payoffs) * 4 + Math.max(0, 1 - closers) * 6;
}
function falseStallShell(p: TeamProfile): boolean {
  const anchors = (p?.stallAnchors || []).length;
  const progress = (p?.stallProgressPieces || []).length;
  const closers = (p?.stallClosers || []).length;
  const fastAttackers = (p?.fastAttackers || []).length;
  const pivots = (p?.stallPivots || []).length;
  return anchors >= 3 && progress >= 3 && (closers >= 2 || fastAttackers >= 2 || (closers >= 1 && pivots >= 2));
}
function falseStallPenalty(p: TeamProfile): number {
  if (!falseStallShell(p)) return 0;
  const closers = (p?.stallClosers || []).length;
  const fastAttackers = (p?.fastAttackers || []).length;
  const pivots = (p?.stallPivots || []).length;
  return 18 + Math.max(0, closers - 2) * 5 + Math.max(0, fastAttackers - 2) * 4 + Math.max(0, pivots - 2) * 3;
}
function falseHyperOffenseShell(p: TeamProfile): boolean {
  const fastAttackers = (p?.fastAttackers || []).length;
  const setupAttackers = (p?.setupAttackers || []).length;
  const anchors = (p?.defensiveAnchors || []).length;
  const recoveryAnchors = (p?.recoveryAnchors || []).length;
  const pivots = (p?.pivot || []).length;
  const screens = (p?.screenSetters || []).length;
  return fastAttackers >= 3 && setupAttackers >= 2 && anchors >= 2 && recoveryAnchors >= 2 && pivots >= 2 && screens <= 1;
}
function falseHyperOffensePenalty(p: TeamProfile): number {
  if (!falseHyperOffenseShell(p)) return 0;
  const anchors = (p?.defensiveAnchors || []).length;
  const recoveryAnchors = (p?.recoveryAnchors || []).length;
  const pivots = (p?.pivot || []).length;
  return 18 + Math.max(0, anchors - 2) * 4 + Math.max(0, recoveryAnchors - 2) * 4 + Math.max(0, pivots - 2) * 3;
}
function falseBulkyOffenseShell(p: TeamProfile): boolean {
  const anchors = (p?.defensiveAnchors || []).length;
  const recoveryAnchors = (p?.recoveryAnchors || []).length;
  const closers = (p?.bulkyOffenseClosers || []).length;
  const pivots = (p?.pivot || []).length;
  return anchors >= 4 && recoveryAnchors >= 3 && closers <= 1 && pivots >= 2;
}
function falseBulkyOffensePenalty(p: TeamProfile): number {
  if (!falseBulkyOffenseShell(p)) return 0;
  const anchors = (p?.defensiveAnchors || []).length;
  const recoveryAnchors = (p?.recoveryAnchors || []).length;
  const closers = (p?.bulkyOffenseClosers || []).length;
  return 18 + Math.max(0, anchors - 4) * 3 + Math.max(0, recoveryAnchors - 3) * 3 + Math.max(0, 1 - closers) * 8;
}
function falseDragonSpamShell(p: TeamProfile): boolean {
  const dragons = (p?.dragonTypes || []).length;
  const pressure = (p?.dragonPressureAttackers || []).length;
  const closers = (p?.dragonClosers || []).length;
  const anchors = (p?.defensiveAnchors || []).length;
  const pivots = (p?.pivot || []).length;
  const supportDragons = Math.max(0, dragons - pressure);
  return dragons >= 3 && pressure <= 2 && closers <= 1 && (supportDragons >= 2 || anchors >= 2 || pivots >= 2);
}
function falseDragonSpamPenalty(p: TeamProfile): number {
  if (!falseDragonSpamShell(p)) return 0;
  const dragons = (p?.dragonTypes || []).length;
  const pressure = (p?.dragonPressureAttackers || []).length;
  const closers = (p?.dragonClosers || []).length;
  const anchors = (p?.defensiveAnchors || []).length;
  return 20 + Math.max(0, dragons - 3) * 4 + Math.max(0, 2 - pressure) * 6 + Math.max(0, 1 - closers) * 8 + Math.max(0, anchors - 2) * 3;
}

// ---------- balance-identity-upgrades ----------

function falseBalanceShell(p: TeamProfile): boolean {
  const anchors = (p?.stallAnchors || []).length;
  const progress = (p?.stallProgressPieces || []).length;
  const recovery = (p?.recoveryAnchors || []).length;
  const closers = (p?.bulkyOffenseClosers || []).length;
  const pivots = (p?.stallPivots || []).length;
  const fastAttackers = (p?.fastAttackers || []).length;
  const setupAttackers = (p?.setupAttackers || []).length;
  return anchors >= 4 && progress >= 4 && recovery >= 4 && closers <= 1 && fastAttackers <= 1 && setupAttackers <= 1 && pivots <= 2;
}
function falseBalancePenalty(p: TeamProfile): number {
  if (!falseBalanceShell(p)) return 0;
  const anchors = (p?.stallAnchors || []).length;
  const progress = (p?.stallProgressPieces || []).length;
  const recovery = (p?.recoveryAnchors || []).length;
  const closers = (p?.bulkyOffenseClosers || []).length;
  const pivots = (p?.stallPivots || []).length;
  const extraCloserPenalty = closers === 0 ? 12 : 0;
  return 26 + Math.max(0, anchors - 4) * 4 + Math.max(0, progress - 4) * 4 + Math.max(0, recovery - 4) * 4 + Math.max(0, 1 - closers) * 10 + extraCloserPenalty + Math.max(0, 2 - pivots) * 2;
}
function semistallBoost(p: TeamProfile): number {
  if (!falseBalanceShell(p)) return 0;
  const anchors = (p?.stallAnchors || []).length;
  const progress = (p?.stallProgressPieces || []).length;
  const recovery = (p?.recoveryAnchors || []).length;
  const closers = (p?.bulkyOffenseClosers || []).length;
  const closerlessBoost = closers === 0 ? 8 : 0;
  return 8 + Math.max(0, anchors - 4) * 2 + Math.max(0, progress - 4) * 2 + Math.max(0, recovery - 4) * 2 + Math.max(0, 1 - closers) * 6 + closerlessBoost;
}

// ---------- weather-turn-economy-upgrades ----------

function weatherHandoffSetters(teamList: Mon[], setterMoves: readonly string[]): string[] {
  return teamList.filter((mon) => {
    const ability = String(mon?.ability || '').trim();
    const isSetter = (setterMoves === W_RAIN_SETTER_MOVES && ability === 'Drizzle')
      || (setterMoves === W_SUN_SETTER_MOVES && ability === 'Drought')
      || hasAnyMove(mon, setterMoves);
    return isSetter && hasAnyMove(mon, TE_HANDOFF_MOVES);
  }).map((mon) => mon.species);
}

function slowManualRainHandoffShell(p: TeamProfile): boolean {
  if (p?.autoDrizzle?.length || p?.weatherConflict) return false;
  const setters = (p?.rainSetters || []).length;
  const dedicatedPayoffs = (p?.rainDedicatedPayoffs || []).length;
  const externalPayoffs = (p?.rainExternalPayoffs || []).length;
  const handoffSetters = (p?.rainHandoffSetters || []).length;
  const selfSufficientSetters = (p?.rainSelfSufficientSetters || []).length;
  return setters >= 2
    && dedicatedPayoffs >= 2
    && externalPayoffs >= 2
    && !((p?.rainSetters || []).length >= 2 && dedicatedPayoffs <= Math.max(2, setters) && (p?.waterAttackers || []).length <= 1 && (p?.rainSpeedAbusers || []).length === 0)
    && !((p?.rainSetters || []).length >= 2 && externalPayoffs < setters && (p?.waterAttackers || []).length <= 1 && (p?.rainSpeedAbusers || []).length === 0)
    && (handoffSetters + selfSufficientSetters) < setters;
}
function slowManualRainHandoffPenalty(p: TeamProfile): number {
  if (!slowManualRainHandoffShell(p)) return 0;
  const setters = (p?.rainSetters || []).length;
  return 16 + Math.max(0, setters - 2) * 3;
}
function fragileSingleRainHandoffShell(p: TeamProfile): boolean {
  if (p?.autoDrizzle?.length || p?.weatherConflict) return false;
  const setters = (p?.rainSetters || []).length;
  const dedicatedPayoffs = (p?.rainDedicatedPayoffs || []).length;
  const externalPayoffs = (p?.rainExternalPayoffs || []).length;
  const handoffSetters = (p?.rainHandoffSetters || []).length;
  const selfSufficientSetters = (p?.rainSelfSufficientSetters || []).length;
  return setters === 1
    && dedicatedPayoffs >= 3
    && externalPayoffs >= 3
    && !handoffSetters
    && !selfSufficientSetters;
}
function fragileSingleRainHandoffPenalty(p: TeamProfile): number {
  if (!fragileSingleRainHandoffShell(p)) return 0;
  return 14;
}
function slowManualSunHandoffShell(p: TeamProfile): boolean {
  if (p?.autoDrought?.length || p?.weatherConflict) return false;
  const setters = (p?.sunSetters || []).length;
  const dedicatedPayoffs = (p?.sunDedicatedPayoffs || []).length;
  const externalPayoffs = (p?.sunExternalPayoffs || []).length;
  const handoffSetters = (p?.sunHandoffSetters || []).length;
  const selfSufficientSetters = (p?.sunSelfSufficientSetters || []).length;
  return setters >= 2
    && dedicatedPayoffs >= 2
    && externalPayoffs >= 2
    && !((p?.sunSetters || []).length >= 2 && dedicatedPayoffs <= Math.max(2, setters) && (p?.waterAttackers || []).length >= 1)
    && !((p?.sunSetters || []).length >= 2 && externalPayoffs < setters && (p?.waterAttackers || []).length >= 1)
    && (handoffSetters + selfSufficientSetters) < setters;
}
function slowManualSunHandoffPenalty(p: TeamProfile): number {
  if (!slowManualSunHandoffShell(p)) return 0;
  const setters = (p?.sunSetters || []).length;
  return 14 + Math.max(0, setters - 2) * 3;
}
function fragileSingleSunHandoffShell(p: TeamProfile): boolean {
  if (p?.autoDrought?.length || p?.weatherConflict) return false;
  const setters = (p?.sunSetters || []).length;
  const dedicatedPayoffs = (p?.sunDedicatedPayoffs || []).length;
  const externalPayoffs = (p?.sunExternalPayoffs || []).length;
  const handoffSetters = (p?.sunHandoffSetters || []).length;
  const selfSufficientSetters = (p?.sunSelfSufficientSetters || []).length;
  return setters === 1
    && dedicatedPayoffs >= 3
    && externalPayoffs >= 3
    && !handoffSetters
    && !selfSufficientSetters;
}
function fragileSingleSunHandoffPenalty(p: TeamProfile): number {
  if (!fragileSingleSunHandoffShell(p)) return 0;
  return 12;
}

// ---------- trick-room-identity-upgrades ----------

function isTrickRoomSetter(m: Mon): boolean {
  return hasAnyMove(m, TR_TRICK_ROOM_MOVES);
}
function isRoomAbuser(m: Mon): boolean {
  if (String(m?.item || '').trim() === ROOM_SERVICE_ITEM) return true;
  const speed = baseSpeedNum(m);
  const power = highestAttackStat(m);
  return speed <= 70 && (power >= 105 || offensiveTypeCount(m) >= 2);
}
function isTrFastPressure(m: Mon): boolean {
  return baseSpeedNum(m) >= 85 && highestAttackStat(m) >= 100;
}
function trickRoomHandoffSetters(teamList: Mon[]): string[] {
  return teamList.filter((mon) => isTrickRoomSetter(mon) && hasAnyMove(mon, TR_HANDOFF_MOVES)).map((mon) => mon.species);
}
function singleSetterFragileTrickRoomShell(p: TeamProfile): boolean {
  const setters = (p?.trickRoomSetters || []).length;
  const abusers = (p?.trickRoomAbusers || []).length;
  const externalAbusers = (p?.trickRoomExternalAbusers || []).length;
  const handoffSetters = (p?.trickRoomHandoffSetters || []).length;
  const selfSufficientSetters = (p?.trickRoomSelfSufficientSetters || []).length;
  const fastPressure = (p?.trickRoomFastPressure || []).length;
  return setters === 1
    && abusers >= 2
    && externalAbusers >= 2
    && !handoffSetters
    && !selfSufficientSetters
    && fastPressure >= 2;
}
function multiSetterShallowTrickRoomShell(p: TeamProfile): boolean {
  const setters = (p?.trickRoomSetters || []).length;
  const externalAbusers = (p?.trickRoomExternalAbusers || []).length;
  const selfSufficientSetters = (p?.trickRoomSelfSufficientSetters || []).length;
  const fastPressure = (p?.trickRoomFastPressure || []).length;
  const realPayoffs = externalAbusers + selfSufficientSetters;
  return setters >= 2
    && fastPressure >= 2
    && externalAbusers <= 1
    && realPayoffs <= 2;
}
function multiSetterFragileTurnHandoffShell(p: TeamProfile): boolean {
  const setters = (p?.trickRoomSetters || []).length;
  const externalAbusers = (p?.trickRoomExternalAbusers || []).length;
  const handoffSetters = (p?.trickRoomHandoffSetters || []).length;
  const selfSufficientSetters = (p?.trickRoomSelfSufficientSetters || []).length;
  const fastPressure = (p?.trickRoomFastPressure || []).length;
  return setters >= 2
    && externalAbusers >= 2
    && !handoffSetters
    && !selfSufficientSetters
    && fastPressure >= 2;
}
function fragileTrickRoomPenalty(p: TeamProfile): number {
  if (singleSetterFragileTrickRoomShell(p)) {
    const fastPressure = (p?.trickRoomFastPressure || []).length;
    const abusers = (p?.trickRoomAbusers || []).length;
    return 14 + Math.max(0, fastPressure - 2) * 3 + Math.max(0, abusers - 2) * 2;
  }
  if (multiSetterShallowTrickRoomShell(p)) {
    const setters = (p?.trickRoomSetters || []).length;
    const fastPressure = (p?.trickRoomFastPressure || []).length;
    return 13 + Math.max(0, setters - 2) * 3 + Math.max(0, fastPressure - 2) * 2;
  }
  if (multiSetterFragileTurnHandoffShell(p)) {
    const setters = (p?.trickRoomSetters || []).length;
    const fastPressure = (p?.trickRoomFastPressure || []).length;
    const externalAbusers = (p?.trickRoomExternalAbusers || []).length;
    return 12 + Math.max(0, setters - 2) * 2 + Math.max(0, fastPressure - 2) * 2 + Math.max(0, externalAbusers - 2);
  }
  return 0;
}

// ---------- tailwind-identity-upgrades ----------

function isTailwindSetter(m: Mon): boolean {
  return hasAnyMove(m, TW_TAILWIND_MOVES);
}
function isTailwindAbuser(m: Mon): boolean {
  const speed = baseSpeedNum(m);
  const power = highestAttackStat(m);
  return speed >= 50 && speed <= 108 && (power >= 110 || offensiveTypeCount(m) >= 2);
}
function isTwFastPressure(m: Mon): boolean {
  return baseSpeedNum(m) >= 112 && highestAttackStat(m) >= 100;
}
function isSelfSufficientTailwindSetter(m: Mon): boolean {
  return isTailwindSetter(m) && (
    hasAnyMove(m, TW_HANDOFF_MOVES)
    || (baseSpeedNum(m) >= 100 && highestAttackStat(m) >= 105 && offensiveTypeCount(m) >= 2)
  );
}
function tailwindHandoffSetters(teamList: Mon[]): string[] {
  return teamList.filter((mon) => isTailwindSetter(mon) && hasAnyMove(mon, TW_HANDOFF_MOVES)).map((mon) => mon.species);
}
function realTailwindShell(p: TeamProfile): boolean {
  const setters = (p?.tailwindSetters || []).length;
  const abusers = (p?.tailwindExternalAbusers || []).length;
  const handoff = (p?.tailwindHandoffSetters || []).length;
  const selfSufficient = (p?.tailwindSelfSufficientSetters || []).length;
  return setters >= 1 && abusers >= 2 && (handoff + selfSufficient) >= 1;
}
function singleSetterFragileTailwindShell(p: TeamProfile): boolean {
  const setters = (p?.tailwindSetters || []).length;
  const abusers = (p?.tailwindExternalAbusers || []).length;
  const handoff = (p?.tailwindHandoffSetters || []).length;
  const selfSufficient = (p?.tailwindSelfSufficientSetters || []).length;
  const fastPressure = (p?.tailwindFastPressure || []).length;
  return setters === 1
    && abusers >= 2
    && !handoff
    && !selfSufficient
    && fastPressure >= 2;
}
function multiSetterShallowTailwindShell(p: TeamProfile): boolean {
  const setters = (p?.tailwindSetters || []).length;
  const externalAbusers = (p?.tailwindExternalAbusers || []).length;
  const selfSufficientSetters = (p?.tailwindSelfSufficientSetters || []).length;
  const fastPressure = (p?.tailwindFastPressure || []).length;
  const realPayoffs = externalAbusers + selfSufficientSetters;
  return setters >= 2
    && fastPressure >= 2
    && externalAbusers <= 1
    && realPayoffs <= 2;
}
function multiSetterFragileTailwindShell(p: TeamProfile): boolean {
  const setters = (p?.tailwindSetters || []).length;
  const externalAbusers = (p?.tailwindExternalAbusers || []).length;
  const handoff = (p?.tailwindHandoffSetters || []).length;
  const selfSufficient = (p?.tailwindSelfSufficientSetters || []).length;
  const fastPressure = (p?.tailwindFastPressure || []).length;
  return setters >= 2
    && externalAbusers >= 2
    && !handoff
    && !selfSufficient
    && fastPressure >= 1;
}
function fragileTailwindPenalty(p: TeamProfile): number {
  if (singleSetterFragileTailwindShell(p)) {
    const abusers = (p?.tailwindExternalAbusers || []).length;
    const fastPressure = (p?.tailwindFastPressure || []).length;
    return 13 + Math.max(0, abusers - 2) * 2 + Math.max(0, fastPressure - 2) * 2;
  }
  if (multiSetterShallowTailwindShell(p)) {
    const setters = (p?.tailwindSetters || []).length;
    const fastPressure = (p?.tailwindFastPressure || []).length;
    return 14 + Math.max(0, setters - 2) * 2 + Math.max(0, fastPressure - 2) * 2;
  }
  if (multiSetterFragileTailwindShell(p)) {
    const setters = (p?.tailwindSetters || []).length;
    const externalAbusers = (p?.tailwindExternalAbusers || []).length;
    return 12 + Math.max(0, setters - 2) * 2 + Math.max(0, externalAbusers - 2);
  }
  return 0;
}
function tailwindOffenseScore(p: TeamProfile): number {
  if (!realTailwindShell(p)) return 0;
  const setters = (p?.tailwindSetters || []).length;
  const abusers = (p?.tailwindExternalAbusers || []).length;
  const handoff = (p?.tailwindHandoffSetters || []).length;
  const selfSufficient = (p?.tailwindSelfSufficientSetters || []).length;
  const fastPressure = (p?.tailwindFastPressure || []).length;
  const raw = 78
    + Math.min(8, Math.max(0, abusers - 2) * 4)
    + Math.min(4, Math.max(0, setters - 1) * 2)
    + Math.min(4, (handoff + selfSufficient) * 2)
    - Math.min(6, Math.max(0, fastPressure - 2) * 2);
  return njCap(raw, 94);
}

// ---------- screens-identity-upgrades ----------

function isScreensSetter(m: Mon): boolean {
  return hasAnyMove(m, SC_SCREEN_MOVES);
}
function isDualScreensSetter(m: Mon): boolean {
  return moveCount(m, ['Reflect', 'Light Screen']) >= 2 || hasAnyMove(m, ['Aurora Veil']);
}
function isClaySetter(m: Mon): boolean {
  return isScreensSetter(m) && String(m?.item || '').trim() === 'Light Clay';
}
function scIsOffensiveMon(m: Mon): boolean {
  return offensiveTypeCount(m) >= 2 || highestAttackStat(m) >= 110;
}
function isSetupAbuser(m: Mon): boolean {
  return hasAnyMove(m, SC_SETUP_MOVES) && scIsOffensiveMon(m);
}
function isScFastPressure(m: Mon): boolean {
  return scIsOffensiveMon(m) && (baseSpeedNum(m) >= 95 || highestAttackStat(m) >= 125);
}
function isScreensCloser(m: Mon): boolean {
  return isSetupAbuser(m) || SC_OFFENSIVE_ITEMS.includes(String(m?.item || '').trim()) || isScFastPressure(m);
}
function isSelfSufficientScreensSetter(m: Mon): boolean {
  return isScreensSetter(m) && (
    hasAnyMove(m, SC_HANDOFF_MOVES)
    || (baseSpeedNum(m) >= 105 && highestAttackStat(m) >= 120 && offensiveTypeCount(m) >= 2)
    || hasAnyMove(m, ['Memento', 'Explosion', 'Final Gambit'])
  );
}
function realScreensShell(p: TeamProfile): boolean {
  const setters = (p?.screensSetters || []).length;
  const abusers = (p?.screensExternalAbusers || []).length;
  const closers = (p?.screensExternalClosers || []).length;
  const supportQuality = (p?.screensHandoffSetters || []).length + (p?.screensSelfSufficientSetters || []).length + (p?.screensClaySetters || []).length;
  const anchors = (p?.screensRecoveryAnchors || []).length;
  return setters >= 1 && abusers >= 2 && closers >= 3 && supportQuality >= 1 && anchors <= 1;
}
function fragileSingleSetterScreensShell(p: TeamProfile): boolean {
  const setters = (p?.screensSetters || []).length;
  const closers = (p?.screensExternalClosers || []).length;
  const supportQuality = (p?.screensHandoffSetters || []).length + (p?.screensSelfSufficientSetters || []).length;
  const anchors = (p?.screensRecoveryAnchors || []).length;
  const pivots = (p?.pivot || []).length;
  return setters === 1 && closers >= 3 && !supportQuality && anchors >= 2 && pivots >= 2;
}
function shallowMultiSetterScreensShell(p: TeamProfile): boolean {
  const setters = (p?.screensSetters || []).length;
  const abusers = (p?.screensExternalAbusers || []).length;
  const closers = (p?.screensExternalClosers || []).length;
  const anchors = (p?.screensRecoveryAnchors || []).length;
  return setters >= 2 && abusers <= 2 && closers <= 3 && anchors >= 2;
}
function bulkyScreensSupportShell(p: TeamProfile): boolean {
  const setters = (p?.screensSetters || []).length;
  const abusers = (p?.screensExternalAbusers || []).length;
  const anchors = (p?.screensRecoveryAnchors || []).length;
  const pivots = (p?.pivot || []).length;
  const closers = (p?.screensExternalClosers || []).length;
  return setters >= 1 && abusers >= 2 && closers >= 2 && anchors >= 3 && pivots >= 2;
}
function screensOffenseScore(p: TeamProfile): number {
  if (!realScreensShell(p)) return 0;
  const setters = (p?.screensSetters || []).length;
  const abusers = (p?.screensExternalAbusers || []).length;
  const closers = (p?.screensExternalClosers || []).length;
  const supportQuality = (p?.screensHandoffSetters || []).length + (p?.screensSelfSufficientSetters || []).length + (p?.screensClaySetters || []).length;
  const raw = 80
    + Math.min(6, Math.max(0, abusers - 2) * 3)
    + Math.min(4, Math.max(0, closers - 3) * 2)
    + Math.min(4, supportQuality * 2)
    + Math.min(2, Math.max(0, setters - 1) * 2);
  return njCap(raw, 95);
}
function fragileScreensPenalty(p: TeamProfile): number {
  if (fragileSingleSetterScreensShell(p)) {
    const anchors = (p?.screensRecoveryAnchors || []).length;
    return 14 + Math.max(0, anchors - 2) * 2;
  }
  if (shallowMultiSetterScreensShell(p)) {
    const setters = (p?.screensSetters || []).length;
    return 15 + Math.max(0, setters - 2) * 2;
  }
  if (bulkyScreensSupportShell(p)) {
    const anchors = (p?.screensRecoveryAnchors || []).length;
    return 12 + Math.max(0, anchors - 3) * 2;
  }
  return 0;
}

// ---------- webs-identity-upgrades ----------

function isWebsSetter(m: Mon): boolean {
  return hasAnyMove(m, WB_WEBS_MOVES);
}
function wbIsOffensiveMon(m: Mon): boolean {
  return offensiveTypeCount(m) >= 2 || highestAttackStat(m) >= 110;
}
function isWebsSetupAbuser(m: Mon): boolean {
  return hasAnyMove(m, WB_SETUP_MOVES) && wbIsOffensiveMon(m);
}
function isWbFastPressure(m: Mon): boolean {
  return wbIsOffensiveMon(m) && baseSpeedNum(m) >= 112 && highestAttackStat(m) >= 100;
}
function hasGroundImmunity(m: Mon): boolean {
  const mTypes = declaredMonTypes(m);
  return mTypes.some((type) => GROUND_TYPES.includes(String(type || '').trim()))
    || WEBS_IMMUNE_ABILITIES.includes(String(m?.ability || '').trim())
    || WEBS_IMMUNE_ITEMS.includes(String(m?.item || '').trim())
    || !!m?.airborne;
}
function isGroundedWebsAbuser(m: Mon): boolean {
  if (hasGroundImmunity(m)) return false;
  if (!wbIsOffensiveMon(m)) return false;
  const speed = baseSpeedNum(m);
  return speed >= 55 && speed <= 108;
}
function isGroundedWebsCloser(m: Mon): boolean {
  if (hasGroundImmunity(m)) return false;
  return isGroundedWebsAbuser(m) || isWebsSetupAbuser(m) || WB_OFFENSIVE_ITEMS.includes(String(m?.item || '').trim());
}
function isSelfSufficientWebsSetter(m: Mon): boolean {
  return isWebsSetter(m) && (
    wbIsOffensiveMon(m)
    || hasAnyMove(m, ['U-turn', 'Volt Switch', 'Parting Shot', 'Memento', 'Explosion', 'Final Gambit'])
    || moveCount(m, ['Sticky Web', 'Spikes', 'Stealth Rock', 'Toxic Spikes']) >= 2
  );
}
function realWebsShell(p: TeamProfile): boolean {
  const setters = (p?.websSetters || []).length;
  const abusers = (p?.websExternalGroundedAbusers || []).length;
  const closers = (p?.websExternalGroundedClosers || []).length;
  const supportQuality = (p?.websSelfSufficientSetters || []).length;
  const fastPressure = (p?.websNativeFastPressure || []).length;
  const anchors = (p?.websRecoveryAnchors || []).length;
  return setters >= 1 && abusers >= 3 && closers >= 3 && supportQuality >= 1 && fastPressure <= 2 && anchors <= 1;
}
function shallowWebsShell(p: TeamProfile): boolean {
  const setters = (p?.websSetters || []).length;
  const abusers = (p?.websExternalGroundedAbusers || []).length;
  const closers = (p?.websExternalGroundedClosers || []).length;
  const fastPressure = (p?.websNativeFastPressure || []).length;
  const immune = (p?.websImmuneOffense || []).length;
  return setters >= 1 && abusers <= 1 && closers <= 3 && (fastPressure >= 2 || immune >= 2);
}
function bulkyWebsSupportShell(p: TeamProfile): boolean {
  const setters = (p?.websSetters || []).length;
  const abusers = (p?.websExternalGroundedAbusers || []).length;
  const anchors = (p?.websRecoveryAnchors || []).length;
  const pivots = (p?.pivot || []).length;
  return setters >= 1 && abusers >= 1 && anchors >= 3 && pivots >= 2;
}
function fakeWebsPenalty(p: TeamProfile): number {
  if (shallowWebsShell(p)) {
    const immune = (p?.websImmuneOffense || []).length;
    const fastPressure = (p?.websNativeFastPressure || []).length;
    return 14 + Math.max(0, immune - 2) * 2 + Math.max(0, fastPressure - 2) * 2;
  }
  if (bulkyWebsSupportShell(p)) {
    const anchors = (p?.websRecoveryAnchors || []).length;
    return 12 + Math.max(0, anchors - 3) * 2;
  }
  return 0;
}
function websOffenseScore(p: TeamProfile): number {
  if (!realWebsShell(p)) return 0;
  const setters = (p?.websSetters || []).length;
  const abusers = (p?.websExternalGroundedAbusers || []).length;
  const closers = (p?.websExternalGroundedClosers || []).length;
  const supportQuality = (p?.websSelfSufficientSetters || []).length;
  const raw = 82
    + Math.min(6, Math.max(0, abusers - 3) * 3)
    + Math.min(4, Math.max(0, closers - 3) * 2)
    + Math.min(4, supportQuality * 2)
    + Math.min(2, Math.max(0, setters - 1) * 2);
  return njCap(raw, 95);
}

// ---------- profileTeam: base + all patch field layers in script order ----------

export function profileTeam(t: TeamMon[] = [], a?: AnalysisResult | null): TeamProfile {
  const teamList = (Array.isArray(t) ? t : []) as Mon[];

  const typeCounts: Record<string, number> = {};
  teamList.forEach((p) => types(p).forEach((tp) => typeCounts[tp] = (typeCounts[tp] || 0) + 1));
  const roles = a?.roles || ({} as Roles);
  const statsList = teamList.map((p) => ({ p, st: stats(p) }));
  const fast = statsList.filter((x) => x.st.spe >= 330 || boostedSpeedNature(x.p.nature) || x.p.item === 'Choice Scarf').map((x) => x.p.species);
  const slow = statsList.filter((x) => x.st.spe <= 210 || x.p.ivs?.spe === 0 || loweredSpeedNature(x.p.nature)).map((x) => x.p.species);
  const priority = teamList.filter((p) => p.moves.some((m) => movePriority(m) > 0)).map((p) => p.species);
  const scarf = teamList.filter((p) => p.item === 'Choice Scarf').map((p) => p.species);
  const choice = teamList.filter((p) => /^Choice /.test(p.item || '')).map((p) => p.species);
  const offensiveItems = teamList.filter((p) => ['Choice Specs', 'Choice Band', 'Choice Scarf', 'Life Orb', 'Expert Belt', 'Booster Energy', 'Black Glasses', 'Charcoal', 'Flame Orb'].includes(p.item)).map((p) => p.species);
  const setup = teamList.filter((p) => hasMove(p, ['Dragon Dance', 'Swords Dance', 'Nasty Plot', 'Calm Mind', 'Bulk Up', 'Quiver Dance', 'Curse'])).map((p) => p.species);
  const recovery = teamList.filter((p) => hasMove(p, ['Recover', 'Roost', 'Slack Off', 'Wish', 'Protect', 'Moonlight', 'Synthesis', 'Rest', 'Pain Split', 'Giga Drain', 'Drain Punch'])).map((p) => p.species);
  const hazards = teamList.filter((p) => hasMove(p, ['Stealth Rock', 'Spikes', 'Toxic Spikes', 'Sticky Web'])).map((p) => p.species);
  const layers = teamList.filter((p) => hasMove(p, ['Spikes', 'Toxic Spikes', 'Sticky Web'])).map((p) => p.species);
  const removal = teamList.filter((p) => hasMove(p, ['Rapid Spin', 'Defog', 'Court Change', 'Mortal Spin'])).map((p) => p.species);
  const bounce = teamList.filter((p) => p.ability === 'Magic Bounce').map((p) => p.species);
  const goodAsGold = teamList.filter((p) => p.ability === 'Good as Gold' || p.species === 'Gholdengo').map((p) => p.species);
  const spinblock = teamList.filter((p) => isGhost(p) || (p.ability === 'Purifying Salt' && p.species === 'Gholdengo')).map((p) => p.species);
  const taunt = teamList.filter((p) => hasMove(p, ['Taunt'])).map((p) => p.species);
  const removalDenial = unique([...goodAsGold, ...spinblock, ...bounce, ...taunt]);
  const pivot = teamList.filter((p) => hasMove(p, ['U-turn', 'Volt Switch', 'Flip Turn', 'Parting Shot', 'Chilly Reception', 'Teleport'])).map((p) => p.species);
  const status = teamList.filter((p) => hasMove(p, ['Will-O-Wisp', 'Toxic', 'Thunder Wave', 'Spore', 'Psychic Noise', 'Salt Cure', 'Roar', 'Dragon Tail'])).map((p) => p.species);
  const trickRoom = teamList.filter((p) => hasMove(p, ['Trick Room'])).map((p) => p.species);
  const drought = teamList.filter((p) => p.ability === 'Drought' || hasMove(p, ['Sunny Day'])).map((p) => p.species);
  const drizzle = teamList.filter((p) => p.ability === 'Drizzle' || hasMove(p, ['Rain Dance'])).map((p) => p.species);
  const sunAbuse = teamList.filter((p) => ['Solar Power', 'Chlorophyll', 'Protosynthesis'].includes(p.ability) || hasMove(p, ['Weather Ball', 'Solar Beam', 'Eruption'])).map((p) => p.species);
  const rainAbuse = teamList.filter((p) => ['Swift Swim'].includes(p.ability) || hasMove(p, ['Thunder', 'Hurricane', 'Waterfall', 'Hydro Pump', 'Surf'])).map((p) => p.species);
  const wallbreakers = teamList.filter((p) => {
    const s = stats(p);
    return offensiveItems.includes(p.species) || s.atk >= 330 || s.spa >= 330
      || ['Guts', 'Supreme Overlord', 'Solar Power'].includes(p.ability)
      || ['Hoopa-Unbound', 'Kyurem', 'Raging Bolt', 'Deoxys-Speed'].includes(p.species);
  }).map((p) => p.species);
  const defensiveAnchors = teamList.filter(isDefensiveAnchor).map((p) => p.species);
  const fastBreakers = teamList.filter(isFastBreaker).map((p) => p.species);
  const attackingTypes = unique(teamList.flatMap((p) => offensiveMoveTypes(p)));
  const physicalAttackers = teamList.filter((p) => dominantOffense(p) === 'physical').map((p) => p.species);
  const specialAttackers = teamList.filter((p) => dominantOffense(p) === 'special').map((p) => p.species);
  const mixedAttackers = teamList.filter((p) => dominantOffense(p) === 'mixed').map((p) => p.species);
  const boots = teamList.filter((p) => p.item === 'Heavy-Duty Boots').map((p) => p.species);
  const lefties = teamList.filter((p) => p.item === 'Leftovers').map((p) => p.species);
  const forcedSwitch = teamList.filter((p) => hasMove(p, ['Roar', 'Dragon Tail', 'Whirlwind', 'Encore', 'Salt Cure']) || ['Choice Specs', 'Choice Band', 'Life Orb', 'Booster Energy'].includes(p.item)).map((p) => p.species);
  const progressTools = teamList.filter((p) => progressToolCount(p) > 0).map((p) => p.species);
  const wincons = unique([...setup, ...wallbreakers, ...priority, ...teamList.filter((p) => ['Moxie', 'Supreme Overlord', 'Guts', 'Solar Power'].includes(p.ability)).map((p) => p.species)]);
  const overloaded = teamList.filter((p) => {
    let jobs = 0;
    if (hazards.includes(p.species)) jobs++;
    if (removal.includes(p.species)) jobs++;
    if (wallbreakers.includes(p.species)) jobs++;
    if (defensiveAnchors.includes(p.species)) jobs++;
    if (pivot.includes(p.species)) jobs++;
    return jobs >= 3;
  }).map((p) => p.species);

  const profile: TeamProfile = {
    typeCounts, fast, slow, priority, scarf, choice, offensiveItems, setup, recovery,
    hazards, layers, removal, bounce, goodAsGold, spinblock, taunt, removalDenial,
    pivot, status, trickRoom, drought, drizzle, sunAbuse, rainAbuse, wallbreakers,
    fastBreakers, physicalAttackers, specialAttackers, mixedAttackers, boots,
    leftovers: lefties,
    defensiveWalls: unique([...(roles.physicalWall || []), ...(roles.specialWall || []), ...defensiveAnchors]),
    defensiveAnchors, wincons, attackingTypes, roles, forcedSwitch, progressTools, overloaded,
    // fields below are filled by patch layers
    fireTypes: [], waterTypes: [], fireAttackers: [], waterAttackers: [],
    rainSpeedAbusers: [], rainSetters: [], rainSignalAttackers: [], rainDedicatedPayoffs: [],
    rainExternalPayoffs: [], sunSetters: [], sunSignalAttackers: [], sunPayoffAttackers: [],
    sunDedicatedPayoffs: [], sunExternalPayoffs: [], weatherConflict: false,
    autoDrizzle: [], autoDrought: [],
    trickRoomSetters: [], fastAttackers: [], setupAttackers: [], recoveryAnchors: [],
    screenSetters: [], hyperOffenseClosers: [], bulkyOffenseClosers: [],
    trickRoomPayoffs: [], trickRoomPayoffMoves: [], hazardPayoffAttackers: [],
    hazardClosers: [], stallAnchors: [], stallProgressPieces: [], stallClosers: [],
    stallPivots: [], dragonTypes: [], dragonPressureAttackers: [], dragonClosers: [],
    rainHandoffSetters: [], rainSelfSufficientSetters: [], sunHandoffSetters: [],
    sunSelfSufficientSetters: [], trickRoomAbusers: [], trickRoomExternalAbusers: [],
    trickRoomHandoffSetters: [], trickRoomSelfSufficientSetters: [], trickRoomFastPressure: [],
    tailwindSetters: [], tailwindAbusers: [], tailwindExternalAbusers: [],
    tailwindHandoffSetters: [], tailwindSelfSufficientSetters: [], tailwindFastPressure: [],
    screensSetters: [], screensDualSetters: [], screensClaySetters: [],
    screensHandoffSetters: [], screensSelfSufficientSetters: [], screensAbusers: [],
    screensClosers: [], screensExternalAbusers: [], screensExternalClosers: [],
    screensRecoveryAnchors: [], websSetters: [], websGroundedAbusers: [],
    websGroundedClosers: [], websExternalGroundedAbusers: [], websExternalGroundedClosers: [],
    websSelfSufficientSetters: [], websNativeFastPressure: [], websImmuneOffense: [],
    websRecoveryAnchors: [],
  };

  // weather-identity-upgrades profile layer
  profile.autoDrizzle = teamList.filter((mon) => String(mon?.ability || '').trim() === 'Drizzle').map((mon) => mon.species);
  profile.autoDrought = teamList.filter((mon) => String(mon?.ability || '').trim() === 'Drought').map((mon) => mon.species);
  profile.fireTypes = teamList.filter((mon) => types(mon).includes('Fire')).map((mon) => mon.species);
  profile.waterTypes = teamList.filter((mon) => types(mon).includes('Water')).map((mon) => mon.species);
  profile.fireAttackers = teamList.filter((mon) => moveDerivedOffensiveTypes(mon).includes('Fire')).map((mon) => mon.species);
  profile.waterAttackers = teamList.filter((mon) => moveDerivedOffensiveTypes(mon).includes('Water')).map((mon) => mon.species);
  profile.rainSpeedAbusers = teamList.filter((mon) => String(mon?.ability || '').trim() === 'Swift Swim').map((mon) => mon.species);
  profile.rainSetters = teamList.filter((mon) => {
    const ability = String(mon?.ability || '').trim();
    return ability === 'Drizzle' || hasAnyMove(mon, W_RAIN_SETTER_MOVES);
  }).map((mon) => mon.species);
  profile.rainSignalAttackers = teamList.filter((mon) => {
    const ability = String(mon?.ability || '').trim();
    if (ability === 'Swift Swim') return true;
    return hasAnyMove(mon, W_RAIN_SIGNAL_MOVES);
  }).map((mon) => mon.species);
  profile.rainDedicatedPayoffs = teamList.filter((mon) => {
    const ability = String(mon?.ability || '').trim();
    if (ability === 'Swift Swim') return true;
    if (moveDerivedOffensiveTypes(mon).includes('Water')) return true;
    return wIsOffensiveMon(mon) && !moveDerivedOffensiveTypes(mon).includes('Fire') && hasAnyMove(mon, W_RAIN_SIGNAL_MOVES);
  }).map((mon) => mon.species);
  profile.rainExternalPayoffs = externalWeatherPayoffs(profile.rainDedicatedPayoffs, profile.rainSetters);
  profile.sunSetters = teamList.filter((mon) => {
    const ability = String(mon?.ability || '').trim();
    return ability === 'Drought' || hasAnyMove(mon, W_SUN_SETTER_MOVES);
  }).map((mon) => mon.species);
  profile.sunSignalAttackers = teamList.filter((mon) => {
    const ability = String(mon?.ability || '').trim();
    if (['Chlorophyll', 'Solar Power'].includes(ability)) return true;
    if (hasAnyMove(mon, W_SUN_MOVES)) return true;
    return ability === 'Protosynthesis' && (moveDerivedOffensiveTypes(mon).includes('Fire') || hasAnyMove(mon, ['Hydro Steam']));
  }).map((mon) => mon.species);
  profile.sunPayoffAttackers = teamList.filter((mon) => {
    const ability = String(mon?.ability || '').trim();
    if (['Chlorophyll', 'Solar Power'].includes(ability)) return true;
    if (hasAnyMove(mon, W_SUN_MOVES)) return true;
    return ability === 'Protosynthesis' && (moveDerivedOffensiveTypes(mon).includes('Fire') || hasAnyMove(mon, ['Hydro Steam']));
  }).map((mon) => mon.species);
  profile.sunDedicatedPayoffs = [...(profile.sunPayoffAttackers || [])];
  profile.sunExternalPayoffs = externalWeatherPayoffs(profile.sunDedicatedPayoffs, profile.sunSetters);
  profile.weatherConflict = !!((profile?.autoDrought?.length || profile?.sunSetters?.length) && (profile?.autoDrizzle?.length || profile?.rainSetters?.length));
  profile.trickRoomSetters = teamList.filter((mon) => hasAnyMove(mon, ['Trick Room'])).map((mon) => mon.species);
  profile.fastAttackers = teamList.filter(isFastAttacker).map((mon) => mon.species);
  profile.setupAttackers = teamList.filter(isSetupAttacker).map((mon) => mon.species);
  profile.recoveryAnchors = teamList.filter(isRecoveryAnchor).map((mon) => mon.species);
  profile.screenSetters = teamList.filter(isScreenSetterW).map((mon) => mon.species);
  profile.hyperOffenseClosers = teamList.filter(isHyperOffenseCloser).map((mon) => mon.species);
  profile.bulkyOffenseClosers = teamList.filter(isBulkyOffenseCloser).map((mon) => mon.species);
  profile.trickRoomPayoffs = teamList.filter((mon) => isSlowRoomPayoff(mon) && !hasAnyMove(mon, ['Trick Room'])).map((mon) => mon.species);
  profile.trickRoomPayoffMoves = teamList.filter((mon) => moveCount(mon, ['Trick Room']) === 0 && isSlowRoomPayoff(mon)).map((mon) => mon.species);
  profile.hazardPayoffAttackers = teamList.filter(isHazardPayoffAttacker).map((mon) => mon.species);
  profile.hazardClosers = teamList.filter(isHazardCloser).map((mon) => mon.species);
  profile.stallAnchors = teamList.filter(isStallAnchor).map((mon) => mon.species);
  profile.stallProgressPieces = teamList.filter(isStallProgressPiece).map((mon) => mon.species);
  profile.stallClosers = teamList.filter(isStallCloser).map((mon) => mon.species);
  profile.stallPivots = teamList.filter(isStallPivot).map((mon) => mon.species);
  profile.dragonTypes = teamList.filter((mon) => types(mon).includes('Dragon')).map((mon) => mon.species);
  profile.dragonPressureAttackers = teamList.filter(isDragonPressureMon).map((mon) => mon.species);
  profile.dragonClosers = teamList.filter(isDragonCloser).map((mon) => mon.species);

  // weather-turn-economy-upgrades profile layer
  profile.rainHandoffSetters = weatherHandoffSetters(teamList, W_RAIN_SETTER_MOVES);
  profile.rainSelfSufficientSetters = overlap(profile.rainSetters, profile.rainDedicatedPayoffs);
  profile.sunHandoffSetters = weatherHandoffSetters(teamList, W_SUN_SETTER_MOVES);
  profile.sunSelfSufficientSetters = overlap(profile.sunSetters, profile.sunDedicatedPayoffs);

  // trick-room-identity-upgrades profile layer
  profile.trickRoomSetters = teamList.filter(isTrickRoomSetter).map((mon) => mon.species);
  profile.trickRoomAbusers = teamList.filter(isRoomAbuser).map((mon) => mon.species);
  profile.trickRoomExternalAbusers = (profile?.trickRoomAbusers || []).filter((species) => !(profile?.trickRoomSetters || []).includes(species));
  profile.trickRoomHandoffSetters = trickRoomHandoffSetters(teamList);
  profile.trickRoomSelfSufficientSetters = overlap(profile.trickRoomSetters, profile.trickRoomAbusers);
  profile.trickRoomFastPressure = teamList.filter((mon) => isTrFastPressure(mon) && !isTrickRoomSetter(mon)).map((mon) => mon.species);

  // tailwind-identity-upgrades profile layer
  profile.tailwindSetters = teamList.filter(isTailwindSetter).map((mon) => mon.species);
  profile.tailwindAbusers = teamList.filter(isTailwindAbuser).map((mon) => mon.species);
  profile.tailwindExternalAbusers = (profile?.tailwindAbusers || []).filter((species) => !(profile?.tailwindSetters || []).includes(species));
  profile.tailwindHandoffSetters = tailwindHandoffSetters(teamList);
  profile.tailwindSelfSufficientSetters = teamList.filter(isSelfSufficientTailwindSetter).map((mon) => mon.species);
  profile.tailwindFastPressure = teamList.filter((mon) => isTwFastPressure(mon) && !isTailwindSetter(mon)).map((mon) => mon.species);

  // screens-identity-upgrades profile layer
  profile.screensSetters = teamList.filter(isScreensSetter).map((mon) => mon.species);
  profile.screensDualSetters = teamList.filter(isDualScreensSetter).map((mon) => mon.species);
  profile.screensClaySetters = teamList.filter(isClaySetter).map((mon) => mon.species);
  profile.screensHandoffSetters = teamList.filter((mon) => isScreensSetter(mon) && hasAnyMove(mon, SC_HANDOFF_MOVES)).map((mon) => mon.species);
  profile.screensSelfSufficientSetters = teamList.filter(isSelfSufficientScreensSetter).map((mon) => mon.species);
  profile.screensAbusers = teamList.filter(isSetupAbuser).map((mon) => mon.species);
  profile.screensClosers = teamList.filter(isScreensCloser).map((mon) => mon.species);
  profile.screensExternalAbusers = (profile.screensAbusers || []).filter((species) => !(profile.screensSetters || []).includes(species));
  profile.screensExternalClosers = (profile.screensClosers || []).filter((species) => !(profile.screensSetters || []).includes(species));
  profile.screensRecoveryAnchors = overlap(profile.recoveryAnchors || [], teamList.filter(() => true).map((mon) => mon.species));

  // webs-identity-upgrades profile layer
  profile.websSetters = teamList.filter(isWebsSetter).map((mon) => mon.species);
  profile.websGroundedAbusers = teamList.filter(isGroundedWebsAbuser).map((mon) => mon.species);
  profile.websGroundedClosers = teamList.filter(isGroundedWebsCloser).map((mon) => mon.species);
  profile.websExternalGroundedAbusers = (profile.websGroundedAbusers || []).filter((species) => !(profile.websSetters || []).includes(species));
  profile.websExternalGroundedClosers = (profile.websGroundedClosers || []).filter((species) => !(profile.websSetters || []).includes(species));
  profile.websSelfSufficientSetters = teamList.filter(isSelfSufficientWebsSetter).map((mon) => mon.species);
  profile.websNativeFastPressure = teamList.filter((mon) => isWbFastPressure(mon) && !isWebsSetter(mon)).map((mon) => mon.species);
  profile.websImmuneOffense = teamList.filter((mon) => !isWebsSetter(mon) && hasGroundImmunity(mon) && wbIsOffensiveMon(mon)).map((mon) => mon.species);
  profile.websRecoveryAnchors = overlap(profile.recoveryAnchors || [], teamList.map((mon) => mon.species));

  return profile;
}

// ---------- detectIdentities: base scorer + wrapper passes ----------

function sortIdentityRows(rows: IdentityRow[], priority: Record<string, number>): void {
  rows.sort((left, right) => (right.score - left.score) || ((priority[right.name] || 0) - (priority[left.name] || 0)));
}

function toIdentityResult(rows: IdentityRow[], priority: Record<string, number>): IdentityResult {
  sortIdentityRows(rows, priority);
  return {
    primary: rows[0],
    secondary: rows.slice(1, 5).filter((row) => row.score >= 35),
    all: rows,
  };
}

function detectIdentitiesBase(t: Mon[], a?: AnalysisResult | null, p?: TeamProfile | null): IdentityResult {
  const profile = p || profileTeam(t, a);
  const ids: IdentityRow[] = [];
  const tc = profile.typeCounts || {};
  const add = (name: string, score: number, ev: (string | null | undefined)[], plan: string, cap = 96) =>
    ids.push({ name, score: njCap(score, cap), evidence: unique((ev || []).filter((x): x is string => Boolean(x))).slice(0, 5), plan });
  const stallPenalty = profile.fastBreakers.length * 18 + profile.offensiveItems.length * 8 + profile.choice.length * 7 + Math.max(0, profile.pivot.length - 2) * 6 + profile.setup.length * 5;
  let stall = 20 + profile.defensiveAnchors.length * 12 + profile.recovery.length * 8 + profile.status.length * 5 + (profile.removal.length || profile.bounce.length ? 7 : 0) - stallPenalty;
  if (profile.defensiveAnchors.length < 3 || profile.recovery.length < 4) stall = Math.min(stall, 65);
  if (stallPenalty > 22) stall = Math.min(stall, 58);
  const balance = 34 + profile.defensiveAnchors.length * 9 + profile.pivot.length * 8 + profile.wallbreakers.length * 5 + profile.recovery.length * 3 - profile.overloaded.length * 8 - Math.max(0, profile.fastBreakers.length - 3) * 5;
  const bulky = 28 + profile.wallbreakers.length * 8 + profile.defensiveAnchors.length * 7 + profile.pivot.length * 5 + profile.fastBreakers.length * 3 - (profile.recovery.length >= 4 ? 5 : 0);
  const ho = 18 + profile.fastBreakers.length * 13 + profile.setup.length * 9 + profile.offensiveItems.length * 4 - profile.defensiveAnchors.length * 8 - profile.recovery.length * 4 - profile.pivot.length * 2;
  let hz = profile.hazards.length * 15 + profile.layers.length * 13 + profile.removalDenial.length * 14 + profile.pivot.length * 4 + profile.forcedSwitch.length * 3 - (profile.hazards.length && !profile.removalDenial.length ? 22 : 0) - (profile.layers.length ? 0 : 10);
  if (profile.hazards.length && !profile.removalDenial.length) hz = Math.min(hz, 76);
  const dragon = (tc.Dragon || 0) >= 3 ? 30 + (tc.Dragon || 0) * 16 + profile.setup.length * 4 + profile.choice.length * 4 + profile.fastBreakers.length * 3 : 0;
  const sunRoom = (profile.drought.length && profile.trickRoom.length >= 2) ? 70 + profile.trickRoom.length * 9 + profile.slow.length * 4 + profile.sunAbuse.length * 6 - profile.fast.length * 4 : 0;
  const trick = profile.trickRoom.length ? Math.max(0, (profile.trickRoom.length >= 2 ? 40 : 18) + profile.slow.length * 6 + profile.wallbreakers.length * 3 - profile.fast.length * 5) : 0;
  const rain = profile.drizzle.length ? 72 + profile.rainAbuse.length * 8 + (tc.Water || 0) * 4 + profile.fast.length * 2 : 0;
  const sun = profile.drought.length ? 38 + profile.sunAbuse.length * 8 + (tc.Fire || 0) * 4 + profile.fast.length * 2 : 0;
  add('Hazard Stack Fat Balance', hz, [`${profile.hazards.length} hazard setter(s)`, `${profile.layers.length} layer setter(s)`, `${profile.removalDenial.length} removal-denial tool(s)`, `${profile.pivot.length} pivot(s)`, profile.goodAsGold.length ? 'Gholdengo / Good as Gold pressure' : null], 'Set hazards, deny removal, force switches, and convert chip into safe breaker entries.', 94);
  add('Balance', balance, [`${profile.defensiveAnchors.length} defensive anchor(s)`, `${profile.pivot.length} pivot(s)`, `${profile.wallbreakers.length} breaker(s)`, profile.overloaded.length ? `${profile.overloaded.length} overloaded role-compression slot(s)` : null], 'Adapt game-to-game using defensive glue, pivots, progress tools, and controlled win conditions.', 92);
  add('Bulky Offense', bulky, [`${profile.wallbreakers.length} breaker(s)`, `${profile.defensiveAnchors.length} defensive anchor(s)`, `${profile.pivot.length} pivot(s)`], 'Use durable offensive pressure without becoming purely passive or all-in.', 90);
  add('Hyper Offense', ho, [`${profile.fastBreakers.length} fast breaker(s)`, `${profile.setup.length} setup threat(s)`, `${profile.offensiveItems.length} high-pressure item(s)`, profile.defensiveAnchors.length ? `penalty: ${profile.defensiveAnchors.length} defensive anchor(s)` : null], 'Keep tempo and trade aggressively; capped when the team carries too many defensive stabilizers.', 94);
  add('Stall', stall, [`${profile.recovery.length} recovery source(s)`, `${profile.defensiveAnchors.length} defensive anchor(s)`, `${profile.status.length} attrition tool(s)`, stallPenalty ? `stall penalty: ${stallPenalty}` : null], 'Low-tempo denial and attrition; capped hard by fast breakers, pivots, and aggressive items.', 86);
  add('Dragon Spam Offense', dragon, [`${tc.Dragon || 0} Dragon-type member(s)`, profile.setup.length ? `${profile.setup.length} setup win condition(s)` : null, profile.choice.length ? `${profile.choice.length} Choice breaker(s)` : null], 'Exploit stacked Dragon pressure; patch Fairy/Ice/Dragon counterplay.', 96);
  add('Sun Room', sunRoom, [profile.drought.length ? 'sun setter present' : null, `${profile.trickRoom.length} Trick Room setter(s)`, `${profile.slow.length} slow member(s)`], 'Create sun, flip speed with Trick Room, and spend short windows on high damage.', 96);
  add('Trick Room Offense', trick, [`${profile.trickRoom.length} Trick Room setter(s)`, `${profile.slow.length} slow member(s)`], 'Only appears when Trick Room is actually present; otherwise it is not an archetype.', 88);
  add('Rain Offense', rain, [profile.drizzle.length ? 'Drizzle/Rain Dance present' : null, `${profile.rainAbuse.length} rain-abuse signal(s)`], 'Maintain rain and use Water pressure or speed doubling.', 96);
  add('Sun Offense', sun, [profile.drought.length ? 'Drought/Sunny Day present' : null, `${profile.sunAbuse.length} sun-abuse signal(s)`], 'Win weather turns and overload shared checks.', 92);
  return toIdentityResult(ids, PRIORITY_BASE);
}

// weather-identity-upgrades detectIdentities wrapper
function applyWeatherIdentityPass(result: IdentityResult, profile: TeamProfile): IdentityResult {
  if (!profile?.weatherConflict && !fakeRainShell(profile) && !shallowRainShell(profile) && !thinManualRainShell(profile) && !overstretchedManualRainShell(profile) && !fakeSunShell(profile) && !shallowSunShell(profile) && !thinManualSunShell(profile) && !overstretchedManualSunShell(profile) && !shallowTrickRoomShell(profile) && !stagnantHazardShell(profile) && !thinHazardConversionShell(profile) && !falseStallShell(profile) && !falseHyperOffenseShell(profile) && !falseBulkyOffenseShell(profile) && !falseDragonSpamShell(profile)) return result;

  const rows = (result?.all || []).map(cloneIdentityRow);
  const { mixedWeatherPenalty, rainFirePenalty, sunWaterPenalty } = weatherTension(profile);
  const fakeRainShellPenalty = fakeRainPenalty(profile);
  const shallowRainShellPenalty = shallowRainPenalty(profile);
  const thinManualRainShellPenalty = thinManualRainPenalty(profile);
  const overstretchedManualRainShellPenalty = overstretchedManualRainPenalty(profile);
  const fakeSunShellPenalty = fakeSunPenalty(profile);
  const shallowSunShellPenalty = shallowSunPenalty(profile);
  const thinManualSunShellPenalty = thinManualSunPenalty(profile);
  const overstretchedManualSunShellPenalty = overstretchedManualSunPenalty(profile);
  const shallowRoomShellPenalty = shallowTrickRoomPenalty(profile);
  const stagnantHazardShellPenalty = stagnantHazardPenalty(profile);
  const thinHazardShellPenalty = thinHazardConversionPenalty(profile);
  const falseStallShellPenalty = falseStallPenalty(profile);
  const falseHyperShellPenalty = falseHyperOffensePenalty(profile);
  const falseBulkyShellPenalty = falseBulkyOffensePenalty(profile);
  const falseDragonPenalty = falseDragonSpamPenalty(profile);
  const rain = rows.find((row) => row.name === 'Rain Offense');
  const sun = rows.find((row) => row.name === 'Sun Offense');
  const sunRoom = rows.find((row) => row.name === 'Sun Room');
  const trickRoom = rows.find((row) => row.name === 'Trick Room Offense');
  const hazard = rows.find((row) => row?.name === 'Hazard Stack Fat Balance');
  const stall = rows.find((row) => row?.name === 'Stall');
  const bulky = rows.find((row) => row?.name === 'Bulky Offense');
  const hyper = rows.find((row) => row?.name === 'Hyper Offense');
  const dragon = rows.find((row) => row?.name === 'Dragon Spam Offense');

  if (rain) {
    rain.score = njCap((rain.score || 0) - mixedWeatherPenalty - rainFirePenalty - fakeRainShellPenalty - shallowRainShellPenalty - thinManualRainShellPenalty - overstretchedManualRainShellPenalty, 96);
    if (profile.weatherConflict) addEvidence(rain, 'conflicting rain and sun setters');
    if (fakeRainShell(profile)) {
      addEvidence(rain, 'no real rain setter is present');
      addEvidence(rain, 'weatherless Hurricane pressure is not a real rain plan');
    }
    if (rainFirePenalty) addEvidence(rain, `${(profile.fireTypes || []).length} Fire-type member(s) pulling against rain`);
    if (shallowRainShell(profile)) {
      addEvidence(rain, 'fire-heavy shell undercuts rain turns');
      if (!(profile.rainSpeedAbusers || []).length) addEvidence(rain, 'no Swift Swim payoff to justify the rain slot');
    }
    if (thinManualRainShell(profile)) {
      addEvidence(rain, 'only one thin manual rain setter is carrying the weather plan');
      addEvidence(rain, 'too few dedicated rain payoffs to justify the Rain Dance slot');
    }
    if (overstretchedManualRainShell(profile)) {
      addEvidence(rain, 'multiple manual rain setters are spending slots without enough real payoffs');
      addEvidence(rain, 'the team is using extra Rain Dance support to prop up a thin rain backbone');
      addEvidence(rain, 'most of the rain payoff load is still sitting on the setters themselves');
    }
  }
  if (sun) {
    sun.score = njCap((sun.score || 0) - mixedWeatherPenalty - sunWaterPenalty - fakeSunShellPenalty - shallowSunShellPenalty - thinManualSunShellPenalty - overstretchedManualSunShellPenalty, 92);
    if (profile.weatherConflict) addEvidence(sun, 'conflicting rain and sun setters');
    if (fakeSunShell(profile)) {
      addEvidence(sun, 'no real sun setter is present');
      addEvidence(sun, 'weatherless solar payoffs are not a real sun plan');
    }
    if (shallowSunShell(profile)) {
      addEvidence(sun, 'water-heavy shell undercuts sun turns');
      if ((profile.sunPayoffAttackers || []).length <= 1) addEvidence(sun, 'too few dedicated sun payoffs to justify Drought');
    }
    if (thinManualSunShell(profile)) {
      addEvidence(sun, 'only one thin manual sun setter is carrying the weather plan');
      addEvidence(sun, 'too few dedicated sun payoffs to justify the Sunny Day slot');
    }
    if (overstretchedManualSunShell(profile)) {
      addEvidence(sun, 'multiple manual sun setters are spending slots without enough real payoffs');
      addEvidence(sun, 'the team is using extra Sunny Day support to prop up a thin sun backbone');
      addEvidence(sun, 'most of the sun payoff load is still sitting on the setters themselves');
    }
  }
  if (sunRoom) {
    sunRoom.score = njCap((sunRoom.score || 0) - mixedWeatherPenalty - sunWaterPenalty - fakeSunShellPenalty - shallowSunShellPenalty - thinManualSunShellPenalty - overstretchedManualSunShellPenalty - shallowRoomShellPenalty, 96);
    if (profile.weatherConflict) addEvidence(sunRoom, 'conflicting rain and sun setters');
    if (fakeSunShell(profile)) {
      addEvidence(sunRoom, 'no real sun setter is present');
      addEvidence(sunRoom, 'weatherless solar payoffs are not a real sun plan');
    }
    if (shallowSunShell(profile)) addEvidence(sunRoom, 'water-heavy shell undercuts sun turns');
    if (thinManualSunShell(profile)) addEvidence(sunRoom, 'only one thin manual sun setter is carrying the weather plan');
    if (overstretchedManualSunShell(profile)) {
      addEvidence(sunRoom, 'multiple manual sun setters are spending slots without enough real payoffs');
      addEvidence(sunRoom, 'most of the sun payoff load is still sitting on the setters themselves');
    }
    if (shallowTrickRoomShell(profile)) {
      addEvidence(sunRoom, 'multiple Trick Room setters but almost no slow payoff');
      addEvidence(sunRoom, 'fast attackers waste most Room turns');
    }
  }
  if (trickRoom) {
    trickRoom.score = njCap((trickRoom.score || 0) - shallowRoomShellPenalty, 96);
    if (shallowTrickRoomShell(profile)) {
      addEvidence(trickRoom, 'multiple Trick Room setters but almost no slow payoff');
      if ((profile.trickRoomPayoffs || []).length <= 1) addEvidence(trickRoom, 'too few dedicated slow breakers to justify Room support');
      addEvidence(trickRoom, 'fast attackers waste most Room turns');
    }
  }
  if (hazard) {
    hazard.score = njCap((hazard.score || 0) - stagnantHazardShellPenalty - thinHazardShellPenalty, 94);
    if (stagnantHazardShell(profile)) {
      addEvidence(hazard, 'hazard shell lacks enough payoff attackers');
      addEvidence(hazard, 'passive anchors make it hard to punish removal attempts');
    } else if (thinHazardConversionShell(profile)) {
      addEvidence(hazard, 'hazard shell leans on too few real closers');
      addEvidence(hazard, 'chip plan is too thin to convert long games into a finish');
    }
  }
  if (stall) {
    stall.score = njCap((stall.score || 0) - falseStallShellPenalty, 94);
    if (falseStallShell(profile)) {
      addEvidence(stall, 'too many proactive closers for a true stall shell');
      addEvidence(stall, 'fast breakers keep this closer to balance than hard attrition');
      if ((profile.stallPivots || []).length >= 2) addEvidence(stall, 'multiple pivots point to a momentum shell, not pure stall');
    }
  }
  if (bulky) {
    bulky.score = njCap((bulky.score || 0) - falseBulkyShellPenalty, 94);
    if (falseBulkyOffenseShell(profile)) {
      addEvidence(bulky, 'too many passive recovery anchors for a real bulky offense shell');
      if ((profile.bulkyOffenseClosers || []).length <= 1) addEvidence(bulky, 'only one real closer is carrying almost all of the pressure load');
      if ((profile.pivot || []).length >= 2) addEvidence(bulky, 'the glue core is spending more turns pivoting and stabilizing than forcing trades');
    }
  }
  if (hyper) {
    hyper.score = njCap((hyper.score || 0) - falseHyperShellPenalty, 94);
    if (falseHyperOffenseShell(profile)) {
      addEvidence(hyper, 'speed and setup are being propped up by bulky recovery pivots');
      addEvidence(hyper, 'too many defensive anchors for a real all-in offense shell');
      if ((profile.recoveryAnchors || []).length >= 2) addEvidence(hyper, 'multiple recovery anchors point to bulky offense, not true Hyper Offense');
      if ((profile.pivot || []).length >= 2) addEvidence(hyper, 'pivot scaffolding slows this closer to a tempo balance shell');
    }
  }
  if (dragon) {
    dragon.score = njCap((dragon.score || 0) - falseDragonPenalty, 95);
    if (falseDragonSpamShell(profile)) {
      addEvidence(dragon, 'Dragon count is not translating into repeated Dragon STAB pressure');
      if ((profile.dragonPressureAttackers || []).length <= 2) addEvidence(dragon, 'too few dragons are actually functioning as Dragon-type breakers');
      if ((profile.dragonClosers || []).length <= 1) addEvidence(dragon, 'the team lacks enough real Dragon endgame pressure');
      if ((profile.defensiveAnchors || []).length >= 2) addEvidence(dragon, 'too many Dragon slots are doing balance work instead of forcing trades');
    }
  }

  return toIdentityResult(rows, PRIORITY_BASE);
}

// balance-identity-upgrades detectIdentities wrapper
function applyBalanceIdentityPass(result: IdentityResult, profile: TeamProfile): IdentityResult {
  if (!falseBalanceShell(profile)) return result;
  const rows = (result?.all || []).map(cloneIdentityRow);
  const balance = rows.find((row) => row?.name === 'Balance');
  const stall = rows.find((row) => row?.name === 'Stall');
  if (balance) {
    balance.score = njCap((balance.score || 0) - falseBalancePenalty(profile), 93);
    if ((profile?.bulkyOffenseClosers || []).length === 0) addEvidence(balance, 'the shell has no true closer, so balance pressure is mostly theoretical');
    addEvidence(balance, 'recovery-and-status core is doing more work than the supposed balance pressure');
    if ((profile?.bulkyOffenseClosers || []).length <= 1) addEvidence(balance, 'only one real closer is carrying almost all of the forward pressure');
    if ((profile?.stallProgressPieces || []).length >= 4) addEvidence(balance, 'the team is converting turns through attrition more than balanced trading');
    if ((profile?.recoveryAnchors || []).length >= 4) addEvidence(balance, 'multiple recovery anchors push this closer to semistall than generic balance');
  }
  if (stall) {
    stall.score = njCap((stall.score || 0) + semistallBoost(profile), 93);
    if ((profile?.bulkyOffenseClosers || []).length === 0) addEvidence(stall, 'without a true closer, the structure behaves like full semistall pressure');
    addEvidence(stall, 'attrition and recovery are carrying more of the game plan than balanced trading');
    if ((profile?.bulkyOffenseClosers || []).length <= 1) addEvidence(stall, 'the shell relies on at most one real closer while the rest of the team grinds progress');
  }
  return toIdentityResult(rows, PRIORITY_BALANCE);
}

// weather-turn-economy-upgrades detectIdentities wrapper
function applyTurnEconomyIdentityPass(result: IdentityResult, profile: TeamProfile): IdentityResult {
  if (!slowManualRainHandoffShell(profile) && !fragileSingleRainHandoffShell(profile) && !slowManualSunHandoffShell(profile) && !fragileSingleSunHandoffShell(profile)) return result;
  const rows = (result?.all || []).map(cloneIdentityRow);
  const rain = rows.find((row) => row.name === 'Rain Offense');
  const sun = rows.find((row) => row.name === 'Sun Offense');
  const sunRoom = rows.find((row) => row.name === 'Sun Room');
  if (rain && slowManualRainHandoffShell(profile)) {
    rain.score = njCap((rain.score || 0) - slowManualRainHandoffPenalty(profile), 96);
    addEvidence(rain, 'manual rain setters cannot hand weather turns cleanly into the payoff core');
    addEvidence(rain, 'the weather plan loses too much tempo because the setters lack pivot or sacrifice handoff tools');
  }
  if (rain && fragileSingleRainHandoffShell(profile)) {
    rain.score = njCap((rain.score || 0) - fragileSingleRainHandoffPenalty(profile), 96);
    addEvidence(rain, 'the lone manual rain setter cannot hand weather turns cleanly into the payoff core');
    addEvidence(rain, 'one passive Rain Dance slot is carrying too much of the weather burden by itself');
  }
  if (sun && slowManualSunHandoffShell(profile)) {
    sun.score = njCap((sun.score || 0) - slowManualSunHandoffPenalty(profile), 92);
    addEvidence(sun, 'manual sun setters cannot hand weather turns cleanly into the payoff core');
    addEvidence(sun, 'the weather plan loses too much tempo because the setters lack pivot or sacrifice handoff tools');
  }
  if (sun && fragileSingleSunHandoffShell(profile)) {
    sun.score = njCap((sun.score || 0) - fragileSingleSunHandoffPenalty(profile), 92);
    addEvidence(sun, 'the lone manual sun setter cannot hand weather turns cleanly into the payoff core');
    addEvidence(sun, 'one passive Sunny Day slot is carrying too much of the weather burden by itself');
  }
  if (sunRoom && slowManualSunHandoffShell(profile)) {
    sunRoom.score = njCap((sunRoom.score || 0) - slowManualSunHandoffPenalty(profile), 96);
    addEvidence(sunRoom, 'manual sun setters cannot hand weather turns cleanly into the payoff core');
  }
  if (sunRoom && fragileSingleSunHandoffShell(profile)) {
    sunRoom.score = njCap((sunRoom.score || 0) - fragileSingleSunHandoffPenalty(profile), 96);
    addEvidence(sunRoom, 'the lone manual sun setter cannot hand weather turns cleanly into the payoff core');
  }
  return toIdentityResult(rows, PRIORITY_BASE);
}

// trick-room-identity-upgrades detectIdentities wrapper
function applyTrickRoomIdentityPass(result: IdentityResult, profile: TeamProfile): IdentityResult {
  const fragileSingleSetter = singleSetterFragileTrickRoomShell(profile);
  const shallowMultiSetter = multiSetterShallowTrickRoomShell(profile);
  const fragileMultiSetter = multiSetterFragileTurnHandoffShell(profile);
  if (!fragileSingleSetter && !shallowMultiSetter && !fragileMultiSetter) return result;
  const rows = (result?.all || []).map(cloneIdentityRow);
  const trickRoom = rows.find((row) => row.name === 'Trick Room Offense');
  const sunRoom = rows.find((row) => row.name === 'Sun Room');
  if (trickRoom) {
    trickRoom.score = njCap((trickRoom.score || 0) - fragileTrickRoomPenalty(profile), 96);
    if (fragileSingleSetter) {
      addEvidence(trickRoom, 'the lone Trick Room setter cannot hand the room turns cleanly into the breaker core');
      addEvidence(trickRoom, 'one passive Trick Room slot is carrying too much of the speed-control burden by itself');
      addEvidence(trickRoom, 'too much of the remaining pressure still plays at normal speed instead of truly cashing the room turns');
    }
    if (shallowMultiSetter) {
      addEvidence(trickRoom, 'multiple Trick Room setters are present, but too few real room payoffs exist outside those support slots');
      addEvidence(trickRoom, 'the team spends several slots setting Trick Room without enough slow breakers to convert those turns');
      addEvidence(trickRoom, 'too much of the remaining pressure still leans on normal-speed play for a true multi-setter room shell');
    }
    if (fragileMultiSetter) {
      addEvidence(trickRoom, 'multiple passive Trick Room setters still cannot hand the room turns cleanly into the payoff core');
      addEvidence(trickRoom, 'the room package advertises several outside abusers, but none of the setters pivot, sacrifice, or cash their own turns');
      addEvidence(trickRoom, 'too much of the remaining pressure still expects normal-speed play after the room turns are spent getting breakers in');
    }
  }
  if (sunRoom) {
    sunRoom.score = njCap((sunRoom.score || 0) - Math.max(0, fragileTrickRoomPenalty(profile) - 4), 96);
    if (fragileSingleSetter || shallowMultiSetter || fragileMultiSetter) {
      addEvidence(sunRoom, 'the Trick Room package is not handing enough clean room turns into real payoff pieces');
    }
  }
  return toIdentityResult(rows, PRIORITY_TRICK_ROOM);
}

// tailwind-identity-upgrades detectIdentities wrapper
function applyTailwindIdentityPass(result: IdentityResult, profile: TeamProfile): IdentityResult {
  const realTailwind = realTailwindShell(profile);
  const fragileSingleSetter = singleSetterFragileTailwindShell(profile);
  const shallowMultiSetter = multiSetterShallowTailwindShell(profile);
  const fragileMultiSetter = multiSetterFragileTailwindShell(profile);
  if (!realTailwind && !fragileSingleSetter && !shallowMultiSetter && !fragileMultiSetter) return result;
  const rows = (result?.all || []).map(cloneIdentityRow);
  const hyperOffense = rows.find((row) => row.name === 'Hyper Offense');
  const bulkyOffense = rows.find((row) => row.name === 'Bulky Offense');
  const balance = rows.find((row) => row.name === 'Balance');
  let tailwind = rows.find((row) => row.name === 'Tailwind Offense');
  if (!tailwind) {
    tailwind = { name: 'Tailwind Offense', score: 0, evidence: [] };
    rows.push(tailwind);
  }
  if (realTailwind) {
    tailwind.score = Math.max(tailwind.score || 0, tailwindOffenseScore(profile));
    addEvidence(tailwind, 'the team has a real Tailwind package with outside breakers that actually convert the speed boost');
    if ((profile?.tailwindHandoffSetters || []).length) {
      addEvidence(tailwind, 'at least one Tailwind setter can pivot or sacrifice itself to pass the boosted turns cleanly');
    }
    if ((profile?.tailwindSelfSufficientSetters || []).length) {
      addEvidence(tailwind, 'the Tailwind package includes a setter that still pressures the field after it spends the setup turn');
    }
  }
  if (fragileSingleSetter || shallowMultiSetter || fragileMultiSetter) {
    const penalty = fragileTailwindPenalty(profile);
    if (tailwind) {
      tailwind.score = njCap((tailwind.score || 0) - penalty, 94);
    }
    if (hyperOffense) {
      hyperOffense.score = njCap((hyperOffense.score || 0) - Math.max(8, penalty - 2), 96);
    }
    if (bulkyOffense) {
      bulkyOffense.score = njCap((bulkyOffense.score || 0) - Math.max(6, penalty - 4), 96);
    }
    if (balance && (hyperOffense || bulkyOffense)) {
      balance.score = njCap((balance.score || 0) + 4, 96);
    }
    if (fragileSingleSetter) {
      addEvidence(tailwind, 'the lone Tailwind setter cannot hand the boosted turns cleanly into the breaker core');
      addEvidence(tailwind, 'one passive Tailwind slot is carrying too much of the speed-control burden by itself');
      if (hyperOffense) {
        addEvidence(hyperOffense, 'the Tailwind package is too fragile to serve as a reliable speed-control backbone by itself');
      }
      if (bulkyOffense) {
        addEvidence(bulkyOffense, 'the Tailwind package is too fragile to give the team a dependable offensive tempo plan');
      }
    }
    if (shallowMultiSetter) {
      addEvidence(tailwind, 'multiple Tailwind setters are present, but too few real mid-speed breakers exist outside those support slots');
      addEvidence(tailwind, 'the team spends multiple slots on Tailwind without enough genuine payoff pieces to justify the burden');
      if (hyperOffense) {
        addEvidence(hyperOffense, 'the Tailwind package uses several support slots without enough real beneficiaries to justify them');
      }
      if (bulkyOffense) {
        addEvidence(bulkyOffense, 'the Tailwind package looks broader than it really is because the real payoff core is still too thin');
      }
    }
    if (fragileMultiSetter) {
      addEvidence(tailwind, 'multiple passive Tailwind setters still cannot pass the boosted turns cleanly into the payoff core');
      addEvidence(tailwind, 'the Tailwind package advertises several abusers, but none of the setters pivot, sacrifice, or threaten enough on their own');
      if (hyperOffense) {
        addEvidence(hyperOffense, 'the Tailwind turns are too hard to hand off cleanly for a real tempo-based offense');
      }
      if (bulkyOffense) {
        addEvidence(bulkyOffense, 'the Tailwind support exists on paper, but the setters still waste too many boosted turns getting breakers in');
      }
    }
  }
  return toIdentityResult(rows, PRIORITY_TAILWIND);
}

// screens-identity-upgrades detectIdentities wrapper
function applyScreensIdentityPass(result: IdentityResult, profile: TeamProfile): IdentityResult {
  const realScreens = realScreensShell(profile);
  const fragileSingle = fragileSingleSetterScreensShell(profile);
  const shallowMulti = shallowMultiSetterScreensShell(profile);
  const bulkySupport = bulkyScreensSupportShell(profile);
  if (!realScreens && !fragileSingle && !shallowMulti && !bulkySupport) return result;
  const rows = (result?.all || []).map(cloneIdentityRow);
  const hyper = rows.find((row) => row.name === 'Hyper Offense');
  const bulky = rows.find((row) => row.name === 'Bulky Offense');
  const balance = rows.find((row) => row.name === 'Balance');
  let screens = rows.find((row) => row.name === 'Screens Offense');
  if (!screens) {
    screens = { name: 'Screens Offense', score: 0, evidence: [] };
    rows.push(screens);
  }
  if (realScreens) {
    screens.score = Math.max(screens.score || 0, screensOffenseScore(profile));
    addEvidence(screens, 'the team has a real screens package with setup and closing threats that actually cash the protection turns');
    if ((profile?.screensClaySetters || []).length) {
      addEvidence(screens, 'at least one screen setter is extending the support window with Light Clay');
    }
    if ((profile?.screensHandoffSetters || []).length) {
      addEvidence(screens, 'the screens setter can pivot or sacrifice itself so the abusers enter while the support is still live');
    }
  }
  if (fragileSingle || shallowMulti || bulkySupport) {
    const penalty = fragileScreensPenalty(profile);
    screens.score = njCap((screens.score || 0) - penalty, 95);
    if (hyper) {
      hyper.score = njCap((hyper.score || 0) - Math.max(8, penalty - 2), 96);
    }
    if (bulky) {
      bulky.score = njCap((bulky.score || 0) - Math.max(5, penalty - 5), 96);
    }
    if (balance && (hyper || bulky)) {
      balance.score = njCap((balance.score || 0) + 4, 96);
    }
    if (fragileSingle) {
      addEvidence(screens, 'the lone screens setter cannot hand the support turns cleanly into the payoff core');
      addEvidence(screens, 'one passive screens slot is carrying too much of the protective burden by itself');
      if (hyper) {
        addEvidence(hyper, 'the screens button exists, but the team still leans on bulky glue to get its threats in safely');
      }
    }
    if (shallowMulti) {
      addEvidence(screens, 'multiple screens setters are present, but too few real setup or closing threats exist outside those support slots');
      addEvidence(screens, 'the team spends several slots on protection without enough payoff pieces to justify the burden');
      if (hyper) {
        addEvidence(hyper, 'the screens shell is broader on paper than it is in actual offensive conversion');
      }
    }
    if (bulkySupport) {
      addEvidence(screens, 'the screens support is mostly propping up a bulky glue shell instead of a real all-in offense');
      addEvidence(screens, 'too many recovery pivots and defensive anchors remain for the team to behave like true screens offense');
      if (bulky) {
        addEvidence(bulky, 'the roster still plays more like bulky offense or balance than a committed screens avalanche');
      }
    }
  }
  return toIdentityResult(rows, PRIORITY_SCREENS);
}

// webs-identity-upgrades detectIdentities wrapper
function applyWebsIdentityPass(result: IdentityResult, profile: TeamProfile): IdentityResult {
  const realWebs = realWebsShell(profile);
  const shallow = shallowWebsShell(profile);
  const bulkySupport = bulkyWebsSupportShell(profile);
  if (!realWebs && !shallow && !bulkySupport) return result;
  const rows = (result?.all || []).map(cloneIdentityRow);
  const hyper = rows.find((row) => row.name === 'Hyper Offense');
  const bulky = rows.find((row) => row.name === 'Bulky Offense');
  const balance = rows.find((row) => row.name === 'Balance');
  let webs = rows.find((row) => row.name === 'Webs Offense');
  if (!webs) {
    webs = { name: 'Webs Offense', score: 0, evidence: [] };
    rows.push(webs);
  }
  if (realWebs) {
    webs.score = Math.max(webs.score || 0, websOffenseScore(profile));
    addEvidence(webs, 'the team has a real Sticky Web plan with grounded breakers that actually cash the speed drop');
    if ((profile?.websSelfSufficientSetters || []).length) {
      addEvidence(webs, 'the Sticky Web setter still pressures the field or stacks hazards instead of existing as dead support weight');
    }
  }
  if (shallow || bulkySupport) {
    const penalty = fakeWebsPenalty(profile);
    webs.score = njCap((webs.score || 0) - penalty, 95);
    if (hyper) {
      hyper.score = njCap((hyper.score || 0) - Math.max(8, penalty - 2), 96);
    }
    if (bulky) {
      bulky.score = njCap((bulky.score || 0) - Math.max(5, penalty - 5), 96);
    }
    if (balance && (hyper || bulky)) {
      balance.score = njCap((balance.score || 0) + 4, 96);
    }
    if (shallow) {
      addEvidence(webs, 'the Sticky Web slot exists, but too few grounded mid-speed attackers actually need or exploit the drop');
      addEvidence(webs, 'too much of the offense is already naturally fast or immune to webs for the support to be a real identity backbone');
      if (hyper) {
        addEvidence(hyper, 'the webs package looks louder than its true payoff because several attackers would be playing the same game without it');
      }
    }
    if (bulkySupport) {
      addEvidence(webs, 'the Sticky Web support is mostly propping up a bulky glue shell instead of a real avalanche offense');
      addEvidence(webs, 'too many recovery pivots and defensive anchors remain for the roster to behave like committed webs offense');
      if (bulky) {
        addEvidence(bulky, 'the roster still plays more like bulky offense or balance than a team that truly lives off Sticky Web pressure');
      }
    }
  }
  return toIdentityResult(rows, PRIORITY_WEBS);
}

/** Merged detectIdentities — every patch applied in script order. */
export function detectIdentities(t: TeamMon[] = [], a?: AnalysisResult | null, p?: TeamProfile | null): IdentityResult {
  const profile = p || profileTeam(t, a);
  let result = detectIdentitiesBase((t || []) as Mon[], a, profile);
  result = applyWeatherIdentityPass(result, profile);
  result = applyBalanceIdentityPass(result, profile);
  result = applyTurnEconomyIdentityPass(result, profile);
  result = applyTrickRoomIdentityPass(result, profile);
  result = applyTailwindIdentityPass(result, profile);
  result = applyScreensIdentityPass(result, profile);
  result = applyWebsIdentityPass(result, profile);
  return result;
}

// ---------- evaluateSynergy: base + wrapper passes ----------

function evaluateSynergyBase(t: Mon[], a?: AnalysisResult | null, p?: TeamProfile | null): SynergyResult {
  const profile = p || profileTeam(t, a);
  const worst = (a?.rows || []).slice(0, 6);
  const critical = worst.filter((r) => r.sev === 'crit').length;
  const severe = worst.filter((r) => r.sev === 'bad').length;
  const maxStack = Math.max(...Object.values(profile.typeCounts), 0);
  const fc = fieldControlBreakdown(profile);
  const compressionSensitive = ['Great Tusk', 'Corviknight', 'Zapdos', 'Iron Treads'];
  const roleQualityOverloads = unique([
    ...profile.overloaded,
    ...t.filter((mon) => compressionSensitive.includes(mon.species) && ((profile.hazards.includes(mon.species) ? 1 : 0) + (profile.removal.includes(mon.species) ? 1 : 0) + (profile.pivot.includes(mon.species) ? 1 : 0) + (profile.defensiveAnchors.includes(mon.species) ? 1 : 0) + (profile.wallbreakers.includes(mon.species) ? 1 : 0)) >= 2).map((mon) => mon.species),
  ]);
  const typeSynergy = njCap(80 - critical * 18 - severe * 8 - Math.max(0, maxStack - 2) * 11 + profile.defensiveAnchors.length * 2, 95);
  const roleCompression = njCap(36 + (profile.hazards.length ? 8 : 0) + (profile.removal.length ? 8 : 0) + (profile.pivot.length ? 8 : 0) + (profile.priority.length || profile.scarf.length || profile.trickRoom.length ? 10 : 0) + (profile.defensiveAnchors.length ? 10 : 0) + (profile.wallbreakers.length ? 9 : 0) - roleQualityOverloads.length * 12, 94);
  const offensiveCoverage = njCap(30 + profile.attackingTypes.length * 5 + (profile.physicalAttackers.length && profile.specialAttackers.length ? 10 : 0) + profile.wallbreakers.length * 4 + profile.setup.length * 3, 95);
  const defensiveBackbone = njCap(22 + profile.defensiveAnchors.length * 10 + profile.recovery.length * 4 + profile.pivot.length * 3 - critical * 8 - profile.fastBreakers.length * 2, 95);
  const fieldControl = njCap(fc.score, 94);
  const speedControl = njCap(24 + profile.fast.length * 6 + profile.priority.length * 10 + profile.scarf.length * 16 + profile.trickRoom.length * 16 + (profile.status.length ? 4 : 0), 95);
  let winReliability = njCap(20 + profile.wincons.length * 5 + profile.wallbreakers.length * 4 + profile.setup.length * 4 + profile.defensiveAnchors.length * 3 - roleQualityOverloads.length * 10 - critical * 6, 92);
  if (profile.wincons.length >= 5 && profile.defensiveAnchors.length < 2) winReliability = Math.min(winReliability, 58);
  if (profile.wincons.length < 2) winReliability = Math.min(winReliability, 45);
  const issues: SynergyIssue[] = [];
  if (maxStack >= 4) {
    const stack = Object.entries(profile.typeCounts).sort((x, y) => y[1] - x[1])[0];
    issues.push({ severity: 'critical', title: `${stack[1]} ${stack[0]}-type stack`, detail: 'Repeated typing creates predictable revenge-kill and coverage paths.' });
  }
  worst.forEach((r) => { if (r.sev === 'crit' || r.sev === 'bad') issues.push({ severity: r.sev, title: `${r.tp} pressure`, detail: `${r.weak} weak, ${r.res} resist, ${r.imm} immune.` }); });
  if (!profile.removal.length && !profile.bounce.length) issues.push({ severity: 'bad', title: 'No hazard control', detail: 'No removal or Magic Bounce detected.' });
  if (profile.hazards.length && !profile.removalDenial.length) issues.push({ severity: 'warn', title: 'No removal denial', detail: 'Hazards can be cleared unless pressure or positioning compensates.' });
  if (roleQualityOverloads.length) issues.push({ severity: 'warn', title: 'Role overload', detail: `${roleQualityOverloads.join(', ')} compress too many jobs or are matchup-overworked.` });
  const rainRow = (a?.rows || []).find((r) => r.tp === 'Water');
  if (rainRow && rainRow.weak >= 2 && rainRow.res <= 1) issues.push({ severity: 'bad', title: 'Rain dependency', detail: 'Water pressure forces careful preservation of the few checks.' });
  if (!profile.priority.length && !profile.scarf.length && !profile.trickRoom.length && profile.fast.length < 2) issues.push({ severity: 'bad', title: 'Thin speed control', detail: 'No priority, Scarf, Trick Room, or strong speed density.' });
  return { scores: { typeSynergy, roleCompression, offensiveCoverage, defensiveBackbone, fieldControl, speedControl, winReliability }, fieldControl: fc, roleQualityOverloads, issues };
}

type SynergyPatch = (next: SynergyResult, profile: TeamProfile) => void;

function applyWeatherSynergyPass(next: SynergyResult, profile: TeamProfile): void {
  const push = (issue: SynergyIssue) => { if (!next.issues.some((i) => i?.title === issue.title)) next.issues.push(issue); };
  if (profile?.weatherConflict) {
    next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 12, 94);
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 12, 92);
    push({ severity: 'bad', title: 'Conflicting weather plan', detail: 'Rain and sun setters fight each other, so the team often boosts the wrong attackers or weakens its own damage plan.' });
  }
  if (fakeRainShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 9, 92);
    next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 6, 92);
    push({ severity: 'bad', title: 'Rain read lacks a real setter', detail: 'The team borrows Hurricane-style rain signals, but it has no Drizzle or Rain Dance support, so a Rain Offense label would be describing fake weather rather than the real game plan.' });
  }
  if (shallowRainShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 8, 92);
    push({ severity: 'bad', title: 'Rain plan clashes with Fire core', detail: 'Pelipper is creating rain turns for a roster that is still mostly trying to click Fire attacks, so the weather slot is not producing a coherent closing plan.' });
  }
  if (thinManualRainShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 8, 92);
    next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 5, 92);
    push({ severity: 'bad', title: 'Manual rain support is too thin', detail: 'One Rain Dance slot is doing too much work. The team does not have enough dedicated rain payoffs to treat that one manual setter as a real Rain Offense backbone.' });
  }
  if (overstretchedManualRainShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 8, 92);
    next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 6, 92);
    push({ severity: 'bad', title: 'Manual rain support is overstretched', detail: 'The team is burning multiple Rain Dance slots without enough real weather conversion behind them. Too much of the rain payoff is still trapped on the setters themselves, so the setter burden is larger than the actual reward.' });
  }
  if (shallowSunShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 8, 92);
    push({ severity: 'bad', title: 'Sun plan clashes with Water core', detail: 'Drought is supporting a roster that is still mostly trying to click Water attacks, so the weather slot is not producing a coherent closing plan.' });
  }
  if (fakeSunShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 8, 92);
    next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 6, 92);
    push({ severity: 'bad', title: 'Sun read lacks a real setter', detail: 'The team borrows Solar Beam-, Weather Ball-, or Protosynthesis-style sun signals, but it has no Drought or Sunny Day support, so a Sun Offense label would be describing fake weather rather than the real game plan.' });
  }
  if (thinManualSunShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 7, 92);
    next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 5, 92);
    push({ severity: 'bad', title: 'Manual sun support is too thin', detail: 'One Sunny Day slot is doing too much work. The team does not have enough dedicated sun payoffs to treat that one manual setter as a real Sun Offense backbone.' });
  }
  if (overstretchedManualSunShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 7, 92);
    next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 6, 92);
    push({ severity: 'bad', title: 'Manual sun support is overstretched', detail: 'The team is burning multiple Sunny Day slots without enough real weather conversion behind them. Too much of the sun payoff is still trapped on the setters themselves, so the setter burden is larger than the actual reward.' });
  }
  if (shallowTrickRoomShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 10, 92);
    next.scores.speedControl = njCap((next.scores.speedControl || 0) - 8, 92);
    push({ severity: 'bad', title: 'Trick Room plan lacks slow closers', detail: 'The team spends slots on Trick Room support, but most of the attackers are still too fast to exploit those turns, so the Room plan rarely converts into a real closing sequence.' });
  }
  if (stagnantHazardShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 8, 92);
    next.scores.offensiveCoverage = njCap((next.scores.offensiveCoverage || 0) - 10, 92);
    next.scores.fieldControl = njCap((next.scores.fieldControl || 0) - 6, 92);
    push({ severity: 'bad', title: 'Hazard plan lacks payoff attackers', detail: 'The team can set hazards and sometimes deny removal, but too few attackers actually convert that chip into forced progress or a closing sequence.' });
  } else if (thinHazardConversionShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 7, 92);
    next.scores.offensiveCoverage = njCap((next.scores.offensiveCoverage || 0) - 8, 92);
    next.scores.fieldControl = njCap((next.scores.fieldControl || 0) - 5, 92);
    push({ severity: 'bad', title: 'Hazard plan leans on too few closers', detail: 'The team has hazard support and one serious closer, but the rest of the shell is too passive to keep forcing progress once that single payoff line gets checked.' });
  }
  if (falseStallShell(profile)) {
    next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 6, 92);
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 7, 92);
    push({ severity: 'warn', title: 'Stall read overstates a balance shell', detail: 'The team has some recovery-and-status anchors, but it still leans on proactive breakers and pivot tempo too heavily to call the whole structure true stall.' });
  }
  if (falseBulkyOffenseShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 8, 92);
    next.scores.offensiveCoverage = njCap((next.scores.offensiveCoverage || 0) - 7, 92);
    next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 5, 92);
    push({ severity: 'warn', title: 'Bulky offense read overstates a balance shell', detail: 'The team has one real closer, but too much of the roster is still doing passive glue work. It stabilizes and pivots more like balance than it trades pressure like true bulky offense.' });
  }
  if (falseHyperOffenseShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 7, 92);
    next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 6, 92);
    push({ severity: 'warn', title: 'Hyper offense read overstates a bulky tempo shell', detail: 'The team has speed and setup, but too many recovery anchors and pivots are still doing glue work for it to behave like true all-in Hyper Offense. It plays more like bulky offense with fast pressure.' });
  }
  if (falseDragonSpamShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 8, 92);
    next.scores.offensiveCoverage = njCap((next.scores.offensiveCoverage || 0) - 7, 92);
    push({ severity: 'warn', title: 'Dragon stack lacks repeated Dragon pressure', detail: 'The team has several Dragon bodies, but too few of them are actually forcing trades with Dragon STAB. It plays more like bulky balance than true Dragon Spam Offense.' });
  }
}

function applyBalanceSynergyPass(next: SynergyResult, profile: TeamProfile): void {
  if (!falseBalanceShell(profile)) return;
  const closerlessPenalty = (profile?.bulkyOffenseClosers || []).length === 0 ? 3 : 0;
  next.scores.winReliability = njCap((next.scores.winReliability || 0) - 8 - closerlessPenalty, 92);
  next.scores.offensiveCoverage = njCap((next.scores.offensiveCoverage || 0) - 9 - closerlessPenalty, 92);
  next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 6 - closerlessPenalty, 92);
  if (!next.issues.some((issue) => issue?.title === 'Balance read overstates a semistall shell')) {
    next.issues.push({ severity: 'warn', title: 'Balance read overstates a semistall shell', detail: 'The team has enough glue to avoid a pure stall label, but most of its real progress still comes from recovery, status, and chip. With one or zero real closers, it behaves more like semistall than a balanced trading shell.' });
  }
}

function applyTurnEconomySynergyPass(next: SynergyResult, profile: TeamProfile): void {
  const push = (issue: SynergyIssue) => { if (!next.issues.some((i) => i?.title === issue.title)) next.issues.push(issue); };
  if (slowManualRainHandoffShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 7, 92);
    next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 5, 92);
    push({ severity: 'bad', title: 'Manual rain turns are hard to hand off', detail: 'The team has enough nominal rain payoffs, but its Rain Dance setters do not pivot, sack, or otherwise pass the weather turn cleanly into those abusers. Too many rain turns get spent rebuilding tempo instead of cashing the reward.' });
  }
  if (fragileSingleRainHandoffShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 6, 92);
    next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 4, 92);
    push({ severity: 'bad', title: 'Single rain setter cannot hand turns off cleanly', detail: 'The team has real rain payoffs, but one passive Rain Dance slot is carrying the whole plan alone. Without pivot or sacrifice handoff tools, too many rain turns disappear before the abusers actually touch the field.' });
  }
  if (slowManualSunHandoffShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 6, 92);
    next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 5, 92);
    push({ severity: 'bad', title: 'Manual sun turns are hard to hand off', detail: 'The team has enough nominal sun payoffs, but its Sunny Day setters do not pivot, sack, or otherwise pass the weather turn cleanly into those abusers. Too many sun turns get spent regaining board position instead of turning weather into pressure.' });
  }
  if (fragileSingleSunHandoffShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 5, 92);
    next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 4, 92);
    push({ severity: 'bad', title: 'Single sun setter cannot hand turns off cleanly', detail: 'The team has real sun payoffs, but one passive Sunny Day slot is carrying the whole plan alone. Without pivot or sacrifice handoff tools, too many sun turns disappear before the abusers can convert the weather.' });
  }
}

function applyTrickRoomSynergyPass(next: SynergyResult, profile: TeamProfile): void {
  const fragileSingleSetter = singleSetterFragileTrickRoomShell(profile);
  const shallowMultiSetter = multiSetterShallowTrickRoomShell(profile);
  const fragileMultiSetter = multiSetterFragileTurnHandoffShell(profile);
  if (!fragileSingleSetter && !shallowMultiSetter && !fragileMultiSetter) return;
  next.scores.winReliability = njCap((next.scores.winReliability || 0) - (fragileSingleSetter ? 6 : 5), 92);
  next.scores.speedControl = njCap((next.scores.speedControl || 0) - (fragileSingleSetter ? 7 : 6), 92);
  next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 4, 92);
  if (fragileSingleSetter && !next.issues.some((issue) => issue?.title === 'Single Trick Room setter cannot hand turns off cleanly')) {
    next.issues.push({ severity: 'bad', title: 'Single Trick Room setter cannot hand turns off cleanly', detail: 'The team has some slow breakers on paper, but one passive Trick Room slot is carrying the whole plan alone. Without pivot, sacrifice, or self-contained pressure from that setter, too many room turns disappear before the abusers can actually convert them.' });
  }
  if (shallowMultiSetter && !next.issues.some((issue) => issue?.title === 'Multi-setter Trick Room shell lacks enough real payoffs')) {
    next.issues.push({ severity: 'bad', title: 'Multi-setter Trick Room shell lacks enough real payoffs', detail: 'The team has multiple Trick Room setters, but too few genuine room abusers outside those support slots. That leaves the room package spending turns on setup while the rest of the roster still expects to win at normal speed.' });
  }
  if (fragileMultiSetter && !next.issues.some((issue) => issue?.title === 'Passive multi-setter Trick Room shell still loses too many handoff turns')) {
    next.issues.push({ severity: 'bad', title: 'Passive multi-setter Trick Room shell still loses too many handoff turns', detail: 'The team has several Trick Room setters and enough nominal payoffs on paper, but none of those setters pivot, sacrifice, or threaten enough on their own to hand the room turns off cleanly. Too many Trick Room turns vanish while the team is still trying to bring the real breakers onto the field.' });
  }
}

function applyTailwindSynergyPass(next: SynergyResult, profile: TeamProfile): void {
  const fragileSingleSetter = singleSetterFragileTailwindShell(profile);
  const shallowMultiSetter = multiSetterShallowTailwindShell(profile);
  const fragileMultiSetter = multiSetterFragileTailwindShell(profile);
  if (!fragileSingleSetter && !shallowMultiSetter && !fragileMultiSetter) return;
  next.scores.winReliability = njCap((next.scores.winReliability || 0) - (fragileSingleSetter ? 6 : 5), 92);
  next.scores.speedControl = njCap((next.scores.speedControl || 0) - (fragileSingleSetter ? 7 : 6), 92);
  next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 4, 92);
  if (fragileSingleSetter && !next.issues.some((issue) => issue?.title === 'Single Tailwind setter cannot hand turns off cleanly')) {
    next.issues.push({ severity: 'bad', title: 'Single Tailwind setter cannot hand turns off cleanly', detail: 'The team has a few real Tailwind beneficiaries on paper, but one passive Tailwind slot is carrying the whole plan alone. Without pivot, sacrifice, or meaningful follow-through from that setter, too many boosted turns disappear before the breakers actually cash them in.' });
  }
  if (shallowMultiSetter && !next.issues.some((issue) => issue?.title === 'Multi-setter Tailwind shell lacks enough real payoffs')) {
    next.issues.push({ severity: 'bad', title: 'Multi-setter Tailwind shell lacks enough real payoffs', detail: 'The team has multiple Tailwind setters, but too few genuine mid-speed breakers exist outside those support slots. That turns the Tailwind package into support burden instead of a reliable offensive conversion layer.' });
  }
  if (fragileMultiSetter && !next.issues.some((issue) => issue?.title === 'Passive multi-setter Tailwind shell still loses too many boosted turns')) {
    next.issues.push({ severity: 'bad', title: 'Passive multi-setter Tailwind shell still loses too many boosted turns', detail: 'The team has several Tailwind setters and enough nominal payoffs on paper, but none of those setters pivot, sacrifice, or threaten enough on their own to pass the boosted turns cleanly. Too many Tailwind turns vanish while the team is still trying to bring the real breakers onto the field.' });
  }
}

function applyScreensSynergyPass(next: SynergyResult, profile: TeamProfile): void {
  const push = (issue: SynergyIssue) => { if (!next.issues.some((i) => i?.title === issue.title)) next.issues.push(issue); };
  if (fragileSingleSetterScreensShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 7, 92);
    next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 5, 92);
    next.scores.offensiveCoverage = njCap((next.scores.offensiveCoverage || 0) - 4, 92);
    push({ severity: 'bad', title: 'Single screens setter cannot convert support into pressure', detail: 'The team has setup and pressure on paper, but one passive screens setter is carrying the entire protection plan alone. Without pivot, sacrifice, or its own offensive follow-through, too many protected turns disappear before the real abusers are actually attacking.' });
  }
  if (shallowMultiSetterScreensShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 7, 92);
    next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 6, 92);
    next.scores.offensiveCoverage = njCap((next.scores.offensiveCoverage || 0) - 5, 92);
    push({ severity: 'bad', title: 'Screens package lacks enough real payoffs', detail: 'The team has multiple screens setters, but too few genuine setup or closing threats exist outside those support slots. That turns the screens package into support burden instead of a reliable offensive conversion layer.' });
  }
  if (bulkyScreensSupportShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 6, 92);
    next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 5, 92);
    push({ severity: 'warn', title: 'Screens support is propping up a bulky glue shell', detail: 'The team can click screens, but too much of the roster is still doing recovery, pivot, and anchor work for the result to behave like real screens offense. The support exists on paper without enough all-in conversion behind it.' });
  }
}

function applyWebsSynergyPass(next: SynergyResult, profile: TeamProfile): void {
  const push = (issue: SynergyIssue) => { if (!next.issues.some((i) => i?.title === issue.title)) next.issues.push(issue); };
  if (shallowWebsShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 7, 92);
    next.scores.speedControl = njCap((next.scores.speedControl || 0) - 6, 92);
    next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 4, 92);
    push({ severity: 'bad', title: 'Sticky Web support lacks enough grounded payoffs', detail: 'The team can set Sticky Web, but too few grounded mid-speed attackers actually convert that speed drop into pressure. Several teammates are already naturally fast or ignore webs entirely, so the support exists on paper without enough real payoff behind it.' });
  }
  if (bulkyWebsSupportShell(profile)) {
    next.scores.winReliability = njCap((next.scores.winReliability || 0) - 6, 92);
    next.scores.roleCompression = njCap((next.scores.roleCompression || 0) - 5, 92);
    push({ severity: 'warn', title: 'Sticky Web is propping up a bulky glue shell', detail: 'The team has a Sticky Web button, but too much of the roster is still doing recovery, pivot, and anchor work for the result to behave like real webs offense. The hazard is helping, but it is not the actual structural backbone.' });
  }
}

/** Merged evaluateSynergy — every patch applied in script order. */
export function evaluateSynergy(t: TeamMon[] = [], a?: AnalysisResult | null, p?: TeamProfile | null, _identity?: IdentityResult): SynergyResult {
  const profile = p || profileTeam(t, a);
  const base = evaluateSynergyBase((t || []) as Mon[], a, profile);
  const next: SynergyResult = { ...base, scores: { ...(base?.scores || {}) }, issues: [...(base?.issues || [])] } as SynergyResult;
  const passes: SynergyPatch[] = [
    applyWeatherSynergyPass, applyBalanceSynergyPass, applyTurnEconomySynergyPass,
    applyTrickRoomSynergyPass, applyTailwindSynergyPass, applyScreensSynergyPass,
    applyWebsSynergyPass,
  ];
  for (const pass of passes) pass(next, profile);
  return next;
}

// ---------- evaluateMatchups ----------

export function evaluateMatchups(t: TeamMon[] = [], a?: AnalysisResult | null, p?: TeamProfile | null, identity?: IdentityResult): MatchupRow[] {
  const teamList = (Array.isArray(t) ? t : []) as Mon[];
  const profile = p || profileTeam(teamList, a);
  const _identity = identity || detectIdentities(teamList, a, profile);
  void _identity;
  const row = (tp: string) => (a?.rows || []).find((r) => r.tp === tp) || { weak: 0, res: 0, imm: 0, score: 0, sev: 'good', tp };
  const waterChecks = row('Water').res + row('Water').imm;
  const iceWeak = row('Ice').weak;
  const fairyWeak = row('Fairy').weak;
  const fc = fieldControlBreakdown(profile);
  const hasFreezeDry = teamList.some((x) => x.moves.includes('Freeze-Dry'));
  const hasElectric = teamList.some((x) => x.species === 'Raging Bolt' || x.moves.includes('Thunderclap') || x.moves.includes('Thunderbolt') || x.moves.includes('Volt Switch'));
  const intoRain = njCap(Math.max(12, 40 + waterChecks * 8 + (hasFreezeDry ? 12 : 0) + (hasElectric ? 9 : 0) + (profile.attackingTypes.includes('Grass') ? 5 : 0) - row('Water').weak * 9 - iceWeak * 4 - (waterChecks === 0 ? 15 : 0)), 94);
  const intoSun = njCap(48 + (row('Fire').res + row('Fire').imm) * 8 + (profile.attackingTypes.includes('Water') ? 10 : 0) + (profile.drizzle.length ? 12 : 0) - row('Fire').weak * 7 - row('Rock').weak * 3, 94);
  const intoHO = njCap(42 + profile.priority.length * 10 + profile.fast.length * 5 + profile.scarf.length * 14 + profile.trickRoom.length * 12 + profile.defensiveAnchors.length * 5 - profile.recovery.length * 2, 94);
  const intoStall = njCap(34 + profile.wallbreakers.length * 7 + profile.choice.length * 6 + profile.status.length * 4 + profile.hazards.length * 4 + profile.setup.length * 3 + (profile.attackingTypes.length >= 7 ? 6 : 0), 90);
  const intoHazards = njCap(35 + profile.removal.length * 15 + profile.bounce.length * 18 + profile.boots.length * 5 + profile.removalDenial.length * 8 - row('Rock').weak * 2 - (fc.setterOverload ? 8 : 0), 92);
  const intoBalance = njCap(48 + profile.wallbreakers.length * 5 + profile.pivot.length * 5 + profile.hazards.length * 3 + profile.defensiveAnchors.length * 4 - criticalPenalty(a), 92);
  const intoTR = njCap(40 + profile.priority.length * 9 + profile.status.length * 5 + profile.trickRoom.length * 10 + profile.fast.length * 2 - (profile.slow.length >= 4 && !profile.trickRoom.length ? 15 : 0), 88);
  const intoDragon = njCap(48 + (profile.typeCounts.Steel || 0) * 10 + (profile.typeCounts.Fairy || 0) * 10 + profile.priority.length * 5 - (profile.typeCounts.Dragon || 0) * 5 - fairyWeak * 2, 92);
  const rainChecks = unique([
    ...teamList.filter((mon) => mult('Water', types(mon)) < 1).map((mon) => mon.species),
    ...teamList.filter((mon) => ['Water Absorb', 'Storm Drain', 'Dry Skin'].includes(mon.ability)).map((mon) => mon.species),
  ]).slice(0, 3);
  const mk = (name: string, score: number, reason: string, advice: string): MatchupRow => ({ name, score: Math.round(score), class: scoreClass(score), reason, advice });
  return [
    mk('Rain', intoRain, intoRain < 50 ? 'Play depends on preserving dedicated Water answers; once they are chipped, rain progress becomes automatic.' : intoRain > 70 ? 'Multiple Water checks or anti-rain anchors make the matchup favorable.' : 'Playable but dependency-heavy; protect the few rain checks.', `${rainChecks.length ? `Preserve ${rainChecks.join(', ')}.` : 'Preserve your Water resists.'} Do not give up Ground/Rock pivots for free.`),
    mk('Sun', intoSun, intoSun < 50 ? 'Fire pressure and coverage strain the defensive plan.' : intoSun > 70 ? 'Fire resistance and counter-pressure are favorable.' : 'Volatile; positioning and weather turns decide it.', 'Track sun turns and keep Fire checks healthy.'),
    mk('Hyper Offense', intoHO, intoHO < 50 ? 'Fast pressure can overwhelm if you lose tempo.' : 'Speed, priority, Scarf, status, or anchors let you trade.', 'Preserve revenge tools and avoid trading away speed control.'),
    mk('Stall', intoStall, intoStall > 84 ? 'You have enough progress tools to pressure passive teams, but only if you keep them healthy.' : intoStall < 50 ? 'Long games expose limited breaking or status vulnerability.' : 'Can pressure passive teams if breakers stay healthy.', 'Keep the best breaker healthy and deny free recovery loops.'),
    mk('Hazard Stack', intoHazards, intoHazards < 50 ? 'Field control is fragile; removal can be overloaded or denied.' : intoHazards > 75 ? 'Removal, Boots, or denial give strong counterplay.' : 'Playable, but single removal lines can be overloaded.', `Protect hazard control and map Gholdengo/spinblocker sequences before clicking ${profile.removal[0] || 'removal'}.`),
    mk('Bulky Balance', intoBalance, intoBalance < 50 ? 'Stable cores can outlast your progress tools.' : 'You can pressure balanced cores with pivots and breakers.', `Use pivots to create one safe entry for ${profile.wallbreakers[0] || 'your main breaker'}.`),
    mk('Trick Room', intoTR, intoTR < 50 ? 'Room can flip the speed relationship if setters get in safely.' : 'Status, priority, speed, or anchors help stall Room turns.', 'Pressure setters early and burn turns with protective pivots when needed.'),
    mk('Dragon Mirror', intoDragon, intoDragon < 50 ? 'Dragon pressure is risky without Steel/Fairy glue.' : 'Dedicated Dragon counterplay exists.', 'Keep Steel/Fairy checks healthy for the Dragon exchange.'),
  ];
}
