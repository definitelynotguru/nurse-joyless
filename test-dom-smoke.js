const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('index.html', 'utf8');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
class El {
  constructor(id) {
    this.id = id; this.value = ''; this.textContent = ''; this.className = ''; this.options = []; this.dataset = {}; this.style = {};
    this.classList = { add(){}, remove(){}, toggle(){}, contains(){ return false; } };
  }
  set innerHTML(s) {
    this._html = String(s || '');
    this.options = [...this._html.matchAll(/<option(?:[^>]*)>([^<]*)<\/option>/g)].map((m, i) => ({ value: String(i), textContent: m[1] }));
  }
  get innerHTML() { return this._html || ''; }
  addEventListener() {}
  querySelector() { return new El('query'); }
  scrollIntoView() {}
  getBoundingClientRect() { return { top: 999 }; }
}
const els = Object.fromEntries(ids.map(id => [id, new El(id)]));
const document = {
  getElementById: id => els[id] || null,
  addEventListener: (ev, fn) => { if (ev === 'DOMContentLoaded') setTimeout(fn, 0); },
  querySelectorAll: () => [],
  querySelector: () => null,
};
const ctx = {
  console, setTimeout, clearTimeout, document, navigator: { clipboard: { writeText() {} } },
  localStorage: { getItem() { return null; }, setItem() {} }, alert() {}, Blob: function(){},
  URL: { createObjectURL() { return 'blob:'; }, revokeObjectURL() {} }, TextDecoder,
  fetch: async () => { throw new Error('offline smoke test'); },
};
ctx.window = ctx;
ctx.addEventListener = function() {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/app.js', 'utf8'), ctx, { filename: 'app.js' });
vm.runInContext(fs.readFileSync('src/replay-ability-upgrades.js', 'utf8'), ctx, { filename: 'replay-ability-upgrades.js' });
setTimeout(() => {
  const required = ['loadDemo','analyze','calcKo','detect','calcArchetypes','openAgent','testDragonSpam','testHazardStack','testSunRoom','suggestPokemon','loadOnlineDex','validateMoves','exportMarkdown','exportJson','testOllama'];
  for (const id of required) {
    if (typeof els[id]?.onclick !== 'function') throw new Error(`${id} not bound`);
  }
  els.loadDemo.onclick();
  if (!els.teamCards.innerHTML.includes('Charizard')) throw new Error('loadDemo did not render team cards');
  els.testHazardStack.onclick();
  if (!els.teamCards.innerHTML.includes('Gholdengo')) throw new Error('Hazard Stack test team did not load');
  if (!els.identityResults.innerHTML.includes('Identity')) throw new Error('identity panel did not update after analysis');
  if (!els.synergyResults.innerHTML.includes('Structural Scoring')) throw new Error('synergy panel did not update after analysis');
  els.openAgent.onclick();
  console.log('[OK] DOM binding smoke passed');
}, 20);
