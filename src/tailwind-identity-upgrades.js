(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  if(typeof root.profileTeam!=='function'||typeof root.detectIdentities!=='function'||typeof root.evaluateSynergy!=='function')return;

  const originalProfileTeam=root.profileTeam;
  const originalDetectIdentities=root.detectIdentities;
  const originalEvaluateSynergy=root.evaluateSynergy;
  const priority={'Tailwind Offense':28,'Sun Room':26,'Trick Room Offense':24,'Hazard Stack Fat Balance':22,'Dragon Spam Offense':20,'Rain Offense':18,'Sun Offense':16,'Balance':12,'Bulky Offense':10,'Hyper Offense':8,'Stall':4};
  const TAILWIND_MOVES=['Tailwind'];
  const HANDOFF_MOVES=['U-turn','Volt Switch','Flip Turn','Parting Shot','Teleport','Memento','Healing Wish','Lunar Dance','Baton Pass','Chilly Reception','Explosion','Final Gambit'];

  function hasAnyMove(mon,names=[]){
    const wanted=new Set((Array.isArray(names)?names:[]).map(name=>String(name||'').trim()).filter(Boolean));
    if(!wanted.size)return false;
    return (Array.isArray(mon?.moves)?mon.moves:[]).some(move=>wanted.has(String(move||'').trim()));
  }

  function overlap(values=[],otherValues=[]){
    const wanted=new Set((otherValues||[]).map(value=>String(value||'').trim()).filter(Boolean));
    return root.unique((values||[]).filter(value=>wanted.has(String(value||'').trim())));
  }

  function highestAttackStat(mon){
    return Math.max(Number(mon?.baseStats?.atk)||0,Number(mon?.baseStats?.spa)||0);
  }

  function baseSpeed(mon){
    return Number(mon?.baseStats?.spe)||0;
  }

  function offensiveTypeCount(mon){
    return Array.isArray(mon?.offensiveTypes)?mon.offensiveTypes.length:0;
  }

  function isTailwindSetter(mon){
    return hasAnyMove(mon,TAILWIND_MOVES);
  }

  function isTailwindAbuser(mon){
    const speed=baseSpeed(mon);
    const power=highestAttackStat(mon);
    return speed>=50&&speed<=108&&(power>=110||offensiveTypeCount(mon)>=2);
  }

  function isFastPressure(mon){
    return baseSpeed(mon)>=112&&highestAttackStat(mon)>=100;
  }

  function isSelfSufficientTailwindSetter(mon){
    return isTailwindSetter(mon)&&(
      hasAnyMove(mon,HANDOFF_MOVES)
      || (
        baseSpeed(mon)>=100
        && highestAttackStat(mon)>=105
        && offensiveTypeCount(mon)>=2
      )
    );
  }

  function tailwindHandoffSetters(teamList=[]){
    return teamList.filter(mon=>isTailwindSetter(mon)&&hasAnyMove(mon,HANDOFF_MOVES)).map(mon=>mon.species);
  }

  function realTailwindShell(profile){
    const setters=(profile?.tailwindSetters||[]).length;
    const abusers=(profile?.tailwindExternalAbusers||[]).length;
    const handoff=(profile?.tailwindHandoffSetters||[]).length;
    const selfSufficient=(profile?.tailwindSelfSufficientSetters||[]).length;
    return setters>=1
      && abusers>=2
      && (handoff+selfSufficient)>=1;
  }

  function singleSetterFragileTailwindShell(profile){
    const setters=(profile?.tailwindSetters||[]).length;
    const abusers=(profile?.tailwindExternalAbusers||[]).length;
    const handoff=(profile?.tailwindHandoffSetters||[]).length;
    const selfSufficient=(profile?.tailwindSelfSufficientSetters||[]).length;
    const fastPressure=(profile?.tailwindFastPressure||[]).length;
    return setters===1
      && abusers>=2
      && !handoff
      && !selfSufficient
      && fastPressure>=2;
  }

  function multiSetterShallowTailwindShell(profile){
    const setters=(profile?.tailwindSetters||[]).length;
    const externalAbusers=(profile?.tailwindExternalAbusers||[]).length;
    const selfSufficientSetters=(profile?.tailwindSelfSufficientSetters||[]).length;
    const fastPressure=(profile?.tailwindFastPressure||[]).length;
    const realPayoffs=externalAbusers+selfSufficientSetters;
    return setters>=2
      && fastPressure>=2
      && externalAbusers<=1
      && realPayoffs<=2;
  }

  function multiSetterFragileTailwindShell(profile){
    const setters=(profile?.tailwindSetters||[]).length;
    const externalAbusers=(profile?.tailwindExternalAbusers||[]).length;
    const handoff=(profile?.tailwindHandoffSetters||[]).length;
    const selfSufficient=(profile?.tailwindSelfSufficientSetters||[]).length;
    const fastPressure=(profile?.tailwindFastPressure||[]).length;
    return setters>=2
      && externalAbusers>=2
      && !handoff
      && !selfSufficient
      && fastPressure>=1;
  }

  function fragileTailwindPenalty(profile){
    if(singleSetterFragileTailwindShell(profile)){
      const abusers=(profile?.tailwindExternalAbusers||[]).length;
      const fastPressure=(profile?.tailwindFastPressure||[]).length;
      return 13+Math.max(0,abusers-2)*2+Math.max(0,fastPressure-2)*2;
    }
    if(multiSetterShallowTailwindShell(profile)){
      const setters=(profile?.tailwindSetters||[]).length;
      const fastPressure=(profile?.tailwindFastPressure||[]).length;
      return 14+Math.max(0,setters-2)*2+Math.max(0,fastPressure-2)*2;
    }
    if(multiSetterFragileTailwindShell(profile)){
      const setters=(profile?.tailwindSetters||[]).length;
      const externalAbusers=(profile?.tailwindExternalAbusers||[]).length;
      return 12+Math.max(0,setters-2)*2+Math.max(0,externalAbusers-2);
    }
    return 0;
  }

  function tailwindOffenseScore(profile){
    if(!realTailwindShell(profile))return 0;
    const setters=(profile?.tailwindSetters||[]).length;
    const abusers=(profile?.tailwindExternalAbusers||[]).length;
    const handoff=(profile?.tailwindHandoffSetters||[]).length;
    const selfSufficient=(profile?.tailwindSelfSufficientSetters||[]).length;
    const fastPressure=(profile?.tailwindFastPressure||[]).length;
    const raw=78
      + Math.min(8,Math.max(0,abusers-2)*4)
      + Math.min(4,Math.max(0,setters-1)*2)
      + Math.min(4,(handoff+selfSufficient)*2)
      - Math.min(6,Math.max(0,fastPressure-2)*2);
    return root.njCap(raw,94);
  }

  function cloneIdentityRow(row={}){
    return {...row,evidence:[...(row.evidence||[])]};
  }

  function addEvidence(row,label=''){
    const text=String(label||'').trim();
    if(!row||!text)return;
    row.evidence=root.unique([...(row.evidence||[]),text]).slice(0,5);
  }

  root.profileTeam=function patchedProfileTeam(t=root.team,a=root.analysis){
    const profile=originalProfileTeam.call(this,t,a);
    const teamList=Array.isArray(t)?t:[];
    profile.tailwindSetters=teamList.filter(isTailwindSetter).map(mon=>mon.species);
    profile.tailwindAbusers=teamList.filter(isTailwindAbuser).map(mon=>mon.species);
    profile.tailwindExternalAbusers=(profile?.tailwindAbusers||[]).filter(species=>!(profile?.tailwindSetters||[]).includes(species));
    profile.tailwindHandoffSetters=tailwindHandoffSetters(teamList);
    profile.tailwindSelfSufficientSetters=teamList.filter(isSelfSufficientTailwindSetter).map(mon=>mon.species);
    profile.tailwindFastPressure=teamList.filter(mon=>isFastPressure(mon)&&!isTailwindSetter(mon)).map(mon=>mon.species);
    return profile;
  };

  root.detectIdentities=function patchedDetectIdentities(t=root.team,a=root.analysis,p=root.profileTeam(t,a)){
    const profile=p||root.profileTeam(t,a);
    const result=originalDetectIdentities.call(this,t,a,profile);
    const realTailwind=realTailwindShell(profile);
    const fragileSingleSetter=singleSetterFragileTailwindShell(profile);
    const shallowMultiSetter=multiSetterShallowTailwindShell(profile);
    const fragileMultiSetter=multiSetterFragileTailwindShell(profile);
    if(!realTailwind&&!fragileSingleSetter&&!shallowMultiSetter&&!fragileMultiSetter)return result;

    const rows=(result?.all||[]).map(cloneIdentityRow);
    const hyperOffense=rows.find(row=>row.name==='Hyper Offense');
    const bulkyOffense=rows.find(row=>row.name==='Bulky Offense');
    const balance=rows.find(row=>row.name==='Balance');
    let tailwind=rows.find(row=>row.name==='Tailwind Offense');
    if(!tailwind){
      tailwind={name:'Tailwind Offense',score:0,evidence:[]};
      rows.push(tailwind);
    }

    if(realTailwind){
      tailwind.score=Math.max(tailwind.score||0,tailwindOffenseScore(profile));
      addEvidence(tailwind,'the team has a real Tailwind package with outside breakers that actually convert the speed boost');
      if((profile?.tailwindHandoffSetters||[]).length){
        addEvidence(tailwind,'at least one Tailwind setter can pivot or sacrifice itself to pass the boosted turns cleanly');
      }
      if((profile?.tailwindSelfSufficientSetters||[]).length){
        addEvidence(tailwind,'the Tailwind package includes a setter that still pressures the field after it spends the setup turn');
      }
    }

    if(fragileSingleSetter||shallowMultiSetter||fragileMultiSetter){
      const penalty=fragileTailwindPenalty(profile);
      if(tailwind){
        tailwind.score=root.njCap((tailwind.score||0)-penalty,94);
      }
      if(hyperOffense){
        hyperOffense.score=root.njCap((hyperOffense.score||0)-Math.max(8,penalty-2),96);
      }
      if(bulkyOffense){
        bulkyOffense.score=root.njCap((bulkyOffense.score||0)-Math.max(6,penalty-4),96);
      }
      if(balance&&(hyperOffense||bulkyOffense)){
        balance.score=root.njCap((balance.score||0)+4,96);
      }
      if(fragileSingleSetter){
        addEvidence(tailwind,'the lone Tailwind setter cannot hand the boosted turns cleanly into the breaker core');
        addEvidence(tailwind,'one passive Tailwind slot is carrying too much of the speed-control burden by itself');
        if(hyperOffense){
          addEvidence(hyperOffense,'the Tailwind package is too fragile to serve as a reliable speed-control backbone by itself');
        }
        if(bulkyOffense){
          addEvidence(bulkyOffense,'the Tailwind package is too fragile to give the team a dependable offensive tempo plan');
        }
      }
      if(shallowMultiSetter){
        addEvidence(tailwind,'multiple Tailwind setters are present, but too few real mid-speed breakers exist outside those support slots');
        addEvidence(tailwind,'the team spends multiple slots on Tailwind without enough genuine payoff pieces to justify the burden');
        if(hyperOffense){
          addEvidence(hyperOffense,'the Tailwind package uses several support slots without enough real beneficiaries to justify them');
        }
        if(bulkyOffense){
          addEvidence(bulkyOffense,'the Tailwind package looks broader than it really is because the real payoff core is still too thin');
        }
      }
      if(fragileMultiSetter){
        addEvidence(tailwind,'multiple passive Tailwind setters still cannot pass the boosted turns cleanly into the payoff core');
        addEvidence(tailwind,'the Tailwind package advertises several abusers, but none of the setters pivot, sacrifice, or threaten enough on their own');
        if(hyperOffense){
          addEvidence(hyperOffense,'the Tailwind turns are too hard to hand off cleanly for a real tempo-based offense');
        }
        if(bulkyOffense){
          addEvidence(bulkyOffense,'the Tailwind support exists on paper, but the setters still waste too many boosted turns getting breakers in');
        }
      }
    }

    rows.sort((left,right)=>(right.score-left.score)||((priority[right.name]||0)-(priority[left.name]||0)));
    return {
      primary:rows[0],
      secondary:rows.slice(1,5).filter(row=>row.score>=35),
      all:rows,
    };
  };

  root.evaluateSynergy=function patchedEvaluateSynergy(t=root.team,a=root.analysis,p=root.profileTeam(t,a),identity=root.detectIdentities(t,a,p)){
    const profile=p||root.profileTeam(t,a);
    const synergy=originalEvaluateSynergy.call(this,t,a,profile,identity);
    const fragileSingleSetter=singleSetterFragileTailwindShell(profile);
    const shallowMultiSetter=multiSetterShallowTailwindShell(profile);
    const fragileMultiSetter=multiSetterFragileTailwindShell(profile);
    if(!fragileSingleSetter&&!shallowMultiSetter&&!fragileMultiSetter)return synergy;

    const next={...synergy,scores:{...(synergy?.scores||{})},issues:[...(synergy?.issues||[])]};
    next.scores.winReliability=root.njCap((next.scores.winReliability||0)-(fragileSingleSetter?6:5),92);
    next.scores.speedControl=root.njCap((next.scores.speedControl||0)-(fragileSingleSetter?7:6),92);
    next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-4,92);
    if(fragileSingleSetter&&!next.issues.some(issue=>issue?.title==='Single Tailwind setter cannot hand turns off cleanly')){
      next.issues.push({
        severity:'bad',
        title:'Single Tailwind setter cannot hand turns off cleanly',
        detail:'The team has a few real Tailwind beneficiaries on paper, but one passive Tailwind slot is carrying the whole plan alone. Without pivot, sacrifice, or meaningful follow-through from that setter, too many boosted turns disappear before the breakers actually cash them in.'
      });
    }
    if(shallowMultiSetter&&!next.issues.some(issue=>issue?.title==='Multi-setter Tailwind shell lacks enough real payoffs')){
      next.issues.push({
        severity:'bad',
        title:'Multi-setter Tailwind shell lacks enough real payoffs',
        detail:'The team has multiple Tailwind setters, but too few genuine mid-speed breakers exist outside those support slots. That turns the Tailwind package into support burden instead of a reliable offensive conversion layer.'
      });
    }
    if(fragileMultiSetter&&!next.issues.some(issue=>issue?.title==='Passive multi-setter Tailwind shell still loses too many boosted turns')){
      next.issues.push({
        severity:'bad',
        title:'Passive multi-setter Tailwind shell still loses too many boosted turns',
        detail:'The team has several Tailwind setters and enough nominal payoffs on paper, but none of those setters pivot, sacrifice, or threaten enough on their own to pass the boosted turns cleanly. Too many Tailwind turns vanish while the team is still trying to bring the real breakers onto the field.'
      });
    }
    return next;
  };
})();