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
    extractEvidence(event) {
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

const staleTransferRead = context.buildDetectiveRead({
  itemGone: true,
  removedItem: 'Leftovers',
  acquiredItem: 'Leftovers',
  itemTransferSource: 'move: Trick'
});
assert(staleTransferRead.input.itemGone === true, 'a later loss of the transferred-in item should keep the slot empty');
assert(staleTransferRead.input.revealedItem !== 'Leftovers', 'a later loss should not resurrect the old transferred item as current');
assert(!staleTransferRead.summary.notes.some(note => /Trick/i.test(note)), 'later item loss should suppress stale transfer notes');

const parser = new context.ReplayParser();
parser.extractEvidence({
  type: '-item',
  target: 'p2a: Dragapult',
  item: 'Leftovers',
  from: 'move: Trick',
  raw: '|-item|p2a: Dragapult|Leftovers|[from] move: Trick|[of] p1a: Rotom-Wash'
}, 7);
parser.extractEvidence({
  type: '-enditem',
  target: 'p2a: Dragapult',
  item: 'Leftovers',
  from: 'move: Knock Off',
  raw: '|-enditem|p2a: Dragapult|Leftovers|[from] move: Knock Off|[of] p1a: Great Tusk'
}, 8);

const dragapultState = parser.ensureState('p2a: Dragapult');
assert(dragapultState.itemGone === true, 'later Knock Off should keep the slot marked itemless');
assert(!dragapultState.acquiredItem, 'later Knock Off should clear the stale transferred-in current item');
assert(!dragapultState.currentTransferredItem, 'later Knock Off should clear the stale transferred current-item anchor');
assert(!dragapultState.revealedItem, 'later Knock Off should clear the stale revealed current item');

const postLossRead = context.buildDetectiveRead({
  itemGone: dragapultState.itemGone,
  removedItem: dragapultState.removedItem,
  acquiredItem: dragapultState.acquiredItem,
  currentTransferredItem: dragapultState.currentTransferredItem,
  revealedItem: dragapultState.revealedItem,
  itemTransferSource: dragapultState.itemTransferSource
});
assert(postLossRead.input.itemGone === true, 'detective handoff after the later loss should stay on the empty-slot path');
assert(postLossRead.input.revealedItem !== 'Leftovers', 'detective handoff after the later loss should not re-anchor to the old transfer item');
assert(!postLossRead.summary.notes.some(note => /replaced/i.test(note)), 'detective handoff after the later loss should drop stale transfer replacement notes');

console.log('[OK] item transfer follow-up loss regression passed');