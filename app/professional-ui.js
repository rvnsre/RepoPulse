'use strict';
let professionalDomain='software',professionalSnapshot=null,professionalBusy=false;
async function loadProfessional(refresh=false){
 if(professionalBusy)return;professionalBusy=true;renderDrawer();
 try{professionalSnapshot=await api.professionalGet(professionalDomain,refresh);}
 finally{professionalBusy=false;renderDrawer();}
}
function professionalView(root){
 const headingBox=el('div',{class:'drawer-heading'});headingBox.append(el('h1',{},'Professional / Research discovery'));root.append(headingBox);
 root.append(el('p',{class:'intro'},'Find software for your field at any popularity level. Evidence explains the order.'));
 const ordering=el('details');ordering.append(el('summary',{},'How results are ordered'),el('p',{class:'intro'},'Exact topic match, push within 90 days, reported license, then popularity. This is not a scientific quality or clinical trust score.'));root.append(ordering);
 root.append(el('p',{class:'intro'},'Search shares the selected public topic with GitHub. Notes, collections, history and interest weights stay private. Do not enter patient data.'));
 if(state.fixture)root.append(el('p',{class:'notice'},'Test fixture preview — synthetic results, not live GitHub data.'));
 const page=professionalSnapshot;
 if(!page){root.append(btn('Load cached profiles',()=>loadProfessional(false),'secondary'));return;}
 const controls=el('div',{class:'stack'}),label=el('label',{class:'setting'}),select=el('select',{'aria-label':'Professional domain'});
 for(const [value,profile]of Object.entries(page.profiles))select.append(el('option',{value},profile.label));select.value=professionalDomain;
 select.setAttribute('aria-disabled',String(professionalBusy));select.addEventListener('change',()=>{if(professionalBusy){select.value=professionalDomain;return;}professionalDomain=select.value;run(()=>loadProfessional(false));});label.append(el('span',{},'Professional domain'),select);controls.append(label);
 const search=btn(professionalBusy?'Loading…':'Search public repositories',()=>loadProfessional(true),'primary','Search public repositories for selected domain');search.setAttribute('aria-busy',String(professionalBusy));search.setAttribute('aria-disabled',String(professionalBusy));controls.append(search,btn('Delete public discovery cache',async()=>{await api.professionalClear();professionalSnapshot=await api.professionalGet(professionalDomain,false);renderDrawer();},'secondary'));root.append(controls);
 if(page.medicalNotice)root.append(el('p',{class:'notice'},page.medicalNotice));
 root.append(el('p',{class:'field-hint'},page.fetched_at?(page.live?'Live as of ':'Cached as of ')+new Date(page.fetched_at).toLocaleString()+(page.status==='stale'?' · stale':'')+' · '+page.entries.length+' results in this sample. This is not the full domain inventory.':'No cached results. Choose Search to request a public sample.'));
 if(page.error)root.append(el('p',{class:'notice',role:'status'},page.error));
 const list=el('div',{class:'list'});
 for(const entry of page.entries){
  const repo=entry.repo,e=entry.evidence,card=el('article',{class:'collection-card','aria-label':repo.full_name});
  const title=el('h2',{},repo.full_name);card.append(title,el('p',{class:'intro'},repo.description));
  const why=el('details'),summary=el('summary',{},'Why recommended? / Evidence');why.append(summary);
  const facts=el('ul',{class:'professional-evidence'});
  for(const fact of [e.topicMatches.length?'Topic matches: '+e.topicMatches.join(', '):'Exact topic match not present in returned metadata',e.pushed_at?'GitHub reports last push: '+new Date(e.pushed_at).toLocaleString()+(e.recentPush?' (within 90 days)':''):'Push time unknown',e.license?'Reported license: '+e.license:'License unknown',Intl.NumberFormat().format(e.stars)+' stars — popularity only','Not checked: '+e.unknown.join(', '),'Source: '+e.source,'Fetched: '+new Date(e.fetched_at).toLocaleString(),'GitHub repository ID: '+e.identifier+' · '+e.verification_state])facts.append(el('li',{},fact));
  why.append(facts);card.append(why,btn('Research metadata',()=>openRepositoryMetadata(repo),'secondary','Inspect public research metadata for '+repo.full_name));
  const actions=el('div',{class:'stack'});actions.append(btn('Open on GitHub',()=>openRepo(repo),'secondary','Open '+repo.full_name+' on GitHub'),btn(state.saved.some(r=>r.id===repo.id)?'Remove bookmark':'Bookmark',async()=>{await react(repo,'save');renderDrawer();},'secondary','Toggle bookmark for '+repo.full_name));card.append(actions);list.append(card);
 }
 root.append(list);
}
