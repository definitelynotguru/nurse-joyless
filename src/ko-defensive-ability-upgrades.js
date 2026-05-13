(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  const host=typeof globalThis!=='undefined'?globalThis:root;
  const legacyDmg=root.dmg||host.dmg;
  const legacyRenderKo=root.renderKo||host.renderKo;
  const doc=root.document||host.document||(typeof document!=='undefined'?document:null);
  const byId=id=>doc?.getElementById?.(id);
  const safeHtml=typeof html==='function'?html:(s=>String(s??''));
  const hitChance=()=>typeof root.nHitChance==='function'?root.nHitChance:(typeof host.nHitChance==='function'?host.nHitChance:null);
  const SOUND_MOVES=new Set([
    'Alluring Voice',
    'Boomburst',
    'Bug Buzz',
    'Clanging Scales',
    'Disarming Voice',
    'Echoed Voice',
    'Hyper Voice',
    'Overdrive',
    'Parting Shot',
    'Psychic Noise',
    'Relic Song',
    'Round',
    'Snarl',
    'Snore',
    'Sparkling Aria',
    'Torch Song',
    'Uproar'
  ]);

  if(typeof legacyDmg!=='function')return;

  function moveType(roll){
    return String(roll?.moveType||roll?.move?.[0]||'').trim();
  }
  function moveCategory(roll){
    return String(roll?.move?.[1]||roll?.moveCategory||'').trim();
  }
  function moveName(move=''){
    return String(move||'').trim();
  }
  function isSoundMove(move=''){
    return SOUND_MOVES.has(moveName(move));
  }
  function fullHpAbilityWindowActive(roll){
    const max=Number(roll?.max)||0;
    const ehp=Number(roll?.ehp)||0;
    const hz=Number(roll?.hz)||0;
    return max>0&&ehp>=max&&hz<=0;
  }
  function recomputeKoOdds(roll){
    const next={...roll};
    const rolls=Array.isArray(next.rolls)?next.rolls:[];
    const ehp=Math.max(1,Number(next.ehp)||1);
    const hit=Number(next.hit)||1;
    next.min=rolls.length?Math.min(...rolls):0;
    next.maxd=rolls.length?Math.max(...rolls):0;
    next.minp=next.max?next.min/next.max*100:0;
    next.maxp=next.max?next.maxd/next.max*100:0;
    next.ko=rolls.filter(value=>value>=ehp).length/16*hit;
    const chanceFn=hitChance();
    if(chanceFn){
      next.two=chanceFn(next,2);
      next.three=chanceFn(next,3);
    }
    return next;
  }
  function scalePositiveDamage(value,multiplier){
    const n=Number(value)||0;
    if(n<=0)return 0;
    return Math.max(1,Math.floor(n*multiplier));
  }
  function abilityBypassMode(ability=''){
    const name=String(ability||'').trim();
    if(['Mold Breaker','Teravolt','Turboblaze'].includes(name))return 'all';
    if(name==='Mycelium Might')return 'status';
    return '';
  }
  function attackerBypassesDefensiveAbility(roll,mv=''){
    const mode=abilityBypassMode(roll?.att?.ability);
    if(mode==='all')return true;
    if(mode==='status')return moveCategory(roll)==='Status'||!mv;
    return false;
  }
  function defensiveAbilityAdjustments(roll,mv=''){
    const ability=String(roll?.def?.ability||'').trim();
    const notes=[];
    let multiplier=1;
    if(!ability||roll?.blockedBy||Number(roll?.eff)===0||attackerBypassesDefensiveAbility(roll,mv)){
      return { multiplier, notes };
    }
    if(['Multiscale','Shadow Shield'].includes(ability)&&fullHpAbilityWindowActive(roll)){
      multiplier*=0.5;
      notes.push(`${ability} was active at full HP, halving the hit.`);
    }
    if(['Filter','Solid Rock','Prism Armor'].includes(ability)&&Number(roll?.eff)>1){
      multiplier*=0.75;
      notes.push(`${ability} softened the super-effective hit.`);
    }
    if(ability==='Thick Fat'&&['Fire','Ice'].includes(moveType(roll))){
      multiplier*=0.5;
      notes.push(`Thick Fat reduced the ${moveType(roll)} damage.`);
    }
    if(ability==='Heatproof'&&moveType(roll)==='Fire'){
      multiplier*=0.5;
      notes.push('Heatproof reduced the Fire damage.');
    }
    if(ability==='Dry Skin'&&moveType(roll)==='Fire'){
      multiplier*=1.25;
      notes.push('Dry Skin made the Fire hit stronger.');
    }
    if(ability==='Water Bubble'&&moveType(roll)==='Fire'){
      multiplier*=0.5;
      notes.push('Water Bubble reduced the Fire damage.');
    }
    if(ability==='Purifying Salt'&&moveType(roll)==='Ghost'){
      multiplier*=0.5;
      notes.push('Purifying Salt reduced the Ghost damage.');
    }
    if(ability==='Punk Rock'&&isSoundMove(mv)){
      multiplier*=0.5;
      notes.push(`Punk Rock reduced the sound-based damage from ${moveName(mv)}.`);
    }
    if(ability==='Fur Coat'&&moveCategory(roll)==='Physical'){
      multiplier*=0.5;
      notes.push('Fur Coat cut the physical damage in half.');
    }
    if(ability==='Ice Scales'&&moveCategory(roll)==='Special'){
      multiplier*=0.5;
      notes.push('Ice Scales cut the special damage in half.');
    }
    return { multiplier, notes };
  }
  function applyDefensiveAbilityAdjustments(roll,mv=''){
    const adjustment=defensiveAbilityAdjustments(roll,mv);
    if(adjustment.multiplier===1){
      return {
        ...roll,
        defensiveAbilityMultiplier:1,
        defensiveAbilityNotes:adjustment.notes
      };
    }
    return recomputeKoOdds({
      ...roll,
      rolls:(roll.rolls||[]).map(value=>scalePositiveDamage(value,adjustment.multiplier)),
      defensiveAbilityMultiplier:adjustment.multiplier,
      defensiveAbilityNotes:adjustment.notes
    });
  }
  function storeLastKoRoll(roll){
    root.__lastKoAbilityAdjustedRoll=roll;
    if(host!==root)host.__lastKoAbilityAdjustedRoll=roll;
    return roll;
  }
  function appendKoAbilityNote(){
    const panel=byId('ko');
    const roll=root.__lastKoAbilityAdjustedRoll||host.__lastKoAbilityAdjustedRoll;
    const notes=roll?.defensiveAbilityNotes||[];
    if(!panel||panel.className==='empty'||!notes.length)return;
    if(String(panel.innerHTML||'').includes('Defender ability context:'))return;
    panel.innerHTML+=`<div class="box"><h3>Defender ability context</h3><p class="muted">${safeHtml(notes.join(' '))}</p></div>`;
  }

  root.dmg=function patchedKoDefensiveAbilityDmg(att,def,mv,opt={}){
    return storeLastKoRoll(applyDefensiveAbilityAdjustments(legacyDmg(att,def,mv,opt),mv));
  };
  if(host!==root)host.dmg=root.dmg;

  if(typeof legacyRenderKo==='function'){
    root.renderKo=function patchedKoDefensiveAbilityRender(){
      const result=legacyRenderKo.apply(this,arguments);
      appendKoAbilityNote();
      return result;
    };
    if(host!==root)host.renderKo=root.renderKo;
  }
})();