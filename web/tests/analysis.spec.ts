import { describe, it, expect } from 'vitest';
import { parseTeam } from '../src/engine/team';
import type { TeamMon } from '../src/engine/types';
import { analyze, teamSignals, riskList, scoreGroupSummary, verdict } from '../src/engine/analysis';
import { profileTeam, detectIdentities, evaluateSynergy, evaluateMatchups } from '../src/engine/identity';

// SAMPLE team from src/app.js (test-smoke.js 'Sparring Lab' block).
const SAMPLE = `Charizard @ Heavy-Duty Boots
Ability: Blaze
Tera Type: Fire
EVs: 4 Def / 252 SpA / 252 Spe
Timid Nature
- Flamethrower
- Hurricane
- Defog
- Roost

Dragonite @ Heavy-Duty Boots
Ability: Multiscale
Tera Type: Normal
EVs: 252 Atk / 4 SpD / 252 Spe
Adamant Nature
- Dragon Dance
- Extreme Speed
- Earthquake
- Fire Punch

Garchomp @ Rocky Helmet
Ability: Rough Skin
Tera Type: Steel
EVs: 252 HP / 164 Def / 92 Spe
Impish Nature
- Stealth Rock
- Earthquake
- Dragon Tail
- Toxic

Salamence @ Life Orb
Ability: Moxie
Tera Type: Flying
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Dragon Dance
- Earthquake
- Outrage
- Stone Edge

Hydreigon @ Choice Specs
Ability: Levitate
Tera Type: Steel
EVs: 4 Def / 252 SpA / 252 Spe
Timid Nature
- Draco Meteor
- Dark Pulse
- Flamethrower
- U-turn

Dragapult @ Choice Band
Ability: Infiltrator
Tera Type: Dragon
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Dragon Darts
- U-turn
- Sucker Punch
- Tera Blast`;

const sunRoom = `Sunflora @ Expert Belt
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
- Lunar Dance`;

const team = parseTeam(SAMPLE);

describe('analyze', () => {
  const a = analyze(team);

  it('returns one triage row per attacking type', () => {
    expect(a.rows.length).toBe(18);
    expect(a.rows.every((r) => typeof r.tp === 'string' && typeof r.score === 'number' && typeof r.sev === 'string')).toBe(true);
  });

  it('ranks the stacked Dragon weaknesses at the top', () => {
    expect(a.rows.slice(0, 4).map((r) => r.tp)).toEqual(['Ice', 'Fairy', 'Dragon', 'Rock']);
    expect(a.rows[0].sev).toBe('crit');
    expect(a.rows[0].weak).toBe(5);
  });

  it('fills the role buckets from the parsed team', () => {
    expect(a.roles.hazards.length).toBe(1);
    expect(a.roles.removal.length).toBe(1);
    expect(a.roles.setup.length).toBe(2);
    expect(a.roles.pivot.length).toBe(2);
    expect(a.roles.priority.length).toBe(2);
    expect(a.roles.wallbreaker.length).toBe(4);
    expect(a.roles.trickRoom.length).toBe(0);
  });

  it('reports missing roles, red flags, status and typeCounts', () => {
    expect(a.missing).toContain('specialWall');
    expect(a.red.some((x) => /5 Dragon-types/.test(x))).toBe(true);
    expect(typeof a.status).toBe('string');
    expect(a.status).toBe('Unsaveable');
    expect(a.typeCounts.Dragon).toBe(5);
    expect(a.typeCounts.Flying).toBe(3);
  });

  it('handles an empty team without crashing', () => {
    const empty = analyze([]);
    expect(empty.rows.length).toBe(18);
    expect(empty.red.length).toBe(0);
  });
});

describe('teamSignals', () => {
  const a = analyze(team);
  const s = teamSignals(team, a);

  it('counts members and type distribution', () => {
    expect(s.count).toBe(6);
    expect(s.typeCounts.Dragon).toBe(5);
    expect(s.typeCounts.Flying).toBe(3);
  });

  it('derives utility counts from roles', () => {
    expect(s.hazards).toBe(1);
    expect(s.removal).toBe(1);
    expect(s.setup).toBe(2);
    expect(s.pivot).toBe(2);
    expect(s.priority).toBe(2);
    expect(s.recovery).toBe(1);
    expect(s.wallbreakers).toBe(4);
  });

  it('counts items', () => {
    expect(s.boots).toBe(2);
    expect(s.offensiveItems).toBe(3);
    expect(s.choiceItems).toBe(2);
  });
});

describe('riskList', () => {
  const a = analyze(team);

  it('flags the stacked crit weaknesses and the type stack', () => {
    const risks = riskList(team, a);
    expect(risks.some((r) => r.type === 'Ice' && r.level === 'crit')).toBe(true);
    expect(risks.some((r) => r.type === 'Type stacking' && /5 Dragon-type members/.test(r.detail))).toBe(true);
  });

  it('does not flag hazard control when removal exists', () => {
    expect(riskList(team, a).some((r) => r.type === 'Hazard control')).toBe(false);
  });

  it('flags missing hazard control on teams without removal', () => {
    const noRemoval = team.filter((p) => p.species !== 'Charizard');
    const a2 = analyze(noRemoval);
    expect(riskList(noRemoval, a2).some((r) => r.type === 'Hazard control' && r.level === 'bad')).toBe(true);
  });
});

describe('scoreGroupSummary', () => {
  it('summarizes a full report', () => {
    const p = profileTeam(team, analyze(team)) as any;
    const identity = detectIdentities(team, analyze(team), p) as any;
    const synergy = evaluateSynergy(team, analyze(team), p, identity) as any;
    const matchups = evaluateMatchups(team, analyze(team), p, identity) as any;
    const g = scoreGroupSummary({ identity, synergy, matchups });
    expect(g.identityConfidence).toBe(96);
    expect(g.structuralQuality).toBeGreaterThan(0);
    expect(g.battleReliability).toBeGreaterThan(0);
    expect(g.matchupAverage).toBeGreaterThan(0);
  });

  it('handles a null report', () => {
    const g = scoreGroupSummary(null);
    expect(g.identityConfidence).toBe(0);
    expect(g.matchupAverage).toBe(0);
  });
});

describe('verdict', () => {
  it('returns the Dragon-pressure verdict for the SAMPLE report', () => {
    const p = profileTeam(team, analyze(team)) as any;
    const identity = detectIdentities(team, analyze(team), p) as any;
    const synergy = evaluateSynergy(team, analyze(team), p, identity) as any;
    const matchups = evaluateMatchups(team, analyze(team), p, identity) as any;
    const v = verdict({ identity, synergy, matchups });
    expect(/Dragon pressure/.test(v)).toBe(true);
    expect(/Patch Fairy\/Ice\/Dragon counterplay/.test(v)).toBe(true);
  });

  it('falls through to the generic verdict for unknown primaries', () => {
    const v = verdict({ identity: { primary: { name: 'Custom' } }, synergy: { issues: [] }, matchups: [] } as any);
    expect(/readable plan/.test(v)).toBe(true);
  });
});

// test-smoke.js 'Sparring Lab' blocks: parseTeam -> analyze -> reasoner reads.
describe('test-smoke: Sparring Lab blocks', () => {
  const runPipeline = (t: TeamMon[]) => {
    const a = analyze(t);
    const p = profileTeam(t, a) as any;
    const identity = detectIdentities(t, a, p) as any;
    const synergy = evaluateSynergy(t, a, p, identity) as any;
    const matchups = evaluateMatchups(t, a, p, identity) as any;
    return { analysis: a, identity, synergy, matchups };
  };

  it('detects Dragon Spam Offense on the SAMPLE team', () => {
    const r = runPipeline(team);
    expect(/Dragon Spam/.test(r.identity.primary.name)).toBe(true);
  });

  it('does not overclassify dragon spam as stall', () => {
    const r = runPipeline(team);
    const stall = r.identity.all.find((x: any) => x.name === 'Stall');
    expect((stall?.score ?? 0) < 60).toBe(true);
  });

  it('accounts for Boots/Defog counterplay in the Hazard matchup', () => {
    const r = runPipeline(team);
    expect(r.matchups.find((x: any) => x.name === 'Hazard Stack').score >= 45).toBe(true);
  });

  it('detects Sun Room / Trick Room on the sunRoom team', () => {
    const r = runPipeline(parseTeam(sunRoom));
    expect(/Sun Room|Trick Room/.test(r.identity.primary.name)).toBe(true);
  });

  it('counts Trick Room as speed control', () => {
    const r = runPipeline(parseTeam(sunRoom));
    expect(r.synergy.scores.speedControl >= 60).toBe(true);
  });
});
