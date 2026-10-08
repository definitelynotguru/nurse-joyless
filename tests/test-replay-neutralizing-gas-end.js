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

const neutralizingGasExplicitEndThunderWaveLog = '|turn|1\n|switch|p1a: Weezing-Galar|Weezing-Galar, L80\n|-ability|p1a: Weezing-Galar|Neutralizing Gas\n|switch|p2a: Gholdengo|Gholdengo, L80\n|turn|2\n|-end|p1a: Weezing-Galar|ability: Neutralizing Gas\n|move|p1a: Dragapult|Thunder Wave|p2a: Gholdengo\n|-status|p2a: Gholdengo|par';
const neutralizingGasExplicitEndThunderWaveParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(neutralizingGasExplicitEndThunderWaveLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const neutralizingGasExplicitEndThunderWaveTarget = neutralizingGasExplicitEndThunderWaveParser.targets.find(t => t.species === 'Gholdengo');
assert(neutralizingGasExplicitEndThunderWaveTarget?.ruledOutAbilities?.includes('Good as Gold'), 'an explicit Neutralizing Gas end line should restore landed-status contradictions for Good as Gold');
assert(!neutralizingGasExplicitEndThunderWaveTarget?.notes?.some(note => /Neutralizing Gas from Weezing-Galar suppressed/i.test(note)), 'an explicit Neutralizing Gas end line should stop carrying the old suppression note into later contradictions');

console.log('[OK] replay Neutralizing Gas explicit-end regression passed');
