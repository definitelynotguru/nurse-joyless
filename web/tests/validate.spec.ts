// Port of test-validation-fixes.js + test-submission-polish.js +
// test-fallback-ability-fixes.js (behavioral parts) + the
// validateTeamAdvanced block of test-smoke.js.
// Legacy tests concatenated app.js + patch files in a vm sandbox; the port
// exercises the merged pipeline in src/engine/validate.ts directly.

import { describe, expect, it } from 'vitest';
import { parseTeam } from '../src/engine/team';
import { validateTeam, validateTeamAdvanced } from '../src/engine/validate';
import { getSpecies, moveData } from '../src/engine/dex';

const TEAM = `Queenmaker (Kingambit) (F) @ Leftovers
Ability: Supreme Overlord
Tera Type: Dark
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Kowtow Cleave
- Sucker Punch
- Iron Head
- Low Kick

Volcanion @ Heavy-Duty Boots
Ability: Water Absorb
Tera Type: Stellar
EVs: 248 HP / 252 SpA / 8 SpD
Modest Nature
- Steam Eruption
- Flamethrower
- Taunt
- Protect

Deoxys-Speed @ Life Orb
Ability: Pressure
Tera Type: Psychic
EVs: 4 Def / 252 SpA / 252 Spe
Timid Nature
IVs: 0 Atk
- Psycho Boost
- Superpower
- Taunt
- Shadow Ball

Iron Valiant @ Booster Energy
Ability: Quark Drive
Tera Type: Fairy
EVs: 4 Atk / 252 SpA / 252 Spe
Naive Nature
- Moonblast
- Close Combat
- Encore
- Knock Off

Iron Treads @ Leftovers
Ability: Quark Drive
Tera Type: Ghost
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Stealth Rock
- Earthquake
- Knock Off
- Rapid Spin

Landorus-Therian @ Choice Scarf
Ability: Intimidate
Tera Type: Flying
EVs: 252 Atk / 4 Def / 252 Spe
Jolly Nature
- Earthquake
- U-turn
- Stone Edge
- Taunt`;

describe('parseTeam + validateTeamAdvanced (test-validation-fixes)', () => {
  it('parses all six sets, honoring nickname/gender and Stellar', () => {
    const parsed = parseTeam(TEAM);
    expect(parsed.length).toBe(6);
    expect(parsed[0].species).toBe('Kingambit'); // gender tags should not replace the species name
    expect(parsed[0].item).toBe('Leftovers'); // gender-tag parsing should preserve the item
    expect(parsed[1].species).toBe('Volcanion'); // resolves through fallback species data
    expect(parsed[1].tera).toBe('Stellar'); // Stellar preserved through team parsing
  });

  it('validates every row without false fallback-gap text', () => {
    const rows = validateTeamAdvanced(parseTeam(TEAM));
    expect(rows.length).toBe(6);
    for (const row of rows) {
      expect(row.status, `${row.species} should not be marked invalid`).not.toBe('invalid');
      expect(row.issues.some((i) => /unknown move/i.test(i)), `${row.species} should not report unknown moves`).toBe(false);
      expect(row.issues.some((i) => /invalid tera type/i.test(i)), `${row.species} should not report an invalid Tera type`).toBe(false);
      expect(row.warnings.some((i) => /unknown or unsupported form/i.test(i))).toBe(false);
      expect(row.warnings.some((i) => /ability data unavailable/i.test(i))).toBe(false);
    }
    expect(rows.find((r) => r.species === 'Volcanion')).toBeTruthy();
    expect(rows.find((r) => r.species === 'Iron Valiant')).toBeTruthy();

    const summary = JSON.stringify(rows).toLowerCase();
    for (const fragment of [
      'unknown move: low kick',
      'unknown move: steam eruption',
      'unknown move: taunt',
      'unknown move: psycho boost',
      'unknown move: superpower',
      'unknown or unsupported form',
      'ability data unavailable',
      'invalid tera type',
    ]) {
      expect(summary.includes(fragment), `output should not include false gap text: ${fragment}`).toBe(false);
    }
  });

  it('exposes the fallback regression data through the dex layer', () => {
    expect(getSpecies('Volcanion')).toBeTruthy();
    expect(getSpecies('Deoxys-Speed')).toBeTruthy();
    expect(moveData('Steam Eruption')).toBeTruthy();
    expect(moveData('Superpower')).toBeTruthy();
    expect(moveData('Low Kick')).toBeTruthy();
    expect(moveData('Taunt')).toBeTruthy();
  });
});

describe('submission-polish normalization (test-submission-polish)', () => {
  it('downgrades learnset-uncertainty rows to warning-only', () => {
    // Gengar is not in the trusted/local learnset tables, so a real move with
    // unwarmed data produces exactly one soft warning.
    const team = parseTeam(`Gengar @ Leftovers
Ability: Cursed Body
EVs: 4 Def / 252 SpA / 252 Spe
Timid Nature
- Shadow Ball`);
    const row = validateTeamAdvanced(team)[0];
    expect(row.status).toBe('WARNING');
    expect(row.hardIssueCount).toBe(0);
    expect(row.warningCount).toBe(1);
    expect(row.validationState).toBe('warning-only');
    expect(row.validationReasoning).toMatch(/fallback|manual confirmation/i);
    expect(row.confidence).toBe('medium');
  });

  it('keeps hard legality blockers', () => {
    const team = parseTeam(`Kingambit @ Leftovers
Ability: Levitate
Tera Type: Dark
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Kowtow Cleave
- Sucker Punch
- Iron Head
- Swords Dance`);
    const row = validateTeamAdvanced(team)[0];
    expect(row.status).not.toBe('VALID');
    expect(row.hardIssueCount).toBe(1);
    expect(row.validationState).toBe('hard-blocker');
    expect(row.issues.join(' ')).toMatch(/does not list levitate/i);
  });

  it('flags EV overflow as a hard blocker', () => {
    const team = parseTeam(`Mewtwo @ Life Orb
Ability: Pressure
EVs: 252 HP / 300 Atk
- Psychic`);
    const row = validateTeamAdvanced(team)[0];
    expect(row.issues.some((i) => /EV 300 exceeds 252|EV total/.test(i))).toBe(true);
    expect(row.hardIssueCount).toBeGreaterThanOrEqual(1);
    expect(row.validationState).toBe('hard-blocker');
  });

  it('flags out-of-range levels', () => {
    const row = validateTeamAdvanced([{ species: 'Mewtwo', item: 'Life Orb', ability: 'Pressure', level: 150, moves: ['Psychic'] } as never])[0];
    expect(row.issues.some((i) => /invalid level/i.test(i))).toBe(true);
    expect(row.status).toBe('invalid');
  });

  it('marks a fully-legal trusted set clean', () => {
    const team = parseTeam(`Kingambit @ Black Glasses
Ability: Supreme Overlord
Tera Type: Dark
EVs: 252 Atk / 4 SpD / 252 Spe
Adamant Nature
- Sucker Punch
- Kowtow Cleave
- Iron Head
- Swords Dance`);
    const row = validateTeamAdvanced(team)[0];
    expect(row.status).toBe('VALID');
    expect(row.validationState).toBe('clean');
    expect(row.hardIssueCount).toBe(0);
    expect(row.warningCount).toBe(0);
    expect(row.confidence).toBe('high');
  });
});

describe('ability legality via dex data (test-fallback-ability-fixes)', () => {
  it('keeps real Toxapex abilities legal and rejects fake ones', () => {
    const legal = validateTeamAdvanced(
      parseTeam(`Toxapex @ Heavy-Duty Boots
Ability: Regenerator
EVs: 252 HP / 252 Def / 4 SpD
Bold Nature
- Recover`),
    )[0];
    expect(legal.issues.some((i) => /does not list/i.test(i))).toBe(false);
    const merciless = validateTeamAdvanced([
      { species: 'Toxapex', item: 'Heavy-Duty Boots', ability: 'Merciless', moves: ['Recover'] } as never,
    ])[0];
    expect(merciless.issues.some((i) => /does not list/i.test(i))).toBe(false);
    const fake = validateTeamAdvanced([
      { species: 'Toxapex', item: 'Heavy-Duty Boots', ability: 'Wonder Guard', moves: ['Recover'] } as never,
    ])[0];
    expect(fake.issues.some((i) => /does not list wonder guard/i.test(i))).toBe(true);
  });

  it('resolves Persian with its real ability pool and typing', () => {
    const species = getSpecies('Persian');
    expect(species).toBeTruthy();
    expect(species!.types).toEqual(['Normal']);
    const abilities = Object.values(species!.abilities || {});
    expect(abilities).toContain('Limber');
    expect(abilities).toContain('Technician');
    expect(abilities).toContain('Unnerve');
  });
});

describe('validateTeam smoke parity', () => {
  it('returns one row per team member (test-smoke)', () => {
    const sunRoom = parseTeam(`Sunflora @ Expert Belt
Ability: Solar Power
Tera Type: Fairy
EVs: 168 HP / 64 Def / 252 SpA / 24 SpD
Quiet Nature
IVs: 0 Atk / 0 Spe
- Giga Drain
- Earth Power
- Weather Ball
- Dazzling Gleam

Hoopa-Unbound @ Room Service
Ability: Magician
Tera Type: Ghost
EVs: 248 HP / 176 Atk / 72 Def / 12 SpA
Brave Nature
IVs: 0 Spe
- Psychic Noise
- Hyperspace Fury
- Drain Punch
- Trick Room

Torkoal @ Charcoal
Ability: Drought
Tera Type: Fire
EVs: 208 HP / 40 Def / 252 SpA / 8 SpD
Quiet Nature
IVs: 0 Spe
- Eruption
- Lava Plume
- Rapid Spin
- Stealth Rock

Hatterene @ Focus Sash
Ability: Magic Bounce
Tera Type: Water
EVs: 248 HP / 4 Def / 252 SpA / 4 SpD
Quiet Nature
IVs: 0 Atk / 0 Spe
- Psychic Noise
- Dazzling Gleam
- Healing Wish
- Trick Room

Ursaluna @ Flame Orb
Ability: Guts
Tera Type: Normal
EVs: 252 Atk / 28 Def / 228 SpD
Brave Nature
IVs: 0 Spe
- Headlong Rush
- Facade
- Fire Punch
- Roar

Cresselia @ Mental Herb
Ability: Levitate
Tera Type: Poison
EVs: 252 HP / 252 Def / 4 SpD
Relaxed Nature
IVs: 0 Atk / 0 Spe
- Ice Beam
- Moonlight
- Trick Room
- Lunar Dance`);
    expect(validateTeamAdvanced(sunRoom).length).toBe(6);
    expect(validateTeam(sunRoom).length).toBe(6);
  });
});
