const fs=require('fs');
const vm=require('vm');

function clampScore(value, cap){
  const numeric=Number.isFinite(value)?value:0;
  return Math.max(0,Math.min(cap,numeric));
}

function mon(species,{
  item='Leftovers',
  ability='',
  moves=[],
  offensiveTypes=[],
  types=[],
  baseSpeed=80,
  atk=95,
  spa=95,
  recoveryAnchor=false,
  pivot=false,
  airborne=false,
}={}){
  return {
    species,
    item,
    ability,
    moves,
    offensiveTypes,
    types,
    baseStats:{spe:baseSpeed,atk,spa},
    recoveryAnchor,
    pivot,
    airborne,
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
        scores:{winReliability:82,speedControl:80,roleCompression:78},
        issues:[],
      };
    },
  };
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('src/webs-identity-upgrades.js','utf8'),ctx,{filename:'webs-identity-upgrades.js'});
  return ctx;
}

const ctx=makeContext();

const realWebsTeam=[
  mon('Ribombee',{item:'Focus Sash',moves:['Sticky Web','Moonblast','Stun Spore','U-turn'],offensiveTypes:['Fairy','Bug'],types:['Bug','Fairy'],baseSpeed:124,atk:55,spa:95,pivot:true}),
  mon('Kingambit',{item:'Black Glasses',moves:['Kowtow Cleave','Iron Head','Low Kick','Swords Dance'],offensiveTypes:['Dark','Steel','Fighting'],types:['Dark','Steel'],baseSpeed:50,atk:135,spa:60}),
  mon('Great Tusk',{item:'Booster Energy',moves:['Headlong Rush','Knock Off','Close Combat','Rapid Spin'],offensiveTypes:['Ground','Dark','Fighting'],types:['Ground','Fighting'],baseSpeed:87,atk:131,spa:53}),
  mon('Raging Bolt',{item:'Leftovers',moves:['Thunderclap','Draco Meteor','Thunderbolt','Calm Mind'],offensiveTypes:['Electric','Dragon'],types:['Electric','Dragon'],baseSpeed:75,atk:73,spa:137}),
  mon('Iron Hands',{item:'Assault Vest',moves:['Drain Punch','Wild Charge','Ice Punch','Fake Out'],offensiveTypes:['Fighting','Electric','Ice'],types:['Fighting','Electric'],baseSpeed:50,atk:140,spa:40}),
  mon('Gholdengo',{item:'Choice Scarf',moves:['Make It Rain','Shadow Ball','Focus Blast','Trick'],offensiveTypes:['Steel','Ghost','Fighting'],types:['Steel','Ghost'],baseSpeed:84,atk:60,spa:133}),
];

const realProfile=ctx.profileTeam(realWebsTeam,{});
assert(realProfile.websSetters.length===1,'real webs team should have one Sticky Web setter');
assert(realProfile.websSelfSufficientSetters.length===1,'real webs team should recognize a self-sufficient setter');
assert(realProfile.websExternalGroundedAbusers.length>=3,'real webs team should have several outside grounded abusers');
assert(realProfile.websNativeFastPressure.length===0,'real webs team should not lean on native fast pressure');
const realIdentity=ctx.detectIdentities(realWebsTeam,{},realProfile);
const realWebsRow=realIdentity.all.find(row=>row.name==='Webs Offense');
assert(realIdentity.primary.name==='Webs Offense','real webs team should become a Webs Offense read');
assert(realWebsRow.score>=86,'real webs team should earn a strong webs score');
assert(realWebsRow.evidence.some(line=>/real Sticky Web plan/i.test(line)),'real webs team should explain the genuine webs conversion');
const realSynergy=ctx.evaluateSynergy(realWebsTeam,{},realProfile,realIdentity);
assert(!realSynergy.issues.some(issue=>/Sticky Web/i.test(issue.title)),'real webs team should avoid fake-webs issues');

const shallowWebsTeam=[
  mon('Ribombee',{item:'Focus Sash',moves:['Sticky Web','Moonblast','Stun Spore','U-turn'],offensiveTypes:['Fairy','Bug'],types:['Bug','Fairy'],baseSpeed:124,atk:55,spa:95,pivot:true}),
  mon('Darkrai',{item:'Life Orb',moves:['Dark Pulse','Sludge Bomb','Focus Blast','Nasty Plot'],offensiveTypes:['Dark','Poison','Fighting'],types:['Dark'],baseSpeed:125,atk:90,spa:135}),
  mon('Iron Valiant',{item:'Booster Energy',moves:['Moonblast','Close Combat','Knock Off','Encore'],offensiveTypes:['Fairy','Fighting','Dark'],types:['Fairy','Fighting'],baseSpeed:116,atk:130,spa:120}),
  mon('Zapdos',{item:'Heavy-Duty Boots',moves:['Thunderbolt','Heat Wave','Hurricane','Roost'],offensiveTypes:['Electric','Fire','Flying'],types:['Electric','Flying'],baseSpeed:100,atk:90,spa:125,recoveryAnchor:true}),
  mon('Landorus-Therian',{item:'Choice Scarf',ability:'Intimidate',moves:['Earthquake','U-turn','Stone Edge','Knock Off'],offensiveTypes:['Ground','Rock','Dark'],types:['Ground','Flying'],baseSpeed:91,atk:145,spa:105,pivot:true,airborne:true}),
  mon('Kingambit',{item:'Black Glasses',moves:['Kowtow Cleave','Iron Head','Low Kick','Swords Dance'],offensiveTypes:['Dark','Steel','Fighting'],types:['Dark','Steel'],baseSpeed:50,atk:135,spa:60}),
];

const shallowProfile=ctx.profileTeam(shallowWebsTeam,{});
assert(shallowProfile.websSetters.length===1,'shallow webs team should have one setter');
assert(shallowProfile.websExternalGroundedAbusers.length<=2,'shallow webs team should have too few real grounded beneficiaries');
assert(shallowProfile.websNativeFastPressure.length>=2,'shallow webs team should lean on native fast pressure');
assert(shallowProfile.websImmuneOffense.length>=2,'shallow webs team should include several webs-immune offensive pieces');
const shallowIdentity=ctx.detectIdentities(shallowWebsTeam,{},shallowProfile);
const shallowWebsRow=shallowIdentity.all.find(row=>row.name==='Webs Offense');
assert(shallowIdentity.primary.name!=='Webs Offense','shallow webs team should not keep Webs Offense as the primary read');
assert(shallowWebsRow.score<78,'shallow webs team should lose enough confidence to fall below balance');
assert(shallowWebsRow.evidence.some(line=>/too few grounded mid-speed attackers/i.test(line)),'shallow webs team should explain the missing grounded payoff depth');
const shallowSynergy=ctx.evaluateSynergy(shallowWebsTeam,{},shallowProfile,shallowIdentity);
assert(shallowSynergy.scores.winReliability<82,'shallow webs team should lose win reliability');
assert(shallowSynergy.scores.speedControl<80,'shallow webs team should lose speed-control confidence');
assert(shallowSynergy.issues.some(issue=>issue.title==='Sticky Web support lacks enough grounded payoffs'),'shallow webs team should surface the dedicated payoff issue');

const bulkyWebsTeam=[
  mon('Ribombee',{item:'Focus Sash',moves:['Sticky Web','Moonblast','Stun Spore','U-turn'],offensiveTypes:['Fairy','Bug'],types:['Bug','Fairy'],baseSpeed:124,atk:55,spa:95,pivot:true}),
  mon('Gliscor',{item:'Toxic Orb',moves:['Earthquake','U-turn','Roost','Spikes'],offensiveTypes:['Ground'],types:['Ground','Flying'],baseSpeed:95,atk:95,spa:45,recoveryAnchor:true,pivot:true,airborne:true}),
  mon('Zapdos',{item:'Heavy-Duty Boots',moves:['Thunderbolt','Volt Switch','Roost','Heat Wave'],offensiveTypes:['Electric','Flying','Fire'],types:['Electric','Flying'],baseSpeed:100,atk:90,spa:125,recoveryAnchor:true,pivot:true}),
  mon('Slowking-Galar',{item:'Heavy-Duty Boots',moves:['Sludge Bomb','Flamethrower','Future Sight','Slack Off'],offensiveTypes:['Poison','Fire','Psychic'],types:['Poison','Psychic'],baseSpeed:30,atk:65,spa:110,recoveryAnchor:true}),
  mon('Kingambit',{item:'Black Glasses',moves:['Kowtow Cleave','Iron Head','Low Kick','Swords Dance'],offensiveTypes:['Dark','Steel','Fighting'],types:['Dark','Steel'],baseSpeed:50,atk:135,spa:60}),
  mon('Great Tusk',{item:'Leftovers',moves:['Headlong Rush','Rapid Spin','Knock Off','Close Combat'],offensiveTypes:['Ground','Dark','Fighting'],types:['Ground','Fighting'],baseSpeed:87,atk:131,spa:53}),
];

const bulkyProfile=ctx.profileTeam(bulkyWebsTeam,{});
assert(bulkyProfile.websSetters.length===1,'bulky webs team should have one setter');
assert(bulkyProfile.websRecoveryAnchors.length>=3,'bulky webs team should still lean on recovery anchors');
assert(bulkyProfile.pivot.length>=2,'bulky webs team should still lean on pivots');
const bulkyIdentity=ctx.detectIdentities(bulkyWebsTeam,{},bulkyProfile);
const bulkyWebsRow=bulkyIdentity.all.find(row=>row.name==='Webs Offense');
assert(bulkyIdentity.primary.name!=='Webs Offense','bulky webs team should not keep Webs Offense as the primary read');
assert(bulkyWebsRow.evidence.some(line=>/bulky glue shell/i.test(line)),'bulky webs team should explain the bulky-support failure mode');
const bulkySynergy=ctx.evaluateSynergy(bulkyWebsTeam,{},bulkyProfile,bulkyIdentity);
assert(bulkySynergy.issues.some(issue=>issue.title==='Sticky Web is propping up a bulky glue shell'),'bulky webs team should surface the bulky-support issue');

console.log('[OK] webs identity upgrades passed');