const fs = require('fs');
const vm = require('vm');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const context = {
  console,
  window: null,
  globalThis: null,
  document: {
    getElementById(id) {
      if (id === 'spreadDamage') return { checked: true };
      return null;
    }
  },
  DexAdapter: {
    resolveMoveName(value) {
      return String(value || '').trim();
    },
    getMove(name) {
      const moves = {
        'Make It Rain': { target: 'allAdjacentFoes' },
        'Heat Wave': { target: 'allAdjacentFoes' },
        'Shadow Ball': { target: 'normal' }
      };
      return moves[String(name || '').trim()] || null;
    }
  },
  normalizeBattleState(opt = {}) {
    return {
      weather: 'none',
      terrain: 'none',
      helpingHand: false,
      attackerProtect: 'none',
      defenderProtect: 'none',
      attackerOffenseStage: 0,
      attackerBulkStage: 0,
      defenderOffenseStage: 0,
      defenderBulkStage: 0,
      attackerStatus: 'none',
      criticalHit: false,
      extraEndSteps: 0,
      defenderEndStepDamagePct: 0,
      spreadDamage: !!opt.spreadDamage
    };
  },
  swapBattleState(state = {}) {
    return {
      ...context.normalizeBattleState(state),
      spreadDamage: false
    };
  },
  battleStateSummary(state = {}) {
    return state.spreadDamage ? 'Neutral • legacy spread flag' : 'Neutral';
  },
  readKoBattleState() {
    return context.normalizeBattleState({ spreadDamage: true });
  },
  nHitChance(roll, hits) {
    let sums = { 0: 1 };
    for (let i = 0; i < hits; i += 1) {
      const next = {};
      Object.entries(sums).forEach(([sum, count]) => {
        roll.rolls.forEach(damage => {
          const total = Number(sum) + damage;
          next[total] = (next[total] || 0) + count;
        });
      });
      sums = next;
    }
    const successes = Object.entries(sums).reduce((acc, [sum, count]) => acc + (Number(sum) >= roll.ehp ? count : 0), 0);
    return successes / (16 ** hits) * (roll.hit ** hits);
  },
  dmg(att, def, mv, opt = {}) {
    const spread = mv === 'Make It Rain' ? 120 : mv === 'Heat Wave' ? 95 : 80;
    return {
      att,
      def,
      mv,
      move: [mv === 'Shadow Ball' ? 'Ghost' : 'Steel', 'Special'],
      rolls: new Array(16).fill(spread),
      max: 200,
      ehp: 100,
      min: spread,
      maxd: spread,
      minp: spread / 2,
      maxp: spread / 2,
      ko: spread >= 100 ? 1 : 0,
      two: 1,
      three: 1,
      eff: 1,
      hit: 1,
      blockedBy: '',
      battleState: context.normalizeBattleState(opt)
    };
  }
};
context.window = context;
context.globalThis = context;

vm.createContext(context);
vm.runInContext(
  fs.readFileSync('src/ko-spread-move-upgrades.js', 'utf8'),
  context,
  { filename: 'ko-spread-move-upgrades.js', timeout: 10000 }
);

const spreadState = context.normalizeBattleState({ spreadDamage: true });
assert(spreadState.spreadDamage, 'spread-damage state should be preserved in normalized battle state');
assert(context.battleStateSummary(spreadState).includes('Spread hit penalty'), 'battle-state summary should surface spread-hit context');

const spreadRoll = context.dmg({ species: 'Gholdengo' }, { species: 'Landorus-Therian' }, 'Make It Rain', { spreadDamage: true });
assert(spreadRoll.spreadAdjusted, 'spread moves should mark that the spread penalty was applied');
assert(spreadRoll.maxd === 90, 'spread moves should take the 0.75 doubles damage penalty');
assert(spreadRoll.ko === 0, 'spread penalty should recompute OHKO odds instead of leaving the old value behind');
assert(spreadRoll.two === 1, 'spread penalty should keep multi-hit odds live after recomputation');

const singleTargetRoll = context.dmg({ species: 'Gholdengo' }, { species: 'Landorus-Therian' }, 'Shadow Ball', { spreadDamage: true });
assert(!singleTargetRoll.spreadAdjusted, 'single-target attacks should not take a spread penalty');
assert(singleTargetRoll.maxd === 80, 'single-target attacks should keep their original damage');

const spreadOffRoll = context.dmg({ species: 'Gholdengo' }, { species: 'Landorus-Therian' }, 'Heat Wave', { spreadDamage: false });
assert(!spreadOffRoll.spreadAdjusted, 'spread penalty should stay off unless the user explicitly models a spread hit');
assert(spreadOffRoll.maxd === 95, 'spread moves should keep full damage when the spread toggle is off');

const reverseState = context.swapBattleState({ spreadDamage: true, helpingHand: true });
assert(reverseState.spreadDamage === false, 'reverse battle-state views should not inherit one-sided spread-hit context');

const readState = context.readKoBattleState();
assert(readState.spreadDamage === true, 'KO form reads should load the spread-hit toggle');

console.log('[OK] KO spread-move upgrades passed');