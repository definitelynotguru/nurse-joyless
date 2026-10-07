// Extra dex data folded in from legacy patch files (replay-ability, status-control,
// move-immunity, priority-blocking upgrades + validation-fixes).

export const EXTRA_P: Record<string, unknown> = {
  "Leafeon":[['Grass'],[65,110,130,60,65,95]],
  "Slurpuff":[['Fairy'],[82,80,86,85,75,72]],
  "Wailord":[['Water'],[170,90,45,90,45,60]],
  "Magmar":[['Fire'],[65,95,57,100,85,93]],
  "Camerupt":[['Fire','Ground'],[70,100,70,105,75,40]],
  "Banette":[['Ghost'],[64,115,65,83,63,65]],
  "Rapidash-Galar":[['Psychic','Fairy'],[65,100,70,80,80,105]]
};

export const EXTRA_FALLBACK_ABILITIES: Record<string, unknown> = {
  "Leafeon":{0:'Leaf Guard',H:'Chlorophyll'},
  "Slurpuff":{0:'Sweet Veil',1:'Unburden'},
  "Wailord":{0:'Water Veil',1:'Oblivious',H:'Pressure'},
  "Magmar":{0:'Flame Body',1:'Vital Spirit',H:'Vital Spirit'},
  "Camerupt":{0:'Magma Armor',1:'Solid Rock',H:'Anger Point'},
  "Banette":{0:'Insomnia',1:'Frisk',H:'Cursed Body'},
  "Rapidash-Galar":{0:'Run Away',1:'Pastel Veil',H:'Anticipation'},
  "Slowbro":{0:'Oblivious',1:'Own Tempo',H:'Regenerator'},
  "Aromatisse":{0:'Healer',1:'Aroma Veil'},
  "Farigiraf":{0:'Cud Chew',1:'Armor Tail',H:'Sap Sipper'},
  "Bruxish":{0:'Dazzling',1:'Strong Jaw',H:'Wonder Skin'},
  "Tsareena":{0:'Leaf Guard',1:'Queenly Majesty',H:'Sweet Veil'}
};

export const EXTRA_SPECIES = Object.assign({}, {
    'Kommo-o':{
      name:'Kommo-o',
      types:['Dragon','Fighting'],
      baseStats:[75,110,125,100,105,85],
      abilities:{0:'Bulletproof',1:'Soundproof',H:'Overcoat'}
    },
    Brambleghast:{
      name:'Brambleghast',
      types:['Grass','Ghost'],
      baseStats:[55,115,70,80,70,90],
      abilities:{0:'Wind Rider'}
    }
  }, {
    Farigiraf:{
      name:'Farigiraf',
      types:['Normal','Psychic'],
      baseStats:[120,90,70,110,70,60],
      abilities:{0:'Cud Chew',1:'Armor Tail',H:'Sap Sipper'}
    },
    Bruxish:{
      name:'Bruxish',
      types:['Water','Psychic'],
      baseStats:[68,105,70,70,70,92],
      abilities:{0:'Dazzling',1:'Strong Jaw',H:'Wonder Skin'}
    },
    Tsareena:{
      name:'Tsareena',
      types:['Grass'],
      baseStats:[72,120,98,50,98,72],
      abilities:{0:'Leaf Guard',1:'Queenly Majesty',H:'Sweet Veil'}
    }
  });

export const EXTRA_MOVES = Object.assign({}, {
    'Hyper Voice':['Normal','Special',90,100],
    'Aura Sphere':['Fighting','Special',80,100],
    Boomburst:['Normal','Special',140,100],
    'Echoed Voice':['Normal','Special',40,100],
    'Sparkling Aria':['Water','Special',90,100],
    Round:['Normal','Special',60,100],
    'Relic Song':['Normal','Special',75,100],
    'Electro Ball':['Electric','Special',1,100],
    'Mist Ball':['Psychic','Special',70,100],
    'Fairy Wind':['Fairy','Special',40,100],
    'Ominous Wind':['Ghost','Special',60,100],
    'Petal Blizzard':['Grass','Physical',90,100],
    'Razor Wind':['Normal','Special',80,100],
    'Sandsear Storm':['Ground','Special',100,80],
    'Wildbolt Storm':['Electric','Special',100,80],
    'Alluring Voice':['Fairy','Special',80,100],
    'Air Cutter':['Flying','Special',60,95],
    'Bullet Seed':['Grass','Physical',25,100],
    'Disarming Voice':['Fairy','Special',40,100],
    Gust:['Flying','Special',40,100],
    'Grass Whistle':['Grass','Status',0,55],
    'Heal Bell':['Normal','Status',0,100],
    'Ice Ball':['Ice','Physical',30,90],
    'Metal Sound':['Steel','Status',0,85],
    'Noble Roar':['Normal','Status',0,100],
    Octazooka:['Water','Special',65,85],
    'Perish Song':['Normal','Status',0,100],
    'Pollen Puff':['Bug','Special',90,100],
    'Psychic Noise':['Psychic','Special',75,100],
    'Rage Powder':['Bug','Status',0,100],
    'Rock Wrecker':['Rock','Physical',150,90],
    Screech:['Normal','Status',0,85],
    Sing:['Normal','Status',0,55],
    Snore:['Normal','Special',50,100],
    'Springtide Storm':['Fairy','Special',100,80],
    Supersonic:['Normal','Status',0,55],
    Tailwind:['Flying','Status',0,100],
    Uproar:['Normal','Special',90,100],
    'Zap Cannon':['Electric','Special',120,50]
  }, {
    'Accelerock':['Rock','Physical',40,100,1],
    'Aqua Jet':['Water','Physical',40,100,1],
    'Bullet Punch':['Steel','Physical',40,100,1],
    'Extreme Speed':['Normal','Physical',80,100,2],
    'Fake Out':['Normal','Physical',40,100,3],
    'First Impression':['Bug','Physical',90,100,2],
    'Grassy Glide':['Grass','Physical',70,100,0],
    'Ice Shard':['Ice','Physical',40,100,1],
    'Jet Punch':['Water','Physical',60,100,1],
    'Mach Punch':['Fighting','Physical',40,100,1],
    'Shadow Sneak':['Ghost','Physical',40,100,1],
    'Sucker Punch':['Dark','Physical',70,100,1],
    'Thunderclap':['Electric','Special',70,100,1],
    'Vacuum Wave':['Fighting','Special',40,100,1]
  });

export const TRUSTED_FALLBACK_LEARNSETS: Record<string, string[]> = {
    Mimikyu: ['Play Rough', 'Shadow Claw', 'Swords Dance', 'Shadow Sneak'],
    Naganadel: ['Draco Meteor', 'Sludge Wave', 'Flamethrower', 'U-turn'],
    Tyranitar: ['Stealth Rock', 'Crunch', 'Stone Edge', 'Thunder Wave'],
    Excadrill: ['Earthquake', 'Iron Head', 'Rapid Spin', 'Swords Dance'],
    Buzzwole: ['Drain Punch', 'Ice Punch', 'Roost', 'Leech Life'],
    Corviknight: ['Defog', 'Roost', 'Brave Bird', 'U-turn', 'Body Press'],
    Volcanion: ['Steam Eruption', 'Flamethrower', 'Taunt', 'Will-O-Wisp', 'Protect'],
    'Deoxys-Speed': ['Psycho Boost', 'Superpower', 'Knock Off', 'Spikes', 'Taunt', 'Shadow Ball'],
    Kingambit: ['Kowtow Cleave', 'Sucker Punch', 'Iron Head', 'Low Kick', 'Swords Dance'],
    'Iron Valiant': ['Moonblast', 'Close Combat', 'Knock Off', 'Encore'],
    'Iron Treads': ['Stealth Rock', 'Earthquake', 'Knock Off', 'Rapid Spin'],
    'Landorus-Therian': ['Earthquake', 'U-turn', 'Stealth Rock', 'Stone Edge', 'Taunt', 'Grass Knot'],
    Pecharunt: ['Malignant Chain', 'Shadow Ball', 'Nasty Plot', 'Recover', 'Foul Play', 'Parting Shot'],
    Garganacl: ['Stealth Rock', 'Salt Cure', 'Recover', 'Protect'],
    Hatterene: ['Trick Room', 'Psychic Noise', 'Dazzling Gleam', 'Healing Wish'],
    Gliscor: ['Spikes', 'Knock Off', 'Toxic', 'Protect'],
    'Tornadus-Therian': ['Bleakwind Storm', 'U-turn', 'Knock Off', 'Heat Wave']
  };

// Folded from validation-fixes.js addFallbackData().
export const EXTRA_P2: Record<string, [string[], number[]]> = {
  Volcanion: [["Fire", "Water"], [80, 110, 120, 130, 90, 70]],
  "Deoxys-Speed": [["Psychic"], [50, 95, 90, 95, 90, 180]],
  Mimikyu: [["Ghost", "Fairy"], [55, 90, 80, 50, 105, 96]],
  Naganadel: [["Poison", "Dragon"], [73, 73, 73, 127, 73, 121]],
  Buzzwole: [["Bug", "Fighting"], [107, 139, 139, 53, 53, 79]],
  Tyranitar: [["Rock", "Dark"], [100, 134, 110, 95, 100, 61]],
  Excadrill: [["Ground", "Steel"], [110, 135, 60, 50, 65, 88]]
};

export const EXTRA_FALLBACK_ABILITIES2: Record<string, Record<string, string>> = {
  Kingambit: {0: 'Defiant', 1: 'Supreme Overlord', H: 'Pressure'},
  "Iron Valiant": {0: 'Quark Drive'},
  "Iron Treads": {0: 'Quark Drive'},
  Volcanion: {0: 'Water Absorb'},
  "Deoxys-Speed": {0: 'Pressure'},
  Pecharunt: {0: 'Poison Puppeteer'},
  "Landorus-Therian": {0: 'Intimidate'},
  Mimikyu: {0: 'Disguise'},
  Naganadel: {0: 'Beast Boost'},
  Tyranitar: {0: 'Sand Stream', H: 'Unnerve'},
  Excadrill: {0: 'Sand Rush', 1: 'Sand Force', H: 'Mold Breaker'},
  Buzzwole: {0: 'Beast Boost'},
  Corviknight: {0: 'Pressure', 1: 'Unnerve', H: 'Mirror Armor'}
};

export const EXTRA_MOVES2: Record<string, unknown> = {
  "Malignant Chain": ["Poison", "Special", 100, 100],
  "Low Kick": ["Fighting", "Physical", 80, 100],
  "Steam Eruption": ["Water", "Special", 110, 95],
  Taunt: ["Dark", "Status", 0, 100],
  Encore: ["Normal", "Status", 0, 100],
  "Psycho Boost": ["Psychic", "Special", 140, 90],
  Superpower: ["Fighting", "Physical", 120, 100],
  "Sludge Bomb": ["Poison", "Special", 90, 100],
  "Sludge Wave": ["Poison", "Special", 95, 100],
  "Pain Split": ["Normal", "Status", 0, 100],
  "Dragon Pulse": ["Dragon", "Special", 85, 100],
  "Freeze-Dry": ["Ice", "Special", 70, 100],
  "Foul Play": ["Dark", "Physical", 95, 100],
  "Parting Shot": ["Dark", "Status", 0, 100],
  "Bleakwind Storm": ["Flying", "Special", 100, 80],
  "Heat Wave": ["Fire", "Special", 95, 90],
  "Salt Cure": ["Rock", "Physical", 40, 100],
  "Dragon Tail": ["Dragon", "Physical", 60, 90],
  "Shadow Claw": ["Ghost", "Physical", 70, 100],
  "Shadow Sneak": ["Ghost", "Physical", 40, 100, 1],
  "Ice Punch": ["Ice", "Physical", 75, 100],
  "Leech Life": ["Bug", "Physical", 80, 100],
  "Drain Punch": ["Fighting", "Physical", 75, 100]
};

export const EXTRA_REPLAY_MOVE_HINTS: Record<string, unknown> = {
  "Steam Eruption": ["Water", "Special", 0],
  "Psycho Boost": ["Psychic", "Special", 0],
  Superpower: ["Fighting", "Physical", 0],
  "Low Kick": ["Fighting", "Physical", 0],
  "Malignant Chain": ["Poison", "Special", 0],
  "Freeze-Dry": ["Ice", "Special", 0],
  "Dragon Pulse": ["Dragon", "Special", 0],
  "Salt Cure": ["Rock", "Physical", 0],
  "Shadow Claw": ["Ghost", "Physical", 0],
  "Shadow Sneak": ["Ghost", "Physical", 1],
  "Sludge Wave": ["Poison", "Special", 0],
  "Ice Punch": ["Ice", "Physical", 0],
  "Leech Life": ["Bug", "Physical", 0],
  "Drain Punch": ["Fighting", "Physical", 0]
};
