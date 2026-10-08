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
        primary:{name:'Dragon Spam Offense',score:89,evidence:['base read']},
        secondary:[],
        all:[
          {name:'Dragon Spam Offense',score:89,evidence:['base read']},
          {name:'Hazard Stack Fat Balance',score:88,evidence:['base read']},
          {name:'Rain Offense',score:86,evidence:['base read']},
          {name:'Sun Offense',score:84,evidence:['base read']},
          {name:'Trick Room Offense',score:82,evidence:['base read']},
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
  def=95,
  spa=95,
  spd=95,
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
    baseStats:{spe:baseSpeed,atk,def,spa,spd},
    isDefensiveAnchor,
    isRemovalDenial,
  };
}

function assert(condition,message){
  if(!condition)throw new Error(message);
}

const ctx=makeContext();

const falseDragonTeam=[
  mon('Garchomp',{item:'Rocky Helmet',moves:['Stealth Rock','Earthquake','Dragon Tail','Toxic'],types:['Dragon','Ground'],offensiveTypes:['Ground'],baseSpeed:102,atk:130,def:95,spa:80,spd:85,isDefensiveAnchor:true}),
  mon('Dragapult',{item:'Heavy-Duty Boots',moves:['Hex','Will-O-Wisp','U-turn','Thunder Wave'],types:['Dragon','Ghost'],offensiveTypes:['Ghost'],baseSpeed:142,atk:120,def:75,spa:100,spd:75}),
  mon('Archaludon',{item:'Assault Vest',moves:['Flash Cannon','Thunderbolt','Body Press','Volt Switch'],types:['Steel','Dragon'],offensiveTypes:['Steel','Electric','Fighting'],baseSpeed:85,atk:105,def:130,spa:125,spd:65,isDefensiveAnchor:true}),
  mon('Latias',{item:'Heavy-Duty Boots',moves:['Roost','Healing Wish','Psychic Noise','Defog'],types:['Dragon','Psychic'],offensiveTypes:['Psychic'],baseSpeed:110,atk:80,def:90,spa:110,spd:130}),
  mon('Corviknight',{moves:['Roost','U-turn','Defog','Body Press'],types:['Flying','Steel'],offensiveTypes:['Fighting'],baseSpeed:67,atk:87,def:105,spa:53,spd:85,isDefensiveAnchor:true}),
  mon('Toxapex',{moves:['Recover','Surf','Haze','Toxic'],types:['Water','Poison'],offensiveTypes:['Water'],baseSpeed:35,atk:63,def:152,spa:53,spd:142,isDefensiveAnchor:true}),
];

const realDragonTeam=[
  mon('Dragonite',{item:'Heavy-Duty Boots',moves:['Dragon Dance','Dragon Claw','Earthquake','Fire Punch'],types:['Dragon','Flying'],offensiveTypes:['Dragon','Ground','Fire'],baseSpeed:80,atk:134,def:95,spa:100,spd:100}),
  mon('Salamence',{item:'Life Orb',moves:['Dragon Dance','Outrage','Earthquake','Stone Edge'],types:['Dragon','Flying'],offensiveTypes:['Dragon','Ground','Rock'],baseSpeed:100,atk:135,def:80,spa:110,spd:80}),
  mon('Hydreigon',{item:'Choice Specs',moves:['Draco Meteor','Dark Pulse','Flamethrower','U-turn'],types:['Dragon','Dark'],offensiveTypes:['Dragon','Dark','Fire'],baseSpeed:98,atk:105,def:90,spa:125,spd:90}),
  mon('Dragapult',{item:'Choice Band',moves:['Dragon Darts','Phantom Force','U-turn','Sucker Punch'],types:['Dragon','Ghost'],offensiveTypes:['Dragon','Ghost','Dark'],baseSpeed:142,atk:120,def:75,spa:100,spd:75}),
  mon('Garchomp',{item:'Lum Berry',moves:['Swords Dance','Scale Shot','Earthquake','Fire Fang'],types:['Dragon','Ground'],offensiveTypes:['Dragon','Ground','Fire'],baseSpeed:102,atk:130,def:95,spa:80,spd:85}),
  mon('Magnezone',{item:'Choice Specs',moves:['Thunderbolt','Volt Switch','Flash Cannon','Tera Blast'],types:['Electric','Steel'],offensiveTypes:['Electric','Steel'],baseSpeed:60,atk:70,def:115,spa:130,spd:90}),
];

const falseDragonProfile=ctx.profileTeam(falseDragonTeam,{});
assert(falseDragonProfile.dragonTypes.length===4,'expected the false dragon shell to stack four Dragon bodies');
assert(falseDragonProfile.dragonPressureAttackers.length<=1,'expected the false dragon shell to have almost no real Dragon STAB pressure');
assert(falseDragonProfile.dragonClosers.length===0,'expected the false dragon shell to lack Dragon closers');
const falseDragonIdentity=ctx.detectIdentities(falseDragonTeam,{},falseDragonProfile);
const falseDragonRow=falseDragonIdentity.all.find(row=>row.name==='Dragon Spam Offense');
assert(falseDragonIdentity.primary.name!=='Dragon Spam Offense','dragon-heavy balance shell should not keep Dragon Spam Offense as the primary read');
assert(falseDragonRow&&falseDragonRow.score<falseDragonIdentity.all.find(row=>row.name==='Balance').score,'false dragon spam score should fall below the balance read');
assert(falseDragonRow.evidence.some(line=>/repeated Dragon STAB pressure/.test(line)),'false dragon shell should explain the missing repeated Dragon pressure');
const falseDragonSynergy=ctx.evaluateSynergy(falseDragonTeam,{},falseDragonProfile,falseDragonIdentity);
assert(falseDragonSynergy.scores.winReliability<81,'false dragon shell should lose some reliability');
assert(falseDragonSynergy.scores.offensiveCoverage<78,'false dragon shell should lose some offensive-coverage score');
assert(falseDragonSynergy.issues.some(issue=>issue.title==='Dragon stack lacks repeated Dragon pressure'),'false dragon shell should surface the dragon-pressure issue');

const realDragonProfile=ctx.profileTeam(realDragonTeam,{});
assert(realDragonProfile.dragonTypes.length===5,'expected the real dragon shell to stack five Dragon attackers');
assert(realDragonProfile.dragonPressureAttackers.length>=4,'expected the real dragon shell to keep multiple Dragon breakers');
assert(realDragonProfile.dragonClosers.length>=4,'expected the real dragon shell to keep multiple Dragon closers');
const realDragonIdentity=ctx.detectIdentities(realDragonTeam,{},realDragonProfile);
const realDragonRow=realDragonIdentity.all.find(row=>row.name==='Dragon Spam Offense');
assert(realDragonIdentity.primary.name==='Dragon Spam Offense','real Dragon Spam shell should keep Dragon Spam Offense as the primary read');
assert(realDragonRow&&realDragonRow.score===89,'real Dragon Spam shell should preserve the base dragon-spam confidence');
const realDragonSynergy=ctx.evaluateSynergy(realDragonTeam,{},realDragonProfile,realDragonIdentity);
assert(!realDragonSynergy.issues.some(issue=>issue.title==='Dragon stack lacks repeated Dragon pressure'),'real Dragon Spam shell should not get the dragon-pressure issue');

console.log('[OK] dragon spam coherence regression passed');
