(function(){
  const root = typeof window !== 'undefined' ? window : globalThis;
  const BATTLELOG_DEMO = [
    '|turn|3',
    '|switch|p2a: Dragapult|Dragapult, L80',
    '|move|p2a: Dragapult|Thunder Wave|p1a: Blastoise',
    '|-damage|p2a: Dragapult|88/100|[from] Stealth Rock',
    '|move|p2a: Dragapult|Shadow Ball|p1a: Blastoise',
    '|-damage|p1a: Blastoise|57/100',
    '|turn|4',
    '|move|p2a: Dragapult|Draco Meteor|p1a: Blastoise',
    '|-damage|p1a: Blastoise|12/100',
    '|-item|p2a: Dragapult|Choice Specs'
  ].join('\n');

  function bindBattlelogDemo(){
    const button = document.getElementById('loadBattlelogDemo');
    const input = document.getElementById('replayInput');
    if(!button || !input) return false;
    button.onclick = function(){
      input.value = BATTLELOG_DEMO;
      if(typeof root.analyzeReplay === 'function'){
        root.analyzeReplay();
      }else{
        const results = document.getElementById('replayResults');
        if(results){
          results.className = 'empty';
          results.textContent = 'Battlelog demo loaded. Run Analyze log if the observer does not auto-run.';
        }
      }
      input.scrollIntoView?.({behavior:'smooth', block:'center'});
    };
    return true;
  }

  if(!bindBattlelogDemo()){
    document.addEventListener('DOMContentLoaded', bindBattlelogDemo, {once:true});
    setTimeout(bindBattlelogDemo, 0);
  }
})();
