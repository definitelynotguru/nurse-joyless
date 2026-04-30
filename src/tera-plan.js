(function(){
  const root = typeof window !== 'undefined' ? window : globalThis;
  const lex = name => { try { return eval(name); } catch (_) { return root[name]; } };
  const TYPE_LIST = () => Array.isArray(lex('TYPES')) ? lex('TYPES') : ["Normal","Fire","Water","Electric","Grass","Ice","Fighting","Poison","Ground","Flying","Psychic","Bug","Rock","Ghost","Dragon","Dark","Steel","Fairy"];
  const clamp = (n, lo=0, hi=100) => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
  const round = n => Math.round(Number.isFinite(n) ? n : 0);
  const id = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const unique = xs => [...new Set((xs || []).filter(Boolean))];
  const chart = () => lex('CHART') || {};
  const isRealType = t => TYPE_LIST().includes(String(t || '').trim());
  const isStellar = t => id(t) === 'stellar';
  const typeEffect = (attack, defenderTypes) => {
    const atk = String(attack || '').trim();
    return (defenderTypes || []).reduce((m, def) => m * ((chart()[atk] && chart()[atk][def] !== undefined) ? chart()[atk][def] : 1), 1);
  };
  const speciesData = mon => {
    try {
      const adapter = lex('DexAdapter');
      if (adapter && typeof adapter.getSpecies === 'function') {
        const data = adapter.getSpecies(mon && mon.species);
        if (data) return data;
      }
    } catch (_) {}
    try {
      const PDATA = lex('P');
      const p = PDATA && PDATA[mon && mon.species];
      if (p) return { name: mon.species, types: p[0], baseStats: p[1] };
    } catch (_) {}
    return { name: mon && mon.species || 'Unknown', types: ['Normal'], baseStats: [80,80,80,80,80,80] };
  };
  const moveInfo = move => {
    try {
      const moveNameFn = lex('moveName');
      const moveDataFn = lex('moveData');
      const name = typeof moveNameFn === 'function' ? moveNameFn(move) : move;
      const data = typeof moveDataFn === 'function' ? moveDataFn(name) : null;
      if (data) return { name, type: data[0], category: data[1], power: data[2] || 0, priority: data[4] || 0 };
    } catch (_) {}
    return { name: String(move || ''), type: '', category: 'Status', power: 0, priority: 0 };
  };
  const movesOf = mon => (mon && mon.moves || []).map(moveInfo);
  const hasMove = (mon, matcher) => movesOf(mon).some(m => matcher(m));
  const hasStatusMove = (mon, names) => hasMove(mon, m => names.map(id).includes(id(m.name)) || names.map(id).includes(id(m.type)));
  const roleHints = mon => {
    const moves = movesOf(mon);
    const item = String(mon && mon.item || '');
    const evs = mon && mon.evs || {};
    const data = speciesData(mon);
    const bst = data.baseStats || [80,80,80,80,80,80];
    const bulkInvestment = (evs.hp || 0) + (evs.def || 0) + (evs.spd || 0);
    const speedInvestment = evs.spe || 0;
    const attackInvestment = (evs.atk || 0) + (evs.spa || 0);
    const recovery = moves.some(m => /recover|roost|slackoff|moonlight|synthesis|shoreup|softboiled|wish|protect/i.test(id(m.name)));
    const setup = moves.some(m => /dragondance|swordsdance|nastyplot|calmmind|bulkup|quiverdance|curse/i.test(id(m.name)));
    const pivot = moves.some(m => /uturn|voltswitch|flipturn|partingshot|chillyreception|batonpass/i.test(id(m.name)));
    const priority = moves.some(m => (m.priority || 0) > 0 || /suckerpunch|extremespeed|thunderclap|aquajet|iceshard|bulletpunch|machpunch|shadow sneak/i.test(String(m.name || '').toLowerCase()));
    const hazards = moves.some(m => /stealthrock|spikes|toxicspikes|stickyweb/i.test(id(m.name)));
    const removal = moves.some(m => /rapidspin|defog|tidyup|courtchange/i.test(id(m.name)));
    const defensiveItem = /leftovers|heavy-duty boots|rocky helmet|assault vest|eviolite|black sludge/i.test(item);
    const offensiveItem = /choice band|choice specs|life orb|booster energy|expert belt|loaded dice|choice scarf/i.test(item);
    const fast = (bst[5] || 0) >= 100 || speedInvestment >= 200 || /choice scarf/i.test(item);
    const bulky = bulkInvestment >= 300 || recovery || defensiveItem || (bst[0] + bst[2] + bst[4] >= 285);
    const breaker = attackInvestment >= 300 || offensiveItem || setup || moves.some(m => m.power >= 110);
    return { recovery, setup, pivot, priority, hazards, removal, defensiveItem, offensiveItem, fast, bulky, breaker, bulkInvestment, speedInvestment, attackInvestment };
  };
  const monLabel = mon => `${mon && mon.species || 'Unknown'}${mon && mon.tera ? ` Tera ${mon.tera}` : ''}`;

  function pressureProfile(team){
    const result = TYPE_LIST().map(type => {
      let weak = 0, resist = 0, immune = 0, net = 0;
      (team || []).forEach(mon => {
        const eff = typeEffect(type, speciesData(mon).types || ['Normal']);
        if (eff > 1) weak += eff >= 4 ? 2 : 1;
        if (eff < 1 && eff > 0) resist += 1;
        if (eff === 0) immune += 1;
        net += eff > 1 ? eff : eff === 0 ? -1.25 : eff < 1 ? -0.55 : 0;
      });
      const pressure = Math.max(0, weak * 18 - resist * 9 - immune * 13 + net * 4);
      return { type, weak, resist, immune, pressure: round(pressure) };
    }).sort((a, b) => b.pressure - a.pressure);
    return result;
  }

  function defensiveTeraValue(mon, pressures){
    const tera = String(mon && mon.tera || '').trim();
    if (!isRealType(tera)) return { score: 0, notes: isStellar(tera) ? ['Stellar does not change defensive typing, so it is not counted as a defensive patch.'] : [] };
    const natural = speciesData(mon).types || ['Normal'];
    const top = (pressures || []).slice(0, 6);
    let score = 0;
    const notes = [];
    top.forEach(p => {
      const before = typeEffect(p.type, natural);
      const after = typeEffect(p.type, [tera]);
      if (before > 1 && after < before) {
        const gain = before >= 4 && after <= 1 ? 18 : before > 1 && after <= 1 ? 12 : 7;
        score += gain + Math.min(8, p.pressure / 8);
        notes.push(`patches ${p.type} pressure (${before}x -> ${after}x)`);
      } else if (before <= 1 && after > 1 && p.pressure > 30) {
        score -= 8;
        notes.push(`creates ${p.type} exposure into an already pressured lane`);
      }
    });
    const role = roleHints(mon);
    if (role.bulky) score += 10;
    if (role.recovery || role.pivot) score += 6;
    if (role.defensiveItem) score += 4;
    if (role.fast && !role.bulky) score -= 5;
    return { score: clamp(score, 0, 100), notes: unique(notes).slice(0, 4) };
  }

  function offensiveTeraValue(mon){
    const tera = String(mon && mon.tera || '').trim();
    const moves = movesOf(mon).filter(m => m.category !== 'Status');
    const naturalTypes = speciesData(mon).types || [];
    const role = roleHints(mon);
    let score = 0;
    const notes = [];
    if (isStellar(tera)) {
      const attackingTypes = unique(moves.map(m => m.type)).length;
      score += Math.min(38, 12 + attackingTypes * 5);
      if (attackingTypes >= 3) notes.push('Stellar supports a mixed or broad-coverage breaker without changing defensive typing');
    } else if (isRealType(tera)) {
      const teraMoves = moves.filter(m => m.type === tera);
      const sameType = naturalTypes.includes(tera);
      if (teraMoves.length) {
        const bestPower = Math.max(...teraMoves.map(m => m.power || 0), 0);
        score += (sameType ? 26 : 18) + Math.min(20, bestPower / 5);
        notes.push(sameType ? `boosts existing ${tera} STAB` : `adds ${tera} damage pressure`);
      }
      if (hasMove(mon, m => id(m.name) === 'terablast')) {
        score += naturalTypes.includes(tera) ? 4 : 18;
        notes.push('Tera Blast depends on spending Tera for full value');
      }
      if (tera === 'Normal' && hasMove(mon, m => /extremespeed|quickattack|facade|boomburst/i.test(id(m.name)))) {
        score += 22;
        notes.push('Normal Tera boosts priority or high-value Normal damage');
      }
      if (tera === 'Dark' && /kingambit|roaring moon|meowscarada|samurott/i.test(mon && mon.species || '')) score += 12;
      if (tera === 'Ghost' && /dragapult|gholdengo|ceruledge/i.test(mon && mon.species || '')) score += 10;
      if (tera === 'Water' && hasMove(mon, m => /water|steam eruption|surf|hydro/i.test(String(m.type + ' ' + m.name)))) score += 8;
      if (tera === 'Fire' && hasMove(mon, m => /fire|flame|eruption|overheat/i.test(String(m.type + ' ' + m.name)))) score += 8;
    }
    if (role.setup) { score += 12; notes.push('setup user can convert one Tera turn into a win path'); }
    if (role.priority) { score += 7; notes.push('priority makes offensive Tera more reliable into offense'); }
    if (role.breaker) score += 8;
    if (!moves.length) score -= 10;
    return { score: clamp(score, 0, 100), notes: unique(notes).slice(0, 4) };
  }

  function teraDependency(mon, defensive, offensive){
    const role = roleHints(mon);
    const tera = String(mon && mon.tera || '').trim();
    let score = 0;
    const notes = [];
    if (!tera) return { score: 0, notes };
    if (defensive.score >= 45) { score += 2; notes.push('important defensive escape'); }
    if (offensive.score >= 55 && (role.setup || role.priority || hasMove(mon, m => id(m.name) === 'terablast'))) { score += 2; notes.push('important offensive conversion'); }
    if (isStellar(tera) && offensive.score >= 45) { score += 1; notes.push('Stellar wants the once-per-game resource but gives no defensive emergency button'); }
    if (defensive.score >= 45 && offensive.score >= 55) { score += 1; notes.push('competes between defensive bailout and offensive win line'); }
    return { score, notes };
  }

  function inferIdentityName(reasoner){
    const candidates = [
      reasoner && reasoner.primaryIdentity && reasoner.primaryIdentity.name,
      reasoner && reasoner.identity && reasoner.identity.primary && reasoner.identity.primary.name,
      reasoner && reasoner.identity && reasoner.identity.name,
      reasoner && reasoner.archetype,
      reasoner && reasoner.primary
    ];
    return String(candidates.find(Boolean) || '').trim();
  }

  function identityFit(identity, team, bestDef, bestOff, hungerCount){
    const name = String(identity || '').toLowerCase();
    let score = 45;
    const notes = [];
    if (/stall|fat|balance/.test(name)) {
      score += bestDef.score >= 45 ? 20 : -8;
      score += hungerCount <= 2 ? 10 : -8;
      notes.push(bestDef.score >= 45 ? 'defensive Tera supports the slower structure' : 'no clear defensive Tera for a slower structure');
    } else if (/hyper|offense|spam/.test(name)) {
      score += bestOff.score >= 50 ? 20 : -10;
      score += bestDef.score >= 35 ? 6 : 0;
      notes.push(bestOff.score >= 50 ? 'offensive Tera fits the pressure plan' : 'offensive structure lacks a clear Tera closer');
    } else if (/rain|sun|weather/.test(name)) {
      score += team.some(mon => offensiveTeraValue(mon).score >= 55) ? 16 : 0;
      score += bestDef.score >= 40 ? 8 : 0;
      notes.push('weather teams value Tera as either damage amplification or emergency defensive cover');
    } else if (/trick/.test(name)) {
      score += bestOff.score >= 50 ? 14 : 0;
      score += hungerCount <= 2 ? 8 : -6;
      notes.push('Trick Room prefers one decisive breaker Tera, not several competing Teras');
    } else {
      score += bestDef.score >= 45 ? 12 : 0;
      score += bestOff.score >= 50 ? 12 : 0;
      score += hungerCount <= 2 ? 6 : -6;
      notes.push('mixed teams want one emergency Tera and one realistic conversion line');
    }
    return { score: clamp(score, 0, 100), notes: unique(notes) };
  }

  function analyzeTeraPlan(inputTeam, reasoner){
    const lexicalTeam = (() => { try { return team; } catch (_) { return root.team; } })();
    const currentTeam = Array.isArray(inputTeam) && inputTeam.length ? inputTeam : (Array.isArray(lexicalTeam) ? lexicalTeam : []);
    const pressures = pressureProfile(currentTeam);
    const rows = currentTeam.map(mon => {
      const defensive = defensiveTeraValue(mon, pressures);
      const offensive = offensiveTeraValue(mon);
      const dependency = teraDependency(mon, defensive, offensive);
      return { mon, species: mon && mon.species, tera: mon && mon.tera, defensive, offensive, dependency };
    });
    const bestDefensive = rows.reduce((best, row) => row.defensive.score > (best.defensive?.score || -1) ? row : best, { defensive: { score: 0 }, mon: {} });
    const bestOffensive = rows.reduce((best, row) => row.offensive.score > (best.offensive?.score || -1) ? row : best, { offensive: { score: 0 }, mon: {} });
    const hunger = rows.filter(row => row.dependency.score >= 2);
    const overloaded = hunger.length >= 4 || rows.filter(row => row.defensive.score >= 45).length >= 3 && rows.filter(row => row.offensive.score >= 55).length >= 2;
    const lexicalReasoner = (() => { try { return reasoner; } catch (_) { return root.reasoner; } })();
    const identity = inferIdentityName(reasoner || lexicalReasoner);
    const fit = identityFit(identity, currentTeam, bestDefensive, bestOffensive, hunger.length);
    const defensiveScore = bestDefensive.defensive.score;
    const offensiveScore = bestOffensive.offensive.score;
    const dependencyPenalty = Math.min(28, Math.max(0, hunger.length - 2) * 9 + (overloaded ? 8 : 0));
    const redundancyBonus = rows.filter(row => row.defensive.score >= 30 || row.offensive.score >= 35).length >= 3 ? 5 : 0;
    const score = clamp(24 + defensiveScore * 0.25 + offensiveScore * 0.24 + fit.score * 0.28 + redundancyBonus - dependencyPenalty, 0, 100);
    let status = 'Weak';
    if (score >= 78 && !overloaded) status = 'Clean';
    else if (score >= 62) status = overloaded ? 'Functional but overloaded' : 'Functional';
    else if (score >= 45) status = 'Volatile';
    const positiveModifier = score >= 80 ? 12 : score >= 70 ? 9 : score >= 60 ? 6 : score >= 50 ? 3 : 0;
    const negativeModifier = overloaded ? Math.min(10, 4 + Math.max(0, hunger.length - 3) * 2) : score < 40 ? 4 : 0;
    const reliabilityModifier = clamp(positiveModifier - negativeModifier, -10, 12);
    const notes = [];
    if (bestDefensive.mon && bestDefensive.mon.species) notes.push(`Best defensive Tera: ${monLabel(bestDefensive.mon)} (${round(bestDefensive.defensive.score)}/100) ${bestDefensive.defensive.notes[0] ? '- ' + bestDefensive.defensive.notes[0] : ''}`);
    if (bestOffensive.mon && bestOffensive.mon.species) notes.push(`Best offensive Tera: ${monLabel(bestOffensive.mon)} (${round(bestOffensive.offensive.score)}/100) ${bestOffensive.offensive.notes[0] ? '- ' + bestOffensive.offensive.notes[0] : ''}`);
    if (hunger.length) notes.push(`${hunger.length} Tera-hungry slot${hunger.length === 1 ? '' : 's'}: ${hunger.map(row => row.species).join(', ')}`);
    if (overloaded) notes.push('Tera is overloaded: several teammates compete for the same once-per-game resource.');
    if (!currentTeam.length) notes.push('No team loaded.');
    const worstPressures = pressures.filter(p => p.pressure > 0).slice(0, 4);
    return {
      score: round(score),
      status,
      reliabilityModifier,
      identityFit: round(fit.score),
      worstPressures,
      bestDefensive: summarizeRow(bestDefensive, 'defensive'),
      bestOffensive: summarizeRow(bestOffensive, 'offensive'),
      hunger: hunger.map(row => ({ species: row.species, tera: row.tera, reasons: row.dependency.notes, score: row.dependency.score })),
      overloaded,
      rows: rows.map(row => ({ species: row.species, tera: row.tera, defensive: round(row.defensive.score), offensive: round(row.offensive.score), dependency: row.dependency.score, notes: unique([...(row.defensive.notes || []), ...(row.offensive.notes || []), ...(row.dependency.notes || [])]).slice(0, 5) })),
      notes: unique([...notes, ...fit.notes]),
      recommendation: teraRecommendation(score, overloaded, bestDefensive, bestOffensive, hunger)
    };
  }

  function summarizeRow(row, lane){
    const part = lane === 'defensive' ? row.defensive : row.offensive;
    return { species: row.mon && row.mon.species || '', tera: row.mon && row.mon.tera || '', score: round(part && part.score), notes: (part && part.notes || []).slice(0, 4) };
  }

  function teraRecommendation(score, overloaded, bestDef, bestOff, hunger){
    if (score >= 78 && !overloaded) return 'Keep the plan: one Tera can either patch the worst pressure lane or close the game without creating resource chaos.';
    if (overloaded) return `Reduce Tera dependency: ${hunger.length} teammates are asking for the same once-per-game resource. Pick one defensive emergency button and one offensive closer.`;
    if ((bestDef.defensive?.score || 0) < 35) return 'Add a clearer defensive Tera that flips the team\'s worst pressure lane instead of only boosting damage.';
    if ((bestOff.offensive?.score || 0) < 40) return 'Add a clearer offensive Tera conversion line so Battle Reliability is not only defensive patchwork.';
    return 'Functional but matchup-sensitive: the Tera plan helps, but the team still needs careful resource timing.';
  }

  function renderTeraPlan(plan){
    if (!plan) return '';
    const rel = plan.reliabilityModifier > 0 ? `+${plan.reliabilityModifier}` : String(plan.reliabilityModifier);
    const worst = (plan.worstPressures || []).map(p => `<span class="tera-chip">${esc(p.type)} pressure: ${esc(p.pressure)}</span>`).join('');
    const hunger = (plan.hunger || []).length ? `<p><strong>Tera dependency:</strong> ${esc(plan.hunger.map(x => `${x.species} (${x.tera})`).join(', '))}</p>` : '<p><strong>Tera dependency:</strong> Low. No obvious resource pile-up.</p>';
    return `<section class="tera-plan-card frame glow" data-tera-plan="true">
      <div class="tera-plan-head"><div><p class="eyebrow">Tera Plan</p><h3>${esc(plan.status)}</h3></div><strong>${esc(plan.score)}/100</strong></div>
      <div class="tera-grid">
        <div><span>Reliability impact</span><b>${esc(rel)}</b><small>conditional one-Tera modifier</small></div>
        <div><span>Defensive line</span><b>${esc(plan.bestDefensive.species || 'None')}</b><small>${esc(plan.bestDefensive.tera || 'No Tera')}</small></div>
        <div><span>Offensive line</span><b>${esc(plan.bestOffensive.species || 'None')}</b><small>${esc(plan.bestOffensive.tera || 'No Tera')}</small></div>
      </div>
      <div class="tera-chip-row">${worst}</div>
      <p><strong>Best defensive Tera:</strong> ${esc(plan.bestDefensive.species || 'None')} ${plan.bestDefensive.tera ? `Tera ${esc(plan.bestDefensive.tera)}` : ''} (${esc(plan.bestDefensive.score)}/100). ${esc((plan.bestDefensive.notes || [])[0] || 'No major defensive flip detected.')}</p>
      <p><strong>Best offensive Tera:</strong> ${esc(plan.bestOffensive.species || 'None')} ${plan.bestOffensive.tera ? `Tera ${esc(plan.bestOffensive.tera)}` : ''} (${esc(plan.bestOffensive.score)}/100). ${esc((plan.bestOffensive.notes || [])[0] || 'No major offensive conversion detected.')}</p>
      ${hunger}
      <p><strong>Verdict:</strong> ${esc(plan.recommendation)}</p>
    </section>`;
  }

  function applyToReasoner(plan){
    const r = (() => { try { return reasoner; } catch (_) { return root.reasoner; } })();
    if (!r || !plan) return;
    r.teraPlan = plan;
    r.synergy = r.synergy || {};
    r.synergy.teraPlan = plan.score;
    const keys = ['battleReliability', 'Battle Reliability', 'reliability'];
    keys.forEach(key => {
      if (typeof r.synergy[key] === 'number' && !r.synergy.__teraAdjusted) {
        r.synergy[key] = clamp(r.synergy[key] + plan.reliabilityModifier, 0, 100);
        r.synergy.__teraAdjusted = true;
      }
    });
  }

  function currentPlan(){
    const lexicalTeam = (() => { try { return team; } catch (_) { return root.team || []; } })();
    const lexicalReasoner = (() => { try { return reasoner; } catch (_) { return root.reasoner || {}; } })();
    const plan = analyzeTeraPlan(lexicalTeam || [], lexicalReasoner || {});
    applyToReasoner(plan);
    root.lastTeraPlan = plan;
    return plan;
  }

  function injectTeraPlan(){
    const plan = currentPlan();
    const html = renderTeraPlan(plan);
    ['archetypeResults', 'synergyResults'].forEach(id => {
      const el = typeof document !== 'undefined' && document.getElementById ? document.getElementById(id) : null;
      if (!el) return;
      const old = el.querySelector && el.querySelector('[data-tera-plan="true"]');
      if (old) old.remove();
      const lexicalTeam = (() => { try { return team; } catch (_) { return root.team || []; } })();
      if (/analyze a team first|run sparring lab first|no diagnosis/i.test(el.textContent || '') && !(lexicalTeam || []).length) return;
      el.insertAdjacentHTML('beforeend', html);
    });
  }

  function markdown(plan){
    if (!plan) return '';
    const lines = [];
    lines.push('## Tera Plan');
    lines.push('');
    lines.push(`**${plan.status}** — ${plan.score}/100`);
    lines.push('');
    lines.push(`- Reliability impact: ${plan.reliabilityModifier > 0 ? '+' : ''}${plan.reliabilityModifier}`);
    lines.push(`- Best defensive Tera: ${plan.bestDefensive.species || 'None'}${plan.bestDefensive.tera ? ` Tera ${plan.bestDefensive.tera}` : ''} (${plan.bestDefensive.score}/100)`);
    if ((plan.bestDefensive.notes || [])[0]) lines.push(`  - ${plan.bestDefensive.notes[0]}`);
    lines.push(`- Best offensive Tera: ${plan.bestOffensive.species || 'None'}${plan.bestOffensive.tera ? ` Tera ${plan.bestOffensive.tera}` : ''} (${plan.bestOffensive.score}/100)`);
    if ((plan.bestOffensive.notes || [])[0]) lines.push(`  - ${plan.bestOffensive.notes[0]}`);
    lines.push(`- Tera dependency: ${plan.hunger.length ? plan.hunger.map(x => `${x.species} (${x.tera})`).join(', ') : 'low'}`);
    lines.push(`- Verdict: ${plan.recommendation}`);
    lines.push('');
    return lines.join('\n');
  }

  function patchClipboardExport(){
    const nav = root.navigator;
    if (!nav || !nav.clipboard || typeof nav.clipboard.writeText !== 'function' || nav.clipboard.__teraPatched) return;
    const original = nav.clipboard.writeText.bind(nav.clipboard);
    nav.clipboard.writeText = function patchedWriteText(text){
      let output = String(text ?? '');
      if (/^# Nurse Joyless Team Report/m.test(output) && !/## Tera Plan/m.test(output)) {
        const plan = currentPlan();
        output += '\n' + markdown(plan);
      }
      return original(output);
    };
    nav.clipboard.__teraPatched = true;
  }


  function injectStyles(){
    if (typeof document === 'undefined' || !document.head || document.getElementById('tera-plan-style')) return;
    const style = document.createElement('style');
    style.id = 'tera-plan-style';
    style.textContent = `
      .tera-plan-card{margin-top:1rem;padding:1rem;border:1px solid rgba(167,139,250,.45);background:linear-gradient(135deg,rgba(76,29,149,.22),rgba(15,23,42,.88));}
      .tera-plan-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:.75rem;}
      .tera-plan-head h3{margin:.15rem 0 0;font-size:1.1rem;}
      .tera-plan-head strong{font-size:1.35rem;color:#c4b5fd;}
      .tera-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.65rem;margin:.75rem 0;}
      .tera-grid>div{padding:.65rem;border:1px solid rgba(148,163,184,.24);background:rgba(15,23,42,.72);border-radius:.75rem;}
      .tera-grid span,.tera-grid small{display:block;color:#94a3b8;font-size:.72rem;}
      .tera-grid b{display:block;margin:.15rem 0;color:#e5e7eb;}
      .tera-chip-row{display:flex;flex-wrap:wrap;gap:.4rem;margin:.75rem 0;}
      .tera-chip{display:inline-flex;padding:.25rem .5rem;border:1px solid rgba(196,181,253,.35);border-radius:999px;background:rgba(88,28,135,.22);font-size:.75rem;color:#ddd6fe;}
      @media(max-width:760px){.tera-grid{grid-template-columns:1fr;}}
    `;
    document.head.appendChild(style);
  }

  function attach(){
    injectStyles();
    patchClipboardExport();
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('click', ev => {
        const id = ev.target && ev.target.id;
        if (['analyze', 'calcArchetypes', 'suggestPokemon', 'exportMarkdown'].includes(id)) {
          setTimeout(injectTeraPlan, 80);
        }
      }, true);
      document.addEventListener('DOMContentLoaded', () => setTimeout(injectTeraPlan, 120));
    }
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      ['archetypeResults', 'synergyResults'].forEach(targetId => {
        const el = document.getElementById(targetId);
        if (!el) return;
        const observer = new MutationObserver(() => {
          if (!el.querySelector('[data-tera-plan="true"]')) setTimeout(injectTeraPlan, 30);
        });
        observer.observe(el, { childList: true, subtree: false });
      });
    }
  }

  root.NurseJoylessTeraPlan = { analyze: analyzeTeraPlan, render: renderTeraPlan, markdown, inject: injectTeraPlan };
  attach();
})();
