import { describe, it, expect } from 'vitest';
import {
  getSpecies, getMove, abilityOk, canLearn, warmLearnsetsFor,
  parseTeam, SAMPLE, REGRESSION_TEAMS,
} from '../src/engine/api';
import { SMOGON_FALLBACK_SETS } from '../src/engine/suggest';
import type { TeamMon } from '../src/engine/api';

const TEAMS: Record<string, string> = { sample: SAMPLE, ...(REGRESSION_TEAMS as Record<string, string>) };

function teamMons(): TeamMon[] {
  return Object.values(TEAMS).flatMap(parseTeam);
}

describe('dex integrity (Gen 9 @pkmn/dex)', () => {
  it('every species referenced by bundled teams + fallback sets resolves', () => {
    const names = new Set<string>();
    for (const m of teamMons()) if (m.species) names.add(m.species);
    for (const name of Object.keys(SMOGON_FALLBACK_SETS)) names.add(name);
    const missing = [...names].filter(n => !getSpecies(n));
    expect(missing).toEqual([]);
    expect(names.size).toBeGreaterThan(30);
  });

  it('every move in bundled teams resolves to real move data', () => {
    const missing: string[] = [];
    for (const m of teamMons()) {
      for (const mv of m.moves || []) if (!getMove(mv)) missing.push(`${m.species}: ${mv}`);
    }
    expect(missing).toEqual([]);
  });

  it('every ability in bundled teams is legal on its species', () => {
    const bad: string[] = [];
    for (const m of teamMons()) {
      const r = abilityOk(m);
      if (!r.ok) bad.push(`${m.species}: ${m.ability} (${r.reason})`);
    }
    expect(bad).toEqual([]);
  });

  it('warmed learnsets confirm sample-team moves are learnable', async () => {
    const team = parseTeam(SAMPLE);
    await warmLearnsetsFor(team.map(m => m.species || ''));
    const illegal: string[] = [];
    for (const m of team) {
      for (const mv of m.moves || []) {
        const ok = canLearn(m.species || '', mv);
        if (ok === false) illegal.push(`${m.species} cannot learn ${mv}`);
      }
    }
    expect(illegal).toEqual([]);
  }, 30000);
});
