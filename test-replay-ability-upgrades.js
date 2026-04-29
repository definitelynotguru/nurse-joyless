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

const sapSipperGlideLog = '|turn|1\n|switch|p1a: Rillaboom|Rillaboom, L80\n|switch|p2a: Azumarill|Azumarill, L80\n|move|p1a: Rillaboom|Grassy Glide|p2a: Azumarill\n|-boost|p2a: Azumarill|atk|1|[from] ability: Sap Sipper';
const sapSipperGlideParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(sapSipperGlideLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const sapSipperGlideTarget = sapSipperGlideParser.strongest;
assert(sapSipperGlideTarget?.detectiveInputs?.[0]?.label === 'Sap Sipper activated on Grassy Glide', 'reactive replay clues should keep the actual move name when the ability event itself proves the trigger even if local move metadata is missing');

const goodAsGoldGlareLog = '|turn|1\n|switch|p1a: Serperior|Serperior, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Serperior|Glare|p2a: Gholdengo\n|-immune|p2a: Gholdengo|[from] ability: Good as Gold';
const goodAsGoldGlareParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(goodAsGoldGlareLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const goodAsGoldGlareTarget = goodAsGoldGlareParser.strongest;
assert(goodAsGoldGlareTarget?.detectiveInputs?.[0]?.label === 'Good as Gold blocked Glare', 'reactive status-immunity clues should stay move-specific even when the blocked move is outside the local replay hint table');

const goodAsGoldTauntStartLog = '|turn|1\n|switch|p1a: Grimmsnarl|Grimmsnarl, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Grimmsnarl|Taunt|p2a: Gholdengo\n|-start|p2a: Gholdengo|move: Taunt';
const goodAsGoldTauntStartParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(goodAsGoldTauntStartLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const goodAsGoldTauntStartTarget = goodAsGoldTauntStartParser.strongest;
assert(goodAsGoldTauntStartTarget?.ruledOutAbilities?.includes('Good as Gold'), 'landed start effects should rule out Good as Gold when the status move actually connected');
assert(goodAsGoldTauntStartTarget?.notes?.some(note => /Taunt successfully landed/i.test(note)), 'landed start effects should explain the successful-status contradiction in replay notes');
assert(goodAsGoldTauntStartTarget?.detectiveInputs?.[0]?.label === 'Taunt landed', 'landed start effects should stay loadable as replay detective clues');

const goodAsGoldConfuseRayLog = '|turn|1\n|switch|p1a: Flutter Mane|Flutter Mane, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Flutter Mane|Confuse Ray|p2a: Gholdengo\n|-start|p2a: Gholdengo|confusion';
const goodAsGoldConfuseRayParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(goodAsGoldConfuseRayLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const goodAsGoldConfuseRayTarget = goodAsGoldConfuseRayParser.strongest;
assert(goodAsGoldConfuseRayTarget?.ruledOutAbilities?.includes('Good as Gold'), 'landed alias effects should still rule out Good as Gold when the status move actually connected');
assert(goodAsGoldConfuseRayTarget?.notes?.some(note => /Confuse Ray successfully landed/i.test(note)), 'landed alias effects should explain the underlying status-move contradiction in replay notes');
assert(goodAsGoldConfuseRayTarget?.detectiveInputs?.[0]?.label === 'Confuse Ray landed', 'landed alias effects should stay detective-loadable with the actual move name');

const leechSeedStartLog = '|turn|1\n|switch|p1a: Ferrothorn|Ferrothorn, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Ferrothorn|Leech Seed|p2a: Gholdengo\n|-start|p2a: Gholdengo|move: Leech Seed';
const leechSeedStartParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(leechSeedStartLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const leechSeedStartTarget = leechSeedStartParser.strongest;
assert(leechSeedStartTarget?.ruledOutAbilities?.includes('Good as Gold'), 'landed Leech Seed should rule out Good as Gold once the status move is proven to have connected');
assert(leechSeedStartTarget?.notes?.some(note => /Leech Seed successfully landed/i.test(note)), 'landed Leech Seed should explain the contradiction in replay notes');

vm.runInContext(
  `team=[
    preset("Gholdengo","Air Balloon","Timid",{hp:0,atk:0,def:4,spa:252,spd:0,spe:252},["Make It Rain","Shadow Ball","Recover","Nasty Plot"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: leechSeedStartTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const leechSeedStartRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(leechSeedStartRead.summary.confidence.label === 'Blocked', 'landed Leech Seed contradictions should surface that every modeled Gholdengo line is dead');
assert(leechSeedStartRead.summary.notes.some(x => /Good as Gold impossible/.test(x)), 'landed Leech Seed contradictions should surface Good as Gold elimination in detective notes');

console.log('[OK] replay ability upgrades passed');
