const TYPES=["Normal","Fire","Water","Electric","Grass","Ice","Fighting","Poison","Ground","Flying","Psychic","Bug","Rock","Ghost","Dragon","Dark","Steel","Fairy"];
const CHART={Normal:{Rock:.5,Ghost:0,Steel:.5},Fire:{Fire:.5,Water:.5,Grass:2,Ice:2,Bug:2,Rock:.5,Dragon:.5,Steel:2},Water:{Fire:2,Water:.5,Grass:.5,Ground:2,Rock:2,Dragon:.5},Electric:{Water:2,Electric:.5,Grass:.5,Ground:0,Flying:2,Dragon:.5},Grass:{Fire:.5,Water:2,Grass:.5,Poison:.5,Ground:2,Flying:.5,Bug:.5,Rock:2,Dragon:.5,Steel:.5},Ice:{Fire:.5,Water:.5,Grass:2,Ice:.5,Ground:2,Flying:2,Dragon:2,Steel:.5},Fighting:{Normal:2,Ice:2,Poison:.5,Flying:.5,Psychic:.5,Bug:.5,Rock:2,Ghost:0,Dark:2,Steel:2,Fairy:.5},Poison:{Grass:2,Poison:.5,Ground:.5,Rock:.5,Ghost:.5,Steel:0,Fairy:2},Ground:{Fire:2,Electric:2,Grass:.5,Poison:2,Flying:0,Bug:.5,Rock:2,Steel:2},Flying:{Electric:.5,Grass:2,Fighting:2,Bug:2,Rock:.5,Steel:.5},Psychic:{Fighting:2,Poison:2,Psychic:.5,Dark:0,Steel:.5},Bug:{Fire:.5,Grass:2,Fighting:.5,Poison:.5,Flying:.5,Psychic:2,Ghost:.5,Dark:2,Steel:.5,Fairy:.5},Rock:{Fire:2,Ice:2,Fighting:.5,Ground:.5,Flying:2,Bug:2,Steel:.5},Ghost:{Normal:0,Psychic:2,Ghost:2,Dark:.5},Dragon:{Dragon:2,Steel:.5,Fairy:0},Dark:{Fighting:.5,Psychic:2,Ghost:2,Dark:.5,Fairy:.5},Steel:{Fire:.5,Water:.5,Electric:.5,Ice:2,Rock:2,Steel:.5,Fairy:2},Fairy:{Fire:.5,Fighting:2,Poison:.5,Dragon:2,Dark:2,Steel:.5}};
const NATURE={Adamant:{up:"atk",down:"spa"},Jolly:{up:"spe",down:"spa"},Modest:{up:"spa",down:"atk"},Timid:{up:"spe",down:"atk"},Bold:{up:"def",down:"atk"},Impish:{up:"def",down:"spa"},Calm:{up:"spd",down:"atk"},Careful:{up:"spd",down:"spa"},Brave:{up:"atk",down:"spe"},Quiet:{up:"spa",down:"spe"},Relaxed:{up:"def",down:"spe"},Sassy:{up:"spd",down:"spe"},Hardy:{}};
const P={Charizard:[["Fire","Flying"],[78,84,78,109,85,100]],Dragonite:[["Dragon","Flying"],[91,134,95,100,100,80]],Garchomp:[["Dragon","Ground"],[108,130,95,80,85,102]],Salamence:[["Dragon","Flying"],[95,135,80,110,80,100]],Hydreigon:[["Dark","Dragon"],[92,105,90,125,90,98]],Dragapult:[["Dragon","Ghost"],[88,120,75,100,75,142]],Corviknight:[["Flying","Steel"],[98,87,105,53,85,67]],Heatran:[["Fire","Steel"],[91,90,106,130,106,77]],"Rotom-Wash":[["Electric","Water"],[50,65,107,105,107,86]],"Great Tusk":[["Ground","Fighting"],[115,131,131,53,53,87]],Kingambit:[["Dark","Steel"],[100,135,120,60,85,50]],"Iron Valiant":[["Fairy","Fighting"],[74,130,90,120,60,116]],Gholdengo:[["Steel","Ghost"],[87,60,95,133,91,84]],Gliscor:[["Ground","Flying"],[75,95,125,45,75,95]],Rillaboom:[["Grass"],[100,125,90,60,70,85]],Cinderace:[["Fire"],[80,116,75,65,75,119]],Greninja:[["Water","Dark"],[72,95,67,103,71,122]],Toxapex:[["Water","Poison"],[50,63,152,53,142,35]],Clefable:[["Fairy"],[95,70,73,95,90,60]],Hatterene:[["Psychic","Fairy"],[57,90,95,136,103,29]],Garganacl:[["Rock"],[100,100,130,45,90,35]],Skeledirge:[["Fire","Ghost"],[104,75,100,110,75,66]],Volcarona:[["Bug","Fire"],[85,60,65,135,105,100]],Meowscarada:[["Grass","Dark"],[76,110,70,81,70,123]],"Roaring Moon":[["Dragon","Dark"],[105,139,71,55,101,119]],"Raging Bolt":[["Electric","Dragon"],[125,73,91,137,89,75]],"Walking Wake":[["Water","Dragon"],[99,83,91,125,83,109]],Dondozo:[["Water"],[150,100,115,65,65,35]],Clodsire:[["Poison","Ground"],[130,75,60,45,100,20]],Amoonguss:[["Grass","Poison"],[114,85,70,85,80,30]],Alomomola:[["Water"],[165,75,80,40,45,65]],"Ting-Lu":[["Dark","Ground"],[155,110,125,55,80,45]],Kyurem:[["Dragon","Ice"],[125,130,90,130,90,95]],Weavile:[["Dark","Ice"],[70,120,65,45,85,125]],Pelipper:[["Water","Flying"],[60,50,100,95,70,65]],Barraskewda:[["Water"],[61,123,60,60,50,136]],Venusaur:[["Grass","Poison"],[80,82,83,100,100,80]],Torkoal:[["Fire"],[70,85,140,85,70,20]],Tyranitar:[["Rock","Dark"],[100,134,110,95,100,61]],Excadrill:[["Ground","Steel"],[110,135,60,50,65,88]],Zapdos:[["Electric","Flying"],[90,90,85,125,90,100]],Blissey:[["Normal"],[255,10,10,75,135,55]],Skarmory:[["Steel","Flying"],[65,80,140,40,70,70]],Enamorus:[["Fairy","Flying"],[74,115,70,135,80,106]],Cresselia:[["Psychic"],[120,70,120,75,130,85]],Sunflora:[["Grass"],[75,75,55,105,85,30]],"Hoopa-Unbound":[["Psychic","Dark"],[80,160,60,170,130,80]],Ursaluna:[["Ground","Normal"],[130,140,105,45,80,50]],Primarina:[["Water","Fairy"],[80,74,74,126,116,60]],
Pecharunt:[["Poison","Ghost"],[88,88,160,88,110,60]],
"Iron Leaves":[["Grass","Psychic"],[90,130,88,70,108,90]],
"Iron Boulder":[["Rock","Psychic"],[90,120,80,68,108,124]],
"Iron Crown":[["Steel","Psychic"],[90,72,100,122,96,98]],
"Gouging Fire":[["Fire","Dragon"],[105,115,121,65,93,91]],
"Tornadus-Therian":[["Flying"],[79,100,80,110,90,121]],
"Thundurus-Therian":[["Electric","Flying"],[79,105,70,145,80,101]],
"Landorus-Therian":[["Ground","Flying"],[89,145,90,105,80,91]],
"Urshifu-Rapid-Strike":[["Fighting","Water"],[100,130,100,63,60,97]],
"Rotom-Heat":[["Electric","Fire"],[50,65,107,105,107,86]],
"Rotom-Fan":[["Electric","Flying"],[50,65,107,105,107,86]],
"Rotom-Mow":[["Electric","Grass"],[50,65,107,105,107,86]],
"Rotom-Frost":[["Electric","Ice"],[50,65,107,105,107,86]],
"Giratina-Origin":[["Ghost","Dragon"],[150,120,100,120,100,90]],
"Ogerpon":[["Grass"],[80,120,84,60,96,110]],
"Ogerpon-Wellspring":[["Grass","Water"],[80,120,84,60,96,110]],
"Ogerpon-Hearthflame":[["Grass","Fire"],[80,120,84,60,96,110]],
"Ogerpon-Cornerstone":[["Grass","Rock"],[80,120,84,60,96,110]]};
const MOVES={"Shadow Ball":["Ghost","Special",80,100],"Draco Meteor":["Dragon","Special",130,90],Flamethrower:["Fire","Special",90,100],"U-turn":["Bug","Physical",70,100],"Dragon Darts":["Dragon","Physical",100,100],"Will-O-Wisp":["Fire","Status",0,85],Thunderbolt:["Electric","Special",90,100],"Ice Beam":["Ice","Special",90,100],Moonblast:["Fairy","Special",95,100],"Close Combat":["Fighting","Physical",120,100],"Headlong Rush":["Ground","Physical",120,100],Earthquake:["Ground","Physical",100,100],"Ice Spinner":["Ice","Physical",80,100],"Rapid Spin":["Normal","Physical",50,100],"Knock Off":["Dark","Physical",65,100],"Sucker Punch":["Dark","Physical",70,100,1],"Kowtow Cleave":["Dark","Physical",85,100],"Iron Head":["Steel","Physical",80,100],"Swords Dance":["Normal","Status",0,100],Roost:["Flying","Status",0,100],Defog:["Flying","Status",0,100],"Body Press":["Fighting","Physical",80,100,0,"def"],"Stealth Rock":["Rock","Status",0,100],Spikes:["Ground","Status",0,100],"Toxic Spikes":["Poison","Status",0,100],"Sticky Web":["Bug","Status",0,100],"Volt Switch":["Electric","Special",70,100],"Flip Turn":["Water","Physical",60,100],Recover:["Normal","Status",0,100],"Slack Off":["Normal","Status",0,100],Wish:["Normal","Status",0,100],Protect:["Normal","Status",0,100],Toxic:["Poison","Status",0,90],"Thunder Wave":["Electric","Status",0,90],Spore:["Grass","Status",0,100],"Calm Mind":["Psychic","Status",0,100],"Dragon Dance":["Dragon","Status",0,100],"Nasty Plot":["Dark","Status",0,100],"Bulk Up":["Fighting","Status",0,100],"Quiver Dance":["Bug","Status",0,100],"Extreme Speed":["Normal","Physical",80,100,2],"Fire Punch":["Fire","Physical",75,100],Hurricane:["Flying","Special",110,70],"Brave Bird":["Flying","Physical",120,100],"Make It Rain":["Steel","Special",120,100],"Focus Blast":["Fighting","Special",120,70],Psychic:["Psychic","Special",90,100],"Psychic Noise":["Psychic","Special",75,100],Psyshock:["Psychic","Special",80,100,0,"targetDef"],"Giga Drain":["Grass","Special",75,100],"Energy Ball":["Grass","Special",90,100],"Earth Power":["Ground","Special",90,100],"Weather Ball":["Normal","Special",50,100],"Dazzling Gleam":["Fairy","Special",80,100],"Flower Trick":["Grass","Physical",70,100],"Play Rough":["Fairy","Physical",90,90],"Flash Cannon":["Steel","Special",80,100],"Stone Edge":["Rock","Physical",100,80],"Rock Slide":["Rock","Physical",75,90],"Fiery Dance":["Fire","Special",80,100],"Bug Buzz":["Bug","Special",90,100],"Torch Song":["Fire","Special",80,100],"Dark Pulse":["Dark","Special",80,100],Crunch:["Dark","Physical",80,100],"Icicle Crash":["Ice","Physical",85,90],Outrage:["Dragon","Physical",120,100],"Aqua Jet":["Water","Physical",40,100,1],Waterfall:["Water","Physical",80,100],"Air Slash":["Flying","Special",75,95],Thunder:["Electric","Special",110,70],"Magma Storm":["Fire","Special",100,75],"Lava Plume":["Fire","Special",80,100],Eruption:["Fire","Special",150,100],"Tera Blast":["Normal","Special",80,100],"Hyperspace Fury":["Dark","Physical",100,100],"Drain Punch":["Fighting","Physical",75,100],"Trick Room":["Psychic","Status",0,100],"Healing Wish":["Psychic","Status",0,100],"Lunar Dance":["Psychic","Status",0,100],Moonlight:["Fairy","Status",0,100],Facade:["Normal","Physical",70,100],Roar:["Normal","Status",0,100]};
const REPLAY_MOVE_HINTS={
  "Surf":["Water","Special",0],
  "Hydro Pump":["Water","Special",0],
  "Scald":["Water","Special",0],
  "Chilling Water":["Water","Special",0],
  "Muddy Water":["Water","Special",0],
  "Hydro Steam":["Water","Special",0],
  "Water Spout":["Water","Special",0],
  "Discharge":["Electric","Special",0],
  "Thunderclap":["Electric","Special",1],
  "Wild Charge":["Electric","Physical",0],
  "Nuzzle":["Electric","Status",0],
  "Electro Shot":["Electric","Special",0],
  "Leaf Storm":["Grass","Special",0],
  "Power Whip":["Grass","Physical",0],
  "Seed Bomb":["Grass","Physical",0],
  "Wood Hammer":["Grass","Physical",0],
  "Trailblaze":["Grass","Physical",0],
  "Fire Blast":["Fire","Special",0],
  "Overheat":["Fire","Special",0],
  "Heat Wave":["Fire","Special",0],
  "Flare Blitz":["Fire","Physical",0],
  "Bulldoze":["Ground","Physical",0],
  "Stomping Tantrum":["Ground","Physical",0],
  "Mud Shot":["Ground","Special",0],
  Encore:["Normal","Status",0],
  Taunt:["Dark","Status",0],
  "Parting Shot":["Dark","Status",0],
  Haze:["Ice","Status",0],
  Yawn:["Normal","Status",0],
  Disable:["Normal","Status",0],
  "Leech Seed":["Grass","Status",0],
  Memento:["Dark","Status",0]
};
const SAMPLE=`Charizard @ Heavy-Duty Boots\nAbility: Blaze\nTera Type: Fire\nEVs: 4 Def / 252 SpA / 252 Spe\nTimid Nature\n- Flamethrower\n- Hurricane\n- Defog\n- Roost\n\nDragonite @ Heavy-Duty Boots\nAbility: Multiscale\nTera Type: Normal\nEVs: 252 Atk / 4 SpD / 252 Spe\nAdamant Nature\n- Dragon Dance\n- Extreme Speed\n- Earthquake\n- Fire Punch\n\nGarchomp @ Rocky Helmet\nAbility: Rough Skin\nTera Type: Steel\nEVs: 252 HP / 164 Def / 92 Spe\nImpish Nature\n- Stealth Rock\n- Earthquake\n- Dragon Tail\n- Toxic\n\nSalamence @ Life Orb\nAbility: Moxie\nTera Type: Flying\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Dragon Dance\n- Earthquake\n- Outrage\n- Stone Edge\n\nHydreigon @ Choice Specs\nAbility: Levitate\nTera Type: Steel\nEVs: 4 Def / 252 SpA / 252 Spe\nTimid Nature\n- Draco Meteor\n- Dark Pulse\n- Flamethrower\n- U-turn\n\nDragapult @ Choice Band\nAbility: Infiltrator\nTera Type: Dragon\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Dragon Darts\n- U-turn\n- Sucker Punch\n- Tera Blast`;
const REGRESSION_TEAMS={
  dragonSpam:SAMPLE,
  hazardStack:`Gholdengo @ Air Balloon
Ability: Good as Gold
Tera Type: Fairy
EVs: 252 HP / 196 Def / 60 Spe
Bold Nature
- Nasty Plot
- Shadow Ball
- Recover
- Make It Rain

Tornadus-Therian @ Assault Vest
Ability: Regenerator
Tera Type: Steel
EVs: 252 HP / 4 SpD / 252 Spe
Timid Nature
- Bleakwind Storm
- U-turn
- Knock Off
- Heat Wave

Gliscor @ Toxic Orb
Ability: Poison Heal
Tera Type: Water
EVs: 244 HP / 36 Def / 228 SpD
Careful Nature
- Spikes
- Knock Off
- Toxic
- Protect

Pecharunt @ Heavy-Duty Boots
Ability: Poison Puppeteer
Tera Type: Dark
EVs: 252 HP / 228 Def / 28 Spe
Bold Nature
IVs: 0 Atk
- Malignant Chain
- Foul Play
- Parting Shot
- Recover

Garganacl @ Leftovers
Ability: Purifying Salt
Tera Type: Fairy
EVs: 252 HP / 52 Def / 204 SpD
Careful Nature
- Stealth Rock
- Salt Cure
- Recover
- Protect

Hatterene @ Focus Sash
Ability: Magic Bounce
Tera Type: Water
EVs: 252 HP / 4 Def / 252 SpA
Quiet Nature
IVs: 0 Atk / 0 Spe
- Trick Room
- Psychic Noise
- Dazzling Gleam
- Healing Wish`,
  sunRoom:`Sunflora @ Expert Belt
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
- Lunar Dance`
};
let team=[],analysis=null,reasoner=null,lastValidation=null,lastReplayRead=null,lastDetectiveRead=null;
const $=id=>document.getElementById(id),keys=o=>Object.keys(o),pct=n=>`${Math.round(n)}/100`,html=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":"&#39;"}[c]));
const DexAdapter={dex:null,useDex:false,learnsets:null,init(){if(typeof window!=='undefined'&&window.pkmn?.Dex){this.dex=window.pkmn.Dex;this.useDex=true}else this.useDex=false},id(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'')},speciesNames(){if(!this.useDex)return keys(P);return this.dex.species.all().filter(s=>s&&s.exists!==false&&s.name&&!s.isNonstandard).map(s=>s.name)},moveNames(){if(!this.useDex)return keys(MOVES);return this.dex.moves.all().filter(m=>m&&m.exists!==false&&m.name&&!m.isNonstandard).map(m=>m.name)},resolveSpeciesName(name){let raw=String(name||'').trim();if(!raw)return'';let local=keys(P).find(k=>this.id(k)===this.id(raw));if(local)return local;let aliases={
  // Rotom forms
  'rotomw':'Rotom-Wash','rotomwash':'Rotom-Wash','rotom-w':'Rotom-Wash',
  'rotomheat':'Rotom-Heat','rotomh':'Rotom-Heat','rotom-h':'Rotom-Heat',
  'rotomfan':'Rotom-Fan','rotomf':'Rotom-Fan','rotom-f':'Rotom-Fan',
  'rotommow':'Rotom-Mow','rotomm':'Rotom-Mow','rotom-m':'Rotom-Mow',
  'rotomfrost':'Rotom-Frost','rotomfr':'Rotom-Frost','rotom-fr':'Rotom-Frost',
  // Therian forms
  'landorus-therian':'Landorus-Therian','landorust':'Landorus-Therian','landorus-t':'Landorus-Therian','lando-t':'Landorus-Therian','landot':'Landorus-Therian',
  'tornadus-therian':'Tornadus-Therian','tornadust':'Tornadus-Therian','tornadus-t':'Tornadus-Therian','torn-t':'Tornadus-Therian','tornadustherian':'Tornadus-Therian',
  'thundurus-therian':'Thundurus-Therian','thundurust':'Thundurus-Therian','thundurus-t':'Thundurus-Therian','thund-t':'Thundurus-Therian','thundurustherian':'Thundurus-Therian',
  // Legendary forms
  'giratina-origin':'Giratina-Origin','giratinao':'Giratina-Origin','giratina-o':'Giratina-Origin',
  // Urshifu
  'urshifu-rapid-strike':'Urshifu-Rapid-Strike','urshifu-rapid':'Urshifu-Rapid-Strike','urshifu-r':'Urshifu-Rapid-Strike','urshifurs':'Urshifu-Rapid-Strike','urshifurapid':'Urshifu-Rapid-Strike',
  // Ogerpon forms
  'ogerpon-wellspring':'Ogerpon-Wellspring','ogerponwellspring':'Ogerpon-Wellspring','ogerpon-w':'Ogerpon-Wellspring',
  'ogerpon-hearthflame':'Ogerpon-Hearthflame','ogerponhearthflame':'Ogerpon-Hearthflame','ogerpon-hf':'Ogerpon-Hearthflame',
  'ogerpon-cornerstone':'Ogerpon-Cornerstone','ogerponcornerstone':'Ogerpon-Cornerstone','ogerpon-cs':'Ogerpon-Cornerstone',
  'ogerpon-teal':'Ogerpon','ogerpont':'Ogerpon','ogerpon-teal-mask':'Ogerpon',
  // Tauros Paldea
  'tauros-paldea':'Tauros-Paldea-Combat','tauros-paldea-combat':'Tauros-Paldea-Combat','tauros-paldea-blaze':'Tauros-Paldea-Blaze','tauros-paldea-aqua':'Tauros-Paldea-Aqua','taurospaldea':'Tauros-Paldea-Combat',
  // Common nicknames
  'pult':'Dragapult','tusk':'Great Tusk','gambit':'Kingambit','valiant':'Iron Valiant','hoopau':'Hoopa-Unbound','lando':'Landorus-Therian'
};let alias=aliases[this.id(raw)]||raw;if(this.useDex){let direct=this.dex.species.get(alias);if(direct&&direct.exists!==false&&direct.name)return direct.name;let hit=this.speciesNames().find(k=>this.id(k)===this.id(alias));if(hit)return hit}return alias.replace(/\b\w/g,c=>c.toUpperCase())},resolveMoveName(name){let raw=String(name||'').trim();if(!raw)return'';let local=keys(MOVES).find(k=>this.id(k)===this.id(raw));if(local)return local;if(this.useDex){let direct=this.dex.moves.get(raw);if(direct&&direct.exists!==false&&direct.name)return direct.name;let hit=this.moveNames().find(k=>this.id(k)===this.id(raw));if(hit)return hit}return raw},getSpecies(name){let n=this.resolveSpeciesName(name);if(this.useDex){let s=this.dex.species.get(n);if(s&&s.exists!==false&&s.baseStats)return{name:s.name,types:s.types||['Normal'],baseStats:[s.baseStats.hp,s.baseStats.atk,s.baseStats.def,s.baseStats.spa,s.baseStats.spd,s.baseStats.spe],abilities:s.abilities||{}}}return P[n]?{name:n,types:P[n][0],baseStats:P[n][1]}:null},getMove(name){let n=this.resolveMoveName(name);if(this.useDex){let m=this.dex.moves.get(n);if(m&&m.exists!==false&&m.name){let acc=m.accuracy===true?100:(m.accuracy||100),extra=null,id=this.id(m.name);if(id==='bodypress')extra='def';if(['psyshock','psystrike','secretsword'].includes(id))extra='targetDef';return[m.type||'Normal',m.category||'Status',m.basePower||0,acc,m.priority||0,extra]}}return MOVES[n]||null},async loadLearnsets(){if(this.learnsets)return this.learnsets;if(!this.useDex||typeof this.dex.getLearnsets!=='function')return null;try{this.learnsets=await this.dex.getLearnsets();return this.learnsets}catch(e){return null}},async canLearn(species,move){let s=this.useDex?this.dex.species.get(species):null,m=this.useDex?this.dex.moves.get(move):null;if(!this.useDex||!s||!m||s.exists===false||m.exists===false){return {known:false,can:null,reason:'learnset data unavailable in fallback mode'}}let all=await this.loadLearnsets();let data=all?.learnsets?.[s.id]||all?.[s.id]||this.dex.data?.Learnsets?.[s.id];let learnset=data?.learnset||data;if(!learnset)return {known:false,can:null,reason:'learnset not loaded for this species'};return {known:true,can:!!learnset[m.id],reason:learnset[m.id]?'move present in learnset':'move not found in learnset'}}};
DexAdapter.init();
function moveData(n){return DexAdapter.getMove(n)}function moveMeta(n){let data=moveData(n);if(data)return data;let hint=REPLAY_MOVE_HINTS[DexAdapter.resolveMoveName(n)]||REPLAY_MOVE_HINTS[String(n||'').trim()];return hint?[hint[0],hint[1],0,100,hint[2]||0]:null}function moveCategory(n){return moveMeta(n)?.[1]||'Status'}function movePriority(n){return moveMeta(n)?.[4]||0}function speciesNames(){return DexAdapter.speciesNames()}function moveNames(){return moveNamesWithHints()}function moveNamesWithHints(){return unique([...DexAdapter.moveNames(),...keys(REPLAY_MOVE_HINTS)])}function norm(s){if(!s)return'';let m=String(s).match(/\(([^)]+)\)/);return DexAdapter.resolveSpeciesName(m?m[1]:s)}function moveName(s){return DexAdapter.resolveMoveName(s)}
function parseEV(line,def=0){let e={hp:def,atk:def,def:def,spa:def,spd:def,spe:def},map={HP:'hp',Atk:'atk',Def:'def',SpA:'spa',SpD:'spd',Spe:'spe'};(line||'').replace(/^EVs:|^IVs:/i,'').split('/').forEach(x=>{let m=x.trim().match(/(\d+)\s+(HP|Atk|Def|SpA|SpD|Spe)/i);if(m)e[map[m[2]]]=+m[1]});return e}
function parseTeam(t){return t.split(/\n\s*\n/).map((b,i)=>{let l=b.split(/\n/).map(x=>x.trim()).filter(Boolean);if(!l.length)return null;let first=l[0],sp=first,item='None';if(first.includes(' @ ')){let parts=first.split(' @ ');sp=parts[0];item=parts.slice(1).join(' @ ').trim()}let mon={id:i,species:norm(sp),item,ability:'',tera:'',nature:'Hardy',evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},moves:[],level:100,shiny:false};l.slice(1).forEach(x=>{if(/^Ability:/i.test(x))mon.ability=x.replace(/^Ability:\s*/i,'');else if(/^Tera Type:/i.test(x))mon.tera=norm(x.replace(/^Tera Type:\s*/i,''));else if(/^EVs:/i.test(x))mon.evs=parseEV(x,0);else if(/^IVs:/i.test(x))mon.ivs=parseEV(x,31);else if(/^Shiny:/i.test(x))mon.shiny=/yes/i.test(x);else if(/^Level:/i.test(x))mon.level=+x.replace(/^Level:\s*/i,'')||100;else if(/Nature$/i.test(x))mon.nature=x.replace(/\s*Nature$/i,'');else if(/^-/.test(x))mon.moves.push(moveName(x.replace(/^[- ]+/,'')))});return mon}).filter(Boolean).slice(0,6)}
function moveBlockingAbility(moveType,category,ability){let name=String(ability||'');if(!name)return'';if(name==='Levitate'&&moveType==='Ground')return'Levitate';if(name==='Flash Fire'&&moveType==='Fire')return'Flash Fire';if(name==='Well-Baked Body'&&moveType==='Fire')return'Well-Baked Body';if(name==='Good as Gold'&&category==='Status')return'Good as Gold';if(['Water Absorb','Dry Skin','Storm Drain'].includes(name)&&moveType==='Water')return name;if(['Volt Absorb','Motor Drive','Lightning Rod'].includes(name)&&moveType==='Electric')return name;if(['Sap Sipper'].includes(name)&&moveType==='Grass')return name;if(name==='Earth Eater'&&moveType==='Ground')return'Earth Eater';return''}
function mult(atk,defs){return defs.reduce((a,t)=>a*((CHART[atk]&&CHART[atk][t]!==undefined)?CHART[atk][t]:1),1)}function nmod(n,s){let o=NATURE[n]||{};return o.up===s?1.1:o.down===s?.9:1}function stats(m,over={}){let base=DexAdapter.getSpecies(m?.species)?.baseStats||[80,80,80,80,80,80],e=over.evs||m.evs||{},iv=m.ivs||parseEV('',31),n=over.nature||m.nature||'Hardy',L=m.level||100,out={};out.hp=Math.floor(((2*base[0]+(iv.hp||31)+Math.floor((e.hp||0)/4))*L)/100)+L+10;['atk','def','spa','spd','spe'].forEach((s,i)=>{out[s]=Math.floor((Math.floor(((2*base[i+1]+(iv[s]??31)+Math.floor((e[s]||0)/4))*L)/100)+5)*nmod(n,s))});return out}function grounded(m){return !types(m).includes('Flying')&&m.ability!=='Levitate'&&m.item!=='Air Balloon'}function hazardPct(m,h){if(h==='none'||m.item==='Heavy-Duty Boots')return 0;if(h==='rocks')return 12.5*mult('Rock',types(m));if(!grounded(m))return 0;return h==='spikes1'?12.5:h==='spikes2'?16.67:h==='spikes3'?25:0}
function effectiveSet(m,opts={}){let copy={...m};if(opts.attackerTera||opts.defenderTera){copy.tera=opts.teraType||m.tera}return copy}
function dmg(att,def,mv,opt={}){let m=moveData(mv);if(!m)throw Error('Unknown move: '+mv);if(m[1]==='Status')throw Error(mv+' is a status move.');let aa=effectiveSet(att,{attackerTera:opt.attackerTera,teraType:opt.attackerTeraType}),dd=effectiveSet(def,{defenderTera:opt.defenderTera,teraType:opt.defenderTeraType});let sa=stats(aa,opt.attOver||{}),sd=stats(dd,opt.defOver||{}),cat=m[1],A=cat==='Physical'?sa.atk:sa.spa,D=cat==='Physical'?sd.def:sd.spd;if(m[5]==='def')A=sa.def;if(m[5]==='targetDef')D=sd.def;let ai=opt.attOver?.item||aa.item,di=opt.defOver?.item||dd.item;if(cat==='Physical'&&ai==='Choice Band')A*=1.5;if(cat==='Special'&&ai==='Choice Specs')A*=1.5;if(cat==='Special'&&di==='Assault Vest')D*=1.5;let bp=m[2];if(DexAdapter.id(mv)==='weatherball'&&(opt.field==='sun'||opt.field==='rain'))bp=100;let base=Math.floor(Math.floor(Math.floor((2*(aa.level||100)/5+2)*bp*A/D)/50)+2),moveType=m[0];if(DexAdapter.id(mv)==='weatherball'&&opt.field==='sun')moveType='Fire';if(DexAdapter.id(mv)==='weatherball'&&opt.field==='rain')moveType='Water';let atkTypes=opt.attackerTera?[opt.attackerTeraType||aa.tera||types(aa)[0]]:types(aa),defTypes=opt.defenderTera?[opt.defenderTeraType||dd.tera||types(dd)[0]]:types(dd),blockedBy=moveBlockingAbility(moveType,cat,dd.ability),eff=blockedBy?0:mult(moveType,defTypes),stab=atkTypes.includes(moveType)?1.5:1,mod=eff*stab;if(ai==='Life Orb')mod*=1.3;if(ai==='Expert Belt'&&eff>1)mod*=1.2;if(ai==='Black Glasses'&&moveType==='Dark')mod*=1.2;if(ai==='Charcoal'&&moveType==='Fire')mod*=1.2;if(aa.ability==='Solar Power'&&opt.field==='sun'&&cat==='Special')mod*=1.5;if(opt.field==='rain'&&moveType==='Water')mod*=1.5;if(opt.field==='rain'&&moveType==='Fire')mod*=.5;if(opt.field==='sun'&&moveType==='Fire')mod*=1.5;if(opt.field==='sun'&&moveType==='Water')mod*=.5;if(opt.field==='reflect'&&cat==='Physical')mod*=.5;if(opt.field==='screen'&&cat==='Special')mod*=.5;let rolls=[];if(blockedBy)rolls=new Array(16).fill(0);else for(let r=85;r<=100;r++)rolls.push(Math.max(1,Math.floor(base*mod*r/100)));let hpPct=+opt.hpPct||100,hz=hazardPct(dd,opt.hazards||'none'),max=sd.hp,ehp=Math.max(1,Math.floor(max*Math.max(0,hpPct-hz)/100)),hit=(m[3]||100)/100,ko=rolls.filter(x=>x>=ehp).length/16*hit;let chanceN=(n=2)=>{let combos=[0];for(let i=0;i<n;i++){let next=[];for(let c of combos)for(let r of rolls)next.push(c+r);combos=next}return combos.filter(x=>x>=ehp).length/combos.length*Math.pow(hit,n)};return{att:aa,def:dd,mv,move:m,rolls,max,ehp,hz,min:Math.min(...rolls),maxd:Math.max(...rolls),minp:Math.min(...rolls)/max*100,maxp:Math.max(...rolls)/max*100,ko,two:chanceN(2),three:chanceN(3),eff,hit,moveType,blockedBy}}
function analyze(t){let rows=TYPES.map(tp=>{let ms=t.map(p=>mult(tp,types(p))),weak=ms.filter(x=>x>1).length,four=ms.filter(x=>x>=4).length,res=ms.filter(x=>x>0&&x<1).length,imm=ms.filter(x=>x===0).length,score=weak*2+four*3-res-imm*1.5,sev=score>=7?'crit':score>=4?'bad':score>=2?'warn':'good';return{tp,weak,four,res,imm,score,sev}}).sort((a,b)=>b.score-a.score);let roles={hazards:[],removal:[],speed:[],priority:[],pivot:[],recovery:[],status:[],setup:[],trickRoom:[],physicalWall:[],specialWall:[],wallbreaker:[]};let H=['Stealth Rock','Spikes','Toxic Spikes','Sticky Web'],R=['Rapid Spin','Defog'],Piv=['U-turn','Volt Switch','Flip Turn'],Rec=['Recover','Roost','Slack Off','Wish','Protect','Moonlight','Giga Drain','Drain Punch'],St=['Will-O-Wisp','Toxic','Thunder Wave','Spore','Roar'],Set=['Dragon Dance','Swords Dance','Nasty Plot','Calm Mind','Bulk Up','Quiver Dance'];t.forEach(p=>{let st=stats(p),m=p.moves;if(m.some(x=>H.includes(x)))roles.hazards.push(p.species);if(m.some(x=>R.includes(x)))roles.removal.push(p.species);if(p.item==='Choice Scarf'||m.some(x=>movePriority(x)>0)||st.spe>=350)roles.speed.push(p.species);if(m.some(x=>movePriority(x)>0))roles.priority.push(p.species);if(m.some(x=>Piv.includes(x)))roles.pivot.push(p.species);if(m.some(x=>Rec.includes(x)))roles.recovery.push(p.species);if(m.some(x=>St.includes(x)))roles.status.push(p.species);if(m.some(x=>Set.includes(x)))roles.setup.push(p.species);if(m.includes('Trick Room'))roles.trickRoom.push(p.species);if(st.hp+st.def>650||st.def>300&&p.evs.hp>100)roles.physicalWall.push(p.species);if(st.hp+st.spd>650||st.spd>300&&p.evs.hp>100||p.item==='Assault Vest')roles.specialWall.push(p.species);if(['Choice Specs','Choice Band','Life Orb','Expert Belt','Charcoal','Flame Orb'].includes(p.item)||st.atk>350||st.spa>350)roles.wallbreaker.push(p.species)});let missing=Object.entries(roles).filter(([k,v])=>!['setup','priority','trickRoom'].includes(k)&&!v.length).map(([k])=>k),tc={};t.forEach(p=>types(p).forEach(x=>tc[x]=(tc[x]||0)+1));let red=Object.entries(tc).filter(([_,c])=>c>=4).map(([x,c])=>`${c} ${x}-types`);if(roles.setup.length>=3)red.push(`${roles.setup.length} setup sweepers`);let issue=rows.slice(0,5).reduce((s,r)=>s+Math.max(0,r.score),0)+missing.length*2+red.length,status=issue>32?'Unsaveable':issue>22?'Critical':issue>14?'Concerning':'Stable';return{rows,roles,missing,red,issue,status,typeCounts:tc}}
function teamSignals(t,a){let s={count:t.length,typeCounts:{},moveTypes:{},items:{},abilities:{},moves:{},offensiveItems:0,choiceItems:0,boots:0,leftovers:0,setup:a.roles.setup.length,hazards:a.roles.hazards.length,removal:a.roles.removal.length,recovery:a.roles.recovery.length,status:a.roles.status.length,pivot:a.roles.pivot.length,priority:a.roles.priority.length,trickRoom:a.roles.trickRoom.length,walls:unique([...a.roles.physicalWall,...a.roles.specialWall]).length,wallbreakers:a.roles.wallbreaker.length,highSpeed:0,slowAbusers:0,zeroSpe:0,weather:{sun:false,rain:false,sand:false,snow:false},weatherAbusers:0,magicBounce:false};t.forEach(p=>{types(p).forEach(x=>s.typeCounts[x]=(s.typeCounts[x]||0)+1);s.items[p.item]=(s.items[p.item]||0)+1;s.abilities[p.ability]=(s.abilities[p.ability]||0)+1;if(['Choice Specs','Choice Band','Life Orb','Expert Belt','Charcoal','Flame Orb'].includes(p.item))s.offensiveItems++;if(p.item.startsWith('Choice'))s.choiceItems++;if(p.item==='Heavy-Duty Boots')s.boots++;if(p.item==='Leftovers')s.leftovers++;if(['Drought'].includes(p.ability))s.weather.sun=true;if(['Drizzle'].includes(p.ability))s.weather.rain=true;if(['Sand Stream'].includes(p.ability))s.weather.sand=true;if(['Snow Warning'].includes(p.ability))s.weather.snow=true;if(['Solar Power','Chlorophyll','Swift Swim','Sand Rush','Slush Rush'].includes(p.ability))s.weatherAbusers++;if(p.ability==='Magic Bounce')s.magicBounce=true;let st=stats(p);if(st.spe>=330)s.highSpeed++;if((p.ivs.spe===0||['Brave','Quiet','Relaxed','Sassy'].includes(p.nature))&&(st.atk>280||st.spa>280))s.slowAbusers++;if(p.ivs.spe===0)s.zeroSpe++;p.moves.forEach(m=>{s.moves[m]=(s.moves[m]||0)+1;let md=moveData(m);if(md&&md[1]!=='Status')s.moveTypes[md[0]]=(s.moveTypes[md[0]]||0)+1})});return s}
function hasRole(a,r){return (a.roles[r]||[]).length>0}function resistCount(t,tp){return t.filter(p=>mult(tp,types(p))<1).length+t.filter(p=>mult(tp,types(p))===0).length*1.5}function weakCount(t,tp){return t.filter(p=>mult(tp,types(p))>1).length}function typeCoverageCount(s){return Object.keys(s.moveTypes).filter(t=>s.moveTypes[t]>0).length}function evidence(label,detail){return{label,detail}}
function teamReasoner(t,a){let s=teamSignals(t,a),scores=[];let add=(name,score,tags,ev)=>scores.push({name,score:clamp(score),tags,ev:ev.filter(Boolean)});
  let progressTools=0;['Knock Off','Salt Cure','Toxic','Spikes','Stealth Rock'].forEach(m=>{if(s.moves[m])progressTools+=s.moves[m]});
  let hasProgressTools=progressTools>=2;
  let denialTools=(s.magicBounce?1:0)+(s.abilities['Good as Gold']?1:0);
  let trScore=s.trickRoom>=2?(s.trickRoom*18+s.slowAbusers*8+s.zeroSpe*3):Math.max(0,(s.trickRoom*8+s.slowAbusers*3)-15);
  let hazardScore=clamp(50+s.hazards*15+(s.removal>0?10:0)+s.boots*3+denialTools*12+(s.moves['Knock Off']?8:0));
  let balanceScore=clamp(55+s.wallbreakers*5+s.pivot*8+s.walls*8+s.recovery*6+s.hazards*4-Math.max(0,(Math.max(...Object.values(s.typeCounts))-3))*4);
  let stallScore=clamp(30+s.recovery*10+s.status*6+s.walls*6+denialTools*8-s.offensiveItems*4-s.setup*3);
  let semiStallScore=clamp(40+s.hazards*12+s.recovery*8+denialTools*10+progressTools*5);
  add('Dragon Spam Offense',(s.typeCounts.Dragon||0)*18+s.setup*5+s.offensiveItems*4+s.pivot*3,['offense','type-stack'],[evidence(`${s.typeCounts.Dragon||0} Dragon members`,'repeated Dragon STAB pressure'),s.setup?evidence(`${s.setup} setup sweepers`,'win condition density'):null,s.offensiveItems?evidence(`${s.offensiveItems} damage items`,'immediate pressure'):null]);
  add('Hazard Stack Fat Balance',(s.hazards>=2&&s.recovery>=2)?(60+s.hazards*12+denialTools*15+progressTools*6):0,['balance','hazard-stack','attrition'],[s.hazards>=2?evidence(`${s.hazards} hazard setters`,'hazard pressure core'):null,s.recovery>=2?evidence(`${s.recovery} recovery users`,'sustain backbone'):null,denialTools>0?evidence(`${denialTools} denial tools`,'hazard/status denial'):null,hasProgressTools?evidence('Progress tools present','Knock Off / Salt Cure / Toxic / hazards'):null]);
  add('Semi-Stall Attrition',semiStallScore,['balance','stall','attrition'],[s.hazards?evidence(`${s.hazards} hazard sources`,'chip progress'):null,s.recovery?evidence(`${s.recovery} recovery users`,'sustain'):null,hasProgressTools?evidence('Progress engine','hazards + status + Knock Off'):null]);
  add('Sun Room',(s.weather.sun?30:0)+s.trickRoom*16+s.slowAbusers*8+s.weatherAbusers*9+(s.moves['Weather Ball']?8:0)+(s.moveTypes.Fire||0)*2,['weather','trick-room'],[s.weather.sun?evidence('Drought present','sun control enabled'):null,s.trickRoom?evidence(`${s.trickRoom} Trick Room setters`,'tempo inversion plan'):null,s.slowAbusers?evidence(`${s.slowAbusers} slow breakers`,'abuse Trick Room turns'):null]);
  add('Trick Room',trScore,['tempo'],[s.trickRoom>=2?evidence(`${s.trickRoom} Trick Room users`,'dedicated speed inversion mode'):evidence(`${s.trickRoom} Trick Room setter`,'limited speed inversion')]);
  add('Sun Offense',(s.weather.sun?35:0)+s.weatherAbusers*12+(s.moveTypes.Fire||0)*4+(s.moves['Weather Ball']?8:0)+s.highSpeed*3,['weather','offense'],[s.weather.sun?evidence('Drought present','sun offense enabled'):null,s.weatherAbusers?evidence(`${s.weatherAbusers} weather abusers`,'sun payoffs detected'):null]);
  add('Rain Offense',(s.weather.rain?35:0)+s.weatherAbusers*12+(s.moveTypes.Water||0)*4+s.highSpeed*3,['weather','offense'],[s.weather.rain?evidence('Drizzle present','rain offense enabled'):null]);
  add('Hyper Offense',s.setup*13+s.offensiveItems*9+s.highSpeed*7+s.priority*5+s.hazards*4-s.walls*8-s.recovery*3,['offense','speed'],[s.setup?evidence(`${s.setup} setup routes`,'snowball potential'):null,s.highSpeed?evidence(`${s.highSpeed} high-speed members`,'natural speed pressure'):null]);
  add('Stall',Math.max(stallScore,5),['stall','defense'],[s.recovery>=3?evidence(`${s.recovery} recovery sources`,'pure stall sustain'):null,s.status?evidence(`${s.status} status tools`,'attrition tools'):null,denialTools?evidence(`${denialTools} denial tools`,'entry denial'):null]);
  add('Bulky Balance',balanceScore,['balance','defense'],[s.walls?evidence(`${s.walls} defensive walls`,'defensive backbone'):null,s.pivot?evidence(`${s.pivot} pivoting tools`,'momentum control'):null,s.hazards?evidence(`${s.hazards} hazard sources`,'passive damage'):null]);
  add('Hazard Stack',hazardScore,['hazard','control'],[s.hazards?evidence(`${s.hazards} hazard setters`,'field control'):null,s.removal?evidence('Removal present','clears opposing hazards'):null,denialTools?evidence('Denial present','prevents opposing hazards/status'):null]);
  add('VoltTurn',s.pivot*20+s.highSpeed*5+s.wallbreakers*3,['pivot'],[s.pivot?evidence(`${s.pivot} pivot moves`,'momentum engine'):null]);
  scores.sort((x,y)=>y.score-x.score);
  let primary=scores[0]||{name:'Unknown',score:0,tags:[],ev:[]},secondary=scores.slice(1,4).filter(x=>x.score>=35);
  let synergy=synergyScores(t,a,s),matchups=matchupScores(t,a,s,primary),suggestions=suggestAdditions(t,a,s,primary,matchups);
  return{signals:s,identity:{primary,secondary,scores},synergy,matchups,suggestions,risks:riskList(t,a,s),verdict:verdict(primary,synergy,matchups)}}
function synergyScores(t,a,s){let worst=a.rows[0]||{},coverage=typeCoverageCount(s),typeStack=Math.max(0,...Object.values(s.typeCounts));let typeSynergy=clamp(82-worst.score*5-Math.max(0,typeStack-2)*12+resistCount(t,worst.tp||'Normal')*4);let roleBalance=clamp(20+s.hazards*10+s.removal*14+s.recovery*8+s.pivot*8+s.wallbreakers*8+s.walls*8+s.speed*6);let offensiveCoverage=clamp(20+coverage*6+s.wallbreakers*8+s.setup*6+s.priority*5);let defensiveBackbone=clamp(20+s.walls*14+s.recovery*8+s.removal*6-worst.weak*6);let hazardPlan=clamp(25+s.hazards*20+s.removal*20+s.boots*4+s.magicBounce*18);let speedControl=clamp(20+s.highSpeed*12+s.priority*10+s.trickRoom*14+(s.items['Choice Scarf']||0)*10);let winConditions=clamp(25+s.setup*13+s.wallbreakers*8+s.weather.sun*8+s.trickRoom*6);return{typeSynergy,roleBalance,offensiveCoverage,defensiveBackbone,hazardPlan,speedControl,winConditions}}
function matchupScores(t,a,s,primary){let w=tp=>weakCount(t,tp),r=tp=>resistCount(t,tp),hasRemoval=s.removal>0,hasBoots=s.boots>=2,magic=s.magicBounce;let rain=clamp(62-r('Water')*8-w('Water')*9-w('Ice')*4+(s.weather.sun?8:0)+(s.typeCounts.Grass||0)*5);let sun=clamp(55-r('Fire')*7-w('Fire')*7-r('Grass')*3+(s.weather.sun?12:0));let hazard=clamp(35+hasRemoval*18+hasBoots*10+magic*22+s.hazards*4-s.typeCounts.Flying*2);let ho=clamp(45+s.highSpeed*7+s.priority*10+s.trickRoom*12+s.walls*5-w('Ice')*2-w('Fairy')*2);let stall=clamp(38+s.wallbreakers*12+s.status*4+s.setup*5+s.magicBounce*10-s.choiceItems*3);let balance=clamp(45+s.wallbreakers*7+s.pivot*6+s.walls*6+s.removal*4-Math.max(0,(Math.max(...Object.values(s.typeCounts))-3))*5);let trick=clamp(55+s.trickRoom*10+s.priority*4+s.highSpeed*2-(s.slowAbusers?0:10));let dragon=clamp(55+r('Dragon')*8-w('Dragon')*8+(s.typeCounts.Fairy||0)*10+(s.typeCounts.Steel||0)*8);return[
{name:'Rain',score:rain,reason:rain<50?'Water pressure plus Ice coverage can overwhelm the structure.':'Has enough Water counterplay or weather disruption to contest rain.'},
{name:'Sun',score:sun,reason:sun<50?'Fire pressure or opposing weather sweepers can stress the team.':'Can exploit or resist sun well enough to trade.'},
{name:'Hazard Stack',score:hazard,reason:hazard<50?'Field control is fragile; hazards may snowball.':'Removal, Boots, or Magic Bounce give real counterplay.'},
{name:'Hyper Offense',score:ho,reason:ho<50?'Fast pressure can overwhelm before the plan stabilizes.':'Priority, speed, Trick Room, or bulk keep offense manageable.'},
{name:'Stall',score:stall,reason:stall<50?'Long games expose limited breaking or status vulnerability.':'Breakers, setup, or Magic Bounce create progress.'},
{name:'Bulky Balance',score:balance,reason:balance<50?'May struggle to make progress against sturdy pivots.':'Has enough pressure and pivoting to find openings.'},
{name:'Trick Room',score:trick,reason:trick<50?'Slow breakers and room turns are hard to deny.':'Can contest or mirror speed inversion.'},
{name:'Dragon Spam',score:dragon,reason:dragon<50?'Dragon mirrors expose repeated Dragon/Ice/Fairy liabilities.':'Steel/Fairy checks or speed control stabilize the mirror.'}
].sort((a,b)=>b.score-a.score)}
function riskList(t,a,s){let out=[];a.rows.slice(0,4).forEach(r=>{if(r.score>=4)out.push({level:r.sev,type:r.tp,detail:`${r.weak} weak, ${r.res} resist, ${r.imm} immune`})});if(Math.max(...Object.values(s.typeCounts))>=4){let [type,count]=Object.entries(s.typeCounts).sort((a,b)=>b[1]-a[1])[0];out.push({level:'crit',type:'Type stacking',detail:`${count} ${type}-type members create repeated matchup liabilities`})}if(!s.removal)out.push({level:'bad',type:'Hazard control',detail:'No removal detected'});if(!s.hazards)out.push({level:'warn',type:'Hazard pressure',detail:'No entry hazards detected'});if(s.trickRoom&&s.trickRoom<2)out.push({level:'warn',type:'Trick Room reliability',detail:'Only one Trick Room setter detected'});return out.slice(0,8)}
const SUGGEST_SETS={Corviknight:`Corviknight @ Leftovers\nAbility: Pressure\nTera Type: Dragon\nEVs: 248 HP / 252 Def / 8 SpD\nImpish Nature\n- Roost\n- Defog\n- U-turn\n- Body Press`,Kingambit:`Kingambit @ Black Glasses\nAbility: Supreme Overlord\nTera Type: Dark\nEVs: 252 HP / 252 Atk / 4 SpD\nAdamant Nature\n- Swords Dance\n- Kowtow Cleave\n- Sucker Punch\n- Iron Head`,Heatran:`Heatran @ Leftovers\nAbility: Flash Fire\nTera Type: Grass\nEVs: 252 HP / 4 SpA / 252 SpD\nCalm Nature\n- Magma Storm\n- Earth Power\n- Stealth Rock\n- Protect`,"Rotom-Wash":`Rotom-Wash @ Leftovers\nAbility: Levitate\nTera Type: Steel\nEVs: 252 HP / 212 Def / 44 Spe\nBold Nature\n- Volt Switch\n- Hydro Pump\n- Will-O-Wisp\n- Protect`,Primarina:`Primarina @ Leftovers\nAbility: Torrent\nTera Type: Steel\nEVs: 252 HP / 252 SpA / 4 SpD\nModest Nature\n- Moonblast\n- Surf\n- Psychic Noise\n- Protect`,"Great Tusk":`Great Tusk @ Heavy-Duty Boots\nAbility: Protosynthesis\nTera Type: Water\nEVs: 252 HP / 4 Atk / 252 Def\nImpish Nature\n- Rapid Spin\n- Stealth Rock\n- Headlong Rush\n- Knock Off`,Hatterene:`Hatterene @ Leftovers\nAbility: Magic Bounce\nTera Type: Water\nEVs: 252 HP / 252 SpA / 4 SpD\nQuiet Nature\nIVs: 0 Spe\n- Psychic Noise\n- Dazzling Gleam\n- Trick Room\n- Healing Wish`,Pelipper:`Pelipper @ Damp Rock\nAbility: Drizzle\nTera Type: Steel\nEVs: 248 HP / 252 Def / 8 SpD\nBold Nature\n- Hurricane\n- Surf\n- U-turn\n- Roost`};
const SETS=SUGGEST_SETS;
class ReplayParser{
  constructor(){
    this.turns=[];
    this.evidence=[];
    this.slotState={};
    this.speciesState={};
    this.turnMoves=[];
    this.replayRead={targets:[],strongest:null};
  }
  reset(){
    this.turns=[];
    this.evidence=[];
    this.slotState={};
    this.speciesState={};
    this.turnMoves=[];
    this.replayRead={targets:[],strongest:null};
  }
  parse(log){
    const lines=log.split(/\r?\n/);
    let currentTurn=0;
    this.reset();
    lines.forEach(line=>{
      const trimmed=line.trim();
      if(!trimmed)return;
      if(trimmed.startsWith('|turn|')){
        currentTurn=parseInt(trimmed.split('|')[2],10)||0;
        this.turns.push({turn:currentTurn,events:[]});
        this.turnMoves=[];
        return;
      }
      if(currentTurn<=0)return;
      const parts=trimmed.split('|').filter(Boolean);
      if(!parts.length)return;
      const event={type:parts[0],raw:trimmed};
      if(event.type==='switch'||event.type==='drag'){
        event.pokemon=parts[1];
        event.details=parts[2]||'';
      }else if(event.type==='move'){
        event.attacker=parts[1];
        event.move=parts[2];
        event.target=parts[3]||'';
      }else if(event.type==='-damage'){
        event.target=parts[1];
        event.damage=parts[2];
        event.from=parts.find(p=>p.startsWith('[from]'))?.replace('[from] ','')||'';
      }else if(event.type==='-heal'){
        event.target=parts[1];
        event.heal=parts[2];
        event.from=parts.find(p=>p.startsWith('[from]'))?.replace('[from] ','')||'';
      }else if(event.type==='-status'){
        event.target=parts[1];
        event.status=parts[2];
      }else if(event.type==='-item'||event.type==='-enditem'){
        event.target=parts[1];
        event.item=parts[2];
        event.from=parts.find(p=>p.startsWith('[from]'))?.replace('[from] ','')||'';
        event.tags=parts.slice(3).filter(p=>/^\[[^\]]+\]$/.test(p));
      }else if(event.type==='-immune'){
        event.target=parts[1];
        event.from=parts.find(p=>p.startsWith('[from]'))?.replace('[from] ','')||'';
      }else if(event.type==='-activate'||event.type==='-ability'){
        event.target=parts[1];
        event.ability=(parts[2]||'').replace(/^ability: /,'');
      }else if(event.type==='-boost'){
        event.target=parts[1];
        event.stat=parts[2];
        event.amount=parts[3];
        event.from=parts.find(p=>p.startsWith('[from]'))?.replace('[from] ','')||'';
      }else if(event.type==='-weather'){
        event.weather=parts[1];
      }
      this.turns[this.turns.length-1]?.events.push(event);
      this.extractEvidence(event,currentTurn);
    });
    this.replayRead=this.buildReplayRead();
    return this.turns;
  }
  slotId(token){
    return String(token||'').split(':')[0].trim();
  }
  slotSide(slot){
    const match=String(slot||'').match(/^(p\d+)/);
    return match?match[1]:'';
  }
  tokenSpecies(token){
    return String(token||'').split(':').slice(1).join(':').trim()||'';
  }
  detailsSpecies(details){
    return String(details||'').split(',')[0].trim()||'';
  }
  stateKey(slot,species){
    const side=this.slotSide(slot);
    if(side&&species)return `${side}:${species}`;
    return species||`__slot_${slot}`;
  }
  ensureState(token,details=''){
    const slot=this.slotId(token);
    const knownKey=this.slotState[slot];
    const knownState=knownKey?this.speciesState[knownKey]:null;
    const species=this.detailsSpecies(details)||knownState?.species||this.tokenSpecies(token)||'';
    const key=this.stateKey(slot,species);
    if(slot&&species)this.slotState[slot]=key;
    if(!this.speciesState[key]){
      this.speciesState[key]={
        slot,
        side:this.slotSide(slot),
        species,
        evidence:[],
        score:0,
        tookHazardDamage:false,
        usedStatusMove:false,
        repeatedDamagingMove:false,
        choiceContradiction:false,
        movedFirst:false,
        movedSecond:false,
        revealedItem:'',
        removedItem:'',
        itemGone:false,
        itemLossLabel:'',
        itemLossNote:'',
        itemLossTurn:0,
        hazardEvents:[],
        postItemLossHazardNote:'',
        abilityHints:[],
        damageObservations:[],
        clueObservations:[],
        speedContexts:[],
        speedContext:null,
        lastMove:'',
        lastDamagingMove:'',
        lastMoveTurn:0
      };
    }
    if(slot)this.speciesState[key].slot=slot;
    if(slot)this.speciesState[key].side=this.slotSide(slot);
    if(species)this.speciesState[key].species=species;
    return this.speciesState[key];
  }
  addDamageObservation(state, observation){
    if(!state||!observation?.move||observation.observedDamage==null)return;
    state.damageObservations.push({...observation, turn:observation.turn||0});
    if(state.damageObservations.length>6)state.damageObservations=state.damageObservations.slice(-6);
  }
  addClueObservation(state, observation){
    if(!state||!observation?.label)return;
    state.clueObservations.push({...observation, turn:observation.turn||0});
    if(state.clueObservations.length>4)state.clueObservations=state.clueObservations.slice(-4);
  }
  addHazardEvent(state, turn, source=''){
    if(!state||!turn)return;
    const label=String(source||'').trim()||'hazards';
    state.hazardEvents=[...(state.hazardEvents||[]),{turn,source:label}].slice(-6);
  }
  turnSpeedContext(state, turn){
    if(!state||!turn)return null;
    return [...(state.speedContexts||[])].reverse().find(ctx=>ctx.turn===turn)||null;
  }
  applyTurnSpeedContext(state, turn, relation, opponentSpecies){
    if(!state||!turn||!relation||!opponentSpecies)return;
    const context={turn,relation,opponentSpecies};
    state.speedContext={...context};
    state.movedFirst=state.movedFirst||relation==='fasterThan';
    state.movedSecond=state.movedSecond||relation==='slowerThan';
    const existing=(state.speedContexts||[]).find(ctx=>ctx.turn===turn&&ctx.relation===relation&&ctx.opponentSpecies===opponentSpecies);
    if(!existing){
      state.speedContexts=[...(state.speedContexts||[]),context].slice(-6);
    }
    state.damageObservations.forEach(obs=>{
      if((obs.turn||0)!==turn)return;
      obs.speedContext={relation,opponentSpecies};
      obs.movedFirst=relation==='fasterThan';
      obs.movedSecond=relation==='slowerThan';
    });
    state.clueObservations.forEach(obs=>{
      if((obs.turn||0)!==turn)return;
      obs.speedContext={relation,opponentSpecies};
      obs.movedFirst=relation==='fasterThan';
      obs.movedSecond=relation==='slowerThan';
    });
  }
  itemClueLabel(item){
    return item?`${item} confirmed`:'Item revealed';
  }
  itemLossClueLabel(item, source=''){
    const move=String(source||'').match(/^move: (.+)$/)?.[1]||'';
    if(item&&move)return `${item} was removed by ${move}`;
    return item?`${item} was removed`:'Item was removed';
  }
  describeItemLoss(event={}){
    const item=String(event.item||'').trim();
    const source=String(event.from||'').trim();
    const tags=event.tags||[];
    const hasTag=tag=>tags.includes(tag);
    if(item==='Air Balloon'){
      return {
        clueLabel:'Air Balloon popped',
        note:'Air Balloon popped, so the old Ground immunity is gone and the item slot is now empty.'
      };
    }
    if(item==='Booster Energy'){
      const mode=source.replace(/^ability: /,'').trim();
      return {
        clueLabel:mode?`Booster Energy activated ${mode}`:'Booster Energy was consumed',
        note:'Booster Energy is a one-shot item, so the stat trigger stays informative but the current item slot is now empty.'
      };
    }
    if(item==='Red Card'){
      return {
        clueLabel:'Red Card triggered',
        note:'Red Card already fired, so that forced-switch item can no longer be the current item.'
      };
    }
    if(hasTag('[eat]')||/Berry$/i.test(item)){
      return {
        clueLabel:item?`${item} was eaten`:'Berry was eaten',
        note:`${item||'That berry'} was consumed, so the recovery clue stays useful but the item slot is now empty.`
      };
    }
    const clueLabel=this.itemLossClueLabel(item,source);
    return {
      clueLabel,
      note:item?`${clueLabel}, so that item can no longer be the current item.`:'The old item is gone, so current item inference should stay open.'
    };
  }
  abilitySource(source){
    const match=String(source||'').match(/^ability: (.+)$/);
    return match?match[1]:'';
  }
  abilityRewardText(ability){
    return ({
      'Water Absorb':'healing and Water immunity',
      'Volt Absorb':'healing and Electric immunity',
      'Dry Skin':'healing and Water immunity',
      'Storm Drain':'a Special Attack boost and Water immunity',
      'Lightning Rod':'a Special Attack boost and Electric immunity',
      'Motor Drive':'a Speed boost and Electric immunity',
      'Sap Sipper':'an Attack boost and Grass immunity',
      'Earth Eater':'healing and Ground immunity',
      'Well-Baked Body':'a Defense boost and Fire immunity',
      'Flash Fire':'Fire immunity and a Fire-power boost',
      'Good as Gold':'status immunity against opposing moves'
    })[ability]||'';
  }
  abilityTriggeredByMove(ability, move=''){
    const meta=moveMeta(move);
    const type=meta?.[0]||'';
    const category=meta?.[1]||'Status';
    if(['Water Absorb','Storm Drain','Dry Skin'].includes(ability))return type==='Water';
    if(['Volt Absorb','Lightning Rod','Motor Drive'].includes(ability))return type==='Electric';
    if(ability==='Sap Sipper')return type==='Grass';
    if(ability==='Earth Eater')return type==='Ground';
    if(['Well-Baked Body','Flash Fire'].includes(ability))return type==='Fire';
    if(ability==='Good as Gold')return category==='Status';
    return false;
  }
  abilityClueLabel(ability, move=''){
    if(!move||!this.abilityTriggeredByMove(ability, move))return `${ability} revealed`;
    if(['Water Absorb','Volt Absorb','Dry Skin','Earth Eater'].includes(ability))return `${ability} absorbed ${move}`;
    if(['Storm Drain','Lightning Rod','Motor Drive','Sap Sipper','Well-Baked Body'].includes(ability))return `${ability} activated on ${move}`;
    if(['Flash Fire','Good as Gold'].includes(ability))return `${ability} blocked ${move}`;
    return `${ability} revealed`;
  }
  hazardTimelineNote(state){
    if(!state?.itemGone||!state.itemLossTurn)return '';
    const laterHazard=[...(state.hazardEvents||[])].find(event=>(event.turn||0)>=state.itemLossTurn);
    if(!laterHazard)return '';
    const source=laterHazard.source||'hazards';
    if(state.removedItem==='Air Balloon'&&/Spikes|Toxic Spikes|Sticky Web/i.test(source)){
      return `Later took ${source} after Air Balloon popped, confirming the old Ground immunity really ended.`;
    }
    if(state.removedItem==='Heavy-Duty Boots'){
      return `Later took ${source} after Heavy-Duty Boots were removed, so the hazard chip belongs to the new post-Knock Off item state.`;
    }
    return `Later took ${source} after ${state.removedItem||'the old item'} left the slot, so the replay keeps the hazard timing aligned with the current item state.`;
  }
  recordAbilityReveal(state, turn, ability, moveEvent, text, clueLabel=''){
    if(!state||!ability)return;
    if(!state.abilityHints.includes(ability))state.abilityHints.push(ability);
    this.addEvidence(state,turn,'reveal',text||`${state.species} revealed ${ability}`,'Ability revealed',3.5,{hard:true,ability});
    const reactiveMove=this.abilityTriggeredByMove(ability, moveEvent?.move)?moveEvent:null;
    this.addClueObservation(state,{turn,move:reactiveMove?.move||'',label:clueLabel||this.abilityClueLabel(ability,reactiveMove?.move)});
  }
  bestDamageObservation(state){
    return this.detectiveInputsFromState(state)[0]||null;
  }
  detectiveInputsFromState(state){
    const baseInputs=(state?.damageObservations||[]).map((obs,index)=>({
      species:state.species,
      move:obs.move,
      observedDamage:obs.observedDamage,
      evidence:obs.evidence,
      targetSpecies:obs.targetSpecies,
      userSpecies:obs.userSpecies,
      usedStatusMove:state.usedStatusMove,
      tookHazardDamage:state.tookHazardDamage,
      repeatedDamagingMove:state.repeatedDamagingMove,
      revealedAbility:state.abilityHints.length===1?state.abilityHints[0]:undefined,
      abilityHints:state.abilityHints.slice(),
      movedFirst:obs.movedFirst??state.movedFirst,
      movedSecond:obs.movedSecond??state.movedSecond,
      speedContext:obs.speedContext?{...obs.speedContext}:(state.speedContext?{...state.speedContext}:null),
      choiceContradiction:state.choiceContradiction,
      removedItem:state.removedItem||undefined,
      itemGone:!!state.itemGone,
      itemLossLabel:state.itemLossLabel||undefined,
      itemLossNote:state.itemLossNote||undefined,
      postItemLossHazardNote:state.postItemLossHazardNote||undefined,
      revealedItem:state.revealedItem||undefined,
      _index:index,
      _turn:obs.turn||0
    }));
    const clueInputs=!baseInputs.length
      ? (state?.clueObservations||[]).map((obs,index)=>({
          species:state.species,
          move:obs.move||'',
          observedDamage:null,
          evidence:'clue_only',
          clueLabel:obs.label,
          usedStatusMove:state.usedStatusMove,
          tookHazardDamage:state.tookHazardDamage,
          repeatedDamagingMove:state.repeatedDamagingMove,
          revealedAbility:state.abilityHints.length===1?state.abilityHints[0]:undefined,
          abilityHints:state.abilityHints.slice(),
          movedFirst:obs.movedFirst??state.movedFirst,
          movedSecond:obs.movedSecond??state.movedSecond,
          speedContext:obs.speedContext?{...obs.speedContext}:(state.speedContext?{...state.speedContext}:null),
          choiceContradiction:state.choiceContradiction,
          removedItem:state.removedItem||undefined,
          itemGone:!!state.itemGone,
          itemLossLabel:state.itemLossLabel||undefined,
          itemLossNote:state.itemLossNote||undefined,
          postItemLossHazardNote:state.postItemLossHazardNote||undefined,
          revealedItem:state.revealedItem||undefined,
          _index:index,
          _turn:obs.turn||0
        }))
      : [];
    const allInputs=baseInputs.length?baseInputs:clueInputs;
    if(!allInputs.length)return [];
    const deduped=[];
    const seen=new Set();
    allInputs
      .sort((a,b)=>{
        const anchorA=(a.targetSpecies?1:0)+(a.userSpecies?1:0), anchorB=(b.targetSpecies?1:0)+(b.userSpecies?1:0);
        return (anchorB-anchorA)||((b._turn||0)-(a._turn||0))||(b._index-a._index);
      })
      .forEach(input=>{
        const key=[
          input.evidence||'',
          input.move||'',
          input.observedDamage,
          input.targetSpecies||'',
          input.userSpecies||''
        ].join('|');
        if(seen.has(key))return;
        seen.add(key);
        deduped.push(input);
      });
    return deduped.map(({_index,_turn,...input})=>input);
  }
  detectiveInputLabel(input){
    if(!input)return 'Replay clue';
    if(input.evidence==='clue_only'){
      if(input.clueLabel)return input.clueLabel;
      if(input.revealedAbility)return `${input.revealedAbility} clue`;
      if(input.revealedItem)return `${input.revealedItem} clue`;
      return `${input.species} replay clue`;
    }
    if(input.evidence==='they_hit_me'){
      return input.targetSpecies?`${input.move} into ${input.targetSpecies}`:`${input.move} damage clue`;
    }
    if(input.evidence==='i_hit_them'){
      return input.userSpecies?`${input.userSpecies} into ${input.species}`:`${input.species} took ${input.move}`;
    }
    return `${input.move} clue`;
  }
  pctFromFraction(value){
    const match=String(value||'').match(/(\d+)\/(\d+)/);
    if(!match)return null;
    return Math.round((+match[1])/(+match[2])*100);
  }
  addEvidence(state,turn,source,text,conclusion,score,extra={}){
    if(!state||!state.species)return;
    const item={turn,species:state.species,source,text,conclusion,score,...extra};
    state.evidence.push(item);
    state.score+=score||0;
    this.evidence.push(item);
  }
  extractEvidence(event,turn){
    if(event.type==='switch'||event.type==='drag'){
      const state=this.ensureState(event.pokemon,event.details);
      if(state){
        state.lastMove='';
        state.lastDamagingMove='';
        state.lastMoveTurn=0;
      }
      return;
    }
    if(event.type==='move'&&event.attacker){
      const state=this.ensureState(event.attacker);
      state.lastMove=event.move;
      const meta=moveMeta(event.move);
      if(meta&&meta[1]==='Status'){
        state.usedStatusMove=true;
        this.addEvidence(state,turn,'status',`${state.species} used status move ${event.move}`,'Assault Vest: IMPOSSIBLE',4,{hard:true});
      }else if(meta&&meta[1]!=='Status'){
        if(state.lastDamagingMove&&state.lastMoveTurn!==turn){
          if(state.lastDamagingMove===event.move){
            state.repeatedDamagingMove=true;
            this.addEvidence(state,turn,'damage',`${state.species} repeated ${event.move} without switching`,'Choice item clue',1.5,{soft:true});
          }else{
            state.choiceContradiction=true;
            this.addEvidence(state,turn,'status',`${state.species} used ${state.lastDamagingMove} and later ${event.move} without switching`,'Choice items contradicted',4,{hard:true});
          }
        }
        state.lastDamagingMove=event.move;
        state.lastMoveTurn=turn;
      }
      const moveEntry={slot:state.slot,species:state.species,move:event.move,priority:movePriority(event.move)};
      this.turnMoves.push(moveEntry);
      if(this.turnMoves.length===2){
        const [first,second]=this.turnMoves;
        if(first.species!==second.species&&first.priority===second.priority&&first.priority===0){
          const firstState=this.ensureState(first.slot);
          const secondState=this.ensureState(second.slot);
          this.applyTurnSpeedContext(firstState,turn,'fasterThan',second.species);
          this.addEvidence(firstState,turn,'damage',`${firstState.species} moved before ${second.species} in a neutral-priority exchange`,'Soft speed clue',1,{soft:true,opponentSpecies:second.species});
          this.applyTurnSpeedContext(secondState,turn,'slowerThan',first.species);
          this.addEvidence(secondState,turn,'damage',`${secondState.species} moved after ${first.species} in a neutral-priority exchange`,'Soft speed clue',1,{soft:true,opponentSpecies:first.species});
        }
      }
      return;
    }
    if(event.type==='-damage'&&event.target){
      const state=this.ensureState(event.target);
      if(event.from&&/Stealth Rock|Spikes|Toxic Spikes/i.test(event.from)){
        state.tookHazardDamage=true;
        this.addHazardEvent(state,turn,event.from);
        if(state.itemGone)state.postItemLossHazardNote=this.hazardTimelineNote(state);
        this.addEvidence(state,turn,'hazard',`${state.species} took hazard damage`,'Heavy-Duty Boots: IMPOSSIBLE',4,{hard:true});
        return;
      }
      const pct=this.pctFromFraction(event.damage);
      const moveEvent=[...this.turnMoves].reverse().find(x=>x.species&&state.slot!==x.slot);
      if(pct!==null&&moveEvent){
        this.addEvidence(this.ensureState(moveEvent.slot),turn,'damage',`${moveEvent.species} dealt ${pct}% with ${moveEvent.move}`,'Damage-roll evidence available',1,{move:moveEvent.move,observedDamage:pct,evidenceType:'they_hit_me',targetSpecies:state.species});
        const attackerState=this.ensureState(moveEvent.slot);
        const attackerSpeedContext=this.turnSpeedContext(attackerState,turn);
        this.addDamageObservation(attackerState,{turn,move:moveEvent.move,observedDamage:pct,evidence:'they_hit_me',targetSpecies:state.species,speedContext:attackerSpeedContext?{relation:attackerSpeedContext.relation,opponentSpecies:attackerSpeedContext.opponentSpecies}:null,movedFirst:attackerSpeedContext?.relation==='fasterThan',movedSecond:attackerSpeedContext?.relation==='slowerThan'});
        this.addEvidence(state,turn,'damage',`${state.species} took ${pct}% from ${moveEvent.species}'s ${moveEvent.move}`,'Defensive damage-roll evidence available',1.25,{move:moveEvent.move,observedDamage:pct,evidenceType:'i_hit_them',userSpecies:moveEvent.species});
        const defenderSpeedContext=this.turnSpeedContext(state,turn);
        this.addDamageObservation(state,{turn,move:moveEvent.move,observedDamage:pct,evidence:'i_hit_them',userSpecies:moveEvent.species,speedContext:defenderSpeedContext?{relation:defenderSpeedContext.relation,opponentSpecies:defenderSpeedContext.opponentSpecies}:null,movedFirst:defenderSpeedContext?.relation==='fasterThan',movedSecond:defenderSpeedContext?.relation==='slowerThan'});
      }else if(pct!==null){
        this.addEvidence(state,turn,'damage',`${state.species} changed to ${pct}% HP`,'Damage-roll evidence available',0.5,{observedDamage:pct});
      }
      return;
    }
    if(event.type==='-item'&&event.target&&event.item){
      const state=this.ensureState(event.target);
      state.revealedItem=event.item;
      state.removedItem='';
      state.itemGone=false;
      state.itemLossLabel='';
      state.itemLossNote='';
      state.itemLossTurn=0;
      state.postItemLossHazardNote='';
      this.addEvidence(state,turn,'reveal',`${state.species} revealed ${event.item}`,'Item confirmed',5,{hard:true,revealedItem:event.item});
      this.addClueObservation(state,{turn,label:this.itemClueLabel(event.item)});
      return;
    }
    if(event.type==='-enditem'&&event.target&&event.item){
      const state=this.ensureState(event.target);
      const loss=this.describeItemLoss(event);
      state.removedItem=event.item;
      state.itemGone=true;
      state.itemLossLabel=loss.clueLabel;
      state.itemLossNote=loss.note;
      state.itemLossTurn=turn;
      if(state.revealedItem===event.item)state.revealedItem='';
      state.postItemLossHazardNote=this.hazardTimelineNote(state);
      const sourceText=String(event.from||'').trim();
      const sourceDetail=sourceText?` via ${sourceText.replace(/^move: /,'')}`:'';
      this.addEvidence(state,turn,'reveal',`${state.species} lost ${event.item}${sourceDetail}`,'Current item no longer present',4.5,{hard:true,removedItem:event.item,itemGone:true});
      this.addClueObservation(state,{turn,label:loss.clueLabel});
      return;
    }
    if((event.type==='-activate'||event.type==='-ability')&&event.target&&event.ability){
      const state=this.ensureState(event.target);
      this.recordAbilityReveal(state,turn,event.ability,null,`${state.species} revealed ${event.ability}`);
      return;
    }
    if(event.type==='-heal'&&event.target&&event.from){
      const state=this.ensureState(event.target);
      const ability=this.abilitySource(event.from);
      if(ability){
        const moveEvent=[...this.turnMoves].reverse().find(x=>x.species&&state.slot!==x.slot);
        this.recordAbilityReveal(state,turn,ability,moveEvent,`${state.species} restored HP with ${ability}`);
      }
      return;
    }
    if(event.type==='-boost'&&event.target&&event.from){
      const state=this.ensureState(event.target);
      const ability=this.abilitySource(event.from);
      if(ability){
        const moveEvent=[...this.turnMoves].reverse().find(x=>x.species&&state.slot!==x.slot);
        this.recordAbilityReveal(state,turn,ability,moveEvent,`${state.species} gained a boost from ${ability}`);
      }
      return;
    }
    if(event.type==='-immune'&&event.target&&event.from){
      const ability=this.abilitySource(event.from);
      if(ability){
        const state=this.ensureState(event.target);
        const moveEvent=[...this.turnMoves].reverse().find(x=>x.species&&state.slot!==x.slot);
        const clueLabel=moveEvent?.move?`${ability} blocked ${moveEvent.move}`:`${ability} revealed`;
        this.recordAbilityReveal(state,turn,ability,moveEvent,`${state.species} was protected by ${ability}`,clueLabel);
      }
    }
  }
  buildReplayRead(){
    const targets=Object.values(this.speciesState)
      .filter(state=>state.species&&state.evidence.length)
      .map(state=>{
        const detectiveInputs=this.detectiveInputsFromState(state);
        const bestObservation=detectiveInputs[0]||null;
        const speedNotes=unique((state.speedContexts||[]).map(ctx=>{
          if(ctx.relation==='fasterThan'&&ctx.opponentSpecies)return `Moved before ${ctx.opponentSpecies} in a neutral-priority exchange`;
          if(ctx.relation==='slowerThan'&&ctx.opponentSpecies)return `Moved after ${ctx.opponentSpecies} in a neutral-priority exchange`;
          return null;
        }));
        const uniqueNotes=unique([
          state.revealedItem?`${state.revealedItem} confirmed`:null,
          state.itemGone?(state.itemLossLabel||`${state.removedItem} was removed`):null,
          state.itemGone&&state.itemLossNote?state.itemLossNote:null,
          state.itemGone&&state.postItemLossHazardNote?state.postItemLossHazardNote:null,
          ...state.abilityHints.map(a=>{
            const reward=this.abilityRewardText(a);
            return reward?`${a} revealed (${reward})`:`${a} revealed`;
          }),
          state.tookHazardDamage?'Boots ruled out':null,
          state.usedStatusMove?'Assault Vest ruled out':null,
          state.choiceContradiction?'Choice items contradicted':null,
          state.repeatedDamagingMove?'Repeated move hints at Choice locking':null,
          ...speedNotes,
          state.movedFirst&&!state.speedContext?.opponentSpecies?'Moved first in a neutral-priority exchange':null,
          state.movedSecond&&!state.speedContext?.opponentSpecies?'Moved after a neutral-priority exchange':null
        ]);
        return {
          species:state.species,
          side:state.side,
          score:state.score,
          evidenceCount:state.evidence.length,
          detectiveBranchCount:detectiveInputs.length,
          notes:uniqueNotes,
          revealedItem:state.revealedItem,
          removedItem:state.removedItem||undefined,
          itemGone:state.itemGone,
          revealedAbility:state.abilityHints.length===1?state.abilityHints[0]:undefined,
          postItemLossHazardNote:state.postItemLossHazardNote||undefined,
          abilityHints:state.abilityHints.slice(),
          usedStatusMove:state.usedStatusMove,
          tookHazardDamage:state.tookHazardDamage,
          repeatedDamagingMove:state.repeatedDamagingMove,
          choiceContradiction:state.choiceContradiction,
          movedFirst:state.movedFirst,
          movedSecond:state.movedSecond,
          speedContext:state.speedContext?{...state.speedContext}:null,
          detectiveInput:bestObservation,
          detectiveInputs:detectiveInputs.map(input=>({
            ...input,
            label:this.detectiveInputLabel(input)
          })),
          evidence:state.evidence.slice()
        };
      })
      .sort((a,b)=>(b.detectiveBranchCount>0?1:0)-(a.detectiveBranchCount>0?1:0)||b.score-a.score||b.detectiveBranchCount-a.detectiveBranchCount||b.evidenceCount-a.evidenceCount);
    const speciesCounts=targets.reduce((acc,target)=>{acc[target.species]=(acc[target.species]||0)+1;return acc;},{});
    targets.forEach(target=>{
      target.displaySpecies=speciesCounts[target.species]>1&&target.side
        ? `${target.species} (${target.side})`
        : target.species;
    });
    return {targets,strongest:targets[0]||null};
  }
}
function replayEvidenceIcon(source){
  return source==='hazard'?'!':source==='status'?'X':source==='damage'?'*':'+';
}
function replayTargetHtml(target,targetIndex,{headline='Replay target',strongest=false,includeCopy=false}={}){
  if(!target)return '';
  const noteBadges=(target.notes||[]).map(note=>reasonBadge(note,/confirmed|revealed/i.test(note)?'good':'warn')).join('');
  const detectiveInputs=target.detectiveInputs||[];
  const detectiveButtons=detectiveInputs.length
    ? detectiveInputs.map((input,index)=>`<button class="${index===0?'primary':'ghost'} small" onclick="loadReplayDetective(${targetIndex},${index})">${html(index===0?(strongest?`Load primary read: ${input.label}`:`Load read: ${input.label}`):`Load alternate read: ${input.label}`)}</button>`).join('')
    : '';
  const branchText=detectiveInputs.length>1?` It has ${detectiveInputs.length} detective-ready branches instead of a single collapsed clue.`:'';
  const evidenceText=target.evidenceCount===1?'1 clue':`${target.evidenceCount} clue(s)`;
  return `<div class="box replay-target-card"><h4>${html(headline)}</h4><p><strong>${html(target.displaySpecies||target.species)}</strong> carries ${evidenceText}.${strongest?' It is the best detective handoff right now.':' It is still replay-loadable even though it is not the top score.'}${branchText}</p><div class="badges">${noteBadges||reasonBadge('Damage-only clue pool','warn')}</div><div class="actions">${includeCopy?'<button class="ghost small" onclick="copyReplaySummary()">Copy read</button>':''}${detectiveButtons}</div></div>`;
}
function replaySummaryHtml(read){
  const targets=read?.targets||[];
  const strongest=read?.strongest||targets[0]||null;
  if(!strongest)return '<p class="muted">No single target had enough structured evidence to preload the detective.</p>';
  const secondaryTargets=targets.slice(1,4);
  const secondaryHtml=secondaryTargets.length
    ? `<div class="replay-secondary"><h4>Other live targets</h4><p>${secondaryTargets.length} more replay-backed target${secondaryTargets.length===1?' is':'s are'} still worth loading into the detective.</p><div class="replay-target-grid">${secondaryTargets.map((target,index)=>replayTargetHtml(target,index+1,{headline:`#${index+2} target`})).join('')}</div></div>`
    : '';
  return `${replayTargetHtml(strongest,0,{headline:'Strongest target',strongest:true,includeCopy:true})}${secondaryHtml}`;
}
function analyzeReplay(){
  const log=$('replayInput').value;
  if(!log.trim()){
    $('replayResults').className='empty';
    $('replayResults').textContent='Paste a replay log first.';
    lastReplayRead=null;
    return;
  }
  const parser=new ReplayParser(),turns=parser.parse(log);
  lastReplayRead=parser.replayRead;
  if(!turns.length){
    $('replayResults').className='empty';
    $('replayResults').textContent='No valid turns found. Check format.';
    return;
  }
  const by={};
  parser.evidence.forEach(ev=>{(by[ev.turn]||(by[ev.turn]=[])).push(ev)});
  const turnHTML=turns.map(t=>{
    const evs=by[t.turn]||[];
    const evHTML=evs.map(e=>`<div class="evidence-item ${e.source}"><span class="evidence-icon">${replayEvidenceIcon(e.source)}</span><div><p>${html(e.text)}</p><strong>${html(e.conclusion)}</strong></div></div>`).join('');
    return`<div class="turn-card"><h4>Turn ${t.turn}</h4>${evs.length?`<div class="evidence-list">${evHTML}</div>`:'<p class="muted">No key evidence</p>'}</div>`;
  }).join('');
  $('replayResults').className='replay-results';
  $('replayResults').innerHTML=`<div class="timeline">${turnHTML}</div><div class="replay-summary"><h4>Summary</h4><p>${parser.evidence.length} evidence points across ${turns.length} turns and ${parser.replayRead.targets.length} replay-backed target${parser.replayRead.targets.length===1?'':'s'}.</p>${replaySummaryHtml(parser.replayRead)}</div>`;
}
function loadReplayDetective(targetIndex=0,branchIndex){
  const targets=lastReplayRead?.targets||[];
  if(branchIndex==null){
    const strongestBranches=lastReplayRead?.strongest?.detectiveInputs||[];
    if(targetIndex>0&&strongestBranches[targetIndex]){
      branchIndex=targetIndex;
      targetIndex=0;
    }else{
      branchIndex=0;
    }
  }
  const target=targets[targetIndex]||lastReplayRead?.strongest;
  const inputs=target?.detectiveInputs||[];
  const input=inputs[branchIndex]||target?.detectiveInput;
  if(!target||!input)return;
  const opp=$('oppSpecies'), move=$('obsMove');
  if(opp?._items){
    const idx=opp._items.findIndex(x=>x.species===input.species);
    if(idx>=0)opp.value=String(idx);
  }
  if(move?._items&&input.move){
    const idx=move._items.findIndex(x=>x.species===input.move);
    if(idx>=0)move.value=String(idx);
  }
  if($('obsPct'))$('obsPct').value=String(input.observedDamage||$('obsPct').value||43);
  if($('evidence'))$('evidence').value=input.evidence||'they_hit_me';
  if($('statusMove'))$('statusMove').checked=!!input.usedStatusMove;
  if($('hazardTell'))$('hazardTell').checked=!!input.tookHazardDamage;
  if($('repeatTell'))$('repeatTell').checked=!!input.repeatedDamagingMove;
  if($('speedTell'))$('speedTell').checked=!!input.movedFirst;
  detect({...input,choiceContradiction:input.choiceContradiction,revealedItem:input.revealedItem});
}
function copyReplaySummary(){let text=$('replayResults').innerText;if(text)navigator.clipboard?.writeText(text)}
const LocalAgents={
  surgeon:facts=>{const worst=facts.weaknesses?.[0];if(!worst)return'No weakness data available. Run team analysis first.';return`[TYPE SURGEON REPORT]\n\nCritical Finding: ${worst.weak} Pokemon vulnerable to ${worst.tp}.\nSeverity: ${worst.sev.toUpperCase()}.\n\nIdentity context: ${facts.identity||'unknown'}. Patch this before trusting the matchup spread.`},
  actuary:facts=>{if(!facts.move)return'No KO calculation data. Run damage calculator first.';let ko=+facts.koChance||0,rev=+facts.reverseKo||0;return`[KO ACTUARY REPORT]\n\n${facts.attacker} -> ${facts.defender} using ${facts.move}:\nOHKO ${facts.koChance}% / reverse ${facts.reverseKo}%${facts.reverseMove?` (${facts.reverseMove})`:''}.\n\n${ko>85&&rev<40?'Safe click.':ko>60?'Playable risk.':'Not lethal enough. Seek chip or pivot.'}`},
  detective:facts=>{
    if(!facts.species)return'No detective data. Run hidden info detection first.';
    const notes=(facts.notes||[]).slice(0,3).join(', ')||'Need more structured clues.';
    return `[SET DETECTIVE REPORT]\n\nSubject: ${facts.species}\nPrimary Hypothesis: ${facts.topItem} + ${facts.topNature}\nConfidence: ${facts.confidence||`${(facts.prob*100).toFixed(1)}%`}\nVerdict: ${facts.verdict||'Best current line loaded.'}\nNotes: ${notes}`;
  },
  goblin:facts=>facts.status?`[LADDER GOBLIN REPORT]\n\n${facts.status==='Critical'?'This build needs adult supervision.':'The patient is breathing.'}\nIdentity: ${facts.identity||'unknown'}\nMissing: ${facts.missing?.join(', ')||'None'}\nRedundant: ${facts.redundancies?.join(', ')||'None'}`:'No team data. Analyze first.',
  summary:facts=>facts.status?`[NURSE JOYLESS PRESCRIPTION]\n\nStatus: ${facts.status}\nIdentity: ${facts.identity||'unknown'}\nWorst weakness: ${facts.worstType||'none'}\nBest suggestion: ${facts.topSuggestion||'none'}\n\nRun Sparring Lab before trusting your feelings.`:'Analyze a team and run Sparring Lab first.'
};
let currentAgentMode='local',currentAgent='surgeon';
function getAgentFacts(agent){
  const facts={};
  if(analysis){
    runReasoner();
    facts.status=analysis.status;
    facts.weaknesses=analysis.rows?.slice(0,3);
    facts.typeCounts=analysis.typeCounts;
    facts.missing=analysis.missing;
    facts.redundancies=analysis.red;
    facts.worstType=analysis.rows?.[0]?.tp;
    facts.identity=reasoner?.identity?.primary?.name;
    facts.topSuggestion=reasoner?.suggestions?.[0]?.pokemon;
  }
  if(agent==='actuary'){
    const atk=$('attacker')?.value,def=$('defender')?.value,move=$('move')?.value;
    if(atk&&def&&move){
      const a=$('attacker')._items?.[atk],d=$('defender')._items?.[def];
      if(a&&d){
        const r=dmg(a,d,move,{hpPct:+$('hp')?.value||100,hazards:$('hazards')?.value||'none',field:$('field')?.value||'none',attackerTera:$('attTera')?.checked,defenderTera:$('defTera')?.checked,attackerTeraType:$('attTeraType')?.value,defenderTeraType:$('defTeraType')?.value});
        facts.attacker=a.species;
        facts.defender=d.species;
        facts.move=move;
        facts.koChance=(r.ko*100).toFixed(1);
        try{
          const rm=d.moves.find(m=>moveData(m)&&moveCategory(m)!=='Status')||'Earthquake';
          const rev=dmg(d,a,rm,{hpPct:100});
          facts.reverseKo=(rev.ko*100).toFixed(1);
          facts.reverseMove=rm;
        }catch(e){
          facts.reverseKo='?';
        }
      }
    }
  }
  if(agent==='detective'){
    const read=lastDetectiveRead||null;
    const replay=lastReplayRead?.strongest||null;
    if(read?.top?.length){
      const top=read.top[0];
      facts.species=read.input.species;
      facts.topItem=top.item;
      facts.topNature=top.ability?`${top.nature} with ${top.ability}`:top.nature;
      facts.topAbility=top.ability;
      facts.prob=top.prob;
      facts.confidence=read.summary?.confidence?.label||`${(top.prob*100).toFixed(1)}%`;
      facts.verdict=read.summary?.verdict;
      facts.notes=read.summary?.notes||[];
    }else if(replay){
      facts.species=replay.species;
      facts.topItem=replay.revealedItem||'Unconfirmed item';
      facts.topNature=replay.movedFirst?'fast line favored':'nature still open';
      facts.prob=0.5;
      facts.confidence='Replay-only';
      const trackedTargets=lastReplayRead?.targets?.length||1;
      facts.verdict=`Replay Observer has ${replay.evidenceCount} structured clue(s) on ${replay.species}${replay.detectiveBranchCount>1?`, including ${replay.detectiveBranchCount} detective-ready branches`:''}${trackedTargets>1?`, while keeping ${trackedTargets-1} other replay-backed target${trackedTargets-1===1?'':'s'} live`:''}.`;
      facts.notes=replay.notes||[];
    }
  }
  return facts;
}
async function streamKimi(prompt,onChunk,onDone,onError){const apiKey=localStorage.getItem('nursejoyless_kimiKey');if(!apiKey){onError('No Kimi API key. Add key in settings.');return}try{const res=await fetch('https://api.moonshot.ai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},body:JSON.stringify({model:'kimi-k2-0711-preview',messages:[{role:'system',content:'You are a competitive Pokemon analyst. ONLY explain provided facts. Never invent mechanics.'},{role:'user',content:prompt}],stream:true,temperature:.7,max_tokens:300})});if(!res.ok){onError(`Kimi error: ${res.status}`);return}const reader=res.body?.getReader?.();if(!reader){onError('Kimi response body is not streamable.');return}const decoder=new TextDecoder();let buffer='';while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let lines=buffer.split('\n');buffer=lines.pop()||'';for(const line of lines){if(!line.startsWith('data: '))continue;let data=line.slice(6).trim();if(data==='[DONE]'){onDone();return}try{let json=JSON.parse(data),chunk=json.choices?.[0]?.delta?.content||'';if(chunk)onChunk(chunk)}catch(e){}}}onDone()}catch(err){onError(err.message||String(err))}}async function streamOllama(prompt,onChunk,onDone,onError){const baseUrl=localStorage.getItem('nursejoyless_ollamaUrl')||'http://localhost:11434';try{const res=await fetch(`${baseUrl}/api/generate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'llama3',prompt,stream:true})});if(!res.ok){onError(`Ollama error: ${res.status}`);return}const reader=res.body.getReader(),decoder=new TextDecoder();while(true){const{done,value}=await reader.read();if(done)break;decoder.decode(value).split('\n').filter(Boolean).forEach(line=>{try{let j=JSON.parse(line);onChunk(j.response||'')}catch(e){}})}onDone()}catch(err){onError(err.message)}}function buildAgentPrompt(agent,facts){return`Agent: ${agent}\nRules: only explain facts, never invent mechanics.\nFACTS:\n${JSON.stringify(facts,null,2)}\nRespond in 2-3 sharp sentences.`}async function runAgent(agent){currentAgent=agent;document.querySelectorAll('.agent-tab').forEach(t=>t.classList.toggle('active',t.dataset.agent===agent));const facts=getAgentFacts(agent),output=$('agentOutput');if(currentAgentMode==='local'){output.innerHTML='<div class="agent-loading">Analyzing...</div>';setTimeout(()=>{output.innerHTML=`<pre class="agent-response">${html(LocalAgents[agent](facts))}</pre>`},120);return}const prompt=buildAgentPrompt(agent,facts);output.innerHTML='<pre class="agent-response"></pre>';const pre=output.querySelector('pre');let full='';const onChunk=c=>{full+=c;pre.textContent=full;output.scrollTop=output.scrollHeight};const onDone=()=>pre.classList.add('done');const onError=e=>output.innerHTML=`<div class="agent-error">${html(e)}</div>`;if(currentAgentMode==='kimi')await streamKimi(prompt,onChunk,onDone,onError);else await streamOllama(prompt,onChunk,onDone,onError)}function initAgentConsole(){$('openAgent').onclick=()=>$('agentConsole').classList.add('open');$('closeAgent').onclick=()=>$('agentConsole').classList.remove('open');document.querySelectorAll('.agent-tab').forEach(t=>t.onclick=()=>runAgent(t.dataset.agent));document.querySelectorAll('.mode-btn').forEach(b=>b.onclick=()=>{document.querySelectorAll('.mode-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentAgentMode=b.dataset.mode;$('apiSettings').classList.toggle('hidden',currentAgentMode==='local')});$('saveApi').onclick=()=>{localStorage.setItem('nursejoyless_kimiKey',$('kimiKey').value);localStorage.setItem('nursejoyless_ollamaUrl',$('ollamaUrl').value);alert('Settings saved')}}
function runAnalyze(){team=parseTeam($('teamInput').value);lastDetectiveRead=null;renderTeam();if(!team.length){$('diagnosis').className='empty';$('diagnosis').textContent='No valid team blocks found.';return}analysis=analyze(team);renderAnalysis();populate();scoreArchetypes()}function setDemo(){let ai=[...$('attacker').options].find(o=>o.textContent.includes('Great Tusk'));if(ai)$('attacker').value=ai.value;updateMoves();let mi=[...$('move').options].find(o=>o.textContent==='Close Combat');if(mi)$('move').value='Close Combat';let di=[...$('defender').options].find(o=>o.textContent.includes('Kingambit'));if(di)$('defender').value=di.value;$('hp').value=71;renderKo();let oi=[...$('oppSpecies').options].find(o=>o.textContent==='Dragapult');if(oi)$('oppSpecies').value=oi.value;let sm=[...$('obsMove').options].find(o=>o.textContent==='Shadow Ball');if(sm)$('obsMove').value=sm.value;detect()}function init(){$('teamInput').value=SAMPLE;$('loadDemo').onclick=()=>{$('teamInput').value=SAMPLE;runAnalyze();setDemo()};$('reset').onclick=()=>{team=[];analysis=null;reasoner=null;lastReplayRead=null;lastDetectiveRead=null;$('teamInput').value='';['teamCards','diagnosis','archetypeResults','identityResults','synergyResults','assistantResults','validationResults','exportsResults'].forEach(id=>{let e=$(id);if(e){e.className='empty';e.textContent='Analyze a team first.'}});$('status').textContent='No patient loaded';$('statusText').textContent='Paste a team before I start judging you.'};$('analyze').onclick=runAnalyze;$('attacker').onchange=updateMoves;$('calcKo').onclick=renderKo;$('detect').onclick=detect;$('rebuild').onclick=rebuild;$('calcArchetypes').onclick=scoreArchetypes;if($('suggestPokemon'))$('suggestPokemon').onclick=()=>{runReasoner();renderAssistant()};if($('validateMoves'))$('validateMoves').onclick=validateTeamSets;if($('copyMarkdown'))$('copyMarkdown').onclick=copyMarkdown;if($('exportJson'))$('exportJson').onclick=exportJson;$('analyzeReplay').onclick=analyzeReplay;
  // Regression test team buttons
  if($('testDragonSpam'))$('testDragonSpam').onclick=()=>{$('teamInput').value=REGRESSION_TEAMS.dragonSpam;runAnalyze();setDemo()};
  if($('testHazardStack'))$('testHazardStack').onclick=()=>{$('teamInput').value=REGRESSION_TEAMS.hazardStack;runAnalyze();setDemo()};
  if($('testSunRoom'))$('testSunRoom').onclick=()=>{$('teamInput').value=REGRESSION_TEAMS.sunRoom;runAnalyze();setDemo()};
  initAgentConsole();runAnalyze();setDemo()}document.addEventListener('DOMContentLoaded',()=>{try{init()}catch(err){console.error('[Nurse Joyless init failed]',err);}});function updateActiveNav(){const sections=['hero','team-clinic','diagnosis-section','ko-section','detective-section','prescription-section','observer-section','sim-section','identity-section','synergy-section','assistant-section','validation-section','exports-section'];let current='hero';for(const id of sections){const el=document.getElementById(id);if(el&&el.getBoundingClientRect().top<180)current=id}document.querySelectorAll('.nav-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.jump===current))}window.addEventListener('scroll',updateActiveNav,{passive:true});

// === Nurse Joyless Advanced Reasoning Pack ===
Object.assign(NATURE,{
  Brave:{up:'atk',down:'spe'},Quiet:{up:'spa',down:'spe'},Relaxed:{up:'def',down:'spe'},Sassy:{up:'spd',down:'spe'},
  Lonely:{up:'atk',down:'def'},Naughty:{up:'atk',down:'spd'},Bold:{up:'def',down:'atk'},Lax:{up:'def',down:'spd'},
  Mild:{up:'spa',down:'def'},Rash:{up:'spa',down:'spd'},Gentle:{up:'spd',down:'def'},Hasty:{up:'spe',down:'def'},Naive:{up:'spe',down:'spd'},
  Docile:{},Serious:{},Bashful:{},Quirky:{}
});

let lastReasoning=null;
globalThis.__ADVSETS={
  Corviknight:`Corviknight @ Leftovers\nAbility: Pressure\nTera Type: Dragon\nEVs: 248 HP / 252 Def / 8 SpD\nImpish Nature\n- Roost\n- Defog\n- U-turn\n- Body Press`,
  Heatran:`Heatran @ Leftovers\nAbility: Flash Fire\nTera Type: Grass\nEVs: 252 HP / 4 SpA / 252 SpD\nCalm Nature\n- Magma Storm\n- Earth Power\n- Stealth Rock\n- Protect`,
  Kingambit:`Kingambit @ Black Glasses\nAbility: Supreme Overlord\nTera Type: Dark\nEVs: 252 HP / 252 Atk / 4 SpD\nAdamant Nature\n- Swords Dance\n- Kowtow Cleave\n- Sucker Punch\n- Iron Head`,
  'Rotom-Wash':`Rotom-Wash @ Leftovers\nAbility: Levitate\nTera Type: Steel\nEVs: 252 HP / 212 Def / 44 Spe\nBold Nature\n- Volt Switch\n- Hydro Pump\n- Will-O-Wisp\n- Protect`,
  'Great Tusk':`Great Tusk @ Heavy-Duty Boots\nAbility: Protosynthesis\nTera Type: Water\nEVs: 252 HP / 4 Atk / 252 Def\nImpish Nature\n- Rapid Spin\n- Stealth Rock\n- Headlong Rush\n- Knock Off`,
  Amoonguss:`Amoonguss @ Rocky Helmet\nAbility: Regenerator\nTera Type: Water\nEVs: 252 HP / 172 Def / 84 SpD\nBold Nature\n- Spore\n- Giga Drain\n- Sludge Bomb\n- Foul Play`
};
const LOCAL_LEARNSETS={
  charizard:['flamethrower','hurricane','defog','roost','weatherball','airslash','fireblast','overheat'],
  dragonite:['dragondance','extremespeed','earthquake','firepunch','roost','outrage'],
  garchomp:['stealthrock','earthquake','dragontail','toxic','spikes','swordsdance','stoneedge'],
  salamence:['dragondance','earthquake','outrage','stoneedge','hurricane','fireblast','roost'],
  hydreigon:['dracometeor','darkpulse','flamethrower','uturn','flashcannon','earthpower'],
  dragapult:['dragondarts','uturn','suckerpunch','terablast','shadowball','dracometeor','willowisp','flamethrower'],
  sunflora:['gigadrain','earthpower','weatherball','dazzlinggleam','solarbeam','synthesis'],
  hoopaunbound:['psychicnoise','hyperspacefury','drainpunch','trickroom','psychic','focusblast'],
  torkoal:['eruption','lavaplume','rapidspin','stealthrock','weatherball','earthpower'],
  hatterene:['psychicnoise','dazzlinggleam','healingwish','trickroom','calmmind','psyshock'],
  ursaluna:['headlongrush','facade','firepunch','roar','swordsdance','earthquake'],
  cresselia:['icebeam','moonlight','trickroom','lunardance','psychic','thunderwave'],
  corviknight:['roost','defog','uturn','bodypress','bravebird'],
  heatran:['magmastorm','earthpower','stealthrock','protect','lavaplume','flashcannon'],
  kingambit:['swordsdance','kowtowcleave','suckerpunch','ironhead'],
  rotomwash:['voltswitch','hydropump','willowisp','protect','thunderbolt'],
  greattusk:['rapidspin','stealthrock','headlongrush','knockoff','closecombat','icespinner'],
  primarina:['moonblast','surf','hydropump','psychicnoise','calmmind','flipturn'],
  amoonguss:['spore','gigadrain','sludgebomb','foulplay','synthesis'],
  clodsire:['recover','earthquake','toxic','stealthrock','spikes'],
  gholdengo:['makeitrain','shadowball','focusblast','recover','trick'],
  clefable:['moonblast','thunderwave','wish','protect','calmmind'],
  pelipper:['hurricane','surf','weatherball','uturn','roost','defog'],
  barraskewda:['waterfall','flipturn','closecombat','aqua jet','psychicfangs']
};
DexAdapter.learnsets=null;
DexAdapter.learnsetsStatus='not-loaded';
DexAdapter.loadLearnsets=async function(){
  if(this.learnsetsStatus==='loaded'||this.learnsetsStatus==='loading')return this.learnsets;
  this.learnsetsStatus='loading';
  try{
    if(typeof window!=='undefined'&&window.pkmn?.learnsets){
      this.learnsets=window.pkmn.learnsets.learnsets||window.pkmn.learnsets;
      this.learnsetsStatus='loaded';
      return this.learnsets;
    }
    // External learnset fetch disabled: file:// pages trigger CORS noise.
    // Full online enrichment now uses PokeAPI on demand from the Assistant button.
    throw new Error('external learnset fetch disabled; using local/global data only');
  }catch(err){
    this.learnsetsStatus='fallback';
  }
  return this.learnsets;
};
DexAdapter.canLearn=function(species,move){
  const normid=this.normalizeId||this.id||function(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'')};
  const sid=normid.call(this,this.resolveSpeciesName(species));
  const mid=normid.call(this,this.resolveMoveName(move));
  if(LOCAL_LEARNSETS[sid])return LOCAL_LEARNSETS[sid].includes(mid);
  const ls=this.learnsets;
  if(ls){
    const entry=ls[sid]||ls[sid.replace(/totem|gmax$/,'')];
    const learnset=entry?.learnset||entry?.learnsets||entry;
    if(learnset&&Object.prototype.hasOwnProperty.call(learnset,mid))return true;
    return false;
  }
  return null;
};
DexAdapter.abilityOk=function(mon){
  if(!mon.ability)return {ok:true,confidence:'none',reason:'No ability specified.'};
  const s=this.useDex?this.dex.species.get(mon.species):null;
  if(!s||!s.abilities)return {ok:true,confidence:'unknown',reason:'Ability data unavailable.'};
  const normid=this.normalizeId||this.id||function(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'')};
  const wanted=normid.call(this,mon.ability);
  const vals=Object.values(s.abilities).map(a=>normid.call(this,a));
  return vals.includes(wanted)?{ok:true,confidence:'high',reason:'Ability appears on species.'}:{ok:false,confidence:'high',reason:`${mon.species} does not list ${mon.ability}.`};
};

function types(m,opt={}){if(m?._defensiveTera)return [m._defensiveTera];if(opt.tera&&m?.tera)return [m.tera];return DexAdapter.getSpecies(m?.species)?.types||['Normal']}
function loweredSpeedNature(n){return ['Brave','Quiet','Relaxed','Sassy'].includes(n)}
function boostedSpeedNature(n){return ['Jolly','Timid','Hasty','Naive'].includes(n)}
function hasMove(p,moves){return p.moves.some(x=>moves.includes(x))}
function countTeam(pred){return team.filter(pred).length}
function unique(arr){return [...new Set(arr.filter(Boolean))]}
function clamp(n,min=0,max=100){return Math.max(min,Math.min(max,n))}
function scoreClass(s){return s>=70?'good':s>=45?'warn':'bad'}
function reasonBadge(text,cls=''){return `<span class="badge ${cls}">${html(text)}</span>`}
function offensiveMoveTypes(p){return unique((p.moves||[]).map(m=>[m,moveData(m)]).filter(([,d])=>d&&d[1]!=='Status').map(([,d])=>d[0]))}
function dominantOffense(p){const moves=(p.moves||[]).map(m=>moveData(m)).filter(Boolean);const phys=moves.filter(m=>m[1]==='Physical').length, spec=moves.filter(m=>m[1]==='Special').length;const evPhys=(p.evs?.atk||0)>=160, evSpec=(p.evs?.spa||0)>=160;if(evPhys||phys>spec+1)return 'physical';if(evSpec||spec>phys+1)return 'special';return 'mixed'}
function criticalPenalty(a){return (a?.rows||[]).filter(r=>r.sev==='crit').length*8}
function validateTeamAdvanced(t=team){
  const out=[];
  t.forEach(mon=>{
    const issues=[],warnings=[],valid=[];
    const species=DexAdapter.getSpecies(mon.species); species?valid.push('species exists'):warnings.push('unknown or unsupported form; validation limited');
    const evTotal=Object.values(mon.evs||{}).reduce((a,b)=>a+(+b||0),0);
    if(evTotal>510)issues.push(`EV total ${evTotal} exceeds 510`); else valid.push(`EV total ${evTotal}/510`);
    Object.entries(mon.evs||{}).forEach(([k,v])=>{if(v>252)issues.push(`${k.toUpperCase()} EV ${v} exceeds 252`)});
    if((mon.moves||[]).length>4)issues.push('more than four moves'); else valid.push('move count legal');
    if(mon.item==='Assault Vest'&&(mon.moves||[]).some(m=>moveCategory(m)==='Status'))issues.push('Assault Vest cannot be used with status moves');
    if(/^Choice /.test(mon.item||'')&&(mon.moves||[]).filter(m=>moveCategory(m)==='Status').length>=2)warnings.push('Choice item with multiple status/setup moves is usually strategically inconsistent');
    if(mon.item==='Focus Sash'&&(mon.evs?.hp||0)>=200)warnings.push('Focus Sash + heavy HP investment is suspicious; bulky items may fit better');
    const ab=DexAdapter.abilityOk(mon); if(!ab.ok)issues.push(ab.reason); else if(ab.confidence==='unknown')warnings.push(ab.reason); else if(ab.confidence!=='none')valid.push(ab.reason);
    (mon.moves||[]).forEach(m=>{const md=moveData(m);if(!md){issues.push(`unknown move: ${m}`);return}const can=DexAdapter.canLearn(mon.species,m);if(can===false)warnings.push(`${m}: learnset check suggests illegality; verify manually`);else if(can===true)valid.push(`${m}: learnset OK`);else if(can&&can.known===true&&can.can===false)warnings.push(`${m}: learnset check suggests illegality; verify manually`);else if(can&&can.known===true&&can.can===true)valid.push(`${m}: learnset OK`);else warnings.push(`${m}: learnset data not loaded; move exists but legality is unconfirmed`)});
    out.push({species:mon.species,item:mon.item,issues,warnings,valid,status:issues.length?'invalid':warnings.length?'warning':'valid'});
  });
  return out;
}
function renderAdvancedLab(report=lastReasoning){
  if(!report){$('archetypeResults').className='empty';$('archetypeResults').textContent='Analyze a team first to run the advanced Sparring Lab.';return}
  const id=report.identity, syn=report.synergy, mat=report.matchups;
  $('archetypeResults').className='diag advanced-lab';
  const identityCards=[id.primary,...id.secondary].map(x=>`<div class="archetype-card ${scoreClass(x.score)}"><h3>${html(x.name)}</h3><div class="archetype-score">${x.score}/100</div><p>${html(x.plan)}</p><div class="badges">${x.evidence.slice(0,4).map(e=>reasonBadge(e)).join('')}</div></div>`).join('');
  const scoreCards=Object.entries(syn.scores).map(([k,v])=>`<div class="metric-card ${scoreClass(v)}"><span>${labelize(k)}</span><strong>${v}/100</strong><div class="bar"><div style="width:${v}%"></div></div></div>`).join('');
  const issueCards=syn.issues.slice(0,8).map(i=>`<div class="evidence-item ${i.severity==='critical'?'hazard':i.severity==='bad'?'status':'damage'}"><span class="evidence-icon">${i.severity==='critical'?'!':'•'}</span><div><p>${html(i.title)}</p><strong>${html(i.detail)}</strong></div></div>`).join('')||'<p class="muted">No critical structural issues detected.</p>';
  const matchupCards=mat.map(m=>`<div class="archetype-card ${m.class}"><h3>${html(m.name)}</h3><div class="archetype-score">${m.score}/100</div><p>${html(m.reason)}</p><p class="muted">${html(m.advice)}</p></div>`).join('');
  $('archetypeResults').innerHTML=`<div class="box"><h3>Team Identity</h3><div class="archetype-grid">${identityCards}</div></div><div class="box"><h3>Synergy Scores</h3><div class="metric-grid">${scoreCards}</div></div><div class="twocol"><div class="box"><h3>Structural Findings</h3><div class="evidence-list">${issueCards}</div></div><div class="box"><h3>Nurse Joyless Verdict</h3><p>${html(verdict(report))}</p><div class="badges">${report.diagnosis.topWeaknesses.slice(0,5).map(w=>reasonBadge(`${w.tp}: ${w.weak} weak / ${w.res} resist`,w.sev)).join('')}</div></div></div><div class="box"><h3>Matchup Matrix</h3><div class="archetype-grid">${matchupCards}</div></div>`;
}
function labelize(s){return s.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase())}
const PokeApiProvider={
  base:'https://pokeapi.co/api/v2',
  cache:{type:{},pokemon:{}},
  lastStatus:'idle',
  title(name){return String(name||'').split('-').map(w=>w?w[0].toUpperCase()+w.slice(1):w).join('-').replace(/\bGmax\b/g,'G-Max')},
  apiName(name){return String(name||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')},
  async json(path){const res=await fetch(`${this.base}${path}`,{cache:'force-cache'});if(!res.ok)throw new Error(`PokeAPI ${res.status}`);return res.json()},
  async typeList(tp){const key=String(tp||'').toLowerCase();if(this.cache.type[key])return this.cache.type[key];const data=await this.json(`/type/${key}`);const names=(data.pokemon||[]).map(x=>x.pokemon&&x.pokemon.name).filter(Boolean).filter(n=>!/(mega|gmax|totem|starter|busted|school|eternamax)/.test(n));this.cache.type[key]=unique(names);return this.cache.type[key]},
  async pokemon(name){const key=this.apiName(name);if(this.cache.pokemon[key])return this.cache.pokemon[key];const data=await this.json(`/pokemon/${key}`);const mon={apiName:data.name,species:this.title(data.name),types:(data.types||[]).sort((a,b)=>a.slot-b.slot).map(x=>labelize(x.type.name)),baseStats:['hp','attack','defense','special-attack','special-defense','speed'].map(stat=>data.stats.find(s=>s.stat.name===stat)?.base_stat||0),abilities:(data.abilities||[]).map(a=>this.title(a.ability.name)),moves:(data.moves||[]).map(m=>this.title(m.move.name))};this.cache.pokemon[key]=mon;return mon},
  async candidatesByTypes(types,limit=70){const names=[];for(const tp of unique(types).slice(0,5)){try{names.push(...await this.typeList(tp.toLowerCase()))}catch(e){}}return unique(names).slice(0,limit)},
  async suggest(report){this.lastStatus='loading';const names=await this.candidatesByTypes(candidateTypesForReport(report),90);const present=new Set(team.map(x=>DexAdapter.id(x.species)));const out=[];for(const name of names){if(out.length>=24)break;if(present.has(DexAdapter.id(name)))continue;try{const mon=await this.pokemon(name);const scored=scoreApiCandidate(mon,report);if(scored.score>=35)out.push(scored)}catch(e){}}this.lastStatus='loaded';return out.sort((a,b)=>b.score-a.score).slice(0,6)}
};
function candidateTypesForAttack(tp){return {Water:['Grass','Water','Dragon'],Ice:['Steel','Water','Fire'],Fairy:['Steel','Fire','Poison'],Ground:['Flying','Grass'],Fighting:['Fairy','Ghost','Poison','Flying'],Electric:['Ground','Grass'],Fire:['Water','Dragon','Fire','Rock'],Dragon:['Steel','Fairy'],Dark:['Fairy','Fighting','Dark'],Ghost:['Dark','Normal'],Rock:['Steel','Ground','Fighting'],Steel:['Water','Fire','Electric','Steel'],Grass:['Fire','Flying','Steel','Poison'],Poison:['Steel','Ground'],Psychic:['Steel','Dark'],Flying:['Steel','Electric','Rock'],Bug:['Steel','Fire','Flying'],Normal:['Ghost','Steel','Rock']}[tp]||['Steel','Water','Fairy']}
function candidateTypesForReport(report){const types=[];(report?.diagnosis?.topWeaknesses||[]).slice(0,4).forEach(w=>types.push(...candidateTypesForAttack(w.tp)));const primary=report?.identity?.primary?.name||'';if(primary.includes('Dragon'))types.push('Steel','Fairy');if(primary.includes('Sun'))types.push('Fire','Grass','Water');if(primary.includes('Hazard'))types.push('Steel','Flying','Ghost');return unique(types).slice(0,8)}
function scoreApiCandidate(mon,report){const p=report.profile, worst=report.diagnosis.topWeaknesses||[], tc=p.typeCounts||{};let score=28,why=[],roles=[];worst.slice(0,4).forEach(w=>{const m=mult(w.tp,mon.types);if(m===0){score+=18;why.push(`immune to ${w.tp} pressure`)}else if(m<1){score+=14;why.push(`resists ${w.tp} pressure`)}else if(m>1){score-=10}});mon.types.forEach(t=>{if((tc[t]||0)>=2)score-=8});const [hp,atk,def,spa,spd,spe]=mon.baseStats;if(hp+def>=190||hp+spd>=190){score+=10;roles.push('defensive backbone')}if(spe>=105){score+=8;roles.push('speed control')}if(atk>=115||spa>=115){score+=9;roles.push('wallbreaker')}if(mon.types.includes('Steel')){roles.push('Fairy/Ice resist');score+=8}if(mon.types.includes('Water')||mon.types.includes('Grass'))roles.push('Water resist');if(mon.moves.some(m=>['Defog','Rapid-Spin','Rapid Spin','Mortal-Spin','Mortal Spin','Court-Change','Court Change'].includes(m))){score+=14;roles.push('hazard control');why.push('has removal in API movepool')}if(mon.moves.some(m=>['U-Turn','Volt-Switch','Volt Switch','Flip-Turn','Flip Turn','Parting-Shot','Parting Shot'].includes(m))){score+=6;roles.push('pivot')}if(mon.moves.some(m=>['Recover','Roost','Slack-Off','Slack Off','Moonlight','Synthesis'].includes(m))){score+=6;roles.push('recovery')}if(report.identity.primary.name.includes('Dragon')&&mon.types.includes('Steel'))why.push('patches Dragon spam revenge paths');if(report.matchups.find(m=>m.name==='Rain'&&m.score<50)&&(mon.types.includes('Water')||mon.types.includes('Grass')))why.push('improves the Rain matchup');roles=unique(roles);why=unique(why).filter(Boolean).slice(0,4);return {species:mon.species,roles:roles.length?roles:['role compression'],why:why.length?why:[`API candidate with ${html(mon.types.join('/'))} typing and useful base stats`],score:clamp(score),set:buildApiSet(mon,roles)}}
function buildApiSet(mon,roles=[]){const stats=mon.baseStats,types=mon.types;const item=roles.includes('hazard control')?'Heavy-Duty Boots':roles.includes('defensive backbone')?'Leftovers':roles.includes('wallbreaker')?'Life Orb':'Leftovers';const nature=stats[5]>=105?'Timid':stats[1]>=stats[3]?'Adamant':'Modest';const preferred=['Recover','Roost','Slack Off','Defog','Rapid Spin','U-Turn','Volt Switch','Flip Turn','Knock Off','Stealth Rock','Spikes','Toxic','Thunder Wave','Moonblast','Flash Cannon','Earthquake','Close Combat','Flamethrower','Shadow Ball','Surf','Hydro Pump','Ice Beam','Thunderbolt','Giga Drain'];let moves=preferred.filter(m=>mon.moves.some(x=>DexAdapter.id(x)===DexAdapter.id(m))).slice(0,4);if(moves.length<4)moves=unique([...moves,...mon.moves.filter(m=>moveData(m)&&moveCategory(m)!=='Status').slice(0,4-moves.length)]).slice(0,4);while(moves.length<4)moves.push(types[0]||'Tera Blast');return `${mon.species} @ ${item}\nAbility: ${mon.abilities[0]||'Ability'}\nTera Type: ${types.includes('Steel')?'Water':'Steel'}\nEVs: 252 HP / 4 Def / 252 ${stats[1]>=stats[3]?'Atk':'SpA'}\n${nature} Nature\n- ${moves.join('\n- ')}`}
function renderIdentityReport(report=lastReasoning){const el=$('identityResults');if(!el)return;if(!report){el.className='empty';el.textContent='Analyze a team first.';return}const id=report.identity;const all=[id.primary,...id.secondary];el.className='diag';el.innerHTML=`<div class="box"><h3>${html(id.primary.name)} · ${id.primary.score}/100</h3><p>${html(id.primary.plan)}</p><div class="badges">${id.primary.evidence.map(e=>reasonBadge(e,'good')).join('')}</div></div><div class="box"><h3>Identity Candidates</h3><div class="archetype-grid">${all.map(x=>`<div class="archetype-card ${scoreClass(x.score)}"><h3>${html(x.name)}</h3><div class="archetype-score">${x.score}/100</div><p>${html(x.plan)}</p></div>`).join('')}</div></div>`}
function renderSynergyReport(report=lastReasoning){const el=$('synergyResults');if(!el)return;if(!report){el.className='empty';el.textContent='Run Sparring Lab first.';return}const cards=Object.entries(report.synergy.scores).map(([k,v])=>`<div class="metric-card ${scoreClass(v)}"><span>${html(labelize(k))}</span><strong>${v}/100</strong><div class="bar"><div style="width:${v}%"></div></div></div>`).join('');const issues=report.synergy.issues.map(i=>`<div class="evidence-item ${i.severity==='critical'?'hazard':i.severity==='bad'?'status':'damage'}"><span class="evidence-icon">${i.severity==='critical'?'!':'•'}</span><div><p>${html(i.title)}</p><strong>${html(i.detail)}</strong></div></div>`).join('')||'<p class="muted">No major structural issues detected.</p>';el.className='diag';el.innerHTML=`<div class="box"><h3>Structural Scoring</h3><p>Scores are recalculated from the current Sparring Lab report, not a stale panel.</p><div class="metric-grid">${cards}</div></div><div class="box"><h3>Structural Findings</h3><div class="evidence-list">${issues}</div></div>`}
function renderAllReasoning(report=lastReasoning){renderAdvancedLab(report);renderIdentityReport(report);renderSynergyReport(report);renderAssistant(report);renderValidation(report);renderExportPreview(report)}
function renderValidation(report=lastReasoning){if(!report){report=buildReasoningReport();lastReasoning=report}if(!report){$('validationResults').className='empty';$('validationResults').textContent='Analyze a team first.';return}const rows=report.validation.map(v=>`<div class="validation-card ${v.status}"><h3>${html(v.species)}</h3><p><strong>${v.status.toUpperCase()}</strong></p>${v.issues.length?`<div class="badges">${v.issues.map(x=>reasonBadge(x,'bad')).join('')}</div>`:''}${v.warnings.length?`<div class="badges">${v.warnings.map(x=>reasonBadge(x,'warn')).join('')}</div>`:''}${!v.issues.length&&!v.warnings.length?`<div class="badges">${reasonBadge('clean set','good')}</div>`:''}<details><summary>Evidence</summary><ul>${v.valid.slice(0,8).map(x=>`<li>${html(x)}</li>`).join('')}</ul></details></div>`).join('');$('validationResults').className='diag';$('validationResults').innerHTML=`<div class="validation-grid">${rows}</div><p class="muted">Learnset checks use full Dex data when available and conservative fallback checks otherwise; unknown learnsets are reported as warnings rather than false certainty.</p>`}
function scoreArchetypes(){if(!team.length||!analysis){['archetypeResults','identityResults','synergyResults'].forEach(id=>{const e=$(id);if(e){e.className='empty';e.textContent='Analyze a team first.'}});return}lastReasoning=buildReasoningReport();renderAllReasoning(lastReasoning)}
function nHitChance(r,hits){const threshold=r.ehp+(r.def.item==='Leftovers'?Math.floor(r.max/16)*(hits-1):0);let sums={0:1};for(let i=0;i<hits;i++){let next={};Object.entries(sums).forEach(([sum,count])=>r.rolls.forEach(d=>{let ns=+sum+d;next[ns]=(next[ns]||0)+count}));sums=next}let total=16**hits, success=Object.entries(sums).reduce((a,[s,c])=>a+(+s>=threshold?c:0),0);return success/total*(r.hit**hits)}
function renderKo(){try{let a0=$('attacker')._items[$('attacker').value],d0=$('defender')._items[$('defender').value];let a={...a0},d={...d0};if($('attackerTera')?.checked)a.tera=$('attackerTeraType')?.value||a.tera||types(a)[0];if($('defenderTera')?.checked)d._defensiveTera=$('defenderTeraType').value||d.tera||types(d)[0];let r=dmg(a,d,$('move').value,{hpPct:+$('hp').value,hazards:$('hazards').value,field:$('field').value,attackerTera:$('attackerTera')?.checked,attackerTeraType:$('attackerTeraType')?.value,defenderTera:$('defenderTera')?.checked,defenderTeraType:$('defenderTeraType')?.value});let rev=d0.moves.filter(x=>moveData(x)&&moveCategory(x)!=='Status').map(x=>{try{let rd={...d0};if($('defenderTera')?.checked){rd.tera=$('defenderTeraType').value;rd._defensiveTera=$('defenderTeraType').value}return dmg(rd,a,x,{hpPct:100,field:$('field').value,defenderTera:$('attackerTera')?.checked,defenderTeraType:$('attackerTeraType')?.value})}catch(e){return null}}).filter(Boolean).sort((x,y)=>y.ko-x.ko||y.maxp-x.maxp).slice(0,3);let rolls=r.rolls.map(x=>(x/r.max*100).toFixed(1)+'%').join(' · '),ohko=r.ko,two=nHitChance(r,2),three=nHitChance(r,3);$('ko').className='diag';$('ko').innerHTML=`<div class="threecol"><div class="box"><span class="meta">OHKO odds</span><div class="odds">${(ohko*100).toFixed(1)}%</div><p>${ohko>=1?'Guaranteed OHKO':ohko>0?'This is a roll':'Needs chip or a different play'}</p></div><div class="box"><span class="meta">2HKO odds</span><div class="odds">${(two*100).toFixed(1)}%</div><p>${d.item==='Leftovers'?'Includes one Leftovers tick.':'No recovery adjustment detected.'}</p></div><div class="box"><span class="meta">3HKO odds</span><div class="odds">${(three*100).toFixed(1)}%</div><p>${r.hz?`Hazards applied: ${r.hz.toFixed(1)}%`:'No hazard chip'}</p></div></div><div class="box"><h3>Damage Range</h3><p>${html(r.mv)} into ${html(d0.species)}${d._defensiveTera?` after Tera ${html(d._defensiveTera)}`:''}: <strong>${r.minp.toFixed(1)}-${r.maxp.toFixed(1)}%</strong></p><p>${rolls}</p><div class="bar"><div style="width:${Math.max(2,ohko*100)}%"></div></div></div><div class="box"><h3>Can they take you out?</h3>${rev.length?`<table><thead><tr><th>Move</th><th>Damage</th><th>OHKO</th><th>2HKO</th></tr></thead><tbody>${rev.map(x=>`<tr><td>${html(x.mv)}</td><td>${x.minp.toFixed(1)}-${x.maxp.toFixed(1)}%</td><td>${(x.ko*100).toFixed(1)}%</td><td>${(nHitChance(x,2)*100).toFixed(1)}%</td></tr>`).join('')}</tbody></table>`:'No damaging moves known.'}</div><div class="box"><h3>Nurse Joyless call</h3><p>${html(advice(r,rev))}</p></div>`}catch(e){$('ko').className='empty';$('ko').textContent=e.message}}
function renderExportPreview(r=lastReasoning){if(!r){$('exportsResults').className='empty';$('exportsResults').textContent='Run Sparring Lab first to generate exports.';return}const md=buildMarkdownReport(r);$('exportsResults').className='twocol';$('exportsResults').innerHTML=`<div class="box"><h3>Markdown Preview</h3><code class="code">${html(md.slice(0,2600))}</code></div><div class="box"><h3>JSON Preview</h3><code class="code">${html(JSON.stringify(r,null,2).slice(0,2600))}</code></div>`}
function exportMarkdown(){if(!lastReasoning)lastReasoning=buildReasoningReport();const md=buildMarkdownReport(lastReasoning);navigator.clipboard?.writeText(md);renderExportPreview(lastReasoning);alert('Markdown report copied.')} 
function exportJson(){if(!lastReasoning)lastReasoning=buildReasoningReport();const data=JSON.stringify(lastReasoning,null,2);const blob=new Blob([data],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='nurse-joyless-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);renderExportPreview(lastReasoning)}
function setTeraOptions(){['attackerTeraType','defenderTeraType'].forEach(id=>{const sel=$(id);if(sel)sel.innerHTML=TYPES.map(t=>`<option>${t}</option>`).join('')})}
function validateButton(){if(!lastReasoning)lastReasoning=buildReasoningReport();renderValidation(lastReasoning)}
async function suggestButton(){await suggestPokemonOnline()}
document.addEventListener('DOMContentLoaded',()=>{setTeraOptions();$('suggestPokemon')&&($('suggestPokemon').onclick=suggestButton);$('loadOnlineDex')&&($('loadOnlineDex').onclick=suggestButton);$('validateMoves')&&($('validateMoves').onclick=validateButton);$('exportMarkdown')&&($('exportMarkdown').onclick=exportMarkdown);$('exportJson')&&($('exportJson').onclick=exportJson);/* DexAdapter.loadLearnsets intentionally not eager-loaded; avoids file:// CORS noise. */});

// Bridge old UI helpers onto the advanced report object.
function runReasoner(){
  if(!team.length||!analysis){reasoner=null;lastReasoning=null;return null}
  lastReasoning=buildReasoningReport();
  reasoner={
    identity:{
      primary:{name:lastReasoning.identity.primary.name,score:lastReasoning.identity.primary.score,ev:lastReasoning.identity.primary.evidence.map(e=>({label:e,detail:e}))},
      secondary:lastReasoning.identity.secondary.map(x=>({name:x.name,score:x.score,ev:x.evidence.map(e=>({label:e,detail:e}))})),
      scores:lastReasoning.identity.all
    },
    synergy:lastReasoning.synergy.scores,
    matchups:lastReasoning.matchups,
    risks:lastReasoning.synergy.issues.map(i=>({level:i.severity,type:i.title,detail:i.detail})),
    suggestions:lastReasoning.suggestions.map(s=>({pokemon:s.species,roles:s.roles,why:s.why.join(' • ')||'Improves structure.',score:s.score,set:s.set})),
    verdict:verdict(lastReasoning)
  };
  return reasoner;
}


// === V3.1 runtime hardening + button animations ===
function safeInvoke(label,fn){return function(ev){try{return fn?.(ev)}catch(err){console.error(`[Nurse Joyless:${label}]`,err);const statusEl=$('statusText');if(statusEl)statusEl.textContent=`Runtime issue in ${label}. Check console for details.`}}}
function bindCriticalButtons(){
  const bind=(id,fn)=>{const el=$(id);if(el&&typeof fn==='function')el.onclick=safeInvoke(id,fn)};
  bind('loadDemo',()=>{$('teamInput').value=SAMPLE;runAnalyze();setDemo()});
  bind('reset',()=>{team=[];analysis=null;reasoner=null;lastReasoning=null;$('teamInput').value='';['teamCards','diagnosis','archetypeResults','identityResults','synergyResults','assistantResults','validationResults','exportsResults','ko','detective','prescription','favorites'].forEach(id=>{const e=$(id);if(e){e.className='empty';e.textContent=id==='teamCards'?'':'Analyze a team first.'}});$('status').textContent='No patient loaded';$('statusText').textContent='Paste a team before I start judging you.'});
  bind('analyze',runAnalyze);
  bind('calcKo',renderKo);
  bind('detect',detect);
  bind('rebuild',rebuild);
  bind('calcArchetypes',scoreArchetypes);
  bind('analyzeReplay',analyzeReplay);
  bind('suggestPokemon',suggestButton);bind('loadOnlineDex',suggestButton);
  bind('validateMoves',()=>{if(typeof validateTeamSets==='function')validateTeamSets();else{if(!lastReasoning)lastReasoning=buildReasoningReport();renderValidation(lastReasoning)}});
  bind('exportMarkdown',exportMarkdown);
  bind('exportJson',exportJson);
  bind('testDragonSpam',()=>{$('teamInput').value=REGRESSION_TEAMS.dragonSpam;runAnalyze();setDemo()});
  bind('testHazardStack',()=>{$('teamInput').value=REGRESSION_TEAMS.hazardStack;runAnalyze();setDemo()});
  bind('testSunRoom',()=>{$('teamInput').value=REGRESSION_TEAMS.sunRoom;runAnalyze();setDemo()});
  const attacker=$('attacker');if(attacker)attacker.onchange=safeInvoke('attacker-change',updateMoves);
  const open=$('openAgent'),panel=$('agentConsole'),close=$('closeAgent');
  if(open&&panel)open.onclick=safeInvoke('openAgent',()=>panel.classList.add('open'));
  if(close&&panel)close.onclick=safeInvoke('closeAgent',()=>panel.classList.remove('open'));
  document.querySelectorAll('.agent-tab').forEach(t=>{t.onclick=safeInvoke('agent-tab',()=>runAgent(t.dataset.agent))});
  document.querySelectorAll('.mode-btn').forEach(b=>{b.onclick=safeInvoke('mode-btn',()=>{document.querySelectorAll('.mode-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentAgentMode=b.dataset.mode;$('apiSettings')?.classList.toggle('hidden',currentAgentMode==='local')})});
  bind('saveApi',()=>{localStorage.setItem('nursejoyless_kimiKey',$('kimiKey')?.value||'');localStorage.setItem('nursejoyless_ollamaUrl',$('ollamaUrl')?.value||'http://localhost:11434');alert('Settings saved')});
  document.querySelectorAll('[data-jump]').forEach(el=>{el.addEventListener('click',safeInvoke('jump',()=>{const target=$(el.dataset.jump);if(target)target.scrollIntoView({behavior:'smooth',block:'start'})}))});
}
function installButtonAnimations(){
  document.addEventListener('click',ev=>{const el=ev.target.closest('button,.feature-card');if(!el)return;el.classList.remove('button-pressed');void el.offsetWidth;el.classList.add('button-pressed');setTimeout(()=>el.classList.remove('button-pressed'),320)},true);
}
document.addEventListener('DOMContentLoaded',()=>{bindCriticalButtons();installButtonAnimations();});

// === Nurse Joyless V3.3 Metagame Brain Overrides ===
Object.assign(P,{
  'Iron Valiant':[['Fairy','Fighting'],[74,130,90,120,60,116]],
  'Great Tusk':[['Ground','Fighting'],[115,131,131,53,53,87]],
  'Iron Treads':[['Ground','Steel'],[90,112,120,72,70,106]],
  'Weezing-Galar':[['Poison','Fairy'],[65,90,120,85,70,60]],
  'Raging Bolt':[['Electric','Dragon'],[125,73,91,137,89,75]],
  'Kyurem':[['Dragon','Ice'],[125,130,90,130,90,95]],
  'Deoxys-Speed':[['Psychic'],[50,95,90,95,90,180]],
  'Dondozo':[['Water'],[150,100,115,65,65,35]],
  'Landorus-Therian':[['Ground','Flying'],[89,145,90,105,80,91]],
  'Zapdos':[['Electric','Flying'],[90,90,85,125,90,100]],
  'Walking Wake':[['Water','Dragon'],[99,83,91,125,83,109]],
  'Garganacl':[['Rock'],[100,100,130,45,90,35]],
  'Gholdengo':[['Steel','Ghost'],[87,60,95,133,91,84]],
  'Slowking-Galar':[['Poison','Psychic'],[95,65,80,110,110,30]],
  'Forretress':[['Bug','Steel'],[75,90,140,60,60,40]],
  'Scizor':[['Bug','Steel'],[70,130,100,55,80,65]],
  'Metagross':[['Steel','Psychic'],[80,135,130,95,90,70]],
  'Skarmory':[['Steel','Flying'],[65,80,140,40,70,70]],
  'Jirachi':[['Steel','Psychic'],[100,100,100,100,100,100]],
  'Empoleon':[['Water','Steel'],[84,86,88,111,101,60]],
  'Ting-Lu':[['Dark','Ground'],[155,110,125,55,80,45]],
  'Alomomola':[['Water'],[165,75,80,40,45,65]],
  'Toxapex':[['Water','Poison'],[50,63,152,53,142,35]],
  'Samurott-Hisui':[['Water','Dark'],[90,108,80,100,65,85]],
  'Clefable':[['Fairy'],[95,70,73,95,90,60]],
});
Object.assign(MOVES,{
  Encore:['Normal','Status',0,100],
  'Sludge Bomb':['Poison','Special',90,100],
  'Pain Split':['Normal','Status',0,100],
  Thunderclap:['Electric','Special',70,100,1],
  'Dragon Pulse':['Dragon','Special',85,100],
  'Freeze-Dry':['Ice','Special',70,100],
  'Psycho Boost':['Psychic','Special',140,90],
  Curse:['Ghost','Status',0,100],
  Rest:['Psychic','Status',0,100],
  'Sleep Talk':['Normal','Status',0,100],
  'Grass Knot':['Grass','Special',1,100],
  'Salt Cure':['Rock','Physical',40,100],
  'Draco Meteor':['Dragon','Special',130,90],
  'Hydro Pump':['Water','Special',110,80],
  'Volt Switch':['Electric','Special',70,100],
  'Will-O-Wisp':['Fire','Status',0,85],
  'Flip Turn':['Water','Physical',60,100],
  'U-turn':['Bug','Physical',70,100],
  'Bleakwind Storm':['Flying','Special',100,80],
  'Malignant Chain':['Poison','Special',100,100],
  'Foul Play':['Dark','Physical',95,100],
  'Parting Shot':['Dark','Status',0,100],
});
(function(){
  const prevResolve=DexAdapter.resolveSpeciesName.bind(DexAdapter);
  const aliases={
    tornadust:'Tornadus-Therian',tornadustherian:'Tornadus-Therian','tornadus t':'Tornadus-Therian',
    thundurust:'Thundurus-Therian',thundurustherian:'Thundurus-Therian',landorust:'Landorus-Therian',landorustherian:'Landorus-Therian',lando:'Landorus-Therian',
    rotomw:'Rotom-Wash',rotomwash:'Rotom-Wash',rotomh:'Rotom-Heat',rotomheat:'Rotom-Heat',rotomfan:'Rotom-Fan',rotommow:'Rotom-Mow',rotomfrost:'Rotom-Frost',
    giratinao:'Giratina-Origin',giratinaorigin:'Giratina-Origin',urshifur:'Urshifu-Rapid-Strike',urshifurapid:'Urshifu-Rapid-Strike',urshifurapidstrike:'Urshifu-Rapid-Strike',
    ogerponwellspring:'Ogerpon-Wellspring',ogerponhearthflame:'Ogerpon-Hearthflame',ogerponcornerstone:'Ogerpon-Cornerstone',ogerponteal:'Ogerpon',
    taurospaldea:'Tauros-Paldea-Combat',taurospaldeablaze:'Tauros-Paldea-Blaze',taurospaldeaaqua:'Tauros-Paldea-Aqua',taurospaldeacombat:'Tauros-Paldea-Combat',
    walkingwake:'Walking Wake',ragingbolt:'Raging Bolt',ironvaliant:'Iron Valiant',greattusk:'Great Tusk',irontreads:'Iron Treads',weezinggalar:'Weezing-Galar',slowkinggalar:'Slowking-Galar',samurotthisui:'Samurott-Hisui',deoxysspeed:'Deoxys-Speed'
  };
  DexAdapter.resolveSpeciesName=function(name){const raw=String(name||'').trim();const key=this.id(raw);return prevResolve(aliases[key]||raw)};
})();
Object.assign(LOCAL_LEARNSETS,{
  ironvaliant:['moonblast','closecombat','knockoff','encore','thunderbolt','swordsdance'],
  greattusk:['bulkup','headlongrush','icespinner','rapidspin','stealthrock','knockoff','earthquake','closecombat'],
  irontreads:['stealthrock','earthquake','knockoff','rapidspin','ironhead','voltswitch'],
  weezinggalar:['sludgebomb','defog','painsplit','willowisp','strangesteam','toxicspikes'],
  ragingbolt:['calmmind','thunderclap','dragonpulse','thunderbolt','dracometeor'],
  kyurem:['icebeam','freezedry','dracometeor','earthpower','roost'],
  deoxysspeed:['nastyplot','psychoboost','focusblast','shadowball','stealthrock','spikes'],
  dondozo:['waterfall','curse','rest','sleeptalk','protect'],
  landorustherian:['earthquake','stoneedge','uturn','grassknot','stealthrock','knockoff'],
  zapdos:['hurricane','voltswitch','thunderwave','roost','defog','heatwave'],
  walkingwake:['surf','dracometeor','knockoff','flipturn','hydropump','flamethrower'],
  garganacl:['stealthrock','saltcure','recover','protect','earthquake'],
  gholdengo:['nastyplot','makeitrain','shadowball','recover','trick','focusblast'],
  slowkinggalar:['futuresight','sludgebomb','chillyreception','thunderwave','slackoff','psychic'],
  forretress:['rapidspin','voltswitch','stealthrock','spikes','toxicspikes','gyroball'],
  scizor:['roost','defog','uturn','knockoff','bulletpunch','swordsdance'],
  metagross:['knockoff','stealthrock','toxic','flashcannon','meteor mash','earthquake'],
  skarmory:['roost','defog','stealthrock','spikes','bravebird','bodypress'],
  jirachi:['uturn','stealthrock','toxic','thunderwave','ironhead','wish'],
  empoleon:['roost','defog','flipturn','knockoff','surf','stealthrock'],
});

const METAGAME_NOTES={
  source:'Local metagame brain + optional Smogon OU enrichment',
  scoreMeanings:{
    typeSynergy:'How cleanly the team covers major attacking types defensively.',
    roleCompression:'Whether roles are present without overloading fragile or contradictory slots.',
    offensiveCoverage:'How many defensive profiles the team can pressure.',
    defensiveBackbone:'Whether the team has stable pivots/walls across common matchups.',
    fieldControl:'Hazards, removal, denial, chip loops, and switch-control.',
    speedControl:'Fast threats, Scarf, priority, paralysis, Webs, or Trick Room.',
    winReliability:'How repeatable and protected the team’s closing paths are.'
  }
};
function hasAbility(p,names){return names.includes(p.ability)}
function isGhost(p){return types(p).includes('Ghost')}
function isSteel(p){return types(p).includes('Steel')}
function isDefensiveAnchor(p){const st=stats(p);return st.hp+Math.max(st.def,st.spd)>=620||['Dondozo','Garganacl','Ting-Lu','Alomomola','Toxapex','Corviknight','Skarmory','Blissey','Clodsire','Slowking-Galar','Zapdos','Weezing-Galar'].includes(p.species)}
function isFastBreaker(p){const st=stats(p);return st.spe>=330&&(['Choice Specs','Choice Band','Life Orb','Booster Energy','Choice Scarf'].includes(p.item)||st.atk>=330||st.spa>=330)}
function progressToolCount(p){let n=0;if(hasMove(p,['Knock Off','Salt Cure','Toxic','Will-O-Wisp','Thunder Wave','Psychic Noise','Roar','Dragon Tail']))n++;if(hasMove(p,['U-turn','Volt Switch','Flip Turn','Parting Shot']))n++;if(hasMove(p,['Stealth Rock','Spikes','Toxic Spikes','Sticky Web']))n++;return n}
function profileTeam(t=team,a=analysis){
  const typeCounts={};t.forEach(p=>types(p).forEach(tp=>typeCounts[tp]=(typeCounts[tp]||0)+1));
  const roles=a?.roles||{}, statsList=t.map(p=>({p,st:stats(p)}));
  const fast=statsList.filter(x=>x.st.spe>=330||boostedSpeedNature(x.p.nature)||x.p.item==='Choice Scarf').map(x=>x.p.species);
  const slow=statsList.filter(x=>x.st.spe<=210||x.p.ivs?.spe===0||loweredSpeedNature(x.p.nature)).map(x=>x.p.species);
  const priority=t.filter(p=>p.moves.some(m=>movePriority(m)>0)).map(p=>p.species), scarf=t.filter(p=>p.item==='Choice Scarf').map(p=>p.species), choice=t.filter(p=>/^Choice /.test(p.item||'')).map(p=>p.species);
  const offensiveItems=t.filter(p=>['Choice Specs','Choice Band','Choice Scarf','Life Orb','Expert Belt','Booster Energy','Black Glasses','Charcoal','Flame Orb'].includes(p.item)).map(p=>p.species);
  const setup=t.filter(p=>hasMove(p,['Dragon Dance','Swords Dance','Nasty Plot','Calm Mind','Bulk Up','Quiver Dance','Curse'])).map(p=>p.species);
  const recovery=t.filter(p=>hasMove(p,['Recover','Roost','Slack Off','Wish','Protect','Moonlight','Synthesis','Rest','Pain Split','Giga Drain','Drain Punch'])).map(p=>p.species);
  const hazards=t.filter(p=>hasMove(p,['Stealth Rock','Spikes','Toxic Spikes','Sticky Web'])).map(p=>p.species);
  const layers=t.filter(p=>hasMove(p,['Spikes','Toxic Spikes','Sticky Web'])).map(p=>p.species);
  const removal=t.filter(p=>hasMove(p,['Rapid Spin','Defog','Court Change','Mortal Spin'])).map(p=>p.species);
  const bounce=t.filter(p=>p.ability==='Magic Bounce').map(p=>p.species);
  const goodAsGold=t.filter(p=>p.ability==='Good as Gold'||p.species==='Gholdengo').map(p=>p.species);
  const spinblock=t.filter(p=>isGhost(p)||p.ability==='Purifying Salt'&&p.species==='Gholdengo').map(p=>p.species);
  const taunt=t.filter(p=>hasMove(p,['Taunt'])).map(p=>p.species);
  const removalDenial=unique([...goodAsGold,...spinblock,...bounce,...taunt]);
  const pivot=t.filter(p=>hasMove(p,['U-turn','Volt Switch','Flip Turn','Parting Shot','Chilly Reception','Teleport'])).map(p=>p.species);
  const status=t.filter(p=>hasMove(p,['Will-O-Wisp','Toxic','Thunder Wave','Spore','Psychic Noise','Salt Cure','Roar','Dragon Tail'])).map(p=>p.species);
  const trickRoom=t.filter(p=>hasMove(p,['Trick Room'])).map(p=>p.species);
  const drought=t.filter(p=>p.ability==='Drought'||hasMove(p,['Sunny Day'])).map(p=>p.species), drizzle=t.filter(p=>p.ability==='Drizzle'||hasMove(p,['Rain Dance'])).map(p=>p.species);
  const sunAbuse=t.filter(p=>['Solar Power','Chlorophyll','Protosynthesis'].includes(p.ability)||hasMove(p,['Weather Ball','Solar Beam','Eruption'])).map(p=>p.species);
  const rainAbuse=t.filter(p=>['Swift Swim'].includes(p.ability)||hasMove(p,['Thunder','Hurricane','Waterfall','Hydro Pump','Surf'])).map(p=>p.species);
  const wallbreakers=t.filter(p=>{const s=stats(p);return offensiveItems.includes(p.species)||s.atk>=330||s.spa>=330||['Guts','Supreme Overlord','Solar Power'].includes(p.ability)||['Hoopa-Unbound','Kyurem','Raging Bolt','Deoxys-Speed'].includes(p.species)}).map(p=>p.species);
  const defensiveAnchors=t.filter(isDefensiveAnchor).map(p=>p.species);
  const fastBreakers=t.filter(isFastBreaker).map(p=>p.species);
  const attackingTypes=unique(t.flatMap(offensiveMoveTypes));
  const physicalAttackers=t.filter(p=>dominantOffense(p)==='physical').map(p=>p.species), specialAttackers=t.filter(p=>dominantOffense(p)==='special').map(p=>p.species), mixedAttackers=t.filter(p=>dominantOffense(p)==='mixed').map(p=>p.species);
  const boots=t.filter(p=>p.item==='Heavy-Duty Boots').map(p=>p.species), lefties=t.filter(p=>p.item==='Leftovers').map(p=>p.species);
  const forcedSwitch=t.filter(p=>hasMove(p,['Roar','Dragon Tail','Whirlwind','Encore','Salt Cure'])||['Choice Specs','Choice Band','Life Orb','Booster Energy'].includes(p.item)).map(p=>p.species);
  const progressTools=t.filter(p=>progressToolCount(p)>0).map(p=>p.species);
  const wincons=unique([...setup,...wallbreakers,...priority,...t.filter(p=>['Moxie','Supreme Overlord','Guts','Solar Power'].includes(p.ability)).map(p=>p.species)]);
  const overloaded=t.filter(p=>{let jobs=0;if(hazards.includes(p.species))jobs++;if(removal.includes(p.species))jobs++;if(wallbreakers.includes(p.species))jobs++;if(defensiveAnchors.includes(p.species))jobs++;if(pivot.includes(p.species))jobs++;return jobs>=3}).map(p=>p.species);
  return {typeCounts,fast,slow,priority,scarf,choice,offensiveItems,setup,recovery,hazards,layers,removal,bounce,goodAsGold,spinblock,taunt,removalDenial,pivot,status,trickRoom,drought,drizzle,sunAbuse,rainAbuse,wallbreakers,fastBreakers,physicalAttackers,specialAttackers,mixedAttackers,boots,leftovers:lefties,defensiveWalls:unique([...(roles.physicalWall||[]),...(roles.specialWall||[]),...defensiveAnchors]),defensiveAnchors,wincons,attackingTypes,roles,forcedSwitch,progressTools,overloaded};
}
function fieldControlBreakdown(p){
  const hazardSetting=clamp(15+p.hazards.length*22+p.layers.length*12);
  const hazardRemoval=clamp(10+p.removal.length*27+p.bounce.length*18+p.boots.length*4);
  const removalDenial=clamp(p.removalDenial.length*25+(p.goodAsGold.length?25:0)+(p.spinblock.length?12:0));
  const chipAbuse=clamp(10+p.progressTools.length*9+p.forcedSwitch.length*7+p.layers.length*12);
  const pivotAbuse=clamp(10+p.pivot.length*18+p.forcedSwitch.length*4);
  const setterOverload=p.hazards.filter(x=>p.removal.includes(x)).length;
  const score=clamp(hazardSetting*.25+hazardRemoval*.2+removalDenial*.25+chipAbuse*.2+pivotAbuse*.1-setterOverload*10);
  return {hazardSetting:Math.round(hazardSetting),hazardRemoval:Math.round(hazardRemoval),removalDenial:Math.round(removalDenial),chipAbuse:Math.round(chipAbuse),pivotAbuse:Math.round(pivotAbuse),setterOverload,score:Math.round(score)};
}
function smogonCandidatePool(report){const preferred=['Gholdengo','Kingambit','Slowking-Galar','Corviknight','Skarmory','Primarina','Heatran','Rotom-Wash','Toxapex','Alomomola','Samurott-Hisui','Great Tusk','Landorus-Therian','Zapdos','Clefable','Ting-Lu'];const present=new Set(team.map(p=>DexAdapter.id(p.species)));return preferred.filter(x=>!present.has(DexAdapter.id(x))).map(species=>({species,set:SMOGON_FALLBACK_SETS[species]||SUGGEST_SETS[species]||''}))}
function candidateRoles(species){return {Gholdengo:['removal denial','Steel glue','offensive pressure','hazard support'],Kingambit:['Steel glue','priority','late-game wincon','Dark pressure'],'Slowking-Galar':['special sponge','pivot','Regenerator glue','Future Sight'],Corviknight:['hazard removal','pivot','physical backbone','Ground immunity'],Skarmory:['Spikes','physical backbone','phazing','hazard stack'],Primarina:['Water resist','Dragon check','special breaker','balance glue'],Heatran:['Steel glue','special wall','Stealth Rock','trap pressure'],'Rotom-Wash':['Water check','pivot','burn support','Ground immunity'],Toxapex:['Water check','Haze','Regenerator glue','status'],Alomomola:['Wish pivot','Water check','Regenerator glue','slow pivot'],'Samurott-Hisui':['hazard pressure','offensive lead','Knock Off','priority'],'Great Tusk':['hazard removal','Stealth Rock','physical backbone','Knock Off'],'Landorus-Therian':['pivot','Ground immunity','Choice Scarf','Intimidate'],Zapdos:['pivot','static punish','hazard removal','Flying check'],Clefable:['Fairy glue','status','Wish','setup check'],'Ting-Lu':['special backbone','hazards','phazing','Electric immunity']}[species]||['role compression']}
function scoreSmogonCandidate(c,report,data={}){
  const p=report.profile, id=report.identity.primary.name, roles=candidateRoles(c.species), mon={species:c.species,types:types({species:c.species})};
  let score=35, why=[];
  for(const w of report.diagnosis.topWeaknesses.slice(0,4)){
    const m=mult(w.tp,mon.types);
    if(m===0){score+=13;why.push(`immune to ${w.tp} pressure`)}
    else if(m<1){score+=10;why.push(`resists ${w.tp} pressure`)}
    else if(m>1)score-=6;
  }
  if(id.includes('Balance')){
    if(roles.some(r=>/pivot|glue|backbone|sponge|Regenerator/i.test(r))){score+=15;why.push('preserves balance instead of turning the team passive')}
    if(roles.includes('removal denial'))score+=12;
  }
  if(id.includes('Hazard')||report.synergy.fieldControl.removalDenial<35){
    if(roles.includes('removal denial')){score+=22;why.push('adds real hazard-removal denial')}
    if(roles.includes('Spikes')||roles.includes('hazard pressure'))score+=8;
  }
  if(report.matchups.find(m=>m.name==='Rain'&&m.score<55)&&roles.some(r=>/Water check|Water resist|special sponge|Regenerator/.test(r))){score+=15;why.push('stabilizes the Rain matchup')}
  if(report.synergy.scores.winReliability<60&&roles.some(r=>/wincon|priority|offensive pressure|special breaker/.test(r))){score+=10;why.push('adds a clearer closing path')}
  if(c.species==='Forretress'&&id.includes('Balance'))score-=25;
  if(c.species==='Gholdengo'&&p.hazards.length)score+=10;
  if(data.sets&&SmogonProvider.pickSet(c.species,data.sets)){score+=8;why.push('Smogon OU set data available')}
  score+=SmogonProvider.usageScore(c.species,data.stats);
  let set=c.set;
  const setFromData=SmogonProvider.pickSet(c.species,data.sets);
  if(setFromData){
    try{
      const item=Array.isArray(setFromData.item)?setFromData.item[0]:setFromData.item;
      const ability=Array.isArray(setFromData.ability)?setFromData.ability[0]:(setFromData.ability||'Ability');
      const tera=Array.isArray(setFromData.teraTypes)?setFromData.teraTypes[0]:'Water';
      const moves=(setFromData.moves||[]).flat().slice(0,4);
      if(item&&moves.length){
        set=`${c.species} @ ${item}\nAbility: ${ability}\nTera Type: ${tera}\nEVs: 252 HP / 4 Def / 252 SpD\nCareful Nature\n- ${moves.join('\n- ')}`;
      }
    }catch(e){}
  }
  return {species:c.species,score:Math.round(clamp(score)),roles,why:unique(why).slice(0,5),set,source:data.sets?'Smogon OU data':'local metagame fallback'};
}
function suggestAdditions(t=team,a=analysis,p=profileTeam(t,a),identity=detectIdentities(t,a,p),synergy=evaluateSynergy(t,a,p),matchups=[]){const report={profile:p,identity,synergy,matchups,diagnosis:{topWeaknesses:(a?.rows||[]).slice(0,6)}};return smogonCandidatePool(report).map(c=>scoreSmogonCandidate(c,report,{})).sort((a,b)=>b.score-a.score).slice(0,6)}
async function enrichSuggestionsFromApi(report){try{const smog=await SmogonProvider.suggest(report);if(smog&&smog.length){report.suggestions=smog;report.suggestionSource='Smogon OU sets/stats enrichment';return true}}catch(err){report.suggestionSource=`local metagame fallback (${err.message||'Smogon unavailable'})`}return false}
async function suggestPokemonOnline(){if(!lastReasoning)lastReasoning=buildReasoningReport();if(!lastReasoning){renderAssistant(lastReasoning);return}$('assistantResults').className='empty';$('assistantResults').textContent='Loading Smogon OU suggestions...';await enrichSuggestionsFromApi(lastReasoning);renderAssistant(lastReasoning)}

// === V3.5 reasoning gauntlet calibration + actionable suggestions ===
function njCap(v,cap=96){return Math.round(Math.max(0,Math.min(cap,v)))}
function njNames(xs){return (xs||[]).join('/')||'none'}
function njTeamKey(report){return (report?.team||[]).map(p=>p.species).join('|')}
const NJ_UI_STATE=globalThis.NJ_UI_STATE||{suggestPage:0,lastKey:'',openMenu:null};globalThis.NJ_UI_STATE=NJ_UI_STATE;
function detectIdentities(t=team,a=analysis,p=profileTeam(t,a)){
  const ids=[],tc=p.typeCounts||{};
  const add=(name,score,evidence,plan,cap=96)=>ids.push({name,score:njCap(score,cap),evidence:unique((evidence||[]).filter(Boolean)).slice(0,5),plan});
  const stallPenalty=p.fastBreakers.length*18+p.offensiveItems.length*8+p.choice.length*7+Math.max(0,p.pivot.length-2)*6+p.setup.length*5;
  let stall=20+p.defensiveAnchors.length*12+p.recovery.length*8+p.status.length*5+(p.removal.length||p.bounce.length?7:0)-stallPenalty;
  if(p.defensiveAnchors.length<3||p.recovery.length<4)stall=Math.min(stall,65);
  if(stallPenalty>22)stall=Math.min(stall,58);
  const balance=34+p.defensiveAnchors.length*9+p.pivot.length*8+p.wallbreakers.length*5+p.recovery.length*3-p.overloaded.length*8-Math.max(0,p.fastBreakers.length-3)*5;
  const bulky=28+p.wallbreakers.length*8+p.defensiveAnchors.length*7+p.pivot.length*5+p.fastBreakers.length*3-(p.recovery.length>=4?5:0);
  const ho=18+p.fastBreakers.length*13+p.setup.length*9+p.offensiveItems.length*4-p.defensiveAnchors.length*8-p.recovery.length*4-p.pivot.length*2;
  let hz=p.hazards.length*15+p.layers.length*13+p.removalDenial.length*14+p.pivot.length*4+p.forcedSwitch.length*3-(p.hazards.length&&!p.removalDenial.length?22:0)-(p.layers.length?0:10);
  if(p.hazards.length&&!p.removalDenial.length)hz=Math.min(hz,76);
  const dragon=(tc.Dragon||0)>=3?30+(tc.Dragon||0)*16+p.setup.length*4+p.choice.length*4+p.fastBreakers.length*3:0;
  const sunRoom=(p.drought.length&&p.trickRoom.length>=2)?70+p.trickRoom.length*9+p.slow.length*4+p.sunAbuse.length*6-p.fast.length*4:0;
  const trick=p.trickRoom.length?Math.max(0,(p.trickRoom.length>=2?40:18)+p.slow.length*6+p.wallbreakers.length*3-p.fast.length*5):0;
  const rain=p.drizzle.length?72+p.rainAbuse.length*8+(tc.Water||0)*4+p.fast.length*2:0;
  const sun=p.drought.length?38+p.sunAbuse.length*8+(tc.Fire||0)*4+p.fast.length*2:0;
  add('Hazard Stack Fat Balance',hz,[`${p.hazards.length} hazard setter(s)`,`${p.layers.length} layer setter(s)`,`${p.removalDenial.length} removal-denial tool(s)`,`${p.pivot.length} pivot(s)`,p.goodAsGold.length?'Gholdengo / Good as Gold pressure':null],'Set hazards, deny removal, force switches, and convert chip into safe breaker entries.',94);
  add('Balance',balance,[`${p.defensiveAnchors.length} defensive anchor(s)`,`${p.pivot.length} pivot(s)`,`${p.wallbreakers.length} breaker(s)`,p.overloaded.length?`${p.overloaded.length} overloaded role-compression slot(s)`:null],'Adapt game-to-game using defensive glue, pivots, progress tools, and controlled win conditions.',92);
  add('Bulky Offense',bulky,[`${p.wallbreakers.length} breaker(s)`,`${p.defensiveAnchors.length} defensive anchor(s)`,`${p.pivot.length} pivot(s)`],'Use durable offensive pressure without becoming purely passive or all-in.',90);
  add('Hyper Offense',ho,[`${p.fastBreakers.length} fast breaker(s)`,`${p.setup.length} setup threat(s)`,`${p.offensiveItems.length} high-pressure item(s)`,p.defensiveAnchors.length?`penalty: ${p.defensiveAnchors.length} defensive anchor(s)`:null],'Keep tempo and trade aggressively; capped when the team carries too many defensive stabilizers.',94);
  add('Stall',stall,[`${p.recovery.length} recovery source(s)`,`${p.defensiveAnchors.length} defensive anchor(s)`,`${p.status.length} attrition tool(s)`,stallPenalty?`stall penalty: ${stallPenalty}`:null],'Low-tempo denial and attrition; capped hard by fast breakers, pivots, and aggressive items.',86);
  add('Dragon Spam Offense',dragon,[`${tc.Dragon||0} Dragon-type member(s)`,p.setup.length?`${p.setup.length} setup win condition(s)`:null,p.choice.length?`${p.choice.length} Choice breaker(s)`:null],'Exploit stacked Dragon pressure; patch Fairy/Ice/Dragon counterplay.',96);
  add('Sun Room',sunRoom,[p.drought.length?'sun setter present':null,`${p.trickRoom.length} Trick Room setter(s)`,`${p.slow.length} slow member(s)`],'Create sun, flip speed with Trick Room, and spend short windows on high damage.',96);
  add('Trick Room Offense',trick,[`${p.trickRoom.length} Trick Room setter(s)`,`${p.slow.length} slow member(s)`],'Only appears when Trick Room is actually present; otherwise it is not an archetype.',88);
  add('Rain Offense',rain,[p.drizzle.length?'Drizzle/Rain Dance present':null,`${p.rainAbuse.length} rain-abuse signal(s)`],'Maintain rain and use Water pressure or speed doubling.',96);
  add('Sun Offense',sun,[p.drought.length?'Drought/Sunny Day present':null,`${p.sunAbuse.length} sun-abuse signal(s)`],'Win weather turns and overload shared checks.',92);
  const priority={'Sun Room':30,'Trick Room Offense':24,'Hazard Stack Fat Balance':22,'Dragon Spam Offense':20,'Rain Offense':18,'Sun Offense':16,'Balance':12,'Bulky Offense':10,'Hyper Offense':8,'Stall':4};
  ids.sort((x,y)=>(y.score-x.score)||((priority[y.name]||0)-(priority[x.name]||0)));
  return {primary:ids[0],secondary:ids.slice(1,5).filter(x=>x.score>=35),all:ids};
}
function evaluateSynergy(t=team,a=analysis,p=profileTeam(t,a)){
  const worst=(a?.rows||[]).slice(0,6), critical=worst.filter(r=>r.sev==='crit').length, severe=worst.filter(r=>r.sev==='bad').length, maxStack=Math.max(...Object.values(p.typeCounts),0),fc=fieldControlBreakdown(p);
  const compressionSensitive=['Great Tusk','Corviknight','Zapdos','Iron Treads'];
  const roleQualityOverloads=unique([...p.overloaded,...t.filter(mon=>compressionSensitive.includes(mon.species)&&((p.hazards.includes(mon.species)?1:0)+(p.removal.includes(mon.species)?1:0)+(p.pivot.includes(mon.species)?1:0)+(p.defensiveAnchors.includes(mon.species)?1:0)+(p.wallbreakers.includes(mon.species)?1:0))>=2).map(mon=>mon.species)]);
  const typeSynergy=njCap(80-critical*18-severe*8-Math.max(0,maxStack-2)*11+p.defensiveAnchors.length*2,95);
  const roleCompression=njCap(36+(p.hazards.length?8:0)+(p.removal.length?8:0)+(p.pivot.length?8:0)+(p.priority.length||p.scarf.length||p.trickRoom.length?10:0)+(p.defensiveAnchors.length?10:0)+(p.wallbreakers.length?9:0)-roleQualityOverloads.length*12,94);
  const offensiveCoverage=njCap(30+p.attackingTypes.length*5+(p.physicalAttackers.length&&p.specialAttackers.length?10:0)+p.wallbreakers.length*4+p.setup.length*3,95);
  const defensiveBackbone=njCap(22+p.defensiveAnchors.length*10+p.recovery.length*4+p.pivot.length*3-critical*8-p.fastBreakers.length*2,95);
  const fieldControl=njCap(fc.score,94);
  const speedControl=njCap(24+p.fast.length*6+p.priority.length*10+p.scarf.length*16+p.trickRoom.length*16+(p.status.length?4:0),95);
  let winReliability=njCap(20+p.wincons.length*5+p.wallbreakers.length*4+p.setup.length*4+p.defensiveAnchors.length*3-roleQualityOverloads.length*10-critical*6,92);
  if(p.wincons.length>=5&&p.defensiveAnchors.length<2)winReliability=Math.min(winReliability,58);
  if(p.wincons.length<2)winReliability=Math.min(winReliability,45);
  const issues=[];if(maxStack>=4){const stack=Object.entries(p.typeCounts).sort((a,b)=>b[1]-a[1])[0];issues.push({severity:'critical',title:`${stack[1]} ${stack[0]}-type stack`,detail:'Repeated typing creates predictable revenge-kill and coverage paths.'})}
  worst.forEach(r=>{if(r.sev==='crit'||r.sev==='bad')issues.push({severity:r.sev,title:`${r.tp} pressure`,detail:`${r.weak} weak, ${r.res} resist, ${r.imm} immune.`})});
  if(!p.removal.length&&!p.bounce.length)issues.push({severity:'bad',title:'No hazard control',detail:'No removal or Magic Bounce detected.'});
  if(p.hazards.length&&!p.removalDenial.length)issues.push({severity:'warn',title:'No removal denial',detail:'Hazards can be cleared unless pressure or positioning compensates.'});
  if(roleQualityOverloads.length)issues.push({severity:'warn',title:'Role overload',detail:`${roleQualityOverloads.join(', ')} compress too many jobs or are matchup-overworked.`});
  const rainRow=(a?.rows||[]).find(r=>r.tp==='Water');if(rainRow&&rainRow.weak>=2&&rainRow.res<=1)issues.push({severity:'bad',title:'Rain dependency',detail:'Water pressure forces careful preservation of the few checks.'});
  if(!p.priority.length&&!p.scarf.length&&!p.trickRoom.length&&p.fast.length<2)issues.push({severity:'bad',title:'Thin speed control',detail:'No priority, Scarf, Trick Room, or strong speed density.'});
  return {scores:{typeSynergy,roleCompression,offensiveCoverage,defensiveBackbone,fieldControl,speedControl,winReliability},fieldControl:fc,roleQualityOverloads,issues};
}
function evaluateMatchups(t=team,a=analysis,p=profileTeam(t,a),identity=detectIdentities(t,a,p)){
  const row=tp=>(a?.rows||[]).find(r=>r.tp===tp)||{weak:0,res:0,imm:0,score:0,sev:'good'};const waterChecks=row('Water').res+row('Water').imm,iceWeak=row('Ice').weak,fairyWeak=row('Fairy').weak,fc=fieldControlBreakdown(p);
  const hasFreezeDry=t.some(x=>x.moves.includes('Freeze-Dry')), hasElectric=t.some(x=>x.species==='Raging Bolt'||x.moves.includes('Thunderclap')||x.moves.includes('Thunderbolt')||x.moves.includes('Volt Switch'));
  const intoRain=njCap(40+waterChecks*8+(hasFreezeDry?12:0)+(hasElectric?9:0)+(p.attackingTypes.includes('Grass')?5:0)-row('Water').weak*9-iceWeak*4-(waterChecks===0?15:0),94);
  const intoSun=njCap(48+(row('Fire').res+row('Fire').imm)*8+(p.attackingTypes.includes('Water')?10:0)+(p.drizzle.length?12:0)-row('Fire').weak*7-row('Rock').weak*3,94);
  const intoHO=njCap(42+p.priority.length*10+p.fast.length*5+p.scarf.length*14+p.trickRoom.length*12+p.defensiveAnchors.length*5-p.recovery.length*2,94);
  const intoStall=njCap(34+p.wallbreakers.length*7+p.choice.length*6+p.status.length*4+p.hazards.length*4+p.setup.length*3+(p.attackingTypes.length>=7?6:0),90);
  const intoHazards=njCap(35+p.removal.length*15+p.bounce.length*18+p.boots.length*5+p.removalDenial.length*8-row('Rock').weak*2-(fc.setterOverload?8:0),92);
  const intoBalance=njCap(48+p.wallbreakers.length*5+p.pivot.length*5+p.hazards.length*3+p.defensiveAnchors.length*4-criticalPenalty(a),92);
  const intoTR=njCap(40+p.priority.length*9+p.status.length*5+p.trickRoom.length*10+p.fast.length*2-(p.slow.length>=4&&!p.trickRoom.length?15:0),88);
  const intoDragon=njCap(48+(p.typeCounts.Steel||0)*10+(p.typeCounts.Fairy||0)*10+p.priority.length*5-(p.typeCounts.Dragon||0)*5-fairyWeak*2,92);
  const rainChecks=unique([...t.filter(mon=>mult('Water',types(mon))<1).map(mon=>mon.species),...t.filter(mon=>['Water Absorb','Storm Drain','Dry Skin'].includes(mon.ability)).map(mon=>mon.species)]).slice(0,3);
  const mk=(name,score,reason,advice)=>({name,score:Math.round(score),class:scoreClass(score),reason,advice});
  return [mk('Rain',intoRain,intoRain<50?'Play depends on preserving dedicated Water answers; once they are chipped, rain progress becomes automatic.':intoRain>70?'Multiple Water checks or anti-rain anchors make the matchup favorable.':'Playable but dependency-heavy; protect the few rain checks.',`${rainChecks.length?`Preserve ${rainChecks.join(', ')}.`:'Preserve your Water resists.'} Do not give up Ground/Rock pivots for free.`),mk('Sun',intoSun,intoSun<50?'Fire pressure and coverage strain the defensive plan.':intoSun>70?'Fire resistance and counter-pressure are favorable.':'Volatile; positioning and weather turns decide it.','Track sun turns and keep Fire checks healthy.'),mk('Hyper Offense',intoHO,intoHO<50?'Fast pressure can overwhelm if you lose tempo.':'Speed, priority, Scarf, status, or anchors let you trade.','Preserve revenge tools and avoid trading away speed control.'),mk('Stall',intoStall,intoStall>84?'You have enough progress tools to pressure passive teams, but only if you keep them healthy.':intoStall<50?'Long games expose limited breaking or status vulnerability.':'Can pressure passive teams if breakers stay healthy.','Keep the best breaker healthy and deny free recovery loops.'),mk('Hazard Stack',intoHazards,intoHazards<50?'Field control is fragile; removal can be overloaded or denied.':intoHazards>75?'Removal, Boots, or denial give strong counterplay.':'Playable, but single removal lines can be overloaded.',`Protect hazard control and map Gholdengo/spinblocker sequences before clicking ${p.removal[0]||'removal'}.`),mk('Bulky Balance',intoBalance,intoBalance<50?'Stable cores can outlast your progress tools.':'You can pressure balanced cores with pivots and breakers.',`Use pivots to create one safe entry for ${p.wallbreakers[0]||'your main breaker'}.`),mk('Trick Room',intoTR,intoTR<50?'Room can flip the speed relationship if setters get in safely.':'Status, priority, speed, or anchors help stall Room turns.','Pressure setters early and burn turns with protective pivots when needed.'),mk('Dragon Mirror',intoDragon,intoDragon<50?'Dragon pressure is risky without Steel/Fairy glue.':'Dedicated Dragon counterplay exists.','Keep Steel/Fairy checks healthy for the Dragon exchange.')];
}

// === V3.5 actionable assistant cards ===
const NJ_ASSIST_STATE=globalThis.NJ_ASSIST_STATE||{page:0,key:'',menu:null};globalThis.NJ_ASSIST_STATE=NJ_ASSIST_STATE;
function monBlock(mon){const evs=Object.entries(mon.evs||{}).filter(([,v])=>+v).map(([k,v])=>`${v} ${k.toUpperCase()}`);const ivs=Object.entries(mon.ivs||{}).filter(([,v])=>+v!==31).map(([k,v])=>`${v} ${k.toUpperCase()}`);return `${mon.species} @ ${mon.item||'No Item'}\nAbility: ${mon.ability||'Unknown'}\n${mon.tera?`Tera Type: ${mon.tera}\n`:''}${evs.length?`EVs: ${evs.join(' / ')}\n`:''}${mon.nature||'Hardy'} Nature\n${ivs.length?`IVs: ${ivs.join(' / ')}\n`:''}${(mon.moves||[]).map(m=>`- ${m}`).join('\n')}`.trim()}
function teamToText(list){return list.map(monBlock).join('\n\n')}
function needsForReport(report){const out=[];const syn=report.synergy?.scores||{};const weak=report.diagnosis?.topWeaknesses||[];weak.slice(0,4).forEach(w=>{if(w.sev==='crit'||w.sev==='bad')out.push({label:`${w.tp} counterplay`,why:`${w.weak} weak / ${w.res} resist / ${w.imm} immune`})});if(syn.fieldControl<65)out.push({label:'field control',why:'hazards, removal, denial, or chip loops are unstable'});if(syn.winReliability<60)out.push({label:'closing path',why:'endgame line is fragile or overdependent'});if(syn.defensiveBackbone<70)out.push({label:'defensive glue',why:'switching structure is matchup-dependent'});if(report.matchups?.find(m=>m.name==='Rain'&&m.score<55))out.push({label:'rain insurance',why:'water pressure can snowball quickly'});return out.slice(0,6)}
function swapOptionsFor(s,report){const weak=report.diagnosis?.topWeaknesses||[];return report.team.map((mon,i)=>{let score=0,reasons=[];weak.slice(0,4).forEach(w=>{const m=mult(w.tp,types(mon));if(m>1){score+=8;reasons.push(`eases ${w.tp} pressure`)}});if(report.profile?.overloaded?.includes(mon.species)){score+=9;reasons.push('removes an overloaded slot')}if(report.profile?.typeCounts){types(mon).forEach(tp=>{if((report.profile.typeCounts[tp]||0)>=3){score+=5;reasons.push(`cuts ${tp} stacking`)}})}if(report.profile?.defensiveAnchors?.includes(mon.species)&&/check|glue|backbone|Regenerator|wall|sponge/i.test((s.roles||[]).join(' '))){score+=3;reasons.push('keeps a defensive slot')}return{teamIndex:i,species:mon.species,score,reasons:unique(reasons).slice(0,3)}}).sort((a,b)=>b.score-a.score)}
function enrichSuggestionSwaps(report){(report.suggestionPool||report.suggestions||[]).forEach(s=>{if(!s.swapOptions)s.swapOptions=swapOptionsFor(s,report)});return report}
const OLD_BUILD_REASONING=buildReasoningReport;
function renderAssistant(report=lastReasoning){if(!report){report=buildReasoningReport();lastReasoning=report}if(!report){$('assistantResults').className='empty';$('assistantResults').textContent='Analyze a team first.';return}report=enrichSuggestionSwaps(report);const key=(report.team||[]).map(p=>p.species).join('|');if(key!==NJ_ASSIST_STATE.key){NJ_ASSIST_STATE.key=key;NJ_ASSIST_STATE.page=0;NJ_ASSIST_STATE.menu=null}const pool=(report.suggestionPool&&report.suggestionPool.length?report.suggestionPool:report.suggestions)||[];const pages=Math.max(1,Math.ceil(pool.length/6));NJ_ASSIST_STATE.page=Math.min(NJ_ASSIST_STATE.page,pages-1);const start=NJ_ASSIST_STATE.page*6;const shown=pool.slice(start,start+6);const cards=shown.map((s,i)=>{const ix=start+i,b=s.swapOptions?.[0];const menu=(report.team||[]).map((m,j)=>`<button class="suggest-menu-item" data-action="swap-suggested" data-suggestion-index="${ix}" data-swap-index="${j}">Switch with ${html(m.species)}</button>`).join('');return `<div class="suggest-card ${scoreClass(s.score)} ${NJ_ASSIST_STATE.menu===ix?'menu-open':''}"><div class="suggest-card-head"><div><h3>${ix+1}. ${html(s.species)}</h3><div class="odds">${s.score}%</div></div><button class="suggest-more-btn" data-action="toggle-suggest-menu" data-suggestion-index="${ix}" title="More actions">...</button></div><p>${html((s.why||[]).join(' • ')||'Improves matchup structure.')}</p><div class="badges">${(s.roles||[]).map(r=>reasonBadge(r)).join('')}${b&&b.score>0?reasonBadge(`swap ${b.species}`,'warn'):''}</div><p class="muted">${b&&b.score>0?html(`Recommended swap: ${b.species}${b.reasons.length?' - '+b.reasons[0]:''}`):'Alternate structural patch.'}</p><details><summary>Show suggested set</summary><code class="code">${html(s.set||'Set unavailable')}</code></details><div class="suggest-actions"><button class="ghost small" data-action="copy-suggested-set" data-suggestion-index="${ix}">Copy set</button><button class="primary small" data-action="quick-swap-best" data-suggestion-index="${ix}">${b&&b.score>0?`Swap for ${html(b.species)}`:'Copy set'}</button></div><div class="suggest-menu"><div class="suggest-menu-title">Quick actions</div><button class="suggest-menu-item" data-action="copy-suggested-set" data-suggestion-index="${ix}">Copy suggested set</button><div class="suggest-menu-title">Switch with...</div>${menu}</div></div>`}).join('');const needs=needsForReport(report).map(n=>`<span class="badge warn">${html(n.label)}: ${html(n.why)}</span>`).join('');$('assistantResults').className='diag';$('assistantResults').innerHTML=`<div class="box"><div class="assistant-head"><div><h3>Suggested Additions</h3><p>Ranked by structural gaps, archetype preservation, swap clarity, and matchup improvement. Source: ${html(report.suggestionSource||'local structural ranking')}.</p></div><button class="ghost small" data-action="next-suggestions">${pages>1?`Show another batch (${NJ_ASSIST_STATE.page+1}/${pages})`:'Refresh fit notes'}</button></div><div class="badges">${needs}</div><div class="suggest-grid">${cards}</div></div>`}
function applySuggestedPokemonSwap(suggestionIndex,teamIndex){const report=lastReasoning||buildReasoningReport();const s=(report.suggestionPool||report.suggestions||[])[+suggestionIndex];if(!s)return;const list=parseTeam($('teamInput').value||'');const rep=parseTeam(s.set||'')[0];if(!list.length||!rep)return;const old=list[teamIndex]?.species;list[teamIndex]=rep;$('teamInput').value=teamToText(list);NJ_ASSIST_STATE.page=0;NJ_ASSIST_STATE.menu=null;runAnalyze();scoreArchetypes();renderAssistant(lastReasoning);alert?.(`${s.species} swapped in for ${old||'that slot'}.`)}
function copySuggestedSetAt(i){const r=lastReasoning||buildReasoningReport();const s=(r.suggestionPool||r.suggestions||[])[+i];if(s)navigator.clipboard?.writeText?.(s.set||'')}
function suggestionActionHandler(ev){const btn=ev.target?.closest?.('[data-action]');if(!btn)return;const a=btn.dataset.action;if(a==='next-suggestions'){ev.preventDefault();const r=lastReasoning||buildReasoningReport();if(!r)return;const pages=Math.max(1,Math.ceil(((r.suggestionPool||r.suggestions||[]).length||1)/6));NJ_ASSIST_STATE.page=(NJ_ASSIST_STATE.page+1)%pages;NJ_ASSIST_STATE.menu=null;renderAssistant(r)}else if(a==='toggle-suggest-menu'){ev.preventDefault();const i=+btn.dataset.suggestionIndex;NJ_ASSIST_STATE.menu=NJ_ASSIST_STATE.menu===i?null:i;renderAssistant(lastReasoning)}else if(a==='swap-suggested'){ev.preventDefault();applySuggestedPokemonSwap(+btn.dataset.suggestionIndex,+btn.dataset.swapIndex)}else if(a==='quick-swap-best'){ev.preventDefault();const r=lastReasoning||buildReasoningReport();const s=(r.suggestionPool||r.suggestions||[])[+btn.dataset.suggestionIndex];const b=s?.swapOptions?.[0];if(b&&typeof b.teamIndex==='number')applySuggestedPokemonSwap(+btn.dataset.suggestionIndex,b.teamIndex);else copySuggestedSetAt(+btn.dataset.suggestionIndex)}else if(a==='copy-suggested-set'){ev.preventDefault();copySuggestedSetAt(+btn.dataset.suggestionIndex)}}
document.addEventListener('click',suggestionActionHandler);

// Final V3.5 non-recursive report builder override.
function buildReasoningReport(){
  if(!team.length||!analysis)return null;
  const p=profileTeam(team,analysis), identity=detectIdentities(team,analysis,p), synergy=evaluateSynergy(team,analysis,p), matchups=evaluateMatchups(team,analysis,p,identity), validation=validateTeamAdvanced(team);
  const base={generatedAt:new Date().toISOString(),team:team.map(p=>({species:p.species,item:p.item,ability:p.ability,tera:p.tera,nature:p.nature,evs:p.evs,ivs:p.ivs,moves:p.moves,types:types(p)})),identity,synergy,matchups,validation,diagnosis:{status:analysis.status,topWeaknesses:analysis.rows.slice(0,6),missingRoles:analysis.missing,redundancy:analysis.red},profile:p};
  const suggestions=suggestAdditions(team,analysis,p,identity,synergy,matchups).map(s=>({...s,swapOptions:swapOptionsFor(s,base)}));
  base.suggestionPool=suggestions.slice(0,18);base.suggestions=base.suggestionPool.slice(0,6);base.needs=needsForReport(base);return base;
}

// === V3.5 calibration cleanup: score semantics and full report export ===
function scoreDisplayName(key){return ({typeSynergy:'Type Synergy',roleCompression:'Role Quality / Compression',offensiveCoverage:'Offensive Coverage',defensiveBackbone:'Defensive Backbone',fieldControl:'Field Control',speedControl:'Speed Control',winReliability:'Win Condition Reliability'}[key]||labelize(key))}
function scoreGroupSummary(r){
  const s=r?.synergy?.scores||{}, m=r?.matchups||[];
  const avg=arr=>Math.round(arr.reduce((a,b)=>a+(+b||0),0)/(arr.length||1));
  const matchupAvg=avg(m.map(x=>x.score));
  const structuralQuality=avg([s.typeSynergy,s.roleCompression,s.offensiveCoverage,s.defensiveBackbone,s.fieldControl,s.speedControl,s.winReliability]);
  const battleReliability=avg([s.winReliability,s.defensiveBackbone,s.fieldControl,s.speedControl,matchupAvg]);
  return {identityConfidence:r?.identity?.primary?.score||0,structuralQuality,battleReliability,matchupAverage:matchupAvg};
}
function verdict(r){
  const p=r.identity.primary.name, g=scoreGroupSummary(r), issues=(r.synergy?.issues||[]).slice(0,2).map(x=>x.title).join(' + ');
  const caution=`Identity confidence is ${g.identityConfidence}/100, structural quality is ${g.structuralQuality}/100, and battle reliability is ${g.battleReliability}/100.`;
  if(p.includes('Hazard'))return `This is hazard-centric only if it can deny removal and abuse switches. ${caution} Next medicine: ${issues||'tighten removal denial and chip loops'}.`;
  if(p.includes('Balance'))return `This is trying to be balance, not automatically a perfect team. ${caution} Next medicine: ${issues||'reduce overload and protect the win path'}.`;
  if(p.includes('Dragon'))return `This is Dragon pressure with a siren on it. ${caution} Patch Fairy/Ice/Dragon counterplay before trusting it.`;
  if(p.includes('Sun Room'))return `This is Sun Room: create sun, flip speed with Trick Room, and cash out quickly. ${caution}`;
  if(p.includes('Trick Room'))return `This is speed inversion. ${caution} Protect setters and avoid wasting Room turns.`;
  if(p.includes('Stall'))return `This is low-tempo attrition only if offensive pressure stays minimal. ${caution}`;
  return `The team has a readable plan. ${caution} Patch the weakest matchup before calling it healthy.`;
}
function buildMarkdownReport(r=lastReasoning){
  if(!r)return '# Nurse Joyless Report\n\nNo analysis available.';
  const meanings=METAGAME_NOTES.scoreMeanings||{}, g=scoreGroupSummary(r), fc=r.synergy.fieldControl||{};
  const teamBlock=r.team.map(p=>`${p.species} @ ${p.item||'No Item'}\nAbility: ${p.ability||'Unknown'}\nTera Type: ${p.tera||'Unknown'}\nEVs: ${Object.entries(p.evs||{}).filter(([,v])=>v).map(([k,v])=>`${v} ${k.toUpperCase()}`).join(' / ')||'None'}\n${p.nature||'Hardy'} Nature\n${p.moves.map(m=>`- ${m}`).join('\n')}`).join('\n\n');
  const idRows=[r.identity.primary,...r.identity.secondary].map(x=>`| ${x.name} | ${x.score}/100 | Structural identity confidence, not win rate | ${x.plan} | ${x.evidence.join('; ')||'—'} |`).join('\n');
  const scoreRows=Object.entries(r.synergy.scores).map(([k,v])=>`| ${scoreDisplayName(k)} | ${v}/100 | ${meanings[k]||'Structural score.'} | ${v>=70?'Strong':v>=45?'Mixed / matchup-dependent':'Weak or unstable'} |`).join('\n');
  const typeRows=(r.diagnosis.topWeaknesses||[]).map(w=>`| ${w.tp} | ${w.weak} | ${w.res} | ${w.imm} | ${w.sev.toUpperCase()} |`).join('\n');
  const issues=(r.synergy.issues||[]).map(i=>`- **${i.title}** (${i.severity}): ${i.detail}`).join('\n')||'- No major structural issues detected.';
  const monNotes=r.team.map(p=>`### ${p.species}\n- Item: ${p.item||'None'}\n- Typing: ${(p.types||[]).join('/')}\n- Main role read: ${r.profile.defensiveAnchors.includes(p.species)?'defensive anchor':r.profile.wallbreakers.includes(p.species)?'breaker / win pressure':r.profile.pivot.includes(p.species)?'pivot / tempo tool':'role compression'}\n- Overload note: ${(r.synergy.roleQualityOverloads||r.profile.overloaded||[]).includes(p.species)?'Overloaded or matchup-overworked; avoid asking it to solve too many jobs.':'No major overload flag.'}`).join('\n\n');
  const suggestions=(r.suggestions||[]).map(s=>`### ${s.species} — ${s.score}/100 fit\nSource: ${s.source||r.suggestionSource||'local metagame fallback'}\n${(s.why||[]).map(w=>`- ${w}`).join('\n')||'- Improves structure.'}\n${s.swapOptions?.[0]?`- Suggested replacement target: ${s.swapOptions[0].species}`:''}\n\n\`\`\`showdown\n${s.set||'Set unavailable'}\n\`\`\``).join('\n\n');
  return `# Nurse Joyless V3.5 Team Report\n\nGenerated: ${r.generatedAt}\nFormat: SV OU-style modern singles MVP\nData Mode: ${r.suggestionSource||'local metagame brain'}\n\n> **Score note:** Identity Confidence means “how strongly the team resembles an archetype.” Structural Quality and Battle Reliability are separate. None of these numbers are ladder win-rate predictions.\n\n## 1. Team Import\n\n\`\`\`showdown\n${teamBlock}\n\`\`\`\n\n## 2. Executive Verdict\n\n**Primary Identity:** ${r.identity.primary.name}\n**Identity Confidence:** ${g.identityConfidence}/100\n**Structural Quality:** ${g.structuralQuality}/100\n**Battle Reliability:** ${g.battleReliability}/100\n**Execution Risk:** ${r.synergy.issues.length>=4?'High':r.synergy.issues.length>=2?'Medium':'Low'}\n\n${verdict(r)}\n\n## 3. Identity Analysis\n\n| Candidate | Score | What the score means | Plan | Evidence |\n|---|---:|---|---|---|\n${idRows}\n\n## 4. Scoreboard\n\n| Score | Value | What it measures | Read |\n|---|---:|---|---|\n${scoreRows}\n\n## 5. Field Control Breakdown\n\n| Subscore | Value | Evidence |\n|---|---:|---|\n| Hazard Setting | ${fc.hazardSetting ?? '—'}/100 | Hazard setters and layer access. |\n| Hazard Removal | ${fc.hazardRemoval ?? '—'}/100 | Defog, Rapid Spin, Court Change, Magic Bounce, and Boots support. |\n| Removal Denial | ${fc.removalDenial ?? '—'}/100 | Gholdengo / Good as Gold, Ghost spinblockers, Magic Bounce, Taunt pressure. |\n| Chip Abuse | ${fc.chipAbuse ?? '—'}/100 | Knock Off, Salt Cure, phazing, status, hazards, forced switches. |\n| Pivot Abuse | ${fc.pivotAbuse ?? '—'}/100 | U-turn, Volt Switch, Flip Turn, Parting Shot, Chilly Reception. |\n| Setter Overload Risk | ${fc.setterOverload ? 'High' : 'Low'} | ${fc.setterOverload||0} hazard slot(s) are also overloaded into other jobs. |\n\n## 6. Structural Findings\n\n${issues}\n\n## 7. Type Triage\n\n| Type | Weak | Resist | Immune | Severity |\n|---|---:|---:|---:|---|\n${typeRows}\n\n## 8. Matchup Matrix\n\n| Matchup | Score | Read | Dependency / Advice |\n|---|---:|---|---|\n${r.matchups.map(m=>`| ${m.name} | ${m.score}/100 | ${m.reason} | ${m.advice} |`).join('\n')}\n\n## 9. Pokémon-by-Pokémon Notes\n\n${monNotes}\n\n## 10. Suggested Additions\n\n${suggestions}\n\n## 11. Validation\n\n| Pokémon | Status | Hard Issues | Warnings | Confidence |\n|---|---|---|---|---|\n${r.validation.map(v=>`| ${v.species} | ${v.status.toUpperCase()} | ${v.issues.join('; ')||'None'} | ${v.warnings.join('; ')||'None'} | ${v.warnings.length?'Medium/Low':'High'} |`).join('\n')}\n`;
}

// === V3.5 cleanup restore: shared calculator population helpers ===
function fill(id,arr,lab){let e=$(id);if(!e)return;e.innerHTML=arr.map((x,i)=>`<option value="${i}">${html(lab(x))}</option>`).join('');e._items=arr}
function preset(sp,item,nature,evs,moves){return{species:sp,item,nature,evs,ivs:parseEV('',31),moves,level:100,ability:'',tera:''}}
function updateMoves(){let a=$('attacker')?._items?.[$('attacker')?.value]||team[0];let ms=(a?.moves||[]).filter(x=>moveData(x)&&moveCategory(x)!=='Status');if($('move'))$('move').innerHTML=(ms.length?ms:['Close Combat','Shadow Ball','Earthquake']).map(x=>`<option>${html(x)}</option>`).join('')}
function populate(){let presets=[preset('Kingambit','Black Glasses','Adamant',{hp:252,atk:252,def:0,spa:0,spd:4,spe:0},['Kowtow Cleave','Sucker Punch','Iron Head','Swords Dance']),preset('Great Tusk','Heavy-Duty Boots','Impish',{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},['Close Combat','Headlong Rush','Rapid Spin','Knock Off']),preset('Dragapult','Choice Specs','Timid',{hp:0,atk:0,def:4,spa:252,spd:0,spe:252},['Shadow Ball','Draco Meteor','Flamethrower','U-turn']),preset('Corviknight','Leftovers','Impish',{hp:248,atk:0,def:252,spa:0,spd:8,spe:0},['Roost','Defog','U-turn','Body Press'])],all=[...team,...presets];fill('attacker',all,p=>`${p.species} (${p.item})`);fill('defender',all,p=>`${p.species} (${p.item})`);fill('oppSpecies',speciesNames().sort().map(x=>({species:x})),p=>p.species);fill('obsMove',moveNames().sort().map(x=>({species:x})),p=>p.species);let tsel=$('defTeraType');if(tsel)tsel.innerHTML=TYPES.map(t=>`<option>${t}</option>`).join('');let ats=$('attTeraType');if(ats)ats.innerHTML=TYPES.map(t=>`<option>${t}</option>`).join('');updateMoves()}
function copyMarkdown(){return exportMarkdown()}

// V3.5 fallback set alias retained after cleanup.
const SMOGON_FALLBACK_SETS=Object.assign({},SUGGEST_SETS,globalThis.__ADVSETS||{}, {
  Toxapex:`Toxapex @ Heavy-Duty Boots\nAbility: Regenerator\nTera Type: Steel\nEVs: 252 HP / 252 Def / 4 SpD\nBold Nature\n- Recover\n- Toxic\n- Haze\n- Surf`,
  Alomomola:`Alomomola @ Heavy-Duty Boots\nAbility: Regenerator\nTera Type: Ghost\nEVs: 4 HP / 252 Def / 252 SpD\nRelaxed Nature\n- Wish\n- Protect\n- Flip Turn\n- Scald`,
  'Slowking-Galar':`Slowking-Galar @ Heavy-Duty Boots\nAbility: Regenerator\nTera Type: Water\nEVs: 252 HP / 16 Def / 240 SpD\nSassy Nature\nIVs: 0 Atk / 0 Spe\n- Future Sight\n- Sludge Bomb\n- Chilly Reception\n- Slack Off`,
  'Samurott-Hisui':`Samurott-Hisui @ Focus Sash\nAbility: Sharpness\nTera Type: Dark\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Ceaseless Edge\n- Razor Shell\n- Knock Off\n- Sucker Punch`,
  'Landorus-Therian':`Landorus-Therian @ Choice Scarf\nAbility: Intimidate\nTera Type: Flying\nEVs: 252 Atk / 4 Def / 252 Spe\nJolly Nature\n- Earthquake\n- U-turn\n- Stone Edge\n- Knock Off`,
  Zapdos:`Zapdos @ Heavy-Duty Boots\nAbility: Static\nTera Type: Steel\nEVs: 248 HP / 220 Def / 40 Spe\nBold Nature\n- Volt Switch\n- Hurricane\n- Roost\n- Thunder Wave`,
  Clefable:`Clefable @ Leftovers\nAbility: Magic Guard\nTera Type: Water\nEVs: 252 HP / 200 Def / 56 SpD\nBold Nature\n- Moonblast\n- Knock Off\n- Thunder Wave\n- Soft-Boiled`,
  'Ting-Lu':`Ting-Lu @ Leftovers\nAbility: Vessel of Ruin\nTera Type: Water\nEVs: 252 HP / 4 Atk / 252 SpD\nCareful Nature\n- Stealth Rock\n- Ruination\n- Whirlwind\n- Earthquake`
});

// V3.5 cleanup restore: optional Smogon provider shell.
const SmogonProvider={
  base:'https://data.pkmn.cc',cache:{},
  async json(path){const key='nj_smogon_'+path;try{const cached=localStorage.getItem(key);if(cached)return JSON.parse(cached)}catch(e){}const res=await fetch(`${this.base}${path}`,{cache:'force-cache'});if(!res.ok)throw new Error(`Smogon data ${res.status}`);const data=await res.json();try{localStorage.setItem(key,JSON.stringify(data))}catch(e){}return data},
  async load(format='gen9ou'){const [sets,analyses,stats]=await Promise.allSettled([this.json(`/sets/${format}.json`),this.json(`/analyses/${format}.json`),this.json(`/stats/${format}.json`)]);return{sets:sets.status==='fulfilled'?sets.value:null,analyses:analyses.status==='fulfilled'?analyses.value:null,stats:stats.status==='fulfilled'?stats.value:null}},
  pickSet(name,sets){const block=sets?.[name]||sets?.[DexAdapter.resolveSpeciesName(name)]||sets?.[String(name).replace('-',' ')];if(!block)return null;const first=block[Object.keys(block)[0]];return first||null},
  usageScore(name,stats){try{const id=DexAdapter.id(name);const entries=stats?.pokemon||stats?.data||stats?.stats||stats;const hit=Object.entries(entries||{}).find(([k])=>DexAdapter.id(k)===id);const val=hit&&typeof hit[1]==='object'?(hit[1].usage||hit[1].weight||hit[1].raw||0):0;return Math.min(20,Math.sqrt(+val||0))}catch(e){return 0}},
  async suggest(report){const data=await this.load('gen9ou');return smogonCandidatePool(report).map(c=>scoreSmogonCandidate(c,report,data)).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,6)}
};
function advice(r,rev){let risk=rev[0]?.ko||0;if(r.ko>=.999)return`Click ${r.mv}. That is not a roll, that is paperwork.`;if(r.ko>=.5&&risk<.5)return`Click ${r.mv}. You are favored to remove ${r.def.species}, and the counter-KO risk is acceptable.`;if(r.ko>0&&risk>=.5)return`Casino turn. If the roll misses, ${r.att.species} may become a memorial candle.`;if(nHitChance(r,2)>=.9&&risk<.25)return`Clean two-hit path. Take the trade if you can stomach the chip.`;return`Do not pretend this is lethal. Get chip, pivot, set hazards, or make a grown-up switch.`}

// V3.5 cleanup restore: hidden-info detective and prescription helpers.
function detectiveAbilities(sp){let vals=unique(Object.values(DexAdapter.getSpecies(sp)?.abilities||{}).filter(Boolean));return vals.length?vals:['Unknown']}
function candidates(sp,observedAbility='',options={}){let prof=[['physical offense','Adamant',{hp:0,atk:252,def:0,spa:0,spd:4,spe:252},['Choice Band','Life Orb','Heavy-Duty Boots','Black Glasses']],['speed physical','Jolly',{hp:0,atk:252,def:0,spa:0,spd:4,spe:252},['Choice Scarf','Life Orb','Heavy-Duty Boots']],['special offense','Modest',{hp:0,atk:0,def:4,spa:252,spd:0,spe:252},['Choice Specs','Life Orb','Heavy-Duty Boots','Expert Belt']],['speed special','Timid',{hp:0,atk:0,def:4,spa:252,spd:0,spe:252},['Choice Scarf','Choice Specs','Heavy-Duty Boots']],['physical wall','Impish',{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},['Leftovers','Rocky Helmet','Heavy-Duty Boots']],['special wall','Calm',{hp:252,atk:0,def:4,spa:0,spd:252,spe:0},['Leftovers','Assault Vest','Heavy-Duty Boots']]],out=[],abilities=detectiveAbilities(sp);if(observedAbility&&!abilities.includes(observedAbility))abilities=abilities[0]==='Unknown'?[observedAbility]:unique([...abilities,observedAbility]);prof.forEach(p=>{const items=options.allowItemless?unique([...p[3],'No Item']):p[3];items.forEach(item=>abilities.forEach(ability=>out.push({species:sp,profile:p[0],nature:p[1],evs:p[2],item,ability,prob:1,reasons:[]})))});normC(out);return out}
function normC(c){let s=c.reduce((a,b)=>a+Math.max(0,b.prob),0)||1;c.forEach(x=>x.prob=Math.max(0,x.prob)/s)}
function defaultMoves(sp,c){let pool={Dragapult:c.profile.includes('special')?['Shadow Ball','Draco Meteor','Flamethrower','U-turn']:['Dragon Darts','U-turn','Sucker Punch','Tera Blast'],Kingambit:['Kowtow Cleave','Sucker Punch','Iron Head','Swords Dance'],'Great Tusk':['Close Combat','Headlong Rush','Rapid Spin','Knock Off'],'Iron Valiant':['Moonblast','Close Combat','Thunderbolt','Calm Mind'],Gholdengo:['Make It Rain','Shadow Ball','Focus Blast','Recover'],Corviknight:['Roost','Defog','U-turn','Body Press'],Dragonite:['Dragon Dance','Extreme Speed','Earthquake','Fire Punch']};return pool[sp]||['Earthquake','Ice Beam','Moonblast','Thunderbolt']}
function candSet(c){return {...preset(c.species,c.item,c.nature,c.evs,defaultMoves(c.species,c)),ability:c.ability||''}}
function bars(rows){return rows.map(([n,p])=>`<p class="meta">${html(n)} · ${(p*100).toFixed(1)}%</p><div class="bar"><div style="width:${Math.max(2,p*100)}%"></div></div>`).join('')}
function detectiveEvidenceNotes(input){
  const notes=[], hardBlocks=[];
  if(input.usedStatusMove){notes.push('Used a status move, so Assault Vest lines are dead.'); hardBlocks.push('Assault Vest impossible')}
  if(input.tookHazardDamage){notes.push('Took hazard chip, so Heavy-Duty Boots is ruled out.'); hardBlocks.push('Heavy-Duty Boots impossible')}
  if(input.choiceContradiction){notes.push('Changed damaging moves without switching, so Choice item lines are dead.'); hardBlocks.push('Choice items impossible')}
  if(input.revealedItem){notes.push(`${input.revealedItem} is already revealed, so non-${input.revealedItem} lines are dead.`); hardBlocks.push(`${input.revealedItem} confirmed`)}
  if(input.revealedAbility){notes.push(`${input.revealedAbility} is already revealed, so non-${input.revealedAbility} lines are dead.`); hardBlocks.push(`${input.revealedAbility} confirmed`)}
  else if((input.abilityHints||[]).length>1)notes.push(`Replay points toward ${input.abilityHints.join(' or ')}, but the exact ability is still not fully locked.`);
  const abilityReward=({
    'Water Absorb':'That also means Water attacks heal instead of damaging.',
    'Volt Absorb':'That also means Electric attacks heal instead of damaging.',
    'Dry Skin':'That also means Water attacks heal instead of damaging.',
    'Storm Drain':'That also means Water attacks are dead lines and the reveal implies a Special Attack boost.',
    'Lightning Rod':'That also means Electric attacks are dead lines and the reveal implies a Special Attack boost.',
    'Motor Drive':'That also means Electric attacks are dead lines and the reveal implies a Speed boost.',
    'Sap Sipper':'That also means Grass attacks are dead lines and the reveal implies an Attack boost.',
    'Earth Eater':'That also means Ground attacks heal instead of damaging.',
    'Well-Baked Body':'That also means Fire attacks are dead lines and the reveal implies a Defense boost.',
    'Flash Fire':'That also means Fire attacks are dead lines and the reveal implies boosted Fire damage later.',
    'Good as Gold':'That also means opposing status moves stay dead lines unless the log says otherwise.'
  })[input.revealedAbility];
  if(abilityReward)notes.push(abilityReward);
  if(input.itemGone&&input.removedItem){
    hardBlocks.push(`${input.removedItem} no longer current item`);
    notes.push(input.itemLossNote||`${input.removedItem} was removed, so the old item is dead and the slot may now be empty.`);
  }
  if(input.postItemLossHazardNote)notes.push(input.postItemLossHazardNote);
  if(input.repeatedDamagingMove)notes.push('Repeated damage leans toward Choice locking, but does not prove it.');
  if(input.speedContext?.relation==='fasterThan'&&input.speedContext?.opponentSpecies)notes.push(`Moved before ${input.speedContext.opponentSpecies} in a neutral-priority exchange, so clearly slower lines are weak fits.`);
  else if(input.speedContext?.relation==='slowerThan'&&input.speedContext?.opponentSpecies)notes.push(`Moved after ${input.speedContext.opponentSpecies} in a neutral-priority exchange, so clearly faster lines are weak fits.`);
  else if(input.movedFirst)notes.push('Moving first boosts fast natures and Scarf lines, but only as a soft speed clue.');
  return {notes,hardBlocks};
}
function detectiveSpeedFit(candidate,input){
  const relation=input.speedContext?.relation||'';
  const opponentSpecies=input.speedContext?.opponentSpecies||input.user?.species||'the opposing Pokemon';
  if(!relation||!input.user)return null;
  const candidateSpeed=stats(candSet(candidate)).spe;
  const opponentSpeed=stats(input.user).spe;
  if(!candidateSpeed||!opponentSpeed)return null;
  if(relation==='fasterThan'){
    if(candidateSpeed<opponentSpeed)return {mult:.01,tag:`speed clue clashes with moving before ${opponentSpecies} (${candidateSpeed} < ${opponentSpeed})`,quality:'miss'};
    if(candidateSpeed===opponentSpeed)return {mult:1.05,tag:`speed tie remains possible with ${opponentSpecies} (${candidateSpeed})`,quality:'near'};
    return {mult:1.28,tag:`speed clue fits moving before ${opponentSpecies} (${candidateSpeed} > ${opponentSpeed})`,quality:'fit'};
  }
  if(relation==='slowerThan'){
    if(candidateSpeed>opponentSpeed)return {mult:.01,tag:`speed clue clashes with moving after ${opponentSpecies} (${candidateSpeed} > ${opponentSpeed})`,quality:'miss'};
    if(candidateSpeed===opponentSpeed)return {mult:1.05,tag:`speed tie remains possible with ${opponentSpecies} (${candidateSpeed})`,quality:'near'};
    return {mult:1.28,tag:`speed clue fits moving after ${opponentSpecies} (${candidateSpeed} < ${opponentSpeed})`,quality:'fit'};
  }
  return null;
}
function scoreDetectiveDamageFit(obs,roll){
  const center=(roll.minp+roll.maxp)/2, slack=3, dist=Math.abs(obs-center), width=Math.max(4,((roll.maxp-roll.minp)/2)+slack);
  if(obs>=roll.minp-slack&&obs<=roll.maxp+slack)return {mult:Math.max(.55,2.2-dist/Math.max(6,width)), tag:`fits ${roll.mv} (${roll.minp.toFixed(1)}-${roll.maxp.toFixed(1)}%)`, quality:'fit'};
  if(dist<=width+6)return {mult:.35, tag:`close but awkward ${roll.mv} fit (${roll.minp.toFixed(1)}-${roll.maxp.toFixed(1)}%)`, quality:'near'};
  return {mult:.04, tag:`bad ${roll.mv} fit (${roll.minp.toFixed(1)}-${roll.maxp.toFixed(1)}%)`, quality:'miss'};
}
function detectiveConfidence(top){
  const lead=top[0]?.prob||0, gap=lead-(top[1]?.prob||0);
  if(lead>=.58&&gap>=.2)return {label:'High',reason:'one line clearly survives the evidence better than the rest'};
  if(lead>=.36&&gap>=.1)return {label:'Medium',reason:'the best line is ahead, but there is still plausible competition'};
  return {label:'Low',reason:'multiple lines still fit, so this read should guide play rather than lock it in'};
}
function detectiveSummary(top,input,notes){
  const conf=detectiveConfidence(top);
  const lead=top[0], itemLead=lead?`${lead.item} ${lead.nature} ${lead.profile}`:'no clean line';
  const isClueOnly=input.evidence==='clue_only'||input.observedDamage==null||!input.move;
  const verdict=isClueOnly
    ? (conf.label==='High'
      ? `Best current read: ${itemLead}. The replay clues point strongly in one direction even without a damage roll.`
      : conf.label==='Medium'
        ? `Best current read: ${itemLead}. The replay clues narrow the field, but there is still meaningful competition.`
        : `The replay clues are useful but still incomplete. ${lead?`${lead.item} ${lead.nature} ${lead.profile} is only the front-runner.`:'Need more evidence.'}`)
    : (conf.label==='High'
      ? `Best current read: ${itemLead}. The evidence is pointing in one direction.`
      : conf.label==='Medium'
        ? `Best current read: ${itemLead}. There is a lead, but it is not airtight.`
        : `The read is still wide open. ${lead?`${lead.item} ${lead.nature} ${lead.profile} is only the front-runner.`:'Need more evidence.'}`);
  return {confidence:conf,verdict,notes:[...notes.hardBlocks,...notes.notes]};
}
function aggregateDetective(top,key){return Object.entries(top.reduce((o,c)=>(o[c[key]]=(o[c[key]]||0)+c.prob,o),{})).sort((a,b)=>b[1]-a[1])}
function buildDetectiveRead(input){
  const cs=candidates(input.species,input.revealedAbility,{allowItemless:!!input.itemGone}).map(c=>({...c,reasons:[],eliminated:false,fitQuality:'unknown'}));
  const notes=detectiveEvidenceNotes(input);
  cs.forEach(c=>{
    if(input.usedStatusMove&&c.item==='Assault Vest'){c.prob=0;c.eliminated=true;c.reasons.push('hard rule-out: used a status move')}
    if(input.tookHazardDamage&&c.item==='Heavy-Duty Boots'){c.prob=0;c.eliminated=true;c.reasons.push('hard rule-out: took hazard damage')}
    if(input.choiceContradiction&&['Choice Band','Choice Specs','Choice Scarf'].includes(c.item)&&(!input.revealedItem||c.item!==input.revealedItem)){c.prob=0;c.eliminated=true;c.reasons.push('hard rule-out: changed damaging moves without switching')}
    if(input.itemGone&&input.removedItem&&c.item===input.removedItem){c.prob=0;c.eliminated=true;c.reasons.push(`hard rule-out: ${input.removedItem} is already gone`)}
    if(input.itemGone&&c.item==='No Item'){c.prob*=1.7;c.reasons.push('hard anchor: replay proved the old item left the slot')}
    if(input.revealedItem&&c.item!==input.revealedItem){c.prob=0;c.eliminated=true;c.reasons.push(`hard rule-out: replay revealed ${input.revealedItem}`)}
    if(input.revealedItem&&c.item===input.revealedItem){c.prob*=1.8;c.reasons.push(`hard anchor: revealed item is ${input.revealedItem}`)}
    if(input.revealedAbility&&c.ability!==input.revealedAbility){c.prob=0;c.eliminated=true;c.reasons.push(`hard rule-out: replay revealed ${input.revealedAbility}`)}
    if(input.revealedAbility&&c.ability===input.revealedAbility){c.prob*=1.8;c.reasons.push(`hard anchor: revealed ability is ${input.revealedAbility}`)}
    if(input.repeatedDamagingMove&&['Choice Band','Choice Specs','Choice Scarf'].includes(c.item)){c.prob*=1.35;c.reasons.push('soft boost: repeated damage points toward a Choice item')}
    if(input.movedFirst&&(['Timid','Jolly'].includes(c.nature)||c.item==='Choice Scarf')){c.prob*=1.22;c.reasons.push('soft boost: speed clue supports fast lines')}
    const speedFit=detectiveSpeedFit(c,input);
    if(speedFit){c.prob*=speedFit.mult;c.reasons.push(speedFit.tag)}
    if(input.move&&input.observedDamage!=null&&moveCategory(input.move)!=='Status'){
      try{
        const roll=input.evidence==='they_hit_me'?dmg(candSet(c),input.user,input.move,{hpPct:100}):dmg(input.user,candSet(c),input.move,{hpPct:100});
        roll.mv=input.move;
        const fit=scoreDetectiveDamageFit(input.observedDamage,roll);
        c.prob*=fit.mult;
        c.fitQuality=fit.quality;
        c.reasons.push(fit.tag);
      }catch(err){
        c.reasons.push('damage math unavailable for this line');
      }
    }else if(input.clueLabel){
      c.reasons.push(`replay clue: ${input.clueLabel}`);
    }
  });
  normC(cs);
  cs.sort((a,b)=>b.prob-a.prob);
  const live=cs.filter(c=>c.prob>0);
  const top=(live.length?live:cs).slice(0,8), eliminated=cs.filter(c=>c.eliminated), summary=detectiveSummary(top,input,notes);
  return {
    input,
    summary,
    top,
    eliminated,
    itemRows:aggregateDetective(top,'item'),
    abilityRows:aggregateDetective(top,'ability'),
    natureRows:aggregateDetective(top,'nature'),
    profileRows:aggregateDetective(top,'profile')
  };
}
function renderDetectiveRead(read){
  const top=read.top||[], noteBadges=(read.summary.notes||[]).map(x=>reasonBadge(x,/impossible/i.test(x)?'bad':'warn')).join('');
  const abilityBox=read.abilityRows?.length?`<div class="box"><h3>Likely abilities</h3>${bars(read.abilityRows)}</div>`:'';
  const clueText=read.input.observedDamage!=null&&read.input.move
    ? `Observed ${read.input.observedDamage}% from ${html(read.input.move)}.`
    : read.input.clueLabel
      ? `Replay clue: ${html(read.input.clueLabel)}.`
      : 'Replay-only structured clues loaded.';
  $('detective').className='diag';
  $('detective').innerHTML=`<div class="box"><h3>Read on ${html(read.input.species)}</h3><p>${clueText} <strong>${html(read.summary.confidence.label)} confidence.</strong> ${html(read.summary.verdict)}</p><div class="badges">${noteBadges||reasonBadge(read.summary.confidence.reason,'good')}</div></div><div class="threecol"><div class="box"><h3>Likely items</h3>${bars(read.itemRows)}</div><div class="box"><h3>Likely natures</h3>${bars(read.natureRows)}</div><div class="box"><h3>Likely spreads</h3>${bars(read.profileRows)}</div></div>${abilityBox}<div class="box"><h3>Top candidates</h3><table><thead><tr><th>Set</th><th>Item</th><th>Ability</th><th>Nature</th><th>Prob</th><th>Evidence</th></tr></thead><tbody>${top.map(c=>`<tr><td>${html(c.profile)}</td><td>${html(c.item)}</td><td>${html(c.ability||'Unknown')}</td><td>${html(c.nature)}</td><td>${(c.prob*100).toFixed(1)}%</td><td>${html(c.reasons.slice(0,3).join('; '))}</td></tr>`).join('')}</tbody></table></div>${read.eliminated.length?`<div class="box"><h3>Hard eliminations</h3><div class="badges">${read.eliminated.slice(0,6).map(c=>reasonBadge(`${c.item} ${c.ability||'Unknown'} ${c.nature} ${c.profile}`,'bad')).join('')}</div><p class="muted">These lines conflict with hard evidence and were removed from the live pool.</p></div>`:''}`
}
function detectiveReferenceUser(overrides={}){
  if(overrides.user)return overrides.user;
  const wanted=[overrides.targetSpecies,overrides.speedContext?.opponentSpecies,overrides.userSpecies].filter(Boolean).map(x=>DexAdapter.id(x));
  if(team?.length&&wanted.length){
    const hit=team.find(mon=>wanted.includes(DexAdapter.id(mon.species)));
    if(hit)return hit;
  }
  return team[0]||preset('Great Tusk','Heavy-Duty Boots','Impish',{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},['Close Combat','Headlong Rush','Rapid Spin','Knock Off']);
}
function detect(overrides={}){const oppItems=$('oppSpecies')?._items||[],moveItems=$('obsMove')?._items||[],oppHit=oppItems[$('oppSpecies')?.value],moveHit=moveItems[$('obsMove')?.value],sp=overrides.species||oppHit?.species||oppItems[0]?.species,e=Object.prototype.hasOwnProperty.call(overrides,'evidence')?overrides.evidence:($('evidence')?.value||'they_hit_me'),mv=Object.prototype.hasOwnProperty.call(overrides,'move')?overrides.move:(moveHit?.species||moveItems[0]?.species),obs=Object.prototype.hasOwnProperty.call(overrides,'observedDamage')?overrides.observedDamage:(+$('obsPct')?.value||43),used=overrides.usedStatusMove??!!$('statusMove')?.checked,haz=overrides.tookHazardDamage??!!$('hazardTell')?.checked,rep=overrides.repeatedDamagingMove??!!$('repeatTell')?.checked,spd=overrides.movedFirst??!!$('speedTell')?.checked,user=detectiveReferenceUser(overrides);if(!sp)return null;const read=buildDetectiveRead({...overrides,species:sp,evidence:e,move:mv,observedDamage:obs,usedStatusMove:used,tookHazardDamage:haz,repeatedDamagingMove:rep,movedFirst:spd,user});lastDetectiveRead=read;renderDetectiveRead(read);return read}
function renderFavs(){if(!$('favorites'))return;$('favorites').className='';$('favorites').innerHTML=`<div class="favlist">${team.map((p,i)=>`<label class="fav"><input class="favBox" value="${html(p.species)}" type="checkbox" ${i<3?'checked':''}/> Keep ${html(p.species)}</label>`).join('')}</div>`}
function evText(e){let lab={hp:'HP',atk:'Atk',def:'Def',spa:'SpA',spd:'SpD',spe:'Spe'};return Object.entries(e||{}).filter(([k,v])=>v).map(([k,v])=>`${v} ${lab[k]}`).join(' / ')||'4 HP / 252 Atk / 252 Spe'}
function exportSet(p){return`${p.species} @ ${p.item||'Leftovers'}\nAbility: ${p.ability||'Pressure'}\n${p.tera?`Tera Type: ${p.tera}\n`:''}EVs: ${evText(p.evs)}\n${p.nature||'Hardy'} Nature\n${p.moves.slice(0,4).map(m=>`- ${m}`).join('\n')}`}
function rebuild(){if(!team.length||!analysis)return;lastReasoning=buildReasoningReport();let keep=[...document.querySelectorAll('.favBox:checked')].map(x=>x.value),kept=team.filter(p=>keep.includes(p.species)).slice(0,4),pick=(lastReasoning.suggestions||[]).map(s=>s.species).filter(x=>!kept.some(p=>p.species===x)).slice(0,6-kept.length);let exp=[...kept.map(exportSet),...pick.map(x=>SMOGON_FALLBACK_SETS[x]||SUGGEST_SETS[x]||'')].filter(Boolean).join('\n\n');$('prescription').className='diag';$('prescription').innerHTML=`<div class="threecol"><div class="box"><h3>Light Surgery</h3><p>Keep ${kept.map(p=>p.species).join(', ')||'your least illegal pieces'}; patch moves, items, and role gaps.</p></div><div class="box"><h3>Actual Medicine</h3><p>Add ${pick.slice(0,3).join(', ')} for structure and matchup coverage.</p></div><div class="box"><h3>Nurse Joyless Approved</h3><p>${html(verdict(lastReasoning))}</p></div></div><div class="box"><h3>Showdown export</h3><code class="code" id="exportCode"></code><p><button class="ghost small" id="copyBtn">Copy Export</button></p></div>`;$('exportCode').textContent=exp;$('copyBtn').onclick=()=>navigator.clipboard?.writeText(exp)}

// V3.5 cleanup restore: core rendering entrypoints used by DOM/init tests.
function renderTeam(){let el=$('teamCards');if(!el)return;el.innerHTML=team.map((p,i)=>`<div class="card"><h3>${i+1}. ${html(p.species)}</h3><p>${html(types(p).join(' / '))}<br>${html(p.item)} · ${html(p.nature)}</p><div class="badges">${p.moves.slice(0,4).map(m=>`<span class="badge">${html(m)}</span>`).join('')}</div></div>`).join('')}
function renderAnalysis(){if(!analysis)return;$('status').textContent=analysis.status;let worst=analysis.rows[0],roast=analysis.status==='Unsaveable'?`Patient status: Unsaveable. ${worst.tp} attacks are a mass casualty event and your switch-in plan is mostly prayer.`:analysis.status==='Critical'?`Patient status: Critical. ${worst.tp}: ${worst.weak} weak, ${worst.res} resist, ${worst.imm} immune.`:analysis.status==='Concerning'?`Patient status: Concerning. Playable, but it needs medicine.`:`Patient status: Stable. No coroner needed.`;$('statusText').textContent=roast;let tr=analysis.rows.slice(0,8).map(r=>`<tr><td>${r.tp}</td><td>${r.weak}</td><td>${r.four}</td><td>${r.res}</td><td>${r.imm}</td><td class="${r.sev}">${r.sev.toUpperCase()}</td></tr>`).join('');let role=Object.entries(analysis.roles).map(([k,v])=>`<span class="badge ${v.length?'good':'bad'}">${html(k)}: ${v.length?html(v.join(', ')):'missing'}</span>`).join('');let miss=analysis.missing.length?analysis.missing.map(x=>`<span class="badge bad">missing ${html(x)}</span>`).join(''):`<span class="badge good">core roles present</span>`;let red=analysis.red.length?analysis.red.map(x=>`<span class="badge warn">${html(x)}</span>`).join(''):`<span class="badge good">no major redundancy</span>`;$('diagnosis').className='diag';$('diagnosis').innerHTML=`<div class="box"><h3>Nurse Joyless says</h3><p>${html(roast)}</p></div><div class="box"><h3>Type triage</h3><table><thead><tr><th>Type</th><th>Weak</th><th>4x</th><th>Resist</th><th>Immune</th><th>Severity</th></tr></thead><tbody>${tr}</tbody></table></div><div class="twocol"><div class="box"><h3>Missing roles</h3><div class="badges">${miss}</div></div><div class="box"><h3>Redundancy</h3><div class="badges">${red}</div></div></div><div class="box"><h3>Role scan</h3><div class="badges">${role}</div></div>`;renderFavs()}
function validateTeamSets(){if(!lastReasoning)lastReasoning=buildReasoningReport();renderValidation(lastReasoning)}

// === V3.5 repo-ready reliability patch: legacy wrapper + lane-diverse suggestions ===
function v35ActiveReport(t=team,a=analysis){
  if(!t.length||!a)return null;
  const p=profileTeam(t,a), identity=detectIdentities(t,a,p), synergy=evaluateSynergy(t,a,p), matchups=evaluateMatchups(t,a,p,identity), validation=validateTeamAdvanced(t);
  const base={generatedAt:new Date().toISOString(),team:t.map(p=>({species:p.species,item:p.item,ability:p.ability,tera:p.tera,nature:p.nature,evs:p.evs,ivs:p.ivs,moves:p.moves,types:types(p)})),identity,synergy,matchups,validation,diagnosis:{status:a.status,topWeaknesses:a.rows.slice(0,6),missingRoles:a.missing,redundancy:a.red},profile:p};
  return base;
}
function teamReasoner(t=team,a=analysis){
  const base=v35ActiveReport(t,a);
  if(!base)return {profile:null,identity:null,synergy:null,matchups:[],suggestions:[]};
  const suggestions=suggestAdditions(t,a,base.profile,base.identity,base.synergy,base.matchups).map(s=>({...s,swapOptions:swapOptionsFor(s,base)}));
  return {...base,suggestions:suggestions.slice(0,6),suggestionPool:suggestions.slice(0,18),needs:needsForReport(base)};
}
function v35RoleText(c){return [...(c.roles||[]),...(candidateRoles(c.species)||[])].join(' ')}
function v35CandidateResists(c,tp){try{const m=mult(tp,types({species:c.species}));return m===0?2:m<1?1:m>1?-1:0}catch(e){return 0}}
function v35LaneScore(c,lane,report){
  const text=v35RoleText(c), primary=report.identity?.primary?.name||'', syn=report.synergy?.scores||{}, fc=report.synergy?.fieldControl||{}, rain=report.matchups?.find(m=>m.name==='Rain')?.score??60;
  const worst=(report.diagnosis?.topWeaknesses||[]).slice(0,4);
  let s=0, why=[];
  if(lane==='matchup'){
    worst.forEach(w=>{const r=v35CandidateResists(c,w.tp); if(r>0){s+=r===2?18:12; why.push(`${r===2?'immune to':'resists'} ${w.tp} pressure`) } else if(r<0){s-=8}});
    if(rain<55 && /Water resist|Water check|Regenerator|Grass|Dragon check/i.test(text)){s+=14;why.push('directly addresses the Rain dependency')}
  }else if(lane==='field control'){
    if(/removal denial|Good as Gold|Ghost|Magic Bounce/i.test(text)){s+=18;why.push('adds removal-denial texture')}
    if(/hazard removal|Defog|Rapid Spin|Court Change/i.test(text)){s+=14;why.push('improves hazard removal')}
    if(/Spikes|hazard pressure|hazard stack|Stealth Rock/i.test(text)){s+=12;why.push('improves hazard pressure')}
    if(fc?.setterOverload||report.profile?.overloaded?.length){s+=8;why.push('helps relieve overloaded field-control slots')}
  }else if(lane==='win condition'){
    if(/wincon|priority|breaker|pressure|Choice Scarf|speed control/i.test(text)){s+=18;why.push('creates a clearer closing path')}
    if((syn.winReliability??100)<65){s+=10;why.push('targets low win-condition reliability')}
  }else if(lane==='defensive glue'){
    if(/glue|backbone|sponge|check|Regenerator|Water resist|Dragon check|Ground immunity/i.test(text)){s+=18;why.push('stabilizes switching structure')}
    if((syn.defensiveBackbone??100)<70){s+=10;why.push('targets weak defensive backbone')}
  }else if(lane==='speed control'){
    if(/priority|Choice Scarf|speed control|Thunder Wave|pivot/i.test(text)){s+=18;why.push('adds tempo or revenge-kill control')}
    if((syn.speedControl??100)<65){s+=10;why.push('targets moderate speed-control score')}
  }else if(lane==='identity fit'){
    if(/Hazard/.test(primary)&&/removal denial|Spikes|hazard pressure|Magic Bounce/i.test(text)){s+=18;why.push('preserves hazard-centric identity')}
    if(/Balance|Bulky/.test(primary)&&/pivot|glue|Regenerator|check|backbone/i.test(text)){s+=18;why.push('preserves balance structure')}
    if(/Hyper Offense|Dragon/.test(primary)&&/priority|breaker|speed control|Steel glue|Fairy/i.test(text)){s+=18;why.push('fits the offensive identity without losing too much tempo')}
    if(/Stall/.test(primary)&&/Regenerator|wall|sponge|Haze|status/i.test(text)){s+=18;why.push('preserves attrition structure')}
  }
  const genericGlue=/Gholdengo|Hatterene|Primarina|Rotom-Wash|Slowking-Galar|Corviknight|Amoonguss/.test(c.species);
  if(genericGlue && s<14) s-=7;
  return {score:s,why:unique(why)};
}
function v35AllCandidates(report,data={}){
  const raw=smogonCandidatePool(report).map(c=>scoreSmogonCandidate(c,report,data)).filter(Boolean);
  const extra=['Amoonguss','Clefable','Iron Crown','Landorus-Therian','Zapdos','Ting-Lu','Great Tusk','Skarmory','Heatran','Kingambit','Gholdengo','Primarina','Rotom-Wash','Toxapex','Alomomola','Slowking-Galar','Corviknight','Hatterene'];
  const seen=new Set(raw.map(x=>DexAdapter.id(x.species)));
  extra.forEach(species=>{if(!seen.has(DexAdapter.id(species))&&!report.team.some(p=>DexAdapter.id(p.species)===DexAdapter.id(species))){const c={species,set:SMOGON_FALLBACK_SETS[species]||SUGGEST_SETS[species]||''};const s=scoreSmogonCandidate(c,report,data);if(s)raw.push(s)}});
  return raw;
}
function diversifySuggestions(report,data={}){
  const lanes=['matchup','field control','win condition','defensive glue','speed control','identity fit'];
  const pool=v35AllCandidates(report,data).map(c=>{const laneRanks=lanes.map(l=>({lane:l,...v35LaneScore(c,l,report)})).sort((a,b)=>b.score-a.score);const best=laneRanks[0];return {...c,lane:best.lane,laneScore:best.score,why:unique([...(best.why||[]),...(c.why||[])]).slice(0,5),roles:unique([best.lane,...(c.roles||[]),...(candidateRoles(c.species)||[])]).slice(0,5),score:Math.round(clamp((c.score||45)+best.score*.65))}}).sort((a,b)=>(b.score-a.score)||(b.laneScore-a.laneScore));
  const selected=[], used=new Set();
  for(const lane of lanes){const pick=pool.find(c=>c.lane===lane&&!used.has(DexAdapter.id(c.species)));if(pick){selected.push(pick);used.add(DexAdapter.id(pick.species))}}
  for(const c of pool){if(selected.length>=18)break;const id=DexAdapter.id(c.species);if(!used.has(id)){selected.push(c);used.add(id)}}
  return selected.map(s=>({...s,source:data.sets?'Smogon OU sets/stats + V3.5 lane ranking':'V3.5 lane-diverse local metagame brain'}));
}
function suggestAdditions(t=team,a=analysis,p=profileTeam(t,a),identity=detectIdentities(t,a,p),synergy=evaluateSynergy(t,a,p),matchups=[]){
  const base={team:t.map(p=>({species:p.species,item:p.item,ability:p.ability,tera:p.tera,nature:p.nature,evs:p.evs,ivs:p.ivs,moves:p.moves,types:types(p)})),profile:p,identity,synergy,matchups,diagnosis:{topWeaknesses:(a?.rows||[]).slice(0,6)}};
  return diversifySuggestions(base,{});
}
function buildReasoningReport(){
  const base=v35ActiveReport(team,analysis);
  if(!base)return null;
  const pool=suggestAdditions(team,analysis,base.profile,base.identity,base.synergy,base.matchups).map(s=>({...s,swapOptions:swapOptionsFor(s,base)}));
  base.suggestionPool=pool.slice(0,18);
  base.suggestions=base.suggestionPool.slice(0,6);
  base.suggestionSource='V3.5 lane-diverse local metagame brain';
  base.needs=needsForReport(base);
  return base;
}
async function enrichSuggestionsFromApi(report){
  let data={};
  try{data=await (SmogonProvider?.load?.('gen9ou')||{});}catch(e){report.suggestionSource=`V3.5 local lane ranking (${e.message||'Smogon unavailable'})`;}
  const pool=diversifySuggestions(report,data).map(s=>({...s,swapOptions:swapOptionsFor(s,report)}));
  report.suggestionPool=pool.slice(0,18);
  report.suggestions=report.suggestionPool.slice(0,6);
  report.suggestionSource=data?.sets?'Smogon OU sets/stats + V3.5 lane ranking':(report.suggestionSource||'V3.5 lane-diverse local metagame brain');
  report.needs=needsForReport(report);
  return true;
}
