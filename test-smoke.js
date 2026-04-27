const fs = require('fs');
const vm = require('vm');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, 'src/app.js'), 'utf8');

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
    onchange: null,
    style: {},
    classList: { add(){}, remove(){}, toggle(){} },
    querySelector(){ return makeFakeElement(); },
    scrollIntoView(){},
    appendChild(){},
    click(){},
  };
}
const elements = {};
const doc = {
  addEventListener(){},
  getElementById(id) { if (!elements[id]) elements[id] = makeFakeElement(); return elements[id]; },
  querySelectorAll() { return []; },
  createElement() { return makeFakeElement(); },
};
const fakeDex = {
  species: {
    get(name) {
      const id = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const data = {
        mewtwo: { name: 'Mewtwo', id:'mewtwo', exists: true, types: ['Psychic'], baseStats: { hp:106, atk:110, def:90, spa:154, spd:90, spe:130 }, abilities: {0:'Pressure', H:'Unnerve'} },
        blastoise: { name: 'Blastoise', id:'blastoise', exists: true, types: ['Water'], baseStats: { hp:79, atk:83, def:100, spa:85, spd:105, spe:78 }, abilities: {0:'Torrent', H:'Rain Dish'} },
        dragapult: { name: 'Dragapult', id:'dragapult', exists: true, types: ['Dragon','Ghost'], baseStats: { hp:88, atk:120, def:75, spa:100, spd:75, spe:142 }, abilities: {0:'Clear Body', 1:'Infiltrator'} },
      };
      return data[id] || { name, id, exists: false };
    },
    all() { return [this.get('Mewtwo'), this.get('Blastoise'), this.get('Dragapult')]; }
  },
  moves: {
    get(name) {
      const id = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const data = {
        aurasphere: { name: 'Aura Sphere', id:'aurasphere', exists: true, type: 'Fighting', category: 'Special', basePower: 80, accuracy: true, priority: 0 },
        shadowball: { name: 'Shadow Ball', id:'shadowball', exists: true, type: 'Ghost', category: 'Special', basePower: 80, accuracy: 100, priority: 0 },
        thunderwave: { name: 'Thunder Wave', id:'thunderwave', exists: true, type: 'Electric', category: 'Status', basePower: 0, accuracy: 90, priority: 0 },
        surf: { name: 'Surf', id:'surf', exists: true, type: 'Water', category: 'Special', basePower: 90, accuracy: 100, priority: 0 },
      };
      return data[id] || { name, id, exists: false };
    },
    all() { return [this.get('Aura Sphere'), this.get('Shadow Ball'), this.get('Thunder Wave'), this.get('Surf')]; }
  },
  getLearnsets: async () => ({learnsets:{mewtwo:{learnset:{aurasphere:['9M'],shadowball:['9M']}},blastoise:{learnset:{surf:['9M']}}}}),
};
const context = {
  console,
  setTimeout(fn){ fn(); return 0; },
  alert(){},
  localStorage: { getItem(){ return ''; }, setItem(){} },
  navigator: { clipboard: { writeText(){ return Promise.resolve(); } } },
  document: doc,
  window: { pkmn: { Dex: fakeDex }, addEventListener(){} },
  URL: { createObjectURL(){return 'blob:test'}, revokeObjectURL(){} },
  Blob: function Blob(){},
  fetch: async () => { throw new Error('offline'); },
};
const tests = String.raw`
(function(){
  function assert(cond, msg){ if(!cond) throw new Error(msg); }
  assert(DexAdapter.useDex === true, 'DexAdapter did not detect fake full Dex');
  assert(types({species:'Mewtwo'}).join('/') === 'Psychic', 'types() is not using DexAdapter species data');
  const mt = preset('Mewtwo','Life Orb','Timid',{hp:0,atk:0,def:0,spa:252,spd:4,spe:252},['Aura Sphere','Shadow Ball']);
  const bl = preset('Blastoise','Leftovers','Calm',{hp:252,atk:0,def:0,spa:0,spd:252,spe:4},['Surf']);
  assert(moveName('aura sphere') === 'Aura Sphere', 'moveName() is not using DexAdapter move resolver');
  const ko = dmg(mt, bl, 'Aura Sphere', { hpPct: 50 });

  assert(html('\"x\" & <tag>') === '&quot;x&quot; &amp; &lt;tag&gt;', 'html() must escape quotes for attribute-safe rendering');
  const teraAtt = preset('Dragapult','Life Orb','Timid',{hp:0,atk:0,def:0,spa:252,spd:4,spe:252},['Flamethrower']);
  const teraDef = preset('Corviknight','Leftovers','Impish',{hp:248,atk:0,def:252,spa:0,spd:8,spe:0},['Roost']);
  const noTeraFire = dmg(teraAtt, teraDef, 'Flamethrower', { hpPct: 100 });
  const yesTeraFire = dmg(teraAtt, teraDef, 'Flamethrower', { hpPct: 100, attackerTera: true, attackerTeraType: 'Fire' });
  assert(yesTeraFire.maxd > noTeraFire.maxd * 1.2, 'attacker Tera type should increase STAB damage for matching Tera moves');
  assert(ko.rolls.length === 16 && Number.isFinite(ko.ko), 'dmg() failed with Dex-only move/species');
  assert(nHitChance(ko,2) >= ko.ko, '2HKO chance should not be below OHKO chance');

  const parsed = parseTeam('Mewtwo @ Life Orb\nAbility: Pressure\nEVs: 252 SpA / 4 SpD / 252 Spe\nTimid Nature\n- aura sphere\n- shadow ball');
  assert(parsed[0].species === 'Mewtwo', 'parseTeam species normalization failed with Dex-only species');
  assert(parsed[0].moves[0] === 'Aura Sphere', 'parseTeam move normalization failed with Dex-only move');

  team = parseTeam(SAMPLE); analysis = analyze(team); lastReasoning = buildReasoningReport();
  assert(/Dragon Spam/.test(lastReasoning.identity.primary.name), 'Sparring Lab failed to detect Dragon Spam Offense');
  const stallScore = lastReasoning.identity.all.find(x => x.name === 'Stall').score;
  assert(stallScore < 60, 'Sparring Lab is overclassifying dragon spam as stall');
  assert(lastReasoning.matchups.find(x => x.name === 'Hazard Stack').score >= 45, 'Hazard matchup should account for Boots/Defog counterplay');
  renderAdvancedLab(lastReasoning);
  assert(document.getElementById('archetypeResults').innerHTML.includes('Team Identity'), 'Advanced Sparring Lab did not render identity');

  const sunRoom = 'Sunflora @ Expert Belt\nAbility: Solar Power\nTera Type: Fairy\nEVs: 168 HP / 64 Def / 252 SpA / 24 SpD\nQuiet Nature\nIVs: 0 Atk / 0 Spe\n- Giga Drain\n- Earth Power\n- Weather Ball\n- Dazzling Gleam\n\nHoopa-Unbound @ Room Service\nAbility: Magician\nTera Type: Ghost\nEVs: 248 HP / 176 Atk / 72 Def / 12 SpA\nBrave Nature\nIVs: 0 Spe\n- Psychic Noise\n- Hyperspace Fury\n- Drain Punch\n- Trick Room\n\nTorkoal @ Charcoal\nAbility: Drought\nTera Type: Fire\nEVs: 208 HP / 40 Def / 252 SpA / 8 SpD\nQuiet Nature\nIVs: 0 Spe\n- Eruption\n- Lava Plume\n- Rapid Spin\n- Stealth Rock\n\nHatterene @ Focus Sash\nAbility: Magic Bounce\nTera Type: Water\nEVs: 248 HP / 4 Def / 252 SpA / 4 SpD\nQuiet Nature\nIVs: 0 Atk / 0 Spe\n- Psychic Noise\n- Dazzling Gleam\n- Healing Wish\n- Trick Room\n\nUrsaluna @ Flame Orb\nAbility: Guts\nTera Type: Normal\nEVs: 252 Atk / 28 Def / 228 SpD\nBrave Nature\nIVs: 0 Spe\n- Headlong Rush\n- Facade\n- Fire Punch\n- Roar\n\nCresselia @ Mental Herb\nAbility: Levitate\nTera Type: Poison\nEVs: 252 HP / 252 Def / 4 SpD\nRelaxed Nature\nIVs: 0 Atk / 0 Spe\n- Ice Beam\n- Moonlight\n- Trick Room\n- Lunar Dance';
  team = parseTeam(sunRoom); analysis = analyze(team); lastReasoning = buildReasoningReport();
  assert(/Sun Room|Trick Room/.test(lastReasoning.identity.primary.name), 'Sparring Lab failed to detect Sun Room / Trick Room');
  assert(lastReasoning.synergy.scores.speedControl >= 60, 'Trick Room should count as speed control');

  const log = '|turn|3\n|switch|p2a: Dragapult|Dragapult, L80\n|move|p2a: Dragapult|Thunder Wave|p1a: Blastoise\n|-damage|p2a: Dragapult|88/100|[from] Stealth Rock\n|move|p2a: Dragapult|Shadow Ball|p1a: Blastoise\n|-damage|p1a: Blastoise|57/100\n|turn|4\n|move|p2a: Dragapult|Draco Meteor|p1a: Blastoise\n|-damage|p1a: Blastoise|12/100\n|-item|p2a: Dragapult|Choice Specs\n';
  const parser = new ReplayParser(); const turns = parser.parse(log);
  assert(turns.length === 2, 'ReplayParser did not parse turns');
  assert(parser.evidence.some(e => e.conclusion.includes('Heavy-Duty Boots')), 'ReplayParser did not detect Boots impossible');
  assert(parser.evidence.some(e => e.conclusion.includes('Assault Vest')), 'ReplayParser did not detect AV impossible');
  assert(parser.evidence.some(e => e.conclusion.includes('Choice items contradicted')), 'ReplayParser did not detect a same-stay Choice contradiction');
  assert(parser.replayRead.strongest?.species === 'Dragapult', 'ReplayParser did not select the strongest detective target');
  assert(parser.replayRead.strongest?.revealedItem === 'Choice Specs', 'ReplayParser did not keep revealed item context');
  assert(parser.replayRead.strongest?.detectiveInput?.targetSpecies === 'Blastoise', 'ReplayParser did not keep the actual replay target for detective math');
  const speedLog = '|turn|1\n|switch|p1a: Dragonite|Dragonite, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p2a: Gholdengo|Make It Rain|p1a: Dragonite\n|-damage|p1a: Dragonite|55/100\n|move|p1a: Dragonite|Earthquake|p2a: Gholdengo\n|-damage|p2a: Gholdengo|41/100';
  const speedParser = new ReplayParser(); speedParser.parse(speedLog);
  const gholdengoSpeedTarget = speedParser.replayRead.targets.find(t => t.species === 'Gholdengo');
  assert(gholdengoSpeedTarget?.detectiveInput?.speedContext?.opponentSpecies === 'Dragonite', 'ReplayParser did not keep neutral-priority speed context');
  assert(gholdengoSpeedTarget?.detectiveInput?.evidence === 'i_hit_them', 'ReplayParser did not preserve defender-side damage evidence direction');
  assert(gholdengoSpeedTarget?.detectiveInput?.userSpecies === 'Dragonite', 'ReplayParser did not keep the attacking teammate for defender-side detective math');
  const defenseLog = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Great Tusk|Headlong Rush|p2a: Gholdengo\n|-damage|p2a: Gholdengo|35/100\n|-item|p2a: Gholdengo|Leftovers';
  const defenseParser = new ReplayParser(); defenseParser.parse(defenseLog);
  assert(defenseParser.replayRead.strongest?.species === 'Gholdengo', 'ReplayParser did not elevate defender-side evidence when it had the richest clue stack');
  assert(defenseParser.replayRead.strongest?.detectiveInput?.evidence === 'i_hit_them', 'ReplayParser strongest read did not hand defender-side evidence to the detective');
  assert(defenseParser.replayRead.strongest?.detectiveInput?.userSpecies === 'Great Tusk', 'ReplayParser strongest read lost the attacking teammate on defender-side evidence');
  document.getElementById('replayInput').value = log; analyzeReplay();
  assert(document.getElementById('replayResults').innerHTML.includes('Heavy-Duty Boots'), 'Replay Observer did not render evidence');
  assert(document.getElementById('replayResults').innerHTML.includes('Load strongest read into detective'), 'Replay Observer did not offer a detective handoff');
  loadReplayDetective();
  assert(document.getElementById('detective').innerHTML.includes('Choice Specs'), 'Replay handoff did not anchor the detective read');
  const detectiveFacts = getAgentFacts('detective');
  assert(detectiveFacts.species === 'Dragapult', 'Detective agent facts did not use the live detective read');
  assert(/Choice Specs/.test(detectiveFacts.verdict || '') || detectiveFacts.topItem === 'Choice Specs', 'Detective agent facts did not carry the anchored item read');

  document.getElementById('attacker').value = '0'; document.getElementById('attacker')._items = [mt];
  document.getElementById('defender').value = '0'; document.getElementById('defender')._items = [bl];
  document.getElementById('move').value = 'Aura Sphere'; document.getElementById('hp').value = '50';
  document.getElementById('hazards').value = 'none'; document.getElementById('field').value = 'none';
  document.getElementById('attackerTera').checked = false; document.getElementById('defenderTera').checked = true; document.getElementById('defenderTeraType').value = 'Dark';
  renderKo(); assert(document.getElementById('ko').innerHTML.includes('3HKO odds'), 'KO panel missing 3HKO odds');

  const md = buildMarkdownReport(lastReasoning); assert(md.includes('Matchup Matrix') && md.includes('Suggested Additions'), 'Markdown report incomplete');
  const val = validateTeamAdvanced(team); assert(val.length === 6, 'Validation did not process all team members');
  console.log('[OK] smoke tests passed');
})();
`;
vm.runInNewContext(source + '\n' + tests, context, { timeout: 5000 });
