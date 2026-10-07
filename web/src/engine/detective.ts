/**
 * detective.ts — set detective engine (merged legacy layers).
 *
 * Ported from src/app.js (detective + dmg sections) with every patch layer
 * folded in, in script order:
 *   replay-ability-upgrades → replay-status-control-upgrades →
 *   choice-lock-timeline-upgrades → item-transfer-timeline-upgrades →
 *   revealed-item-anchor-upgrades → move-immunity-upgrades
 *
 * DOM-free: functions that read DOM state in legacy (detect, loadReplayDetective)
 * take explicit options objects instead.
 */
import { unique, mult, toId } from './types';
import type { Stats, TeamMon, MoveData } from './types';
import {
  getSpecies,
  moveData,
  moveMeta,
  moveCategory,
  resolveMoveName,
  stats,
  parseEV,
  grounded,
  hazardPct,
  moveBlockingAbility as moveBlockingAbilityByType,
  types as monTypes,
} from './dex';
import type { ReplayRead } from './replay';

// ---------------------------------------------------------------------------
// Shared ability tables (merged from replay-ability / status-control /
// move-immunity upgrades). The parser in replay.ts uses these too.
// ---------------------------------------------------------------------------

export const REACTIVE_PROOF_ABILITIES = new Set([
  'Water Absorb',
  'Volt Absorb',
  'Dry Skin',
  'Storm Drain',
  'Lightning Rod',
  'Motor Drive',
  'Sap Sipper',
  'Earth Eater',
  'Well-Baked Body',
  'Flash Fire',
  'Good as Gold',
  'Magic Bounce',
  // replay-status-control-upgrades
  'Aroma Veil',
  'Oblivious',
  'Own Tempo',
  // move-immunity-upgrades
  'Soundproof',
  'Bulletproof',
  'Wind Rider',
  'Overcoat',
]);

export const CONTROL_STATUS_BLOCKERS: Record<string, Set<string>> = {
  'Aroma Veil': new Set(['Attract', 'Disable', 'Encore', 'Heal Block', 'Taunt', 'Torment']),
  Oblivious: new Set(['Attract', 'Taunt']),
  'Own Tempo': new Set(['Confuse Ray', 'Flatter', 'Supersonic', 'Swagger', 'Teeter Dance']),
};

const SOUND_MOVES = new Set([
  'Alluring Voice', 'Boomburst', 'Bug Buzz', 'Clanging Scales', 'Disarming Voice',
  'Echoed Voice', 'Grass Whistle', 'Heal Bell', 'Hyper Voice', 'Metal Sound',
  'Noble Roar', 'Overdrive', 'Parting Shot', 'Perish Song', 'Psychic Noise',
  'Relic Song', 'Roar', 'Round', 'Screech', 'Sing', 'Snarl', 'Snore',
  'Sparkling Aria', 'Supersonic', 'Torch Song', 'Uproar',
]);
const BALL_OR_BOMB_MOVES = new Set([
  'Aura Sphere', 'Bullet Seed', 'Electro Ball', 'Energy Ball', 'Focus Blast',
  'Gyro Ball', 'Ice Ball', 'Magnet Bomb', 'Mist Ball', 'Mud Bomb', 'Octazooka',
  'Pollen Puff', 'Pyro Ball', 'Rock Wrecker', 'Seed Bomb', 'Shadow Ball',
  'Sludge Bomb', 'Weather Ball', 'Zap Cannon',
]);
const WIND_MOVES = new Set([
  'Air Cutter', 'Air Slash', 'Bleakwind Storm', 'Defog', 'Fairy Wind', 'Gust',
  'Heat Wave', 'Hurricane', 'Icy Wind', 'Ominous Wind', 'Petal Blizzard',
  'Razor Wind', 'Sandsear Storm', 'Springtide Storm', 'Tailwind', 'Twister',
  'Whirlwind', 'Wildbolt Storm',
]);
const WIND_RIDER_TRIGGER_ONLY_MOVES = new Set(['Tailwind']);
const POWDER_MOVES = new Set([
  'Cotton Spore', 'Poison Powder', 'Powder', 'Rage Powder', 'Sleep Powder',
  'Spore', 'Stun Spore',
]);

const resolvedMoveName = (move: string): string => resolveMoveName(move) || String(move || '').trim();

export function isSoundMove(move = ''): boolean { return SOUND_MOVES.has(resolvedMoveName(move)); }
export function isBallOrBombMove(move = ''): boolean { return BALL_OR_BOMB_MOVES.has(resolvedMoveName(move)); }
export function isWindMove(move = ''): boolean { return WIND_MOVES.has(resolvedMoveName(move)); }
/** Wind moves that actually hit Wind Rider holders as an immunity (Tailwind is trigger-only). */
export function isWindImmunityMove(move = ''): boolean {
  const name = resolvedMoveName(move);
  return WIND_MOVES.has(name) && !WIND_RIDER_TRIGGER_ONLY_MOVES.has(name);
}
export function isPowderMove(move = ''): boolean { return POWDER_MOVES.has(resolvedMoveName(move)); }

/** Move-family immunities added by move-immunity-upgrades (Soundproof / Bulletproof / Wind Rider / Overcoat). */
export function moveSpecificImmunityAbility(ability = '', move = ''): string {
  const name = String(ability || '').trim();
  if (name === 'Soundproof' && isSoundMove(move)) return 'Soundproof';
  if (name === 'Bulletproof' && isBallOrBombMove(move)) return 'Bulletproof';
  if (name === 'Wind Rider' && isWindImmunityMove(move)) return 'Wind Rider';
  if (name === 'Overcoat' && isPowderMove(move)) return 'Overcoat';
  return '';
}

export function controlStatusAbilityBlocksMove(ability = '', move = ''): string {
  const name = String(ability || '').trim();
  const moves = CONTROL_STATUS_BLOCKERS[name];
  if (!moves) return '';
  return moves.has(resolvedMoveName(move)) ? name : '';
}

export function controlStatusBlockedAbilities(species = '', move = ''): string[] {
  const moveNameValue = resolvedMoveName(move);
  if (!moveNameValue) return [];
  return detectiveAbilities(species).filter((ability) => !!controlStatusAbilityBlocksMove(ability, moveNameValue));
}

/** Mold Breaker family ignores all ability-based move protection; Mycelium Might only for Status moves. */
export function abilityBypassMode(ability = ''): '' | 'all' | 'status' {
  const name = String(ability || '').trim();
  if (['Mold Breaker', 'Teravolt', 'Turboblaze'].includes(name)) return 'all';
  if (name === 'Mycelium Might') return 'status';
  return '';
}

export function attackerBypassesMoveImmunity(ability = '', move = ''): boolean {
  const mode = abilityBypassMode(ability);
  if (mode === 'all') return true;
  if (mode === 'status') return String(moveCategory(move) || '') === 'Status';
  return false;
}

/**
 * move-immunity-patched moveBlockingAbility: move-specific families first
 * (they need the move name), then the type/category immunity table.
 */
export function immunityBlockingAbility(moveType: string, category: string, ability: string, move = ''): string {
  const blocker = moveSpecificImmunityAbility(ability, move);
  if (blocker) return blocker;
  return moveBlockingAbilityByType(moveType, category, ability);
}

// ---------------------------------------------------------------------------
// Damage roll (app.js dmg + the move-immunity patched layer)
// ---------------------------------------------------------------------------

export interface DamageOptions {
  hpPct?: number;
  hazards?: string;
  field?: string;
  attackerTera?: boolean;
  defenderTera?: boolean;
  attackerTeraType?: string;
  defenderTeraType?: string;
  attOver?: { item?: string; evs?: Stats; nature?: string };
  defOver?: { item?: string; evs?: Stats; nature?: string };
}

export interface DamageRoll {
  att: Partial<TeamMon>;
  def: Partial<TeamMon>;
  mv: string;
  move: MoveData | null;
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
  moveType: string;
  blockedBy: string;
}

function effectiveSet(m: Partial<TeamMon>, opts: { attackerTera?: boolean; defenderTera?: boolean; teraType?: string } = {}): Partial<TeamMon> {
  const copy: Partial<TeamMon> = { ...m };
  if (opts.attackerTera || opts.defenderTera) copy.tera = opts.teraType || m.tera;
  return copy;
}

export function dmg(att: Partial<TeamMon>, def: Partial<TeamMon>, mv: string, opt: DamageOptions = {}): DamageRoll {
  const m = moveData(mv);
  if (!m) throw new Error('Unknown move: ' + mv);
  if (m[1] === 'Status') throw new Error(mv + ' is a status move.');
  const aa = effectiveSet(att, { attackerTera: opt.attackerTera, teraType: opt.attackerTeraType });
  const dd = effectiveSet(def, { defenderTera: opt.defenderTera, teraType: opt.defenderTeraType });
  const sa = stats(aa, opt.attOver || {});
  const sd = stats(dd, opt.defOver || {});
  const cat = m[1];
  let A = cat === 'Physical' ? sa.atk : sa.spa;
  let D = cat === 'Physical' ? sd.def : sd.spd;
  if (m[5] === 'def') A = sa.def;
  if (m[5] === 'targetDef') D = sd.def;
  const ai = opt.attOver?.item || aa.item;
  const di = opt.defOver?.item || dd.item;
  if (cat === 'Physical' && ai === 'Choice Band') A *= 1.5;
  if (cat === 'Special' && ai === 'Choice Specs') A *= 1.5;
  if (cat === 'Special' && di === 'Assault Vest') D *= 1.5;
  let bp = m[2];
  if (toId(mv) === 'weatherball' && (opt.field === 'sun' || opt.field === 'rain')) bp = 100;
  const base = Math.floor(Math.floor(Math.floor(((2 * (aa.level || 100)) / 5 + 2) * bp * (A / D)) / 50) + 2);
  let moveType = m[0];
  if (toId(mv) === 'weatherball' && opt.field === 'sun') moveType = 'Fire';
  if (toId(mv) === 'weatherball' && opt.field === 'rain') moveType = 'Water';
  const atkTypes = opt.attackerTera ? [opt.attackerTeraType || aa.tera || monTypes(aa)[0]] : monTypes(aa);
  const defTypes = opt.defenderTera ? [opt.defenderTeraType || dd.tera || monTypes(dd)[0]] : monTypes(dd);
  // Base dmg used the type/category table only; the move-immunity patch re-checks family
  // blockers (and Mold Breaker/Mycelium Might bypasses) after the roll — keep that split.
  const blockedBy = moveBlockingAbilityByType(moveType, cat, dd.ability || '');
  const eff = blockedBy ? 0 : mult(moveType, defTypes);
  const stab = atkTypes.includes(moveType) ? 1.5 : 1;
  let mod = eff * stab;
  if (ai === 'Life Orb') mod *= 1.3;
  if (ai === 'Expert Belt' && eff > 1) mod *= 1.2;
  if (ai === 'Black Glasses' && moveType === 'Dark') mod *= 1.2;
  if (ai === 'Charcoal' && moveType === 'Fire') mod *= 1.2;
  if (aa.ability === 'Solar Power' && opt.field === 'sun' && cat === 'Special') mod *= 1.5;
  if (opt.field === 'rain' && moveType === 'Water') mod *= 1.5;
  if (opt.field === 'rain' && moveType === 'Fire') mod *= 0.5;
  if (opt.field === 'sun' && moveType === 'Fire') mod *= 1.5;
  if (opt.field === 'sun' && moveType === 'Water') mod *= 0.5;
  if (opt.field === 'reflect' && cat === 'Physical') mod *= 0.5;
  if (opt.field === 'screen' && cat === 'Special') mod *= 0.5;
  let rolls: number[];
  if (blockedBy) rolls = new Array(16).fill(0);
  else {
    rolls = [];
    for (let r = 85; r <= 100; r++) rolls.push(Math.max(1, Math.floor((base * mod * r) / 100)));
  }
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
  const roll: DamageRoll = {
    att: aa,
    def: dd,
    mv,
    move: m,
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
    moveType,
    blockedBy,
  };
  // move-immunity patched layer: re-check with the move-aware blocker and honor
  // Mold Breaker/Mycelium Might bypasses. (Base roll above already zeroed
  // absorb-type immunities; this only adds the family-specific blocks.)
  const blocker = moveSpecificImmunityAbility(roll.def?.ability || '', mv);
  if (!blocker || attackerBypassesMoveImmunity(roll.att?.ability || '', mv)) return roll;
  return { ...roll, blockedBy: blocker, eff: 0, rolls: new Array(16).fill(0), min: 0, maxd: 0, minp: 0, maxp: 0, ko: 0, two: 0, three: 0 };
}

// ---------------------------------------------------------------------------
// Set factory + detective candidate pool
// ---------------------------------------------------------------------------

export function preset(sp: string, item: string, nature: string, evs: Stats, moves: string[]): TeamMon {
  return { species: sp, item, nature, evs, ivs: parseEV('', 31), moves, level: 100, ability: '', tera: '' } as TeamMon;
}

export function detectiveAbilities(sp: string): string[] {
  const vals = unique(Object.values(getSpecies(sp)?.abilities || {}).filter(Boolean)) as string[];
  return vals.length ? vals : ['Unknown'];
}

export interface DetectiveSpeedContext {
  relation: 'fasterThan' | 'slowerThan' | string;
  opponentSpecies?: string;
  turn?: number;
}

/** Structured input for buildDetectiveRead (ported fields from the replay parser + detective UI). */
export interface DetectiveInput {
  species: string;
  move?: string;
  observedDamage?: number | null;
  evidence?: string; // 'they_hit_me' | 'i_hit_them' | 'clue_only'
  clueLabel?: string;
  targetSpecies?: string;
  userSpecies?: string;
  usedStatusMove?: boolean;
  tookHazardDamage?: boolean;
  historicalHazardDamage?: boolean;
  repeatedDamagingMove?: boolean;
  revealedAbility?: string;
  abilityHints?: string[];
  ruledOutAbilities?: string[];
  abilityContradictionNotes?: string[];
  movedFirst?: boolean;
  movedSecond?: boolean;
  speedContext?: DetectiveSpeedContext | null;
  choiceContradiction?: boolean;
  removedItem?: string;
  itemGone?: boolean;
  itemLossLabel?: string;
  itemLossNote?: string;
  historicalItemNotes?: string[];
  postItemLossProtectionRecovered?: boolean;
  postItemLossProtectionItems?: string[];
  postItemLossProtectionAbilities?: string[];
  postItemLossNotes?: string[];
  postItemLossGroundProtectionRecovered?: boolean;
  postItemLossGroundProtectionItems?: string[];
  postItemLossGroundProtectionAbilities?: string[];
  postItemLossGroundNotes?: string[];
  revealedItem?: string;
  acquiredItem?: string;
  currentTransferredItem?: string;
  itemTransferSource?: string;
  itemTransferMove?: string;
  clearedHistoricalChoiceLock?: boolean;
  user?: Partial<TeamMon>;
  team?: Partial<TeamMon>[];
  label?: string;
  [key: string]: unknown;
}

export interface DetectiveCandidate {
  species: string;
  profile: string;
  nature: string;
  evs: Stats;
  item: string;
  ability: string;
  prob: number;
  reasons: string[];
  eliminated?: boolean;
  fitQuality?: string;
  itemScore?: number;
}

export interface DetectiveSummary {
  confidence: { label: string; reason: string };
  verdict: string;
  notes: string[];
}

export interface DetectiveRead {
  input: DetectiveInput;
  summary: DetectiveSummary;
  top: DetectiveCandidate[];
  eliminated: DetectiveCandidate[];
  itemRows: [string, number][];
  abilityRows: [string, number][];
  natureRows: [string, number][];
  profileRows: [string, number][];
}

export function candidates(sp: string, observedAbility = '', options: { allowItemless?: boolean; forceItems?: string[] } = {}): DetectiveCandidate[] {
  const prof: [string, string, Stats, string[]][] = [
    ['physical offense', 'Adamant', { hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 }, ['Choice Band', 'Life Orb', 'Heavy-Duty Boots', 'Black Glasses']],
    ['speed physical', 'Jolly', { hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 }, ['Choice Scarf', 'Life Orb', 'Heavy-Duty Boots']],
    ['special offense', 'Modest', { hp: 0, atk: 0, def: 4, spa: 252, spd: 0, spe: 252 }, ['Choice Specs', 'Life Orb', 'Heavy-Duty Boots', 'Expert Belt']],
    ['speed special', 'Timid', { hp: 0, atk: 0, def: 4, spa: 252, spd: 0, spe: 252 }, ['Choice Scarf', 'Choice Specs', 'Heavy-Duty Boots']],
    ['physical wall', 'Impish', { hp: 252, atk: 4, def: 252, spa: 0, spd: 0, spe: 0 }, ['Leftovers', 'Rocky Helmet', 'Heavy-Duty Boots']],
    ['special wall', 'Calm', { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 }, ['Leftovers', 'Assault Vest', 'Heavy-Duty Boots']],
  ];
  const out: DetectiveCandidate[] = [];
  let abilities = detectiveAbilities(sp);
  const forcedItems = unique((options.forceItems || []).filter(Boolean));
  if (observedAbility && !abilities.includes(observedAbility)) {
    abilities = abilities[0] === 'Unknown' ? [observedAbility] : unique([...abilities, observedAbility]);
  }
  prof.forEach((p) => {
    const items = unique([...(options.allowItemless ? [...p[3], 'No Item'] : p[3]), ...forcedItems]);
    items.forEach((item) =>
      abilities.forEach((ability) =>
        out.push({ species: sp, profile: p[0], nature: p[1], evs: p[2], item, ability, prob: 1, reasons: [] }),
      ),
    );
  });
  normC(out);
  return out;
}

function normC(c: { prob: number }[]): void {
  const s = c.reduce((a, b) => a + Math.max(0, b.prob), 0) || 1;
  c.forEach((x) => { x.prob = Math.max(0, x.prob) / s; });
}

function defaultMoves(sp: string, c: { profile: string }): string[] {
  const pool: Record<string, string[]> = {
    Dragapult: c.profile.includes('special')
      ? ['Shadow Ball', 'Draco Meteor', 'Flamethrower', 'U-turn']
      : ['Dragon Darts', 'U-turn', 'Sucker Punch', 'Tera Blast'],
    Kingambit: ['Kowtow Cleave', 'Sucker Punch', 'Iron Head', 'Swords Dance'],
    'Great Tusk': ['Close Combat', 'Headlong Rush', 'Rapid Spin', 'Knock Off'],
    'Iron Valiant': ['Moonblast', 'Close Combat', 'Thunderbolt', 'Calm Mind'],
    Gholdengo: ['Make It Rain', 'Shadow Ball', 'Focus Blast', 'Recover'],
    Corviknight: ['Roost', 'Defog', 'U-turn', 'Body Press'],
    Dragonite: ['Dragon Dance', 'Extreme Speed', 'Earthquake', 'Fire Punch'],
  };
  return pool[sp] || ['Earthquake', 'Ice Beam', 'Moonblast', 'Thunderbolt'];
}

export function candSet(c: DetectiveCandidate): TeamMon {
  return { ...preset(c.species, c.item, c.nature, c.evs, defaultMoves(c.species, c)), ability: c.ability || '' } as TeamMon;
}

export function joinWithOr(list: string[] = []): string {
  const values = unique((list || []).map((x) => String(x || '').trim()));
  if (!values.length) return '';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} or ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, or ${values[values.length - 1]}`;
}

export function detectiveEvidenceNotes(input: DetectiveInput): { notes: string[]; hardBlocks: string[] } {
  const notes: string[] = [];
  const hardBlocks: string[] = [];
  if (input.usedStatusMove) { notes.push('Used a status move, so Assault Vest lines are dead.'); hardBlocks.push('Assault Vest impossible'); }
  if (input.tookHazardDamage) { notes.push('Took hazard chip, so Heavy-Duty Boots is ruled out.'); hardBlocks.push('Heavy-Duty Boots impossible'); }
  else if (input.historicalHazardDamage) notes.push('Earlier hazard chip only ruled out Boots before the old item left, so the current state can still reopen that protection line.');
  if (input.choiceContradiction) { notes.push('Changed damaging moves without switching, so Choice item lines are dead.'); hardBlocks.push('Choice items impossible'); }
  if (input.revealedItem) { notes.push(`${input.revealedItem} is already revealed, so non-${input.revealedItem} lines are dead.`); hardBlocks.push(`${input.revealedItem} confirmed`); }
  if (input.revealedAbility) { notes.push(`${input.revealedAbility} is already revealed, so non-${input.revealedAbility} lines are dead.`); hardBlocks.push(`${input.revealedAbility} confirmed`); }
  else if ((input.abilityHints || []).length > 1) notes.push(`Replay points toward ${input.abilityHints!.join(' or ')}, but the exact ability is still not fully locked.`);
  if ((input.ruledOutAbilities || []).length) {
    notes.push(`Replay also kills ${joinWithOr(input.ruledOutAbilities!)} as live ability lines.`);
    input.ruledOutAbilities!.forEach((ability) => hardBlocks.push(`${ability} impossible`));
  }
  (input.abilityContradictionNotes || []).forEach((note) => notes.push(note));
  const abilityReward = ({
    'Water Absorb': 'That also means Water attacks heal instead of damaging.',
    'Volt Absorb': 'That also means Electric attacks heal instead of damaging.',
    'Dry Skin': 'That also means Water attacks heal instead of damaging.',
    'Storm Drain': 'That also means Water attacks are dead lines and the reveal implies a Special Attack boost.',
    'Lightning Rod': 'That also means Electric attacks are dead lines and the reveal implies a Special Attack boost.',
    'Motor Drive': 'That also means Electric attacks are dead lines and the reveal implies a Speed boost.',
    'Sap Sipper': 'That also means Grass attacks are dead lines and the reveal implies an Attack boost.',
    'Earth Eater': 'That also means Ground attacks heal instead of damaging.',
    'Well-Baked Body': 'That also means Fire attacks are dead lines and the reveal implies a Defense boost.',
    'Flash Fire': 'That also means Fire attacks are dead lines and the reveal implies boosted Fire damage later.',
    'Good as Gold': 'That also means opposing status moves stay dead lines unless the log says otherwise.',
    Protosynthesis: 'That also means sun or Booster Energy can turn on a Paradox stat boost.',
    'Quark Drive': 'That also means Electric Terrain or Booster Energy can turn on a Paradox stat boost.',
    // replay-status-control-upgrades
    'Own Tempo': 'That also means confusion-based control stays dead lines.',
    Oblivious: 'That also means Taunt and infatuation control stay dead lines.',
    'Aroma Veil': 'That also means Taunt and lockout control stay dead lines.',
    // move-immunity-upgrades
    Soundproof: 'That also means sound-based moves are dead lines.',
    Bulletproof: 'That also means ball and bomb moves are dead lines.',
    'Wind Rider': 'That also means wind moves are dead lines and can trigger an Attack boost.',
    Overcoat: 'That also means powder moves and weather chip are dead lines.',
  } as Record<string, string>)[input.revealedAbility || ''];
  if (abilityReward) notes.push(abilityReward);
  if (input.itemGone && input.removedItem) {
    if (input.revealedItem && input.revealedItem === input.removedItem) {
      notes.push(`${input.removedItem} left earlier, but replay later showed that same item is back in the current state.`);
    } else {
      hardBlocks.push(`${input.removedItem} no longer current item`);
      notes.push(input.itemLossNote || `${input.removedItem} was removed, so the old item is dead and the slot may now be empty.`);
    }
  }
  (input.historicalItemNotes || []).forEach((note) => notes.push(note));
  if (input.postItemLossProtectionRecovered) {
    notes.push('Later entry behavior shows the post-loss state regained protection, so an empty slot is no longer the only live current-item story.');
  }
  const protectionOptions = unique([...(input.postItemLossProtectionItems || []), ...(input.postItemLossProtectionAbilities || [])]);
  if (protectionOptions.length) notes.push(`Later entry protection keeps ${joinWithOr(protectionOptions)} live for the current state.`);
  (input.postItemLossNotes || []).forEach((note) => notes.push(note));
  if (input.postItemLossGroundProtectionRecovered) {
    notes.push('Later Ground immunity shows the post-loss state regained protection, so an empty slot is no longer the only live current-item story.');
  }
  const groundProtectionOptions = unique([...(input.postItemLossGroundProtectionItems || []), ...(input.postItemLossGroundProtectionAbilities || [])]);
  if (groundProtectionOptions.length) notes.push(`Later Ground immunity keeps ${joinWithOr(groundProtectionOptions)} live for the current state.`);
  (input.postItemLossGroundNotes || []).forEach((note) => notes.push(note));
  if (input.repeatedDamagingMove) notes.push('Repeated damage leans toward Choice locking, but does not prove it.');
  if (input.speedContext?.relation === 'fasterThan' && input.speedContext?.opponentSpecies) notes.push(`Moved before ${input.speedContext.opponentSpecies} in a neutral-priority exchange, so clearly slower lines are weak fits.`);
  else if (input.speedContext?.relation === 'slowerThan' && input.speedContext?.opponentSpecies) notes.push(`Moved after ${input.speedContext.opponentSpecies} in a neutral-priority exchange, so clearly faster lines are weak fits.`);
  else if (input.movedFirst) notes.push('Moving first boosts fast natures and Scarf lines, but only as a soft speed clue.');
  return { notes, hardBlocks };
}

export interface SpeedFit {
  mult: number;
  tag: string;
  quality: 'fit' | 'near' | 'miss';
}

export function detectiveSpeedFit(candidate: DetectiveCandidate, input: DetectiveInput): SpeedFit | null {
  const relation = input.speedContext?.relation || '';
  const opponentSpecies = input.speedContext?.opponentSpecies || input.user?.species || 'the opposing Pokemon';
  if (!relation || !input.user) return null;
  const candidateSpeed = stats(candSet(candidate)).spe;
  const opponentSpeed = stats(input.user).spe;
  if (!candidateSpeed || !opponentSpeed) return null;
  if (relation === 'fasterThan') {
    if (candidateSpeed < opponentSpeed) return { mult: 0.01, tag: `speed clue clashes with moving before ${opponentSpecies} (${candidateSpeed} < ${opponentSpeed})`, quality: 'miss' };
    if (candidateSpeed === opponentSpeed) return { mult: 1.05, tag: `speed clue remains possible with ${opponentSpecies} (${candidateSpeed})`, quality: 'near' };
    return { mult: 1.28, tag: `speed clue fits moving before ${opponentSpecies} (${candidateSpeed} > ${opponentSpeed})`, quality: 'fit' };
  }
  if (relation === 'slowerThan') {
    if (candidateSpeed > opponentSpeed) return { mult: 0.01, tag: `speed clue clashes with moving after ${opponentSpecies} (${candidateSpeed} > ${opponentSpeed})`, quality: 'miss' };
    if (candidateSpeed === opponentSpeed) return { mult: 1.05, tag: `speed tie remains possible with ${opponentSpecies} (${candidateSpeed})`, quality: 'near' };
    return { mult: 1.28, tag: `speed clue fits moving after ${opponentSpecies} (${candidateSpeed} < ${opponentSpeed})`, quality: 'fit' };
  }
  return null;
}

export interface DamageFit {
  mult: number;
  tag: string;
  quality: 'fit' | 'near' | 'miss';
}

export function scoreDetectiveDamageFit(obs: number, roll: DamageRoll): DamageFit {
  const center = (roll.minp + roll.maxp) / 2;
  const slack = 3;
  const dist = Math.abs(obs - center);
  const width = Math.max(4, (roll.maxp - roll.minp) / 2 + slack);
  if (obs >= roll.minp - slack && obs <= roll.maxp + slack) return { mult: Math.max(0.55, 2.2 - dist / Math.max(6, width)), tag: `fits ${roll.mv} (${roll.minp.toFixed(1)}-${roll.maxp.toFixed(1)}%)`, quality: 'fit' };
  if (dist <= width + 6) return { mult: 0.35, tag: `close but awkward ${roll.mv} fit (${roll.minp.toFixed(1)}-${roll.maxp.toFixed(1)}%)`, quality: 'near' };
  return { mult: 0.04, tag: `bad ${roll.mv} fit (${roll.minp.toFixed(1)}-${roll.maxp.toFixed(1)}%)`, quality: 'miss' };
}

export function detectiveConfidence(top: DetectiveCandidate[]): { label: string; reason: string } {
  const lead = top[0]?.prob || 0;
  const gap = lead - (top[1]?.prob || 0);
  if (lead >= 0.58 && gap >= 0.2) return { label: 'High', reason: 'one line clearly survives the evidence better than the rest' };
  if (lead >= 0.36 && gap >= 0.1) return { label: 'Medium', reason: 'the best line is ahead, but there is still plausible competition' };
  return { label: 'Low', reason: 'multiple lines still fit, so this read should guide play rather than lock it in' };
}

export function detectiveSummary(top: DetectiveCandidate[], input: DetectiveInput, notes: { notes: string[]; hardBlocks: string[] }): DetectiveSummary {
  const conf = detectiveConfidence(top);
  const lead = top[0];
  const itemLead = lead ? `${lead.item} ${lead.nature} ${lead.profile}` : 'no clean line';
  const isClueOnly = input.evidence === 'clue_only' || input.observedDamage == null || !input.move;
  if (!top.length) {
    return {
      confidence: { label: 'Blocked', reason: 'the replay contradicted every modeled line, so the candidate pool needs a wider explanation' },
      verdict: 'Replay contradictions killed every modeled line in the current pool.',
      notes: [...notes.hardBlocks, ...notes.notes],
    };
  }
  const verdict = isClueOnly
    ? conf.label === 'High'
      ? `Best current read: ${itemLead}. The replay clues point strongly in one direction even without a damage roll.`
      : conf.label === 'Medium'
        ? `Best current read: ${itemLead}. The replay clues narrow the field, but there is still meaningful competition.`
        : `The replay clues are useful but still incomplete. ${lead ? `${lead.item} ${lead.nature} ${lead.profile} is only the front-runner.` : 'Need more evidence.'}`
    : conf.label === 'High'
      ? `Best current read: ${itemLead}. The evidence is pointing in one direction.`
      : conf.label === 'Medium'
        ? `Best current read: ${itemLead}. There is a lead, but it is not airtight.`
        : `The read is still wide open. ${lead ? `${lead.item} ${lead.nature} ${lead.profile} is only the front-runner.` : 'Need more evidence.'}`;
  return { confidence: conf, verdict, notes: [...notes.hardBlocks, ...notes.notes] };
}

function aggregateDetective(top: DetectiveCandidate[], key: 'item' | 'ability' | 'nature' | 'profile'): [string, number][] {
  const acc = top.reduce<Record<string, number>>((o, c) => {
    const k = String(c[key] ?? '');
    o[k] = (o[k] || 0) + c.prob;
    return o;
  }, {});
  return Object.entries(acc).sort((a, b) => b[1] - a[1]);
}

// ---------------------------------------------------------------------------
// buildDetectiveRead — base implementation + merged wrapper layers
// ---------------------------------------------------------------------------

function baseBuildDetectiveRead(rawInput: DetectiveInput): DetectiveRead {
  let input = rawInput;
  if (input.move && moveCategory(input.move) === 'Status') {
    input = { ...input, observedDamage: null, clueLabel: input.clueLabel || `${input.move} is a status/healing move, not damage-roll evidence` };
  }
  const forcedItems = unique([input.revealedItem, ...(input.postItemLossProtectionItems || []), ...(input.postItemLossGroundProtectionItems || [])].filter(Boolean)) as string[];
  const cs = candidates(input.species, input.revealedAbility, { allowItemless: !!input.itemGone, forceItems: forcedItems }).map((c) => ({ ...c, reasons: [] as string[], eliminated: false, fitQuality: 'unknown' }));
  const notes = detectiveEvidenceNotes(input);
  cs.forEach((c) => {
    if (input.usedStatusMove && c.item === 'Assault Vest') { c.prob = 0; c.eliminated = true; c.reasons.push('hard rule-out: used a status move'); }
    if (input.tookHazardDamage && c.item === 'Heavy-Duty Boots') { c.prob = 0; c.eliminated = true; c.reasons.push('hard rule-out: took hazard damage'); }
    if (input.choiceContradiction && ['Choice Band', 'Choice Specs', 'Choice Scarf'].includes(c.item) && (!input.revealedItem || c.item !== input.revealedItem)) { c.prob = 0; c.eliminated = true; c.reasons.push('hard rule-out: changed damaging moves without switching'); }
    if (input.itemGone && input.removedItem && c.item === input.removedItem && (!input.revealedItem || c.item !== input.revealedItem)) { c.prob = 0; c.eliminated = true; c.reasons.push(`hard rule-out: ${input.removedItem} is already gone`); }
    if (input.itemGone && c.item === 'No Item') { c.prob *= 1.7; c.reasons.push('hard anchor: replay proved the old item left the slot'); }
    if (input.postItemLossProtectionRecovered && c.item === 'No Item') { c.prob *= 0.55; c.reasons.push('soft penalty: later entry protection means the slot may not still be empty'); }
    if ((input.postItemLossProtectionItems || []).includes(c.item)) { c.prob *= 1.6; c.reasons.push('soft boost: later entry protection fits this current item line'); }
    if ((input.postItemLossProtectionAbilities || []).includes(c.ability)) { c.prob *= 1.45; c.reasons.push('soft boost: later entry protection fits this ability line'); }
    if (input.postItemLossGroundProtectionRecovered && c.item === 'No Item') { c.prob *= 0.55; c.reasons.push('soft penalty: later Ground immunity means the slot may not still be empty'); }
    if ((input.postItemLossGroundProtectionItems || []).includes(c.item)) { c.prob *= 1.6; c.reasons.push('soft boost: later Ground immunity fits this current item line'); }
    if ((input.postItemLossGroundProtectionAbilities || []).includes(c.ability)) { c.prob *= 1.45; c.reasons.push('soft boost: later Ground immunity fits this ability line'); }
    if (input.revealedItem && c.item !== input.revealedItem) { c.prob = 0; c.eliminated = true; c.reasons.push(`hard rule-out: replay revealed ${input.revealedItem}`); }
    if (input.revealedItem && c.item === input.revealedItem) { c.prob *= 1.8; c.reasons.push(`hard anchor: revealed item is ${input.revealedItem}`); }
    if (input.revealedAbility && c.ability !== input.revealedAbility) { c.prob = 0; c.eliminated = true; c.reasons.push(`hard rule-out: replay revealed ${input.revealedAbility}`); }
    if (input.revealedAbility && c.ability === input.revealedAbility) { c.prob *= 1.8; c.reasons.push(`hard anchor: revealed ability is ${input.revealedAbility}`); }
    if ((input.ruledOutAbilities || []).includes(c.ability) && (!input.revealedAbility || c.ability !== input.revealedAbility)) { c.prob = 0; c.eliminated = true; c.reasons.push(`hard rule-out: replay contradicted ${c.ability}`); }
    if (input.repeatedDamagingMove && ['Choice Band', 'Choice Specs', 'Choice Scarf'].includes(c.item)) { c.prob *= 1.35; c.reasons.push('soft boost: repeated damage points toward a Choice item'); }
    if (input.movedFirst && (['Timid', 'Jolly'].includes(c.nature) || c.item === 'Choice Scarf')) { c.prob *= 1.22; c.reasons.push('soft boost: speed clue supports fast lines'); }
    const speedFit = detectiveSpeedFit(c, input);
    if (speedFit) { c.prob *= speedFit.mult; c.reasons.push(speedFit.tag); }
    if (input.move && input.observedDamage != null && moveCategory(input.move) !== 'Status') {
      try {
        const roll = input.evidence === 'they_hit_me' ? dmg(candSet(c), input.user!, input.move, { hpPct: 100 }) : dmg(input.user!, candSet(c), input.move, { hpPct: 100 });
        roll.mv = input.move;
        const fit = scoreDetectiveDamageFit(input.observedDamage, roll);
        c.prob *= fit.mult;
        c.fitQuality = fit.quality;
        c.reasons.push(fit.tag);
      } catch {
        c.reasons.push('damage math unavailable for this line');
      }
    } else if (input.clueLabel) {
      c.reasons.push(`replay clue: ${input.clueLabel}`);
    }
  });
  normC(cs);
  cs.sort((a, b) => b.prob - a.prob);
  const live = cs.filter((c) => c.prob > 0);
  const top = live.slice(0, 8);
  const eliminated = cs.filter((c) => c.eliminated);
  const summary = detectiveSummary(top, input, notes);
  return {
    input,
    summary,
    top,
    eliminated,
    itemRows: aggregateDetective(top, 'item'),
    abilityRows: aggregateDetective(top, 'ability'),
    natureRows: aggregateDetective(top, 'nature'),
    profileRows: aggregateDetective(top, 'profile'),
  };
}

// ----- choice-lock-timeline-upgrades -----

export const CHOICE_ITEMS = new Set(['Choice Band', 'Choice Specs', 'Choice Scarf']);

const itemName = (value: unknown): string => String(value || '').trim();
const isChoiceItem = (value: unknown): boolean => CHOICE_ITEMS.has(itemName(value));

export function clearsHistoricalChoiceLock(input: DetectiveInput = { species: '' }): boolean {
  if (!input?.choiceContradiction || !input?.itemGone) return false;
  const removed = itemName(input.removedItem);
  const revealed = itemName(input.revealedItem);
  return isChoiceItem(removed) || isChoiceItem(revealed);
}

function choiceTimelineNote(input: DetectiveInput = { species: '' }): string {
  const removed = itemName(input.removedItem) || itemName(input.revealedItem) || 'the old Choice item';
  return `The earlier move-change contradiction only kills ${removed} as the old item line. Once that Choice item left the slot, it no longer constrains the current item state by itself.`;
}

const uniqueNotes = (list: (string | undefined | null)[] = []): string[] => [...new Set(list.filter((n): n is string => !!n))];

// ----- item-transfer-timeline-upgrades -----

export const ITEM_TRANSFER_SOURCES = new Set([
  'move: Bestow', 'move: Covet', 'move: Recycle', 'move: Refurbish',
  'move: Switcheroo', 'move: Thief', 'move: Trick',
  'ability: Harvest', 'ability: Magician', 'ability: Pickup',
  'ability: Pickpocket', 'ability: Symbiosis',
]);

const SOURCE_LABEL_OVERRIDES: Record<string, string> = {
  'move: Bestow': 'Bestow', 'move: Covet': 'Covet', 'move: Recycle': 'Recycle',
  'move: Refurbish': 'Refurbish', 'move: Switcheroo': 'Switcheroo',
  'move: Thief': 'Thief', 'move: Trick': 'Trick',
  'ability: Harvest': 'Harvest', 'ability: Magician': 'Magician',
  'ability: Pickup': 'Pickup', 'ability: Pickpocket': 'Pickpocket',
  'ability: Symbiosis': 'Symbiosis',
};

export const sameItem = (a: unknown = '', b: unknown = ''): boolean => {
  const left = itemName(a);
  const right = itemName(b);
  return !!left && left === right;
};

const normalizeSourceTag = (value: unknown): string => String(value || '').trim().replace(/^\[from\]\s*/, '');

export function itemSourceTag(event: { from?: string; raw?: string } = {}): string {
  const rawParts = String(event?.raw || '').split('|').filter(Boolean);
  const rawFrom = rawParts.find((part) => part.startsWith('[from]')) || '';
  return normalizeSourceTag(event?.from || rawFrom);
}

export function trackedItemSource(event: { from?: string; raw?: string } = {}): string {
  const source = itemSourceTag(event);
  return ITEM_TRANSFER_SOURCES.has(source) ? source : '';
}

export function trackedSourceLabel(source = ''): string {
  return SOURCE_LABEL_OVERRIDES[source] || source.replace(/^(move|ability): /, '').trim();
}

export function transferredItemName(event: { item?: string; raw?: string } = {}): string {
  const rawParts = String(event?.raw || '').split('|').filter(Boolean);
  return itemName(event?.item || rawParts[2] || '');
}

export function transferredItemStillCurrent(input: DetectiveInput = { species: '' }): string {
  const gained = itemName(input?.acquiredItem || input?.currentTransferredItem || '');
  if (!gained) return '';
  if (input?.itemGone && sameItem(input?.removedItem, gained)) return '';
  return gained;
}

function transferredChoiceLockShouldClear(input: DetectiveInput = { species: '' }): boolean {
  const gained = transferredItemStillCurrent(input);
  if (!input?.choiceContradiction || !gained || isChoiceItem(gained)) return false;
  return isChoiceItem(input?.removedItem) || isChoiceItem(input?.revealedItem);
}

function transferTimelineNote(input: DetectiveInput = { species: '' }): string {
  const source = trackedSourceLabel(itemName(input?.itemTransferSource)) || itemName(input?.itemTransferMove) || 'a replay item event';
  const removed = itemName(input?.removedItem) || 'the old item';
  const gained = transferredItemStillCurrent(input) || itemName(input?.revealedItem) || 'the new item';
  if (itemName(input?.removedItem)) {
    return `${source} replaced ${removed} with ${gained} as the current item, so the detective now treats the received item as live instead of leaving the slot stuck on the old timeline.`;
  }
  return `${source} revealed ${gained} as the current item, so the detective now reopens the slot instead of leaving it anchored to the old empty-item timeline.`;
}

/** Clears the current transferred/current item anchors after a later non-transfer removal. */
export function clearTransferredCurrentItem(state: { acquiredItem?: string; currentTransferredItem?: string; revealedItem?: string }, removedItem = ''): void {
  const removed = itemName(removedItem);
  if (!removed) return;
  if (sameItem(state?.acquiredItem, removed)) state.acquiredItem = '';
  if (sameItem(state?.currentTransferredItem, removed)) state.currentTransferredItem = '';
  if (sameItem(state?.revealedItem, removed)) state.revealedItem = '';
}

// ----- revealed-item-anchor-upgrades -----

export function currentRevealedItem(input: DetectiveInput = { species: '' }): string {
  if (input?.itemGone) return '';
  return itemName(input?.currentTransferredItem || input?.acquiredItem || input?.revealedItem);
}

function cloneWithAnchoredItem(candidate: DetectiveCandidate, item: string): DetectiveCandidate {
  return { ...candidate, item, itemScore: Math.max(Number(candidate?.itemScore || 0), 100) };
}

function ensureAnchoredTop(read: DetectiveRead, item: string): boolean {
  if (!Array.isArray(read?.top) || !item) return false;
  const matching = read.top.filter((candidate) => itemName(candidate?.item) === item);
  if (matching.length === read.top.length && matching.length > 0) return false;
  const source = matching.length
    ? matching
    : read.top.length
      ? read.top.slice(0, Math.min(read.top.length, 3)).map((candidate) => cloneWithAnchoredItem(candidate, item))
      : [{ item, profile: 'replay-confirmed', prob: 1 } as DetectiveCandidate];
  read.top = source.map((candidate) => cloneWithAnchoredItem(candidate, item));
  return true;
}

function ensureAnchoredItemRows(read: DetectiveRead, item: string): boolean {
  if (!Array.isArray(read?.itemRows) || !item) return false;
  if (read.itemRows.length === 1 && itemName(read.itemRows[0]?.[0]) === item) return false;
  read.itemRows = [[item, 100]];
  return true;
}

function anchorNote(item = ''): string {
  return `${item} was replay-confirmed as the current item, so the detective now hard-anchors that item even when it falls outside the default candidate pool.`;
}

/**
 * Merged buildDetectiveRead: base → choice-lock timeline → item-transfer
 * timeline → revealed-item anchor (script order).
 */
export function buildDetectiveRead(rawInput: DetectiveInput): DetectiveRead {
  // Layer 3 (outermost, revealed-item-anchor): reads the ORIGINAL input.
  const anchoredItem = currentRevealedItem(rawInput);

  // Layer 2 (item-transfer): promotes a still-current transferred item.
  const gained = transferredItemStillCurrent(rawInput);
  const clearHistoricalChoice = transferredChoiceLockShouldClear(rawInput);
  const transferInput = gained
    ? {
        ...rawInput,
        revealedItem: gained,
        itemGone: false,
        ...(clearHistoricalChoice ? { choiceContradiction: false, clearedHistoricalChoiceLock: true } : {}),
      }
    : rawInput;

  // Layer 1 (choice-lock): clears a stale Choice contradiction when the item left.
  const clearHistoricalLock = clearsHistoricalChoiceLock(transferInput);
  const choiceInput = clearHistoricalLock
    ? { ...transferInput, choiceContradiction: false, clearedHistoricalChoiceLock: true }
    : transferInput;

  const read = baseBuildDetectiveRead(choiceInput);
  if (!read) return read;

  // Layer 1 post-pass
  if (clearHistoricalLock) {
    const note = choiceTimelineNote(transferInput);
    if (read.input) read.input.clearedHistoricalChoiceLock = true;
    if (read.summary) read.summary.notes = uniqueNotes([...(read.summary.notes || []), note]);
  }

  // Layer 2 post-pass
  if (gained) {
    if (read.input) {
      read.input.revealedItem = gained;
      read.input.itemGone = false;
      read.input.currentTransferredItem = gained;
      if (rawInput?.itemTransferSource) read.input.itemTransferSource = rawInput.itemTransferSource;
      if (clearHistoricalChoice) read.input.clearedHistoricalChoiceLock = true;
    }
    read.summary.notes = uniqueNotes([...(read.summary.notes || []), transferTimelineNote(rawInput)]);
  }

  // Layer 3 post-pass
  if (anchoredItem) {
    const itemRowsChanged = ensureAnchoredItemRows(read, anchoredItem);
    const topChanged = ensureAnchoredTop(read, anchoredItem);
    if ((itemRowsChanged || topChanged) && read.summary) {
      read.summary.notes = uniqueNotes([...(read.summary.notes || []), anchorNote(anchoredItem)]);
    }
    if (read.input) {
      read.input.revealedItem = anchoredItem;
      read.input.itemGone = false;
    }
  }
  return read;
}

// ---------------------------------------------------------------------------
// Detective handoff (legacy detect/loadReplayDetective, DOM-free)
// ---------------------------------------------------------------------------

export function detectiveReferenceUser(overrides: DetectiveInput = { species: '' }, team: Partial<TeamMon>[] = []): Partial<TeamMon> {
  if (overrides.user) return overrides.user;
  const wanted = [overrides.targetSpecies, overrides.speedContext?.opponentSpecies, overrides.userSpecies].filter(Boolean).map((x) => toId(x));
  if (team?.length && wanted.length) {
    const hit = team.find((mon) => wanted.includes(toId(mon.species)));
    if (hit) return hit;
  }
  return team[0] || preset('Great Tusk', 'Heavy-Duty Boots', 'Impish', { hp: 252, atk: 4, def: 252, spa: 0, spd: 0, spe: 0 }, ['Close Combat', 'Headlong Rush', 'Rapid Spin', 'Knock Off']);
}

/**
 * Pure port of legacy detect(): resolves the reference attacker/defender from
 * the supplied team, then scores the candidate pool.
 */
export function detect(overrides: DetectiveInput): DetectiveRead | null {
  const input: DetectiveInput = { ...overrides };
  const sp = input.species;
  if (!sp) return null;
  input.evidence = input.evidence || 'they_hit_me';
  input.move = input.move || '';
  input.observedDamage = input.observedDamage ?? 43;
  input.user = detectiveReferenceUser(input, input.team);
  const read = buildDetectiveRead(input);
  return read;
}

export function uniqueDetectiveInputs(inputs: DetectiveInput[] = []): DetectiveInput[] {
  const seen = new Set<string>();
  return inputs.filter((input) => {
    const key = [input.label || '', input.species || '', input.move || '', input.evidence || '', input.observedDamage ?? '', input.clueLabel || ''].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface ReplayHandoffOptions {
  targetIndex?: number;
  branchIndex?: number;
  team?: Partial<TeamMon>[];
}

/**
 * Pure port of loadReplayDetective(targetIndex, branchIndex): resolves a replay
 * target's detective input against the supplied team and returns the read.
 * Returns null when no usable input exists (the legacy early return).
 */
export function loadReplayDetective(read: ReplayRead | null | undefined, opts: ReplayHandoffOptions = {}): DetectiveRead | null {
  const targets = read?.targets || [];
  let targetIndex = opts.targetIndex ?? 0;
  let branchIndex = opts.branchIndex;
  if (branchIndex == null) {
    const strongestBranches = read?.strongest?.detectiveInputs || [];
    if (targetIndex > 0 && strongestBranches[targetIndex]) {
      branchIndex = targetIndex;
      targetIndex = 0;
    } else {
      branchIndex = 0;
    }
  }
  const target = targets[targetIndex] || read?.strongest;
  const inputs = uniqueDetectiveInputs(target?.detectiveInputs || []);
  const input = inputs[branchIndex] || target?.detectiveInput;
  if (!target || !input) return null;
  return detect({ ...input, choiceContradiction: input.choiceContradiction, revealedItem: input.revealedItem, team: opts.team });
}
