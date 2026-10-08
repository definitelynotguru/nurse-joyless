import { describe, it, expect } from 'vitest';
import { ReplayParser, parseReplay, analyzeReplay, buildReplaySummary, copyReplaySummary } from '../src/engine/replay';
import { preset, loadReplayDetective } from '../src/engine/detective';
import type { ReplayRead, ReplayTarget } from '../src/engine/replay';
import type { TeamMon } from '../src/engine/types';

const TEAM: TeamMon[] = [
  preset('Great Tusk', 'Heavy-Duty Boots', 'Impish', { hp: 252, atk: 4, def: 252, spa: 0, spd: 0, spe: 0 }, ['Close Combat', 'Headlong Rush', 'Rapid Spin', 'Knock Off']),
  preset('Dragonite', 'Heavy-Duty Boots', 'Jolly', { hp: 0, atk: 252, def: 4, spa: 0, spd: 0, spe: 252 }, ['Dragon Dance', 'Extreme Speed', 'Earthquake', 'Fire Punch']),
];

function read(log: string): ReplayRead {
  const parser = new ReplayParser();
  parser.parse(log);
  return parser.replayRead;
}
function target(log: string, species?: string): ReplayTarget | undefined {
  const r = read(log);
  return species ? r.targets.find((t) => t.species === species) : (r.strongest || undefined);
}
function handoff(t: ReplayTarget | undefined) {
  return loadReplayDetective({ strongest: t } as ReplayRead, { team: TEAM });
}

// ---------------------------------------------------------------------------
// test-smoke.js (replay/detective blocks)
// ---------------------------------------------------------------------------
describe('smoke replay parsing', () => {
  const log = '|turn|3\n|switch|p2a: Dragapult|Dragapult, L80\n|move|p2a: Dragapult|Thunder Wave|p1a: Blastoise\n|-damage|p2a: Dragapult|88/100|[from] Stealth Rock\n|move|p2a: Dragapult|Shadow Ball|p1a: Blastoise\n|-damage|p1a: Blastoise|57/100\n|turn|4\n|move|p2a: Dragapult|Draco Meteor|p1a: Blastoise\n|-damage|p1a: Blastoise|12/100\n|-item|p2a: Dragapult|Choice Specs\n';

  it('parses turns and detects Boots/AV/Choice contradictions', () => {
    const parser = new ReplayParser();
    const turns = parser.parse(log);
    expect(turns.length).toBe(2);
    expect(parser.evidence.some((e) => e.conclusion.includes('Heavy-Duty Boots'))).toBe(true);
    expect(parser.evidence.some((e) => e.conclusion.includes('Assault Vest'))).toBe(true);
    expect(parser.evidence.some((e) => e.conclusion.includes('Choice items contradicted'))).toBe(true);
    expect(parser.replayRead.strongest?.species).toBe('Dragapult');
    expect(parser.replayRead.strongest?.revealedItem).toBe('Choice Specs');
    expect(parser.replayRead.strongest?.detectiveInput?.targetSpecies).toBe('Blastoise');
  });

  it('keeps neutral-priority speed context and defender-side direction', () => {
    const speedLog = '|turn|1\n|switch|p1a: Dragonite|Dragonite, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p2a: Gholdengo|Make It Rain|p1a: Dragonite\n|-damage|p1a: Dragonite|55/100\n|move|p1a: Dragonite|Earthquake|p2a: Gholdengo\n|-damage|p2a: Gholdengo|41/100';
    const t = target(speedLog, 'Gholdengo');
    expect(t?.detectiveInput?.speedContext?.opponentSpecies).toBe('Dragonite');
    expect(t?.detectiveInput?.evidence).toBe('i_hit_them');
    expect(t?.detectiveInput?.userSpecies).toBe('Dragonite');
  });

  it('creates a clue-only detective path for immunity-only evidence', () => {
    const immunityLog = '|turn|1\n|switch|p1a: Blastoise|Blastoise, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Blastoise|Thunder Wave|p2a: Gholdengo\n|-immune|p2a: Gholdengo|[from] ability: Good as Gold';
    const t = target(immunityLog, 'Gholdengo');
    expect(t?.revealedAbility).toBe('Good as Gold');
    expect(t?.detectiveInput?.evidence).toBe('clue_only');
    expect(t?.detectiveInput?.clueLabel).toContain('Good as Gold blocked Thunder Wave');
  });

  it('keeps revealed items on item-only clues', () => {
    const itemOnlyLog = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Dragapult|Dragapult, L80\n|-item|p2a: Dragapult|Leftovers';
    expect(target(itemOnlyLog, 'Dragapult')?.revealedItem).toBe('Leftovers');
  });
});

// ---------------------------------------------------------------------------
// test-hidden-info-reasoning.js (replay side)
// ---------------------------------------------------------------------------
describe('hidden-info replay reasoning', () => {
  it('item-only replay clue stays attached and loads a detective branch', () => {
    const log = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Dragapult|Dragapult, L80\n|-item|p2a: Dragapult|Leftovers';
    const t = target(log);
    expect(t?.species).toBe('Dragapult');
    expect(t?.detectiveBranchCount).toBe(1);
    expect(t?.detectiveInputs?.[0]?.clueLabel).toBe('Leftovers confirmed');
    const r = handoff(t);
    expect(r?.top.every((x) => x.item === 'Leftovers')).toBe(true);
    expect(/replay clues/i.test(r?.summary.verdict || '')).toBe(true);
    expect(r?.summary.notes.some((x) => /Leftovers confirmed/.test(x))).toBe(true);
  });

  it('removed-item clues keep history and stop treating the item as current', () => {
    const log = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Dragapult|Dragapult, L80\n|-item|p2a: Dragapult|Leftovers\n|turn|2\n|move|p1a: Great Tusk|Knock Off|p2a: Dragapult\n|-enditem|p2a: Dragapult|Leftovers|[from] move: Knock Off';
    const t = target(log, 'Dragapult');
    expect(t?.removedItem).toBe('Leftovers');
    expect(t?.itemGone).toBe(true);
    expect(t?.revealedItem).toBeFalsy();
    expect(t?.detectiveInputs?.[0]?.clueLabel).toBe('Leftovers was removed by Knock Off');
    expect(t?.notes?.some((n) => /Leftovers was removed/.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.summary.notes.some((x) => /no longer be the current item/i.test(x))).toBe(true);
    expect(r?.itemRows[0][0]).toBe('No Item');
    expect(r?.itemRows.some(([name]) => name === 'Leftovers')).toBe(false);
  });

  it('keeps multiple detective branches for one species', () => {
    const log = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p2a: Gholdengo|Make It Rain|p1a: Great Tusk\n|-damage|p1a: Great Tusk|58/100\n|move|p1a: Great Tusk|Headlong Rush|p2a: Gholdengo\n|-damage|p2a: Gholdengo|29/100\n|-item|p2a: Gholdengo|Leftovers';
    const t = target(log, 'Gholdengo');
    expect(t?.detectiveBranchCount).toBe(2);
    expect(t?.detectiveInputs?.[0]?.label).toContain('Great Tusk into Gholdengo');
    expect(t?.detectiveInputs?.[1]?.label).toContain('Make It Rain');
    const r = loadReplayDetective({ strongest: t } as ReplayRead, { targetIndex: 1, team: TEAM });
    expect(r?.input.evidence).toBe('they_hit_me');
    expect(r?.input.move).toBe('Make It Rain');
  });

  it.each([
    ['Surf', 'Clodsire', 'Water Absorb absorbed Surf'],
    ['Hydro Pump', 'Clodsire', 'Water Absorb absorbed Hydro Pump'],
  ])('ability-heal clues keep move-specific labels: %s', (move, species, label) => {
    const log = `|turn|1\n|switch|p1a: Primarina|Primarina, L80\n|switch|p2a: ${species}|${species}, L80\n|move|p1a: Primarina|${move}|p2a: ${species}\n|-heal|p2a: ${species}|100/100|[from] ability: Water Absorb`;
    const t = target(log);
    expect(t?.species).toBe(species);
    expect(t?.detectiveBranchCount).toBe(1);
    expect(t?.detectiveInputs?.[0]?.label).toContain(label);
  });

  it('water-absorb clue collapses the detective ability pool', () => {
    const log = '|turn|1\n|switch|p1a: Primarina|Primarina, L80\n|switch|p2a: Clodsire|Clodsire, L80\n|move|p1a: Primarina|Surf|p2a: Clodsire\n|-heal|p2a: Clodsire|100/100|[from] ability: Water Absorb';
    const r = handoff(target(log));
    expect(r?.top.every((x) => x.ability === 'Water Absorb')).toBe(true);
    expect(/replay clues/i.test(r?.summary.verdict || '')).toBe(true);
    expect(r?.summary.notes.some((x) => /heal instead of damaging/i.test(x))).toBe(true);
  });

  it('ability-boost clues stay detective-loadable without damage', () => {
    const log = '|turn|1\n|switch|p1a: Zapdos|Zapdos, L80\n|switch|p2a: Seaking|Seaking, L80\n|move|p1a: Zapdos|Thunderbolt|p2a: Seaking\n|-boost|p2a: Seaking|spa|1|[from] ability: Lightning Rod';
    const t = target(log);
    expect(t?.species).toBe('Seaking');
    expect(t?.detectiveBranchCount).toBe(1);
    expect(t?.detectiveInputs?.[0]?.label).toContain('Lightning Rod activated on Thunderbolt');
  });

  it('Earth Eater heal clue stays on the healed target', () => {
    const log = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Orthworm|Orthworm, L80\n|move|p1a: Great Tusk|Earthquake|p2a: Orthworm\n|-heal|p2a: Orthworm|100/100|[from] ability: Earth Eater';
    const t = target(log);
    expect(t?.species).toBe('Orthworm');
    expect(t?.detectiveInputs?.[0]?.label).toContain('Earth Eater absorbed Earthquake');
    const r = handoff(t);
    expect(r?.top.every((x) => x.ability === 'Earth Eater')).toBe(true);
    expect(r?.summary.notes.some((x) => /Ground attacks heal instead of damaging/i.test(x))).toBe(true);
  });

  it('Well-Baked Body boost clue keeps the activation label', () => {
    const log = '|turn|1\n|switch|p1a: Volcarona|Volcarona, L80\n|switch|p2a: Dachsbun|Dachsbun, L80\n|move|p1a: Volcarona|Flamethrower|p2a: Dachsbun\n|-boost|p2a: Dachsbun|def|2|[from] ability: Well-Baked Body';
    const t = target(log);
    expect(t?.species).toBe('Dachsbun');
    expect(t?.detectiveInputs?.[0]?.label).toContain('Well-Baked Body activated on Flamethrower');
    const r = handoff(t);
    expect(r?.top.every((x) => x.ability === 'Well-Baked Body')).toBe(true);
    expect(r?.summary.notes.some((x) => /Defense boost/i.test(x))).toBe(true);
  });

  it('generic ability reveals do not pretend a move caused them', () => {
    const log = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Blaziken|Blaziken, L80\n|move|p2a: Blaziken|Protect|p2a: Blaziken\n|-boost|p2a: Blaziken|spe|1|[from] ability: Speed Boost';
    const t = target(log);
    expect(t?.species).toBe('Blaziken');
    expect(t?.detectiveInputs?.[0]?.label).toBe('Speed Boost revealed');
    expect(t?.notes).toContain('Speed Boost revealed');
    expect(t?.notes?.some((n) => /immunity interaction/i.test(n))).toBe(false);
  });

  it('Air Balloon pops get a specific label and clear Ground immunity', () => {
    const log = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|-item|p2a: Gholdengo|Air Balloon\n|move|p1a: Great Tusk|Knock Off|p2a: Gholdengo\n|-enditem|p2a: Gholdengo|Air Balloon';
    const t = target(log, 'Gholdengo');
    expect(t?.detectiveInputs?.[0]?.clueLabel).toBe('Air Balloon popped');
    expect(t?.notes?.some((n) => /Ground immunity is gone/i.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.itemRows[0][0]).toBe('No Item');
    expect(r?.itemRows.some(([name]) => name === 'Air Balloon')).toBe(false);
    expect(r?.summary.notes.some((x) => /Ground immunity is gone/i.test(x))).toBe(true);
  });

  it('post-pop Spikes chip is marked as happening after the Balloon was gone', () => {
    const log = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|-item|p2a: Gholdengo|Air Balloon\n|move|p1a: Great Tusk|Knock Off|p2a: Gholdengo\n|-enditem|p2a: Gholdengo|Air Balloon\n|turn|2\n|switch|p2a: Gholdengo|Gholdengo, L80\n|-damage|p2a: Gholdengo|88/100|[from] Spikes';
    const t = target(log, 'Gholdengo');
    expect(t?.notes?.some((n) => /Later took Spikes after Air Balloon popped/i.test(n))).toBe(true);
    expect(handoff(t)?.summary.notes.some((x) => /Later took Spikes after Air Balloon popped/i.test(x))).toBe(true);
  });

  it('post-pop hazard-free switch marks protection as regained', () => {
    const log = '|turn|1\n|switch|p1a: Ting-Lu|Ting-Lu, L80\n|-sidestart|p2: Gholdengo|move: Spikes\n|switch|p2a: Gholdengo|Gholdengo, L80\n|-item|p2a: Gholdengo|Air Balloon\n|move|p1a: Ting-Lu|Knock Off|p2a: Gholdengo\n|-enditem|p2a: Gholdengo|Air Balloon\n|turn|2\n|switch|p2a: Gholdengo|Gholdengo, L80';
    const t = target(log, 'Gholdengo');
    expect(t?.postItemLossProtectionRecovered).toBe(true);
    expect(t?.notes?.some((n) => /regained entry protection/i.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.summary.notes.some((x) => /empty slot is no longer the only live current-item story/i.test(x))).toBe(true);
    expect(r?.itemRows[0][0]).not.toBe('No Item');
  });

  it('post-pop Ground damage is attributed to the post-Balloon state', () => {
    const log = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|-item|p2a: Gholdengo|Air Balloon\n|move|p1a: Great Tusk|Knock Off|p2a: Gholdengo\n|-enditem|p2a: Gholdengo|Air Balloon\n|turn|2\n|move|p1a: Great Tusk|Headlong Rush|p2a: Gholdengo\n|-damage|p2a: Gholdengo|38/100';
    const t = target(log, 'Gholdengo');
    expect(t?.notes?.some((n) => /Later took Headlong Rush after Air Balloon popped/i.test(n))).toBe(true);
    expect(handoff(t)?.summary.notes.some((x) => /Later took Headlong Rush after Air Balloon popped/i.test(x))).toBe(true);
  });

  it('post-pop Levitate immunity keeps the ability explanation without inventing item hints', () => {
    const log = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Hydreigon|Hydreigon, L80\n|-item|p2a: Hydreigon|Air Balloon\n|move|p1a: Great Tusk|Knock Off|p2a: Hydreigon\n|-enditem|p2a: Hydreigon|Air Balloon\n|turn|2\n|move|p1a: Great Tusk|Headlong Rush|p2a: Hydreigon\n|-immune|p2a: Hydreigon|[from] ability: Levitate';
    const t = target(log, 'Hydreigon');
    expect(t?.postItemLossGroundProtectionRecovered).toBeFalsy();
    expect(t?.postItemLossGroundProtectionItems || []).toHaveLength(0);
    expect(t?.postItemLossGroundProtectionAbilities).toContain('Levitate');
    expect(t?.notes?.some((n) => /Levitate still cleanly explains the empty-slot current state/i.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.itemRows[0][0]).toBe('No Item');
    expect(r?.abilityRows[0][0]).toBe('Levitate');
    expect(r?.summary.notes.some((x) => /Levitate still cleanly explains the empty-slot current state/i.test(x))).toBe(true);
  });

  it('post-pop item-based Ground immunity reopens Air Balloon as live', () => {
    const log = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|-item|p2a: Gholdengo|Air Balloon\n|move|p1a: Great Tusk|Knock Off|p2a: Gholdengo\n|-enditem|p2a: Gholdengo|Air Balloon\n|turn|2\n|move|p1a: Great Tusk|Headlong Rush|p2a: Gholdengo\n|-immune|p2a: Gholdengo|[from] item: Air Balloon';
    const t = target(log, 'Gholdengo');
    expect(t?.postItemLossGroundProtectionRecovered).toBe(true);
    expect(t?.postItemLossGroundProtectionItems).toContain('Air Balloon');
    expect(t?.notes?.some((n) => /regained Ground protection/i.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.itemRows[0][0]).toBe('Air Balloon');
    expect(r?.summary.notes.some((x) => /empty slot is no longer the only live current-item story/i.test(x))).toBe(true);
  });

  it('Booster Energy activation keeps the cause and the revealed ability', () => {
    const log = '|turn|1\n|switch|p2a: Raging Bolt|Raging Bolt, L80\n|-item|p2a: Raging Bolt|Booster Energy\n|-enditem|p2a: Raging Bolt|Booster Energy|[from] ability: Protosynthesis';
    const t = target(log, 'Raging Bolt');
    expect(t?.detectiveInputs?.[0]?.itemLossLabel).toBe('Booster Energy activated Protosynthesis');
    expect(t?.notes?.some((n) => /one-shot item/i.test(n))).toBe(true);
    expect(t?.revealedAbility).toBe('Protosynthesis');
    const r = handoff(t);
    expect(r?.abilityRows[0][0]).toBe('Protosynthesis');
    expect(r?.summary.notes.some((x) => /Protosynthesis is already revealed/i.test(x))).toBe(true);
  });

  it('Trick transfers keep the new item and explain the old one left', () => {
    const log = '|turn|1\n|switch|p1a: Rotom-Wash|Rotom-Wash, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|-item|p2a: Gholdengo|Air Balloon\n|move|p1a: Rotom-Wash|Trick|p2a: Gholdengo\n|-item|p1a: Rotom-Wash|Air Balloon|[from] move: Trick\n|-item|p2a: Gholdengo|Choice Scarf|[from] move: Trick';
    const t = target(log, 'Gholdengo');
    expect(t?.revealedItem).toBe('Choice Scarf');
    expect(t?.notes?.some((n) => /Air Balloon was traded away by Trick/i.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.itemRows[0][0]).toBe('Choice Scarf');
    expect(r?.summary.notes.some((x) => /Air Balloon was traded away by Trick/i.test(x))).toBe(true);
  });

  it('post-Boots hazard chip belongs to the new post-Boots state', () => {
    const log = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Dragapult|Dragapult, L80\n|-item|p2a: Dragapult|Heavy-Duty Boots\n|move|p1a: Great Tusk|Knock Off|p2a: Dragapult\n|-enditem|p2a: Dragapult|Heavy-Duty Boots|[from] move: Knock Off\n|turn|2\n|switch|p2a: Dragapult|Dragapult, L80\n|-damage|p2a: Dragapult|88/100|[from] Stealth Rock';
    const t = target(log, 'Dragapult');
    expect(t?.notes?.some((n) => /Later took Stealth Rock after Heavy-Duty Boots were removed/i.test(n))).toBe(true);
    expect(handoff(t)?.summary.notes.some((x) => /Later took Stealth Rock after Heavy-Duty Boots were removed/i.test(x))).toBe(true);
  });

  it('post-Boots hazard-free switch marks hazard protection regained', () => {
    const log = '|turn|1\n|switch|p1a: Ting-Lu|Ting-Lu, L80\n|-sidestart|p2: Dragapult|move: Stealth Rock\n|switch|p2a: Dragapult|Dragapult, L80\n|-item|p2a: Dragapult|Heavy-Duty Boots\n|move|p1a: Ting-Lu|Knock Off|p2a: Dragapult\n|-enditem|p2a: Dragapult|Heavy-Duty Boots|[from] move: Knock Off\n|turn|2\n|switch|p2a: Dragapult|Dragapult, L80';
    const t = target(log, 'Dragapult');
    expect(t?.postItemLossProtectionRecovered).toBe(true);
    expect(t?.notes?.some((n) => /regained hazard protection/i.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.summary.notes.some((x) => /empty slot is no longer the only live current-item story/i.test(x))).toBe(true);
    expect(r?.itemRows[0][0]).not.toBe('No Item');
  });

  it.each([
    ['Hydreigon', 'Spikes', 'Levitate'],
    ['Clefable', 'Stealth Rock', 'Magic Guard'],
  ])('ability-explained missing %s keeps the empty slot as the top item read', (species, hazard, ability) => {
    const log = `|turn|1\n|switch|p1a: Ting-Lu|Ting-Lu, L80\n|-sidestart|p2: ${species}|move: ${hazard}\n|switch|p2a: ${species}|${species}, L80\n|-item|p2a: ${species}|Heavy-Duty Boots\n|move|p1a: Ting-Lu|Knock Off|p2a: ${species}\n|-enditem|p2a: ${species}|Heavy-Duty Boots|[from] move: Knock Off\n|turn|2\n|switch|p2a: ${species}|${species}, L80`;
    const t = target(log, species);
    expect(t?.postItemLossProtectionRecovered).toBeFalsy();
    expect(t?.postItemLossProtectionItems || []).toHaveLength(0);
    expect(t?.postItemLossProtectionAbilities).toContain(ability);
    expect(t?.notes?.some((n) => new RegExp(`${ability} still cleanly explains the empty-slot current state`, 'i').test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.itemRows[0][0]).toBe('No Item');
    expect(r?.abilityRows[0][0]).toBe(ability);
    expect(r?.summary.notes.some((x) => new RegExp(`${ability} still cleanly explains`, 'i').test(x))).toBe(true);
  });

  it('post-pop Toxic Spikes poison is attributed to the post-Balloon state', () => {
    const log = '|turn|1\n|switch|p1a: Gliscor|Gliscor, L80\n|-sidestart|p2: Great Tusk|move: Toxic Spikes\n|switch|p2a: Great Tusk|Great Tusk, L80\n|-item|p2a: Great Tusk|Air Balloon\n|move|p1a: Gliscor|Knock Off|p2a: Great Tusk\n|-enditem|p2a: Great Tusk|Air Balloon\n|turn|2\n|switch|p2a: Great Tusk|Great Tusk, L80\n|-status|p2a: Great Tusk|psn|[from] move: Toxic Spikes';
    const t = target(log, 'Great Tusk');
    expect(t?.notes?.some((n) => /Later got poisoned by Toxic Spikes after Air Balloon popped/i.test(n))).toBe(true);
    expect(handoff(t)?.summary.notes.some((x) => /Later got poisoned by Toxic Spikes after Air Balloon popped/i.test(x))).toBe(true);
  });

  it('post-Boots no-poison Toxic Spikes entry marks protection regained', () => {
    const log = '|turn|1\n|switch|p1a: Gliscor|Gliscor, L80\n|-sidestart|p2: Great Tusk|move: Toxic Spikes\n|switch|p2a: Great Tusk|Great Tusk, L80\n|-item|p2a: Great Tusk|Heavy-Duty Boots\n|move|p1a: Gliscor|Knock Off|p2a: Great Tusk\n|-enditem|p2a: Great Tusk|Heavy-Duty Boots|[from] move: Knock Off\n|turn|2\n|switch|p2a: Great Tusk|Great Tusk, L80';
    const t = target(log, 'Great Tusk');
    expect(t?.postItemLossProtectionRecovered).toBe(true);
    expect(t?.notes?.some((n) => /without getting poisoned/i.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.summary.notes.some((x) => /empty slot is no longer the only live current-item story/i.test(x))).toBe(true);
    expect(r?.itemRows[0][0]).not.toBe('No Item');
  });

  it('post-pop Sticky Web trigger is attributed to the post-Balloon state', () => {
    const log = '|turn|1\n|switch|p1a: Ribombee|Ribombee, L80\n|-sidestart|p2: Great Tusk|move: Sticky Web\n|switch|p2a: Great Tusk|Great Tusk, L80\n|-item|p2a: Great Tusk|Air Balloon\n|move|p1a: Ribombee|Knock Off|p2a: Great Tusk\n|-enditem|p2a: Great Tusk|Air Balloon\n|turn|2\n|switch|p2a: Great Tusk|Great Tusk, L80\n|-activate|p2a: Great Tusk|move: Sticky Web';
    const t = target(log, 'Great Tusk');
    expect(t?.notes?.some((n) => /Later triggered Sticky Web after Air Balloon popped/i.test(n))).toBe(true);
    expect(handoff(t)?.summary.notes.some((x) => /Later triggered Sticky Web after Air Balloon popped/i.test(x))).toBe(true);
  });

  it('post-Boots no-activate Sticky Web entry marks protection regained', () => {
    const log = '|turn|1\n|switch|p1a: Ribombee|Ribombee, L80\n|-sidestart|p2: Great Tusk|move: Sticky Web\n|switch|p2a: Great Tusk|Great Tusk, L80\n|-item|p2a: Great Tusk|Heavy-Duty Boots\n|move|p1a: Ribombee|Knock Off|p2a: Great Tusk\n|-enditem|p2a: Great Tusk|Heavy-Duty Boots|[from] move: Knock Off\n|turn|2\n|switch|p2a: Great Tusk|Great Tusk, L80';
    const t = target(log, 'Great Tusk');
    expect(t?.postItemLossProtectionRecovered).toBe(true);
    expect(t?.notes?.some((n) => /without getting slowed/i.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.summary.notes.some((x) => /empty slot is no longer the only live current-item story/i.test(x))).toBe(true);
    expect(r?.itemRows[0][0]).not.toBe('No Item');
  });

  it('blocked-status clues stay move-specific for unseen status moves', () => {
    const log = '|turn|1\n|switch|p1a: Grimmsnarl|Grimmsnarl, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Grimmsnarl|Encore|p2a: Gholdengo\n|-immune|p2a: Gholdengo|[from] ability: Good as Gold';
    expect(target(log)?.detectiveInputs?.[0]?.label).toBe('Good as Gold blocked Encore');
  });

  it('unseen status moves still mark Assault Vest contradictions', () => {
    const log = '|turn|1\n|switch|p2a: Dragapult|Dragapult, L80\n|move|p2a: Dragapult|Taunt|p1a: Great Tusk';
    const t = target(log, 'Dragapult');
    expect(t?.usedStatusMove).toBe(true);
    expect(t?.notes).toContain('Assault Vest ruled out');
  });

  it('priority moves do not fake neutral-priority speed clues', () => {
    const log = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Raging Bolt|Raging Bolt, L80\n|move|p2a: Raging Bolt|Thunderclap|p1a: Great Tusk\n|-damage|p1a: Great Tusk|78/100\n|move|p1a: Great Tusk|Earthquake|p2a: Raging Bolt\n|-damage|p2a: Raging Bolt|32/100';
    const t = target(log, 'Raging Bolt');
    const branch = t?.detectiveInputs?.find((i) => i.move === 'Thunderclap' && i.evidence === 'they_hit_me');
    expect(branch?.speedContext).toBeFalsy();
  });

  it('keeps evidence across slot switches without faking Choice contradictions', () => {
    const log = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Dragapult|Dragapult, L80\n|move|p2a: Dragapult|Shadow Ball|p1a: Great Tusk\n|-damage|p1a: Great Tusk|57/100\n|-item|p2a: Dragapult|Leftovers\n|turn|2\n|switch|p2a: Gholdengo|Gholdengo, L80\n|turn|3\n|switch|p2a: Dragapult|Dragapult, L80\n|move|p2a: Dragapult|Draco Meteor|p1a: Great Tusk\n|-damage|p1a: Great Tusk|12/100';
    const t = target(log, 'Dragapult');
    expect(t).toBeTruthy();
    expect(t?.revealedItem).toBe('Leftovers');
    expect(t?.detectiveBranchCount).toBe(2);
    expect(t?.choiceContradiction).toBeFalsy();
    expect(t?.detectiveInputs.some((i) => i.move === 'Shadow Ball')).toBe(true);
    expect(t?.detectiveInputs.some((i) => i.move === 'Draco Meteor')).toBe(true);
  });

  it('same-species mirror targets stay separate per side', () => {
    const log = '|turn|1\n|switch|p1a: Dragapult|Dragapult, L80\n|switch|p2a: Dragapult|Dragapult, L80\n|move|p1a: Dragapult|Thunder Wave|p2a: Dragapult\n|move|p2a: Dragapult|Shadow Ball|p1a: Dragapult\n|-damage|p1a: Dragapult|57/100\n|-item|p2a: Dragapult|Choice Specs';
    const r = read(log);
    const mirrors = r.targets.filter((t) => t.species === 'Dragapult');
    expect(mirrors.length).toBe(2);
    const player = mirrors.find((t) => t.side === 'p1');
    const opp = mirrors.find((t) => t.side === 'p2');
    expect(player?.usedStatusMove).toBe(true);
    expect(player?.revealedItem).toBeFalsy();
    expect(opp?.revealedItem).toBe('Choice Specs');
    expect(opp?.usedStatusMove).toBeFalsy();
    expect(opp?.detectiveInputs?.some((i) => i.move === 'Shadow Ball')).toBe(true);
  });

  it('keeps per-branch speed context across multiple exchanges', () => {
    const log = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p2a: Gholdengo|Make It Rain|p1a: Great Tusk\n|-damage|p1a: Great Tusk|55/100\n|move|p1a: Great Tusk|Headlong Rush|p2a: Gholdengo\n|-damage|p2a: Gholdengo|42/100\n|turn|2\n|switch|p1a: Dragapult|Dragapult, L80\n|move|p1a: Dragapult|Shadow Ball|p2a: Gholdengo\n|-damage|p2a: Gholdengo|15/100\n|move|p2a: Gholdengo|Shadow Ball|p1a: Dragapult\n|-damage|p1a: Dragapult|58/100';
    const t = target(log, 'Gholdengo');
    const makeItRain = t?.detectiveInputs?.find((i) => i.move === 'Make It Rain' && i.evidence === 'they_hit_me');
    const dragapult = t?.detectiveInputs?.find((i) => i.userSpecies === 'Dragapult' && i.evidence === 'i_hit_them');
    expect(makeItRain?.speedContext?.relation).toBe('fasterThan');
    expect(makeItRain?.speedContext?.opponentSpecies).toBe('Great Tusk');
    expect(dragapult?.speedContext?.relation).toBe('slowerThan');
    expect(dragapult?.speedContext?.opponentSpecies).toBe('Dragapult');
    // handoff preserves speed context
    const fast = loadReplayDetective({ strongest: { species: 'Gholdengo', detectiveInput: makeItRain } } as unknown as ReplayRead, { team: TEAM });
    expect(fast?.input.speedContext?.relation).toBe('fasterThan');
    expect(fast?.input.speedContext?.opponentSpecies).toBe('Great Tusk');
    const slow = loadReplayDetective({ strongest: { species: 'Gholdengo', detectiveInput: dragapult } } as unknown as ReplayRead, { team: TEAM });
    expect(slow?.input.speedContext?.relation).toBe('slowerThan');
    expect(slow?.input.speedContext?.opponentSpecies).toBe('Dragapult');
  });

  it('pre-loss hazard chip stays historical after the item leaves', () => {
    const log = '|turn|1\n|-sidestart|p2: foe|move: Stealth Rock\n|switch|p2a: Dragapult|Dragapult, L80\n|-damage|p2a: Dragapult|88/100|[from] Stealth Rock\n|-item|p2a: Dragapult|Leftovers\n|turn|2\n|-enditem|p2a: Dragapult|Leftovers|[from] move: Knock Off\n|turn|3\n|switch|p2a: Dragapult|Dragapult, L80';
    const t = target(log, 'Dragapult');
    expect(t?.historicalHazardDamage).toBe(true);
    expect(t?.tookHazardDamage).toBeFalsy();
    expect(t?.detectiveInputs?.[0]?.postItemLossProtectionItems).toContain('Heavy-Duty Boots');
    const r = handoff(t);
    expect(r?.summary.notes.some((x) => /Earlier hazard chip only ruled out Boots before the old item left/i.test(x))).toBe(true);
    expect(r?.summary.notes.some((x) => /Heavy-Duty Boots live/i.test(x))).toBe(true);
    expect(r?.itemRows.some(([name]) => name === 'Heavy-Duty Boots')).toBe(true);
    expect(r?.itemRows.some(([name]) => name === 'No Item')).toBe(false);
  });

  it('earlier Stealth Rock chip still rules out Magic Guard even if protection returns', () => {
    const log = '|turn|1\n|-sidestart|p2: foe|move: Stealth Rock\n|switch|p2a: Clefable|Clefable, L80\n|-damage|p2a: Clefable|88/100|[from] Stealth Rock\n|-item|p2a: Clefable|Leftovers\n|turn|2\n|-enditem|p2a: Clefable|Leftovers|[from] move: Knock Off\n|turn|3\n|switch|p2a: Clefable|Clefable, L80';
    const t = target(log, 'Clefable');
    expect(t?.ruledOutAbilities).toContain('Magic Guard');
    const r = handoff(t);
    expect(r?.summary.notes.some((x) => /Magic Guard impossible/i.test(x))).toBe(true);
    expect(r?.abilityRows.some(([name]) => name === 'Magic Guard')).toBe(false);
  });

  it.each([
    ['Hydreigon', 'Spikes', 'Levitate'],
    ['Clefable', 'Stealth Rock', 'Magic Guard'],
  ])('taking %s rules out %s', (species, hazard, ability) => {
    const log = `|turn|1\n|-sidestart|p2: ${species}|move: ${hazard}\n|switch|p2a: ${species}|${species}, L80\n|-damage|p2a: ${species}|88/100|[from] ${hazard}`;
    const t = target(log, species);
    expect(t?.ruledOutAbilities).toContain(ability);
    expect(t?.notes?.some((n) => new RegExp(`Taking ${hazard} rules out ${ability}`, 'i').test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.abilityRows.some(([name]) => name === ability)).toBe(false);
    expect(r?.summary.notes.some((x) => new RegExp(ability, 'i').test(x))).toBe(true);
  });

  it('taking Flamethrower rules out Flash Fire (merged contradiction wording)', () => {
    // merged semantic: the outermost move-immunity layer rewrites the note to
    // 'X successfully landed, so Y impossible as the current ability.'
    const log = '|turn|1\n|switch|p1a: Volcarona|Volcarona, L80\n|switch|p2a: Heatran|Heatran, L80\n|move|p1a: Volcarona|Flamethrower|p2a: Heatran\n|-damage|p2a: Heatran|72/100';
    const t = target(log, 'Heatran');
    expect(t?.ruledOutAbilities).toContain('Flash Fire');
    expect(t?.notes?.some((n) => /Flamethrower successfully landed|Taking Flamethrower rules out Flash Fire/i.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.abilityRows.some(([name]) => name === 'Flash Fire')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// test-replay-ability-upgrades.js
// ---------------------------------------------------------------------------
describe('replay ability upgrades', () => {
  it('reactive boost clue keeps the real move name', () => {
    const log = '|turn|1\n|switch|p1a: Rillaboom|Rillaboom, L80\n|switch|p2a: Azumarill|Azumarill, L80\n|move|p1a: Rillaboom|Grassy Glide|p2a: Azumarill\n|-boost|p2a: Azumarill|atk|1|[from] ability: Sap Sipper';
    expect(target(log)?.detectiveInputs?.[0]?.label).toBe('Sap Sipper activated on Grassy Glide');
  });

  it('status-immunity clue stays move-specific', () => {
    const log = '|turn|1\n|switch|p1a: Serperior|Serperior, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Serperior|Glare|p2a: Gholdengo\n|-immune|p2a: Gholdengo|[from] ability: Good as Gold';
    expect(target(log)?.detectiveInputs?.[0]?.label).toBe('Good as Gold blocked Glare');
  });

  it.each([
    ['Taunt', 'move: Taunt', 'Taunt'],
    ['Confuse Ray', 'confusion', 'Confuse Ray'],
    ['Powder', 'move: Powder', 'Powder', '-singleturn'],
    ['Leech Seed', 'move: Leech Seed', 'Leech Seed'],
  ])('landed %s effects rule out Good as Gold and stay detective-loadable', (move, effect, _label, evt = '-start') => {
    const users: Record<string, string> = { Taunt: 'Grimmsnarl', 'Confuse Ray': 'Flutter Mane', Powder: 'Vivillon', 'Leech Seed': 'Ferrothorn' };
    const log = `|turn|1\n|switch|p1a: ${users[move]}|${users[move]}, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: ${users[move]}|${move}|p2a: Gholdengo\n|${evt}|p2a: Gholdengo|${effect}`;
    const t = target(log, 'Gholdengo');
    expect(t?.ruledOutAbilities).toContain('Good as Gold');
    expect(t?.notes?.some((n) => new RegExp(`${move} successfully landed`, 'i').test(n))).toBe(true);
    expect(t?.detectiveInputs?.some((i) => i.label === `${move} landed`)).toBe(true);
  });

  it('successful status application rules out Good as Gold', () => {
    const log = '|turn|1\n|switch|p1a: Dragapult|Dragapult, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Dragapult|Thunder Wave|p2a: Gholdengo\n|-status|p2a: Gholdengo|par';
    const t = target(log, 'Gholdengo');
    expect(t?.ruledOutAbilities).toContain('Good as Gold');
    expect(t?.notes?.some((n) => /Thunder Wave successfully landed/i.test(n))).toBe(true);
    expect(t?.detectiveInputs?.some((i) => i.label === 'Thunder Wave landed')).toBe(true);
  });

  it('landed reflected-status moves rule out Magic Bounce', () => {
    const log = '|turn|1\n|switch|p1a: Grimmsnarl|Grimmsnarl, L80\n|switch|p2a: Hatterene|Hatterene, L80\n|move|p1a: Grimmsnarl|Taunt|p2a: Hatterene\n|-start|p2a: Hatterene|move: Taunt';
    const t = target(log, 'Hatterene');
    expect(t?.ruledOutAbilities).toContain('Magic Bounce');
    expect(t?.notes?.some((n) => /Taunt successfully landed/i.test(n))).toBe(true);
  });

  it('hazards landing on the target side rule out Magic Bounce', () => {
    const log = '|turn|1\n|switch|p1a: Ting-Lu|Ting-Lu, L80\n|switch|p2a: Hatterene|Hatterene, L80\n|move|p1a: Ting-Lu|Stealth Rock|p2a: Hatterene\n|-sidestart|p2: Hatterene|move: Stealth Rock';
    const t = target(log, 'Hatterene');
    expect(t?.ruledOutAbilities).toContain('Magic Bounce');
    expect(t?.notes?.some((n) => /Stealth Rock successfully landed/i.test(n))).toBe(true);
    expect(t?.detectiveInputs?.[0]?.label).toBe('Stealth Rock landed');
    const r = handoff(t);
    expect(r?.abilityRows.some(([name]) => name === 'Magic Bounce')).toBe(false);
    expect(r?.summary.notes.some((x) => /Magic Bounce impossible/i.test(x))).toBe(true);
  });

  it('landed Leech Seed drives every Gholdengo line to Blocked', () => {
    const log = '|turn|1\n|switch|p1a: Ferrothorn|Ferrothorn, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Ferrothorn|Leech Seed|p2a: Gholdengo\n|-start|p2a: Gholdengo|move: Leech Seed';
    const r = handoff(target(log, 'Gholdengo'));
    expect(r?.summary.confidence.label).toBe('Blocked');
    expect(r?.summary.notes.some((x) => /Good as Gold impossible/.test(x))).toBe(true);
  });

  it('damaging status riders do not fake Good as Gold contradictions', () => {
    const log = '|turn|1\n|switch|p1a: Dragapult|Dragapult, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Dragapult|Nuzzle|p2a: Gholdengo\n|-damage|p2a: Gholdengo|92/100\n|-status|p2a: Gholdengo|par';
    const t = target(log, 'Gholdengo');
    expect(t?.ruledOutAbilities || []).not.toContain('Good as Gold');
    expect(t?.notes?.some((n) => /Nuzzle successfully landed/i.test(n))).toBeFalsy();
  });

  it('pure status moves outside the local table still rule out Good as Gold', () => {
    const log = '|turn|1\n|switch|p1a: Serperior|Serperior, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Serperior|Glare|p2a: Gholdengo\n|-status|p2a: Gholdengo|par';
    const t = target(log, 'Gholdengo');
    expect(t?.ruledOutAbilities).toContain('Good as Gold');
    expect(t?.notes?.some((n) => /Glare successfully landed/i.test(n))).toBe(true);
  });

  it('unknown damaging riders neither fake GaG nor invent landed notes', () => {
    const log = '|turn|1\n|switch|p1a: Luxray|Luxray, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Luxray|Thunder Fang|p2a: Gholdengo\n|-damage|p2a: Gholdengo|91/100\n|-status|p2a: Gholdengo|par';
    const t = target(log, 'Gholdengo');
    expect(t?.ruledOutAbilities || []).not.toContain('Good as Gold');
    expect(t?.notes?.some((n) => /Thunder Fang successfully landed/i.test(n))).toBeFalsy();
    expect(t?.notes?.some((n) => /Taking Thunder Fang/i.test(n))).toBe(false);
  });

  it('paralysis through Nuzzle still rules out Limber', () => {
    const log = '|turn|1\n|switch|p1a: Dragapult|Dragapult, L80\n|switch|p2a: Toxapex|Toxapex, L80\n|move|p1a: Dragapult|Nuzzle|p2a: Toxapex\n|-damage|p2a: Toxapex|94/100\n|-status|p2a: Toxapex|par';
    const t = target(log, 'Toxapex');
    expect(t?.ruledOutAbilities).toContain('Limber');
    expect(t?.notes?.some((n) => /Nuzzle successfully caused paralysis/i.test(n))).toBe(true);
    expect(handoff(t)?.abilityRows.some(([name]) => name === 'Limber')).toBe(false);
  });

  it('successful major status rules out Purifying Salt', () => {
    const log = '|turn|1\n|switch|p1a: Dragapult|Dragapult, L80\n|switch|p2a: Garganacl|Garganacl, L80\n|move|p1a: Dragapult|Thunder Wave|p2a: Garganacl\n|-status|p2a: Garganacl|par';
    const t = target(log, 'Garganacl');
    expect(t?.ruledOutAbilities).toContain('Purifying Salt');
    const r = handoff(t);
    expect(r?.abilityRows.some(([name]) => name === 'Purifying Salt')).toBe(false);
    expect(r?.summary.notes.some((x) => /Purifying Salt impossible/i.test(x))).toBe(true);
  });

  it('status landing in sun rules out Leaf Guard; outside sun stays silent', () => {
    const sunLog = '|turn|1\n|switch|p1a: Torkoal|Torkoal, L80\n|-weather|SunnyDay|[from] ability: Drought|[of] p1a: Torkoal\n|switch|p2a: Leafeon|Leafeon, L80\n|move|p1a: Torkoal|Thunder Wave|p2a: Leafeon\n|-status|p2a: Leafeon|par';
    const t = target(sunLog, 'Leafeon');
    expect(t?.ruledOutAbilities).toContain('Leaf Guard');
    expect(t?.notes?.some((n) => /Thunder Wave successfully caused paralysis/i.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.abilityRows.some(([name]) => name === 'Leaf Guard')).toBe(false);
    expect(r?.summary.notes.some((x) => /Leaf Guard impossible/i.test(x))).toBe(true);

    const noSunLog = '|turn|1\n|switch|p1a: Torkoal|Torkoal, L80\n|switch|p2a: Leafeon|Leafeon, L80\n|move|p1a: Torkoal|Thunder Wave|p2a: Leafeon\n|-status|p2a: Leafeon|par';
    const t2 = target(noSunLog, 'Leafeon');
    expect(t2?.ruledOutAbilities || []).not.toContain('Leaf Guard');
    expect(t2?.notes?.some((n) => /Leaf Guard/i.test(n))).toBeFalsy();
  });

  it('stray status with no linked move fabricates no contradictions', () => {
    const log = '|turn|1\n|switch|p1a: Skeledirge|Skeledirge, L80\n|switch|p2a: Great Tusk|Great Tusk, L80\n|-status|p2a: Great Tusk|brn';
    const t = target(log, 'Great Tusk');
    expect(t?.ruledOutAbilities || []).toHaveLength(0);
  });

  it('Gastro Acid suppresses later status contradictions', () => {
    const log = '|turn|1\n|switch|p1a: Dragapult|Dragapult, L80\n|switch|p2a: Garganacl|Garganacl, L80\n|move|p1a: Dragapult|Gastro Acid|p2a: Garganacl\n|-start|p2a: Garganacl|Gastro Acid\n|move|p1a: Dragapult|Thunder Wave|p2a: Garganacl\n|-status|p2a: Garganacl|par';
    const t = target(log, 'Garganacl');
    expect(t?.ruledOutAbilities || []).not.toContain('Purifying Salt');
    expect(t?.notes?.some((n) => /Gastro Acid suppressed the target's ability/i.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.abilityRows[0][0]).toBe('Purifying Salt');
    expect(r?.summary.notes.some((x) => /Gastro Acid suppressed the target's ability/i.test(x))).toBe(true);
  });

  it('Ground damage after Gastro Acid does not fake a Levitate contradiction', () => {
    const log = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Hydreigon|Hydreigon, L80\n|move|p1a: Great Tusk|Gastro Acid|p2a: Hydreigon\n|-start|p2a: Hydreigon|Gastro Acid\n|move|p1a: Great Tusk|Headlong Rush|p2a: Hydreigon\n|-damage|p2a: Hydreigon|38/100';
    expect(target(log, 'Hydreigon')?.ruledOutAbilities || []).not.toContain('Levitate');
  });

  it('Neutralizing Gas suppresses status contradictions and explains it', () => {
    const log = '|turn|1\n|switch|p1a: Weezing-Galar|Weezing-Galar, L80\n|-ability|p1a: Weezing-Galar|Neutralizing Gas\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Weezing-Galar|Thunder Wave|p2a: Gholdengo\n|-status|p2a: Gholdengo|par';
    const t = target(log, 'Gholdengo');
    expect(t?.ruledOutAbilities || []).not.toContain('Good as Gold');
    expect(t?.notes?.some((n) => /Neutralizing Gas from Weezing-Galar suppressed the target's ability/i.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.abilityRows[0][0]).toBe('Good as Gold');
    expect(r?.summary.notes.some((x) => /Neutralizing Gas from Weezing-Galar suppressed the target's ability/i.test(x))).toBe(true);
  });

  it('Neutralizing Gas suppresses hazard contradictions', () => {
    const log = '|turn|1\n|switch|p1a: Weezing-Galar|Weezing-Galar, L80\n|-ability|p1a: Weezing-Galar|Neutralizing Gas\n|switch|p2a: Hatterene|Hatterene, L80\n|move|p1a: Weezing-Galar|Stealth Rock|p2a: Hatterene\n|-sidestart|p2: Hatterene|move: Stealth Rock';
    const t = target(log, 'Hatterene');
    expect(t?.ruledOutAbilities || []).not.toContain('Magic Bounce');
    expect(t?.notes?.some((n) => /Neutralizing Gas from Weezing-Galar suppressed the target's ability/i.test(n))).toBe(true);
  });

  it('Neutralizing Gas keeps the Boots post-loss explanation honest', () => {
    const log = '|turn|1\n|switch|p1a: Ting-Lu|Ting-Lu, L80\n|-sidestart|p2: Clefable|move: Stealth Rock\n|switch|p2a: Clefable|Clefable, L80\n|-item|p2a: Clefable|Leftovers\n|move|p1a: Ting-Lu|Knock Off|p2a: Clefable\n|-enditem|p2a: Clefable|Leftovers|[from] move: Knock Off\n|turn|2\n|switch|p1a: Weezing-Galar|Weezing-Galar, L80\n|-ability|p1a: Weezing-Galar|Neutralizing Gas\n|switch|p2a: Clefable|Clefable, L80';
    const t = target(log, 'Clefable');
    expect(t?.postItemLossProtectionRecovered).toBe(true);
    expect(t?.postItemLossProtectionItems).toContain('Heavy-Duty Boots');
    expect(t?.postItemLossProtectionAbilities || []).toHaveLength(0);
    expect(t?.notes?.some((n) => /Neutralizing Gas from Weezing-Galar was suppressing abilities then, so this only keeps/i.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.itemRows[0][0]).toBe('Heavy-Duty Boots');
    expect(r?.summary.notes.some((x) => /Neutralizing Gas from Weezing-Galar was suppressing abilities then, so this only keeps/i.test(x))).toBe(true);
    expect(r?.summary.notes.some((x) => /Later entry protection keeps Magic Guard live/i.test(x))).toBeFalsy();
  });

  it('once Magic Guard is ruled out, suppressed recovery does not resurrect it', () => {
    const log = '|turn|1\n|-sidestart|p2: foe|move: Stealth Rock\n|switch|p2a: Clefable|Clefable, L80\n|-damage|p2a: Clefable|88/100|[from] Stealth Rock\n|-item|p2a: Clefable|Leftovers\n|turn|2\n|-enditem|p2a: Clefable|Leftovers|[from] move: Knock Off\n|turn|3\n|switch|p2a: Clefable|Clefable, L80';
    const t = target(log, 'Clefable');
    expect(t?.postItemLossProtectionRecovered).toBe(true);
    expect(t?.postItemLossProtectionItems).toContain('Heavy-Duty Boots');
    expect(t?.postItemLossProtectionAbilities || []).not.toContain('Magic Guard');
    expect(t?.notes?.some((n) => /Magic Guard still cleanly explains/i.test(n))).toBeFalsy();
    const r = handoff(t);
    expect(r?.itemRows.some(([name]) => name === 'Heavy-Duty Boots')).toBe(true);
    expect(r?.summary.notes.some((x) => /Later entry protection keeps Magic Guard live/i.test(x))).toBeFalsy();
  });

  it('Neutralizing Gas end restores contradictions without keeping the note', () => {
    const log = '|turn|1\n|switch|p1a: Weezing-Galar|Weezing-Galar, L80\n|-ability|p1a: Weezing-Galar|Neutralizing Gas\n|switch|p2a: Gholdengo|Gholdengo, L80\n|turn|2\n|switch|p1a: Dragapult|Dragapult, L80\n|move|p1a: Dragapult|Thunder Wave|p2a: Gholdengo\n|-status|p2a: Gholdengo|par';
    const t = target(log, 'Gholdengo');
    expect(t?.ruledOutAbilities).toContain('Good as Gold');
  });

  it('side-targeting hazards do not fabricate a Good as Gold handoff', () => {
    const log = '|turn|1\n|switch|p1a: Gliscor|Gliscor, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Gliscor|Stealth Rock|p2a: Gholdengo\n|-sidestart|p2: Gholdengo|move: Stealth Rock';
    const t = target(log, 'Gholdengo');
    expect(t?.ruledOutAbilities || []).not.toContain('Good as Gold');
    expect(t?.notes?.some((n) => /ruling out Good as Gold|Good as Gold impossible/i.test(n))).toBeFalsy();
    const read = { strongest: t } as ReplayRead;
    expect(loadReplayDetective(read, { team: TEAM })).toBeFalsy();
  });

  it('Mold Breaker bypass explains why Good as Gold stayed live', () => {
    const log = '|turn|1\n|switch|p1a: Haxorus|Haxorus, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Haxorus|Thunder Wave|p2a: Gholdengo\n|-ability|p1a: Haxorus|Mold Breaker\n|-status|p2a: Gholdengo|par';
    const t = target(log, 'Gholdengo');
    expect(t?.ruledOutAbilities || []).not.toContain('Good as Gold');
    expect(t?.notes?.some((n) => /Mold Breaker let Thunder Wave bypass Good as Gold/i.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.abilityRows[0][0]).toBe('Good as Gold');
    expect(r?.summary.notes.some((x) => /Mold Breaker let Thunder Wave bypass Good as Gold/i.test(x))).toBe(true);
  });

  it('Mold Breaker bypass keeps Purifying Salt live', () => {
    const log = '|turn|1\n|switch|p1a: Haxorus|Haxorus, L80\n|switch|p2a: Garganacl|Garganacl, L80\n|move|p1a: Haxorus|Thunder Wave|p2a: Garganacl\n|-ability|p1a: Haxorus|Mold Breaker\n|-status|p2a: Garganacl|par';
    const t = target(log, 'Garganacl');
    expect(t?.ruledOutAbilities || []).not.toContain('Purifying Salt');
    expect(t?.notes?.some((n) => /Mold Breaker let Thunder Wave bypass Purifying Salt/i.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.abilityRows[0][0]).toBe('Purifying Salt');
    expect(r?.summary.notes.some((x) => /Mold Breaker let Thunder Wave bypass Purifying Salt/i.test(x))).toBe(true);
  });

  it('Turboblaze bypass keeps Flash Fire live', () => {
    const log = '|turn|1\n|switch|p1a: Reshiram|Reshiram, L80\n|switch|p2a: Heatran|Heatran, L80\n|move|p1a: Reshiram|Flamethrower|p2a: Heatran\n|-ability|p1a: Reshiram|Turboblaze\n|-damage|p2a: Heatran|61/100';
    const t = target(log, 'Heatran');
    expect(t?.ruledOutAbilities || []).not.toContain('Flash Fire');
    expect(t?.notes?.some((n) => /Turboblaze let Flamethrower bypass Flash Fire/i.test(n))).toBe(true);
  });

  it('Mold Breaker bypass keeps Levitate live on Ground damage', () => {
    const log = '|turn|1\n|switch|p1a: Haxorus|Haxorus, L80\n|switch|p2a: Hydreigon|Hydreigon, L80\n|move|p1a: Haxorus|Headlong Rush|p2a: Hydreigon\n|-ability|p1a: Haxorus|Mold Breaker\n|-damage|p2a: Hydreigon|36/100';
    const t = target(log, 'Hydreigon');
    expect(t?.ruledOutAbilities || []).not.toContain('Levitate');
    expect(t?.notes?.some((n) => /Mold Breaker let Headlong Rush bypass Levitate/i.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.abilityRows[0][0]).toBe('Levitate');
    expect(r?.summary.notes.some((x) => /Mold Breaker let Headlong Rush bypass Levitate/i.test(x))).toBe(true);
  });

  it('earlier contradictions survive later Mold Breaker windows', () => {
    const rushLog = '|turn|1\n|-sidestart|p2: Hydreigon|move: Spikes\n|switch|p2a: Hydreigon|Hydreigon, L80\n|-damage|p2a: Hydreigon|88/100|[from] Spikes\n|turn|2\n|switch|p1a: Haxorus|Haxorus, L80\n|move|p1a: Haxorus|Headlong Rush|p2a: Hydreigon\n|-ability|p1a: Haxorus|Mold Breaker\n|-damage|p2a: Hydreigon|36/100';
    const t = target(rushLog, 'Hydreigon');
    expect(t?.ruledOutAbilities).toContain('Levitate');
    expect(t?.notes?.some((n) => /Mold Breaker let Headlong Rush bypass Levitate/i.test(n))).toBeFalsy();

    const twLog = '|turn|1\n|switch|p1a: Dragapult|Dragapult, L80\n|switch|p2a: Garganacl|Garganacl, L80\n|move|p1a: Dragapult|Thunder Wave|p2a: Garganacl\n|-status|p2a: Garganacl|par\n|turn|2\n|switch|p1a: Haxorus|Haxorus, L80\n|move|p1a: Haxorus|Thunder Wave|p2a: Garganacl\n|-ability|p1a: Haxorus|Mold Breaker\n|-status|p2a: Garganacl|par';
    const t2 = target(twLog, 'Garganacl');
    expect(t2?.ruledOutAbilities).toContain('Purifying Salt');
    expect(t2?.notes?.some((n) => /Mold Breaker let Thunder Wave bypass Purifying Salt/i.test(n))).toBeFalsy();
  });

  it('delayed Toxic Spikes aftermath is not misread as protection returning', () => {
    const log = '|turn|1\n|switch|p1a: Gliscor|Gliscor, L80\n|-sidestart|p2: Great Tusk|move: Toxic Spikes\n|switch|p2a: Great Tusk|Great Tusk, L80\n|-item|p2a: Great Tusk|Heavy-Duty Boots\n|move|p1a: Gliscor|Knock Off|p2a: Great Tusk\n|-enditem|p2a: Great Tusk|Heavy-Duty Boots|[from] move: Knock Off\n|turn|2\n|switch|p2a: Great Tusk|Great Tusk, L80\n|-status|p2a: Great Tusk|psn|[from] move: Toxic Spikes';
    const t = target(log, 'Great Tusk');
    expect(t?.postItemLossProtectionRecovered).toBeFalsy();
    expect(t?.notes?.some((n) => /without getting poisoned/i.test(n))).toBeFalsy();
    expect(t?.notes?.some((n) => /Later got poisoned by Toxic Spikes after Heavy-Duty Boots were removed/i.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.summary.notes.some((x) => /empty slot is no longer the only live current-item story/i.test(x))).toBeFalsy();
    expect(r?.itemRows[0][0]).toBe('No Item');
  });

  it.each([false, true])('curing an old status does not reopen the post-loss item story (NGas=%s)', (gas) => {
    const middle = gas
      ? '\n|turn|2\n|switch|p1a: Weezing-Galar|Weezing-Galar, L80\n|-ability|p1a: Weezing-Galar|Neutralizing Gas\n|switch|p2a: Sandaconda|Sandaconda, L80\n|-curestatus|p2a: Sandaconda|brn'
      : '\n|turn|2\n|switch|p2a: Sandaconda|Sandaconda, L80\n|-curestatus|p2a: Sandaconda|brn';
    const log = `|turn|1\n|-sidestart|p2: Sandaconda|move: Toxic Spikes\n|switch|p2a: Sandaconda|Sandaconda, L80\n|-status|p2a: Sandaconda|brn\n|-item|p2a: Sandaconda|Heavy-Duty Boots\n|move|p1a: Dragapult|Knock Off|p2a: Sandaconda\n|-enditem|p2a: Sandaconda|Heavy-Duty Boots|[from] move: Knock Off${middle}`;
    const t = target(log, 'Sandaconda');
    expect(t?.postItemLossProtectionRecovered).toBeFalsy();
    expect(t?.postItemLossProtectionItems || []).not.toContain('Heavy-Duty Boots');
    expect(t?.notes?.some((n) => /standing burn already explains/i.test(n))).toBe(true);
    expect(t?.notes?.some((n) => /regained hazard protection/i.test(n))).toBeFalsy();
    if (gas) expect(t?.notes?.some((n) => /only keeps Heavy-Duty Boots live/i.test(n))).toBeFalsy();
    const r = handoff(t);
    expect(r?.itemRows[0][0]).toBe('No Item');
    expect(r?.summary.notes.some((x) => /Heavy-Duty Boots live/i.test(x))).toBeFalsy();
    expect(r?.summary.notes.some((x) => /standing burn already explains/i.test(x))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// test-replay-status-control-upgrades.js
// ---------------------------------------------------------------------------
describe('replay status-control upgrades', () => {
  it.each([
    ['Grimmsnarl', 'Taunt', 'move: Taunt', 'Slowbro', 'Oblivious'],
    ['Banette', 'Confuse Ray', 'confusion', 'Slowbro', 'Own Tempo'],
    ['Whimsicott', 'Encore', 'Encore', 'Aromatisse', 'Aroma Veil'],
  ])('landed %s rules out %s', (user, move, effect, species, ability) => {
    const log = `|turn|1\n|switch|p1a: ${user}|${user}, L80\n|switch|p2a: ${species}|${species}, L80\n|move|p1a: ${user}|${move}|p2a: ${species}\n|-start|p2a: ${species}|${effect}`;
    const t = target(log, species);
    expect(t?.ruledOutAbilities).toContain(ability);
    expect(t?.notes?.some((n) => new RegExp(`${move} successfully landed`, 'i').test(n))).toBe(true);
    expect(t?.detectiveInputs?.some((i) => i.label === `${move} landed`)).toBe(true);
  });

  it('bypass/suppression windows keep control abilities live', () => {
    const parser = new ReplayParser();
    expect(parser.moveAbilityBypassProtectedAbilities({ species: 'Aromatisse' } as never, 'Taunt')).toContain('Aroma Veil');
    // a recorded Mold Breaker bypass window keeps Oblivious live through the real path
    parser.turnMoves.push({ slot: 'p1a: Grimmsnarl', species: 'Grimmsnarl', move: 'Taunt', priority: 0, abilityBypass: 'Mold Breaker' });
    expect(parser.moveBlockedAbilities({ species: 'Slowbro', slot: 'p2a' } as never, 'Taunt')).not.toContain('Oblivious');
    expect(parser.moveBlockedAbilities({ species: 'Slowbro', abilitySuppressed: true } as never, 'Taunt')).not.toContain('Oblivious');
    expect(parser.abilityTriggeredByMove('Oblivious', 'Taunt')).toBe(true);
    expect(parser.abilityTriggeredByMove('Own Tempo', 'Confuse Ray')).toBe(true);
    expect(parser.abilityClueLabelWithProof('Aroma Veil', 'Encore', true)).toBe('Aroma Veil blocked Encore');
    expect(parser.abilityRewardText('Own Tempo')).toMatch(/confusion/i);
    expect(parser.reactiveAbilityProof('Oblivious')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// test-replay-mycilium-might.js
// ---------------------------------------------------------------------------
describe('mycelium might replay windows', () => {
  it('status application under Mycelium Might keeps Good as Gold live with a note', () => {
    const log = '|turn|1\n|switch|p1a: Toedscruel|Toedscruel, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Toedscruel|Thunder Wave|p2a: Gholdengo\n|-ability|p1a: Toedscruel|Mycelium Might\n|-status|p2a: Gholdengo|par';
    const t = target(log, 'Gholdengo');
    expect(t?.ruledOutAbilities || []).not.toContain('Good as Gold');
    expect(t?.notes?.some((n) => /Mycelium Might let Thunder Wave bypass Good as Gold/i.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.abilityRows[0][0]).toBe('Good as Gold');
    expect(r?.summary.notes.some((x) => /Mycelium Might let Thunder Wave bypass Good as Gold/i.test(x))).toBe(true);
  });

  it('Mycelium Might hazards keep Magic Bounce live', () => {
    const log = '|turn|1\n|switch|p1a: Toedscruel|Toedscruel, L80\n|switch|p2a: Hatterene|Hatterene, L80\n|move|p1a: Toedscruel|Stealth Rock|p2a: Hatterene\n|-ability|p1a: Toedscruel|Mycelium Might\n|-sidestart|p2: Hatterene|move: Stealth Rock';
    const t = target(log, 'Hatterene');
    expect(t?.ruledOutAbilities || []).not.toContain('Magic Bounce');
    expect(t?.notes?.some((n) => /Mycelium Might let Stealth Rock bypass Magic Bounce/i.test(n))).toBe(true);
  });

  it('side-targeting hazards under Mycelium Might do not invent GaG notes', () => {
    const log = '|turn|1\n|switch|p1a: Toedscruel|Toedscruel, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Toedscruel|Stealth Rock|p2a: Gholdengo\n|-ability|p1a: Toedscruel|Mycelium Might\n|-sidestart|p2: Gholdengo|move: Stealth Rock';
    const t = target(log, 'Gholdengo');
    expect(t?.ruledOutAbilities || []).not.toContain('Good as Gold');
    expect(t?.notes?.some((n) => /Good as Gold/i.test(n))).toBeFalsy();
    const r = loadReplayDetective({ strongest: t } as ReplayRead, { team: TEAM });
    if (r) {
      expect(r.abilityRows[0][0]).toBe('Good as Gold');
      expect(r.summary.notes.some((x) => /Good as Gold/i.test(x))).toBeFalsy();
    }
  });

  it('Mycelium Might status application keeps Purifying Salt live', () => {
    const log = '|turn|1\n|switch|p1a: Toedscruel|Toedscruel, L80\n|switch|p2a: Garganacl|Garganacl, L80\n|move|p1a: Toedscruel|Thunder Wave|p2a: Garganacl\n|-ability|p1a: Toedscruel|Mycelium Might\n|-status|p2a: Garganacl|par';
    const t = target(log, 'Garganacl');
    expect(t?.ruledOutAbilities || []).not.toContain('Purifying Salt');
    expect(t?.notes?.some((n) => /Mycelium Might let Thunder Wave bypass Purifying Salt/i.test(n))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// test-replay-neutralizing-gas-end.js
// ---------------------------------------------------------------------------
describe('neutralizing gas end', () => {
  it('explicit end line restores contradictions and drops the suppression note', () => {
    const log = '|turn|1\n|switch|p1a: Weezing-Galar|Weezing-Galar, L80\n|-ability|p1a: Weezing-Galar|Neutralizing Gas\n|switch|p2a: Gholdengo|Gholdengo, L80\n|turn|2\n|-end|p1a: Weezing-Galar|ability: Neutralizing Gas\n|move|p1a: Dragapult|Thunder Wave|p2a: Gholdengo\n|-status|p2a: Gholdengo|par';
    const t = target(log, 'Gholdengo');
    expect(t?.ruledOutAbilities).toContain('Good as Gold');
    expect(t?.notes?.some((n) => /Neutralizing Gas from Weezing-Galar suppressed/i.test(n))).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// test-item-transfer-timeline-upgrades.js + followup-loss
// ---------------------------------------------------------------------------
describe('item-transfer timeline', () => {
  it('parser tracks transfer state on -item events', () => {
    const parser = new ReplayParser();
    parser.extractEvidence({ type: '-item', target: 'p2a: Dragapult', item: 'Leftovers', from: 'move: Trick', raw: '|-item|p2a: Dragapult|Leftovers|[from] move: Trick|[of] p1a: Rotom-Wash' } as never, 7);
    const state = parser.ensureState('p2a: Dragapult');
    expect(state.acquiredItem).toBe('Leftovers');
    expect(state.revealedItem).toBe('Leftovers');
    expect(state.itemGone).toBe(false);
    expect(state.itemTransferSource).toBe('move: Trick');
    expect(state.itemTransferMove).toBe('Trick');
    expect(parser.evidence.some((e) => /received Leftovers from Trick/i.test(e.text))).toBe(true);
    expect(state.clueObservations.some((c) => /Trick revealed Leftovers as the new item/i.test(c.label))).toBe(true);
  });

  it.each([
    ['Bestow', 'move: Bestow', 'p2a: Dragapult'],
    ['Symbiosis', 'ability: Symbiosis', 'p2a: Dragapult'],
    ['Harvest', 'ability: Harvest', 'p2a: Tropius'],
    ['Pickup', 'ability: Pickup', 'p2a: Ambipom'],
    ['Recycle', 'move: Recycle', 'p2a: Snorlax'],
    ['Refurbish', 'move: Refurbish', 'p2a: Dachsbun'],
    ['Thief', 'move: Thief', 'p2a: Weavile'],
    ['Covet', 'move: Covet', 'p2a: Cinccino'],
  ])('%s transfer marks the new current item', (label, source, slot) => {
    const parser = new ReplayParser();
    const item = label === 'Symbiosis' ? 'Choice Scarf' : label === 'Covet' ? 'Heavy-Duty Boots' : label === 'Thief' ? 'Leftovers' : 'Sitrus Berry';
    const useItem = label === 'Bestow' ? 'Leftovers' : item;
    parser.extractEvidence({ type: '-item', target: slot, item: useItem, from: source, raw: `|-item|${slot}|${useItem}|[from] ${source}` } as never, 7);
    const state = parser.ensureState(slot);
    expect(state.acquiredItem).toBe(useItem);
    expect(state.revealedItem).toBe(useItem);
    expect(state.itemGone).toBe(false);
    expect(state.itemTransferSource).toBe(source);
    expect(parser.evidence.some((e) => new RegExp(`received ${useItem} from ${label}`, 'i').test(e.text))).toBe(true);
    expect(state.clueObservations.some((c) => new RegExp(`${label} revealed ${useItem} as the new item`, 'i').test(c.label))).toBe(true);
  });

  it('later loss of the transferred item keeps the slot empty', () => {
    const parser = new ReplayParser();
    parser.extractEvidence({ type: '-item', target: 'p2a: Dragapult', item: 'Leftovers', from: 'move: Trick', raw: '|-item|p2a: Dragapult|Leftovers|[from] move: Trick|[of] p1a: Rotom-Wash' } as never, 7);
    parser.extractEvidence({ type: '-enditem', target: 'p2a: Dragapult', item: 'Leftovers', from: 'move: Knock Off', raw: '|-enditem|p2a: Dragapult|Leftovers|[from] move: Knock Off|[of] p1a: Great Tusk' } as never, 8);
    const state = parser.ensureState('p2a: Dragapult');
    expect(state.itemGone).toBe(true);
    expect(state.acquiredItem).toBeFalsy();
    expect(state.currentTransferredItem).toBeFalsy();
    expect(state.revealedItem).toBeFalsy();
  });

  it('Frisk-style reveals do not mark a transfer', () => {
    const parser = new ReplayParser();
    parser.extractEvidence({ type: '-item', target: 'p2a: Dragapult', item: 'Choice Specs', from: 'ability: Frisk', raw: '|-item|p2a: Dragapult|Choice Specs|[from] ability: Frisk' } as never, 3);
    const state = parser.ensureState('p2a: Dragapult');
    expect(state.acquiredItem).toBeFalsy();
    expect(state.revealedItem).toBe('Choice Specs');
  });
});

// ---------------------------------------------------------------------------
// test-move-immunity-* (parser side)
// ---------------------------------------------------------------------------
describe('move-immunity parser layer', () => {
  it.each([
    ['Volcarona', 'Bug Buzz', 'Kommo-o', 'Soundproof'],
    ['Dragapult', 'Shadow Ball', 'Kommo-o', 'Bulletproof'],
    ['Tornadus-Therian', 'Bleakwind Storm', 'Brambleghast', 'Wind Rider'],
  ])('%s landing rules out %s and the note explains it', (user, move, species, ability) => {
    const log = `|turn|1\n|switch|p1a: ${user}|${user}, L80\n|switch|p2a: ${species}|${species}, L80\n|move|p1a: ${user}|${move}|p2a: ${species}\n|-damage|p2a: ${species}|70/100`;
    const t = target(log, species);
    expect(t?.ruledOutAbilities).toContain(ability);
    expect(t?.notes?.some((n) => new RegExp(`${move} successfully landed`, 'i').test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.abilityRows.some(([name]) => name === ability)).toBe(false);
    expect(r?.summary.notes.some((x) => new RegExp(`${ability} impossible`, 'i').test(x))).toBe(true);
  });

  it.each([
    ['Amoonguss', 'Sleep Powder', 'Kommo-o', 'Overcoat', 'Overcoat blocked Sleep Powder'],
    ['Volcarona', 'Bug Buzz', 'Kommo-o', 'Soundproof', 'Soundproof blocked Bug Buzz'],
    ['Dragapult', 'Shadow Ball', 'Kommo-o', 'Bulletproof', 'Bulletproof blocked Shadow Ball'],
  ])('immunity clues keep the move name: %s', (user, move, species, _ability, label) => {
    const ability = label.split(' ')[0];
    const log = `|turn|1\n|switch|p1a: ${user}|${user}, L80\n|switch|p2a: ${species}|${species}, L80\n|move|p1a: ${user}|${move}|p2a: ${species}\n|-immune|p2a: ${species}|[from] ability: ${ability}`;
    expect(target(log)?.detectiveInputs?.[0]?.label).toBe(label);
  });

  it('Wind Rider boost clues keep the wind move name', () => {
    const log = '|turn|1\n|switch|p1a: Tornadus-Therian|Tornadus-Therian, L80\n|switch|p2a: Brambleghast|Brambleghast, L80\n|move|p1a: Tornadus-Therian|Bleakwind Storm|p2a: Brambleghast\n|-boost|p2a: Brambleghast|atk|1|[from] ability: Wind Rider';
    expect(target(log)?.detectiveInputs?.[0]?.label).toBe('Wind Rider activated on Bleakwind Storm');
  });

  it('successful powder status rules out Overcoat; non-powder status stays silent', () => {
    const powderLog = '|turn|1\n|switch|p1a: Amoonguss|Amoonguss, L80\n|switch|p2a: Kommo-o|Kommo-o, L80\n|move|p1a: Amoonguss|Sleep Powder|p2a: Kommo-o\n|-status|p2a: Kommo-o|slp';
    const t = target(powderLog, 'Kommo-o');
    expect(t?.ruledOutAbilities).toContain('Overcoat');
    expect(t?.notes?.some((n) => /Sleep Powder successfully landed/i.test(n))).toBe(true);
    const r = handoff(t);
    expect(r?.abilityRows.some(([name]) => name === 'Overcoat')).toBe(false);
    expect(r?.summary.notes.some((x) => /Overcoat impossible/i.test(x))).toBe(true);

    const twLog = '|turn|1\n|switch|p1a: Dragapult|Dragapult, L80\n|switch|p2a: Kommo-o|Kommo-o, L80\n|move|p1a: Dragapult|Thunder Wave|p2a: Kommo-o\n|-status|p2a: Kommo-o|par';
    const t2 = target(twLog, 'Kommo-o');
    expect(t2?.ruledOutAbilities || []).not.toContain('Overcoat');
    expect(t2?.notes?.some((n) => /Overcoat/i.test(n))).toBeFalsy();
  });

  it('family helpers and clue labels recognize covered moves', () => {
    const parser = new ReplayParser();
    expect(parser.abilityTriggeredByMove('Soundproof', 'Sing')).toBe(true);
    expect(parser.abilityTriggeredByMove('Wind Rider', 'Gust')).toBe(true);
    expect(parser.abilityTriggeredByMove('Overcoat', 'Rage Powder')).toBe(true);
    expect(parser.moveBlockedAbilities({ species: 'Kommo-o' } as never, 'Sing')).toContain('Soundproof');
    expect(parser.moveBlockedAbilities({ species: 'Kommo-o' } as never, 'Bullet Seed')).toContain('Bulletproof');
    expect(parser.moveBlockedAbilities({ species: 'Kommo-o' } as never, 'Rage Powder')).toContain('Overcoat');
    expect(parser.abilityClueLabel('Soundproof', 'Boomburst')).toBe('Soundproof blocked Boomburst');
    expect(parser.abilityClueLabel('Bulletproof', 'Electro Ball')).toBe('Bulletproof blocked Electro Ball');
    expect(parser.abilityClueLabel('Wind Rider', 'Fairy Wind')).toBe('Wind Rider activated on Fairy Wind');
    expect(parser.moveContradictionNote({ species: 'Kommo-o' } as never, 'Boomburst')).toBe('Boomburst successfully landed, so Soundproof impossible as the current ability.');
  });

  it('Tailwind counts as a Wind Rider trigger but not a contradiction', () => {
    const parser = new ReplayParser();
    expect(parser.moveBlockedAbilities({ species: 'Brambleghast' } as never, 'Gust')).toContain('Wind Rider');
    expect(parser.moveBlockedAbilities({ species: 'Brambleghast', slot: 'p2a' } as never, 'Tailwind')).not.toContain('Wind Rider');
    expect(parser.moveContradictionNote({ species: 'Brambleghast' } as never, 'Tailwind')).toBe('');
    expect(parser.abilityTriggeredByMove('Wind Rider', 'Tailwind')).toBe(true);
    expect(parser.abilityClueLabel('Wind Rider', 'Tailwind')).toBe('Wind Rider activated on Tailwind');
    expect(parser.abilityClueLabelWithProof('Wind Rider', 'Tailwind', true)).toBe('Wind Rider activated on Tailwind');
  });

  it('bypass windows keep immunity abilities live on replays', () => {
    const parser = new ReplayParser();
    parser.turnMoves.push(
      { slot: 'p1a: Haxorus', species: 'Haxorus', move: 'Bug Buzz', priority: 0, abilityBypass: 'Mold Breaker' },
      { slot: 'p1a: Reshiram', species: 'Reshiram', move: 'Shadow Ball', priority: 0, abilityBypass: 'Turboblaze' },
      { slot: 'p1a: Zekrom', species: 'Zekrom', move: 'Bleakwind Storm', priority: 0, abilityBypass: 'Teravolt' },
      { slot: 'p1a: Toedscruel', species: 'Toedscruel', move: 'Sleep Powder', priority: 0, abilityBypass: 'Mycelium Might' },
    );
    expect(parser.moveBlockedAbilities({ species: 'Kommo-o', slot: 'p2a' } as never, 'Bug Buzz')).not.toContain('Soundproof');
    expect(parser.moveBlockedAbilities({ species: 'Kommo-o', slot: 'p2a' } as never, 'Shadow Ball')).not.toContain('Bulletproof');
    expect(parser.moveBlockedAbilities({ species: 'Brambleghast', slot: 'p2a' } as never, 'Bleakwind Storm')).not.toContain('Wind Rider');
    expect(parser.moveBlockedAbilities({ species: 'Kommo-o', slot: 'p2a' } as never, 'Sleep Powder')).not.toContain('Overcoat');
    // the latest Bug Buzz window without a bypass marker still rules out Soundproof
    parser.turnMoves.push({ slot: 'p1a: Vivillon', species: 'Vivillon', move: 'Bug Buzz', priority: 0 });
    expect(parser.moveBlockedAbilities({ species: 'Kommo-o', slot: 'p2a' } as never, 'Bug Buzz')).toContain('Soundproof');
  });
});

// ---------------------------------------------------------------------------
// module-level API
// ---------------------------------------------------------------------------
describe('module API', () => {
  const log = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Dragapult|Dragapult, L80\n|move|p2a: Dragapult|Shadow Ball|p1a: Great Tusk\n|-damage|p1a: Great Tusk|57/100\n|-item|p2a: Dragapult|Leftovers';

  it('parseReplay returns turns, evidence, and the read', () => {
    const parsed = parseReplay(log);
    expect(parsed.turns.length).toBe(1);
    expect(parsed.evidence.length).toBeGreaterThan(0);
    expect(parsed.read.strongest?.species).toBe('Dragapult');
    expect(parsed.parser).toBeInstanceOf(ReplayParser);
  });

  it('analyzeReplay groups evidence by turn', () => {
    const analysis = analyzeReplay(log);
    expect(analysis.targetCount).toBeGreaterThan(0);
    expect(analysis.strongest?.species).toBe('Dragapult');
    expect(Object.keys(analysis.evidenceByTurn)).toContain('1');
  });

  it('buildReplaySummary builds the summary payload without a clipboard', () => {
    const parsed = parseReplay(log);
    const summary = buildReplaySummary(parsed.read);
    expect(summary.targetCount).toBe(parsed.read.targets.length);
    expect(summary.strongest?.species).toBe('Dragapult');
    expect(summary.text.length).toBeGreaterThan(0);
    expect(summary.lines[0]).toContain('Dragapult');
    // legacy alias
    expect(copyReplaySummary(parsed.read).text).toBe(summary.text);
    const empty = buildReplaySummary({ targets: [], strongest: null });
    expect(empty.lines[0]).toBe('No replay evidence parsed.');
  });
});

describe('attacker-controlled input caps', () => {
  it('parse truncates oversized logs instead of processing them fully', () => {
    const parser = new ReplayParser();
    const huge = `${'|turn|1\n'.repeat(60_000)}|turn|2\n|move|p1a: X|Tackle|p2a: Y\n`;
    expect(() => parser.parse(huge)).not.toThrow();
    expect(parser.turns.length).toBeLessThanOrEqual(50_000);
    expect(parser.truncated).toBe(true);
    expect(parseReplay('|turn|1\n|move|p1a: X|Tackle|p2a: Y').truncated).toBe(false);
  });
});
