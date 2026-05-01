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
    profileTeam(team=[]){
      return {
        drought:team.filter(mon=>mon.ability==='Drought').map(mon=>mon.species),
        drizzle:team.filter(mon=>mon.ability==='Drizzle').map(mon=>mon.species),
        hazards:team.filter(mon=>mon.moves.some(move=>['Stealth Rock','Spikes','Toxic Spikes','Sticky Web'].includes(move))).map(mon=>mon.species),
        layers:team.filter(mon=>mon.moves.some(move=>['Spikes','Toxic Spikes','Sticky Web'].includes(move))).map(mon=>mon.species),
        removalDenial:team.filter(mon=>mon.isRemovalDenial).map(mon=>mon.species),
        pivot:team.filter(mon=>mon.moves.some(move=>['U-turn','Volt Switch','Flip Turn','Parting Shot','Teleport'].includes(move))).map(mon=>mon.species),
        defensiveAnchors:team.filter(mon=>mon.isDefensiveAnchor).map(mon=>mon.species),
      };
    },
    detectIdentities(){
      return {
        primary:{name:'Hazard Stack Fat Balance',score:88,evidence:['base read']},
        secondary:[],
        all:[
          {name:'Hazard Stack Fat Balance',score:88,evidence:['base read']},
          {name:'Trick Room Offense',score:84,evidence:['base read']},
          {name:'Sun Room',score:80,evidence:['base read']},
          {name:'Balance',score:73,evidence:['base read']},
          {name:'Stall',score:70,evidence:['base read']},
          {name:'Hyper Offense',score:68,evidence:['base read']},
        ],
      };
    },
    evaluateSynergy(){
      return {
        scores:{winReliability:81,speedControl:79,roleCompression:76,offensiveCoverage:78,fieldControl:79},
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
  isDefensiveAnchor=false,
  isRemovalDenial=false,
}={}){
  return {
    species,
    ability,
    item,
    moves,
    offensiveTypes,
    types,
    baseStats:{spe:baseSpeed,atk,spa},
    isDefensiveAnchor,
    isRemovalDenial,
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

const passiveHazardTeam=[
  mon('Gholdengo',{ability:'Good as Gold',moves:['Shadow Ball','Make It Rain','Recover','Nasty Plot'],types:['Steel','Ghost'],offensiveTypes:['Steel','Ghost'],baseSpeed:84,atk:60,spa:133,isRemovalDenial:true}),
  mon('Skarmory',{moves:['Spikes','Roost','Whirlwind','Body Press'],types:['Steel','Flying'],offensiveTypes:['Fighting'],baseSpeed:70,atk:80,spa:40,isDefensiveAnchor:true}),
  mon('Ting-Lu',{moves:['Stealth Rock','Ruination','Whirlwind','Earthquake'],types:['Dark','Ground'],offensiveTypes:['Ground'],baseSpeed:45,atk:110,spa:55,isDefensiveAnchor:true}),
  mon('Alomomola',{moves:['Wish','Protect','Flip Turn','Scald'],types:['Water'],offensiveTypes:['Water'],baseSpeed:65,atk:75,spa:40,isDefensiveAnchor:true}),
  mon('Blissey',{moves:['Soft-Boiled','Seismic Toss','Thunder Wave','Teleport'],types:['Normal'],offensiveTypes:['Normal'],baseSpeed:55,atk:10,spa:75,isDefensiveAnchor:true}),
  mon('Clodsire',{moves:['Toxic','Recover','Earthquake','Haze'],types:['Poison','Ground'],offensiveTypes:['Ground'],baseSpeed:20,atk:75,spa:45,isDefensiveAnchor:true}),
];

const activeHazardTeam=[
  mon('Gholdengo',{ability:'Good as Gold',moves:['Shadow Ball','Make It Rain','Recover','Nasty Plot'],types:['Steel','Ghost'],offensiveTypes:['Steel','Ghost'],baseSpeed:84,atk:60,spa:133,isRemovalDenial:true}),
  mon('Tornadus-Therian',{moves:['Bleakwind Storm','U-turn','Knock Off','Heat Wave'],types:['Flying'],offensiveTypes:['Flying','Dark','Fire'],baseSpeed:121,atk:100,spa:110}),
  mon('Gliscor',{moves:['Spikes','Knock Off','Toxic','Protect'],types:['Ground','Flying'],offensiveTypes:['Ground','Dark'],baseSpeed:95,atk:95,spa:45,isDefensiveAnchor:true}),
  mon('Pecharunt',{moves:['Malignant Chain','Foul Play','Parting Shot','Recover'],types:['Poison','Ghost'],offensiveTypes:['Poison','Dark'],baseSpeed:60,atk:88,spa:88,isDefensiveAnchor:true}),
  mon('Garganacl',{moves:['Stealth Rock','Salt Cure','Recover','Protect'],types:['Rock'],offensiveTypes:['Rock'],baseSpeed:35,atk:100,spa:45,isDefensiveAnchor:true}),
  mon('Hatterene',{moves:['Trick Room','Psychic Noise','Dazzling Gleam','Healing Wish'],types:['Psychic','Fairy'],offensiveTypes:['Psychic','Fairy'],baseSpeed:29,atk:90,spa:136}),
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
const goodTrickRoomRow=goodIdentity.all.find(row=>row.name==='Trick Room Offense');
assert(goodTrickRoomRow&&goodTrickRoomRow.score===84,'real Room team should keep the base Trick Room confidence when the payoff is real');
const goodSynergy=ctx.evaluateSynergy(goodRoomTeam,{},goodProfile,goodIdentity);
assert(!goodSynergy.issues.some(issue=>issue.title==='Trick Room plan lacks slow closers'),'real Room team should not get the shallow Trick Room issue');

const passiveHazardProfile=ctx.profileTeam(passiveHazardTeam,{});
assert(passiveHazardProfile.hazardPayoffAttackers.length===1,'expected the passive hazard shell to have only one payoff attacker');
const passiveHazardIdentity=ctx.detectIdentities(passiveHazardTeam,{},passiveHazardProfile);
const passiveHazardRow=passiveHazardIdentity.all.find(row=>row.name==='Hazard Stack Fat Balance');
assert(passiveHazardRow.score<=62,'passive hazard shell should lose most of its hazard-stack confidence');
assert(passiveHazardRow.evidence.some(line=>/lacks enough payoff attackers/.test(line)),'expected hazard row to explain the missing payoff attackers');
const passiveHazardSynergy=ctx.evaluateSynergy(passiveHazardTeam,{},passiveHazardProfile,passiveHazardIdentity);
assert(passiveHazardSynergy.scores.fieldControl<79,'expected passive hazard shell to lose field-control score');
assert(passiveHazardSynergy.scores.offensiveCoverage<78,'expected passive hazard shell to lose offensive-coverage score');
assert(passiveHazardSynergy.issues.some(issue=>issue.title==='Hazard plan lacks payoff attackers'),'expected passive hazard issue to surface');

const activeHazardProfile=ctx.profileTeam(activeHazardTeam,{});
assert(activeHazardProfile.hazardPayoffAttackers.length>=3,'expected the active hazard shell to keep multiple payoff attackers');
const activeHazardIdentity=ctx.detectIdentities(activeHazardTeam,{},activeHazardProfile);
const activeHazardRow=activeHazardIdentity.all.find(row=>row.name==='Hazard Stack Fat Balance');
assert(activeHazardRow.score===88,'active hazard shell should keep its base hazard-stack confidence');
const activeHazardSynergy=ctx.evaluateSynergy(activeHazardTeam,{},activeHazardProfile,activeHazardIdentity);
assert(!activeHazardSynergy.issues.some(issue=>issue.title==='Hazard plan lacks payoff attackers'),'active hazard shell should not get the passive hazard issue');

console.log('[OK] weather identity upgrades Trick Room and hazard coherence checks passed');
