'use strict';
const extensionApi=typeof browser!=='undefined'?browser:chrome;
let profile=null;
const results=document.getElementById('results'),exportButton=document.getElementById('export'),analyze=document.getElementById('analyze');
analyze.addEventListener('click',async()=>{
  analyze.disabled=true;results.textContent='';profile=null;exportButton.hidden=true;
  try{
    const granted=await extensionApi.permissions.request({permissions:['history']});
    if(!granted){results.textContent='Permission declined. Choose interests manually in RepoPulse.';return;}
    const entries=await extensionApi.history.search({text:'',startTime:Date.now()-30*86400000,maxResults:1000});
    const weights={};
    for(const entry of entries){
      let host;try{const url=new URL(entry.url);if(!['https:','http:'].includes(url.protocol))continue;host=url.hostname;}catch{continue;}
      const matches=classify(`${entry.title||''} ${host.replaceAll('.',' ')}`),age=Math.max(0,(Date.now()-(entry.lastVisitTime||Date.now()))/86400000),decay=Math.exp(-age/14),frequency=Math.min(3,Math.log2(1+(entry.visitCount||1)));
      for(const [key,value]of Object.entries(matches))weights[key]=(weights[key]||0)+value*decay*frequency;
    }
    const max=Math.max(1,...Object.values(weights));for(const key of Object.keys(weights))weights[key]=Math.max(1,Math.round(weights[key]/max*100));
    if(!Object.keys(weights).length){results.textContent='No supported topic signals found. Choose interests manually in RepoPulse.';return;}
    profile={schema:'repopulse.interests.v1',weights};
    for(const [key,value]of Object.entries(weights).sort((a,b)=>b[1]-a[1])){const row=document.createElement('div'),name=document.createElement('span'),score=document.createElement('span');name.textContent=TOPICS[key].label;score.textContent=`${value}%`;row.append(name,score);results.append(row);}
    exportButton.hidden=false;
  }catch(error){results.textContent=error.message||'Analysis failed. No profile was exported.';}
  finally{analyze.disabled=false;}
});
exportButton.addEventListener('click',()=>{if(!profile)return;const url=URL.createObjectURL(new Blob([JSON.stringify(profile,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='repopulse-interests.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);});
document.getElementById('revoke').addEventListener('click',async()=>{try{await extensionApi.permissions.remove({permissions:['history']});profile=null;exportButton.hidden=true;results.textContent='History permission revoked. In-memory scores cleared.';}catch(error){results.textContent=error.message;}});
