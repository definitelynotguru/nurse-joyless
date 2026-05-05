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
  itemTransferSource: 'move: Trick'
});
assert(liveChoiceRead.input.choiceContradiction === true, 'live transferred Choice items should keep their contradiction active');
assert(liveChoiceRead.input.itemGone === false, 'transferred-in current items should not leave the slot marked empty');
assert(liveChoiceRead.input.revealedItem === 'Choice Specs', 'transferred-in current item should become the live revealed item');

const historicalChoiceRead = context.buildDetectiveRead({
  choiceContradiction: true,
  itemGone: true,
  removedItem: 'Choice Specs',
  acquiredItem: 'Leftovers',
  itemTransferSource: 'move: Switcheroo'
});
assert(historicalChoiceRead.input.choiceContradiction === false, 'old Choice contradictions should clear after a non-Choice swap-in');
assert(historicalChoiceRead.summary.notes.some(note => /Switcheroo replaced Choice Specs with Leftovers/i.test(note)), 'transfer note should explain the new current-item timeline');

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

const bestowRead = context.buildDetectiveRead({
  itemGone: true,
  removedItem: 'Heavy-Duty Boots',
  acquiredItem: 'Leftovers',
  itemTransferSource: 'move: Bestow'
});
assert(bestowRead.input.itemGone === false, 'Bestow should reopen the current item state after an earlier loss');
assert(bestowRead.input.revealedItem === 'Leftovers', 'Bestow should anchor the received item as the live current item');
assert(bestowRead.summary.notes.some(note => /Bestow replaced Heavy-Duty Boots with Leftovers/i.test(note)), 'Bestow should explain the new current-item timeline');

const symbiosisRead = context.buildDetectiveRead({
  itemGone: true,
  acquiredItem: 'Sitrus Berry',
  itemTransferSource: 'ability: Symbiosis'
});
assert(symbiosisRead.input.itemGone === false, 'Symbiosis should reopen an emptied slot once the new item arrives');
assert(symbiosisRead.input.revealedItem === 'Sitrus Berry', 'Symbiosis should promote the received item to the live revealed item');
assert(symbiosisRead.summary.notes.some(note => /Symbiosis revealed Sitrus Berry as the current item/i.test(note)), 'Symbiosis should explain that the slot no longer stays anchored to the old empty-item timeline');

const recycleRead = context.buildDetectiveRead({
  itemGone: true,
  acquiredItem: 'Air Balloon',
  itemTransferSource: 'move: Recycle'
});
assert(recycleRead.input.itemGone === false, 'Recycle should reopen the current item state after earlier loss');
assert(recycleRead.input.revealedItem === 'Air Balloon', 'Recycle should treat the restored item as current');
assert(recycleRead.summary.notes.some(note => /Recycle revealed Air Balloon as the current item/i.test(note)), 'Recycle should explain that the restored item is the new live anchor');

const bestowParser = new context.ReplayParser();
bestowParser.extractEvidence({
  type: '-item',
  target: 'p2a: Great Tusk',
  item: 'Leftovers',
  from: 'move: Bestow',
  raw: '|-item|p2a: Great Tusk|Leftovers|[from] move: Bestow|[of] p1a: Blissey'
}, 9);
const bestowState = bestowParser.ensureState('p2a: Great Tusk');
assert(bestowState.acquiredItem === 'Leftovers', 'Bestow replay events should record the received item');
assert(bestowState.itemGone === false, 'Bestow replay events should clear stale empty-slot state');
assert(bestowState.itemTransferSource === 'move: Bestow', 'Bestow replay events should keep the authoritative source tag');
assert(bestowParser.clues.some(entry => /Bestow revealed Leftovers as the new item/i.test(entry.label)), 'Bestow replay events should create a move-specific clue label');

const symbiosisParser = new context.ReplayParser();
symbiosisParser.extractEvidence({
  type: '-item',
  target: 'p2a: Ogerpon',
  item: 'Choice Scarf',
  from: 'ability: Symbiosis',
  raw: '|-item|p2a: Ogerpon|Choice Scarf|[from] ability: Symbiosis|[of] p2b: Florges'
}, 11);
const symbiosisState = symbiosisParser.ensureState('p2a: Ogerpon');
assert(symbiosisState.acquiredItem === 'Choice Scarf', 'Symbiosis replay events should record the ally-transferred item');
assert(symbiosisState.revealedItem === 'Choice Scarf', 'Symbiosis replay events should treat the received item as live current evidence');
assert(symbiosisState.itemTransferMove === 'Symbiosis', 'Symbiosis replay events should preserve the human-readable source label');
assert(symbiosisParser.evidence.some(entry => /received Choice Scarf from Symbiosis/i.test(entry.text)), 'Symbiosis replay events should add evidence for the new current item');

const harvestParser = new context.ReplayParser();
harvestParser.extractEvidence({
  type: '-item',
  target: 'p2a: Exeggutor',
  item: 'Sitrus Berry',
  from: 'ability: Harvest',
  raw: '|-item|p2a: Exeggutor|Sitrus Berry|[from] ability: Harvest'
}, 13);
const harvestState = harvestParser.ensureState('p2a: Exeggutor');
assert(harvestState.acquiredItem === 'Sitrus Berry', 'Harvest replay events should record the restored item');
assert(harvestState.itemGone === false, 'Harvest replay events should clear stale empty-slot state');
assert(harvestParser.clues.some(entry => /Harvest revealed Sitrus Berry as the new item/i.test(entry.label)), 'Harvest replay events should create an ability-specific clue label');

const thiefParser = new context.ReplayParser();
thiefParser.extractEvidence({
  type: '-enditem',
  target: 'p2a: Hydreigon',
  item: 'Leftovers',
  from: 'move: Thief',
  raw: '|-enditem|p2a: Hydreigon|Leftovers|[from] move: Thief|[of] p1a: Weavile'
}, 5);
thiefParser.extractEvidence({
  type: '-item',
  target: 'p1a: Weavile',
  item: 'Leftovers',
  from: 'move: Thief',
  raw: '|-item|p1a: Weavile|Leftovers|[from] move: Thief|[of] p2a: Hydreigon'
}, 5);
const thiefUserState = thiefParser.ensureState('p1a: Weavile');
const thiefTargetState = thiefParser.ensureState('p2a: Hydreigon');
assert(thiefUserState.acquiredItem === 'Leftovers', 'Thief replay events should record the stolen item on the user');
assert(thiefUserState.revealedItem === 'Leftovers', 'Thief replay events should anchor the stolen item as the user current item');
assert(thiefUserState.itemGone === false, 'Thief replay events should reopen the user current-item state');
assert(thiefUserState.itemTransferSource === 'move: Thief', 'Thief replay events should preserve the theft source');
assert(thiefTargetState.removedItem === 'Leftovers', 'Thief replay events should still preserve the victim removed item historically');
assert(thiefParser.evidence.some(entry => entry.state === 'Weavile' && /received Leftovers from Thief/i.test(entry.text)), 'Thief replay events should add evidence for the stolen current item');
assert(thiefParser.clues.some(entry => entry.state === 'Weavile' && /Thief revealed Leftovers as the new item/i.test(entry.label)), 'Thief replay events should create a theft-specific clue label');

const covetRead = context.buildDetectiveRead({
  itemGone: true,
  acquiredItem: 'Heavy-Duty Boots',
  itemTransferSource: 'move: Covet'
});
assert(covetRead.input.itemGone === false, 'Covet should reopen an emptied slot once the stolen item arrives');
assert(covetRead.input.revealedItem === 'Heavy-Duty Boots', 'Covet should anchor the stolen item as the live current item');
assert(covetRead.summary.notes.some(note => /Covet revealed Heavy-Duty Boots as the current item/i.test(note)), 'Covet should explain the reopened current-item story');

const pickupRead = context.buildDetectiveRead({
  itemGone: true,
  acquiredItem: 'Sitrus Berry',
  itemTransferSource: 'ability: Pickup'
});
assert(pickupRead.input.itemGone === false, 'Pickup should reopen an emptied slot once the found item arrives');
assert(pickupRead.input.revealedItem === 'Sitrus Berry', 'Pickup should anchor the found item as the live current item');
assert(pickupRead.summary.notes.some(note => /Pickup revealed Sitrus Berry as the current item/i.test(note)), 'Pickup should explain that the old empty-slot story is no longer current');

const pickupParser = new context.ReplayParser();
pickupParser.extractEvidence({
  type: '-item',
  target: 'p2a: Greedent',
  item: 'Sitrus Berry',
  from: 'ability: Pickup',
  raw: '|-item|p2a: Greedent|Sitrus Berry|[from] ability: Pickup'
}, 14);
const pickupState = pickupParser.ensureState('p2a: Greedent');
assert(pickupState.acquiredItem === 'Sitrus Berry', 'Pickup replay events should record the found item');
assert(pickupState.itemGone === false, 'Pickup replay events should clear stale empty-slot state');
assert(pickupParser.evidence.some(entry => /received Sitrus Berry from Pickup/i.test(entry.text)), 'Pickup replay events should add evidence for the found current item');

const friskParser = new context.ReplayParser();
friskParser.extractEvidence({
  type: '-item',
  target: 'p2a: Dragapult',
  item: 'Choice Specs',
  from: 'ability: Frisk',
  raw: '|-item|p2a: Dragapult|Choice Specs|[from] ability: Frisk|[of] p1a: Banette'
}, 12);
const friskState = friskParser.ensureState('p2a: Dragapult');
assert(!friskState.acquiredItem, 'pure reveal abilities like Frisk should not be mistaken for item transfers');
assert(friskState.revealedItem === 'Choice Specs', 'pure reveal abilities should keep the base revealed-item behavior only');

console.log('[OK] item transfer timeline upgrades passed');