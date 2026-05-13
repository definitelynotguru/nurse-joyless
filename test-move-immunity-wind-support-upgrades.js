const fs = require('fs');
const vm = require('vm');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const context = {
  console,
  window: null,
  globalThis: null,
  FALLBACK_ABILITIES: {
    Brambleghast: {0: 'Wind Rider'}
  },
  REPLAY_MOVE_HINTS: {
    Gust: ['Flying', 'Special', 0],
    Tailwind: ['Flying', 'Status', 0]
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
      return abilities ? {abilities} : null;
    },
    getMove() {
      return null;
    }
  },
  moveMeta(move) {
    const meta = context.REPLAY_MOVE_HINTS[String(move || '').trim()];
    return meta ? [meta[0], meta[1], 0, 100, meta[2]] : null;
  },
  moveCategory(move) {
    return context.REPLAY_MOVE_HINTS[String(move || '').trim()]?.[1] || '';
  },
  moveBlockingAbility() {
    return '';
  },
  dmg(att, def, mv) {
    return {
      att,
      def,
      mv,
      moveType: (context.REPLAY_MOVE_HINTS[mv] || ['Normal'])[0],
      move: [null, (context.REPLAY_MOVE_HINTS[mv] || [null, 'Special'])[1]],
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
    moveBlockedAbilities() {
      return [];
    }
    moveContradictionNote() {
      return '';
    }
    abilitySuppressionActive() {
      return false;
    }
    moveAbilityBypass() {
      return '';
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
    joinWithOr(values = []) {
      return values.join(' or ');
    }
  }
};
context.window = context;
context.globalThis = context;

vm.createContext(context);
vm.runInContext(
  fs.readFileSync('src/move-immunity-upgrades.js', 'utf8'),
  context,
  { filename: 'src/move-immunity-upgrades.js', timeout: 10000 }
);

const parser = new context.ReplayParser();

const gustBlocked = parser.moveBlockedAbilities({ species: 'Brambleghast' }, 'Gust');
assert(gustBlocked.includes('Wind Rider'), 'ordinary wind attacks should still contradict Wind Rider when they land');

const tailwindBlocked = parser.moveBlockedAbilities({ species: 'Brambleghast' }, 'Tailwind');
assert(!tailwindBlocked.includes('Wind Rider'), 'Tailwind should not rule out Wind Rider just because it successfully started on the side');
assert(parser.moveContradictionNote({ species: 'Brambleghast' }, 'Tailwind') === '', 'Tailwind should not fabricate a landed-move contradiction note for Wind Rider');

assert(parser.abilityTriggeredByMove('Wind Rider', 'Tailwind'), 'Tailwind should still count as a legitimate Wind Rider trigger');
assert(parser.abilityClueLabel('Wind Rider', 'Tailwind') === 'Wind Rider activated on Tailwind', 'Wind Rider clue labels should preserve Tailwind activation text');
assert(parser.abilityClueLabelWithProof('Wind Rider', 'Tailwind', true) === 'Wind Rider activated on Tailwind', 'proof-backed Wind Rider labels should preserve Tailwind activation text');

const gustRoll = context.dmg({ species: 'Tornadus' }, { species: 'Brambleghast', ability: 'Wind Rider' }, 'Gust');
assert(gustRoll.blockedBy === 'Wind Rider', 'ordinary wind attacks should still zero out damage into Wind Rider');
assert(gustRoll.maxd === 0, 'ordinary wind attacks should still produce zero-damage rolls into Wind Rider');

const tailwindRoll = context.dmg({ species: 'Whimsicott' }, { species: 'Brambleghast', ability: 'Wind Rider' }, 'Tailwind');
assert(!tailwindRoll.blockedBy, 'Tailwind should not be modeled as a blocked immunity hit in calculator-style roll output');
assert(tailwindRoll.maxd > 0, 'Tailwind should keep the untouched roll shape instead of faking an immunity zero');

console.log('[OK] move immunity wind-support upgrades passed');