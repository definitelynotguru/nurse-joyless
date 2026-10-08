// parseTeam / teamToText edge cases pinned by zeus-review.
import { describe, expect, it } from 'vitest';
import { parseTeam, teamToText } from '../src/engine/team';

const SET = (sp: string, extra = '') =>
  `${sp} @ Leftovers\nAbility: Static${extra ? `\n${extra}` : ''}\n- Tackle`;

describe('parseTeam edge cases', () => {
  it('slices teams to 6 mons', () => {
    const text = Array.from({ length: 7 }, (_, i) => SET(`Mon${i}`)).join('\n\n');
    expect(parseTeam(text)).toHaveLength(6);
  });

  it('ignores runs of blank lines without emitting empty mons', () => {
    const team = parseTeam(`${SET('Pikachu')}\n\n\n\n${SET('Raichu')}\n\n`);
    expect(team).toHaveLength(2);
    expect(team.map((m) => m.species)).toEqual(['Pikachu', 'Raichu']);
  });

  it.each(['???', 'N/A', 'unknown'])('scrubs bogus Tera Type "%s" to empty', (t) => {
    const team = parseTeam(SET('Pikachu', `Tera Type: ${t}`));
    expect(team[0].tera).toBe('');
  });

  it('keeps extra " @ " segments inside the item name', () => {
    const team = parseTeam('Pikachu @ Light Ball @ Extra\n- Tackle');
    expect(team[0].species).toBe('Pikachu');
    expect(team[0].item).toBe('Light Ball @ Extra');
  });

  it('returns [] for empty or whitespace input', () => {
    expect(parseTeam('')).toEqual([]);
    expect(parseTeam('\n\n  \n')).toEqual([]);
  });
});

describe('teamToText round-trip', () => {
  it('emits Level and Shiny only when non-default', () => {
    const team = parseTeam('Pikachu @ Light Ball\nAbility: Static\nLevel: 50\nShiny: Yes\n- Tackle');
    expect(team[0].level).toBe(50);
    expect(team[0].shiny).toBe(true);
    const text = teamToText(team);
    expect(text).toContain('Level: 50');
    expect(text).toContain('Shiny: Yes');
    const reparsed = parseTeam(text);
    expect(reparsed[0].level).toBe(50);
    expect(reparsed[0].shiny).toBe(true);
  });

  it('omits Level/Shiny lines at defaults', () => {
    const text = teamToText(parseTeam('Pikachu @ Light Ball\n- Tackle'));
    expect(text).not.toContain('Level:');
    expect(text).not.toContain('Shiny:');
  });
});
