const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('src/app.js','utf8');
function makeEl(){return {value:'',checked:false,innerHTML:'',textContent:'',className:'',_items:[],options:[],style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},querySelector(){return makeEl()},scrollIntoView(){},appendChild(){},click(){},getBoundingClientRect(){return{top:999}}}}
const els={};const ctx={console,setTimeout(fn){fn()},alert(){},localStorage:{getItem(){return null},setItem(){}},navigator:{clipboard:{writeText(){}}},URL:{createObjectURL(){return 'blob:'},revokeObjectURL(){}},Blob:function(){},fetch:async()=>{throw Error('offline')}};
ctx.document={addEventListener(){},getElementById(id){return els[id]||(els[id]=makeEl())},querySelectorAll(){return[]},createElement(){return makeEl()}};ctx.window=ctx;ctx.addEventListener=function(){};vm.createContext(ctx);vm.runInContext(source,ctx,{timeout:5000});vm.runInContext(fs.readFileSync('src/weather-identity-upgrades.js','utf8'),ctx,{filename:'weather-identity-upgrades.js',timeout:5000});vm.runInContext(fs.readFileSync('src/balance-identity-upgrades.js','utf8'),ctx,{filename:'balance-identity-upgrades.js',timeout:5000});
function check(name, teamText, judge){
  const code = `team=parseTeam(${JSON.stringify(teamText)}); analysis=analyze(team); lastReasoning=buildReasoningReport(); lastReasoning`;
  const r = vm.runInContext(code, ctx);
  const result=judge(r);
  const top=r.identity.primary.name; const scores=r.synergy.scores;
  console.log(`\n[${result?'OK':'BAD'}] ${name}: ${top}`);
  console.log(' identities:', r.identity.all.slice(0,4).map(x=>`${x.name} ${x.score}`).join(' | '));
  console.log(' scores:', Object.entries(scores).map(([k,v])=>`${k}:${v}`).join(' '));
  if(!result) throw new Error(`${name} did not meet reasoner expectations`);
}
const dragon=vm.runInContext('SAMPLE', ctx);
const sunRoom=`Sunflora @ Expert Belt
Ability: Solar Power
Tera Type: Fairy
EVs: 168 HP / 64 Def / 252 SpA / 24 SpD
Quiet Nature
IVs: 0 Atk / 0 Spe
- Giga Drain
- Earth Power
- Weather Ball
- Dazzling Gleam

Hoopa-Unbound @ Room Service
Ability: Magician
Tera Type: Ghost
EVs: 248 HP / 176 Atk / 72 Def / 12 SpA
Brave Nature
IVs: 0 Spe
- Psychic Noise
- Hyperspace Fury
- Drain Punch
- Trick Room

Torkoal @ Charcoal
Ability: Drought
Tera Type: Fire
EVs: 208 HP / 40 Def / 252 SpA / 8 SpD
Quiet Nature
IVs: 0 Spe
- Eruption
- Lava Plume
- Rapid Spin
- Stealth Rock

Hatterene @ Focus Sash
Ability: Magic Bounce
Tera Type: Water
EVs: 248 HP / 4 Def / 252 SpA / 4 SpD
Quiet Nature
IVs: 0 Atk / 0 Spe
- Psychic Noise
- Dazzling Gleam
- Healing Wish
- Trick Room

Ursaluna @ Flame Orb
Ability: Guts
Tera Type: Normal
EVs: 252 Atk / 28 Def / 228 SpD
Brave Nature
IVs: 0 Spe
- Headlong Rush
- Facade
- Fire Punch
- Roar

Cresselia @ Mental Herb
Ability: Levitate
Tera Type: Poison
EVs: 252 HP / 252 Def / 4 SpD
Relaxed Nature
IVs: 0 Atk / 0 Spe
- Ice Beam
- Moonlight
- Trick Room
- Lunar Dance`;
const hazardFat=vm.runInContext('REGRESSION_TEAMS.hazardStack', ctx);
const rain=`Pelipper @ Damp Rock
Ability: Drizzle
Tera Type: Steel
EVs: 248 HP / 252 Def / 8 SpD
Bold Nature
- Hurricane
- Surf
- U-turn
- Roost

Barraskewda @ Choice Band
Ability: Swift Swim
Tera Type: Water
EVs: 252 Atk / 4 Def / 252 Spe
Adamant Nature
- Waterfall
- Flip Turn
- Close Combat
- Aqua Jet

Raging Bolt @ Booster Energy
Ability: Protosynthesis
Tera Type: Fairy
EVs: 4 Def / 252 SpA / 252 Spe
Modest Nature
- Calm Mind
- Thunderclap
- Dragon Pulse
- Thunderbolt

Great Tusk @ Heavy-Duty Boots
Ability: Protosynthesis
Tera Type: Water
EVs: 252 HP / 4 Atk / 252 Def
Impish Nature
- Rapid Spin
- Stealth Rock
- Headlong Rush
- Knock Off

Kingambit @ Black Glasses
Ability: Supreme Overlord
Tera Type: Dark
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Swords Dance
- Kowtow Cleave
- Sucker Punch
- Iron Head

Zapdos @ Heavy-Duty Boots
Ability: Static
Tera Type: Steel
EVs: 248 HP / 252 Def / 8 SpA
Bold Nature
- Hurricane
- Volt Switch
- Thunder Wave
- Roost`;
const balance=`Deoxys-Speed @ Life Orb
Ability: Pressure
Tera Type: Fighting
EVs: 4 Def / 252 SpA / 252 Spe
Modest Nature
IVs: 0 Atk
- Nasty Plot
- Psycho Boost
- Focus Blast
- Shadow Ball

Dondozo @ Leftovers
Ability: Unaware
Tera Type: Fighting
EVs: 252 HP / 252 Def / 4 SpD
Impish Nature
- Waterfall
- Curse
- Rest
- Sleep Talk

Landorus-Therian @ Choice Scarf
Ability: Intimidate
Tera Type: Ground
EVs: 252 Atk / 4 SpA / 252 Spe
Naive Nature
- Earthquake
- Stone Edge
- U-turn
- Grass Knot

Zapdos @ Heavy-Duty Boots
Ability: Static
Tera Type: Steel
EVs: 248 HP / 252 Def / 8 SpA
Bold Nature
IVs: 0 Atk
- Hurricane
- Volt Switch
- Thunder Wave
- Roost

Walking Wake @ Heavy-Duty Boots
Ability: Protosynthesis
Tera Type: Fairy
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Surf
- Draco Meteor
- Knock Off
- Flip Turn

Garganacl @ Leftovers
Ability: Purifying Salt
Tera Type: Fairy
EVs: 252 HP / 52 Def / 204 SpD
Careful Nature
- Stealth Rock
- Salt Cure
- Recover
- Protect`;
const jackBalance=`Iron Valiant @ Booster Energy
Ability: Quark Drive
Tera Type: Steel
EVs: 4 Atk / 252 SpA / 252 Spe
Naive Nature
- Moonblast
- Close Combat
- Knock Off
- Encore

Great Tusk @ Booster Energy
Ability: Protosynthesis
Tera Type: Ice
EVs: 252 HP / 4 Atk / 252 Spe
Jolly Nature
- Bulk Up
- Headlong Rush
- Ice Spinner
- Rapid Spin

Iron Treads @ Leftovers
Ability: Quark Drive
Tera Type: Ghost
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Stealth Rock
- Earthquake
- Knock Off
- Rapid Spin

Weezing-Galar @ Heavy-Duty Boots
Ability: Neutralizing Gas
Tera Type: Flying
EVs: 252 HP / 252 Def / 4 SpD
Bold Nature
- Sludge Bomb
- Defog
- Pain Split
- Will-O-Wisp

Raging Bolt @ Booster Energy
Ability: Protosynthesis
Tera Type: Fairy
EVs: 4 Def / 252 SpA / 252 Spe
Modest Nature
IVs: 20 Atk
- Calm Mind
- Thunderclap
- Dragon Pulse
- Thunderbolt

Kyurem @ Choice Specs
Ability: Pressure
Tera Type: Ice
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Ice Beam
- Freeze-Dry
- Draco Meteor
- Earth Power`;
const badNoRemoval=`Charizard @ Life Orb
Ability: Blaze
EVs: 252 SpA / 252 Spe
Timid Nature
- Flamethrower
- Hurricane
- Focus Blast
- Roost

Volcarona @ Life Orb
Ability: Flame Body
EVs: 252 SpA / 252 Spe
Timid Nature
- Fiery Dance
- Bug Buzz
- Giga Drain
- Quiver Dance

Talonflame @ Sharp Beak
Ability: Gale Wings
EVs: 252 Atk / 252 Spe
Jolly Nature
- Brave Bird
- Roost
- Will-O-Wisp
- U-turn

Moltres @ Leftovers
Ability: Pressure
EVs: 252 HP / 252 Def
Bold Nature
- Hurricane
- Roost
- Will-O-Wisp
- Flamethrower

Arcanine @ Choice Band
Ability: Intimidate
EVs: 252 Atk / 252 Spe
Jolly Nature
- Fire Punch
- Crunch
- Extreme Speed
- Close Combat

Torkoal @ Charcoal
Ability: Drought
EVs: 252 HP / 252 SpA
Quiet Nature
- Eruption
- Lava Plume
- Stealth Rock
- Earth Power`;
const shallowRainShell=`Charizard @ Heavy-Duty Boots
Ability: Blaze
EVs: 252 SpA / 252 Spe
Timid Nature
- Flamethrower
- Hurricane
- Defog
- Roost

Volcarona @ Life Orb
Ability: Flame Body
EVs: 252 SpA / 252 Spe
Timid Nature
- Fiery Dance
- Bug Buzz
- Giga Drain
- Quiver Dance

Moltres @ Leftovers
Ability: Pressure
EVs: 252 HP / 252 Def
Bold Nature
- Hurricane
- Roost
- Will-O-Wisp
- Flamethrower

Arcanine @ Choice Band
Ability: Intimidate
EVs: 252 Atk / 252 Spe
Jolly Nature
- Fire Punch
- Crunch
- Extreme Speed
- Close Combat

Dragonite @ Heavy-Duty Boots
Ability: Multiscale
EVs: 252 Atk / 252 Spe
Adamant Nature
- Dragon Dance
- Extreme Speed
- Earthquake
- Fire Punch

Pelipper @ Damp Rock
Ability: Drizzle
EVs: 248 HP / 252 Def
Bold Nature
- Hurricane
- Surf
- U-turn
- Roost`;
const shallowSunShell=`Walking Wake @ Choice Specs
Ability: Protosynthesis
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Hydro Steam
- Draco Meteor
- Flamethrower
- Flip Turn

Primarina @ Assault Vest
Ability: Torrent
EVs: 248 HP / 252 SpA / 8 SpD
Modest Nature
- Hydro Pump
- Moonblast
- Psychic Noise
- Flip Turn

Azumarill @ Choice Band
Ability: Huge Power
EVs: 252 Atk / 4 Def / 252 Spe
Adamant Nature
- Aqua Jet
- Liquidation
- Play Rough
- Knock Off

Zapdos @ Heavy-Duty Boots
Ability: Static
EVs: 248 HP / 252 Def / 8 SpA
Bold Nature
- Hurricane
- Volt Switch
- Thunder Wave
- Roost

Great Tusk @ Heavy-Duty Boots
Ability: Protosynthesis
EVs: 252 HP / 4 Atk / 252 Def
Impish Nature
- Rapid Spin
- Stealth Rock
- Headlong Rush
- Knock Off

Torkoal @ Heat Rock
Ability: Drought
EVs: 252 HP / 252 Def / 4 SpA
Bold Nature
- Lava Plume
- Rapid Spin
- Yawn
- Stealth Rock`;
const passiveHazardShell=`Gholdengo @ Air Balloon
Ability: Good as Gold
EVs: 252 HP / 196 Def / 60 Spe
Bold Nature
- Shadow Ball
- Recover
- Make It Rain
- Nasty Plot

Skarmory @ Rocky Helmet
Ability: Sturdy
EVs: 252 HP / 252 Def / 4 SpD
Impish Nature
- Spikes
- Roost
- Whirlwind
- Body Press

Ting-Lu @ Leftovers
Ability: Vessel of Ruin
EVs: 252 HP / 4 Atk / 252 SpD
Careful Nature
- Stealth Rock
- Ruination
- Whirlwind
- Earthquake

Alomomola @ Heavy-Duty Boots
Ability: Regenerator
EVs: 252 HP / 252 Def / 4 SpD
Bold Nature
- Wish
- Protect
- Flip Turn
- Scald

Blissey @ Leftovers
Ability: Natural Cure
EVs: 252 HP / 252 Def / 4 SpD
Bold Nature
- Soft-Boiled
- Seismic Toss
- Thunder Wave
- Teleport

Clodsire @ Leftovers
Ability: Water Absorb
EVs: 252 HP / 4 Def / 252 SpD
Careful Nature
- Toxic
- Recover
- Earthquake
- Haze`;
const badPassive=`Dondozo @ Leftovers
Ability: Unaware
EVs: 252 HP / 252 Def
Impish Nature
- Waterfall
- Rest
- Sleep Talk
- Curse

Garganacl @ Leftovers
Ability: Purifying Salt
EVs: 252 HP / 252 SpD
Careful Nature
- Salt Cure
- Recover
- Protect
- Stealth Rock

Blissey @ Leftovers
Ability: Natural Cure
EVs: 252 HP / 252 Def
Bold Nature
- Thunder Wave
- Wish
- Protect
- Toxic

Alomomola @ Heavy-Duty Boots
Ability: Regenerator
EVs: 252 Def / 252 SpD
Relaxed Nature
- Wish
- Protect
- Flip Turn
- Toxic

Toxapex @ Heavy-Duty Boots
Ability: Regenerator
EVs: 252 HP / 252 Def
Bold Nature
- Recover
- Toxic
- Haze
- Surf

Corviknight @ Leftovers
Ability: Pressure
EVs: 248 HP / 252 Def
Impish Nature
- Roost
- Defog
- U-turn
- Body Press`;
const badSixSweepers=`Iron Valiant @ Booster Energy
Ability: Quark Drive
EVs: 252 SpA / 252 Spe
Timid Nature
- Moonblast
- Thunderbolt
- Calm Mind
- Encore

Dragapult @ Choice Specs
Ability: Infiltrator
EVs: 252 SpA / 252 Spe
Timid Nature
- Shadow Ball
- Draco Meteor
- Flamethrower
- U-turn

Kyurem @ Choice Specs
Ability: Pressure
EVs: 252 SpA / 252 Spe
Timid Nature
- Ice Beam
- Freeze-Dry
- Draco Meteor
- Earth Power

Raging Bolt @ Booster Energy
Ability: Protosynthesis
EVs: 252 SpA / 252 Spe
Modest Nature
- Calm Mind
- Thunderclap
- Dragon Pulse
- Thunderbolt

Kingambit @ Black Glasses
Ability: Supreme Overlord
EVs: 252 HP / 252 Atk
Adamant Nature
- Swords Dance
- Kowtow Cleave
- Sucker Punch
- Iron Head

Deoxys-Speed @ Life Orb
Ability: Pressure
EVs: 252 SpA / 252 Spe
Timid Nature
- Nasty Plot
- Psycho Boost
- Focus Blast
- Shadow Ball`;
const badNoWin=`Forretress @ Leftovers
Ability: Sturdy
EVs: 252 HP / 252 Def
Relaxed Nature
- Rapid Spin
- Volt Switch
- Stealth Rock
- Spikes

Skarmory @ Rocky Helmet
Ability: Sturdy
EVs: 252 HP / 252 Def
Impish Nature
- Roost
- Defog
- Stealth Rock
- Spikes

Torkoal @ Leftovers
Ability: Drought
EVs: 252 HP / 252 Def
Bold Nature
- Rapid Spin
- Stealth Rock
- Lava Plume
- Protect

Corviknight @ Leftovers
Ability: Pressure
EVs: 248 HP / 252 Def
Impish Nature
- Roost
- Defog
- U-turn
- Body Press

Empoleon @ Leftovers
Ability: Torrent
EVs: 252 HP / 252 SpD
Calm Nature
- Surf
- Defog
- Roost
- Stealth Rock

Garganacl @ Leftovers
Ability: Purifying Salt
EVs: 252 HP / 252 SpD
Careful Nature
- Salt Cure
- Recover
- Protect
- Stealth Rock`;
check('bad dragon spam', dragon, r=>/Dragon Spam/.test(r.identity.primary.name)&&r.synergy.scores.typeSynergy<60);
check('good sun room', sunRoom, r=>/Sun Room|Trick Room/.test(r.identity.primary.name)&&r.synergy.scores.speedControl>=60);
check('good hazard fat', hazardFat, r=>/Hazard|Stall|Balance/.test(r.identity.primary.name)&&r.synergy.fieldControl.removalDenial>=50);
check('good rain', rain, r=>/Rain/.test(r.identity.primary.name)&&r.matchups.find(m=>m.name==='Rain').score>=45);
check('good offensive balance', balance, r=>/Balance|Bulky/.test(r.identity.primary.name)&&!r.identity.primary.name.includes('Stall'));
check('flawed jack balance', jackBalance, r=>/Balance|Bulky|Hyper/.test(r.identity.primary.name)&&r.synergy.scores.winReliability<75&&r.synergy.scores.fieldControl<75);
check('bad fire stack', badNoRemoval, r=>r.synergy.scores.typeSynergy<50&&r.diagnosis.topWeaknesses.some(w=>w.tp==='Rock'));
check('shallow rain shell', shallowRainShell, r=>!/Rain Offense/.test(r.identity.primary.name)&&r.synergy.issues.some(issue=>/Rain plan clashes with Fire core/.test(issue.title)));
check('shallow sun shell', shallowSunShell, r=>!/Sun Offense/.test(r.identity.primary.name)&&r.synergy.issues.some(issue=>/Sun plan clashes with Water core/.test(issue.title)));
check('passive hazard shell', passiveHazardShell, r=>{
  const hazardRow=r.identity.all.find(x=>x.name==='Hazard Stack Fat Balance');
  return hazardRow&&hazardRow.score<60&&r.synergy.issues.some(issue=>/Hazard plan lacks payoff attackers/.test(issue.title));
});
check('fat passive stall', badPassive, r=>/Stall/.test(r.identity.primary.name)&&r.synergy.issues.some(issue=>/Balance read overstates a semistall shell/.test(issue.title))&&r.synergy.scores.offensiveCoverage<85);
check('bad six sweepers', badSixSweepers, r=>/Hyper Offense|Dragon Spam/.test(r.identity.primary.name)&&r.synergy.scores.defensiveBackbone<45);
check('bad no win field spam', badNoWin, r=>r.synergy.scores.winReliability<70&&r.synergy.scores.fieldControl<45);
console.log('\n[OK] V3.3 reasoner 12-team audit passed');
