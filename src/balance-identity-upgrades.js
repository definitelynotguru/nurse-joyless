(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  if(typeof root.profileTeam!=='function'||typeof root.detectIdentities!=='function'||typeof root.evaluateSynergy!=='function')return;

  const originalDetectIdentities=root.detectIdentities;
  const originalEvaluateSynergy=root.evaluateSynergy;
  const priority={'Balance':12,'Stall':4};

  function falseBalanceShell(profile){
    const anchors=(profile?.stallAnchors||[]).length;
    const progress=(profile?.stallProgressPieces||[]).length;
    const recovery=(profile?.recoveryAnchors||[]).length;
    const closers=(profile?.bulkyOffenseClosers||[]).length;
    const pivots=(profile?.stallPivots||[]).length;
    const fastAttackers=(profile?.fastAttackers||[]).length;
    const setupAttackers=(profile?.setupAttackers||[]).length;
    return anchors>=4&&progress>=4&&recovery>=4&&closers<=1&&fastAttackers<=1&&setupAttackers<=1&&pivots<=2;
  }

  function falseBalancePenalty(profile){
    if(!falseBalanceShell(profile))return 0;
    const anchors=(profile?.stallAnchors||[]).length;
    const progress=(profile?.stallProgressPieces||[]).length;
    const recovery=(profile?.recoveryAnchors||[]).length;
    const closers=(profile?.bulkyOffenseClosers||[]).length;
    const pivots=(profile?.stallPivots||[]).length;
    const extraCloserPenalty=closers===0?12:0;
    return 26+Math.max(0,anchors-4)*4+Math.max(0,progress-4)*4+Math.max(0,recovery-4)*4+Math.max(0,1-closers)*10+extraCloserPenalty+Math.max(0,2-pivots)*2;
  }

  function semistallBoost(profile){
    if(!falseBalanceShell(profile))return 0;
    const anchors=(profile?.stallAnchors||[]).length;
    const progress=(profile?.stallProgressPieces||[]).length;
    const recovery=(profile?.recoveryAnchors||[]).length;
    const closers=(profile?.bulkyOffenseClosers||[]).length;
    const closerlessBoost=closers===0?8:0;
    return 8+Math.max(0,anchors-4)*2+Math.max(0,progress-4)*2+Math.max(0,recovery-4)*2+Math.max(0,1-closers)*6+closerlessBoost;
  }

  function cloneIdentityRow(row={}){
    return {...row,evidence:[...(row.evidence||[])]};
  }

  function addEvidence(row,label=''){
    const text=String(label||'').trim();
    if(!row||!text)return;
    row.evidence=root.unique([...(row.evidence||[]),text]).slice(0,5);
  }

  root.detectIdentities=function patchedBalanceDetectIdentities(t=root.team,a=root.analysis,p=root.profileTeam(t,a)){
    const profile=p||root.profileTeam(t,a);
    const result=originalDetectIdentities.call(this,t,a,profile);
    if(!falseBalanceShell(profile))return result;

    const rows=(result?.all||[]).map(cloneIdentityRow);
    const balance=rows.find(row=>row?.name==='Balance');
    const stall=rows.find(row=>row?.name==='Stall');
    if(balance){
      balance.score=root.njCap((balance.score||0)-falseBalancePenalty(profile),93);
      if((profile?.bulkyOffenseClosers||[]).length===0)addEvidence(balance,'the shell has no true closer, so balance pressure is mostly theoretical');
      addEvidence(balance,'recovery-and-status core is doing more work than the supposed balance pressure');
      if((profile?.bulkyOffenseClosers||[]).length<=1)addEvidence(balance,'only one real closer is carrying almost all of the forward pressure');
      if((profile?.stallProgressPieces||[]).length>=4)addEvidence(balance,'the team is converting turns through attrition more than balanced trading');
      if((profile?.recoveryAnchors||[]).length>=4)addEvidence(balance,'multiple recovery anchors push this closer to semistall than generic balance');
    }
    if(stall){
      stall.score=root.njCap((stall.score||0)+semistallBoost(profile),93);
      if((profile?.bulkyOffenseClosers||[]).length===0)addEvidence(stall,'without a true closer, the structure behaves like full semistall pressure');
      addEvidence(stall,'attrition and recovery are carrying more of the game plan than balanced trading');
      if((profile?.bulkyOffenseClosers||[]).length<=1)addEvidence(stall,'the shell relies on at most one real closer while the rest of the team grinds progress');
    }

    rows.sort((left,right)=>(right.score-left.score)||((priority[right.name]||0)-(priority[left.name]||0)));
    return {
      primary:rows[0],
      secondary:rows.slice(1,5).filter(row=>row.score>=35),
      all:rows,
    };
  };

  root.evaluateSynergy=function patchedBalanceEvaluateSynergy(t=root.team,a=root.analysis,p=root.profileTeam(t,a),identity=root.detectIdentities(t,a,p)){
    const profile=p||root.profileTeam(t,a);
    const synergy=originalEvaluateSynergy.call(this,t,a,profile,identity);
    if(!falseBalanceShell(profile))return synergy;

    const next={...synergy,scores:{...(synergy?.scores||{})},issues:[...(synergy?.issues||[])]};
    const closerlessPenalty=(profile?.bulkyOffenseClosers||[]).length===0?3:0;
    next.scores.winReliability=root.njCap((next.scores.winReliability||0)-8-closerlessPenalty,92);
    next.scores.offensiveCoverage=root.njCap((next.scores.offensiveCoverage||0)-9-closerlessPenalty,92);
    next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-6-closerlessPenalty,92);
    if(!next.issues.some(issue=>issue?.title==='Balance read overstates a semistall shell')){
      next.issues.push({severity:'warn',title:'Balance read overstates a semistall shell',detail:'The team has enough glue to avoid a pure stall label, but most of its real progress still comes from recovery, status, and chip. With one or zero real closers, it behaves more like semistall than a balanced trading shell.'});
    }
    return next;
  };
})();
