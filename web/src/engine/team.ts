// Showdown importable parsing and serialization.
// Merges the validation-fixes behavior: bogus tera tokens are scrubbed and
// nickname/gender syntax is handled by norm().
import type { TeamMon } from './types';
import { norm, moveName, parseEV } from './dex';
import { emptyStats } from './types';

const BOGUS_TERA = /^(unknown|none|n\/a|na|\?|\?\?\?)$/i;

export function parseTeam(text: string): TeamMon[] {
  const out = String(text || '')
    .split(/\n\s*\n/)
    .map((block, i): TeamMon | null => {
      const lines = block.split(/\n/).map((x) => x.trim()).filter(Boolean);
      if (!lines.length) return null;
      const first = lines[0];
      let sp = first;
      let item = 'None';
      if (first.includes(' @ ')) {
        const parts = first.split(' @ ');
        sp = parts[0];
        item = parts.slice(1).join(' @ ').trim();
      }
      const mon: TeamMon = {
        id: i,
        species: norm(sp),
        item,
        ability: '',
        tera: '',
        nature: 'Hardy',
        evs: emptyStats(0),
        ivs: emptyStats(31),
        moves: [],
        level: 100,
        shiny: false,
      };
      lines.slice(1).forEach((x) => {
        if (/^Ability:/i.test(x)) mon.ability = x.replace(/^Ability:\s*/i, '');
        else if (/^Tera Type:/i.test(x)) mon.tera = norm(x.replace(/^Tera Type:\s*/i, ''));
        else if (/^EVs:/i.test(x)) mon.evs = parseEV(x, 0);
        else if (/^IVs:/i.test(x)) mon.ivs = parseEV(x, 31);
        else if (/^Shiny:/i.test(x)) mon.shiny = /yes/i.test(x);
        else if (/^Level:/i.test(x)) mon.level = +x.replace(/^Level:\s*/i, '') || 100;
        else if (/Nature$/i.test(x)) mon.nature = x.replace(/\s*Nature$/i, '');
        else if (/^-/.test(x)) mon.moves.push(moveName(x.replace(/^[- ]+/, '')));
      });
      if (BOGUS_TERA.test(mon.tera.trim())) mon.tera = '';
      return mon;
    })
    .filter((m): m is TeamMon => m !== null)
    .slice(0, 6);
  return out;
}

const statLabel = (k: string) => ({ hp: 'HP', spa: 'SpA', spd: 'SpD', spe: 'Spe' }[k] || (k[0].toUpperCase() + k.slice(1)));

export function monBlock(mon: Partial<TeamMon>): string {
  const evs = Object.entries(mon.evs || {}).filter(([, v]) => +v).map(([k, v]) => `${v} ${statLabel(k)}`);
  const ivs = Object.entries(mon.ivs || {}).filter(([, v]) => +v !== 31).map(([k, v]) => `${v} ${statLabel(k)}`);
  return `${mon.species} @ ${mon.item || 'No Item'}\nAbility: ${mon.ability || 'Unknown'}\n${mon.level && mon.level !== 100 ? `Level: ${mon.level}\n` : ''}${mon.shiny ? 'Shiny: Yes\n' : ''}${mon.tera ? `Tera Type: ${mon.tera}\n` : ''}${evs.length ? `EVs: ${evs.join(' / ')}\n` : ''}${mon.nature || 'Hardy'} Nature\n${ivs.length ? `IVs: ${ivs.join(' / ')}\n` : ''}${(mon.moves || []).map((m) => `- ${m}`).join('\n')}`.trim();
}

export function teamToText(list: Partial<TeamMon>[]): string {
  return list.map(monBlock).join('\n\n');
}

/**
 * Remove the set-block matching `target` from raw team text, preserving every
 * other block verbatim — including sets beyond the six parseTeam displays and
 * any edits the user made since the last analysis. Prefers a canonical
 * monBlock match, falls back to species so an edited-but-same mon still hits.
 * Returns the text unchanged when no block matches.
 */
export function removeMonFromText(text: string, target: TeamMon): string {
  const blocks = String(text || '').split(/\n\s*\n/);
  const parsed = blocks.map((b) => parseTeam(b)[0]);
  const targetBlock = monBlock(target);
  let idx = parsed.findIndex((m) => m && monBlock(m) === targetBlock);
  if (idx < 0) idx = parsed.findIndex((m) => m && m.species === target.species);
  if (idx < 0) return text;
  blocks.splice(idx, 1);
  return blocks.join('\n\n').trim();
}
