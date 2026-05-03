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
      summary: { notes: [] }
    };
  },
  ReplayParser: class ReplayParser {
    constructor() {
      this.states = {};
      this.evidence = [];
      this.clues = [];
    }
    ensureState(target = '') {
      const key = String(target || '').trim();
      if (!this.states[key]) {
        this.states[key] = {
          slot: key,
          species: key.includes(':') ? key.split(':').slice(1).join(':').trim() : key,
          abilityHints: []
        };
      }
      return this.states[key];
    }
    addEvidence(state, turn, kind, text, title, weight, meta = {}) {
      this.evidence.push({ state: state.species, turn, kind, text, title, weight, meta });
    }
    addClueObservation(state, clue) {
      this.clues.push({ state: state.species, ...clue });
    }
    extractEvidence(event, turn) {
      if (event?.type === '-enditem' && event?.target) {
        const state = this.ensureState(event.target, event.details);
        state.removedItem = event.item || state.removedItem || '';
        state.itemGone = true;
      }
      if (event?.type === '-item' && event?.target) {
        const state = this.ensureState(event.target, event.details);
        state.revealedItem = event.item || state.revealedItem || '';
      }
      return null;
    }
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
vm.runInContext(
  fs.readFileSync('src/item-transfer-timeline-upgrades.js', 'utf8'),
  context,
  { filename: 'item-transfer-timeline-upgrades.js', timeout: 10000 }
);

const liveChoiceRead = context.buildDetectiveRead({
  choiceContradiction: true,
  itemGone: true,
  removedItem: 'Leftovers',
  acquiredItem: 'Choice Specs',
  itemTransferMove: 'Trick'
});
assert(liveChoiceRead.input.choiceContradiction === true, 'live transferred Choice items should keep their contradiction active');
assert(liveChoiceRead.input.itemGone === false, 'transferred-in current items should not leave the slot marked empty');
assert(liveChoiceRead.input.revealedItem === 'Choice Specs', 'transferred-in current item should become the live revealed item');

const historicalChoiceRead = context.buildDetectiveRead({
  choiceContradiction: true,
  itemGone: true,
  removedItem: 'Choice Specs',
  acquiredItem: 'Leftovers',
  itemTransferMove: 'Switcheroo'
});
assert(historicalChoiceRead.input.choiceContradiction === false, 'old Choice contradictions should clear after a non-Choice swap-in');
assert(historicalChoiceRead.summary.notes.some(note => /Switcheroo swapped away Choice Specs and revealed Leftovers/i.test(note)), 'transfer note should explain the new current-item timeline');

const parser = new context.ReplayParser();
parser.extractEvidence({
  type: '-enditem',
  target: 'p2a: Dragapult',
  item: 'Choice Specs',
  from: 'move: Trick',
  raw: '|-enditem|p2a: Dragapult|Choice Specs|[from] move: Trick|[of] p1a: Rotom-Wash'
}, 7);
parser.extractEvidence({
  type: '-item',
  target: 'p2a: Dragapult',
  item: 'Leftovers',
  from: 'move: Trick',
  raw: '|-item|p2a: Dragapult|Leftovers|[from] move: Trick|[of] p1a: Rotom-Wash'
}, 7);

const dragapultState = parser.ensureState('p2a: Dragapult');
assert(dragapultState.removedItem === 'Choice Specs', 'transfer loss should preserve the swapped-out item historically');
assert(dragapultState.acquiredItem === 'Leftovers', 'transfer gain should preserve the swapped-in item as current evidence');
assert(dragapultState.revealedItem === 'Leftovers', 'transfer gain should update the live revealed item');
assert(dragapultState.itemGone === false, 'receiving a new item should reopen the current item state');
assert(parser.evidence.some(entry => /received Leftovers from Trick/i.test(entry.text)), 'transfer gain should add evidence for the new current item');

console.log('[OK] item transfer timeline upgrades passed');