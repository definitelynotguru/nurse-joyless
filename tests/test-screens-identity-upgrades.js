const fs=require('fs');
const vm=require('vm');

function clampScore(value, cap){
  const numeric=Number.isFinite(value)?value:0;
  return Math.max(0,Math.min(cap,numeric));
}

function mon(species,{
  item='Leftovers',
  moves=[],
  offensiveTypes=[],
  baseSpeed=80,
  atk=95,
  spa=95,
  recoveryAnchor=false,
  pivot=false,
}={}){
  return {
    species,
    item,
    moves,
    offensiveTypes,
    baseStats:{spe:baseSpeed,atk,spa},
    recoveryAnchor,
    pivot,
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
    profileTeam(team=[]){
      return {
        recoveryAnchors:team.filter(mon=>mon.recoveryAnchor).map(mon=>mon.species),
        pivot:team.filter(mon=>mon.pivot||mon.moves.some(move=>['U-turn','Volt Switch','Flip Turn','Parting Shot','Teleport'].includes(move))).map(mon=>mon.species),
      };
    },
    detectIdentities(){
      return {
        primary:{name:'Hyper Offense',score:84,evidence:['base read']},
        secondary:[],
        all:[
          {name:'Hyper Offense',score:84,evidence:['base read']},
          {name:'Balance',score:78,evidence:['base read']},
          {name:'Bulky Offense',score:74,evidence:['base read']},
          {name:'Stall',score:34,evidence:['base read']},
        ],
      };
    },
    evaluateSynergy(){
      return {
        scores:{winReliability:82,roleCompression:79,offensiveCoverage:81},
        issues:[],
      };
    },
  };
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('src/screens-identity-upgrades.js','utf8'),ctx,{filename:'screens-identity-upgrades.js'});
  return ctx;
}

const ctx=makeContext();

const realScreensTeam=[
  mon('Grimmsnarl',{item:'Light Clay',moves:['Reflect','Light Screen','Parting Shot','Spirit Break'],offensiveTypes:['Dark','Fairy'],baseSpeed:60,atk:120,spa:95,pivot:true}),
  mon('Dragonite',{item:'Lum Berry',moves:['Dragon Dance','Earthquake','Extreme Speed','Fire Punch'],offensiveTypes:['Dragon','Ground','Fire'],baseSpeed:80,atk:134,spa:100}),
  mon('Garchomp',{item:'Life Orb',moves:['Swords Dance','Earthquake','Scale Shot','Fire Fang'],offensiveTypes:['Dragon','Ground','Fire'],baseSpeed:102,atk:130,spa:80}),
  mon('Iron Valiant',{item:'Booster Energy',moves:['Moonblast','Close Combat','Knock Off','Encore'],offensiveTypes:['Fairy','Fighting','Dark'],baseSpeed:116,atk:130,spa:120}),
  mon('Darkrai',{item:'Life Orb',moves:['Dark Pulse','Sludge Bomb','Focus Blast','Nasty Plot'],offensiveTypes:['Dark','Poison','Fighting'],baseSpeed:125,atk:90,spa:135}),
  mon('Roaring Moon',{item:'Booster Energy',moves:['Dragon Dance','Knock Off','Acrobatics','Earthquake'],offensiveTypes:['Dragon','Dark','Flying','Ground'],baseSpeed:119,atk:139,spa:55}),
];

const realProfile=ctx.profileTeam(realScreensTeam,{});
assert(realProfile.screensSetters.length===1,'real screens team should have one screens setter');
assert(realProfile.screensClaySetters.length===1,'real screens team should recognize a Light Clay setter');
assert(realProfile.screensHandoffSetters.length===1,'real screens team should recognize a handoff setter');
assert(realProfile.screensExternalAbusers.length>=3,'real screens team should have several outside setup abusers');
assert(realProfile.screensExternalClosers.length>=4,'real screens team should have several outside closers');
const realIdentity=ctx.detectIdentities(realScreensTeam,{},realProfile);
const realScreensRow=realIdentity.all.find(row=>row.name==='Screens Offense');
assert(realIdentity.primary.name==='Screens Offense','real screens team should become a Screens Offense read');
assert(realScreensRow.score>=86,'real screens team should earn a strong screens score');
assert(realScreensRow.evidence.some(line=>/real screens package/i.test(line)),'real screens team should explain the genuine screens conversion');
const realSynergy=ctx.evaluateSynergy(realScreensTeam,{},realProfile,realIdentity);
assert(!realSynergy.issues.some(issue=>/screens/i.test(issue.title)),'real screens team should avoid fake-screens issues');

const fragileSingleSetterTeam=[
  mon('Grimmsnarl',{item:'Light Clay',moves:['Reflect','Light Screen','Spirit Break','Taunt'],offensiveTypes:['Dark','Fairy'],baseSpeed:60,atk:120,spa:95}),
  mon('Zapdos',{item:'Heavy-Duty Boots',moves:['Thunderbolt','Volt Switch','Roost','Heat Wave'],offensiveTypes:['Electric','Flying','Fire'],baseSpeed:100,atk:90,spa:125,recoveryAnchor:true,pivot:true}),
  mon('Gliscor',{item:'Toxic Orb',moves:['Earthquake','U-turn','Roost','Spikes'],offensiveTypes:['Ground'],baseSpeed:95,atk:95,spa:45,recoveryAnchor:true,pivot:true}),
  mon('Kingambit',{item:'Black Glasses',moves:['Kowtow Cleave','Sucker Punch','Iron Head','Swords Dance'],offensiveTypes:['Dark','Steel'],baseSpeed:50,atk:135,spa:60}),
  mon('Iron Valiant',{item:'Booster Energy',moves:['Moonblast','Close Combat','Knock Off','Encore'],offensiveTypes:['Fairy','Fighting','Dark'],baseSpeed:116,atk:130,spa:120}),
  mon('Dragapult',{item:'Choice Specs',moves:['Draco Meteor','Shadow Ball','Flamethrower','U-turn'],offensiveTypes:['Dragon','Ghost','Fire'],baseSpeed:142,atk:120,spa:100,pivot:true}),
];

const fragileProfile=ctx.profileTeam(fragileSingleSetterTeam,{});
assert(fragileProfile.screensSetters.length===1,'fragile screens team should have one setter');
assert(fragileProfile.screensHandoffSetters.length===0,'fragile screens team should not have a handoff setter');
assert(fragileProfile.screensRecoveryAnchors.length>=2,'fragile screens team should still lean on recovery anchors');
const fragileIdentity=ctx.detectIdentities(fragileSingleSetterTeam,{},fragileProfile);
const fragileScreensRow=fragileIdentity.all.find(row=>row.name==='Screens Offense');
assert(fragileIdentity.primary.name!=='Screens Offense','fragile screens team should not keep Screens Offense as the primary read');
assert(fragileScreensRow.score<78,'fragile screens team should lose enough confidence to fall below balance');
assert(fragileScreensRow.evidence.some(line=>/lone screens setter/i.test(line)),'fragile screens team should explain the single-setter burden');
const fragileSynergy=ctx.evaluateSynergy(fragileSingleSetterTeam,{},fragileProfile,fragileIdentity);
assert(fragileSynergy.scores.winReliability<82,'fragile screens team should lose win reliability');
assert(fragileSynergy.issues.some(issue=>issue.title==='Single screens setter cannot convert support into pressure'),'fragile screens team should surface the single-setter screens issue');

const shallowMultiSetterTeam=[
  mon('Grimmsnarl',{item:'Light Clay',moves:['Reflect','Light Screen','Taunt','Spirit Break'],offensiveTypes:['Dark','Fairy'],baseSpeed:60,atk:120,spa:95}),
  mon('Ninetales-Alola',{item:'Light Clay',moves:['Aurora Veil','Freeze-Dry','Encore','Moonblast'],offensiveTypes:['Ice','Fairy'],baseSpeed:109,atk:67,spa:81}),
  mon('Zapdos',{item:'Heavy-Duty Boots',moves:['Thunderbolt','Volt Switch','Roost','Heat Wave'],offensiveTypes:['Electric','Flying','Fire'],baseSpeed:100,atk:90,spa:125,recoveryAnchor:true,pivot:true}),
  mon('Gliscor',{item:'Toxic Orb',moves:['Earthquake','U-turn','Roost','Spikes'],offensiveTypes:['Ground'],baseSpeed:95,atk:95,spa:45,recoveryAnchor:true,pivot:true}),
  mon('Kingambit',{item:'Black Glasses',moves:['Kowtow Cleave','Sucker Punch','Iron Head','Swords Dance'],offensiveTypes:['Dark','Steel'],baseSpeed:50,atk:135,spa:60}),
  mon('Great Tusk',{item:'Leftovers',moves:['Headlong Rush','Rapid Spin','Knock Off','Stealth Rock'],offensiveTypes:['Ground','Dark'],baseSpeed:87,atk:131,spa:53}),
];

const shallowProfile=ctx.profileTeam(shallowMultiSetterTeam,{});
assert(shallowProfile.screensSetters.length===2,'shallow screens team should have two setters');
assert(shallowProfile.screensExternalAbusers.length<=2,'shallow screens team should have too few outside abusers');
const shallowIdentity=ctx.detectIdentities(shallowMultiSetterTeam,{},shallowProfile);
const shallowScreensRow=shallowIdentity.all.find(row=>row.name==='Screens Offense');
assert(shallowIdentity.primary.name!=='Screens Offense','shallow dual-screens team should not keep Screens Offense as the primary read');
assert(shallowScreensRow.evidence.some(line=>/too few real setup or closing threats/i.test(line)),'shallow dual-screens team should explain the missing payoff depth');
const shallowSynergy=ctx.evaluateSynergy(shallowMultiSetterTeam,{},shallowProfile,shallowIdentity);
assert(shallowSynergy.issues.some(issue=>issue.title==='Screens package lacks enough real payoffs'),'shallow dual-screens team should surface the shallow-payoff issue');

console.log('[OK] screens identity upgrades passed');
