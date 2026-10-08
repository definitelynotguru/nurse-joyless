import { describe, it, expect } from 'vitest';
import {
  runClinic, encodeTeamLink, decodeTeamLink,
  spriteUrl, itemIconUrl, typeIconUrl,
  speedTiers, coverageMatrix, survivalMatrix,
  smogonCalcRange, parseTeam, SAMPLE,
} from '../src/engine/api';

describe('api facade', () => {
  it('runClinic returns the full v35 pipeline result', () => {
    const clinic = runClinic(SAMPLE);
    expect(clinic.team.length).toBe(6);
    expect(clinic.report).toBeTruthy();
    expect(clinic.report!.team).toHaveLength(6);
    expect(clinic.markdown).toContain('Nurse Joyless');
  });

  it('share links round-trip the team text', () => {
    const link = encodeTeamLink(SAMPLE);
    expect(link.startsWith('#team=')).toBe(true);
    expect(decodeTeamLink(link)).toBe(SAMPLE);
    expect(decodeTeamLink('')).toBe('');
    expect(decodeTeamLink('#team=not-base64!!!')).toBe('');
  });

  it('share-link decode tolerates stripped padding and rejects overlong payloads', () => {
    // every encode output is unpadded base64url — decode must re-pad
    for (let len = 10; len < 400; len += 7) {
      const text = SAMPLE.slice(0, len);
      expect(decodeTeamLink(encodeTeamLink(text))).toBe(text);
    }
    // attacker-controlled hash: refuse to decode huge payloads
    expect(decodeTeamLink(`#team=${'A'.repeat(64_001)}`)).toBe('');
    expect(() => decodeTeamLink(`#team=${'A'.repeat(63_999)}`)).not.toThrow();
    // encode and decode share the documented bound: over-limit text can't encode
    expect(encodeTeamLink('x'.repeat(48_001))).toBe('');
    expect(encodeTeamLink('x'.repeat(48_000))).toMatch(/^#team=/);
  });

  it('sprite helpers emit Showdown CDN URLs', () => {
    expect(spriteUrl('Garchomp')).toBe('https://play.pokemonshowdown.com/sprites/gen5/garchomp.png');
    expect(itemIconUrl('Rocky Helmet')).toBe('https://play.pokemonshowdown.com/sprites/itemicons/rockyhelmet.png');
    expect(typeIconUrl('Dragon')).toContain('/sprites/types/');
  });

  it('speedTiers orders everything by speed with meta benchmarks mixed in', () => {
    const tiers = speedTiers(parseTeam(SAMPLE));
    expect(tiers.length).toBeGreaterThan(6);
    expect(tiers.some(t => t.side === 'meta')).toBe(true);
    expect(tiers.some(t => t.side === 'team')).toBe(true);
    const speeds = tiers.map(t => t.speed);
    expect(speeds).toEqual([...speeds].sort((a, b) => b - a));
  });

  it('coverageMatrix emits a row per defending type', () => {
    const m = coverageMatrix(parseTeam(SAMPLE));
    expect(m).toHaveLength(18);
    expect(m.some(r => r.hitters.length > 0)).toBe(true);
  });

  it('coverageMatrix indexes attacking type vs defending type (not reversed)', () => {
    const m = coverageMatrix(parseTeam('Charizard @ Leftovers\nAbility: Blaze\n- Flamethrower'));
    const grass = m.find((r) => r.type === 'Grass')!;
    const water = m.find((r) => r.type === 'Water')!;
    expect(grass.hitters).toContain('Charizard');
    expect(water.hitters).toHaveLength(0);
  });

  it('survivalMatrix produces a cell per team pair', () => {
    const m = survivalMatrix(parseTeam(SAMPLE));
    expect(m.cells).toHaveLength(6);
    for (const row of m.cells) expect(row).toHaveLength(6);
  });

  it('smogonCalcRange returns the real Showdown roll text', () => {
    const r = smogonCalcRange(
      { species: 'Garchomp', level: 50, nature: 'Jolly', evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 }, moves: ['Dragon Claw'] },
      { species: 'Dragapult', level: 50, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, moves: [] },
      'Dragon Claw',
    );
    expect(r).toBeTruthy();
    expect(r!.desc).toContain('Dragon Claw');
    expect(r!.desc).toContain('%');
  });

  it('smogonCalcRange returns null for invalid input instead of throwing', () => {
    expect(smogonCalcRange({ species: 'Not A Mon' }, { species: 'Dragapult' }, 'Tackle')).toBeNull();
    expect(smogonCalcRange({}, {}, '')).toBeNull();
  });
});
