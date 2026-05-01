const fs = require('fs');
const vm = require('vm');
const ctx = { console, setTimeout, clearTimeout, navigator:{clipboard:{writeText(){}}}, localStorage:{getItem(){return null},setItem(){}}, fetch:async()=>{throw new Error('offline')}, document:{getElementById(){return null},addEventListener(){},querySelectorAll(){return[]}}, alert(){}, TextDecoder };
ctx.window = ctx; ctx.addEventListener = function(){};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/app.js','utf8'), ctx, {filename:'app.js'});
vm.runInContext(fs.readFileSync('src/weather-identity-upgrades.js','utf8'), ctx, {filename:'weather-identity-upgrades.js'});
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
const mixedWeather = `Charizard @ Heavy-Duty Boots
Ability: Blaze
Tera Type: Fire
EVs: 4 Def / 252 SpA / 252 Spe
Timid Nature
- Flamethrower
- Hurricane
- Defog
- Roost

Volcarona @ Life Orb
Ability: Flame Body
Tera Type: Grass
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Fiery Dance
- Bug Buzz
- Giga Drain
- Quiver Dance

Moltres @ Leftovers
Ability: Pressure
Tera Type: Fairy
EVs: 252 HP / 252 Def / 4 SpD
Bold Nature
- Hurricane
- Roost
- Will-O-Wisp
- Flamethrower

Arcanine @ Choice Band
Ability: Intimidate
Tera Type: Normal
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Fire Punch
- Crunch
- Extreme Speed
- Close Combat

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

Pelipper @ Damp Rock
Ability: Drizzle
Tera Type: Steel
EVs: 248 HP / 252 Def / 8 SpD
Bold Nature
- Hurricane
- Surf
- U-turn
- Roost`;
const shallowRainShell = `Charizard @ Heavy-Duty Boots
Ability: Blaze
Tera Type: Fire
EVs: 4 Def / 252 SpA / 252 Spe
Timid Nature
- Flamethrower
- Hurricane
- Defog
- Roost

Volcarona @ Life Orb
Ability: Flame Body
Tera Type: Grass
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Fiery Dance
- Bug Buzz
- Giga Drain
- Quiver Dance

Moltres @ Leftovers
Ability: Pressure
Tera Type: Fairy
EVs: 252 HP / 252 Def / 4 SpD
Bold Nature
- Hurricane
- Roost
- Will-O-Wisp
- Flamethrower

Arcanine @ Choice Band
Ability: Intimidate
Tera Type: Normal
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Fire Punch
- Crunch
- Extreme Speed
- Close Combat

Dragonite @ Heavy-Duty Boots
Ability: Multiscale
Tera Type: Normal
EVs: 252 Atk / 4 SpD / 252 Spe
Adamant Nature
- Dragon Dance
- Extreme Speed
- Earthquake
- Fire Punch

Pelipper @ Damp Rock
Ability: Drizzle
Tera Type: Steel
EVs: 248 HP / 252 Def / 8 SpD
Bold Nature
- Hurricane
- Surf
- U-turn
- Roost`;
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
const c = report(mixedWeather);
if(c.identity.primary.name === 'Rain Offense') throw new Error('mixed-weather Fire stack should not flatten into pure Rain Offense just because Pelipper is present');
if(!c.synergy.issues.some(issue => /Conflicting weather plan/.test(issue.title))) throw new Error('mixed-weather teams should surface a weather-conflict issue when rain and sun plans fight each other');
const rainRow = (c.identity.all||[]).find(x => x.name === 'Rain Offense');
if(!rainRow || rainRow.score >= c.identity.primary.score) throw new Error('mixed-weather teams should demote Rain Offense below the more coherent structural read');
const d = report(shallowRainShell);
if(d.identity.primary.name === 'Rain Offense') throw new Error('a fire-heavy Pelipper shell without real rain payoffs should not flatten into pure Rain Offense');
if(!d.synergy.issues.some(issue => /Rain plan clashes with Fire core/.test(issue.title))) throw new Error('a shallow rain shell should surface that the Fire core fights its own rain slot');
const shallowRainRow = (d.identity.all||[]).find(x => x.name === 'Rain Offense');
if(!shallowRainRow || shallowRainRow.score >= d.identity.primary.score) throw new Error('a shallow rain shell should demote Rain Offense below the more coherent structural read');
console.log('[OK] V3.5 legacy wrapper and suggestion diversity passed');
