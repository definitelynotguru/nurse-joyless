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

function parseReplay(log) {
  return vm.runInContext(`(() => {
    const parser = new ReplayParser();
    parser.parse(${JSON.stringify(log)});
    return parser.replayRead;
  })()`, context, { timeout: 10000 });
}

const myceliumMightThunderWaveLog = '|turn|1\n|switch|p1a: Toedscruel|Toedscruel, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Toedscruel|Thunder Wave|p2a: Gholdengo\n|-ability|p1a: Toedscruel|Mycelium Might\n|-status|p2a: Gholdengo|par';
const myceliumMightThunderWaveTarget = parseReplay(myceliumMightThunderWaveLog).targets.find(t => t.species === 'Gholdengo');
assert(!myceliumMightThunderWaveTarget?.ruledOutAbilities?.includes('Good as Gold'), 'Mycelium Might status application should not fake a Good as Gold contradiction');
assert(myceliumMightThunderWaveTarget?.notes?.some(note => /Mycelium Might let Thunder Wave bypass Good as Gold/i.test(note)), 'Mycelium Might status application should explain why Good as Gold stayed live');

vm.runInContext(
  `team=[
    preset("Gholdengo","Air Balloon","Timid",{hp:0,atk:0,def:4,spa:252,spd:0,spe:252},["Make It Rain","Shadow Ball","Recover","Nasty Plot"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: myceliumMightThunderWaveTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const myceliumMightThunderWaveRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(myceliumMightThunderWaveRead.abilityRows[0][0] === 'Good as Gold', 'Mycelium Might status application should leave Good as Gold live in the detective pool');
assert(myceliumMightThunderWaveRead.summary.notes.some(x => /Mycelium Might let Thunder Wave bypass Good as Gold/i.test(x)), 'Mycelium Might status application should carry the bypass note into detective output');

const myceliumMightStealthRockLog = '|turn|1\n|switch|p1a: Toedscruel|Toedscruel, L80\n|switch|p2a: Hatterene|Hatterene, L80\n|move|p1a: Toedscruel|Stealth Rock|p2a: Hatterene\n|-ability|p1a: Toedscruel|Mycelium Might\n|-sidestart|p2: Hatterene|move: Stealth Rock';
const myceliumMightStealthRockTarget = parseReplay(myceliumMightStealthRockLog).targets.find(t => t.species === 'Hatterene');
assert(!myceliumMightStealthRockTarget?.ruledOutAbilities?.includes('Magic Bounce'), 'Mycelium Might hazards should not fake a Magic Bounce contradiction');
assert(myceliumMightStealthRockTarget?.notes?.some(note => /Mycelium Might let Stealth Rock bypass Magic Bounce/i.test(note)), 'Mycelium Might hazards should explain why Magic Bounce stayed live');

const myceliumMightStealthRockGoodAsGoldLog = '|turn|1\n|switch|p1a: Toedscruel|Toedscruel, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Toedscruel|Stealth Rock|p2a: Gholdengo\n|-ability|p1a: Toedscruel|Mycelium Might\n|-sidestart|p2: Gholdengo|move: Stealth Rock';
const myceliumMightStealthRockGoodAsGoldTarget = parseReplay(myceliumMightStealthRockGoodAsGoldLog).targets.find(t => t.species === 'Gholdengo');
assert(!myceliumMightStealthRockGoodAsGoldTarget?.ruledOutAbilities?.includes('Good as Gold'), 'Mycelium Might hazards should not fake a Good as Gold contradiction on side-targeting hazards');
assert(!myceliumMightStealthRockGoodAsGoldTarget?.notes?.some(note => /Good as Gold/i.test(note)), 'Mycelium Might hazards should not invent a Good as Gold bypass note for side-targeting hazards');

vm.runInContext(
  `team=[
    preset("Gholdengo","Air Balloon","Timid",{hp:0,atk:0,def:4,spa:252,spd:0,spe:252},["Make It Rain","Shadow Ball","Recover","Nasty Plot"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: myceliumMightStealthRockGoodAsGoldTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const myceliumMightStealthRockGoodAsGoldRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(myceliumMightStealthRockGoodAsGoldRead.abilityRows[0][0] === 'Good as Gold', 'Mycelium Might hazards should leave Good as Gold live when Stealth Rock only targeted the side');
assert(!myceliumMightStealthRockGoodAsGoldRead.summary.notes.some(x => /Good as Gold/i.test(x)), 'Mycelium Might hazards should not carry a fake Good as Gold bypass note into detective output');

const myceliumMightThunderWavePurifyingSaltLog = '|turn|1\n|switch|p1a: Toedscruel|Toedscruel, L80\n|switch|p2a: Garganacl|Garganacl, L80\n|move|p1a: Toedscruel|Thunder Wave|p2a: Garganacl\n|-ability|p1a: Toedscruel|Mycelium Might\n|-status|p2a: Garganacl|par';
const myceliumMightThunderWavePurifyingSaltTarget = parseReplay(myceliumMightThunderWavePurifyingSaltLog).targets.find(t => t.species === 'Garganacl');
assert(!myceliumMightThunderWavePurifyingSaltTarget?.ruledOutAbilities?.includes('Purifying Salt'), 'Mycelium Might status application should not fake a Purifying Salt contradiction');
assert(myceliumMightThunderWavePurifyingSaltTarget?.notes?.some(note => /Mycelium Might let Thunder Wave bypass Purifying Salt/i.test(note)), 'Mycelium Might status application should explain why Purifying Salt stayed live');

console.log('[OK] replay Mycelium Might bypass cases passed');