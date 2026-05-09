const fs = require('fs');
const vm = require('vm');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const context = {
  console,
  window: null,
  globalThis: null,
  buildDetectiveRead(input = {}) {
    return {
      input: { ...input },
      itemRows: [['Leftovers', 56], ['Heavy-Duty Boots', 31]],
      top: [
        { item: 'Leftovers', ability: 'Magic Guard', profile: 'bulky', prob: 0.51, itemScore: 56 },
        { item: 'Heavy-Duty Boots', ability: 'Magic Guard', profile: 'bulky', prob: 0.29, itemScore: 31 },
        { item: 'Life Orb', ability: 'Magic Guard', profile: 'offense', prob: 0.2, itemScore: 18 }
      ],
      summary: { notes: ['Base detective output'] }
    };
  }
};
context.window = context;
context.globalThis = context;

vm.createContext(context);
vm.runInContext(
  fs.readFileSync('src/revealed-item-anchor-upgrades.js', 'utf8'),
  context,
  { filename: 'revealed-item-anchor-upgrades.js', timeout: 10000 }
);

const safetyGogglesRead = context.buildDetectiveRead({
  evidence: 'clue_only',
  clueLabel: 'Safety Goggles blocked Sleep Powder',
  revealedItem: 'Safety Goggles'
});
assert(safetyGogglesRead.itemRows[0][0] === 'Safety Goggles', 'replay-proven uncommon items should be surfaced as the live item row');
assert(safetyGogglesRead.top.every(candidate => candidate.item === 'Safety Goggles'), 'replay-proven uncommon items should overwrite incompatible top candidate items');
assert(safetyGogglesRead.summary.notes.some(note => /Safety Goggles was replay-confirmed as the current item/i.test(note)), 'replay-proven uncommon items should explain why the detective hard-anchored the item');

const boosterEnergyRead = context.buildDetectiveRead({
  evidence: 'clue_only',
  clueLabel: 'Booster Energy confirmed',
  acquiredItem: 'Booster Energy'
});
assert(boosterEnergyRead.itemRows[0][0] === 'Booster Energy', 'acquired current items should also hard-anchor when the default pool misses them');
assert(boosterEnergyRead.top.every(candidate => candidate.item === 'Booster Energy'), 'acquired current items should replace incompatible top candidate items');

const consumedRedCardRead = context.buildDetectiveRead({
  evidence: 'clue_only',
  clueLabel: 'Red Card was consumed',
  revealedItem: 'Red Card',
  removedItem: 'Red Card',
  itemGone: true
});
assert(consumedRedCardRead.itemRows[0][0] === 'Leftovers', 'consumed historical items should not be revived as current');
assert(!consumedRedCardRead.summary.notes.some(note => /Red Card was replay-confirmed as the current item/i.test(note)), 'consumed historical items should stay off the hard-anchor path');

const alreadyAnchoredRead = context.buildDetectiveRead({
  evidence: 'clue_only',
  clueLabel: 'Air Balloon confirmed',
  revealedItem: 'Air Balloon'
});
assert(alreadyAnchoredRead.itemRows.length === 1, 'hard-anchored replay items should collapse the item rows to the confirmed current item');
assert(alreadyAnchoredRead.top.length >= 1, 'hard-anchored replay items should keep at least one candidate line alive');

console.log('[OK] revealed item anchor upgrades passed');