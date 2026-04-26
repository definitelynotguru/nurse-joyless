const fs = require('fs');
const vm = require('vm');
const ctx = { console, setTimeout, clearTimeout, navigator:{clipboard:{writeText(){}}}, localStorage:{getItem(){return null},setItem(){}}, fetch:async()=>{throw new Error('offline')}, document:{getElementById(){return null},addEventListener(){},querySelectorAll(){return[]}}, alert(){}, TextDecoder };
ctx.window = ctx; ctx.addEventListener = function(){};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/app.js','utf8'), ctx, {filename:'app.js'});
const hazard = `Gholdengo @ Air Balloon
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
- Healing Wish`;
const dragon = `Charizard @ Heavy-Duty Boots
Ability: Blaze
Tera Type: Fire
EVs: 4 Def / 252 SpA / 252 Spe
Timid Nature
- Flamethrower
- Hurricane
- Defog
- Roost

Dragonite @ Heavy-Duty Boots
Ability: Multiscale
Tera Type: Normal
EVs: 252 Atk / 4 SpD / 252 Spe
Adamant Nature
- Dragon Dance
- Extreme Speed
- Earthquake
- Fire Punch

Garchomp @ Rocky Helmet
Ability: Rough Skin
Tera Type: Steel
EVs: 252 HP / 164 Def / 92 Spe
Impish Nature
- Stealth Rock
- Earthquake
- Dragon Tail
- Toxic

Salamence @ Life Orb
Ability: Moxie
Tera Type: Flying
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Dragon Dance
- Earthquake
- Outrage
- Stone Edge

Hydreigon @ Choice Specs
Ability: Levitate
Tera Type: Steel
EVs: 4 Def / 252 SpA / 252 Spe
Timid Nature
- Draco Meteor
- Dark Pulse
- Flamethrower
- U-turn

Dragapult @ Choice Band
Ability: Infiltrator
Tera Type: Dragon
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Dragon Darts
- U-turn
- Sucker Punch
- Tera Blast`;
function report(text){ return vm.runInContext(`team=parseTeam(${JSON.stringify(text)}); analysis=analyze(team); teamReasoner(team, analysis);`, ctx, {timeout:10000}); }
const a = report(hazard);
if(!a || !a.identity || !a.synergy || !a.matchups || !Array.isArray(a.suggestions)) throw new Error('teamReasoner wrapper did not return full report');
if(a.suggestions.length < 6) throw new Error('lane-diverse suggestions returned too few cards');
const lanes = new Set(a.suggestions.map(s=>s.lane).filter(Boolean));
if(lanes.size < 4) throw new Error('suggestions are not lane-diverse enough: '+[...lanes].join(','));
const b = report(dragon);
const atop = a.suggestions.slice(0,6).map(s=>s.species).join('|');
const btop = b.suggestions.slice(0,6).map(s=>s.species).join('|');
if(atop === btop) throw new Error('radically different teams received identical top suggestions');
if((b.identity.all||[]).filter(x=>x.score>=96).length>1) throw new Error('identity scoring is still overinflated');
console.log('[OK] V3.5 legacy wrapper and suggestion diversity passed');
