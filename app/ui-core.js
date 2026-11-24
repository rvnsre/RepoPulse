(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RepoPulseUI=factory();})(typeof window==='object'?window:this,function(){
 'use strict';
 function renderQueue(render,{requestFrame=fn=>requestAnimationFrame(fn),cancelFrame=id=>cancelAnimationFrame(id),setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id),delay=50}={}){
  let queued=false,frame=null,timer=null,version=0;
  const clear=()=>{if(frame!==null)cancelFrame(frame);if(timer!==null)clearTimer(timer);frame=timer=null;};
  const schedule=()=>{if(queued)return;queued=true;const current=++version;
   const flush=()=>{if(!queued||current!==version)return;queued=false;clear();render();};
   timer=setTimer(flush,delay);try{frame=requestFrame(flush);}catch{}
  };
  schedule.cancel=()=>{version++;queued=false;clear();};return schedule;
 }
 function visible(items,offset=0,count=2){items=Array.isArray(items)?items:[];if(!items.length)return[];offset=Number.isFinite(offset)?Math.trunc(offset):0;count=Number.isFinite(count)?Math.trunc(count):2;count=Math.min(Math.max(1,count),items.length);return Array.from({length:count},(_,i)=>items[((offset+i)%items.length+items.length)%items.length]);}
 function rowPlan(previous,next){const old=new Set(previous),current=new Set(next);return{added:next.filter(id=>!old.has(id)),removed:previous.filter(id=>!current.has(id)),retained:next.filter(id=>old.has(id)),order:next};}
 function motion(prefs={},systemReduced=false,hidden=false){return !hidden&&!systemReduced&&!prefs.reducedMotion&&prefs.motion!=='none';}
 function textScale(value){return[100,115,130,150].includes(Number(value))?Number(value):100;}
 function nextScale(value,direction){direction=Number.isFinite(direction)?Math.sign(direction):0;const scales=[100,115,130,150],index=scales.indexOf(textScale(value));return scales[Math.max(0,Math.min(scales.length-1,index+direction))];}
 function search(items,query='',sort='recent',language=''){items=Array.isArray(items)?items.filter(r=>r&&typeof r.full_name==='string'):[];const terms=String(query??'').toLowerCase().trim().split(/\s+/).filter(Boolean);let found=items.filter(r=>(!language||r.language===language)&&terms.every(t=>(r.full_name+' '+r.description+' '+(r.language||'')+' '+(r.topics||[]).join(' ')).toLowerCase().includes(t)));if(sort==='stars')found.sort((a,b)=>b.stargazers_count-a.stargazers_count);if(sort==='name')found.sort((a,b)=>a.full_name.localeCompare(b.full_name));return found;}
 function history(items,unique=false){items=(Array.isArray(items)?items:[]).filter(h=>h?.repo&&Number.isSafeInteger(h.repo.id));if(!unique)return items.map(h=>({...h.repo,openedAt:h.openedAt}));const ids=new Set();return items.filter(h=>{if(ids.has(h.repo.id))return false;ids.add(h.repo.id);return true;}).map(h=>({...h.repo,openedAt:h.openedAt}));}
 function accept(current,incoming){if(!incoming||typeof incoming!=='object'||Array.isArray(incoming)||incoming.revision!=null&&(!Number.isSafeInteger(incoming.revision)||incoming.revision<0))return current;return current&&Number(current.revision||0)>Number(incoming.revision||0)?current:incoming;}
 function brief(value,max=44){
  const text=(typeof value==='string'?value:'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[`*_#]/g,'').replace(/\s+/g,' ').trim();
  if(!text)return 'Open-source project';
  const sentence=text.split(/[.!?](?:\s|$)/).find(s=>s.trim())||text,words=sentence.split(' '),short=words.slice(0,6).join(' '),chars=Array.from(short),limit=Math.max(8,Math.min(100,Number.isFinite(max)?Math.floor(max):44));
  const cut=chars.length>limit?chars.slice(0,limit-1).join('').replace(/\s+\S*$/,''):short;
  return cut+(words.length>6||chars.length>limit?'…':'');
 }
 function compactSummary(value){
  const text=typeof value==='string'?value:'';
  return text.replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
   .replace(/https?:\/\/\S+/gi,'').replace(/\s+/g,' ').trim()||'Explore this project on GitHub.';
 }
 function dockModel(items=[],id){items=(Array.isArray(items)?items:[]).filter(r=>r&&typeof r.full_name==='string');const repo=items.find(r=>r?.id===id)||items[0]||null;return{repo,title:repo?.full_name||'No discovery yet',summary:repo?brief(repo.description):'Open the panel to discover projects'};}
 function externalMode(message){if(typeof message==='object'&&message?.requestId!=null)return null;const mode=typeof message==='string'?message:message?.mode;return ['panel','collapsed','mini','workspace','insight'].includes(mode)?mode:null;}
 return{renderQueue,externalMode,brief,dockModel,visible,rowPlan,motion,textScale,nextScale,search,history,accept,compactSummary};
});
