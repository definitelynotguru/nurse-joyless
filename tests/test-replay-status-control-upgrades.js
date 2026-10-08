const fs = require('fs');
const vm = require('vm');

function makeFakeElement(value = '') {
  return {
    value,
    checked: false,
    innerHTML: '',
    innerText: '',
    textContent: '',
    className: '',
    _items: [],
    options: [],
    onclick: null,
    style: {},
    dataset: {},
    classList: { add(){}, remove(){}, toggle(){} },
    querySelector(){ return makeFakeElement(); },
    querySelectorAll(){ return []; },
    scrollIntoView(){},
    appendChild(){},
    click(){},
    closest(){ return null; },
    getBoundingClientRect(){ return { top: 999 }; },
  };
}

const elements = {};
const context = {
  console,
  setTimeout(fn){ if (typeof fn === 'function') fn(); return 0; },
  clearTimeout(){},
  TextDecoder,
  alert(){},
  localStorage: { getItem(){ return ''; }, setItem(){} },
  navigator: { clipboard: { writeText(){ return Promise.resolve(); } } },
  document: {
    addEventListener(){},
    getElementById(id) { if (!elements[id]) elements[id] = makeFakeElement(); return elements[id]; },
    querySelectorAll(){ return []; },
    querySelector(){ return null; },
    createElement(){ return makeFakeElement(); },
  },
  window: null,
  URL: { createObjectURL(){ return 'blob:test'; }, revokeObjectURL(){} },
  Blob: function Blob(){},
  fetch: async () => { throw new Error('offline'); },
};
context.window = context;
context.addEventListener = function(){};

vm.createContext(context);
vm.runInContext(fs.readFileSync('src/app.js', 'utf8'), context, { filename: 'app.js', timeout: 10000 });
vm.runInContext(fs.readFileSync('src/replay-ability-upgrades.js', 'utf8'), context, { filename: 'replay-ability-upgrades.js', timeout: 10000 });

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const baselineParser = vm.runInContext('new ReplayParser()', context, { timeout: 10000 });
assert(!baselineParser.moveBlockedAbilities({ species: 'Slowbro' }, 'Confuse Ray').includes('Own Tempo'), 'baseline should still miss Own Tempo on landed confusion control');
assert(!baselineParser.moveBlockedAbilities({ species: 'Slowbro' }, 'Taunt').includes('Oblivious'), 'baseline should still miss Oblivious on landed Taunt');
assert(!baselineParser.moveBlockedAbilities({ species: 'Aromatisse' }, 'Encore').includes('Aroma Veil'), 'baseline should still miss Aroma Veil on landed lockout control');

vm.runInContext(fs.readFileSync('src/replay-status-control-upgrades.js', 'utf8'), context, { filename: 'replay-status-control-upgrades.js', timeout: 10000 });

const tauntObliviousLog = '|turn|1\n|switch|p1a: Grimmsnarl|Grimmsnarl, L80\n|switch|p2a: Slowbro|Slowbro, L80\n|move|p1a: Grimmsnarl|Taunt|p2a: Slowbro\n|-start|p2a: Slowbro|move: Taunt';
const tauntObliviousRead = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(tauntObliviousLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const tauntObliviousTarget = tauntObliviousRead.targets.find(t => t.species === 'Slowbro');
assert(tauntObliviousTarget?.ruledOutAbilities?.includes('Oblivious'), 'landed Taunt should rule out Oblivious');
assert(tauntObliviousTarget?.notes?.some(note => /Taunt successfully landed/i.test(note)), 'landed Taunt should explain the Oblivious contradiction in replay notes');
assert(tauntObliviousTarget?.detectiveInputs?.some(input => input.label === 'Taunt landed'), 'landed Taunt should stay detective-loadable');

const confuseRayOwnTempoLog = '|turn|1\n|switch|p1a: Banette|Banette, L80\n|switch|p2a: Slowbro|Slowbro, L80\n|move|p1a: Banette|Confuse Ray|p2a: Slowbro\n|-start|p2a: Slowbro|confusion';
const confuseRayOwnTempoRead = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(confuseRayOwnTempoLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const confuseRayOwnTempoTarget = confuseRayOwnTempoRead.targets.find(t => t.species === 'Slowbro');
assert(confuseRayOwnTempoTarget?.ruledOutAbilities?.includes('Own Tempo'), 'landed Confuse Ray should rule out Own Tempo');
assert(confuseRayOwnTempoTarget?.notes?.some(note => /Confuse Ray successfully landed/i.test(note)), 'landed Confuse Ray should explain the Own Tempo contradiction in replay notes');
assert(confuseRayOwnTempoTarget?.detectiveInputs?.some(input => input.label === 'Confuse Ray landed'), 'landed Confuse Ray should stay detective-loadable');

const encoreAromaVeilLog = '|turn|1\n|switch|p1a: Whimsicott|Whimsicott, L80\n|switch|p2a: Aromatisse|Aromatisse, L80\n|move|p1a: Whimsicott|Encore|p2a: Aromatisse\n|-start|p2a: Aromatisse|Encore';
const encoreAromaVeilRead = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(encoreAromaVeilLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const encoreAromaVeilTarget = encoreAromaVeilRead.targets.find(t => t.species === 'Aromatisse');
assert(encoreAromaVeilTarget?.ruledOutAbilities?.includes('Aroma Veil'), 'landed Encore should rule out Aroma Veil');
assert(encoreAromaVeilTarget?.notes?.some(note => /Encore successfully landed/i.test(note)), 'landed Encore should explain the Aroma Veil contradiction in replay notes');
assert(encoreAromaVeilTarget?.detectiveInputs?.some(input => input.label === 'Encore landed'), 'landed Encore should stay detective-loadable');

const parser = vm.runInContext('new ReplayParser()', context, { timeout: 10000 });
assert(parser.moveAbilityBypassProtectedAbilities({ species: 'Aromatisse', bypassAbility: 'Mold Breaker' }, 'Taunt').includes('Aroma Veil'), 'bypass notes should still know Aroma Veil was the ignored protection');
assert(!parser.moveBlockedAbilities({ species: 'Slowbro', bypassAbility: 'Mold Breaker' }, 'Taunt').includes('Oblivious'), 'bypass windows should keep Oblivious live');
assert(!parser.moveBlockedAbilities({ species: 'Slowbro', abilitySuppressed: true }, 'Taunt').includes('Oblivious'), 'suppression windows should keep Oblivious live');
assert(parser.abilityTriggeredByMove('Oblivious', 'Taunt'), 'Oblivious should count as move-triggered proof for Taunt control');
assert(parser.abilityTriggeredByMove('Own Tempo', 'Confuse Ray'), 'Own Tempo should count as move-triggered proof for confusion control');
assert(parser.abilityClueLabelWithProof('Aroma Veil', 'Encore', true) === 'Aroma Veil blocked Encore', 'control blockers should keep move-specific clue labels');
assert(/confusion/i.test(parser.abilityRewardText('Own Tempo')), 'Own Tempo should explain the control reward it provides');
assert(parser.reactiveAbilityProof('Oblivious'), 'control blockers should count as hard reactive replay proof when explicitly shown');

console.log('[OK] replay status-control upgrades passed');