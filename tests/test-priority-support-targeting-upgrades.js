const fs = require('fs');
const vm = require('vm');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const context = {
  console,
  window: null,
  globalThis: null,
  P: {},
  FALLBACK_ABILITIES: {
    Farigiraf: {0: 'Cud Chew', 1: 'Armor Tail', H: 'Sap Sipper'},
    Bruxish: {0: 'Dazzling', 1: 'Strong Jaw', H: 'Wonder Skin'}
  },
  REPLAY_MOVE_HINTS: {
    'After You': ['Normal', 'Status', 2],
    'Aqua Jet': ['Water', 'Physical', 1],
    'Extreme Speed': ['Normal', 'Physical', 2],
    'Helping Hand': ['Normal', 'Status', 5],
    Obstruct: ['Dark', 'Status', 4],
    Protect: ['Normal', 'Status', 4],
    Quash: ['Dark', 'Status', 1]
  },
  DexAdapter: {
    id(value) {
      return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    },
    resolveSpeciesName(value) {
      return String(value || '').trim();
    },
    resolveMoveName(value) {
      return String(value || '').trim();
    },
    getSpecies(name) {
      const abilities = context.FALLBACK_ABILITIES[String(name || '').trim()];
      return abilities ? { abilities } : null;
    },
    getMove() {
      return null;
    }
  },
  movePriority(move) {
    const meta = context.REPLAY_MOVE_HINTS[String(move || '').trim()];
    return Number(meta?.[2] || 0);
  },
  moveMeta(move) {
    const meta = context.REPLAY_MOVE_HINTS[String(move || '').trim()];
    return meta ? [meta[0], meta[1], 0, 100, meta[2]] : null;
  },
  moveCategory(move) {
    return context.REPLAY_MOVE_HINTS[String(move || '').trim()]?.[1] || 'Status';
  },
  moveBlockingAbility() {
    return '';
  },
  dmg(att, def, mv) {
    return {
      def,
      mv,
      moveType: (context.REPLAY_MOVE_HINTS[mv] || ['Normal'])[0],
      move: [null, (context.REPLAY_MOVE_HINTS[mv] || [null, 'Physical'])[1]],
      rolls: new Array(16).fill(50),
      eff: 1,
      min: 50,
      maxd: 50,
      minp: 50,
      maxp: 50,
      ko: 1,
      two: 1,
      three: 1
    };
  },
  detectiveAbilities(species) {
    return Object.values(context.FALLBACK_ABILITIES[species] || {}).filter(Boolean);
  },
  ReplayParser: class ReplayParser {
    constructor() {
      this.turnMoves = [];
      this.revealed = [];
      this.states = {};
    }
    moveBlockedAbilities() {
      return [];
    }
    moveAbilityBypassProtectedAbilities() {
      return [];
    }
    abilitySuppressionActive() {
      return false;
    }
    moveAbilityBypass(state) {
      return state?.bypassAbility || '';
    }
    abilityRewardText() {
      return 'base reward';
    }
    abilityTriggeredByMove() {
      return false;
    }
    abilityClueLabel(ability) {
      return `${ability} revealed`;
    }
    abilityClueLabelWithProof(ability) {
      return `${ability} revealed`;
    }
    reactiveAbilityProof() {
      return false;
    }
    ensureState(target) {
      const raw = String(target || '');
      const species = raw.split(':').slice(1).join(':').trim();
      const slot = raw.split(':')[0].trim();
      const key = `${slot}|${species}`;
      if (!this.states[key]) this.states[key] = { species, slot, abilityHints: [] };
      return this.states[key];
    }
    recordAbilityReveal(state, turn, ability, moveEvent, text, clueLabel) {
      if (!state.abilityHints.includes(ability)) state.abilityHints.push(ability);
      this.revealed.push({
        state,
        turn,
        ability,
        move: moveEvent?.move || '',
        label: clueLabel,
        text
      });
    }
    extractEvidence() {
      return 'base';
    }
  }
};
context.window = context;
context.globalThis = context;

vm.createContext(context);
vm.runInContext(
  fs.readFileSync('src/priority-blocking-upgrades.js', 'utf8'),
  context,
  { filename: 'priority-blocking-upgrades.js', timeout: 10000 }
);

const parser = new context.ReplayParser();

const afterYouBlocked = parser.moveBlockedAbilities({ species: 'Farigiraf' }, 'After You');
assert(!afterYouBlocked.includes('Armor Tail'), 'ally-targeting priority support like After You should not fabricate Armor Tail contradictions');

const obstructBlocked = parser.moveBlockedAbilities({ species: 'Farigiraf' }, 'Obstruct');
assert(!obstructBlocked.includes('Armor Tail'), 'protect-style self priority like Obstruct should not count as blockable priority against Armor Tail');

const quashBlocked = parser.moveBlockedAbilities({ species: 'Farigiraf' }, 'Quash');
assert(quashBlocked.includes('Armor Tail'), 'foe-targeting priority status like Quash should still be blocked by Armor Tail');

const aquaJetBlocked = parser.moveBlockedAbilities({ species: 'Bruxish' }, 'Aqua Jet');
assert(aquaJetBlocked.includes('Dazzling'), 'direct priority attacks should still rule out Dazzling when they land');

parser.turnMoves = [{ slot: 'p1a', species: 'Farigiraf', move: 'After You' }];
parser.extractEvidence({ type: '-activate', target: 'p2a: Farigiraf', effect: 'ability: Armor Tail' }, 3);
assert(parser.revealed.length === 0, 'After You should not fabricate an Armor Tail reveal from replay activate events');

parser.turnMoves = [{ slot: 'p1a', species: 'Farigiraf', move: 'Obstruct' }];
parser.extractEvidence({ type: '-activate', target: 'p2a: Farigiraf', effect: 'ability: Armor Tail' }, 4);
assert(parser.revealed.length === 0, 'Obstruct should not fabricate an Armor Tail reveal from replay activate events');

console.log('[OK] priority support targeting upgrades passed');