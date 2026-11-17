(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RepoPulseUI=factory();})(typeof window==='object'?window:this,function(){
 'use strict';
 function visible(items,offset=0,count=2){if(!items.length)return[];count=Math.min(Math.max(1,count),items.length);return Array.from({length:count},(_,i)=>items[((offset+i)%items.length+items.length)%items.length]);}
 function rowPlan(previous,next){const old=new Set(previous),current=new Set(next);return{added:next.filter(id=>!old.has(id)),removed:previous.filter(id=>!current.has(id)),retained:next.filter(id=>old.has(id)),order:next};}
 function motion(prefs={},systemReduced=false,hidden=false){return !hidden&&!prefs.reducedMotion&&prefs.motion!=='none'&&!(prefs.motion!=='full'&&systemReduced);}
 function textScale(value){return[100,115,130,150].includes(Number(value))?Number(value):100;}
 function nextScale(value,direction){const scales=[100,115,130,150],index=scales.indexOf(textScale(value));return scales[Math.max(0,Math.min(scales.length-1,index+direction))];}
 function search(items,query='',sort='recent',language=''){const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);let found=items.filter(r=>(!language||r.language===language)&&terms.every(t=>(r.full_name+' '+r.description+' '+(r.language||'')+' '+(r.topics||[]).join(' ')).toLowerCase().includes(t)));if(sort==='stars')found.sort((a,b)=>b.stargazers_count-a.stargazers_count);if(sort==='name')found.sort((a,b)=>a.full_name.localeCompare(b.full_name));return found;}
 function history(items,unique=false){if(!unique)return items.map(h=>({...h.repo,openedAt:h.openedAt}));const ids=new Set();return items.filter(h=>{if(ids.has(h.repo.id))return false;ids.add(h.repo.id);return true;}).map(h=>({...h.repo,openedAt:h.openedAt}));}
 function accept(current,incoming){if(!incoming)return current;return current&&Number(current.revision||0)>Number(incoming.revision||0)?current:incoming;}
 function brief(value,max=44){
  const text=(typeof value==='string'?value:'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[`*_#]/g,'').replace(/\s+/g,' ').trim();
  if(!text)return 'Open-source project';
  const sentence=text.split(/[.!?](?:\s|$)/)[0],words=sentence.split(' '),short=words.slice(0,6).join(' '),chars=Array.from(short),limit=Math.max(8,Math.min(100,Number.isFinite(max)?Math.floor(max):44));
  const cut=chars.length>limit?chars.slice(0,limit-1).join('').replace(/\s+\S*$/,''):short;
  return cut+(words.length>6||chars.length>limit?'…':'');
 }
 function dockModel(items=[],id){const repo=items.find(r=>r?.id===id)||items[0]||null;return{repo,title:repo?.full_name||'No discovery yet',summary:repo?brief(repo.description):'Open the panel to discover projects'};}
 return{brief,dockModel,visible,rowPlan,motion,textScale,nextScale,search,history,accept};
});
