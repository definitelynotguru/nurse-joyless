// Port of test-tera-plan.js — same teams, same assertions.
// Legacy called NurseJoylessTeraPlan.analyze/markdown inside a vm sandbox;
// the port calls src/engine/tera.ts directly.

import { describe, expect, it } from 'vitest';
import { parseTeam } from '../src/engine/team';
import { buildTeraPlan, teraPlanMarkdown } from '../src/engine/tera';

const BALANCE = `Gholdengo @ Air Balloon
Ability: Good as Gold
Tera Type: Fairy
EVs: 252 HP / 196 Def / 60 Spe
Bold Nature
- Nasty Plot
- Shadow Ball
- Recover
- Make It Rain

Landorus-Therian @ Rocky Helmet
Ability: Intimidate
Tera Type: Water
EVs: 248 HP / 24 Def / 4 SpD / 232 Spe
Jolly Nature
- Earthquake
- U-turn
- Stealth Rock
- Taunt

Volcanion @ Leftovers
Ability: Water Absorb
Tera Type: Poison
EVs: 248 HP / 68 Def / 8 SpA / 184 Spe
Modest Nature
IVs: 0 Atk
- Steam Eruption
- Flamethrower
- Taunt
- Will-O-Wisp

Iron Valiant @ Booster Energy
Ability: Quark Drive
Tera Type: Stellar
EVs: 252 Atk / 4 SpA / 252 Spe
Naive Nature
- Close Combat
- Knock Off
- Moonblast
- Encore

Kingambit @ Leftovers
Ability: Supreme Overlord
Tera Type: Dark
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Kowtow Cleave
- Sucker Punch
- Iron Head
- Low Kick

Alomomola @ Heavy-Duty Boots
Ability: Regenerator
Tera Type: Ghost
EVs: 4 HP / 252 Def / 252 SpD
Relaxed Nature
- Wish
- Protect
- Flip Turn
- Scald`;

const OVERLOADED = `Dragonite @ Heavy-Duty Boots
Ability: Multiscale
Tera Type: Normal
EVs: 252 Atk / 4 SpD / 252 Spe
Adamant Nature
- Dragon Dance
- Extreme Speed
- Earthquake
- Fire Punch

Kingambit @ Black Glasses
Ability: Supreme Overlord
Tera Type: Dark
EVs: 252 Atk / 4 SpD / 252 Spe
Adamant Nature
- Sucker Punch
- Kowtow Cleave
- Iron Head
- Swords Dance

Volcarona @ Heavy-Duty Boots
Ability: Flame Body
Tera Type: Grass
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Quiver Dance
- Fiery Dance
- Giga Drain
- Bug Buzz

Iron Valiant @ Booster Energy
Ability: Quark Drive
Tera Type: Stellar
EVs: 252 Atk / 4 SpA / 252 Spe
Naive Nature
- Close Combat
- Knock Off
- Moonblast
- Encore

Gholdengo @ Air Balloon
Ability: Good as Gold
Tera Type: Fairy
EVs: 252 HP / 196 Def / 60 Spe
Bold Nature
- Nasty Plot
- Shadow Ball
- Recover
- Make It Rain

Dragapult @ Choice Specs
Ability: Infiltrator
Tera Type: Ghost
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Draco Meteor
- Shadow Ball
- Flamethrower
- U-turn`;

describe('buildTeraPlan (test-tera-plan)', () => {
  it('scores a balanced team as a functional plan', () => {
    const plan = buildTeraPlan(parseTeam(BALANCE), { primaryIdentity: { name: 'Balance' } });
    expect(plan.score).toBeGreaterThanOrEqual(55);
    expect(
      plan.bestDefensive.species === 'Landorus-Therian' || plan.bestDefensive.score >= 35,
      'defensive Tera patch should be identified',
    ).toBe(true);
    expect(plan.bestOffensive.species, 'offensive Tera candidate should be identified').toBeTruthy();
    expect(
      plan.bestOffensive.tera === 'Stellar' || plan.rows.some((row) => row.tera === 'Stellar' && row.offensive > row.defensive),
      'Stellar should be treated as offensive, not defensive',
    ).toBe(true);
    expect(plan.reliabilityModifier).toBeGreaterThanOrEqual(0);
  });

  it('detects overloaded Tera dependency', () => {
    const plan = buildTeraPlan(parseTeam(OVERLOADED), { primaryIdentity: { name: 'Hyper Offense' } });
    expect(plan.hunger.length).toBeGreaterThanOrEqual(3);
    expect(plan.status).not.toBe('Clean');
    expect(plan.reliabilityModifier).toBeLessThanOrEqual(9);
  });

  it('exports a markdown section', () => {
    const markdown = teraPlanMarkdown(buildTeraPlan(parseTeam(BALANCE), { primaryIdentity: { name: 'Balance' } }));
    expect(markdown).toMatch(/## Tera Plan/);
    expect(markdown).toMatch(/Reliability impact/);
  });
});
