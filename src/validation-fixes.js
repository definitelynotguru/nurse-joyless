(function(){
  const root = typeof window !== 'undefined' ? window : globalThis;
  const id = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const has = name => typeof root[name] !== 'undefined' || (typeof globalThis !== 'undefined' && typeof globalThis[name] !== 'undefined');

  function addFallbackData(){
    try {
      Object.assign(P, {
        Volcanion: [["Fire", "Water"], [80, 110, 120, 130, 90, 70]],
        "Deoxys-Speed": [["Psychic"], [50, 95, 90, 95, 90, 180]]
      });

      Object.assign(FALLBACK_ABILITIES, {
        Kingambit: {0: 'Defiant', 1: 'Supreme Overlord', H: 'Pressure'},
        "Iron Valiant": {0: 'Quark Drive'},
        "Iron Treads": {0: 'Quark Drive'},
        Volcanion: {0: 'Water Absorb'},
        "Deoxys-Speed": {0: 'Pressure'},
        Pecharunt: {0: 'Poison Puppeteer'},
        "Landorus-Therian": {0: 'Intimidate'}
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
        "Pain Split": ["Normal", "Status", 0, 100],
        "Dragon Pulse": ["Dragon", "Special", 85, 100],
        "Freeze-Dry": ["Ice", "Special", 70, 100],
        "Foul Play": ["Dark", "Physical", 95, 100],
        "Parting Shot": ["Dark", "Status", 0, 100],
        "Bleakwind Storm": ["Flying", "Special", 100, 80],
        "Heat Wave": ["Fire", "Special", 95, 90],
        "Salt Cure": ["Rock", "Physical", 40, 100],
        "Dragon Tail": ["Dragon", "Physical", 60, 90]
      });

      Object.assign(REPLAY_MOVE_HINTS, {
        "Steam Eruption": ["Water", "Special", 0],
        "Psycho Boost": ["Psychic", "Special", 0],
        Superpower: ["Fighting", "Physical", 0],
        "Low Kick": ["Fighting", "Physical", 0],
        "Malignant Chain": ["Poison", "Special", 0],
        "Freeze-Dry": ["Ice", "Special", 0],
        "Dragon Pulse": ["Dragon", "Special", 0],
        "Salt Cure": ["Rock", "Physical", 0]
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

    const unknownMove = lower.match(/unknown move:\s*([^.;]+)/i);
    if (unknownMove && typeof moveData === 'function' && moveData(unknownMove[1].trim())) return '';

    if (/unknown or unsupported form/.test(lower) && DexAdapter.getSpecies(mon && mon.species)) return '';
    if (/ability data unavailable/.test(lower) && abilityKnown(mon)) return '';
    if (/invalid tera type/.test(lower) && /^stellar$/i.test(mon && mon.tera)) return '';

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

      if (hardCount === 0) {
        const current = String(row.status || '').toUpperCase();
        if (current === 'INVALID') row.status = warningCount ? 'WARNING' : 'VALID';
      }
      if (String(row.confidence || '').toLowerCase() === 'low' && hardCount === 0) {
        row.confidence = warningCount ? 'medium' : 'high';
      }
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
  patchValidation();
  root.NURSE_JOYLESS_VALIDATION_FIXES = true;
})();
