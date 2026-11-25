'use strict';
let metadataRepo=null,metadataSources=null,metadataSource='citation',metadataIdentifier='',metadataResult=null,metadataBusy=false,metadataDeclaredDoi='';
const metadataRepositorySources=new Set(['citation','releases','issues','advisories','atom']);
function openRepositoryMetadata(repo){metadataRepo=repo;metadataResult=null;metadataDeclaredDoi='';metadataIdentifier='';metadataSource='citation';return openDrawer('metadata');}
async function loadMetadata(refresh){
 if(metadataBusy)return;metadataBusy=true;renderDrawer();
 try{
  metadataResult=await api.metadataGet({source:metadataSource,identifier:metadataIdentifier,repoId:metadataRepo?.id,refresh});
  if(metadataSource==='citation')metadataDeclaredDoi=metadataResult.record?.fields.doi?.value||'';
 }finally{metadataBusy=false;renderDrawer();}
}
function metadataView(root){
 const title=el('div',{class:'drawer-heading'});title.append(el('h1',{},'Public research metadata'));root.append(title);
 root.append(el('p',{class:'intro'},metadataRepo?'Repository context: '+metadataRepo.full_name:'No repository selected. Open metadata from a Research result or select a discovery card.'));
 root.append(el('p',{class:'notice'},'Optional, read-only lookups. Only the explicit public identifier is sent to the chosen provider. Do not enter patient data. Identifier matching does not establish scientific validity, author identity, repository association or clinical/regulatory approval.'));
 if(state.fixture)root.append(el('p',{class:'notice'},'Synthetic metadata test fixtures — no live verification.'));
 const select=el('select',{'aria-label':'Metadata provider'});for(const [value,label]of Object.entries(metadataSources||{}))select.append(el('option',{value},label));select.value=metadataSource;
 select.addEventListener('change',()=>{if(metadataBusy){select.value=metadataSource;return;}metadataSource=select.value;metadataResult=null;metadataIdentifier=['crossref','openalex'].includes(metadataSource)?metadataDeclaredDoi:'';renderDrawer();});
 const input=el('input',{type:'text',maxlength:'240','aria-label':'Explicit public metadata identifier',placeholder:'DOI, ORCID, PMID, record ID, arXiv ID or revision SWHID'});input.value=metadataRepositorySources.has(metadataSource)?metadataRepo?.full_name||'':metadataIdentifier;input.readOnly=metadataRepositorySources.has(metadataSource)||metadataBusy;input.addEventListener('input',()=>{metadataIdentifier=input.value;});
 const controls=el('div',{class:'settings-grid'});const provider=el('label',{class:'setting'}),identifier=el('label',{class:'setting'});provider.append(el('span',{},'Provider'),select);identifier.append(el('span',{},metadataRepositorySources.has(metadataSource)?'Public repository':'Explicit public identifier'),input);controls.append(provider,identifier);root.append(controls);
 if(metadataBusy)root.append(el('p',{class:'field-hint',role:'status'},'Fetching public metadata…'));
 const actions=el('div',{class:'stack'});
 for(const [label,refresh]of [['Read cached metadata',false],['Fetch public metadata',true]]){const action=btn(label,()=>loadMetadata(refresh),'secondary',label);action.setAttribute('aria-busy',String(metadataBusy));action.setAttribute('aria-disabled',String(metadataBusy));actions.append(action);}
 actions.append(btn('Delete public metadata cache',async()=>{await api.metadataClear();metadataResult=null;metadataDeclaredDoi='';renderDrawer();},'secondary'));
 if(metadataSource==='citation'&&metadataResult?.record?.fields.title)actions.append(btn('Export declared citation JSON',()=>api.metadataExport(metadataRepo?.id),'secondary'));
 root.append(actions);
 if(!metadataResult){root.append(el('p',{class:'field-hint'},'No metadata loaded. Cached reads do not contact the provider. Publication/author/archive relationships are never guessed.'));return;}
 if(metadataResult.error)root.append(el('p',{class:'notice',role:'status'},metadataResult.error));
 const record=metadataResult.record;if(!record)return;
 root.append(el('p',{class:'field-hint'},(metadataResult.status==='live'?'Live as of ':'Cached as of ')+new Date(record.fetched_at).toLocaleString()+' · '+metadataResult.status));
 root.append(el('p',{class:'intro'},'Association: '+record.association));
 const list=el('dl',{class:'metadata-fields'});
 for(const [name,field]of Object.entries(record.fields)){
  list.append(el('dt',{},name.replace(/_/g,' ')),el('dd',{},typeof field.value==='object'?JSON.stringify(field.value,null,2):String(field.value)));
  const evidence=el('dd',{class:'field-hint'},field.verification_state+' · '+field.identifier+' · '+new Date(field.fetched_at).toLocaleString()+' · '+field.source);list.append(evidence);
 }
 root.append(list);
}
