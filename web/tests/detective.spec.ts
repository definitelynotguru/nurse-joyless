import { describe, it, expect } from 'vitest';
import { buildDetectiveRead, dmg, preset, loadReplayDetective, detectiveAbilities } from '../src/engine/detective';
import type { ReplayRead, ReplayTarget } from '../src/engine/replay';
import type { TeamMon } from '../src/engine/types';

const USER: TeamMon = preset('Great Tusk', 'Heavy-Duty Boots', 'Impish', { hp: 252, atk: 4, def: 252, spa: 0, spd: 0, spe: 0 }, ['Close Combat', 'Headlong Rush', 'Rapid Spin', 'Knock Off']);
const TEAM: TeamMon[] = [
  USER,
  preset('Dragonite', 'Heavy-Duty Boots', 'Jolly', { hp: 0, atk: 252, def: 4, spa: 0, spd: 0, spe: 252 }, ['Dragon Dance', 'Extreme Speed', 'Earthquake', 'Fire Punch']),
];

// ---------------------------------------------------------------------------
// test-hidden-info-reasoning.js (buildDetectiveRead side)
// ---------------------------------------------------------------------------
describe('buildDetectiveRead hidden-info reasoning', () => {
  it('hard clues eliminate Assault Vest and Heavy-Duty Boots', () => {
    const read = buildDetectiveRead({
      species: 'Dragapult', evidence: 'they_hit_me', move: 'Shadow Ball', observedDamage: 43,
      usedStatusMove: true, tookHazardDamage: true, repeatedDamagingMove: false, movedFirst: false, user: USER,
    });
    expect(read.summary.notes.some((x) => /Assault Vest impossible/.test(x))).toBe(true);
    expect(read.summary.notes.some((x) => /Heavy-Duty Boots impossible/.test(x))).toBe(true);
    expect(read.eliminated.some((x) => x.item === 'Assault Vest')).toBe(true);
    expect(read.eliminated.some((x) => x.item === 'Heavy-Duty Boots')).toBe(true);
    expect(read.itemRows.some(([name]) => name === 'Assault Vest')).toBe(false);
    expect(read.itemRows.some(([name]) => name === 'Heavy-Duty Boots')).toBe(false);
  });

  it('soft clues alone do not produce overconfident reads', () => {
    const read = buildDetectiveRead({
      species: 'Dragapult', evidence: 'they_hit_me', move: 'Shadow Ball', observedDamage: 43,
      usedStatusMove: false, tookHazardDamage: false, repeatedDamagingMove: true, movedFirst: true, user: USER,
    });
    expect(read.summary.confidence.label).not.toBe('High');
    expect(read.summary.verdict.length).toBeGreaterThan(20);
  });

  it('revealed item anchors the live ranking and prunes incompatible Choice lines', () => {
    const read = buildDetectiveRead({
      species: 'Dragapult', evidence: 'they_hit_me', move: 'Shadow Ball', observedDamage: 43,
      usedStatusMove: false, tookHazardDamage: false, repeatedDamagingMove: false, movedFirst: false,
      choiceContradiction: true, revealedItem: 'Choice Specs', user: USER,
    });
    expect(read.itemRows[0][0]).toBe('Choice Specs');
    expect(read.itemRows.some(([name]) => /^Choice (Band|Scarf)$/.test(name))).toBe(false);
    expect(read.summary.notes.some((x) => /Choice items impossible/.test(x))).toBe(true);
    expect(read.summary.notes.some((x) => /Choice Specs confirmed/.test(x))).toBe(true);
  });

  it('revealed ability anchors the live ability ranking', () => {
    const read = buildDetectiveRead({
      species: 'Dragapult', evidence: 'they_hit_me', move: 'Shadow Ball', observedDamage: 43,
      usedStatusMove: false, tookHazardDamage: false, repeatedDamagingMove: false, movedFirst: false,
      revealedAbility: 'Infiltrator', user: USER,
    });
    expect(read.abilityRows[0][0]).toBe('Infiltrator');
    expect(read.summary.notes.some((x) => /Infiltrator confirmed/.test(x))).toBe(true);
    expect(read.top.every((x) => x.ability === 'Infiltrator')).toBe(true);
  });

  it('clue-only revealed ability anchors without damage evidence', () => {
    const read = buildDetectiveRead({
      species: 'Gholdengo', evidence: 'clue_only', move: 'Thunder Wave', observedDamage: null,
      clueLabel: 'Good as Gold blocked Thunder Wave',
      usedStatusMove: false, tookHazardDamage: false, repeatedDamagingMove: false, movedFirst: false,
      revealedAbility: 'Good as Gold', user: USER,
    });
    expect(read.abilityRows[0][0]).toBe('Good as Gold');
    expect(/replay clues/i.test(read.summary.verdict)).toBe(true);
    expect(read.top.every((x) => x.ability === 'Good as Gold')).toBe(true);
  });

  it('clue-only revealed item anchors without damage evidence', () => {
    const read = buildDetectiveRead({
      species: 'Dragapult', evidence: 'clue_only', move: '', observedDamage: null,
      clueLabel: 'Leftovers confirmed',
      usedStatusMove: false, tookHazardDamage: false, repeatedDamagingMove: false, movedFirst: false,
      revealedItem: 'Leftovers', user: USER,
    });
    expect(read.itemRows[0][0]).toBe('Leftovers');
    expect(/replay clues/i.test(read.summary.verdict)).toBe(true);
    expect(read.top.every((x) => x.item === 'Leftovers')).toBe(true);
  });

  it('revealed Air Balloon anchors the live item ranking', () => {
    const read = buildDetectiveRead({
      species: 'Gholdengo', evidence: 'clue_only', move: '', observedDamage: null,
      clueLabel: 'Air Balloon confirmed',
      usedStatusMove: false, tookHazardDamage: false, repeatedDamagingMove: false, movedFirst: false,
      revealedItem: 'Air Balloon', user: USER,
    });
    expect(read.itemRows[0][0]).toBe('Air Balloon');
    expect(read.top.every((x) => x.item === 'Air Balloon')).toBe(true);
  });

  it('revealed Water Absorb zeroes Water damage math', () => {
    const roll = dmg(
      preset('Primarina', 'Leftovers', 'Modest', { hp: 252, atk: 0, def: 0, spa: 252, spd: 4, spe: 0 }, ['Waterfall', 'Moonblast', 'Protect', 'Psychic Noise']),
      { ...preset('Clodsire', 'Leftovers', 'Careful', { hp: 252, atk: 4, def: 0, spa: 0, spd: 252, spe: 0 }, ['Recover', 'Earthquake', 'Toxic', 'Protect']), ability: 'Water Absorb' },
      'Waterfall',
      { hpPct: 100 },
    );
    expect(roll.blockedBy).toBe('Water Absorb');
    expect(roll.maxd).toBe(0);
  });

  it('revealed Earth Eater / Well-Baked Body zero their type damage', () => {
    const ground = dmg(
      preset('Great Tusk', 'Heavy-Duty Boots', 'Impish', { hp: 252, atk: 4, def: 252, spa: 0, spd: 0, spe: 0 }, ['Close Combat', 'Headlong Rush', 'Rapid Spin', 'Knock Off']),
      { species: 'Orthworm', ability: 'Earth Eater' },
      'Earthquake',
    );
    expect(ground.blockedBy).toBe('Earth Eater');
    expect(ground.maxd).toBe(0);
    const fire = dmg(
      preset('Volcarona', 'Leftovers', 'Timid', { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 }, ['Flamethrower', 'Bug Buzz']),
      { species: 'Dachsbun', ability: 'Well-Baked Body' },
      'Flamethrower',
    );
    expect(fire.blockedBy).toBe('Well-Baked Body');
    expect(fire.maxd).toBe(0);
  });

  it('neutral-priority speed clue pushes fast-enough lines forward', () => {
    const read = buildDetectiveRead({
      species: 'Gholdengo', evidence: 'they_hit_me', move: 'Make It Rain', observedDamage: 45,
      usedStatusMove: false, tookHazardDamage: false, repeatedDamagingMove: false, movedFirst: true,
      speedContext: { relation: 'fasterThan', opponentSpecies: 'Dragonite' },
      user: TEAM[1],
    });
    expect(read.top[0].profile).toBe('speed physical');
    expect(read.top[1].profile).toBe('speed physical');
    expect(read.top[2].prob).toBeLessThan(read.top[0].prob / 10);
  });
});

describe('loadReplayDetective handoff', () => {
  it('uses the actual replay target as the reference mon', () => {
    const read = loadReplayDetective({
      strongest: {
        detectiveInput: {
          species: 'Gholdengo', move: 'Make It Rain', observedDamage: 45,
          evidence: 'they_hit_me', targetSpecies: 'Dragonite', movedFirst: true,
          speedContext: { relation: 'fasterThan', opponentSpecies: 'Dragonite' },
        },
      } as ReplayTarget,
    } as ReplayRead, { team: TEAM });
    expect(read?.input.user?.species).toBe('Dragonite');
    expect(read?.top[0].profile).toBe('speed physical');
  });

  it('uses the attacking teammate for defender-side evidence', () => {
    const read = loadReplayDetective({
      strongest: {
        detectiveInput: {
          species: 'Gholdengo', move: 'Headlong Rush', observedDamage: 65,
          evidence: 'i_hit_them', userSpecies: 'Great Tusk', revealedItem: 'Leftovers',
        },
      } as ReplayTarget,
    } as ReplayRead, { team: TEAM });
    expect(read?.input.user?.species).toBe('Great Tusk');
    expect(read?.input.evidence).toBe('i_hit_them');
  });

  it('returns null when no usable input exists', () => {
    expect(loadReplayDetective({ targets: [], strongest: null } as unknown as ReplayRead, { team: TEAM })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// test-choice-lock-timeline-upgrades.js
// ---------------------------------------------------------------------------
describe('choice-lock timeline', () => {
  it('a removed Choice item clears the stale choice-lock contradiction', () => {
    const read = buildDetectiveRead({
      species: 'Dragapult', choiceContradiction: true, itemGone: true,
      removedItem: 'Choice Specs', postItemLossProtectionItems: ['Heavy-Duty Boots'],
    });
    expect(read.input.clearedHistoricalChoiceLock).toBeTruthy();
    // other current Choice lines stay live — not killed by stale history
    expect(read.eliminated.some((c) => c.item === 'Choice Scarf')).toBe(false);
    expect(read.summary.notes.some((n) => /only kills Choice Specs as the old item line/i.test(n))).toBe(true);
    expect(read.summary.notes.some((n) => /Choice items impossible/i.test(n))).toBe(false);
  });

  it('a live Choice lock stays active while the item is still on', () => {
    const read = buildDetectiveRead({
      species: 'Dragapult', choiceContradiction: true, itemGone: false, revealedItem: 'Choice Specs',
    });
    expect(read.input.clearedHistoricalChoiceLock).toBeFalsy();
    expect(read.eliminated.some((c) => c.item === 'Choice Scarf')).toBe(true);
    expect(read.itemRows.some(([name]) => name === 'Choice Scarf')).toBe(false);
    expect(read.summary.notes.some((n) => /Choice items impossible/i.test(n))).toBe(true);
  });

  it('non-Choice removals do not clear a live choice contradiction', () => {
    const read = buildDetectiveRead({
      species: 'Dragapult', choiceContradiction: true, itemGone: true, removedItem: 'Leftovers',
    });
    expect(read.input.clearedHistoricalChoiceLock).toBeFalsy();
    expect(read.eliminated.some((c) => c.item === 'Choice Scarf')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// test-item-transfer-timeline-upgrades.js + followup-loss (read side)
// ---------------------------------------------------------------------------
describe('item-transfer reads', () => {
  it('a transferred-in item becomes the current revealed item', () => {
    const read = buildDetectiveRead({
      species: 'Dragapult', choiceContradiction: true, itemGone: false,
      removedItem: 'Choice Specs', acquiredItem: 'Leftovers',
      itemTransferSource: 'move: Switcheroo', itemTransferMove: 'Switcheroo',
    });
    expect(read.input.itemGone).toBe(false);
    expect(read.input.revealedItem).toBe('Leftovers');
    expect(read.input.choiceContradiction).toBe(false);
    expect(read.summary.notes.some((n) => /Switcheroo replaced Choice Specs with Leftovers/i.test(n))).toBe(true);
  });

  it('a live choice lock on a transferred item stays active', () => {
    const read = buildDetectiveRead({
      species: 'Dragapult', choiceContradiction: true, itemGone: false,
      acquiredItem: 'Choice Specs', itemTransferSource: 'move: Trick', itemTransferMove: 'Trick',
    });
    expect(read.input.choiceContradiction).toBe(true);
    expect(read.input.itemGone).toBe(false);
    expect(read.input.revealedItem).toBe('Choice Specs');
  });

  it.each([
    ['Bestow', 'Heavy-Duty Boots', 'Leftovers'],
    ['Symbiosis', undefined, 'Sitrus Berry'],
    ['Recycle', undefined, 'Air Balloon'],
    ['Covet', undefined, 'Heavy-Duty Boots'],
    ['Pickup', undefined, 'Sitrus Berry'],
    ['Refurbish', undefined, 'Sitrus Berry'],
  ])('%s transfer timelines explain the new current item', (source, removed, gained) => {
    const read = buildDetectiveRead({
      species: 'Dragapult', itemGone: false, removedItem: removed, acquiredItem: gained,
      itemTransferSource: ['Symbiosis', 'Pickup'].includes(source) ? `ability: ${source}` : `move: ${source}`,
      itemTransferMove: source,
    });
    expect(read.input.itemGone).toBe(false);
    expect(read.input.revealedItem).toBe(gained);
    const note = removed
      ? new RegExp(`${source} replaced ${removed} with ${gained}`, 'i')
      : new RegExp(`${source} revealed ${gained} as the current item`, 'i');
    expect(read.summary.notes.some((n) => note.test(n))).toBe(true);
  });

  it('a later loss of the transferred item keeps the slot empty', () => {
    const read = buildDetectiveRead({
      species: 'Dragapult', itemGone: true, removedItem: 'Leftovers', acquiredItem: 'Leftovers', itemTransferSource: 'move: Trick',
    });
    expect(read.input.itemGone).toBe(true);
    expect(read.input.revealedItem).not.toBe('Leftovers');
    expect(read.summary.notes.some((n) => /Trick/i.test(n))).toBe(false);
    expect(read.summary.notes.some((n) => /replaced/i.test(n))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// test-revealed-item-anchor-upgrades.js
// ---------------------------------------------------------------------------
describe('revealed-item anchor', () => {
  it('replay-proven uncommon items surface as the live item row', () => {
    const read = buildDetectiveRead({
      species: 'Amoonguss', evidence: 'clue_only', clueLabel: 'Safety Goggles blocked Sleep Powder', revealedItem: 'Safety Goggles',
    });
    expect(read.itemRows[0][0]).toBe('Safety Goggles');
    expect(read.top.every((c) => c.item === 'Safety Goggles')).toBe(true);
    expect(read.summary.notes.some((n) => /Safety Goggles (is already revealed|confirmed)/i.test(n))).toBe(true);
  });

  it('acquired current items hard-anchor even when the default pool misses them', () => {
    const read = buildDetectiveRead({
      species: 'Dragapult', evidence: 'clue_only', clueLabel: 'Booster Energy confirmed', acquiredItem: 'Booster Energy',
    });
    expect(read.itemRows[0][0]).toBe('Booster Energy');
    expect(read.top.every((c) => c.item === 'Booster Energy')).toBe(true);
    expect(read.summary.notes.some((n) => /Booster Energy (is already revealed|confirmed)/i.test(n))).toBe(true);
  });

  it('consumed historical items are not revived as current', () => {
    // real-flow input: extractEvidence clears state.revealedItem on -enditem,
    // so a consumed item arrives as removedItem only (never re-shown).
    const read = buildDetectiveRead({
      species: 'Dragapult', evidence: 'clue_only', clueLabel: 'Red Card was consumed',
      removedItem: 'Red Card', itemGone: true,
    });
    expect(read.itemRows[0][0]).not.toBe('Red Card');
    expect(read.top.every((c) => c.item !== 'Red Card')).toBe(true);
    expect(read.summary.notes.some((n) => /Red Card was replay-confirmed as the current item/i.test(n))).toBe(false);
    expect(read.summary.notes.some((n) => /Red Card confirmed/i.test(n))).toBe(false);
  });

  it('a hard-anchored item collapses itemRows to the confirmed item', () => {
    const read = buildDetectiveRead({
      species: 'Gholdengo', evidence: 'clue_only', clueLabel: 'Air Balloon confirmed', revealedItem: 'Air Balloon',
    });
    expect(read.itemRows.length).toBe(1);
    expect(read.top.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// test-move-immunity-* (dmg side)
// ---------------------------------------------------------------------------
describe('move-immunity damage math', () => {
  it.each([
    ['Volcarona', 'Kommo-o', 'Soundproof', 'Boomburst'],
    ['Dragapult', 'Kommo-o', 'Bulletproof', 'Electro Ball'],
    ['Tornadus', 'Brambleghast', 'Wind Rider', 'Fairy Wind'],
  ])('%s blanks %s into %s (merged coverage)', (_att, defSpecies, ability, move) => {
    const roll = dmg({ species: 'Volcarona' }, { species: defSpecies, ability }, move);
    expect(roll.blockedBy).toBe(ability);
    expect(roll.maxd).toBe(0);
  });

  it.each([
    ['Kommo-o', 'Soundproof', 'Boomburst'],
    ['Kommo-o', 'Bulletproof', 'Shadow Ball'],
    ['Brambleghast', 'Wind Rider', 'Gust'],
  ])('control: non-family moves still damage through %s', (defSpecies, ability, blockedMove) => {
    const blocked = dmg({ species: 'Volcarona' }, { species: defSpecies, ability }, blockedMove);
    expect(blocked.blockedBy).toBe(ability);
    expect(blocked.maxd).toBe(0);
    const control = dmg({ species: 'Volcarona' }, { species: defSpecies, ability }, 'Close Combat');
    expect(control.blockedBy).toBeFalsy();
    expect(control.maxd).toBeGreaterThan(0);
  });

  it.each([
    ['Mold Breaker', 'Soundproof', 'Bug Buzz', 'Kommo-o'],
    ['Turboblaze', 'Bulletproof', 'Shadow Ball', 'Kommo-o'],
    ['Teravolt', 'Wind Rider', 'Bleakwind Storm', 'Brambleghast'],
  ])('%s bypasses %s in damage math', (attAbility, defAbility, move, defSpecies) => {
    const roll = dmg({ species: 'Reshiram', ability: attAbility }, { species: defSpecies, ability: defAbility }, move);
    expect(roll.blockedBy).toBeFalsy();
    expect(roll.maxd).toBeGreaterThan(0);
  });

  it('Mycelium Might does not bypass damaging move immunities', () => {
    const roll = dmg({ species: 'Toedscruel', ability: 'Mycelium Might' }, { species: 'Kommo-o', ability: 'Soundproof' }, 'Bug Buzz');
    expect(roll.blockedBy).toBe('Soundproof');
    expect(roll.maxd).toBe(0);
  });

  it('newly covered projectile moves zero out', () => {
    const roll = dmg({ species: 'Volcarona' }, { species: 'Kommo-o', ability: 'Bulletproof' }, 'Bullet Seed');
    expect(roll.blockedBy).toBe('Bulletproof');
    expect(roll.maxd).toBe(0);
  });

  it('ordinary wind attacks still zero into Wind Rider', () => {
    const roll = dmg({ species: 'Tornadus' }, { species: 'Brambleghast', ability: 'Wind Rider' }, 'Gust');
    expect(roll.blockedBy).toBe('Wind Rider');
    expect(roll.maxd).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// detectiveAbilities / pool helpers
// ---------------------------------------------------------------------------
describe('detective pool', () => {
  it('detectiveAbilities falls back to Unknown for unknown species', () => {
    expect(detectiveAbilities('Not A Realmon')).toEqual(['Unknown']);
    expect(detectiveAbilities('Gholdengo')).toContain('Good as Gold');
  });
});
