// Ported vitest coverage for the KO engine:
//   - dmg/KO sections of legacy test-smoke.js (battle state, tera, weather, terrain, crit, chip)
//   - test-ko-spread-move-upgrades.js (spread-hit penalty)
//   - test-ko-defensive-ability-upgrades.js (defender ability damage adjustments)
//   - test-priority-blocking-upgrades.js + test-priority-support-targeting-upgrades.js
//     (Armor Tail / Dazzling / Queenly Majesty + Psychic Terrain priority denial)
// The legacy vm/fake-DOM harnesses are dropped; the pipeline seams they stubbed
// (applySpreadDamagePenalty / applyDefensiveAbilityAdjustments / applyPriorityBlocking)
// are exercised directly with the same synthetic rolls, and end-to-end dmg calls
// run against real dex data. ReplayParser prototype patches are replaced by the
// pure helpers they delegated to (priorityBlockedAbilities, clue labels,
// detectPriorityBlockReveal, PriorityTerrainTracker).
import { describe, expect, it } from 'vitest';
import type { Stats } from '../src/engine/types';
import { parseEV } from '../src/engine/dex';
import { getSpecies } from '../src/engine/dex';
import {
  applyDefensiveAbilityAdjustments,
  applyPriorityBlocking,
  applySpreadDamagePenalty,
  attackerBypassesPriorityBlocker,
  battleStateSummary,
  canBePriorityBlockedWithProof,
  clampStage,
  detectPriorityBlockReveal,
  dmg,
  getAgentFacts,
  isBlockablePriorityMove,
  isDirectPriorityAttack,
  isPriorityBlockingAbility,
  moveBlockingAbility,
  movePriorityValue,
  nHitChance,
  normalizeAbilityLabel,
  normalizeBattleState,
  normalizedTerrain,
  priorityBlockedAbilities,
  priorityBlockingAbility,
  priorityBlockerClueLabel,
  priorityBlockerClueLabelWithProof,
  priorityBlockerRewardText,
  PriorityTerrainTracker,
  spreadDamageApplies,
  stageMultiplier,
  swapBattleState,
  type KoMon,
  type KoRoll,
} from '../src/engine/ko';

const preset = (sp: string, item: string, nature: string, evs: Stats, moves: string[], ability = ''): KoMon => ({
  species: sp,
  item,
  nature,
  evs,
  ivs: parseEV('', 31),
  moves,
  level: 100,
  ability,
  tera: '',
});

// ---------------------------------------------------------------------------
// dmg + battle state (test-smoke.js KO sections)
// ---------------------------------------------------------------------------

describe('dmg battle-state math (port of test-smoke.js KO blocks)', () => {
  const evOffense: Stats = { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 };
  const evBulk: Stats = { hp: 252, atk: 0, def: 0, spa: 0, spd: 252, spe: 4 };
  const mt = preset('Mewtwo', 'Life Orb', 'Timid', evOffense, ['Aura Sphere', 'Shadow Ball']);
  const bl = preset('Blastoise', 'Leftovers', 'Calm', evBulk, ['Surf']);
  const ko = dmg(mt, bl, 'Aura Sphere', { hpPct: 50 });

  it('returns a 16-roll result with a finite KO chance for real dex data', () => {
    expect(ko.rolls.length).toBe(16);
    expect(Number.isFinite(ko.ko)).toBe(true);
  });

  it('2HKO chance never drops below OHKO chance', () => {
    expect(nHitChance(ko, 2)).toBeGreaterThanOrEqual(ko.ko);
  });

  it('attacker Tera boosts matching-type STAB damage', () => {
    const teraAtt = preset('Dragapult', 'Life Orb', 'Timid', evOffense, ['Flamethrower']);
    const teraDef = preset('Corviknight', 'Leftovers', 'Impish', { hp: 248, atk: 0, def: 252, spa: 0, spd: 8, spe: 0 }, ['Roost']);
    const noTeraFire = dmg(teraAtt, teraDef, 'Flamethrower', { hpPct: 100 });
    const yesTeraFire = dmg(teraAtt, teraDef, 'Flamethrower', {
      hpPct: 100,
      attackerTera: true,
      attackerTeraType: 'Fire',
    });
    expect(yesTeraFire.maxd).toBeGreaterThan(noTeraFire.maxd * 1.2);
  });

  it('respects type-immunity abilities like Flash Fire', () => {
    const teraAtt = preset('Dragapult', 'Life Orb', 'Timid', evOffense, ['Flamethrower']);
    const flashFireDef = preset('Heatran', 'Leftovers', 'Calm', { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 }, ['Flamethrower'], 'Flash Fire');
    const flashFireRoll = dmg(teraAtt, flashFireDef, 'Flamethrower', { hpPct: 100 });
    expect(flashFireRoll.maxd).toBe(0);
    expect(flashFireRoll.blockedBy).toBe('Flash Fire');
  });

  it('stacks weather and screens instead of overwriting either one', () => {
    const neutralSurf = dmg(bl, mt, 'Surf', { hpPct: 100 });
    const rainSurf = dmg(bl, mt, 'Surf', { hpPct: 100, weather: 'rain' });
    const screenSurf = dmg(bl, mt, 'Surf', { hpPct: 100, defenderProtect: 'screen' });
    const stackedSurf = dmg(bl, mt, 'Surf', { hpPct: 100, weather: 'rain', defenderProtect: 'screen' });
    const swappedScreenSurf = dmg(bl, mt, 'Surf', {
      hpPct: 100,
      ...swapBattleState(normalizeBattleState({ weather: 'rain', defenderProtect: 'screen' })),
    });
    expect(stackedSurf.maxd).toBeLessThan(rainSurf.maxd);
    expect(stackedSurf.maxd).toBeGreaterThan(screenSurf.maxd);
    expect(swappedScreenSurf.maxd).toBe(rainSurf.maxd); // reverse view drops the defender screen
    expect(neutralSurf.maxd).toBeGreaterThan(0);
  });

  it('applies stage multipliers, Helping Hand, and end-step chip windows', () => {
    const boosted = dmg(mt, bl, 'Aura Sphere', { hpPct: 100, attackerOffenseStage: 2 });
    const bulked = dmg(mt, bl, 'Aura Sphere', { hpPct: 100, defenderBulkStage: 2 });
    const helpingHand = dmg(mt, bl, 'Aura Sphere', { hpPct: 100, helpingHand: true });
    const helpingHandTwoHit = dmg(mt, bl, 'Aura Sphere', { hpPct: 90, helpingHand: true });
    const chipWindow = dmg(mt, bl, 'Aura Sphere', {
      hpPct: 90,
      helpingHand: true,
      defenderEndStepDamagePct: 12.5,
      extraEndSteps: 1,
    });
    expect(boosted.maxd).toBeGreaterThan(ko.maxd);
    expect(bulked.maxd).toBeLessThan(ko.maxd);
    expect(helpingHand.maxd).toBeGreaterThan(ko.maxd * 1.45);
    expect(nHitChance(chipWindow, 2)).toBeGreaterThan(nHitChance(helpingHandTwoHit, 2));
  });

  it('drops one-sided support and chip context in reverse-KO math', () => {
    const neutralSurf = dmg(bl, mt, 'Surf', { hpPct: 100 });
    const reverseHelpingHand = dmg(bl, mt, 'Surf', {
      hpPct: 100,
      ...swapBattleState(normalizeBattleState({ helpingHand: true, defenderEndStepDamagePct: 12.5, extraEndSteps: 1 })),
    });
    expect(reverseHelpingHand.maxd).toBe(neutralSurf.maxd);
  });

  it('applies terrain boosts and reductions', () => {
    const electricTbolt = dmg(mt, bl, 'Thunderbolt', { hpPct: 100, terrain: 'electric' });
    const neutralTbolt = dmg(mt, bl, 'Thunderbolt', { hpPct: 100 });
    const tusk = preset('Great Tusk', 'Leftovers', 'Adamant', { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 }, ['Earthquake']);
    const grassyEq = dmg(tusk, bl, 'Earthquake', { hpPct: 100, terrain: 'grassy' });
    const neutralEq = dmg(tusk, bl, 'Earthquake', { hpPct: 100 });
    const burnedEq = dmg(tusk, bl, 'Earthquake', { hpPct: 100, attackerStatus: 'burn' });
    expect(electricTbolt.maxd).toBeGreaterThan(neutralTbolt.maxd * 1.25);
    expect(grassyEq.maxd).toBeLessThan(neutralEq.maxd * 0.6);
    expect(burnedEq.maxd).toBeLessThan(neutralEq.maxd * 0.6);
  });

  it('critical hits punch through positive defender bulk stages', () => {
    const crit = dmg(mt, bl, 'Aura Sphere', { hpPct: 100, criticalHit: true, defenderBulkStage: 4 });
    const boostedBulk = dmg(mt, bl, 'Aura Sphere', { hpPct: 100, defenderBulkStage: 4 });
    expect(crit.maxd).toBeGreaterThan(boostedBulk.maxd * 1.45);
  });
});

describe('battle state model', () => {
  it('clamps stat stages to [-6, 6] and computes multipliers', () => {
    expect(clampStage(9)).toBe(6);
    expect(clampStage(-9)).toBe(-6);
    expect(clampStage('nonsense')).toBe(0);
    expect(clampStage(2.7)).toBe(2);
    expect(stageMultiplier(0)).toBe(1);
    expect(stageMultiplier(2)).toBe(2);
    expect(stageMultiplier(-2)).toBe(0.5);
    expect(stageMultiplier(6)).toBe(4);
  });

  it('maps the legacy combined field select onto weather/protect', () => {
    expect(normalizeBattleState({ field: 'rain' }).weather).toBe('rain');
    expect(normalizeBattleState({ field: 'sun' }).weather).toBe('sun');
    expect(normalizeBattleState({ field: 'screen' }).defenderProtect).toBe('screen');
    expect(normalizeBattleState({ field: 'reflect' }).defenderProtect).toBe('reflect');
    expect(normalizeBattleState({ field: 'auroraveil' }).defenderProtect).toBe('auroraveil');
    expect(normalizeBattleState({ field: 'screen', attackerProtect: 'reflect' }).attackerProtect).toBe('reflect');
    // explicit weather beats the legacy field value
    expect(normalizeBattleState({ field: 'rain', weather: 'sun' }).weather).toBe('sun');
  });

  it('summarizes the active battle state like the KO panel did', () => {
    const state = normalizeBattleState({
      weather: 'rain',
      terrain: 'electric',
      helpingHand: true,
      defenderProtect: 'screen',
      attackerOffenseStage: 2,
      defenderBulkStage: 1,
      attackerStatus: 'burn',
      criticalHit: true,
      extraEndSteps: 1,
      defenderEndStepDamagePct: 12.5,
    });
    const text = battleStateSummary(state);
    for (const part of [
      'Rain',
      'Electric Terrain',
      'Helping Hand',
      'defender Light Screen',
      'attacker +2 offense',
      'defender +1 bulk',
      'attacker Burned',
      'critical hit',
      '1 extra end step',
      'defender loses 12.5% each end step',
    ]) {
      expect(text).toContain(part);
    }
    expect(battleStateSummary({})).toBe('Neutral');
  });

  it('swaps attacker/defender context for the reverse-KO view', () => {
    const swapped = swapBattleState(
      normalizeBattleState({
        weather: 'rain',
        attackerProtect: 'reflect',
        defenderProtect: 'screen',
        attackerOffenseStage: 2,
        attackerBulkStage: 1,
        defenderOffenseStage: -3,
        defenderBulkStage: 4,
        attackerStatus: 'burn',
        criticalHit: true,
        extraEndSteps: 2,
        defenderEndStepDamagePct: 25,
      }),
    );
    expect(swapped.weather).toBe('rain');
    expect(swapped.attackerProtect).toBe('screen');
    expect(swapped.defenderProtect).toBe('reflect');
    expect(swapped.attackerOffenseStage).toBe(-3);
    expect(swapped.attackerBulkStage).toBe(4);
    expect(swapped.defenderOffenseStage).toBe(2);
    expect(swapped.defenderBulkStage).toBe(1);
    expect(swapped.helpingHand).toBe(false);
    expect(swapped.attackerStatus).toBe('none');
    expect(swapped.criticalHit).toBe(false);
    expect(swapped.extraEndSteps).toBe(0);
    expect(swapped.defenderEndStepDamagePct).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Spread moves (test-ko-spread-move-upgrades.js)
// ---------------------------------------------------------------------------

const makeSpreadRoll = (mv: string, spread: number, spreadDamage: boolean): KoRoll => ({
  att: { species: 'Gholdengo' },
  def: { species: 'Landorus-Therian' },
  mv,
  move: [mv === 'Shadow Ball' ? 'Ghost' : 'Steel', 'Special', 0, 100, 0],
  moveType: mv === 'Shadow Ball' ? 'Ghost' : 'Steel',
  rolls: new Array(16).fill(spread),
  max: 200,
  ehp: 100,
  hz: 0,
  hit: 1,
  ko: spread >= 100 ? 1 : 0,
  two: 1,
  three: 1,
  min: spread,
  maxd: spread,
  minp: spread / 2,
  maxp: spread / 2,
  eff: 1,
  blockedBy: '',
  battleState: normalizeBattleState({ spreadDamage }),
  defensiveAbilityMultiplier: 1,
  defensiveAbilityNotes: [],
});

describe('spread damage penalty (port of test-ko-spread-move-upgrades.js)', () => {
  it('keeps the spread flag in normalized battle state and surfaces it in the summary', () => {
    const spreadState = normalizeBattleState({ spreadDamage: true });
    expect(spreadState.spreadDamage).toBe(true);
    expect(battleStateSummary(spreadState)).toContain('Spread hit penalty');
    expect(battleStateSummary({ spreadDamage: true })).toBe('Spread hit penalty');
  });

  it('scales spread moves by 0.75 and recomputes KO odds', () => {
    const roll = applySpreadDamagePenalty(makeSpreadRoll('Make It Rain', 120, true), 'Make It Rain');
    expect(roll.spreadAdjusted).toBe(true);
    expect(roll.spreadModifier).toBe(0.75);
    expect(roll.maxd).toBe(90);
    expect(roll.ko).toBe(0);
    expect(roll.two).toBe(1);
  });

  it('leaves single-target attacks untouched', () => {
    const roll = applySpreadDamagePenalty(makeSpreadRoll('Shadow Ball', 80, true), 'Shadow Ball');
    expect(roll.spreadAdjusted).toBeUndefined();
    expect(roll.maxd).toBe(80);
  });

  it('stays off unless the spread hit is modeled', () => {
    const roll = applySpreadDamagePenalty(makeSpreadRoll('Heat Wave', 95, false), 'Heat Wave');
    expect(roll.spreadAdjusted).toBeUndefined();
    expect(roll.maxd).toBe(95);
  });

  it('does not inherit one-sided spread context in the reverse view', () => {
    const reverseState = swapBattleState({ spreadDamage: true, helpingHand: true });
    expect(reverseState.spreadDamage).toBe(false);
  });

  it('loads the spread toggle through the battle-state reader path', () => {
    expect(normalizeBattleState({ spreadDamage: true }).spreadDamage).toBe(true);
  });

  it('detects multi-target moves from dex target metadata and the known-move table', () => {
    expect(spreadDamageApplies('Make It Rain')).toBe(true);
    expect(spreadDamageApplies('Heat Wave')).toBe(true);
    expect(spreadDamageApplies('Earthquake')).toBe(true);
    expect(spreadDamageApplies('Shadow Ball')).toBe(false);
    expect(spreadDamageApplies('Aura Sphere')).toBe(false);
    expect(spreadDamageApplies('')).toBe(false);
  });

  it('applies the penalty end-to-end through dmg()', () => {
    const att = preset('Gholdengo', 'Choice Specs', 'Timid', { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 }, ['Make It Rain', 'Shadow Ball']);
    const def = preset('Landorus-Therian', 'Leftovers', 'Impish', { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 }, ['Earthquake'], 'Intimidate');
    const full = dmg(att, def, 'Make It Rain', { hpPct: 100 });
    const spread = dmg(att, def, 'Make It Rain', { hpPct: 100, spreadDamage: true });
    expect(spread.spreadAdjusted).toBe(true);
    expect(spread.maxd).toBe(Math.max(1, Math.floor(full.maxd * 0.75)));
    const single = dmg(att, def, 'Shadow Ball', { hpPct: 100, spreadDamage: true });
    expect(single.spreadAdjusted).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Defensive abilities (test-ko-defensive-ability-upgrades.js)
// ---------------------------------------------------------------------------

function makeAbilityRoll(overrides: Partial<KoRoll> = {}): KoRoll {
  const rolls = Array.from({ length: 16 }, () => 100);
  return {
    att: { ability: '' },
    def: { ability: '' },
    mv: 'Dragon Pulse',
    move: ['Dragon', 'Special', 85, 100, 0],
    moveType: 'Dragon',
    rolls,
    ehp: 400,
    max: 400,
    hz: 0,
    hit: 1,
    ko: 0,
    two: 0,
    three: 0,
    min: 100,
    maxd: 100,
    minp: 25,
    maxp: 25,
    eff: 1,
    blockedBy: '',
    battleState: normalizeBattleState({}),
    defensiveAbilityMultiplier: 1,
    defensiveAbilityNotes: [],
    ...overrides,
  };
}

describe('defensive ability adjustments (port of test-ko-defensive-ability-upgrades.js)', () => {
  it('Multiscale halves damage only inside the full-HP window', () => {
    const full = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ def: { ability: 'Multiscale' } }),
      'Dragon Pulse',
    );
    expect(full.maxd).toBe(50);
    expect(full.defensiveAbilityNotes.some((note) => /Multiscale/.test(note))).toBe(true);

    const chipped = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ def: { ability: 'Multiscale' }, hz: 12.5, ehp: 350 }),
      'Dragon Pulse',
    );
    expect(chipped.maxd).toBe(100);
  });

  it('Filter/Solid Rock/Prism Armor soften super-effective hits only', () => {
    const filtered = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ def: { ability: 'Filter' }, eff: 2, moveType: 'Fighting', move: ['Fighting', 'Special', 80, 100, 0] }),
      'Aura Sphere',
    );
    expect(filtered.maxd).toBe(75);
    expect(filtered.defensiveAbilityMultiplier).toBe(0.75);
    expect(Number.isFinite(filtered.two)).toBe(true);
    expect(Number.isFinite(filtered.three)).toBe(true);

    const neutral = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ def: { ability: 'Solid Rock' }, eff: 1, moveType: 'Water', move: ['Water', 'Special', 90, 100, 0] }),
      'Surf',
    );
    expect(neutral.maxd).toBe(100);
  });

  it('Thick Fat halves Fire and Ice damage only', () => {
    const fire = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ def: { ability: 'Thick Fat' }, moveType: 'Fire', move: ['Fire', 'Special', 90, 100, 0] }),
      'Flamethrower',
    );
    expect(fire.maxd).toBe(50);
    expect(fire.defensiveAbilityNotes.some((note) => /Thick Fat/.test(note))).toBe(true);
    const electric = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ def: { ability: 'Thick Fat' }, moveType: 'Electric', move: ['Electric', 'Special', 90, 100, 0] }),
      'Thunderbolt',
    );
    expect(electric.maxd).toBe(100);
  });

  it('Heatproof, Water Bubble, Purifying Salt halve their covered types', () => {
    const heatproof = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ def: { ability: 'Heatproof' }, moveType: 'Fire', move: ['Fire', 'Special', 90, 100, 0] }),
      'Flamethrower',
    );
    expect(heatproof.maxd).toBe(50);
    expect(heatproof.defensiveAbilityNotes.some((note) => /Heatproof/.test(note))).toBe(true);

    const bubble = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ def: { ability: 'Water Bubble' }, moveType: 'Fire', move: ['Fire', 'Special', 90, 100, 0] }),
      'Flamethrower',
    );
    expect(bubble.maxd).toBe(50);
    expect(bubble.defensiveAbilityNotes.some((note) => /Water Bubble/.test(note))).toBe(true);

    const salt = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ def: { ability: 'Purifying Salt' }, moveType: 'Ghost', move: ['Ghost', 'Special', 80, 100, 0] }),
      'Shadow Ball',
    );
    expect(salt.maxd).toBe(50);
    expect(salt.defensiveAbilityNotes.some((note) => /Purifying Salt/.test(note))).toBe(true);

    const saltNeutral = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ def: { ability: 'Purifying Salt' }, moveType: 'Water', move: ['Water', 'Special', 90, 100, 0] }),
      'Surf',
    );
    expect(saltNeutral.maxd).toBe(100);
  });

  it('Dry Skin amplifies Fire damage', () => {
    const drySkin = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ def: { ability: 'Dry Skin' }, moveType: 'Fire', move: ['Fire', 'Special', 90, 100, 0] }),
      'Flamethrower',
    );
    expect(drySkin.maxd).toBe(125);
    expect(drySkin.defensiveAbilityNotes.some((note) => /Dry Skin/.test(note))).toBe(true);
  });

  it('Punk Rock halves sound moves only', () => {
    const sound = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ def: { ability: 'Punk Rock' }, moveType: 'Normal', move: ['Normal', 'Special', 90, 100, 0] }),
      'Hyper Voice',
    );
    expect(sound.maxd).toBe(50);
    expect(sound.defensiveAbilityNotes.some((note) => /Punk Rock/.test(note))).toBe(true);
    const quiet = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ def: { ability: 'Punk Rock' }, moveType: 'Fairy', move: ['Fairy', 'Special', 95, 100, 0] }),
      'Moonblast',
    );
    expect(quiet.maxd).toBe(100);
  });

  it('Fur Coat and Ice Scales guard their own damage category', () => {
    const furPhysical = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ def: { ability: 'Fur Coat' }, moveType: 'Normal', move: ['Normal', 'Physical', 80, 100, 0] }),
      'Extreme Speed',
    );
    expect(furPhysical.maxd).toBe(50);
    expect(furPhysical.defensiveAbilityNotes.some((note) => /Fur Coat/.test(note))).toBe(true);
    const furSpecial = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ def: { ability: 'Fur Coat' }, moveType: 'Ghost', move: ['Ghost', 'Special', 80, 100, 0] }),
      'Shadow Ball',
    );
    expect(furSpecial.maxd).toBe(100);

    const iceSpecial = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ def: { ability: 'Ice Scales' }, moveType: 'Ghost', move: ['Ghost', 'Special', 80, 100, 0] }),
      'Shadow Ball',
    );
    expect(iceSpecial.maxd).toBe(50);
    expect(iceSpecial.defensiveAbilityNotes.some((note) => /Ice Scales/.test(note))).toBe(true);
    const icePhysical = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ def: { ability: 'Ice Scales' }, moveType: 'Normal', move: ['Normal', 'Physical', 80, 100, 0] }),
      'Extreme Speed',
    );
    expect(icePhysical.maxd).toBe(100);
  });

  it('Mold Breaker/Teravolt/Turboblaze bypass defender abilities; Mycelium Might does not on attacks', () => {
    const moldBreaker = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ att: { ability: 'Mold Breaker' }, def: { ability: 'Multiscale' } }),
      'Dragon Pulse',
    );
    expect(moldBreaker.maxd).toBe(100);
    expect(moldBreaker.defensiveAbilityNotes.length).toBe(0);

    const teravolt = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ att: { ability: 'Teravolt' }, def: { ability: 'Filter' }, eff: 2, moveType: 'Fighting', move: ['Fighting', 'Special', 80, 100, 0] }),
      'Aura Sphere',
    );
    expect(teravolt.maxd).toBe(100);
    expect(teravolt.defensiveAbilityMultiplier).toBe(1);

    const turboblaze = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ att: { ability: 'Turboblaze' }, def: { ability: 'Fur Coat' }, moveType: 'Normal', move: ['Normal', 'Physical', 80, 100, 0] }),
      'Extreme Speed',
    );
    expect(turboblaze.maxd).toBe(100);

    const mycelium = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ att: { ability: 'Mycelium Might' }, def: { ability: 'Heatproof' }, moveType: 'Fire', move: ['Fire', 'Special', 90, 100, 0] }),
      'Flamethrower',
    );
    expect(mycelium.maxd).toBe(50);
  });

  it('Shadow Shield annotates the roll the way renderKo surfaced it', () => {
    // legacy asserted the appended "Defender ability context" HTML block; the React
    // port reads defensiveAbilityNotes off the roll instead — same behavior, no DOM.
    const roll = applyDefensiveAbilityAdjustments(
      makeAbilityRoll({ def: { ability: 'Shadow Shield' } }),
      'Dragon Pulse',
    );
    expect(roll.defensiveAbilityNotes.some((note) => /Shadow Shield/.test(note))).toBe(true);
    expect(roll.maxd).toBe(50);
  });

  it('applies through dmg() end-to-end', () => {
    const att = preset('Mewtwo', 'Life Orb', 'Timid', { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 }, ['Dragon Pulse']);
    const def = preset('Dragonite', 'Leftovers', 'Calm', { hp: 252, atk: 0, def: 0, spa: 0, spd: 252, spe: 4 }, ['Roost'], 'Multiscale');
    const full = dmg(att, def, 'Dragon Pulse', { hpPct: 100 });
    expect(full.defensiveAbilityMultiplier).toBe(0.5);
    const chipped = dmg(att, def, 'Dragon Pulse', { hpPct: 50 });
    expect(chipped.defensiveAbilityMultiplier).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Priority blocking (test-priority-blocking-upgrades.js + support-targeting)
// ---------------------------------------------------------------------------

const makePriorityRoll = (att: KoMon, def: KoMon, mv: string, opt: { terrain?: string } = {}): KoRoll => ({
  att,
  def,
  mv,
  move: ['Normal', 'Physical', 80, 100, 0],
  moveType: 'Normal',
  rolls: new Array(16).fill(50),
  max: 400,
  ehp: 400,
  hz: 0,
  hit: 1,
  ko: 1,
  two: 1,
  three: 1,
  min: 50,
  maxd: 50,
  minp: 12.5,
  maxp: 12.5,
  eff: 1,
  blockedBy: '',
  battleState: normalizeBattleState({ terrain: opt.terrain || 'none' }),
  defensiveAbilityMultiplier: 1,
  defensiveAbilityNotes: [],
});

// Mirrors the patched ReplayParser.moveBlockedAbilities gating: a bypassed or
// suppressed move never rules out a priority blocker.
const blockedAbilities = (species: string, move: string, opts: { terrain?: string; bypassAbility?: string } = {}): string[] => {
  if (opts.bypassAbility) return [];
  return priorityBlockedAbilities(species, move, { terrain: opts.terrain });
};

describe('priority blocking through dmg (port of test-priority-blocking-upgrades.js)', () => {
  const farigiraf = { species: 'Farigiraf', ability: 'Armor Tail' } as KoMon;
  const tsareena = { species: 'Tsareena', ability: 'Queenly Majesty' } as KoMon;
  const groundedDef = { species: 'Farigiraf', ability: 'Cud Chew' } as KoMon; // Normal/Psychic — grounded
  const airborneDef = { species: 'Landorus-Therian', ability: 'Intimidate' } as KoMon; // Ground/Flying — airborne

  it('Armor Tail / Queenly Majesty blank direct priority attacks', () => {
    const blocked = applyPriorityBlocking(makePriorityRoll({ species: 'Dragonite' }, farigiraf, 'Extreme Speed'), 'Extreme Speed');
    expect(blocked.blockedBy).toBe('Armor Tail');
    expect(blocked.maxd).toBe(0);

    const aquaJet = applyPriorityBlocking(makePriorityRoll({ species: 'Palafin' }, tsareena, 'Aqua Jet'), 'Aqua Jet');
    expect(aquaJet.blockedBy).toBe('Queenly Majesty');
    expect(aquaJet.maxd).toBe(0);
  });

  it('Mold Breaker and Teravolt bypass priority blockers', () => {
    const moldBreaker = applyPriorityBlocking(
      makePriorityRoll({ species: 'Haxorus', ability: 'Mold Breaker' }, farigiraf, 'Extreme Speed'),
      'Extreme Speed',
    );
    expect(moldBreaker.blockedBy).toBeFalsy();
    expect(moldBreaker.maxd).toBeGreaterThan(0);

    const teravolt = applyPriorityBlocking(
      makePriorityRoll({ species: 'Zekrom', ability: 'Teravolt' }, tsareena, 'Aqua Jet'),
      'Aqua Jet',
    );
    expect(teravolt.blockedBy).toBeFalsy();
    expect(teravolt.maxd).toBeGreaterThan(0);
  });

  it('Grassy Glide only counts as priority under Grassy Terrain', () => {
    const live = applyPriorityBlocking(makePriorityRoll({ species: 'Rillaboom' }, farigiraf, 'Grassy Glide'), 'Grassy Glide');
    expect(live.blockedBy).toBeFalsy();
    expect(live.maxd).toBeGreaterThan(0);

    const blocked = applyPriorityBlocking(
      makePriorityRoll({ species: 'Rillaboom' }, farigiraf, 'Grassy Glide', { terrain: 'grassy' }),
      'Grassy Glide',
    );
    expect(blocked.blockedBy).toBe('Armor Tail');
    expect(blocked.maxd).toBe(0);

    const bypass = applyPriorityBlocking(
      makePriorityRoll({ species: 'Rillaboom', ability: 'Mold Breaker' }, farigiraf, 'Grassy Glide', { terrain: 'grassy' }),
      'Grassy Glide',
    );
    expect(bypass.blockedBy).toBeFalsy();
    expect(bypass.maxd).toBeGreaterThan(0);
  });

  it('non-priority and self-targeting support priority stay live', () => {
    const psychic = applyPriorityBlocking(makePriorityRoll({ species: 'Zapdos' }, { species: 'Gyarados', ability: 'Intimidate' }, 'Psychic'), 'Psychic');
    expect(psychic.blockedBy).toBeFalsy();
    expect(psychic.maxd).toBeGreaterThan(0);

    expect(isBlockablePriorityMove('Protect')).toBe(false);
    expect(isDirectPriorityAttack('Protect')).toBe(false);
    const protect = applyPriorityBlocking(makePriorityRoll({ species: 'Farigiraf' }, farigiraf, 'Protect'), 'Protect');
    expect(protect.blockedBy).toBeFalsy();
    expect(protect.maxd).toBeGreaterThan(0);
  });

  it('Psychic Terrain blanks grounded priority attacks only', () => {
    const terrainBlocked = applyPriorityBlocking(
      makePriorityRoll({ species: 'Dragonite' }, groundedDef, 'Extreme Speed', { terrain: 'psychic' }),
      'Extreme Speed',
    );
    expect(terrainBlocked.blockedBy).toBe('Psychic Terrain');
    expect(terrainBlocked.maxd).toBe(0);

    const airborne = applyPriorityBlocking(
      makePriorityRoll({ species: 'Dragonite' }, airborneDef, 'Extreme Speed', { terrain: 'psychic' }),
      'Extreme Speed',
    );
    expect(airborne.blockedBy).toBeFalsy();
    expect(airborne.maxd).toBeGreaterThan(0);
  });

  it('works end-to-end through dmg()', () => {
    const dragonite = preset('Dragonite', 'Life Orb', 'Jolly', { hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 }, ['Extreme Speed']);
    const defender = preset('Farigiraf', 'Leftovers', 'Bold', { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 }, ['Psychic'], 'Armor Tail');
    const roll = dmg(dragonite, defender, 'Extreme Speed', { hpPct: 100 });
    expect(roll.blockedBy).toBe('Armor Tail');
    expect(roll.maxd).toBe(0);
    expect(roll.ko).toBe(0);

    const terrainRoll = dmg(
      dragonite,
      preset('Farigiraf', 'Leftovers', 'Bold', { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 }, ['Psychic'], 'Cud Chew'),
      'Extreme Speed',
      { hpPct: 100, terrain: 'psychic' },
    );
    expect(terrainRoll.blockedBy).toBe('Psychic Terrain');
    expect(terrainRoll.maxd).toBe(0);
  });
});

describe('priority blocking helpers and replay integration', () => {
  it('knows the blocker pool per species via dex abilities', () => {
    expect(blockedAbilities('Farigiraf', 'Extreme Speed')).toContain('Armor Tail');
    expect(blockedAbilities('Bruxish', 'Aqua Jet')).toContain('Dazzling');
    expect(blockedAbilities('Tsareena', 'Mach Punch')).toContain('Queenly Majesty');
    expect(blockedAbilities('Gyarados', 'Extreme Speed')).not.toContain('Armor Tail');
  });

  it('keeps blockers live when the attacker bypasses abilities', () => {
    expect(blockedAbilities('Farigiraf', 'Extreme Speed', { bypassAbility: 'Mold Breaker' })).not.toContain('Armor Tail');
    // Mycelium Might only bypasses for status moves — a damaging priority move still rules the blocker out.
    expect(blockedAbilities('Farigiraf', 'Extreme Speed', { bypassAbility: 'Mycelium Might' })).not.toContain('Armor Tail');
  });

  it('blocks foe-targeting priority status moves but not ally/self priority', () => {
    // Legacy used Quash via faked replay hints; the real dex gives Quash priority 0,
    // so Powder (priority +1, targets a foe) stands in for the same behavior.
    expect(blockedAbilities('Farigiraf', 'Powder')).toContain('Armor Tail');
    expect(blockedAbilities('Farigiraf', 'Psychic')).not.toContain('Armor Tail');
    expect(blockedAbilities('Farigiraf', 'Helping Hand')).not.toContain('Armor Tail');
    expect(blockedAbilities('Farigiraf', 'Protect')).not.toContain('Armor Tail');
    expect(blockedAbilities('Farigiraf', 'After You')).not.toContain('Armor Tail');
    expect(blockedAbilities('Farigiraf', 'Obstruct')).not.toContain('Armor Tail');
  });

  it('is terrain-aware for Grassy Glide', () => {
    expect(blockedAbilities('Farigiraf', 'Grassy Glide')).not.toContain('Armor Tail');
    expect(blockedAbilities('Farigiraf', 'Grassy Glide', { terrain: 'grassy' })).toContain('Armor Tail');
    // bypass-protected notes still know what was ignored
    expect(priorityBlockedAbilities('Farigiraf', 'Grassy Glide', { terrain: 'grassy' })).toContain('Armor Tail');
  });

  it('tracks replay terrain like the patched ReplayParser did', () => {
    const tracker = new PriorityTerrainTracker();
    tracker.record('move: Grassy Terrain');
    expect(tracker.current()).toBe('grassy');
    expect(blockedAbilities('Farigiraf', 'Grassy Glide', { terrain: tracker.current() })).toContain('Armor Tail');
    tracker.clear('move: Trick Room'); // non-terrain fieldend must not clear it
    expect(tracker.current()).toBe('grassy');
    expect(blockedAbilities('Farigiraf', 'Grassy Glide', { terrain: tracker.current() })).toContain('Armor Tail');
    tracker.clear('move: Grassy Terrain');
    expect(tracker.current()).toBe('');
    expect(blockedAbilities('Farigiraf', 'Grassy Glide', { terrain: tracker.current() })).not.toContain('Armor Tail');
  });

  it('normalizes terrain and ability labels from replay text', () => {
    expect(normalizedTerrain('move: Grassy Terrain')).toBe('grassy');
    expect(normalizedTerrain('Psychic Terrain')).toBe('psychic');
    expect(normalizedTerrain('none')).toBe('');
    expect(normalizeAbilityLabel('ability: Armor Tail')).toBe('Armor Tail');
    expect(normalizeAbilityLabel('move: Protect')).toBe('Protect');
  });

  it('produces the same move-specific clue labels', () => {
    expect(priorityBlockerClueLabel('Dazzling', 'Aqua Jet')).toBe('Dazzling blocked Aqua Jet');
    expect(priorityBlockerClueLabelWithProof('Queenly Majesty', 'Extreme Speed', null, true)).toBe('Queenly Majesty blocked Extreme Speed');
    expect(priorityBlockerClueLabelWithProof('Armor Tail', 'Grassy Glide', { terrain: '' }, true)).toBe('Armor Tail blocked Grassy Glide');
    expect(priorityBlockerClueLabelWithProof('Armor Tail', 'Psychic', null, true)).toBe('Armor Tail revealed');
    expect(priorityBlockingAbility('Armor Tail', 'Extreme Speed')).toBe('Armor Tail');
    expect(priorityBlockingAbility('Armor Tail', 'Grassy Glide')).toBe('');
    expect(priorityBlockingAbility('Armor Tail', 'Grassy Glide', { terrain: 'grassy' })).toBe('Armor Tail');
    expect(canBePriorityBlockedWithProof('Grassy Glide')).toBe(true);
    expect(canBePriorityBlockedWithProof('Psychic')).toBe(false);
    expect(isPriorityBlockingAbility('Armor Tail')).toBe(true);
    expect(isPriorityBlockingAbility('Intimidate')).toBe(false);
    expect(attackerBypassesPriorityBlocker('Mycelium Might', 'Powder')).toBe(true);
    expect(attackerBypassesPriorityBlocker('Mycelium Might', 'Aqua Jet')).toBe(false);
  });

  it('names the tactical reward for priority blockers', () => {
    expect(priorityBlockerRewardText('Armor Tail')).toMatch(/priority/i);
    expect(priorityBlockerRewardText('Intimidate')).toBe('');
  });

  it('turns blocked-priority activate events into reveals like the parser patch did', () => {
    const reveal = detectPriorityBlockReveal(
      { type: '-activate', target: 'p2a: Farigiraf', effect: 'ability: Armor Tail' },
      [{ slot: 'p1a', species: 'Dragonite', move: 'Extreme Speed' }],
    );
    expect(reveal).not.toBeNull();
    expect(reveal?.ability).toBe('Armor Tail');
    expect(reveal?.moveEvent.move).toBe('Extreme Speed');
    expect(reveal?.label).toBe('Armor Tail blocked Extreme Speed');
    expect(reveal?.species).toBe('Farigiraf');

    const grassyReveal = detectPriorityBlockReveal(
      { type: '-activate', target: 'p2a: Farigiraf', effect: 'ability: Armor Tail' },
      [{ slot: 'p1a', species: 'Rillaboom', move: 'Grassy Glide' }],
      { terrain: 'grassy' },
    );
    expect(grassyReveal?.label).toBe('Armor Tail blocked Grassy Glide');

    // support / non-priority moves never fabricate a blocker reveal
    for (const move of ['After You', 'Obstruct', 'Helping Hand', 'Psychic']) {
      expect(
        detectPriorityBlockReveal(
          { type: '-activate', target: 'p2a: Farigiraf', effect: 'ability: Armor Tail' },
          [{ slot: 'p1a', species: 'Zapdos', move }],
        ),
      ).toBeNull();
    }
    // a non-blocker ability activation never fabricates one either
    expect(
      detectPriorityBlockReveal(
        { type: '-activate', target: 'p2a: Gyarados', effect: 'ability: Intimidate' },
        [{ slot: 'p1a', species: 'Dragonite', move: 'Extreme Speed' }],
      ),
    ).toBeNull();
  });

  it('exposes the merged moveBlockingAbility for move-aware immunity checks', () => {
    expect(moveBlockingAbility('Normal', 'Physical', 'Armor Tail', 'Extreme Speed')).toBe('Armor Tail');
    expect(moveBlockingAbility('Fire', 'Special', 'Flash Fire', 'Flamethrower')).toBe('Flash Fire');
    expect(moveBlockingAbility('Ground', 'Physical', 'Intimidate', 'Earthquake')).toBe('');
  });

  it('priority tables recognize the folded-in species data', () => {
    expect(getSpecies('Farigiraf')?.abilities?.[1]).toBe('Armor Tail');
    expect(getSpecies('Bruxish')?.abilities?.[0]).toBe('Dazzling');
    expect(getSpecies('Tsareena')?.abilities?.[1]).toBe('Queenly Majesty');
    expect(movePriorityValue('Extreme Speed')).toBe(2);
    expect(movePriorityValue('Grassy Glide')).toBe(0);
    expect(movePriorityValue('Grassy Glide', { terrain: 'grassy' })).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getAgentFacts (app.js + ko-upgrades.js actuary patch)
// ---------------------------------------------------------------------------

describe('getAgentFacts', () => {
  const evOffense: Stats = { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 };
  const evBulk: Stats = { hp: 252, atk: 0, def: 0, spa: 0, spd: 252, spe: 4 };
  const mt = preset('Mewtwo', 'Life Orb', 'Timid', evOffense, ['Aura Sphere', 'Shadow Ball']);
  const bl = preset('Blastoise', 'Leftovers', 'Calm', evBulk, ['Surf']);

  it('actuary facts include KO chance and a reverse-KO read', () => {
    const facts = getAgentFacts('actuary', {
      attacker: mt,
      defender: bl,
      move: 'Aura Sphere',
      hpPct: 50,
      hazards: 'none',
      weather: 'rain',
    });
    expect(facts.attacker).toBe('Mewtwo');
    expect(facts.defender).toBe('Blastoise');
    expect(facts.move).toBe('Aura Sphere');
    expect(Number(facts.koChance)).toBeGreaterThanOrEqual(0);
    expect(facts.reverseMove).toBe('Surf');
    expect(Number(facts.reverseKo)).toBeGreaterThanOrEqual(0);
  });

  it('actuary facts fall back to ? when the reverse calc fails', () => {
    const noMoves = preset('Unown', 'Leftovers', 'Hardy', { hp: 252, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, []);
    const facts = getAgentFacts('actuary', { attacker: mt, defender: noMoves, move: 'Aura Sphere', hpPct: 100 });
    // defender has no damaging move, so Earthquake is used — it resolves, so reverseKo is numeric.
    expect(facts.reverseMove).toBe('Earthquake');
  });

  it('threads analysis and reasoner facts through', () => {
    let ran = false;
    const facts = getAgentFacts('actuary', {
      analysis: { status: 'ok', rows: [{ tp: 'Fighting' }], typeCounts: { Fighting: 2 }, missing: ['Steel'], red: [] },
      reasoner: { identity: { primary: { name: 'Dragon Spam' } }, suggestions: [{ pokemon: 'Heatran' }] },
      runReasoner: () => {
        ran = true;
      },
    });
    expect(ran).toBe(true);
    expect(facts.status).toBe('ok');
    expect(facts.worstType).toBe('Fighting');
    expect(facts.identity).toBe('Dragon Spam');
    expect(facts.topSuggestion).toBe('Heatran');
  });

  it('detective facts prefer the live read, then the strongest replay target', () => {
    const detectiveFacts = getAgentFacts('detective', {
      detectiveRead: {
        input: { species: 'Dragapult' },
        top: [{ item: 'Choice Specs', nature: 'Timid', ability: 'Infiltrator', prob: 0.62 }],
        summary: { confidence: { label: 'High' }, verdict: 'specs read', notes: ['fast'] },
      },
    });
    expect(detectiveFacts.species).toBe('Dragapult');
    expect(detectiveFacts.topItem).toBe('Choice Specs');
    expect(detectiveFacts.topNature).toBe('Timid with Infiltrator');
    expect(detectiveFacts.confidence).toBe('High');

    const replayFacts = getAgentFacts('detective', {
      replayRead: {
        strongest: { species: 'Dragapult', revealedItem: 'Choice Specs', movedFirst: true, evidenceCount: 3, detectiveBranchCount: 2, notes: [] },
        targets: [{ species: 'Dragapult' }, { species: 'Great Tusk' }],
      },
    });
    expect(replayFacts.species).toBe('Dragapult');
    expect(replayFacts.topItem).toBe('Choice Specs');
    expect(replayFacts.topNature).toBe('fast line favored');
    expect(String(replayFacts.verdict)).toContain('3 structured clue(s) on Dragapult');
    expect(String(replayFacts.verdict)).toContain('2 detective-ready branches');
    expect(String(replayFacts.verdict)).toContain('1 other replay-backed target');
  });
});
