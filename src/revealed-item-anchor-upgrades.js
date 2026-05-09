(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  const host=typeof globalThis!=='undefined'?globalThis:root;
  const originalBuild=typeof buildDetectiveRead==='function'
    ? buildDetectiveRead
    : (root.buildDetectiveRead||host.buildDetectiveRead);
  if(typeof originalBuild!=='function'||originalBuild.__revealedItemAnchorPatch)return;

  function itemName(value=''){
    return String(value||'').trim();
  }

  function currentRevealedItem(input={}){
    if(input?.itemGone)return '';
    return itemName(
      input?.currentTransferredItem||
      input?.acquiredItem||
      input?.revealedItem
    );
  }

  function cloneWithAnchoredItem(candidate={}, item=''){
    return {
      ...candidate,
      item,
      itemScore: Math.max(Number(candidate?.itemScore||0), 100)
    };
  }

  function ensureAnchoredTop(read, item=''){
    if(!Array.isArray(read?.top)||!item)return false;
    const matching=read.top.filter(candidate=>itemName(candidate?.item)===item);
    if(matching.length===read.top.length&&matching.length>0)return false;
    const source=matching.length
      ? matching
      : read.top.length
        ? read.top.slice(0,Math.min(read.top.length,3)).map(candidate=>cloneWithAnchoredItem(candidate,item))
        : [{item,profile:'replay-confirmed',prob:1}];
    read.top=source.map(candidate=>cloneWithAnchoredItem(candidate,item));
    return true;
  }

  function ensureAnchoredItemRows(read, item=''){
    if(!Array.isArray(read?.itemRows)||!item)return false;
    if(read.itemRows.length===1&&itemName(read.itemRows[0]?.[0])===item)return false;
    read.itemRows=[[item,100]];
    return true;
  }

  function uniqueNotes(list=[]){
    return [...new Set((list||[]).filter(Boolean))];
  }

  function anchorNote(item=''){
    return `${item} was replay-confirmed as the current item, so the detective now hard-anchors that item even when it falls outside the default candidate pool.`;
  }

  function patchRead(read, input={}){
    const item=currentRevealedItem(input);
    if(!read||!item)return read;
    const itemRowsChanged=ensureAnchoredItemRows(read,item);
    const topChanged=ensureAnchoredTop(read,item);
    if((itemRowsChanged||topChanged)&&read.summary){
      read.summary.notes=uniqueNotes([...(read.summary.notes||[]),anchorNote(item)]);
    }
    if(read.input){
      read.input.revealedItem=item;
      read.input.itemGone=false;
    }
    return read;
  }

  function patchedBuildDetectiveRead(input={}){
    return patchRead(originalBuild(input),input);
  }

  patchedBuildDetectiveRead.__revealedItemAnchorPatch=true;
  patchedBuildDetectiveRead.__revealedItemAnchorOriginal=originalBuild;
  root.buildDetectiveRead=patchedBuildDetectiveRead;
  if(typeof globalThis!=='undefined')globalThis.buildDetectiveRead=patchedBuildDetectiveRead;
})();