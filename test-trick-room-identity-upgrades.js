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
}={}){
  return {
    species,
    item,
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
        primary:{name:'Trick Room Offense',score:84,evidence:['base read']},
        secondary:[],
        all:[
          {name:'Trick Room Offense',score:84,evidence:['base read']},
          {name:'Sun Room',score:81,evidence:['base read']},
          {name:'Balance',score:78,evidence:['base read']},
          {name:'Bulky Offense',score:72,evidence:['base read']},
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
  vm.runInContext(fs.readFileSync('src/trick-room-identity-upgrades.js','utf8'),ctx,{filename:'trick-room-identity-upgrades.js'});
  return ctx;
}

const ctx=makeContext();

const passiveSingleSetterRoomTeam=[
  mon('Cresselia',{moves:['Trick Room','Moonlight','Ice Beam','Psychic'],offensiveTypes:['Ice','Psychic'],baseSpeed:85,atk:70,spa:75}),
  mon('Kingambit',{moves:['Kowtow Cleave','Iron Head','Sucker Punch','Low Kick'],offensiveTypes:['Dark','Steel','Fighting'],baseSpeed:50,atk:135,spa:60}),
  mon('Ursaluna',{moves:['Facade','Headlong Rush','Fire Punch','Swords Dance'],offensiveTypes:['Normal','Ground','Fire'],baseSpeed:50,atk:140,spa:45}),
  mon('Raging Bolt',{moves:['Thunderclap','Draco Meteor','Thunderbolt','Calm Mind'],offensiveTypes:['Electric','Dragon'],baseSpeed:75,atk:73,spa:137}),
  mon('Darkrai',{moves:['Dark Pulse','Sludge Bomb','Nasty Plot','Focus Blast'],offensiveTypes:['Dark','Poison','Fighting'],baseSpeed:125,atk:90,spa:135}),
  mon('Iron Valiant',{moves:['Moonblast','Close Combat','Knock Off','Encore'],offensiveTypes:['Fairy','Fighting','Dark'],baseSpeed:116,atk:130,spa:120}),
];

const passiveProfile=ctx.profileTeam(passiveSingleSetterRoomTeam,{});
assert(passiveProfile.trickRoomSetters.length===1,'passive Trick Room team should have one setter');
assert(passiveProfile.trickRoomAbusers.length>=2,'passive Trick Room team should still look like it has room abusers on paper');
assert(passiveProfile.trickRoomExternalAbusers.length>=2,'passive Trick Room team should have outside room abusers');
assert(passiveProfile.trickRoomHandoffSetters.length===0,'passive Trick Room team should have no handoff setter');
assert(passiveProfile.trickRoomSelfSufficientSetters.length===0,'passive Trick Room team should have no self-sufficient setter');
assert(passiveProfile.trickRoomFastPressure.length>=2,'passive Trick Room team should still lean on normal-speed pressure');
const passiveIdentity=ctx.detectIdentities(passiveSingleSetterRoomTeam,{},passiveProfile);
const passiveRoomRow=passiveIdentity.all.find(row=>row.name==='Trick Room Offense');
const passiveBalanceRow=passiveIdentity.all.find(row=>row.name==='Balance');
assert(passiveIdentity.primary.name!=='Trick Room Offense','passive single-setter room should not keep Trick Room Offense as the primary read');
assert(passiveRoomRow.score<passiveBalanceRow.score,'passive single-setter room should fall below the balance read');
assert(passiveRoomRow.evidence.some(line=>/lone Trick Room setter/i.test(line)),'passive single-setter room should explain the lone-setter handoff problem');
const passiveSynergy=ctx.evaluateSynergy(passiveSingleSetterRoomTeam,{},passiveProfile,passiveIdentity);
assert(passiveSynergy.scores.winReliability<81,'passive single-setter room should lose win reliability');
assert(passiveSynergy.scores.speedControl<80,'passive single-setter room should lose speed-control confidence');
assert(passiveSynergy.issues.some(issue=>issue.title==='Single Trick Room setter cannot hand turns off cleanly'),'passive single-setter room should surface a dedicated synergy issue');

const cleanHandoffRoomTeam=[
  mon('Uxie',{moves:['Trick Room','Memento','Stealth Rock','U-turn'],offensiveTypes:['Psychic','Bug'],baseSpeed:95,atk:75,spa:75}),
  mon('Kingambit',{moves:['Kowtow Cleave','Iron Head','Sucker Punch','Low Kick'],offensiveTypes:['Dark','Steel','Fighting'],baseSpeed:50,atk:135,spa:60}),
  mon('Ursaluna',{moves:['Facade','Headlong Rush','Fire Punch','Swords Dance'],offensiveTypes:['Normal','Ground','Fire'],baseSpeed:50,atk:140,spa:45}),
  mon('Raging Bolt',{moves:['Thunderclap','Draco Meteor','Thunderbolt','Calm Mind'],offensiveTypes:['Electric','Dragon'],baseSpeed:75,atk:73,spa:137}),
  mon('Torkoal',{moves:['Lava Plume','Rapid Spin','Yawn','Stealth Rock'],offensiveTypes:['Fire'],baseSpeed:20,atk:85,spa:85}),
  mon('Iron Hands',{moves:['Drain Punch','Wild Charge','Heavy Slam','Swords Dance'],offensiveTypes:['Fighting','Electric','Steel'],baseSpeed:50,atk:140,spa:68}),
];

const cleanHandoffProfile=ctx.profileTeam(cleanHandoffRoomTeam,{});
assert(cleanHandoffProfile.trickRoomHandoffSetters.length===1,'clean room team should have one handoff setter');
const cleanHandoffIdentity=ctx.detectIdentities(cleanHandoffRoomTeam,{},cleanHandoffProfile);
assert(cleanHandoffIdentity.primary.name==='Trick Room Offense','clean handoff room team should keep Trick Room Offense as the primary read');
assert(cleanHandoffIdentity.all.find(row=>row.name==='Trick Room Offense').score===84,'clean handoff room team should keep its base room confidence');
const cleanHandoffSynergy=ctx.evaluateSynergy(cleanHandoffRoomTeam,{},cleanHandoffProfile,cleanHandoffIdentity);
assert(!cleanHandoffSynergy.issues.some(issue=>issue.title==='Single Trick Room setter cannot hand turns off cleanly'),'clean handoff room team should avoid the lone-setter issue');

const selfSufficientSetterRoomTeam=[
  mon('Hatterene',{item:'Room Service',moves:['Trick Room','Draining Kiss','Psychic Noise','Mystical Fire'],offensiveTypes:['Fairy','Psychic','Fire'],baseSpeed:29,atk:90,spa:136}),
  mon('Kingambit',{moves:['Kowtow Cleave','Iron Head','Sucker Punch','Low Kick'],offensiveTypes:['Dark','Steel','Fighting'],baseSpeed:50,atk:135,spa:60}),
  mon('Ursaluna',{moves:['Facade','Headlong Rush','Fire Punch','Swords Dance'],offensiveTypes:['Normal','Ground','Fire'],baseSpeed:50,atk:140,spa:45}),
  mon('Raging Bolt',{moves:['Thunderclap','Draco Meteor','Thunderbolt','Calm Mind'],offensiveTypes:['Electric','Dragon'],baseSpeed:75,atk:73,spa:137}),
  mon('Amoonguss',{moves:['Spore','Pollen Puff','Sludge Bomb','Protect'],offensiveTypes:['Grass','Poison'],baseSpeed:30,atk:85,spa:85}),
  mon('Torkoal',{moves:['Lava Plume','Rapid Spin','Yawn','Stealth Rock'],offensiveTypes:['Fire'],baseSpeed:20,atk:85,spa:85}),
];

const selfSufficientProfile=ctx.profileTeam(selfSufficientSetterRoomTeam,{});
assert(selfSufficientProfile.trickRoomSelfSufficientSetters.length===1,'self-sufficient room team should recognize the setter as a real abuser too');
const selfSufficientIdentity=ctx.detectIdentities(selfSufficientSetterRoomTeam,{},selfSufficientProfile);
assert(selfSufficientIdentity.primary.name==='Trick Room Offense','self-sufficient setter room team should keep Trick Room Offense as the primary read');
assert(selfSufficientIdentity.all.find(row=>row.name==='Trick Room Offense').score===84,'self-sufficient setter room team should keep its base room confidence');

console.log('[OK] trick room identity upgrades passed');