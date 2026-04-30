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

const goodAsGoldThunderWaveStatusLog = '|turn|1\n|switch|p1a: Dragapult|Dragapult, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Dragapult|Thunder Wave|p2a: Gholdengo\n|-status|p2a: Gholdengo|par';
const goodAsGoldThunderWaveStatusParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(goodAsGoldThunderWaveStatusLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const goodAsGoldThunderWaveStatusTarget = goodAsGoldThunderWaveStatusParser.strongest;
assert(goodAsGoldThunderWaveStatusTarget?.ruledOutAbilities?.includes('Good as Gold'), 'successful status application should rule out Good as Gold when the move actually connected');
assert(goodAsGoldThunderWaveStatusTarget?.notes?.some(note => /Thunder Wave successfully landed/i.test(note)), 'successful status application should explain the landed-status contradiction in replay notes');
assert(goodAsGoldThunderWaveStatusTarget?.detectiveInputs?.[0]?.label === 'Thunder Wave landed', 'successful status application should stay detective-loadable with the landed move name');

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

const magicBounceTauntStartLog = '|turn|1\n|switch|p1a: Grimmsnarl|Grimmsnarl, L80\n|switch|p2a: Hatterene|Hatterene, L80\n|move|p1a: Grimmsnarl|Taunt|p2a: Hatterene\n|-start|p2a: Hatterene|move: Taunt';
const magicBounceTauntStartParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(magicBounceTauntStartLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const magicBounceTauntStartTarget = magicBounceTauntStartParser.strongest;
assert(magicBounceTauntStartTarget?.ruledOutAbilities?.includes('Magic Bounce'), 'landed reflected-status effects should rule out Magic Bounce when the move actually connected');
assert(magicBounceTauntStartTarget?.notes?.some(note => /Taunt successfully landed/i.test(note)), 'landed reflected-status effects should explain the Magic Bounce contradiction in replay notes');

const magicBounceStealthRockLog = '|turn|1\n|switch|p1a: Ting-Lu|Ting-Lu, L80\n|switch|p2a: Hatterene|Hatterene, L80\n|move|p1a: Ting-Lu|Stealth Rock|p2a: Hatterene\n|-sidestart|p2: Hatterene|move: Stealth Rock';
const magicBounceStealthRockParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(magicBounceStealthRockLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const magicBounceStealthRockTarget = magicBounceStealthRockParser.strongest;
assert(magicBounceStealthRockTarget?.ruledOutAbilities?.includes('Magic Bounce'), 'hazards successfully landing on the target side should rule out Magic Bounce');
assert(magicBounceStealthRockTarget?.notes?.some(note => /Stealth Rock successfully landed/i.test(note)), 'hazards successfully landing on the target side should explain the Magic Bounce contradiction in replay notes');
assert(magicBounceStealthRockTarget?.detectiveInputs?.[0]?.label === 'Stealth Rock landed', 'hazard side-condition contradictions should stay detective-loadable with the move name');

vm.runInContext(
  `team=[
    preset("Hatterene","Leftovers","Bold",{hp:252,atk:0,def:252,spa:4,spd:0,spe:0},["Psychic Noise","Dazzling Gleam","Healing Wish","Mystical Fire"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: magicBounceStealthRockTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const magicBounceStealthRockRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(!magicBounceStealthRockRead.abilityRows.some(([name]) => name === 'Magic Bounce'), 'hazards successfully landing on the target side should remove Magic Bounce from the live detective pool');
assert(magicBounceStealthRockRead.summary.notes.some(x => /Magic Bounce impossible/i.test(x)), 'hazard side-condition contradictions should carry the Magic Bounce rule-out into detective notes');

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

const nuzzleStatusLog = '|turn|1\n|switch|p1a: Dragapult|Dragapult, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Dragapult|Nuzzle|p2a: Gholdengo\n|-damage|p2a: Gholdengo|92/100\n|-status|p2a: Gholdengo|par';
const nuzzleStatusParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(nuzzleStatusLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const nuzzleStatusTarget = nuzzleStatusParser.strongest;
assert(!nuzzleStatusTarget?.ruledOutAbilities?.includes('Good as Gold'), 'damaging status riders like Nuzzle should not fake a Good as Gold contradiction');
assert(!nuzzleStatusTarget?.notes?.some(note => /Nuzzle successfully landed/i.test(note)), 'damaging status riders should not be mislabeled as landed status-move contradictions');

const glareStatusLog = '|turn|1\n|switch|p1a: Serperior|Serperior, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Serperior|Glare|p2a: Gholdengo\n|-status|p2a: Gholdengo|par';
const glareStatusParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(glareStatusLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const glareStatusTarget = glareStatusParser.strongest;
assert(glareStatusTarget?.ruledOutAbilities?.includes('Good as Gold'), 'landed pure status moves outside the main move table should still rule out Good as Gold');
assert(glareStatusTarget?.notes?.some(note => /Glare successfully landed/i.test(note)), 'landed pure status moves outside the main move table should preserve the move-specific contradiction note');

const thunderFangStatusLog = '|turn|1\n|switch|p1a: Luxray|Luxray, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Luxray|Thunder Fang|p2a: Gholdengo\n|-damage|p2a: Gholdengo|91/100\n|-status|p2a: Gholdengo|par';
const thunderFangStatusParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(thunderFangStatusLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const thunderFangStatusTarget = thunderFangStatusParser.strongest;
assert(!thunderFangStatusTarget?.ruledOutAbilities?.includes('Good as Gold'), 'unknown damaging status riders should not fake Good as Gold contradictions just because their category is missing locally');
assert(!thunderFangStatusTarget?.notes?.some(note => /Thunder Fang successfully landed/i.test(note)), 'unknown damaging status riders should not be mislabeled as landed status-move contradictions');
assert(thunderFangStatusTarget?.notes?.some(note => /Taking Thunder Fang/i.test(note)) === false, 'unknown damaging status riders should not invent move-blocking contradictions from raw damage alone');

const limberNuzzleLog = '|turn|1\n|switch|p1a: Dragapult|Dragapult, L80\n|switch|p2a: Toxapex|Toxapex, L80\n|move|p1a: Dragapult|Nuzzle|p2a: Toxapex\n|-damage|p2a: Toxapex|94/100\n|-status|p2a: Toxapex|par';
const limberNuzzleParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(limberNuzzleLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const limberNuzzleTarget = limberNuzzleParser.strongest;
assert(limberNuzzleTarget?.ruledOutAbilities?.includes('Limber'), 'paralysis landing through Nuzzle should still rule out Limber even when Good as Gold is irrelevant');
assert(limberNuzzleTarget?.notes?.some(note => /Nuzzle successfully caused paralysis/i.test(note)), 'damaging status riders should explain the real status-immunity contradiction they created');

vm.runInContext(
  `team=[
    preset("Toxapex","Leftovers","Bold",{hp:252,atk:0,def:252,spa:0,spd:4,spe:0},["Surf","Recover","Haze","Toxic"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: limberNuzzleTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const limberNuzzleRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(!limberNuzzleRead.abilityRows.some(([name]) => name === 'Limber'), 'paralysis landing through Nuzzle should remove Limber from the live detective pool');

const purifyingSaltThunderWaveLog = '|turn|1\n|switch|p1a: Dragapult|Dragapult, L80\n|switch|p2a: Garganacl|Garganacl, L80\n|move|p1a: Dragapult|Thunder Wave|p2a: Garganacl\n|-status|p2a: Garganacl|par';
const purifyingSaltThunderWaveParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(purifyingSaltThunderWaveLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const purifyingSaltThunderWaveTarget = purifyingSaltThunderWaveParser.strongest;
assert(purifyingSaltThunderWaveTarget?.ruledOutAbilities?.includes('Purifying Salt'), 'successful major-status application should rule out Purifying Salt when the target actually became paralyzed');

vm.runInContext(
  `team=[
    preset("Garganacl","Leftovers","Careful",{hp:252,atk:4,def:0,spa:0,spd:252,spe:0},["Salt Cure","Recover","Stealth Rock","Protect"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: purifyingSaltThunderWaveTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const purifyingSaltThunderWaveRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(!purifyingSaltThunderWaveRead.abilityRows.some(([name]) => name === 'Purifying Salt'), 'successful major-status application should remove Purifying Salt from the live detective pool');
assert(purifyingSaltThunderWaveRead.summary.notes.some(x => /Purifying Salt impossible/i.test(x)), 'successful major-status application should carry the Purifying Salt contradiction into detective notes');

const strayBurnStatusLog = '|turn|1\n|switch|p1a: Skeledirge|Skeledirge, L80\n|switch|p2a: Great Tusk|Great Tusk, L80\n|-status|p2a: Great Tusk|brn';
const strayBurnStatusParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(strayBurnStatusLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const strayBurnStatusTarget = strayBurnStatusParser.strongest;
assert(!strayBurnStatusTarget?.ruledOutAbilities?.length, 'status lines without a linked move should not fabricate landed-status contradictions');

const gastroAcidPurifyingSaltLog = '|turn|1\n|switch|p1a: Dragapult|Dragapult, L80\n|switch|p2a: Garganacl|Garganacl, L80\n|move|p1a: Dragapult|Gastro Acid|p2a: Garganacl\n|-start|p2a: Garganacl|Gastro Acid\n|move|p1a: Dragapult|Thunder Wave|p2a: Garganacl\n|-status|p2a: Garganacl|par';
const gastroAcidPurifyingSaltParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(gastroAcidPurifyingSaltLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const gastroAcidPurifyingSaltTarget = gastroAcidPurifyingSaltParser.targets.find(t => t.species === 'Garganacl');
assert(!gastroAcidPurifyingSaltTarget?.ruledOutAbilities?.includes('Purifying Salt'), 'status landing after Gastro Acid should not fake a Purifying Salt contradiction once the ability was suppressed');
assert(gastroAcidPurifyingSaltTarget?.notes?.some(note => /Gastro Acid suppressed the target's ability/i.test(note)), 'status landing after Gastro Acid should explain why later contradictions from that window were intentionally skipped');

vm.runInContext(
  `team=[
    preset("Garganacl","Leftovers","Careful",{hp:252,atk:4,def:0,spa:0,spd:252,spe:0},["Salt Cure","Recover","Stealth Rock","Protect"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: gastroAcidPurifyingSaltTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const gastroAcidPurifyingSaltRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(gastroAcidPurifyingSaltRead.abilityRows[0][0] === 'Purifying Salt', 'status landing after Gastro Acid should leave Purifying Salt live in the detective pool instead of spending a fake hard rule-out');
assert(gastroAcidPurifyingSaltRead.summary.notes.some(x => /Gastro Acid suppressed the target's ability/i.test(x)), 'status landing after Gastro Acid should surface the suppression-window note in detective output');

const gastroAcidHeadlongRushLog = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Hydreigon|Hydreigon, L80\n|move|p1a: Great Tusk|Gastro Acid|p2a: Hydreigon\n|-start|p2a: Hydreigon|Gastro Acid\n|move|p1a: Great Tusk|Headlong Rush|p2a: Hydreigon\n|-damage|p2a: Hydreigon|38/100';
const gastroAcidHeadlongRushParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(gastroAcidHeadlongRushLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const gastroAcidHeadlongRushTarget = gastroAcidHeadlongRushParser.targets.find(t => t.species === 'Hydreigon');
assert(!gastroAcidHeadlongRushTarget?.ruledOutAbilities?.includes('Levitate'), 'Ground damage after Gastro Acid should not fake a Levitate contradiction while the ability was suppressed');

const delayedToxicSpikesStatusLog = '|turn|1\n|switch|p1a: Gliscor|Gliscor, L80\n|-sidestart|p2: Great Tusk|move: Toxic Spikes\n|switch|p2a: Great Tusk|Great Tusk, L80\n|-item|p2a: Great Tusk|Heavy-Duty Boots\n|move|p1a: Gliscor|Knock Off|p2a: Great Tusk\n|-enditem|p2a: Great Tusk|Heavy-Duty Boots|[from] move: Knock Off\n|turn|2\n|switch|p2a: Great Tusk|Great Tusk, L80\n|-ability|p1a: Gliscor|Poison Heal\n|-status|p2a: Great Tusk|psn|[from] move: Toxic Spikes';
const delayedToxicSpikesStatusParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(delayedToxicSpikesStatusLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const delayedToxicSpikesStatusTarget = delayedToxicSpikesStatusParser.targets.find(t => t.species === 'Great Tusk');
assert(!delayedToxicSpikesStatusTarget?.postItemLossProtectionRecovered, 'delayed Toxic Spikes aftermath should not be misread as protection returning just because an unrelated same-turn event happened first');
assert(!delayedToxicSpikesStatusTarget?.notes?.some(note => /without getting poisoned/i.test(note)), 'delayed Toxic Spikes aftermath should not keep a fake no-poison note once the poison line arrives later that turn');
assert(delayedToxicSpikesStatusTarget?.notes?.some(note => /Later got poisoned by Toxic Spikes after Heavy-Duty Boots were removed/i.test(note)), 'delayed Toxic Spikes aftermath should still keep the grounded status timing note');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: delayedToxicSpikesStatusTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const delayedToxicSpikesStatusRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(!delayedToxicSpikesStatusRead.summary.notes.some(x => /empty slot is no longer the only live current-item story/i.test(x)), 'delayed Toxic Spikes aftermath should not falsely reopen the current item story in detective notes');
assert(delayedToxicSpikesStatusRead.itemRows[0][0] === 'No Item', 'delayed Toxic Spikes aftermath should leave the empty-slot read anchored once the poison line proves Boots stayed gone');

console.log('[OK] replay ability upgrades passed');
