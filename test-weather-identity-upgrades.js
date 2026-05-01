const fs=require('fs');
const vm=require('vm');

function clampScore(value, cap){
  const numeric=Number.isFinite(value)?value:0;
  return Math.max(0,Math.min(cap,numeric));
}

function makeContext(){
  const ctx={
    console,
    unique(values=[]){return [...new Set(values)];},
    njCap:clampScore,
    offensiveMoveTypes(mon){return mon.offensiveTypes||[];},
    types(mon){return mon.types||[];},
    profileTeam(){return {drought:[],drizzle:[]};},
    detectIdentities(){
      return {
        primary:{name:'Trick Room Offense',score:84,evidence:['base read']},
        secondary:[],
        all:[
          {name:'Trick Room Offense',score:84,evidence:['base read']},
          {name:'Sun Room',score:80,evidence:['base read']},
          {name:'Balance',score:73,evidence:['base read']},
          {name:'Hyper Offense',score:68,evidence:['base read']},
        ],
      };
    },
    evaluateSynergy(){
      return {
        scores:{winReliability:81,speedControl:79,roleCompression:76},
        issues:[],
      };
    },
  };
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('src/weather-identity-upgrades.js','utf8'),ctx,{filename:'weather-identity-upgrades.js'});
  return ctx;
}

function mon(species,{
  ability='',
  item='Leftovers',
  moves=[],
  offensiveTypes=[],
  types=[],
  baseSpeed=80,
  atk=95,
  spa=95,
}={}){
  return {
    species,
    ability,
    item,
    moves,
    offensiveTypes,
    types,
    baseStats:{spe:baseSpeed,atk,spa},
  };
}

function assert(condition,message){
  if(!condition)throw new Error(message);
}

const ctx=makeContext();

const shallowRoomTeam=[
  mon('Hatterene',{moves:['Trick Room','Psychic Noise','Dazzling Gleam','Healing Wish'],types:['Psychic','Fairy'],offensiveTypes:['Psychic','Fairy'],baseSpeed:29,atk:90,spa:136}),
  mon('Cresselia',{moves:['Trick Room','Moonlight','Ice Beam','Lunar Dance'],types:['Psychic'],offensiveTypes:['Ice'],baseSpeed:85,atk:70,spa:75}),
  mon('Iron Valiant',{moves:['Moonblast','Close Combat','Encore','Knock Off'],types:['Fairy','Fighting'],offensiveTypes:['Fairy','Fighting'],baseSpeed:116,atk:130,spa:120}),
  mon('Walking Wake',{ability:'Protosynthesis',moves:['Hydro Steam','Draco Meteor','Flamethrower','Flip Turn'],types:['Water','Dragon'],offensiveTypes:['Water','Dragon','Fire'],baseSpeed:109,atk:83,spa:125}),
  mon('Zapdos',{moves:['Thunderbolt','Hurricane','Volt Switch','Roost'],types:['Electric','Flying'],offensiveTypes:['Electric','Flying'],baseSpeed:100,atk:90,spa:125}),
  mon('Kingambit',{moves:['Swords Dance','Kowtow Cleave','Sucker Punch','Iron Head'],types:['Dark','Steel'],offensiveTypes:['Dark','Steel'],baseSpeed:50,atk:135,spa:60}),
];

const goodRoomTeam=[
  mon('Hatterene',{moves:['Trick Room','Psychic Noise','Dazzling Gleam','Healing Wish'],types:['Psychic','Fairy'],offensiveTypes:['Psychic','Fairy'],baseSpeed:29,atk:90,spa:136}),
  mon('Cresselia',{moves:['Trick Room','Moonlight','Ice Beam','Lunar Dance'],types:['Psychic'],offensiveTypes:['Ice'],baseSpeed:85,atk:70,spa:75}),
  mon('Ursaluna',{moves:['Facade','Headlong Rush','Fire Punch','Protect'],types:['Ground','Normal'],offensiveTypes:['Normal','Ground','Fire'],baseSpeed:50,atk:140,spa:45}),
  mon('Torkoal',{moves:['Eruption','Lava Plume','Rapid Spin','Stealth Rock'],types:['Fire'],offensiveTypes:['Fire'],baseSpeed:20,atk:85,spa:85}),
  mon('Hoopa-Unbound',{item:'Room Service',moves:['Hyperspace Fury','Drain Punch','Psychic Noise','Trick Room'],types:['Psychic','Dark'],offensiveTypes:['Dark','Fighting','Psychic'],baseSpeed:80,atk:160,spa:170}),
  mon('Sunflora',{ability:'Solar Power',moves:['Weather Ball','Earth Power','Giga Drain','Dazzling Gleam'],types:['Grass'],offensiveTypes:['Grass','Ground','Normal','Fairy'],baseSpeed:30,atk:75,spa:105}),
];

const shallowProfile=ctx.profileTeam(shallowRoomTeam,{});
assert(shallowProfile.trickRoomSetters.length===2,'expected two Trick Room setters in shallow shell');
assert(shallowProfile.trickRoomPayoffs.length===1,'expected only one real Trick Room payoff in shallow shell');
assert(shallowProfile.fastAttackers.length>=3,'expected the shallow shell to be fast-heavy');

const shallowIdentity=ctx.detectIdentities(shallowRoomTeam,{},shallowProfile);
assert(shallowIdentity.primary.name!=='Trick Room Offense','shallow Trick Room shell should not stay primary Trick Room Offense');
const trickRoomRow=shallowIdentity.all.find(row=>row.name==='Trick Room Offense');
assert(trickRoomRow&&trickRoomRow.score<shallowIdentity.all.find(row=>row.name==='Balance').score,'shallow Trick Room score should fall below the more coherent balance read');
assert(trickRoomRow.evidence.some(line=>/almost no slow payoff/.test(line)),'expected Trick Room row to explain the missing slow payoff');

const shallowSynergy=ctx.evaluateSynergy(shallowRoomTeam,{},shallowProfile,shallowIdentity);
assert(shallowSynergy.scores.winReliability<81,'expected shallow Trick Room shell to lose win reliability');
assert(shallowSynergy.scores.speedControl<79,'expected shallow Trick Room shell to lose speed-control score');
assert(shallowSynergy.issues.some(issue=>issue.title==='Trick Room plan lacks slow closers'),'expected shallow Trick Room issue to surface');

const goodProfile=ctx.profileTeam(goodRoomTeam,{});
assert(goodProfile.trickRoomPayoffs.length>=2,'expected the good Room team to have multiple payoffs');
const goodIdentity=ctx.detectIdentities(goodRoomTeam,{},goodProfile);
assert(goodIdentity.primary.name==='Trick Room Offense','real Room team should keep Trick Room Offense as the primary identity');
const goodSynergy=ctx.evaluateSynergy(goodRoomTeam,{},goodProfile,goodIdentity);
assert(!goodSynergy.issues.some(issue=>issue.title==='Trick Room plan lacks slow closers'),'real Room team should not get the shallow Trick Room issue');

console.log('[OK] weather identity upgrades Trick Room coherence checks passed');