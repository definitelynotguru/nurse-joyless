(function(){
  const root = typeof window !== 'undefined' ? window : globalThis;
  const id = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const TRUSTED_FALLBACK_LEARNSETS = {
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

  function canonicalSpecies(name){
    try { return DexAdapter.resolveSpeciesName(name); } catch (_) { return String(name || ''); }
  }

  function canonicalMove(name){
    try { return DexAdapter.resolveMoveName(name); } catch (_) { return String(name || ''); }
  }

  function trustedMove(mon, move){
    const species = canonicalSpecies(mon && mon.species);
    const moves = TRUSTED_FALLBACK_LEARNSETS[species] || [];
    return moves.map(id).includes(id(canonicalMove(move)));
  }

  function issueMoveName(text){
    const raw = String(text || '').trim();
    const unknown = raw.match(/unknown move:\s*([^.;]+)/i);
    if (unknown) return unknown[1].trim();
    const prefixed = raw.match(/^([^:]{1,60}):\s*(?:learnset|move exists|learnset check)/i);
    if (prefixed) return prefixed[1].trim();
    return '';
  }

  function addFallbackData(){
    try {
      Object.assign(P, {
        Volcanion: [["Fire", "Water"], [80, 110, 120, 130, 90, 70]],
        "Deoxys-Speed": [["Psychic"], [50, 95, 90, 95, 90, 180]],
        Mimikyu: [["Ghost", "Fairy"], [55, 90, 80, 50, 105, 96]],
        Naganadel: [["Poison", "Dragon"], [73, 73, 73, 127, 73, 121]],
        Buzzwole: [["Bug", "Fighting"], [107, 139, 139, 53, 53, 79]],
        Tyranitar: [["Rock", "Dark"], [100, 134, 110, 95, 100, 61]],
        Excadrill: [["Ground", "Steel"], [110, 135, 60, 50, 65, 88]]
      });

      Object.assign(FALLBACK_ABILITIES, {
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
      });

      Object.assign(MOVES, {
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
      });

      Object.assign(REPLAY_MOVE_HINTS, {
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
      });
    } catch (err) {
      console.warn('[validation-fixes] fallback data patch skipped:', err.message);
    }
  }

  function patchSpeciesNormalizer(){
    try {
      const originalNorm = typeof norm === 'function' ? norm : null;
      root.NURSE_ORIGINAL_NORM = originalNorm;
      norm = function patchedNorm(value){
        let raw = String(value || '').trim();
        if (!raw) return '';

        // Showdown gender markers are not form/species names.
        raw = raw.replace(/\s+\((?:M|F)\)\s*$/i, '').trim();

        // Nickname syntax: "Nickname (Species)" or "Nickname (Species) (F)".
        const matches = [...raw.matchAll(/\(([^)]+)\)/g)]
          .map(match => match[1].trim())
          .filter(text => !/^(?:M|F)$/i.test(text));
        if (matches.length) return DexAdapter.resolveSpeciesName(matches[matches.length - 1]);

        return DexAdapter.resolveSpeciesName(raw);
      };
    } catch (err) {
      console.warn('[validation-fixes] species normalizer patch skipped:', err.message);
    }
  }

  function patchParseTeam(){
    try {
      if (typeof parseTeam !== 'function') return;
      const originalParseTeam = parseTeam;
      root.NURSE_ORIGINAL_PARSE_TEAM = originalParseTeam;
      parseTeam = function patchedParseTeam(text){
        const parsed = originalParseTeam(text);
        if (Array.isArray(parsed)) {
          parsed.forEach(mon => {
            if (!mon) return;
            if (/^(unknown|none|n\/a|na|\?|\?\?\?)$/i.test(String(mon.tera || '').trim())) mon.tera = '';
          });
        }
        return parsed;
      };
    } catch (err) {
      console.warn('[validation-fixes] parseTeam wrapper patch skipped:', err.message);
    }
  }

  function issueArrays(row){
    return ['hardIssues', 'hard', 'errors', 'issues', 'warnings']
      .filter(key => Array.isArray(row && row[key]));
  }

  function abilityKnown(mon){
    try {
      const species = DexAdapter.resolveSpeciesName(mon && mon.species);
      const abilities = FALLBACK_ABILITIES[species] || DexAdapter.getSpecies(species)?.abilities || {};
      return Object.values(abilities).some(ability => id(ability) === id(mon && mon.ability));
    } catch (err) {
      return false;
    }
  }

  function scrubIssue(message, mon){
    const text = String(message || '');
    const lower = text.toLowerCase();
    const move = issueMoveName(text);

    if (move && trustedMove(mon, move) && /learnset/i.test(text)) return '';

    const unknownMove = lower.match(/unknown move:\s*([^.;]+)/i);
    if (unknownMove && typeof moveData === 'function' && moveData(unknownMove[1].trim())) return '';

    if (/unknown or unsupported form/.test(lower) && DexAdapter.getSpecies(mon && mon.species)) return '';
    if (/ability data unavailable/.test(lower) && abilityKnown(mon)) return '';
    if (/invalid tera type/.test(lower) && /^(stellar|unknown|none|n\/a|na|\?|\?\?\?)$/i.test(String(mon && mon.tera || '').trim())) return '';

    return text;
  }

  function hardKeys(row){
    return ['hardIssues', 'hard', 'errors', 'issues'].filter(key => Array.isArray(row && row[key]));
  }

  function warningKeys(row){
    return ['warnings'].filter(key => Array.isArray(row && row[key]));
  }

  function patchValidationRows(rows, sourceTeam){
    if (!Array.isArray(rows)) return rows;
    return rows.map((row, idx) => {
      if (!row || typeof row !== 'object') return row;
      const mon = row.mon || row.set || row.pokemon || sourceTeam?.[idx] || {};

      issueArrays(row).forEach(key => {
        row[key] = row[key]
          .map(issue => scrubIssue(issue, mon))
          .filter(Boolean);
      });

      const hardCount = hardKeys(row).reduce((n, key) => n + row[key].length, 0);
      const warningCount = warningKeys(row).reduce((n, key) => n + row[key].length, 0);

      if (hardCount === 0) row.status = warningCount ? 'WARNING' : 'VALID';
      if (String(row.confidence || '').toLowerCase() === 'low' && hardCount === 0) row.confidence = warningCount ? 'medium' : 'high';
      return row;
    });
  }

  function patchValidation(){
    try {
      if (typeof validateTeamAdvanced !== 'function') return;
      const originalValidateTeamAdvanced = validateTeamAdvanced;
      root.NURSE_ORIGINAL_VALIDATE_TEAM_ADVANCED = originalValidateTeamAdvanced;
      validateTeamAdvanced = function patchedValidateTeamAdvanced(sourceTeam){
        const inputTeam = sourceTeam || (typeof team !== 'undefined' ? team : []);
        const result = originalValidateTeamAdvanced(inputTeam);
        if (result && typeof result.then === 'function') {
          return result.then(rows => patchValidationRows(rows, inputTeam));
        }
        return patchValidationRows(result, inputTeam);
      };
    } catch (err) {
      console.warn('[validation-fixes] validation wrapper patch skipped:', err.message);
    }
  }

  addFallbackData();
  patchSpeciesNormalizer();
  patchParseTeam();
  patchValidation();
  root.NURSE_JOYLESS_VALIDATION_FIXES = true;
})();
