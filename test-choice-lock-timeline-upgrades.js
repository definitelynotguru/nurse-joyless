const fs = require('fs');
const vm = require('vm');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function makeRead(input) {
  const candidates = [
    { item: 'Choice Specs', prob: 1 },
    { item: 'Choice Scarf', prob: 1 },
    { item: 'Heavy-Duty Boots', prob: 1 },
    { item: 'No Item', prob: 1 }
  ];
  const notes = [];

  candidates.forEach(candidate => {
    if (input.choiceContradiction && /^Choice /.test(candidate.item) && candidate.item !== input.revealedItem) {
      candidate.prob = 0;
      notes.push('Choice items impossible');
    }
    if (input.itemGone && input.removedItem === candidate.item) {
      candidate.prob = 0;
    }
    if (input.itemGone && candidate.item === 'No Item') {
      candidate.prob *= 1.5;
    }
    if ((input.postItemLossProtectionItems || []).includes(candidate.item)) {
      candidate.prob *= 1.6;
    }
  });

  const live = candidates.filter(candidate => candidate.prob > 0);
  return {
    input: { ...input },
    summary: { notes },
    itemRows: live
      .sort((a, b) => b.prob - a.prob)
      .map(candidate => [candidate.item, candidate.prob])
  };
}

const context = {
  console,
  window: null,
  globalThis: null,
  buildDetectiveRead(input) {
    return makeRead(input);
  }
};
context.window = context;
context.globalThis = context;

vm.createContext(context);
vm.runInContext(
  fs.readFileSync('src/choice-lock-timeline-upgrades.js', 'utf8'),
  context,
  { filename: 'choice-lock-timeline-upgrades.js', timeout: 10000 }
);

const cleared = context.buildDetectiveRead({
  species: 'Dragapult',
  choiceContradiction: true,
  itemGone: true,
  removedItem: 'Choice Specs',
  postItemLossProtectionItems: ['Heavy-Duty Boots']
});
assert(cleared.input.clearedHistoricalChoiceLock, 'removed Choice items should clear stale choice-lock contradictions');
assert(cleared.itemRows.some(([name]) => name === 'Choice Scarf'), 'after a removed Choice item, other current Choice lines should stay live instead of being killed by stale history');
assert(cleared.summary.notes.some(note => /only kills Choice Specs as the old item line/i.test(note)), 'timeline-cleared reads should explain why the stale Choice contradiction no longer applies to the current slot');
assert(!cleared.summary.notes.some(note => /Choice items impossible/i.test(note)), 'timeline-cleared reads should drop the generic current-state Choice contradiction note');

const activeLock = context.buildDetectiveRead({
  species: 'Dragapult',
  choiceContradiction: true,
  itemGone: false,
  revealedItem: 'Choice Specs'
});
assert(!activeLock.input.clearedHistoricalChoiceLock, 'live Choice locks should stay active when the item has not left the slot');
assert(!activeLock.itemRows.some(([name]) => name === 'Choice Scarf'), 'live Choice contradictions should still eliminate incompatible current Choice items');
assert(activeLock.summary.notes.some(note => /Choice items impossible/i.test(note)), 'live Choice contradictions should keep the current-state Choice note');

const nonChoiceRemoval = context.buildDetectiveRead({
  species: 'Dragapult',
  choiceContradiction: true,
  itemGone: true,
  removedItem: 'Leftovers'
});
assert(!nonChoiceRemoval.input.clearedHistoricalChoiceLock, 'non-Choice removals should not clear a real current-state Choice contradiction');
assert(!nonChoiceRemoval.itemRows.some(([name]) => name === 'Choice Scarf'), 'non-Choice removals should keep incompatible Choice lines eliminated');

console.log('[OK] choice lock timeline upgrades passed');
