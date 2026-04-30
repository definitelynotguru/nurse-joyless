const fs = require('fs');
const vm = require('vm');
const path = require('path');

function makeFakeElement(value = '') {
  return {
    value,
    checked: false,
    innerHTML: '',
    innerText: '',
    textContent: '',
    style: {},
    dataset: {},
    classList: { add(){}, remove(){}, toggle(){} },
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    insertAdjacentHTML(_pos, html){ this.innerHTML += html; this.textContent += html.replace(/<[^>]+>/g, ' '); },
    remove(){},
    appendChild(){},
    click(){},
    closest(){ return null; },
    getBoundingClientRect(){ return { top: 999 }; },
  };
}

const elements = {};
const clipboardWrites = [];
const context = {
  console,
  setTimeout(fn){ if (typeof fn === 'function') fn(); return 0; },
  clearTimeout(){},
  alert(){},
  TextDecoder,
  localStorage: { getItem(){ return ''; }, setItem(){} },
  navigator: { clipboard: { writeText(text){ clipboardWrites.push(String(text)); return Promise.resolve(); } } },
  document: {
    addEventListener(){},
    getElementById(id){ if (!elements[id]) elements[id] = makeFakeElement(); return elements[id]; },
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

const source = [
  fs.readFileSync(path.join(__dirname, 'src/app.js'), 'utf8'),
  fs.existsSync(path.join(__dirname, 'src/validation-fixes.js')) ? fs.readFileSync(path.join(__dirname, 'src/validation-fixes.js'), 'utf8') : '',
  fs.readFileSync(path.join(__dirname, 'src/tera-plan.js'), 'utf8'),
].join('\n');
vm.runInContext(source, context, { filename: 'tera-plan-runtime.js', timeout: 10000 });

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const BALANCE = `Gholdengo @ Air Balloon
Ability: Good as Gold
Tera Type: Fairy
EVs: 252 HP / 196 Def / 60 Spe
Bold Nature
- Nasty Plot
- Shadow Ball
- Recover
- Make It Rain

Landorus-Therian @ Rocky Helmet
Ability: Intimidate
Tera Type: Water
EVs: 248 HP / 24 Def / 4 SpD / 232 Spe
Jolly Nature
- Earthquake
- U-turn
- Stealth Rock
- Taunt

Volcanion @ Leftovers
Ability: Water Absorb
Tera Type: Poison
EVs: 248 HP / 68 Def / 8 SpA / 184 Spe
Modest Nature
IVs: 0 Atk
- Steam Eruption
- Flamethrower
- Taunt
- Will-O-Wisp

Iron Valiant @ Booster Energy
Ability: Quark Drive
Tera Type: Stellar
EVs: 252 Atk / 4 SpA / 252 Spe
Naive Nature
- Close Combat
- Knock Off
- Moonblast
- Encore

Kingambit @ Leftovers
Ability: Supreme Overlord
Tera Type: Dark
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Kowtow Cleave
- Sucker Punch
- Iron Head
- Low Kick

Alomomola @ Heavy-Duty Boots
Ability: Regenerator
Tera Type: Ghost
EVs: 4 HP / 252 Def / 252 SpD
Relaxed Nature
- Wish
- Protect
- Flip Turn
- Scald`;

const OVERLOADED = `Dragonite @ Heavy-Duty Boots
Ability: Multiscale
Tera Type: Normal
EVs: 252 Atk / 4 SpD / 252 Spe
Adamant Nature
- Dragon Dance
- Extreme Speed
- Earthquake
- Fire Punch

Kingambit @ Black Glasses
Ability: Supreme Overlord
Tera Type: Dark
EVs: 252 Atk / 4 SpD / 252 Spe
Adamant Nature
- Sucker Punch
- Kowtow Cleave
- Iron Head
- Swords Dance

Volcarona @ Heavy-Duty Boots
Ability: Flame Body
Tera Type: Grass
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Quiver Dance
- Fiery Dance
- Giga Drain
- Bug Buzz

Iron Valiant @ Booster Energy
Ability: Quark Drive
Tera Type: Stellar
EVs: 252 Atk / 4 SpA / 252 Spe
Naive Nature
- Close Combat
- Knock Off
- Moonblast
- Encore

Gholdengo @ Air Balloon
Ability: Good as Gold
Tera Type: Fairy
EVs: 252 HP / 196 Def / 60 Spe
Bold Nature
- Nasty Plot
- Shadow Ball
- Recover
- Make It Rain

Dragapult @ Choice Specs
Ability: Infiltrator
Tera Type: Ghost
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Draco Meteor
- Shadow Ball
- Flamethrower
- U-turn`;

const balancePlan = vm.runInContext(`NurseJoylessTeraPlan.analyze(parseTeam(${JSON.stringify(BALANCE)}), { primaryIdentity: { name: 'Balance' } })`, context, { timeout: 10000 });
assert(balancePlan.score >= 55, 'balance sample should receive a functional Tera plan score');
assert(balancePlan.bestDefensive.species === 'Landorus-Therian' || balancePlan.bestDefensive.score >= 35, 'defensive Tera patch should be identified');
assert(balancePlan.bestOffensive.species, 'offensive Tera candidate should be identified');
assert(balancePlan.bestOffensive.tera === 'Stellar' || balancePlan.rows.some(row => row.tera === 'Stellar' && row.offensive > row.defensive), 'Stellar should be treated as offensive, not defensive');
assert(balancePlan.reliabilityModifier >= 0, 'functional Tera plan should not lower Battle Reliability');

const overloadedPlan = vm.runInContext(`NurseJoylessTeraPlan.analyze(parseTeam(${JSON.stringify(OVERLOADED)}), { primaryIdentity: { name: 'Hyper Offense' } })`, context, { timeout: 10000 });
assert(overloadedPlan.hunger.length >= 3, 'overloaded sample should detect multiple Tera-hungry slots');
assert(overloadedPlan.status !== 'Clean', 'multiple competing Tera win paths should not be labeled Clean');
assert(overloadedPlan.reliabilityModifier <= 9, 'overloaded Tera plan should cap reliability bonus');

const markdown = vm.runInContext(`NurseJoylessTeraPlan.markdown(NurseJoylessTeraPlan.analyze(parseTeam(${JSON.stringify(BALANCE)}), { primaryIdentity: { name: 'Balance' } }))`, context, { timeout: 10000 });
assert(/## Tera Plan/.test(markdown), 'markdown export should contain Tera Plan section');
assert(/Reliability impact/.test(markdown), 'markdown export should explain reliability impact');

console.log('[OK] tera plan scoring passed');
