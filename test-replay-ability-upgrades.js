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

console.log('[OK] replay ability upgrades passed');
