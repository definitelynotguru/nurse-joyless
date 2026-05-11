(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  if(typeof root.profileTeam!=='function'||typeof root.detectIdentities!=='function'||typeof root.evaluateSynergy!=='function')return;

  const originalProfileTeam=root.profileTeam;
  const originalDetectIdentities=root.detectIdentities;
  const originalEvaluateSynergy=root.evaluateSynergy;
  const priority={'Webs Offense':29,'Screens Offense':27,'Sun Room':26,'Tailwind Offense':24,'Trick Room Offense':22,'Hazard Stack Fat Balance':20,'Dragon Spam Offense':18,'Rain Offense':16,'Sun Offense':14,'Balance':12,'Bulky Offense':10,'Hyper Offense':8,'Stall':4};
  const WEBS_MOVES=['Sticky Web'];
  const SETUP_MOVES=['Dragon Dance','Swords Dance','Nasty Plot','Calm Mind','Bulk Up','Quiver Dance','Agility','Rock Polish','Shell Smash','Trailblaze','Curse'];
  const OFFENSIVE_ITEMS=['Choice Specs','Choice Band','Choice Scarf','Life Orb','Booster Energy','Expert Belt','Loaded Dice','Black Glasses','Lum Berry','Focus Sash','Weakness Policy'];
  const WEBS_IMMUNE_ABILITIES=['Levitate'];
  const WEBS_IMMUNE_ITEMS=['Heavy-Duty Boots','Air Balloon'];
  const GROUND_TYPES=['Flying'];

  function hasAnyMove(mon,names=[]){
    const wanted=new Set((Array.isArray(names)?names:[]).map(name=>String(name||'').trim()).filter(Boolean));
    if(!wanted.size)return false;
    return (Array.isArray(mon?.moves)?mon.moves:[]).some(move=>wanted.has(String(move||'').trim()));
  }

  function moveCount(mon,names=[]){
    const wanted=new Set((Array.isArray(names)?names:[]).map(name=>String(name||'').trim()).filter(Boolean));
    if(!wanted.size)return 0;
    return (Array.isArray(mon?.moves)?mon.moves:[]).filter(move=>wanted.has(String(move||'').trim())).length;
  }

  function offensiveTypeCount(mon){
    return Array.isArray(mon?.offensiveTypes)?mon.offensiveTypes.length:0;
  }

  function highestAttackStat(mon){
    return Math.max(Number(mon?.baseStats?.atk)||0,Number(mon?.baseStats?.spa)||0);
  }

  function baseSpeed(mon){
    return Number(mon?.baseStats?.spe)||0;
  }

  function abilityName(mon){
    return String(mon?.ability||'').trim();
  }

  function itemName(mon){
    return String(mon?.item||'').trim();
  }

  function isWebsSetter(mon){
    return hasAnyMove(mon,WEBS_MOVES);
  }

  function isOffensiveMon(mon){
    return offensiveTypeCount(mon)>=2||highestAttackStat(mon)>=110;
  }

  function isSetupAbuser(mon){
    return hasAnyMove(mon,SETUP_MOVES)&&isOffensiveMon(mon);
  }

  function isFastPressure(mon){
    return isOffensiveMon(mon)&&baseSpeed(mon)>=112&&highestAttackStat(mon)>=100;
  }

  function hasGroundImmunity(mon){
    const types=Array.isArray(mon?.types)?mon.types:[];
    return types.some(type=>GROUND_TYPES.includes(String(type||'').trim()))
      || WEBS_IMMUNE_ABILITIES.includes(abilityName(mon))
      || WEBS_IMMUNE_ITEMS.includes(itemName(mon))
      || !!mon?.airborne;
  }

  function isGroundedWebsAbuser(mon){
    if(hasGroundImmunity(mon))return false;
    if(!isOffensiveMon(mon))return false;
    const speed=baseSpeed(mon);
    return speed>=55&&speed<=108;
  }

  function isGroundedWebsCloser(mon){
    if(hasGroundImmunity(mon))return false;
    return isGroundedWebsAbuser(mon)||isSetupAbuser(mon)||OFFENSIVE_ITEMS.includes(itemName(mon));
  }

  function isSelfSufficientWebsSetter(mon){
    return isWebsSetter(mon)&&(
      isOffensiveMon(mon)
      || hasAnyMove(mon,['U-turn','Volt Switch','Parting Shot','Memento','Explosion','Final Gambit'])
      || moveCount(mon,['Sticky Web','Spikes','Stealth Rock','Toxic Spikes'])>=2
    );
  }

  function overlap(values=[],otherValues=[]){
    const wanted=new Set((otherValues||[]).map(value=>String(value||'').trim()).filter(Boolean));
    return root.unique((values||[]).filter(value=>wanted.has(String(value||'').trim())));
  }

  function realWebsShell(profile){
    const setters=(profile?.websSetters||[]).length;
    const abusers=(profile?.websExternalGroundedAbusers||[]).length;
    const closers=(profile?.websExternalGroundedClosers||[]).length;
    const supportQuality=(profile?.websSelfSufficientSetters||[]).length;
    const fastPressure=(profile?.websNativeFastPressure||[]).length;
    const anchors=(profile?.websRecoveryAnchors||[]).length;
    return setters>=1&&abusers>=3&&closers>=3&&supportQuality>=1&&fastPressure<=2&&anchors<=1;
  }

  function shallowWebsShell(profile){
    const setters=(profile?.websSetters||[]).length;
    const abusers=(profile?.websExternalGroundedAbusers||[]).length;
    const closers=(profile?.websExternalGroundedClosers||[]).length;
    const fastPressure=(profile?.websNativeFastPressure||[]).length;
    const immune=(profile?.websImmuneOffense||[]).length;
    return setters>=1&&abusers<=1&&closers<=3&&(fastPressure>=2||immune>=2);
  }

  function bulkyWebsSupportShell(profile){
    const setters=(profile?.websSetters||[]).length;
    const abusers=(profile?.websExternalGroundedAbusers||[]).length;
    const anchors=(profile?.websRecoveryAnchors||[]).length;
    const pivots=(profile?.pivot||[]).length;
    return setters>=1&&abusers>=1&&anchors>=3&&pivots>=2;
  }

  function fakeWebsPenalty(profile){
    if(shallowWebsShell(profile)){
      const immune=(profile?.websImmuneOffense||[]).length;
      const fastPressure=(profile?.websNativeFastPressure||[]).length;
      return 14+Math.max(0,immune-2)*2+Math.max(0,fastPressure-2)*2;
    }
    if(bulkyWebsSupportShell(profile)){
      const anchors=(profile?.websRecoveryAnchors||[]).length;
      return 12+Math.max(0,anchors-3)*2;
    }
    return 0;
  }

  function websOffenseScore(profile){
    if(!realWebsShell(profile))return 0;
    const setters=(profile?.websSetters||[]).length;
    const abusers=(profile?.websExternalGroundedAbusers||[]).length;
    const closers=(profile?.websExternalGroundedClosers||[]).length;
    const supportQuality=(profile?.websSelfSufficientSetters||[]).length;
    const raw=82
      + Math.min(6,Math.max(0,abusers-3)*3)
      + Math.min(4,Math.max(0,closers-3)*2)
      + Math.min(4,supportQuality*2)
      + Math.min(2,Math.max(0,setters-1)*2);
    return root.njCap(raw,95);
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
    profile.websSetters=teamList.filter(isWebsSetter).map(mon=>mon.species);
    profile.websGroundedAbusers=teamList.filter(isGroundedWebsAbuser).map(mon=>mon.species);
    profile.websGroundedClosers=teamList.filter(isGroundedWebsCloser).map(mon=>mon.species);
    profile.websExternalGroundedAbusers=(profile.websGroundedAbusers||[]).filter(species=>!(profile.websSetters||[]).includes(species));
    profile.websExternalGroundedClosers=(profile.websGroundedClosers||[]).filter(species=>!(profile.websSetters||[]).includes(species));
    profile.websSelfSufficientSetters=teamList.filter(isSelfSufficientWebsSetter).map(mon=>mon.species);
    profile.websNativeFastPressure=teamList.filter(mon=>isFastPressure(mon)&&!isWebsSetter(mon)).map(mon=>mon.species);
    profile.websImmuneOffense=teamList.filter(mon=>!isWebsSetter(mon)&&hasGroundImmunity(mon)&&isOffensiveMon(mon)).map(mon=>mon.species);
    profile.websRecoveryAnchors=overlap(profile.recoveryAnchors||[],teamList.map(mon=>mon.species));
    return profile;
  };

  root.detectIdentities=function patchedDetectIdentities(t=root.team,a=root.analysis,p=root.profileTeam(t,a)){
    const profile=p||root.profileTeam(t,a);
    const result=originalDetectIdentities.call(this,t,a,profile);
    const realWebs=realWebsShell(profile);
    const shallow=shallowWebsShell(profile);
    const bulkySupport=bulkyWebsSupportShell(profile);
    if(!realWebs&&!shallow&&!bulkySupport)return result;

    const rows=(result?.all||[]).map(cloneIdentityRow);
    const hyper=rows.find(row=>row.name==='Hyper Offense');
    const bulky=rows.find(row=>row.name==='Bulky Offense');
    const balance=rows.find(row=>row.name==='Balance');
    let webs=rows.find(row=>row.name==='Webs Offense');
    if(!webs){
      webs={name:'Webs Offense',score:0,evidence:[]};
      rows.push(webs);
    }

    if(realWebs){
      webs.score=Math.max(webs.score||0,websOffenseScore(profile));
      addEvidence(webs,'the team has a real Sticky Web plan with grounded breakers that actually cash the speed drop');
      if((profile?.websSelfSufficientSetters||[]).length){
        addEvidence(webs,'the Sticky Web setter still pressures the field or stacks hazards instead of existing as dead support weight');
      }
    }

    if(shallow||bulkySupport){
      const penalty=fakeWebsPenalty(profile);
      webs.score=root.njCap((webs.score||0)-penalty,95);
      if(hyper){
        hyper.score=root.njCap((hyper.score||0)-Math.max(8,penalty-2),96);
      }
      if(bulky){
        bulky.score=root.njCap((bulky.score||0)-Math.max(5,penalty-5),96);
      }
      if(balance&&(hyper||bulky)){
        balance.score=root.njCap((balance.score||0)+4,96);
      }
      if(shallow){
        addEvidence(webs,'the Sticky Web slot exists, but too few grounded mid-speed attackers actually need or exploit the drop');
        addEvidence(webs,'too much of the offense is already naturally fast or immune to webs for the support to be a real identity backbone');
        if(hyper){
          addEvidence(hyper,'the webs package looks louder than its true payoff because several attackers would be playing the same game without it');
        }
      }
      if(bulkySupport){
        addEvidence(webs,'the Sticky Web support is mostly propping up a bulky glue shell instead of a real avalanche offense');
        addEvidence(webs,'too many recovery pivots and defensive anchors remain for the roster to behave like committed webs offense');
        if(bulky){
          addEvidence(bulky,'the roster still plays more like bulky offense or balance than a team that truly lives off Sticky Web pressure');
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
    const next={...synergy,scores:{...(synergy?.scores||{})},issues:[...(synergy?.issues||[])]};

    if(shallowWebsShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-7,92);
      next.scores.speedControl=root.njCap((next.scores.speedControl||0)-6,92);
      next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-4,92);
      if(!next.issues.some(issue=>issue?.title==='Sticky Web support lacks enough grounded payoffs')){
        next.issues.push({
          severity:'bad',
          title:'Sticky Web support lacks enough grounded payoffs',
          detail:'The team can set Sticky Web, but too few grounded mid-speed attackers actually convert that speed drop into pressure. Several teammates are already naturally fast or ignore webs entirely, so the support exists on paper without enough real payoff behind it.'
        });
      }
    }

    if(bulkyWebsSupportShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-6,92);
      next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-5,92);
      if(!next.issues.some(issue=>issue?.title==='Sticky Web is propping up a bulky glue shell')){
        next.issues.push({
          severity:'warn',
          title:'Sticky Web is propping up a bulky glue shell',
          detail:'The team has a Sticky Web button, but too much of the roster is still doing recovery, pivot, and anchor work for the result to behave like real webs offense. The hazard is helping, but it is not the actual structural backbone.'
        });
      }
    }

    return next;
  };
})();