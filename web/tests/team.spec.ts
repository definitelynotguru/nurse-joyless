// parseTeam / teamToText edge cases pinned by zeus-review.
import { describe, expect, it } from 'vitest';
import { parseTeam, teamToText, removeMonFromText } from '../src/engine/team';

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

// removeMonFromText: review-pinned — must remove the *displayed* mon's block
// without truncating sets past the 6-cap or assuming stale card indices.
describe('removeMonFromText', () => {
  it('preserves sets beyond the six displayed (review: trailing-set loss)', () => {
    const text = Array.from({ length: 7 }, (_, i) => SET(`Mon${i}`)).join('\n\n');
    const target = parseTeam(text)[1]; // displayed card B
    const out = removeMonFromText(text, target);
    const species = parseTeam(out).map((m) => m.species);
    expect(species).toEqual(['Mon0', 'Mon2', 'Mon3', 'Mon4', 'Mon5', 'Mon6']);
    expect(out).toContain('Mon6'); // beyond the former cap — survived
  });

  it('removes the displayed mon even after textarea reorder (review: stale index)', () => {
    const analyzed = parseTeam([SET('A'), SET('B'), SET('C')].join('\n\n'));
    const edited = [SET('X'), SET('A'), SET('B'), SET('C')].join('\n\n');
    const out = removeMonFromText(edited, analyzed[1]); // clicked card B
    const species = parseTeam(out).map((m) => m.species);
    expect(species).toEqual(['X', 'A', 'C']); // B gone, A untouched
  });

  it('keeps un-analyzed edits in untouched blocks verbatim', () => {
    const analyzed = parseTeam([SET('A'), SET('B')].join('\n\n'));
    const edited = `${SET('A')}\n\n${SET('B')}\n\n${SET('C', 'EVs: 252 Atk / 252 Spe / 4 HP')}`;
    const out = removeMonFromText(edited, analyzed[0]);
    expect(out).toContain('EVs: 252 Atk / 252 Spe / 4 HP');
    expect(out).not.toContain('A @ Leftovers');
  });

  it('falls back to species match when the block was edited', () => {
    const analyzed = parseTeam(`${SET('B')}\n\n${SET('A')}`);
    const edited = `${SET('B', 'Level: 50')}\n\n${SET('A')}`;
    const out = removeMonFromText(edited, analyzed[0]); // B, but its Level changed
    expect(out).not.toContain('Level: 50'); // B's whole block gone
    expect(parseTeam(out).map((m) => m.species)).toEqual(['A']);
  });

  it('returns text unchanged when the mon is absent', () => {
    const analyzed = parseTeam(SET('A'));
    const out = removeMonFromText(SET('Z'), analyzed[0]);
    expect(out).toBe(SET('Z'));
  });

  it('empties the text when the last mon is removed', () => {
    const analyzed = parseTeam(SET('Solo'));
    expect(removeMonFromText(SET('Solo'), analyzed[0])).toBe('');
  });
});
