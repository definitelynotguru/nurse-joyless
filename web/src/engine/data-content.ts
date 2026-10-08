// ----- SAMPLE -----
export const SAMPLE: string =`Charizard @ Heavy-Duty Boots\nAbility: Blaze\nTera Type: Fire\nEVs: 4 Def / 252 SpA / 252 Spe\nTimid Nature\n- Flamethrower\n- Hurricane\n- Defog\n- Roost\n\nDragonite @ Heavy-Duty Boots\nAbility: Multiscale\nTera Type: Normal\nEVs: 252 Atk / 4 SpD / 252 Spe\nAdamant Nature\n- Dragon Dance\n- Extreme Speed\n- Earthquake\n- Fire Punch\n\nGarchomp @ Rocky Helmet\nAbility: Rough Skin\nTera Type: Steel\nEVs: 252 HP / 164 Def / 92 Spe\nImpish Nature\n- Stealth Rock\n- Earthquake\n- Dragon Tail\n- Toxic\n\nSalamence @ Life Orb\nAbility: Moxie\nTera Type: Flying\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Dragon Dance\n- Earthquake\n- Outrage\n- Stone Edge\n\nHydreigon @ Choice Specs\nAbility: Levitate\nTera Type: Steel\nEVs: 4 Def / 252 SpA / 252 Spe\nTimid Nature\n- Draco Meteor\n- Dark Pulse\n- Flamethrower\n- U-turn\n\nDragapult @ Choice Band\nAbility: Infiltrator\nTera Type: Dragon\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Dragon Darts\n- U-turn\n- Sucker Punch\n- Tera Blast`;

// ----- REGRESSION_TEAMS -----
export const REGRESSION_TEAMS: Record<string, string> ={
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

// ----- LOCAL_LEARNSETS -----
export const LOCAL_LEARNSETS: Record<string, string[]> ={
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
export const METAGAME_NOTES: Record<string, unknown> ={
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

