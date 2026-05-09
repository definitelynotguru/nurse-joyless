const fs = require('fs');
const vm = require('vm');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function makeElement() {
  return {
    innerHTML: '',
    className: '',
  };
}

const elements = {
  ko: makeElement(),
};

const context = {
  console,
  html(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
  document: {
    getElementById(id) {
      if (!elements[id]) elements[id] = makeElement();
      return elements[id];
    },
  },
  nHitChance(roll, hits) {
    return Math.min(1, (roll.ko || 0) * hits);
  },
};
context.window = context;
context.globalThis = context;

context.dmg = function legacyDmg() {
  return JSON.parse(JSON.stringify(context.__rollTemplate));
};
context.renderKo = function legacyRenderKo() {
  elements.ko.className = 'diag';
  elements.ko.innerHTML = '<div class="box"><h3>Damage Range</h3></div>';
  context.dmg({}, context.__rollTemplate.def, 'move', {});
};

vm.createContext(context);
vm.runInContext(fs.readFileSync('src/ko-defensive-ability-upgrades.js', 'utf8'), context, {
  filename: 'ko-defensive-ability-upgrades.js',
  timeout: 10000,
});

function makeRoll(overrides = {}) {
  const rolls = Array.from({ length: 16 }, () => 100);
  return {
    rolls,
    ehp: 400,
    max: 400,
    hz: 0,
    hit: 1,
    ko: 0,
    two: 0,
    three: 0,
    min: Math.min(...rolls),
    maxd: Math.max(...rolls),
    minp: 25,
    maxp: 25,
    eff: 1,
    blockedBy: '',
    move: ['Dragon', 'Special'],
    moveType: 'Dragon',
    def: { ability: '' },
    ...overrides,
  };
}

context.__rollTemplate = makeRoll({ def: { ability: 'Multiscale' } });
let result = context.dmg({}, context.__rollTemplate.def, 'Dragon Pulse', {});
assert(result.maxd === 50, 'Multiscale should halve full-HP damage');
assert(result.defensiveAbilityNotes.some(note => /Multiscale/.test(note)), 'Multiscale should explain why damage changed');

context.__rollTemplate = makeRoll({ def: { ability: 'Multiscale' }, hz: 12.5, ehp: 350 });
result = context.dmg({}, context.__rollTemplate.def, 'Dragon Pulse', {});
assert(result.maxd === 100, 'Multiscale should stay off after hazard chip breaks full HP');

context.__rollTemplate = makeRoll({ def: { ability: 'Filter' }, eff: 2, moveType: 'Fighting', move: ['Fighting', 'Special'] });
result = context.dmg({}, context.__rollTemplate.def, 'Aura Sphere', {});
assert(result.maxd === 75, 'Filter should reduce super-effective damage');
assert(result.defensiveAbilityMultiplier === 0.75, 'Filter should record the applied damage multiplier');
assert(Number.isFinite(result.two) && Number.isFinite(result.three), 'Filter-adjusted rolls should recompute KO odds fields');

context.__rollTemplate = makeRoll({ def: { ability: 'Solid Rock' }, eff: 1, moveType: 'Water', move: ['Water', 'Special'] });
result = context.dmg({}, context.__rollTemplate.def, 'Surf', {});
assert(result.maxd === 100, 'Solid Rock should not affect neutral hits');

context.__rollTemplate = makeRoll({ def: { ability: 'Thick Fat' }, moveType: 'Fire', move: ['Fire', 'Special'] });
result = context.dmg({}, context.__rollTemplate.def, 'Flamethrower', {});
assert(result.maxd === 50, 'Thick Fat should reduce Fire damage');
assert(result.defensiveAbilityNotes.some(note => /Thick Fat/.test(note)), 'Thick Fat should explain the reduction');

context.__rollTemplate = makeRoll({ def: { ability: 'Thick Fat' }, moveType: 'Electric', move: ['Electric', 'Special'] });
result = context.dmg({}, context.__rollTemplate.def, 'Thunderbolt', {});
assert(result.maxd === 100, 'Thick Fat should ignore non-Fire and non-Ice damage');

context.__rollTemplate = makeRoll({ def: { ability: 'Shadow Shield' } });
context.renderKo();
assert(/Defender ability context/.test(elements.ko.innerHTML), 'renderKo should surface the defender ability note');
assert(/Shadow Shield/.test(elements.ko.innerHTML), 'renderKo should name the active defender ability');

console.log('[OK] ko defensive ability upgrades passed');
