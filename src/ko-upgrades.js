(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  const legacyDmg=root.dmg;
  const legacyGetAgentFacts=root.getAgentFacts;
  const doc=(root.document||(typeof document!=='undefined'?document:null));
  const byId=id=>doc?.getElementById?.(id);
  const safeHtml=typeof html==='function'?html:(s=>String(s??''));
  const legacyNHitChance=typeof root.nHitChance==='function'?root.nHitChance:null;

  function clampStage(v){const n=Number(v);if(!Number.isFinite(n))return 0;return Math.max(-6,Math.min(6,Math.trunc(n)))}
  function stageMultiplier(stage){const n=clampStage(stage);return n>=0?(2+n)/2:2/(2-n)}
  function normalizeBattleState(opt={}){
    const legacyField=String(opt.field||'none');
    const legacyProtect=['reflect','screen','auroraveil'].includes(legacyField)?legacyField:'none';
    const state={
      weather:String(opt.weather||((legacyField==='rain'||legacyField==='sun')?legacyField:'none')||'none'),
      helpingHand:!!opt.helpingHand,
      attackerProtect:String(opt.attackerProtect||'none'),
      defenderProtect:String(opt.defenderProtect||'none'),
      attackerOffenseStage:clampStage(opt.attackerOffenseStage),
      attackerBulkStage:clampStage(opt.attackerBulkStage),
      defenderOffenseStage:clampStage(opt.defenderOffenseStage),
      defenderBulkStage:clampStage(opt.defenderBulkStage),
      extraEndSteps:Math.max(0,Math.min(3,Math.trunc(Number(opt.extraEndSteps)||0))),
      defenderEndStepDamagePct:Math.max(0,Math.min(100,Number(opt.defenderEndStepDamagePct)||0))
    };
    if(state.attackerProtect==='none'&&state.defenderProtect==='none'&&legacyProtect!=='none')state.defenderProtect=legacyProtect;
    return state;
  }
  function swapBattleState(state={}){
    const battle=normalizeBattleState(state);
    return {
      weather:battle.weather,
      helpingHand:false,
      attackerProtect:battle.defenderProtect,
      defenderProtect:battle.attackerProtect,
      attackerOffenseStage:battle.defenderOffenseStage,
      attackerBulkStage:battle.defenderBulkStage,
      defenderOffenseStage:battle.attackerOffenseStage,
      defenderBulkStage:battle.attackerBulkStage,
      extraEndSteps:0,
      defenderEndStepDamagePct:0
    };
  }
  function protectionLabel(protect=''){return({reflect:'Reflect',screen:'Light Screen',auroraveil:'Aurora Veil'})[protect]||''}
  function signedStage(n,label){const v=clampStage(n);return v?`${v>0?'+':''}${v} ${label}`:''}
  function battleStateSummary(state={}){
    const battle=normalizeBattleState(state);
    const parts=[];
    if(battle.weather==='rain')parts.push('Rain');
    if(battle.weather==='sun')parts.push('Sun');
    if(battle.helpingHand)parts.push('Helping Hand');
    if(battle.attackerProtect!=='none')parts.push(`attacker ${protectionLabel(battle.attackerProtect)}`);
    if(battle.defenderProtect!=='none')parts.push(`defender ${protectionLabel(battle.defenderProtect)}`);
    if(battle.attackerOffenseStage)parts.push(`attacker ${signedStage(battle.attackerOffenseStage,'offense')}`);
    if(battle.attackerBulkStage)parts.push(`attacker ${signedStage(battle.attackerBulkStage,'bulk')}`);
    if(battle.defenderOffenseStage)parts.push(`defender ${signedStage(battle.defenderOffenseStage,'offense')}`);
    if(battle.defenderBulkStage)parts.push(`defender ${signedStage(battle.defenderBulkStage,'bulk')}`);
    if(battle.extraEndSteps)parts.push(`${battle.extraEndSteps} extra end step${battle.extraEndSteps===1?'':'s'}`);
    if(battle.defenderEndStepDamagePct)parts.push(`defender loses ${battle.defenderEndStepDamagePct}% each end step`);
    return parts.length?parts.join(' • '):'Neutral';
  }
  function readKoBattleState(){
    return normalizeBattleState({
      field:byId('field')?.value||'none',
      weather:byId('weather')?.value||'none',
      helpingHand:byId('helpingHand')?.checked,
      attackerProtect:byId('attackerProtect')?.value||'none',
      defenderProtect:byId('defenderProtect')?.value||'none',
      attackerOffenseStage:byId('attackerOffenseStage')?.value||0,
      attackerBulkStage:byId('attackerBulkStage')?.value||0,
      defenderOffenseStage:byId('defenderOffenseStage')?.value||0,
      defenderBulkStage:byId('defenderBulkStage')?.value||0,
      extraEndSteps:byId('extraEndSteps')?.value||0,
      defenderEndStepDamagePct:byId('defenderEndStepDamagePct')?.value||0
    });
  }
  function setStageOptions(){
    const opts=[];
    for(let i=-6;i<=6;i++)opts.push(`<option value="${i}"${i===0?' selected':''}>${i>0?`+${i}`:i}</option>`);
    ['attackerOffenseStage','attackerBulkStage','defenderOffenseStage','defenderBulkStage'].forEach(id=>{
      const el=byId(id);
      if(el)el.innerHTML=opts.join('');
    });
  }

  root.clampStage=clampStage;
  root.stageMultiplier=stageMultiplier;
  root.normalizeBattleState=normalizeBattleState;
  root.swapBattleState=swapBattleState;
  root.battleStateSummary=battleStateSummary;
  root.readKoBattleState=readKoBattleState;
  root.setStageOptions=setStageOptions;
  root.nHitChance=function patchedNHitChance(r,hits){
    const battle=r?.battleState||{};
    const extraEndSteps=Math.max(0,Number(battle.extraEndSteps)||0);
    const endStepsPerGap=1+extraEndSteps;
    const leftoversPerTick=r.def.item==='Leftovers'?Math.floor(r.max/16):0;
    const passiveChipPct=Math.max(0,Number(battle.defenderEndStepDamagePct)||0);
    const passiveChipPerTick=passiveChipPct?Math.floor(r.max*passiveChipPct/100):0;
    const gaps=Math.max(0,hits-1);
    const threshold=Math.max(1,r.ehp+(leftoversPerTick*endStepsPerGap*gaps)-(passiveChipPerTick*endStepsPerGap*gaps));
    let sums={0:1};
    for(let i=0;i<hits;i++){
      const next={};
      Object.entries(sums).forEach(([sum,count])=>r.rolls.forEach(d=>{
        const ns=+sum+d;
        next[ns]=(next[ns]||0)+count;
      }));
      sums=next;
    }
    const total=16**hits;
    const success=Object.entries(sums).reduce((a,[s,c])=>a+(+s>=threshold?c:0),0);
    return success/total*(r.hit**hits);
  };

  root.dmg=function dmgWithBattleState(att,def,mv,opt={}){
    const m=moveData(mv);
    if(!m)throw Error('Unknown move: '+mv);
    if(m[1]==='Status')throw Error(mv+' is a status move.');
    const battle=normalizeBattleState(opt);
    const aa=effectiveSet(att,{attackerTera:opt.attackerTera,teraType:opt.attackerTeraType});
    const dd=effectiveSet(def,{defenderTera:opt.defenderTera,teraType:opt.defenderTeraType});
    const sa=stats(aa,opt.attOver||{});
    const sd=stats(dd,opt.defOver||{});
    const cat=m[1];
    let A=cat==='Physical'?sa.atk:sa.spa;
    let D=cat==='Physical'?sd.def:sd.spd;
    if(m[5]==='def')A=sa.def;
    if(m[5]==='targetDef')D=sd.def;
    A*=stageMultiplier(m[5]==='def'?battle.attackerBulkStage:battle.attackerOffenseStage);
    D*=stageMultiplier(battle.defenderBulkStage);
    const ai=opt.attOver?.item||aa.item;
    const di=opt.defOver?.item||dd.item;
    if(cat==='Physical'&&ai==='Choice Band')A*=1.5;
    if(cat==='Special'&&ai==='Choice Specs')A*=1.5;
    if(cat==='Special'&&di==='Assault Vest')D*=1.5;
    let bp=m[2];
    if(DexAdapter.id(mv)==='weatherball'&&(battle.weather==='sun'||battle.weather==='rain'))bp=100;
    const base=Math.floor(Math.floor(Math.floor((2*(aa.level||100)/5+2)*bp*A/D)/50)+2);
    let moveType=m[0];
    if(DexAdapter.id(mv)==='weatherball'&&battle.weather==='sun')moveType='Fire';
    if(DexAdapter.id(mv)==='weatherball'&&battle.weather==='rain')moveType='Water';
    const atkTypes=opt.attackerTera?[opt.attackerTeraType||aa.tera||types(aa)[0]]:types(aa);
    const defTypes=opt.defenderTera?[opt.defenderTeraType||dd.tera||types(dd)[0]]:types(dd);
    const blockedBy=moveBlockingAbility(moveType,cat,dd.ability);
    const eff=blockedBy?0:mult(moveType,defTypes);
    const stab=atkTypes.includes(moveType)?1.5:1;
    let mod=eff*stab;
    if(battle.helpingHand)mod*=1.5;
    if(ai==='Life Orb')mod*=1.3;
    if(ai==='Expert Belt'&&eff>1)mod*=1.2;
    if(ai==='Black Glasses'&&moveType==='Dark')mod*=1.2;
    if(ai==='Charcoal'&&moveType==='Fire')mod*=1.2;
    if(aa.ability==='Solar Power'&&battle.weather==='sun'&&cat==='Special')mod*=1.5;
    if(battle.weather==='rain'&&moveType==='Water')mod*=1.5;
    if(battle.weather==='rain'&&moveType==='Fire')mod*=0.5;
    if(battle.weather==='sun'&&moveType==='Fire')mod*=1.5;
    if(battle.weather==='sun'&&moveType==='Water')mod*=0.5;
    if((battle.defenderProtect==='reflect'||battle.defenderProtect==='auroraveil')&&cat==='Physical')mod*=0.5;
    if((battle.defenderProtect==='screen'||battle.defenderProtect==='auroraveil')&&cat==='Special')mod*=0.5;
    const rolls=[];
    if(blockedBy)for(let i=0;i<16;i++)rolls.push(0);
    else for(let r=85;r<=100;r++)rolls.push(Math.max(1,Math.floor(base*mod*r/100)));
    const hpPct=+opt.hpPct||100;
    const hz=hazardPct(dd,opt.hazards||'none');
    const max=sd.hp;
    const ehp=Math.max(1,Math.floor(max*Math.max(0,hpPct-hz)/100));
    const hit=(m[3]||100)/100;
    const ko=rolls.filter(x=>x>=ehp).length/16*hit;
    const chanceN=(n=2)=>{let combos=[0];for(let i=0;i<n;i++){let next=[];for(const c of combos)for(const r of rolls)next.push(c+r);combos=next}return combos.filter(x=>x>=ehp).length/combos.length*Math.pow(hit,n)};
    return {att:aa,def:dd,mv,move:m,rolls,max,ehp,hz,min:Math.min(...rolls),maxd:Math.max(...rolls),minp:Math.min(...rolls)/max*100,maxp:Math.max(...rolls)/max*100,ko,two:chanceN(2),three:chanceN(3),eff,hit,moveType,blockedBy,battleState:battle};
  };

  root.renderKo=function renderKoWithBattleState(){
    try{
      const a0=byId('attacker')._items[byId('attacker').value];
      const d0=byId('defender')._items[byId('defender').value];
      const battleState=readKoBattleState();
      const reverseState=swapBattleState(battleState);
      const a={...a0};
      const d={...d0};
      if(byId('attackerTera')?.checked)a.tera=byId('attackerTeraType')?.value||a.tera||types(a)[0];
      if(byId('defenderTera')?.checked)d._defensiveTera=byId('defenderTeraType').value||d.tera||types(d)[0];
      const r=root.dmg(a,d,byId('move').value,{hpPct:+byId('hp').value,hazards:byId('hazards').value,attackerTera:byId('attackerTera')?.checked,attackerTeraType:byId('attackerTeraType')?.value,defenderTera:byId('defenderTera')?.checked,defenderTeraType:byId('defenderTeraType')?.value,...battleState});
      const rev=d0.moves.filter(x=>moveData(x)&&moveCategory(x)!=='Status').map(x=>{
        try{
          const rd={...d0};
          if(byId('defenderTera')?.checked){rd.tera=byId('defenderTeraType').value;rd._defensiveTera=byId('defenderTeraType').value}
          return root.dmg(rd,a,x,{hpPct:100,defenderTera:byId('attackerTera')?.checked,defenderTeraType:byId('attackerTeraType')?.value,...reverseState});
        }catch(e){return null}
      }).filter(Boolean).sort((x,y)=>y.ko-x.ko||y.maxp-x.maxp).slice(0,3);
      const rolls=r.rolls.map(x=>(x/r.max*100).toFixed(1)+'%').join(' · ');
      const hitChance=typeof root.nHitChance==='function'?root.nHitChance:legacyNHitChance;
      const ohko=r.ko,two=hitChance(r,2),three=hitChance(r,3),stateText=battleStateSummary(battleState);
      const followThroughNote=[];
      if(battleState.extraEndSteps)followThroughNote.push(`${battleState.extraEndSteps} extra end-step window${battleState.extraEndSteps===1?'':'s'}`);
      if(battleState.defenderEndStepDamagePct)followThroughNote.push(`${battleState.defenderEndStepDamagePct}% passive chip each end step`);
      byId('ko').className='diag';
      byId('ko').innerHTML=`<div class="threecol"><div class="box"><span class="meta">OHKO odds</span><div class="odds">${(ohko*100).toFixed(1)}%</div><p>${ohko>=1?'Guaranteed OHKO':ohko>0?'This is a roll':'Needs chip or a different play'}</p></div><div class="box"><span class="meta">2HKO odds</span><div class="odds">${(two*100).toFixed(1)}%</div><p>${followThroughNote.length?safeHtml(`Includes ${followThroughNote.join(' plus ')}.`):(d.item==='Leftovers'?'Includes one Leftovers tick.':'No recovery adjustment detected.')}</p></div><div class="box"><span class="meta">3HKO odds</span><div class="odds">${(three*100).toFixed(1)}%</div><p>${r.hz?`Hazards applied: ${r.hz.toFixed(1)}%`:'No hazard chip'}</p></div></div><div class="box"><h3>Damage Range</h3><p>${safeHtml(r.mv)} into ${safeHtml(d0.species)}${d._defensiveTera?` after Tera ${safeHtml(d._defensiveTera)}`:''}: <strong>${r.minp.toFixed(1)}-${r.maxp.toFixed(1)}%</strong></p><p class="muted">Battle state: ${safeHtml(stateText)}</p><p>${rolls}</p><div class="bar"><div style="width:${Math.max(2,ohko*100)}%"></div></div></div><div class="box"><h3>Can they take you out?</h3>${rev.length?`<table><thead><tr><th>Move</th><th>Damage</th><th>OHKO</th><th>2HKO</th></tr></thead><tbody>${rev.map(x=>`<tr><td>${safeHtml(x.mv)}</td><td>${x.minp.toFixed(1)}-${x.maxp.toFixed(1)}%</td><td>${(x.ko*100).toFixed(1)}%</td><td>${(hitChance(x,2)*100).toFixed(1)}%</td></tr>`).join('')}</tbody></table>`:'No damaging moves known.'}</div><div class="box"><h3>Nurse Joyless call</h3><p>${safeHtml(advice(r,rev))}</p></div>`;
    }catch(e){
      byId('ko').className='empty';
      byId('ko').textContent=e.message;
    }
  };

  root.getAgentFacts=function patchedGetAgentFacts(agent){
    const facts=legacyGetAgentFacts?legacyGetAgentFacts(agent):{};
    if(agent==='actuary'){
      const atk=byId('attacker')?.value;
      const def=byId('defender')?.value;
      const move=byId('move')?.value;
      if(atk&&def&&move){
        const a=byId('attacker')._items?.[atk];
        const d=byId('defender')._items?.[def];
        if(a&&d){
          const battleState=readKoBattleState();
          const r=root.dmg(a,d,move,{hpPct:+byId('hp')?.value||100,hazards:byId('hazards')?.value||'none',attackerTera:byId('attackerTera')?.checked,defenderTera:byId('defenderTera')?.checked,attackerTeraType:byId('attackerTeraType')?.value,defenderTeraType:byId('defenderTeraType')?.value,...battleState});
          facts.attacker=a.species;
          facts.defender=d.species;
          facts.move=move;
          facts.koChance=(r.ko*100).toFixed(1);
          try{
            const rm=d.moves.find(m=>moveData(m)&&moveCategory(m)!=='Status')||'Earthquake';
            const rev=root.dmg(d,a,rm,{hpPct:100,...swapBattleState(battleState)});
            facts.reverseKo=(rev.ko*100).toFixed(1);
            facts.reverseMove=rm;
          }catch(e){
            facts.reverseKo='?';
          }
        }
      }
    }
    return facts;
  };

  if(typeof document!=='undefined'){
    const bindKoUpgrade=()=>{
      setStageOptions();
      const calcBtn=byId('calcKo');
      if(calcBtn)calcBtn.onclick=()=>root.renderKo();
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindKoUpgrade);
    else bindKoUpgrade();
  }
})();
