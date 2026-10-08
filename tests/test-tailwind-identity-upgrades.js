const fs=require('fs');
const vm=require('vm');

function clampScore(value, cap){
  const numeric=Number.isFinite(value)?value:0;
  return Math.max(0,Math.min(cap,numeric));
}

function mon(species,{
  moves=[],
  offensiveTypes=[],
  baseSpeed=80,
  atk=95,
  spa=95,
}={}){
  return {
    species,
    moves,
    offensiveTypes,
    baseStats:{spe:baseSpeed,atk,spa},
  };
}

function assert(condition,message){
  if(!condition)throw new Error(message);
}

function makeContext(){
  const ctx={
    console,
    unique(values=[]){return [...new Set(values)];},
    njCap:clampScore,
    profileTeam(){ return {}; },
    detectIdentities(){
      return {
        primary:{name:'Hyper Offense',score:84,evidence:['base read']},
        secondary:[],
        all:[
          {name:'Hyper Offense',score:84,evidence:['base read']},
          {name:'Balance',score:78,evidence:['base read']},
          {name:'Bulky Offense',score:74,evidence:['base read']},
          {name:'Stall',score:35,evidence:['base read']},
        ],
      };
    },
    evaluateSynergy(){
      return {
        scores:{winReliability:81,speedControl:80,roleCompression:77},
        issues:[],
      };
    },
  };
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('src/tailwind-identity-upgrades.js','utf8'),ctx,{filename:'tailwind-identity-upgrades.js'});
  return ctx;
}

const ctx=makeContext();

const passiveSingleSetterTailwindTeam=[
  mon('Latias',{moves:['Tailwind','Recover','Draco Meteor','Roost'],offensiveTypes:['Dragon'],baseSpeed:110,atk:80,spa:110}),
  mon('Kingambit',{moves:['Kowtow Cleave','Iron Head','Low Kick','Swords Dance'],offensiveTypes:['Dark','Steel','Fighting'],baseSpeed:50,atk:135,spa:60}),
  mon('Raging Bolt',{moves:['Thunderclap','Draco Meteor','Thunderbolt','Calm Mind'],offensiveTypes:['Electric','Dragon'],baseSpeed:75,atk:73,spa:137}),
  mon('Great Tusk',{moves:['Headlong Rush','Knock Off','Close Combat','Rapid Spin'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
  mon('Darkrai',{moves:['Dark Pulse','Sludge Bomb','Focus Blast','Nasty Plot'],offensiveTypes:['Dark','Poison','Fighting'],baseSpeed:125,atk:90,spa:135}),
  mon('Iron Valiant',{moves:['Moonblast','Close Combat','Knock Off','Encore'],offensiveTypes:['Fairy','Fighting','Dark'],baseSpeed:116,atk:130,spa:120}),
];

const passiveSingleProfile=ctx.profileTeam(passiveSingleSetterTailwindTeam,{});
assert(passiveSingleProfile.tailwindSetters.length===1,'passive Tailwind team should have one setter');
assert(passiveSingleProfile.tailwindExternalAbusers.length>=2,'passive Tailwind team should still advertise outside beneficiaries');
assert(passiveSingleProfile.tailwindHandoffSetters.length===0,'passive Tailwind team should have no handoff setter');
assert(passiveSingleProfile.tailwindSelfSufficientSetters.length===0,'passive Tailwind team should have no self-sufficient setter');
assert(passiveSingleProfile.tailwindFastPressure.length>=2,'passive Tailwind team should still lean on native fast pressure');
const passiveSingleIdentity=ctx.detectIdentities(passiveSingleSetterTailwindTeam,{},passiveSingleProfile);
const passiveSingleTailwindRow=passiveSingleIdentity.all.find(row=>row.name==='Tailwind Offense');
const passiveSingleBalanceRow=passiveSingleIdentity.all.find(row=>row.name==='Balance');
assert(passiveSingleIdentity.primary.name!=='Tailwind Offense','passive single-setter Tailwind should not keep Tailwind Offense as the primary read');
assert(passiveSingleTailwindRow.score<passiveSingleBalanceRow.score,'passive single-setter Tailwind should fall below the balance read');
assert(passiveSingleTailwindRow.evidence.some(line=>/lone Tailwind setter/i.test(line)),'passive single-setter Tailwind should explain the lone-setter handoff problem');
const passiveSingleSynergy=ctx.evaluateSynergy(passiveSingleSetterTailwindTeam,{},passiveSingleProfile,passiveSingleIdentity);
assert(passiveSingleSynergy.scores.winReliability<81,'passive single-setter Tailwind should lose win reliability');
assert(passiveSingleSynergy.scores.speedControl<80,'passive single-setter Tailwind should lose speed-control confidence');
assert(passiveSingleSynergy.issues.some(issue=>issue.title==='Single Tailwind setter cannot hand turns off cleanly'),'passive single-setter Tailwind should surface a dedicated synergy issue');

const shallowMultiSetterTailwindTeam=[
  mon('Latias',{moves:['Tailwind','Recover','Draco Meteor','Roost'],offensiveTypes:['Dragon'],baseSpeed:110,atk:80,spa:110}),
  mon('Suicune',{moves:['Tailwind','Scald','Calm Mind','Protect'],offensiveTypes:['Water'],baseSpeed:85,atk:75,spa:90}),
  mon('Kingambit',{moves:['Kowtow Cleave','Iron Head','Low Kick','Swords Dance'],offensiveTypes:['Dark','Steel','Fighting'],baseSpeed:50,atk:135,spa:60}),
  mon('Darkrai',{moves:['Dark Pulse','Sludge Bomb','Focus Blast','Nasty Plot'],offensiveTypes:['Dark','Poison','Fighting'],baseSpeed:125,atk:90,spa:135}),
  mon('Iron Valiant',{moves:['Moonblast','Close Combat','Knock Off','Encore'],offensiveTypes:['Fairy','Fighting','Dark'],baseSpeed:116,atk:130,spa:120}),
  mon('Dragapult',{moves:['Dragon Darts','Phantom Force','U-turn','Sucker Punch'],offensiveTypes:['Dragon','Ghost','Bug','Dark'],baseSpeed:142,atk:120,spa:100}),
];

const shallowProfile=ctx.profileTeam(shallowMultiSetterTailwindTeam,{});
assert(shallowProfile.tailwindSetters.length===2,'shallow multi-setter Tailwind should have two setters');
assert(shallowProfile.tailwindExternalAbusers.length===1,'shallow multi-setter Tailwind should only have one real outside abuser');
assert(shallowProfile.tailwindFastPressure.length>=2,'shallow multi-setter Tailwind should still lean on native fast closers');
const shallowIdentity=ctx.detectIdentities(shallowMultiSetterTailwindTeam,{},shallowProfile);
const shallowTailwindRow=shallowIdentity.all.find(row=>row.name==='Tailwind Offense');
assert(shallowIdentity.primary.name!=='Tailwind Offense','shallow multi-setter Tailwind should not keep Tailwind Offense as the primary read');
assert(shallowTailwindRow.score<78,'shallow multi-setter Tailwind should lose enough confidence to fall below balance');
assert(shallowTailwindRow.evidence.some(line=>/too few real mid-speed breakers/i.test(line)),'shallow multi-setter Tailwind should explain the missing payoff depth');
const shallowSynergy=ctx.evaluateSynergy(shallowMultiSetterTailwindTeam,{},shallowProfile,shallowIdentity);
assert(shallowSynergy.scores.winReliability<81,'shallow multi-setter Tailwind should lose win reliability');
assert(shallowSynergy.scores.speedControl<80,'shallow multi-setter Tailwind should lose speed-control confidence');
assert(shallowSynergy.issues.some(issue=>issue.title==='Multi-setter Tailwind shell lacks enough real payoffs'),'shallow multi-setter Tailwind should surface a dedicated synergy issue');

const fragileMultiSetterTailwindTeam=[
  mon('Latias',{moves:['Tailwind','Recover','Draco Meteor','Roost'],offensiveTypes:['Dragon'],baseSpeed:110,atk:80,spa:110}),
  mon('Suicune',{moves:['Tailwind','Scald','Calm Mind','Protect'],offensiveTypes:['Water'],baseSpeed:85,atk:75,spa:90}),
  mon('Kingambit',{moves:['Kowtow Cleave','Iron Head','Low Kick','Swords Dance'],offensiveTypes:['Dark','Steel','Fighting'],baseSpeed:50,atk:135,spa:60}),
  mon('Raging Bolt',{moves:['Thunderclap','Draco Meteor','Thunderbolt','Calm Mind'],offensiveTypes:['Electric','Dragon'],baseSpeed:75,atk:73,spa:137}),
  mon('Darkrai',{moves:['Dark Pulse','Sludge Bomb','Focus Blast','Nasty Plot'],offensiveTypes:['Dark','Poison','Fighting'],baseSpeed:125,atk:90,spa:135}),
  mon('Iron Valiant',{moves:['Moonblast','Close Combat','Knock Off','Encore'],offensiveTypes:['Fairy','Fighting','Dark'],baseSpeed:116,atk:130,spa:120}),
];

const fragileProfile=ctx.profileTeam(fragileMultiSetterTailwindTeam,{});
assert(fragileProfile.tailwindSetters.length===2,'fragile multi-setter Tailwind should have two setters');
assert(fragileProfile.tailwindExternalAbusers.length===2,'fragile multi-setter Tailwind should still advertise two outside abusers');
assert(fragileProfile.tailwindHandoffSetters.length===0,'fragile multi-setter Tailwind should have no handoff setters');
assert(fragileProfile.tailwindSelfSufficientSetters.length===0,'fragile multi-setter Tailwind should have no self-sufficient setters');
const fragileIdentity=ctx.detectIdentities(fragileMultiSetterTailwindTeam,{},fragileProfile);
const fragileTailwindRow=fragileIdentity.all.find(row=>row.name==='Tailwind Offense');
assert(fragileIdentity.primary.name!=='Tailwind Offense','fragile multi-setter Tailwind should not keep Tailwind Offense as the primary read');
assert(fragileTailwindRow.score<78,'fragile multi-setter Tailwind should lose enough confidence to fall below balance');
assert(fragileTailwindRow.evidence.some(line=>/multiple passive Tailwind setters/i.test(line)),'fragile multi-setter Tailwind should explain the failed handoff problem');
const fragileSynergy=ctx.evaluateSynergy(fragileMultiSetterTailwindTeam,{},fragileProfile,fragileIdentity);
assert(fragileSynergy.scores.winReliability<81,'fragile multi-setter Tailwind should lose win reliability');
assert(fragileSynergy.scores.speedControl<80,'fragile multi-setter Tailwind should lose speed-control confidence');
assert(fragileSynergy.issues.some(issue=>issue.title==='Passive multi-setter Tailwind shell still loses too many boosted turns'),'fragile multi-setter Tailwind should surface the new handoff issue');

const cleanTailwindTeam=[
  mon('Tornadus-Therian',{moves:['Tailwind','Hurricane','U-turn','Knock Off'],offensiveTypes:['Flying','Dark'],baseSpeed:121,atk:100,spa:110}),
  mon('Great Tusk',{moves:['Headlong Rush','Knock Off','Close Combat','Rapid Spin'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
  mon('Raging Bolt',{moves:['Thunderclap','Draco Meteor','Thunderbolt','Calm Mind'],offensiveTypes:['Electric','Dragon'],baseSpeed:75,atk:73,spa:137}),
  mon('Kingambit',{moves:['Kowtow Cleave','Iron Head','Low Kick','Swords Dance'],offensiveTypes:['Dark','Steel','Fighting'],baseSpeed:50,atk:135,spa:60}),
  mon('Enamorus',{moves:['Moonblast','Earth Power','Mystical Fire','Calm Mind'],offensiveTypes:['Fairy','Ground','Fire'],baseSpeed:106,atk:115,spa:135}),
  mon('Darkrai',{moves:['Dark Pulse','Sludge Bomb','Focus Blast','Nasty Plot'],offensiveTypes:['Dark','Poison','Fighting'],baseSpeed:125,atk:90,spa:135}),
];

const cleanProfile=ctx.profileTeam(cleanTailwindTeam,{});
assert(cleanProfile.tailwindHandoffSetters.length===1,'clean Tailwind team should have one handoff setter');
assert(cleanProfile.tailwindExternalAbusers.length>=3,'clean Tailwind team should have a broad outside abuser core');
const cleanIdentity=ctx.detectIdentities(cleanTailwindTeam,{},cleanProfile);
assert(cleanIdentity.primary.name==='Tailwind Offense','clean Tailwind team should become a Tailwind Offense read');
assert(cleanIdentity.all.find(row=>row.name==='Tailwind Offense').score>=86,'clean Tailwind team should earn a strong Tailwind score');
const cleanSynergy=ctx.evaluateSynergy(cleanTailwindTeam,{},cleanProfile,cleanIdentity);
assert(!cleanSynergy.issues.some(issue=>issue.title==='Single Tailwind setter cannot hand turns off cleanly'),'clean Tailwind team should avoid the lone-setter issue');
assert(!cleanSynergy.issues.some(issue=>issue.title==='Multi-setter Tailwind shell lacks enough real payoffs'),'clean Tailwind team should avoid the shallow multi-setter issue');

const selfSufficientSetterTailwindTeam=[
  mon('Tornadus-Therian',{moves:['Tailwind','Bleakwind Storm','Heat Wave','Knock Off'],offensiveTypes:['Flying','Fire','Dark'],baseSpeed:121,atk:100,spa:110}),
  mon('Great Tusk',{moves:['Headlong Rush','Knock Off','Close Combat','Rapid Spin'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
  mon('Raging Bolt',{moves:['Thunderclap','Draco Meteor','Thunderbolt','Calm Mind'],offensiveTypes:['Electric','Dragon'],baseSpeed:75,atk:73,spa:137}),
  mon('Kingambit',{moves:['Kowtow Cleave','Iron Head','Low Kick','Swords Dance'],offensiveTypes:['Dark','Steel','Fighting'],baseSpeed:50,atk:135,spa:60}),
  mon('Enamorus',{moves:['Moonblast','Earth Power','Mystical Fire','Calm Mind'],offensiveTypes:['Fairy','Ground','Fire'],baseSpeed:106,atk:115,spa:135}),
  mon('Darkrai',{moves:['Dark Pulse','Sludge Bomb','Focus Blast','Nasty Plot'],offensiveTypes:['Dark','Poison','Fighting'],baseSpeed:125,atk:90,spa:135}),
];

const selfSufficientProfile=ctx.profileTeam(selfSufficientSetterTailwindTeam,{});
assert(selfSufficientProfile.tailwindSelfSufficientSetters.length===1,'self-sufficient Tailwind team should recognize an offensive setter');
const selfSufficientIdentity=ctx.detectIdentities(selfSufficientSetterTailwindTeam,{},selfSufficientProfile);
assert(selfSufficientIdentity.primary.name==='Tailwind Offense','self-sufficient Tailwind setter team should keep Tailwind Offense as the primary read');
assert(selfSufficientIdentity.all.find(row=>row.name==='Tailwind Offense').score>=82,'self-sufficient Tailwind setter team should keep a strong Tailwind score');

console.log('[OK] tailwind identity upgrades passed');