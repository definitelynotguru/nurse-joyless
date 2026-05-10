(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  if(typeof root.profileTeam!=='function'||typeof root.detectIdentities!=='function'||typeof root.evaluateSynergy!=='function')return;

  const originalProfileTeam=root.profileTeam;
  const originalDetectIdentities=root.detectIdentities;
  const originalEvaluateSynergy=root.evaluateSynergy;
  const priority={'Screens Offense':27,'Sun Room':26,'Tailwind Offense':24,'Trick Room Offense':22,'Hazard Stack Fat Balance':20,'Dragon Spam Offense':18,'Rain Offense':16,'Sun Offense':14,'Balance':12,'Bulky Offense':10,'Hyper Offense':8,'Stall':4};
  const SCREEN_MOVES=['Reflect','Light Screen','Aurora Veil'];
  const HANDOFF_MOVES=['U-turn','Volt Switch','Flip Turn','Parting Shot','Teleport','Memento','Healing Wish','Lunar Dance','Baton Pass','Explosion','Final Gambit','Chilly Reception'];
  const SETUP_MOVES=['Dragon Dance','Swords Dance','Nasty Plot','Calm Mind','Bulk Up','Quiver Dance','Agility','Rock Polish','Shell Smash','Trailblaze','Curse'];
  const OFFENSIVE_ITEMS=['Choice Specs','Choice Band','Choice Scarf','Life Orb','Booster Energy','Expert Belt','Loaded Dice','Black Glasses','Lum Berry','Focus Sash','Weakness Policy'];

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

  function isScreensSetter(mon){
    return hasAnyMove(mon,SCREEN_MOVES);
  }

  function isDualScreensSetter(mon){
    return moveCount(mon,['Reflect','Light Screen'])>=2||hasAnyMove(mon,['Aurora Veil']);
  }

  function isClaySetter(mon){
    return isScreensSetter(mon)&&String(mon?.item||'').trim()==='Light Clay';
  }

  function isOffensiveMon(mon){
    return offensiveTypeCount(mon)>=2||highestAttackStat(mon)>=110;
  }

  function isSetupAbuser(mon){
    return hasAnyMove(mon,SETUP_MOVES)&&isOffensiveMon(mon);
  }

  function isFastPressure(mon){
    return isOffensiveMon(mon)&&(baseSpeed(mon)>=95||highestAttackStat(mon)>=125);
  }

  function isScreensCloser(mon){
    return isSetupAbuser(mon)||OFFENSIVE_ITEMS.includes(String(mon?.item||'').trim())||isFastPressure(mon);
  }

  function isSelfSufficientSetter(mon){
    return isScreensSetter(mon)&&(
      hasAnyMove(mon,HANDOFF_MOVES)
      || (baseSpeed(mon)>=105&&highestAttackStat(mon)>=120&&offensiveTypeCount(mon)>=2)
      || hasAnyMove(mon,['Memento','Explosion','Final Gambit'])
    );
  }

  function overlap(values=[],otherValues=[]){
    const wanted=new Set((otherValues||[]).map(value=>String(value||'').trim()).filter(Boolean));
    return root.unique((values||[]).filter(value=>wanted.has(String(value||'').trim())));
  }

  function realScreensShell(profile){
    const setters=(profile?.screensSetters||[]).length;
    const abusers=(profile?.screensExternalAbusers||[]).length;
    const closers=(profile?.screensExternalClosers||[]).length;
    const supportQuality=(profile?.screensHandoffSetters||[]).length+(profile?.screensSelfSufficientSetters||[]).length+(profile?.screensClaySetters||[]).length;
    const anchors=(profile?.screensRecoveryAnchors||[]).length;
    return setters>=1&&abusers>=2&&closers>=3&&supportQuality>=1&&anchors<=1;
  }

  function fragileSingleSetterScreensShell(profile){
    const setters=(profile?.screensSetters||[]).length;
    const closers=(profile?.screensExternalClosers||[]).length;
    const supportQuality=(profile?.screensHandoffSetters||[]).length+(profile?.screensSelfSufficientSetters||[]).length;
    const anchors=(profile?.screensRecoveryAnchors||[]).length;
    const pivots=(profile?.pivot||[]).length;
    return setters===1&&closers>=3&&!supportQuality&&anchors>=2&&pivots>=2;
  }

  function shallowMultiSetterScreensShell(profile){
    const setters=(profile?.screensSetters||[]).length;
    const abusers=(profile?.screensExternalAbusers||[]).length;
    const closers=(profile?.screensExternalClosers||[]).length;
    const anchors=(profile?.screensRecoveryAnchors||[]).length;
    return setters>=2&&abusers<=2&&closers<=3&&anchors>=2;
  }

  function bulkyScreensSupportShell(profile){
    const setters=(profile?.screensSetters||[]).length;
    const abusers=(profile?.screensExternalAbusers||[]).length;
    const anchors=(profile?.screensRecoveryAnchors||[]).length;
    const pivots=(profile?.pivot||[]).length;
    const closers=(profile?.screensExternalClosers||[]).length;
    return setters>=1&&abusers>=2&&closers>=2&&anchors>=3&&pivots>=2;
  }

  function screensOffenseScore(profile){
    if(!realScreensShell(profile))return 0;
    const setters=(profile?.screensSetters||[]).length;
    const abusers=(profile?.screensExternalAbusers||[]).length;
    const closers=(profile?.screensExternalClosers||[]).length;
    const supportQuality=(profile?.screensHandoffSetters||[]).length+(profile?.screensSelfSufficientSetters||[]).length+(profile?.screensClaySetters||[]).length;
    const raw=80
      + Math.min(6,Math.max(0,abusers-2)*3)
      + Math.min(4,Math.max(0,closers-3)*2)
      + Math.min(4,supportQuality*2)
      + Math.min(2,Math.max(0,setters-1)*2);
    return root.njCap(raw,95);
  }

  function fragileScreensPenalty(profile){
    if(fragileSingleSetterScreensShell(profile)){
      const anchors=(profile?.screensRecoveryAnchors||[]).length;
      return 14+Math.max(0,anchors-2)*2;
    }
    if(shallowMultiSetterScreensShell(profile)){
      const setters=(profile?.screensSetters||[]).length;
      return 15+Math.max(0,setters-2)*2;
    }
    if(bulkyScreensSupportShell(profile)){
      const anchors=(profile?.screensRecoveryAnchors||[]).length;
      return 12+Math.max(0,anchors-3)*2;
    }
    return 0;
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
    profile.screensSetters=teamList.filter(isScreensSetter).map(mon=>mon.species);
    profile.screensDualSetters=teamList.filter(isDualScreensSetter).map(mon=>mon.species);
    profile.screensClaySetters=teamList.filter(isClaySetter).map(mon=>mon.species);
    profile.screensHandoffSetters=teamList.filter(mon=>isScreensSetter(mon)&&hasAnyMove(mon,HANDOFF_MOVES)).map(mon=>mon.species);
    profile.screensSelfSufficientSetters=teamList.filter(isSelfSufficientSetter).map(mon=>mon.species);
    profile.screensAbusers=teamList.filter(isSetupAbuser).map(mon=>mon.species);
    profile.screensClosers=teamList.filter(isScreensCloser).map(mon=>mon.species);
    profile.screensExternalAbusers=(profile.screensAbusers||[]).filter(species=>!(profile.screensSetters||[]).includes(species));
    profile.screensExternalClosers=(profile.screensClosers||[]).filter(species=>!(profile.screensSetters||[]).includes(species));
    profile.screensRecoveryAnchors=overlap(profile.recoveryAnchors||[],teamList.filter(mon=>true).map(mon=>mon.species));
    return profile;
  };

  root.detectIdentities=function patchedDetectIdentities(t=root.team,a=root.analysis,p=root.profileTeam(t,a)){
    const profile=p||root.profileTeam(t,a);
    const result=originalDetectIdentities.call(this,t,a,profile);
    const realScreens=realScreensShell(profile);
    const fragileSingle=fragileSingleSetterScreensShell(profile);
    const shallowMulti=shallowMultiSetterScreensShell(profile);
    const bulkySupport=bulkyScreensSupportShell(profile);
    if(!realScreens&&!fragileSingle&&!shallowMulti&&!bulkySupport)return result;

    const rows=(result?.all||[]).map(cloneIdentityRow);
    const hyper=rows.find(row=>row.name==='Hyper Offense');
    const bulky=rows.find(row=>row.name==='Bulky Offense');
    const balance=rows.find(row=>row.name==='Balance');
    let screens=rows.find(row=>row.name==='Screens Offense');
    if(!screens){
      screens={name:'Screens Offense',score:0,evidence:[]};
      rows.push(screens);
    }

    if(realScreens){
      screens.score=Math.max(screens.score||0,screensOffenseScore(profile));
      addEvidence(screens,'the team has a real screens package with setup and closing threats that actually cash the protection turns');
      if((profile?.screensClaySetters||[]).length){
        addEvidence(screens,'at least one screen setter is extending the support window with Light Clay');
      }
      if((profile?.screensHandoffSetters||[]).length){
        addEvidence(screens,'the screens setter can pivot or sacrifice itself so the abusers enter while the support is still live');
      }
    }

    if(fragileSingle||shallowMulti||bulkySupport){
      const penalty=fragileScreensPenalty(profile);
      screens.score=root.njCap((screens.score||0)-penalty,95);
      if(hyper){
        hyper.score=root.njCap((hyper.score||0)-Math.max(8,penalty-2),96);
      }
      if(bulky){
        bulky.score=root.njCap((bulky.score||0)-Math.max(5,penalty-5),96);
      }
      if(balance&&(hyper||bulky)){
        balance.score=root.njCap((balance.score||0)+4,96);
      }
      if(fragileSingle){
        addEvidence(screens,'the lone screens setter cannot hand the support turns cleanly into the payoff core');
        addEvidence(screens,'one passive screens slot is carrying too much of the protective burden by itself');
        if(hyper){
          addEvidence(hyper,'the screens button exists, but the team still leans on bulky glue to get its threats in safely');
        }
      }
      if(shallowMulti){
        addEvidence(screens,'multiple screens setters are present, but too few real setup or closing threats exist outside those support slots');
        addEvidence(screens,'the team spends several slots on protection without enough payoff pieces to justify the burden');
        if(hyper){
          addEvidence(hyper,'the screens shell is broader on paper than it is in actual offensive conversion');
        }
      }
      if(bulkySupport){
        addEvidence(screens,'the screens support is mostly propping up a bulky glue shell instead of a real all-in offense');
        addEvidence(screens,'too many recovery pivots and defensive anchors remain for the team to behave like true screens offense');
        if(bulky){
          addEvidence(bulky,'the roster still plays more like bulky offense or balance than a committed screens avalanche');
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

    if(fragileSingleSetterScreensShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-7,92);
      next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-5,92);
      next.scores.offensiveCoverage=root.njCap((next.scores.offensiveCoverage||0)-4,92);
      if(!next.issues.some(issue=>issue?.title==='Single screens setter cannot convert support into pressure')){
        next.issues.push({
          severity:'bad',
          title:'Single screens setter cannot convert support into pressure',
          detail:'The team has setup and pressure on paper, but one passive screens setter is carrying the entire protection plan alone. Without pivot, sacrifice, or its own offensive follow-through, too many protected turns disappear before the real abusers are actually attacking.'
        });
      }
    }

    if(shallowMultiSetterScreensShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-7,92);
      next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-6,92);
      next.scores.offensiveCoverage=root.njCap((next.scores.offensiveCoverage||0)-5,92);
      if(!next.issues.some(issue=>issue?.title==='Screens package lacks enough real payoffs')){
        next.issues.push({
          severity:'bad',
          title:'Screens package lacks enough real payoffs',
          detail:'The team has multiple screens setters, but too few genuine setup or closing threats exist outside those support slots. That turns the screens package into support burden instead of a reliable offensive conversion layer.'
        });
      }
    }

    if(bulkyScreensSupportShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-6,92);
      next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-5,92);
      if(!next.issues.some(issue=>issue?.title==='Screens support is propping up a bulky glue shell')){
        next.issues.push({
          severity:'warn',
          title:'Screens support is propping up a bulky glue shell',
          detail:'The team can click screens, but too much of the roster is still doing recovery, pivot, and anchor work for the result to behave like real screens offense. The support exists on paper without enough all-in conversion behind it.'
        });
      }
    }

    return next;
  };
})();
