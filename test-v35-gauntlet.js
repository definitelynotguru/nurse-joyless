const fs = require('fs');
const vm = require('vm');
const path = require('path');

const src = fs.readFileSync(path.join('src', 'app.js'), 'utf8');
function makeEl(){return {value:'',checked:false,innerHTML:'',innerText:'',textContent:'',className:'',_items:[],options:[],style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},querySelector(){return makeEl()},querySelectorAll(){return[]},scrollIntoView(){},appendChild(){},click(){},closest(){return null},getBoundingClientRect(){return {top:999}}}}
const els={};
const ctx={console,TextDecoder,setTimeout(fn){if(typeof fn==='function')fn();return 0},clearTimeout(){},alert(){},localStorage:{getItem(){return null},setItem(){}},navigator:{clipboard:{writeText(){}}},URL:{createObjectURL(){return 'blob:gauntlet'},revokeObjectURL(){}},Blob:function(){},fetch:async()=>{throw new Error('offline gauntlet')}};
ctx.document={addEventListener(){},getElementById(id){return els[id]||(els[id]=makeEl())},querySelectorAll(){return[]},querySelector(){return null},createElement(){return makeEl()}};
ctx.window=ctx;ctx.addEventListener=function(){};vm.createContext(ctx);vm.runInContext(src,ctx,{timeout:10000});

const S={
Gholdengo:`Gholdengo @ Air Balloon\nAbility: Good as Gold\nTera Type: Fairy\nEVs: 252 HP / 196 Def / 60 Spe\nBold Nature\n- Nasty Plot\n- Shadow Ball\n- Recover\n- Make It Rain`,
Gliscor:`Gliscor @ Toxic Orb\nAbility: Poison Heal\nTera Type: Water\nEVs: 244 HP / 36 Def / 228 SpD\nCareful Nature\n- Spikes\n- Knock Off\n- Toxic\n- Protect`,
Garganacl:`Garganacl @ Leftovers\nAbility: Purifying Salt\nTera Type: Fairy\nEVs: 252 HP / 52 Def / 204 SpD\nCareful Nature\n- Stealth Rock\n- Salt Cure\n- Recover\n- Protect`,
Hatterene:`Hatterene @ Focus Sash\nAbility: Magic Bounce\nTera Type: Water\nEVs: 252 HP / 4 Def / 252 SpA\nQuiet Nature\nIVs: 0 Atk / 0 Spe\n- Trick Room\n- Psychic Noise\n- Dazzling Gleam\n- Healing Wish`,
TornadusT:`Tornadus-Therian @ Assault Vest\nAbility: Regenerator\nTera Type: Steel\nEVs: 252 HP / 4 SpD / 252 Spe\nTimid Nature\n- Bleakwind Storm\n- U-turn\n- Knock Off\n- Heat Wave`,
Toxapex:`Toxapex @ Heavy-Duty Boots\nAbility: Regenerator\nTera Type: Steel\nEVs: 252 HP / 252 Def / 4 SpD\nBold Nature\n- Recover\n- Toxic\n- Haze\n- Surf`,
Alomomola:`Alomomola @ Heavy-Duty Boots\nAbility: Regenerator\nTera Type: Ghost\nEVs: 4 HP / 252 Def / 252 SpD\nRelaxed Nature\n- Wish\n- Protect\n- Flip Turn\n- Scald`,
Primarina:`Primarina @ Leftovers\nAbility: Torrent\nTera Type: Steel\nEVs: 248 HP / 252 SpA / 8 SpD\nModest Nature\n- Moonblast\n- Surf\n- Psychic Noise\n- Calm Mind`,
RotomWash:`Rotom-Wash @ Leftovers\nAbility: Levitate\nTera Type: Steel\nEVs: 252 HP / 212 Def / 44 Spe\nBold Nature\n- Volt Switch\n- Hydro Pump\n- Will-O-Wisp\n- Protect`,
LandorusT:`Landorus-Therian @ Choice Scarf\nAbility: Intimidate\nTera Type: Ground\nEVs: 252 Atk / 4 SpA / 252 Spe\nNaive Nature\n- Earthquake\n- Stone Edge\n- U-turn\n- Grass Knot`,
Zapdos:`Zapdos @ Heavy-Duty Boots\nAbility: Static\nTera Type: Steel\nEVs: 248 HP / 252 Def / 8 SpA\nBold Nature\n- Hurricane\n- Volt Switch\n- Thunder Wave\n- Roost`,
WalkingWake:`Walking Wake @ Heavy-Duty Boots\nAbility: Protosynthesis\nTera Type: Fairy\nEVs: 252 SpA / 4 SpD / 252 Spe\nTimid Nature\n- Surf\n- Draco Meteor\n- Knock Off\n- Flip Turn`,
Dondozo:`Dondozo @ Leftovers\nAbility: Unaware\nTera Type: Fighting\nEVs: 252 HP / 252 Def / 4 SpD\nImpish Nature\n- Waterfall\n- Curse\n- Rest\n- Sleep Talk`,
DeoxysSpeed:`Deoxys-Speed @ Life Orb\nAbility: Pressure\nTera Type: Fighting\nEVs: 4 Def / 252 SpA / 252 Spe\nModest Nature\nIVs: 0 Atk\n- Nasty Plot\n- Psycho Boost\n- Focus Blast\n- Shadow Ball`,
IronValiant:`Iron Valiant @ Booster Energy\nAbility: Quark Drive\nTera Type: Steel\nEVs: 4 Atk / 252 SpA / 252 Spe\nNaive Nature\n- Moonblast\n- Close Combat\n- Knock Off\n- Encore`,
GreatTusk:`Great Tusk @ Booster Energy\nAbility: Protosynthesis\nTera Type: Ice\nEVs: 252 HP / 4 Atk / 252 Spe\nJolly Nature\n- Bulk Up\n- Headlong Rush\n- Ice Spinner\n- Rapid Spin`,
IronTreads:`Iron Treads @ Leftovers\nAbility: Quark Drive\nTera Type: Ghost\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Stealth Rock\n- Earthquake\n- Knock Off\n- Rapid Spin`,
WeezingGalar:`Weezing-Galar @ Heavy-Duty Boots\nAbility: Neutralizing Gas\nTera Type: Flying\nEVs: 252 HP / 252 Def / 4 SpD\nBold Nature\n- Sludge Bomb\n- Defog\n- Pain Split\n- Will-O-Wisp`,
RagingBolt:`Raging Bolt @ Booster Energy\nAbility: Protosynthesis\nTera Type: Fairy\nEVs: 4 Def / 252 SpA / 252 Spe\nModest Nature\nIVs: 20 Atk\n- Calm Mind\n- Thunderclap\n- Dragon Pulse\n- Thunderbolt`,
Kyurem:`Kyurem @ Choice Specs\nAbility: Pressure\nTera Type: Ice\nEVs: 252 SpA / 4 SpD / 252 Spe\nTimid Nature\n- Ice Beam\n- Freeze-Dry\n- Draco Meteor\n- Earth Power`,
Dragonite:`Dragonite @ Heavy-Duty Boots\nAbility: Multiscale\nTera Type: Normal\nEVs: 252 Atk / 4 SpD / 252 Spe\nAdamant Nature\n- Dragon Dance\n- Extreme Speed\n- Earthquake\n- Fire Punch`,
Garchomp:`Garchomp @ Rocky Helmet\nAbility: Rough Skin\nTera Type: Steel\nEVs: 252 HP / 164 Def / 92 Spe\nImpish Nature\n- Stealth Rock\n- Earthquake\n- Dragon Tail\n- Toxic`,
Salamence:`Salamence @ Life Orb\nAbility: Moxie\nTera Type: Flying\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Dragon Dance\n- Earthquake\n- Outrage\n- Stone Edge`,
Hydreigon:`Hydreigon @ Choice Specs\nAbility: Levitate\nTera Type: Steel\nEVs: 4 Def / 252 SpA / 252 Spe\nTimid Nature\n- Draco Meteor\n- Dark Pulse\n- Flamethrower\n- U-turn`,
Dragapult:`Dragapult @ Choice Band\nAbility: Infiltrator\nTera Type: Dragon\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Dragon Darts\n- U-turn\n- Sucker Punch\n- Tera Blast`,
Charizard:`Charizard @ Heavy-Duty Boots\nAbility: Blaze\nTera Type: Fire\nEVs: 4 Def / 252 SpA / 252 Spe\nTimid Nature\n- Flamethrower\n- Hurricane\n- Defog\n- Roost`,
Volcarona:`Volcarona @ Life Orb\nAbility: Flame Body\nTera Type: Grass\nEVs: 252 SpA / 4 SpD / 252 Spe\nTimid Nature\n- Fiery Dance\n- Bug Buzz\n- Giga Drain\n- Quiver Dance`,
Moltres:`Moltres @ Leftovers\nAbility: Pressure\nTera Type: Fairy\nEVs: 252 HP / 252 Def / 4 SpD\nBold Nature\n- Hurricane\n- Roost\n- Will-O-Wisp\n- Flamethrower`,
Arcanine:`Arcanine @ Choice Band\nAbility: Intimidate\nTera Type: Normal\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Fire Punch\n- Crunch\n- Extreme Speed\n- Close Combat`,
Pelipper:`Pelipper @ Damp Rock\nAbility: Drizzle\nTera Type: Steel\nEVs: 248 HP / 252 Def / 8 SpD\nBold Nature\n- Hurricane\n- Surf\n- U-turn\n- Roost`,
Barraskewda:`Barraskewda @ Choice Band\nAbility: Swift Swim\nTera Type: Water\nEVs: 252 Atk / 4 Def / 252 Spe\nAdamant Nature\n- Waterfall\n- Flip Turn\n- Close Combat\n- Aqua Jet`,
Torkoal:`Torkoal @ Charcoal\nAbility: Drought\nTera Type: Fire\nEVs: 208 HP / 40 Def / 252 SpA / 8 SpD\nQuiet Nature\nIVs: 0 Spe\n- Eruption\n- Lava Plume\n- Rapid Spin\n- Stealth Rock`,
Sunflora:`Sunflora @ Expert Belt\nAbility: Solar Power\nTera Type: Fairy\nEVs: 168 HP / 64 Def / 252 SpA / 24 SpD\nQuiet Nature\nIVs: 0 Atk / 0 Spe\n- Giga Drain\n- Earth Power\n- Weather Ball\n- Dazzling Gleam`,
HoopaUnbound:`Hoopa-Unbound @ Room Service\nAbility: Magician\nTera Type: Ghost\nEVs: 248 HP / 176 Atk / 72 Def / 12 SpA\nBrave Nature\nIVs: 0 Spe\n- Psychic Noise\n- Hyperspace Fury\n- Drain Punch\n- Trick Room`,
Ursaluna:`Ursaluna @ Flame Orb\nAbility: Guts\nTera Type: Normal\nEVs: 252 Atk / 28 Def / 228 SpD\nBrave Nature\nIVs: 0 Spe\n- Headlong Rush\n- Facade\n- Fire Punch\n- Roar`,
Cresselia:`Cresselia @ Mental Herb\nAbility: Levitate\nTera Type: Poison\nEVs: 252 HP / 252 Def / 4 SpD\nRelaxed Nature\nIVs: 0 Atk / 0 Spe\n- Ice Beam\n- Moonlight\n- Trick Room\n- Lunar Dance`,
Forretress:`Forretress @ Leftovers\nAbility: Sturdy\nTera Type: Water\nEVs: 252 HP / 252 Def / 4 SpD\nRelaxed Nature\n- Rapid Spin\n- Volt Switch\n- Stealth Rock\n- Spikes`,
Skarmory:`Skarmory @ Rocky Helmet\nAbility: Sturdy\nTera Type: Dragon\nEVs: 252 HP / 252 Def / 4 SpD\nImpish Nature\n- Roost\n- Defog\n- Stealth Rock\n- Spikes`,
Blissey:`Blissey @ Leftovers\nAbility: Natural Cure\nTera Type: Ghost\nEVs: 252 HP / 252 Def / 4 SpD\nBold Nature\n- Thunder Wave\n- Wish\n- Protect\n- Toxic`,
Corviknight:`Corviknight @ Leftovers\nAbility: Pressure\nTera Type: Dragon\nEVs: 248 HP / 252 Def / 8 SpD\nImpish Nature\n- Roost\n- Defog\n- U-turn\n- Body Press`
};
function team(list){return list.map(k=>S[k]).join('\n\n')}
const archetypes=[
  ['hazard-fat',['Gholdengo','TornadusT','Gliscor','Toxapex','Garganacl','Hatterene']],
  ['balance',['DeoxysSpeed','Dondozo','LandorusT','Zapdos','WalkingWake','Garganacl']],
  ['jack-balance',['IronValiant','GreatTusk','IronTreads','WeezingGalar','RagingBolt','Kyurem']],
  ['dragon-spam',['Charizard','Dragonite','Garchomp','Salamence','Hydreigon','Dragapult']],
  ['rain',['Pelipper','Barraskewda','RagingBolt','GreatTusk','LandorusT','Zapdos']],
  ['sun-room',['Sunflora','HoopaUnbound','Torkoal','Hatterene','Ursaluna','Cresselia']],
  ['bad-fire-stack',['Charizard','Volcarona','Moltres','Arcanine','Torkoal','Pelipper']],
  ['fat-passive',['Dondozo','Garganacl','Blissey','Alomomola','Toxapex','Skarmory']],
  ['six-sweepers',['IronValiant','Dragapult','Kyurem','RagingBolt','Dragonite','DeoxysSpeed']],
  ['no-win-field',['Forretress','Skarmory','Torkoal','Corviknight','Toxapex','Garganacl']]
];
const pool=Object.keys(S);
function mutate(list,i){const out=list.slice(); if(i%4===1){out[5]=pool[(i*7)%pool.length]} if(i%4===2){out[4]=pool[(i*11+3)%pool.length]} if(i%4===3){[out[0],out[1]]=[out[1],out[0]]} return Array.from(new Set(out)).slice(0,6);}
function analyzeText(text){const code=`team=parseTeam(${JSON.stringify(text)}); analysis=analyze(team); lastReasoning=buildReasoningReport(); lastReasoning`;return vm.runInContext(code,ctx,{timeout:10000});}
function rubric(label,r){let score=100; const notes=[]; const primary=r.identity.primary.name; const ids=r.identity.all||[]; const syn=r.synergy.scores; const rain=r.matchups.find(m=>m.name==='Rain')?.score??50; const names=r.team.map(p=>p.species).join(' '); const hasTR=r.team.some(p=>p.moves.includes('Trick Room')); const hasRain=/Pelipper/.test(names)||r.team.some(p=>p.moves.includes('Rain Dance')); const punish=(n,msg)=>{score-=n;notes.push(msg)};
  if(!hasTR && /Trick Room/.test(primary)) punish(35,'impossible Trick Room identity');
  if(!hasRain && /Rain Offense/.test(primary)) punish(35,'impossible Rain identity');
  if(label==='dragon-spam' && !/Dragon Spam/.test(primary)) punish(25,'missed Dragon Spam');
  if(label==='sun-room' && !/Sun Room|Trick Room/.test(primary)) punish(25,'missed Sun Room');
  if(label==='rain' && !/Rain Offense/.test(primary)) punish(25,'missed Rain Offense');
  if(label==='hazard-fat' && !/Hazard|Balance/.test(primary)) punish(20,'missed hazard/balance family');
  if(label==='balance' && /Stall|Hyper Offense|Rain/.test(primary)) punish(25,'misclassified balance');
  if(label==='jack-balance' && syn.winReliability>78) punish(18,'overpraised unreliable mixed balance');
  if(label==='bad-fire-stack' && syn.typeSynergy>60) punish(20,'overpraised bad type stack');
  if(label==='fat-passive' && syn.offensiveCoverage>75) punish(18,'overpraised passive offense');
  if(label==='six-sweepers' && syn.defensiveBackbone>55) punish(18,'overpraised all-sweeper defense');
  if(label==='no-win-field' && syn.winReliability>65) punish(20,'overpraised no-win team');
  if(ids.filter(x=>x.score>=96).length>1) punish(10,'too many near-perfect identities');
  if(rain===0) punish(15,'rain score collapsed to hard zero');
  if((r.suggestions||[]).length<3) punish(10,'too few suggestions');
  const issueCount=(r.synergy.issues||[]).length;
  if(issueCount>=5) punish(4,'many structural flags remain');
  if(syn.typeSynergy<40) punish(4,'very poor type synergy');
  if(syn.fieldControl<35) punish(3,'weak field control');
  if(syn.winReliability<45) punish(3,'shaky win reliability');
  if(syn.defensiveBackbone<35) punish(3,'thin defensive backbone');
  return {score:Math.max(0,score),notes,primary};
}
const results=[];
for(let i=0;i<320;i++){
  const [label,base]=archetypes[i%archetypes.length];
  const list=mutate(base,i);
  const r=analyzeText(team(list));
  const q=rubric(label,r);
  results.push({id:i+1,label,score:q.score,primary:q.primary,notes:q.notes,team:list,synergy:r.synergy.scores});
}
const avg=results.reduce((a,b)=>a+b.score,0)/results.length;
const pass90=results.filter(r=>r.score>=90).length;
const byLabel={};
for(const r of results){byLabel[r.label] ||= {count:0,avg:0,min:100,flags:0,primaries:{}};const b=byLabel[r.label];b.count++;b.avg+=r.score;b.min=Math.min(b.min,r.score);b.flags+=r.notes.length;b.primaries[r.primary]=(b.primaries[r.primary]||0)+1;}
for(const b of Object.values(byLabel)) b.avg=+(b.avg/b.count).toFixed(1);
fs.mkdirSync('docs',{recursive:true});
const report=['# Nurse Joyless V3.5 Adversarial Gauntlet','',`Generated: ${new Date().toISOString()}`,'',`Teams tested: ${results.length}`,`Average heuristic score: ${avg.toFixed(1)}/100`,`At or above 90: ${pass90}/${results.length}`,'','This is an automated regression audit, not proof of ladder win rate or expert manual validation. It intentionally penalizes fake archetypes, score inflation, impossible Trick Room/Rain labels, passive-team overpraise, and missing suggestions.','','## Family Summary','', '| Family | Count | Avg | Min | Flags | Primary breakdown |','|---|---:|---:|---:|---:|---|',...Object.entries(byLabel).map(([k,v])=>`| ${k} | ${v.count} | ${v.avg} | ${v.min} | ${v.flags} | ${Object.entries(v.primaries).map(([p,c])=>`${p}: ${c}`).join('; ')} |`),'','## Weakest Cases','',...results.slice().sort((a,b)=>a.score-b.score).slice(0,15).map(r=>`- #${r.id} ${r.label}: ${r.score}/100, ${r.primary}. ${r.notes.join('; ')||'no flags'}`),''].join('\n');
fs.writeFileSync('docs/V3.5_GAUNTLET_REPORT.md',report);
console.log(`[V3.5 gauntlet] teams=${results.length} avg=${avg.toFixed(1)} pass90=${pass90}/${results.length}`);
console.log('[V3.5 gauntlet] wrote docs/V3.5_GAUNTLET_REPORT.md');
if(avg<90 || pass90/results.length<0.7){console.error(report); throw new Error('V3.5 adversarial gauntlet failed');}
