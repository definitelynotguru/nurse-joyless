(function(){
  const root = typeof window !== 'undefined' ? window : globalThis;
  const id = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const EXTRA_SPECIES = {
    Noivern: [['Flying', 'Dragon'], [85, 70, 80, 97, 80, 123]],
    'Palkia-Origin': [['Water', 'Dragon'], [90, 100, 100, 150, 120, 120]],
    Palkia: [['Water', 'Dragon'], [90, 120, 100, 150, 120, 100]],
    Xerneas: [['Fairy'], [126, 131, 95, 131, 98, 99]],
    'Necrozma-Dusk-Mane': [['Psychic', 'Steel'], [97, 157, 127, 113, 109, 77]],
    'Necrozma-Dawn-Wings': [['Psychic', 'Ghost'], [97, 113, 109, 157, 127, 77]],
    Yveltal: [['Dark', 'Flying'], [126, 131, 95, 131, 98, 99]],
    Marshadow: [['Fighting', 'Ghost'], [90, 125, 80, 90, 90, 125]],
    Dialga: [['Steel', 'Dragon'], [100, 120, 120, 150, 100, 90]],
    'Dialga-Origin': [['Steel', 'Dragon'], [100, 100, 120, 150, 120, 90]],
    Koraidon: [['Fighting', 'Dragon'], [100, 135, 115, 85, 100, 135]],
    Miraidon: [['Electric', 'Dragon'], [100, 85, 100, 135, 115, 135]],
    Eternatus: [['Poison', 'Dragon'], [140, 85, 95, 145, 95, 130]],
    Zacian: [['Fairy'], [92, 120, 115, 80, 115, 138]],
    'Zacian-Crowned': [['Fairy', 'Steel'], [92, 150, 115, 80, 115, 148]],
    Zamazenta: [['Fighting'], [92, 120, 115, 80, 115, 138]],
    'Zamazenta-Crowned': [['Fighting', 'Steel'], [92, 120, 140, 80, 140, 128]],
    'Calyrex-Shadow': [['Psychic', 'Ghost'], [100, 85, 80, 165, 100, 150]],
    'Calyrex-Ice': [['Psychic', 'Ice'], [100, 165, 150, 85, 130, 50]],
    Hooh: [['Fire', 'Flying'], [106, 130, 90, 110, 154, 90]],
    'Ho-Oh': [['Fire', 'Flying'], [106, 130, 90, 110, 154, 90]],
    Lugia: [['Psychic', 'Flying'], [106, 90, 130, 90, 154, 110]],
    Kyogre: [['Water'], [100, 100, 90, 150, 140, 90]],
    Groudon: [['Ground'], [100, 150, 140, 100, 90, 90]],
    Rayquaza: [['Dragon', 'Flying'], [105, 150, 90, 150, 90, 95]],
    Darkrai: [['Dark'], [70, 90, 90, 135, 90, 125]],
    Arceus: [['Normal'], [120, 120, 120, 120, 120, 120]],
    Lunala: [['Psychic', 'Ghost'], [137, 113, 89, 137, 107, 97]],
    Solgaleo: [['Psychic', 'Steel'], [137, 137, 107, 113, 89, 97]],
    Giratina: [['Ghost', 'Dragon'], [150, 100, 120, 100, 120, 90]],
    Togekiss: [['Fairy', 'Flying'], [85, 50, 95, 120, 115, 80]],
    'Greninja-Ash': [['Water', 'Dark'], [72, 145, 67, 153, 71, 132]],
    Incineroar: [['Fire', 'Dark'], [95, 115, 90, 80, 90, 60]],
    'Tapu Koko': [['Electric', 'Fairy'], [70, 115, 85, 95, 75, 130]]
  };

  const EXTRA_ABILITIES = {
    Noivern: {0: 'Frisk', 1: 'Infiltrator', H: 'Telepathy'},
    'Palkia-Origin': {0: 'Pressure', H: 'Telepathy'},
    Palkia: {0: 'Pressure', H: 'Telepathy'},
    Xerneas: {0: 'Fairy Aura'},
    'Necrozma-Dusk-Mane': {0: 'Prism Armor'},
    'Necrozma-Dawn-Wings': {0: 'Prism Armor'},
    Yveltal: {0: 'Dark Aura'},
    Marshadow: {0: 'Technician'},
    Dialga: {0: 'Pressure', H: 'Telepathy'},
    'Dialga-Origin': {0: 'Pressure', H: 'Telepathy'},
    Koraidon: {0: 'Orichalcum Pulse'},
    Miraidon: {0: 'Hadron Engine'},
    Eternatus: {0: 'Pressure'},
    Zacian: {0: 'Intrepid Sword'},
    'Zacian-Crowned': {0: 'Intrepid Sword'},
    Zamazenta: {0: 'Dauntless Shield'},
    'Zamazenta-Crowned': {0: 'Dauntless Shield'},
    'Calyrex-Shadow': {0: 'As One'},
    'Calyrex-Ice': {0: 'As One'},
    Hooh: {0: 'Pressure', H: 'Regenerator'},
    'Ho-Oh': {0: 'Pressure', H: 'Regenerator'},
    Lugia: {0: 'Pressure', H: 'Multiscale'},
    Kyogre: {0: 'Drizzle'},
    Groudon: {0: 'Drought'},
    Rayquaza: {0: 'Air Lock'},
    Darkrai: {0: 'Bad Dreams'},
    Arceus: {0: 'Multitype'},
    Lunala: {0: 'Shadow Shield'},
    Solgaleo: {0: 'Full Metal Body'},
    Giratina: {0: 'Pressure', H: 'Telepathy'},
    Togekiss: {0: 'Hustle', 1: 'Serene Grace', H: 'Super Luck'},
    'Greninja-Ash': {0: 'Battle Bond'},
    Incineroar: {0: 'Blaze', H: 'Intimidate'},
    'Tapu Koko': {0: 'Electric Surge', H: 'Telepathy'}
  };

  const EXTRA_MOVES = {
    'Spacial Rend': ['Dragon', 'Special', 100, 95],
    'Hydro Pump': ['Water', 'Special', 110, 80],
    'Fire Blast': ['Fire', 'Special', 110, 85],
    Geomancy: ['Fairy', 'Status', 0, 100],
    'Sunsteel Strike': ['Steel', 'Physical', 100, 100],
    'Moongeist Beam': ['Ghost', 'Special', 100, 100],
    'Morning Sun': ['Normal', 'Status', 0, 100],
    'Oblivion Wing': ['Flying', 'Special', 80, 100],
    'Spectral Thief': ['Ghost', 'Physical', 90, 100],
    'Rock Tomb': ['Rock', 'Physical', 60, 95],
    'Dragon Ascent': ['Flying', 'Physical', 120, 100],
    'Origin Pulse': ['Water', 'Special', 110, 85],
    'Precipice Blades': ['Ground', 'Physical', 120, 85],
    'Astral Barrage': ['Ghost', 'Special', 120, 100],
    'Glacial Lance': ['Ice', 'Physical', 120, 100],
    'Behemoth Blade': ['Steel', 'Physical', 100, 100],
    'Behemoth Bash': ['Steel', 'Physical', 100, 100],
    'Collision Course': ['Fighting', 'Physical', 100, 100],
    'Electro Drift': ['Electric', 'Special', 100, 100],
    'Dynamax Cannon': ['Dragon', 'Special', 100, 100],
    'Aeroblast': ['Flying', 'Special', 100, 95],
    'Sacred Fire': ['Fire', 'Physical', 100, 95],
    Boomburst: ['Normal', 'Special', 140, 100],
    'Hone Claws': ['Dark', 'Status', 0, 100],
    'Heat Wave': ['Fire', 'Special', 95, 90],
    'Air Slash': ['Flying', 'Special', 75, 95],
    'Hurricane': ['Flying', 'Special', 110, 70],
    'Water Shuriken': ['Water', 'Special', 20, 100, 1],
    'Flare Blitz': ['Fire', 'Physical', 120, 100]
  };

  const EXTRA_ALIASES = {
    noivern: 'Noivern',
    palkiaorigin: 'Palkia-Origin',
    palkiao: 'Palkia-Origin',
    'palkia-o': 'Palkia-Origin',
    dialgaorigin: 'Dialga-Origin',
    dialgao: 'Dialga-Origin',
    'dialga-o': 'Dialga-Origin',
    necrozmaduskmane: 'Necrozma-Dusk-Mane',
    necrozmadm: 'Necrozma-Dusk-Mane',
    ndm: 'Necrozma-Dusk-Mane',
    duskmane: 'Necrozma-Dusk-Mane',
    necrozmadawnwings: 'Necrozma-Dawn-Wings',
    ndw: 'Necrozma-Dawn-Wings',
    dawnwings: 'Necrozma-Dawn-Wings',
    ygod: 'Yveltal',
    marsh: 'Marshadow',
    hooh: 'Ho-Oh',
    'hooh': 'Ho-Oh',
    zaciancrowned: 'Zacian-Crowned',
    zacianc: 'Zacian-Crowned',
    zamazentacrowned: 'Zamazenta-Crowned',
    zamazentac: 'Zamazenta-Crowned',
    calyrexshadow: 'Calyrex-Shadow',
    calyrexs: 'Calyrex-Shadow',
    calyrexice: 'Calyrex-Ice',
    calyrexi: 'Calyrex-Ice',
    kyuremwhite: 'Kyurem-White',
    kyuremblack: 'Kyurem-Black',
    greninjaash: 'Greninja-Ash',
    ashgreninja: 'Greninja-Ash',
    tapukoko: 'Tapu Koko',
    koko: 'Tapu Koko'
  };

  const TRUSTED_LEARNSETS = {
    Noivern: ['Draco Meteor', 'Hurricane', 'Flamethrower', 'Roost', 'Defog', 'U-turn', 'Boomburst', 'Heat Wave'],
    'Palkia-Origin': ['Spacial Rend', 'Hydro Pump', 'Thunder', 'Fire Blast', 'Draco Meteor', 'Surf'],
    Xerneas: ['Geomancy', 'Moonblast', 'Thunder', 'Focus Blast', 'Psychic'],
    'Necrozma-Dusk-Mane': ['Sunsteel Strike', 'Earthquake', 'Stealth Rock', 'Morning Sun', 'Swords Dance'],
    Yveltal: ['Oblivion Wing', 'Dark Pulse', 'Defog', 'Roost', 'U-turn'],
    Marshadow: ['Spectral Thief', 'Close Combat', 'Shadow Sneak', 'Rock Tomb', 'Bulk Up']
  };

  const UNKNOWN_STATS = [100, 100, 100, 100, 100, 100];
  const UNKNOWN_TYPE = 'Unknown';

  function titleCaseSpecies(raw) {
    return String(raw || 'Unknown Species')
      .trim()
      .replace(/\s+/g, ' ')
      .split(/([- ])/)
      .map(part => part === '-' || part === ' ' ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
  }

  function cleanSpeciesInput(value) {
    let raw = String(value || '').trim();
    raw = raw.replace(/\s+\((?:M|F)\)\s*$/i, '').trim();
    const matches = [...raw.matchAll(/\(([^)]+)\)/g)]
      .map(match => match[1].trim())
      .filter(text => !/^(?:M|F)$/i.test(text));
    if (matches.length) raw = matches[matches.length - 1];
    return raw;
  }

  function localSpeciesName(raw) {
    const cleaned = cleanSpeciesInput(raw);
    const key = id(cleaned);
    if (EXTRA_ALIASES[key]) return EXTRA_ALIASES[key];
    if (typeof P !== 'undefined') {
      const direct = Object.keys(P).find(name => id(name) === key);
      if (direct) return direct;
    }
    const extra = Object.keys(EXTRA_SPECIES).find(name => id(name) === key);
    if (extra) return extra;
    return '';
  }

  function ensureUnknownSpecies(raw) {
    const display = titleCaseSpecies(cleanSpeciesInput(raw));
    if (typeof P !== 'undefined' && display && !P[display]) {
      P[display] = [[UNKNOWN_TYPE], UNKNOWN_STATS];
    }
    if (typeof FALLBACK_ABILITIES !== 'undefined' && display && !FALLBACK_ABILITIES[display]) {
      FALLBACK_ABILITIES[display] = {};
    }
    return display || 'Unknown Species';
  }

  function isUnknownSpeciesName(name) {
    try {
      return !!(typeof P !== 'undefined' && P[name] && Array.isArray(P[name][0]) && P[name][0].includes(UNKNOWN_TYPE));
    } catch (_) {
      return false;
    }
  }

  function addFallbackData() {
    try {
      if (typeof P !== 'undefined') Object.assign(P, EXTRA_SPECIES);
      if (typeof FALLBACK_ABILITIES !== 'undefined') Object.assign(FALLBACK_ABILITIES, EXTRA_ABILITIES);
      if (typeof MOVES !== 'undefined') Object.assign(MOVES, EXTRA_MOVES);
      if (typeof REPLAY_MOVE_HINTS !== 'undefined') {
        Object.assign(REPLAY_MOVE_HINTS, Object.fromEntries(
          Object.entries(EXTRA_MOVES).map(([name, data]) => [name, [data[0], data[1], data[4] || 0]])
        ));
      }
    } catch (err) {
      console.warn('[dex-integrity] fallback data injection skipped:', err.message);
    }
  }

  function getLocalSpeciesData(name) {
    const resolved = localSpeciesName(name) || (typeof P !== 'undefined' && P[name] ? name : '');
    if (!resolved || typeof P === 'undefined' || !P[resolved]) return null;
    return {
      name: resolved,
      types: P[resolved][0] || [UNKNOWN_TYPE],
      baseStats: P[resolved][1] || UNKNOWN_STATS,
      abilities: (typeof FALLBACK_ABILITIES !== 'undefined' && FALLBACK_ABILITIES[resolved]) || {},
      unsupported: isUnknownSpeciesName(resolved)
    };
  }

  function patchDexAdapter() {
    try {
      if (typeof DexAdapter === 'undefined') return;
      const originalResolveSpeciesName = DexAdapter.resolveSpeciesName ? DexAdapter.resolveSpeciesName.bind(DexAdapter) : null;
      const originalGetSpecies = DexAdapter.getSpecies ? DexAdapter.getSpecies.bind(DexAdapter) : null;
      const originalResolveMoveName = DexAdapter.resolveMoveName ? DexAdapter.resolveMoveName.bind(DexAdapter) : null;
      const originalGetMove = DexAdapter.getMove ? DexAdapter.getMove.bind(DexAdapter) : null;

      DexAdapter.resolveSpeciesName = function resolveSpeciesNameWithIntegrity(name) {
        const local = localSpeciesName(name);
        if (local) return local;
        if (originalResolveSpeciesName) {
          const candidate = originalResolveSpeciesName(name);
          const candidateLocal = localSpeciesName(candidate);
          if (candidateLocal) return candidateLocal;
          if (typeof P !== 'undefined' && P[candidate]) return candidate;
        }
        return ensureUnknownSpecies(name);
      };

      DexAdapter.getSpecies = function getSpeciesWithIntegrity(name) {
        const local = getLocalSpeciesData(name);
        if (local) return local;
        if (originalGetSpecies) {
          const hit = originalGetSpecies(name);
          if (hit && Array.isArray(hit.types) && hit.types.length) return hit;
        }
        const resolved = DexAdapter.resolveSpeciesName(name);
        return getLocalSpeciesData(resolved);
      };

      DexAdapter.resolveMoveName = function resolveMoveNameWithIntegrity(name) {
        const raw = String(name || '').trim();
        const key = id(raw);
        if (typeof MOVES !== 'undefined') {
          const local = Object.keys(MOVES).find(move => id(move) === key);
          if (local) return local;
        }
        const extra = Object.keys(EXTRA_MOVES).find(move => id(move) === key);
        if (extra) return extra;
        return originalResolveMoveName ? originalResolveMoveName(name) : raw;
      };

      DexAdapter.getMove = function getMoveWithIntegrity(name) {
        const resolved = DexAdapter.resolveMoveName(name);
        if (typeof MOVES !== 'undefined' && MOVES[resolved]) return MOVES[resolved];
        if (EXTRA_MOVES[resolved]) return EXTRA_MOVES[resolved];
        return originalGetMove ? originalGetMove(name) : null;
      };
    } catch (err) {
      console.warn('[dex-integrity] DexAdapter patch skipped:', err.message);
    }
  }

  function patchNorm() {
    try {
      if (typeof norm !== 'function' || norm.__dexIntegrityGuard) return;
      norm = function normWithDexIntegrity(value) {
        return typeof DexAdapter !== 'undefined' && DexAdapter.resolveSpeciesName
          ? DexAdapter.resolveSpeciesName(value)
          : (localSpeciesName(value) || ensureUnknownSpecies(value));
      };
      norm.__dexIntegrityGuard = true;
    } catch (err) {
      console.warn('[dex-integrity] norm patch skipped:', err.message);
    }
  }

  function patchTypes() {
    try {
      if (typeof types !== 'function' || types.__dexIntegrityGuard) return;
      const originalTypes = types;
      types = function typesWithDexIntegrity(monOrName) {
        const raw = typeof monOrName === 'string' ? monOrName : (monOrName && monOrName.species) || monOrName;
        const species = typeof DexAdapter !== 'undefined' && DexAdapter.getSpecies ? DexAdapter.getSpecies(raw) : getLocalSpeciesData(raw);
        if (species && Array.isArray(species.types) && species.types.length) return species.types;
        const fallback = originalTypes(monOrName);
        if (Array.isArray(fallback) && fallback.length) {
          if (fallback.length === 1 && fallback[0] === 'Normal' && !getLocalSpeciesData(raw)) return [UNKNOWN_TYPE];
          return fallback;
        }
        return [UNKNOWN_TYPE];
      };
      types.__dexIntegrityGuard = true;
    } catch (err) {
      console.warn('[dex-integrity] types patch skipped:', err.message);
    }
  }

  function patchValidation() {
    try {
      if (typeof validateTeamAdvanced !== 'function' || validateTeamAdvanced.__dexIntegrityGuard) return;
      const originalValidateTeamAdvanced = validateTeamAdvanced;
      validateTeamAdvanced = function validateTeamAdvancedWithDexIntegrity(sourceTeam) {
        const inputTeam = sourceTeam || (typeof team !== 'undefined' ? team : []);
        const result = originalValidateTeamAdvanced(inputTeam);
        const normalizeRows = rows => {
          if (!Array.isArray(rows)) return rows;
          return rows.map((row, index) => {
            const mon = row && (row.mon || row.set || row.pokemon || inputTeam[index]) || {};
            const speciesData = typeof DexAdapter !== 'undefined' && DexAdapter.getSpecies ? DexAdapter.getSpecies(mon.species) : null;
            if (speciesData && !speciesData.unsupported) {
              ['issues', 'hardIssues', 'hard', 'errors', 'warnings'].forEach(key => {
                if (!Array.isArray(row[key])) return;
                row[key] = row[key].filter(issue => {
                  const text = String(issue || '');
                  if (/unknown or unsupported form/i.test(text)) return false;
                  if (/ability data unavailable/i.test(text) && Object.values(speciesData.abilities || {}).some(a => id(a) === id(mon.ability))) return false;
                  return true;
                });
              });
              const hardCount = ['issues', 'hardIssues', 'hard', 'errors'].reduce((sum, key) => sum + (Array.isArray(row[key]) ? row[key].length : 0), 0);
              const warningCount = Array.isArray(row.warnings) ? row.warnings.length : 0;
              if (hardCount === 0) row.status = warningCount ? 'WARNING' : 'VALID';
            }
            return row;
          });
        };
        return result && typeof result.then === 'function' ? result.then(normalizeRows) : normalizeRows(result);
      };
      validateTeamAdvanced.__dexIntegrityGuard = true;
    } catch (err) {
      console.warn('[dex-integrity] validation patch skipped:', err.message);
    }
  }

  function effectiveness(attackType, defenseTypes) {
    if (!Array.isArray(defenseTypes) || defenseTypes.includes(UNKNOWN_TYPE)) return null;
    if (typeof CHART === 'undefined') return null;
    return defenseTypes.reduce((mult, defenseType) => mult * ((CHART[attackType] && CHART[attackType][defenseType]) ?? 1), 1);
  }

  function analyzeTypeTriage(teamList) {
    const rows = {};
    const unsupported = [];
    const typeList = typeof TYPES !== 'undefined' ? TYPES : [];
    (teamList || []).forEach(mon => {
      const species = typeof DexAdapter !== 'undefined' && DexAdapter.getSpecies ? DexAdapter.getSpecies(mon.species) : getLocalSpeciesData(mon.species);
      if (!species || species.unsupported || !Array.isArray(species.types) || species.types.includes(UNKNOWN_TYPE)) {
        unsupported.push(mon.species || 'Unknown species');
        return;
      }
      typeList.forEach(attackType => {
        const mult = effectiveness(attackType, species.types);
        if (mult == null) return;
        if (!rows[attackType]) rows[attackType] = {weak: 0, quad: 0, resist: 0, immune: 0};
        if (mult === 0) rows[attackType].immune += 1;
        else if (mult >= 4) { rows[attackType].weak += 1; rows[attackType].quad += 1; }
        else if (mult > 1) rows[attackType].weak += 1;
        else if (mult < 1) rows[attackType].resist += 1;
      });
    });
    return {rows, unsupported};
  }

  function showIntegrityWarning() {
    try {
      if (typeof document === 'undefined') return;
      const currentTeam = typeof team !== 'undefined' ? team : [];
      const report = analyzeTypeTriage(currentTeam);
      const unsupported = report.unsupported.filter(Boolean);
      const old = Array.from(document.querySelectorAll('.dex-integrity-warning'));
      if (!unsupported.length) {
        old.forEach(node => node.remove());
        return;
      }
      const target = document.getElementById('diagnosis') || document.getElementById('archetypeResults');
      if (!target) return;

      const message = `Dex integrity guard: ${unsupported.join(', ')} could not be resolved, so it was not counted as fake Normal-type weakness data. Add fallback Dex data before trusting detailed triage for those slots.`;
      const existing = old.find(node => node.parentNode === target) || null;
      old.forEach(node => {
        if (node !== existing) node.remove();
      });

      if (existing) {
        if (existing.textContent !== message) existing.textContent = message;
        return;
      }

      const note = document.createElement('div');
      note.className = 'dex-integrity-warning';
      note.style.cssText = 'margin:10px 0;padding:10px 12px;border:1px solid #ffd166;color:#ffd166;background:rgba(255,209,102,.08);font-size:12px;line-height:1.45';
      note.textContent = message;
      target.prepend(note);
    } catch (_) {}
  }

  function installMutationWarnings() {
    try {
      if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
      const observer = new MutationObserver(showIntegrityWarning);
      ['diagnosis', 'archetypeResults', 'synergyResults', 'validationResults'].forEach(idValue => {
        const node = document.getElementById(idValue);
        if (node) observer.observe(node, {childList: true, subtree: true, characterData: true});
      });
    } catch (_) {}
  }

  function install() {
    addFallbackData();
    patchDexAdapter();
    patchNorm();
    patchTypes();
    patchValidation();
    installMutationWarnings();
    showIntegrityWarning();
    root.NURSE_JOYLESS_DEX_INTEGRITY_GUARD = {
      version: 'v3.5.1-freeze-guard',
      extraSpecies: Object.keys(EXTRA_SPECIES),
      analyzeTypeTriage,
      getSpecies: name => (typeof DexAdapter !== 'undefined' && DexAdapter.getSpecies ? DexAdapter.getSpecies(name) : getLocalSpeciesData(name)),
      isUnknownSpeciesName,
      showIntegrityWarning
    };
  }

  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();