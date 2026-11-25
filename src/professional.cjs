'use strict';
const fs=require('node:fs'),path=require('node:path');
const {normalizeRepo}=require('./engine.cjs');
const DOMAINS=Object.freeze({
 software:{label:'Software engineering',topic:'software-engineering'},
 ai:{label:'AI / machine learning',topic:'machine-learning'},
 data:{label:'Data science / statistics',topic:'data-science'},
 bioinformatics:{label:'Bioinformatics',topic:'bioinformatics',medical:true},
 imaging:{label:'Medical imaging',topic:'medical-imaging',medical:true},
 clinical:{label:'Clinical research tooling',topic:'clinical-research',medical:true},
 reproducibility:{label:'Reproducible science',topic:'reproducible-research'},
 electronics:{label:'Electronics / EDA',topic:'eda'},
 embedded:{label:'Embedded systems / control',topic:'embedded'},
 robotics:{label:'Robotics',topic:'robotics'},
 cad:{label:'CAD / CAM',topic:'cad'},
 simulation:{label:'FEM / CFD',topic:'finite-element-analysis'},
 civil:{label:'Civil engineering / BIM / GIS',topic:'gis'},
 computing:{label:'Scientific computing',topic:'scientific-computing'},
 teaching:{label:'Notebooks / teaching',topic:'jupyter-notebook'},
 infrastructure:{label:'Research infrastructure',topic:'research-software'}
});
const TTL=86400000,MAX_BYTES=2*1024*1024;
const MEDICAL_NOTICE='Discovery only. GitHub popularity is not scientific validity; ranking is not clinical validation. Repository presence does not imply regulatory clearance. Verify intended use, evidence, license and regulatory status. Do not enter patient data.';
function domainInfo(domain){if(typeof domain!=='string'||!Object.hasOwn(DOMAINS,domain))throw Error('Choose a supported professional domain.');return DOMAINS[domain];}
function queryUrl(domain){const info=domainInfo(domain);return 'https://api.github.com/search/repositories?q='+encodeURIComponent('topic:'+info.topic+' archived:false fork:false is:public')+'&sort=updated&order=desc&per_page=30&page=1';}
function evidence(repo,domain,fetched_at,now=Date.now()){
 const info=domainInfo(domain),pushed=Date.parse(repo.pushed_at),age=now-pushed;
 return {source:queryUrl(domain),fetched_at,identifier:String(repo.id),verification_state:'source-reported',
  topicMatches:repo.topics.filter(topic=>topic===info.topic),
  recentPush:Number.isFinite(age)&&age>=0&&age<=90*86400000,
  pushed_at:repo.pushed_at||null,license:repo.license&&repo.license!=='NOASSERTION'?repo.license:null,
  stars:repo.stargazers_count,
  unknown:['release cadence','security policy','security advisories','CI/build results','documentation','citation metadata','archive identifiers','reproducibility artifacts']};
}
function ranked(entries,domain,now=Date.now()){
 return entries.map(entry=>({...entry,evidence:evidence(entry.repo,domain,entry.fetched_at,now)})).sort((a,b)=>
  b.evidence.topicMatches.length-a.evidence.topicMatches.length||Number(b.evidence.recentPush)-Number(a.evidence.recentPush)||
  Number(!!b.evidence.license)-Number(!!a.evidence.license)||b.repo.stargazers_count-a.repo.stargazers_count||a.repo.id-b.repo.id);
}
async function readJson(response){
 if(Number(response.headers?.get('content-length'))>MAX_BYTES)throw Error('Metadata response exceeds the size limit.');
 if(!response.body?.getReader)return response.json();
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES){await reader.cancel();throw Error('Metadata response exceeds the size limit.');}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
class ProfessionalClient{
 constructor({file=null,fetchImpl=fetch,now=Date.now}={}){
  this.file=file;this.fetch=fetchImpl;this.now=now;this.cache=new Map();this.inflight=new Map();this.generation=0;
  if(file)try{if(fs.statSync(file).size<=MAX_BYTES){const saved=JSON.parse(fs.readFileSync(file,'utf8'));if(saved.schema!==1)throw Error('Invalid professional cache schema.');for(const [domain,page]of Object.entries(saved.pages||{})){domainInfo(domain);this.cache.set(domain,this.normalize(page,domain));}}}catch{this.cache.clear();}
 }
 normalize(page,domain){
  const at=Date.parse(page?.fetched_at);if(!Number.isFinite(at)||at>this.now()+60000||page.source!==queryUrl(domain)||!Array.isArray(page.entries)||page.entries.length>30)throw Error('Invalid professional cache.');
  const entries=[],ids=new Set();
  for(const entry of page.entries){const repo=normalizeRepo(entry.repo);if(!repo||repo.fork||repo.archived||ids.has(repo.id))continue;ids.add(repo.id);entries.push({repo,fetched_at:page.fetched_at});}
  return{source:queryUrl(domain),fetched_at:page.fetched_at,entries};
 }
 repos(){return [...new Map([...this.cache.values()].flatMap(p=>p.entries.map(e=>[e.repo.id,e.repo]))).values()];}
 snapshot(domain,error=null,live=false){
  const info=domainInfo(domain),page=this.cache.get(domain),age=page?this.now()-Date.parse(page.fetched_at):Infinity;
  return {domain,profiles:DOMAINS,medicalNotice:info.medical?MEDICAL_NOTICE:null,source:queryUrl(domain),fetched_at:page?.fetched_at||null,
   status:!page?'unavailable':live?'live':age>=0&&age<TTL?'cached':'stale',live:!!page&&live,error,
   entries:page?ranked(page.entries,domain,this.now()):[],ttl:TTL};
 }
 persist(){
  if(!this.file)return;const content=JSON.stringify({schema:1,pages:Object.fromEntries(this.cache)});
  if(Buffer.byteLength(content)>MAX_BYTES)throw Error('Professional cache exceeds its limit.');
  fs.mkdirSync(path.dirname(this.file),{recursive:true});const temp=this.file+'.tmp';
  try{fs.writeFileSync(temp,content,{mode:0o600});fs.renameSync(temp,this.file);}finally{fs.rmSync(temp,{force:true});}
 }
 async get(domain,{refresh=false}={}){
  domainInfo(domain);if(!refresh)return this.snapshot(domain);
  if(this.inflight.has(domain))return this.inflight.get(domain);
  const generation=this.generation;
  const task=(async()=>{
   try{
    const response=await this.fetch(queryUrl(domain),{method:'GET',redirect:'error',headers:{Accept:'application/vnd.github+json','User-Agent':'RepoPulse'},signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error([403,429].includes(response.status)?'GitHub rate limit or access restriction; cached evidence remains available.':'GitHub professional search unavailable ('+response.status+').');
    const data=await readJson(response);
    if(!data||data.incomplete_results!==false||!Number.isSafeInteger(data.total_count)||data.total_count<0||!Array.isArray(data.items)||data.items.length>30||data.items.length>data.total_count)throw Error('GitHub returned incomplete or malformed professional results.');
    const fetched_at=new Date(this.now()).toISOString(),page=this.normalize({source:queryUrl(domain),fetched_at,entries:data.items.filter(r=>r&&r.private!==true).map(repo=>({repo}))},domain);
    if(data.items.length&&!page.entries.length)throw Error('No valid public repositories in the response.');
    if(generation!==this.generation)return this.snapshot(domain);
    const previous=this.cache.get(domain);this.cache.set(domain,page);
    try{this.persist();}catch(error){if(previous)this.cache.set(domain,previous);else this.cache.delete(domain);throw error;}
    return this.snapshot(domain,null,true);
   }catch{return this.snapshot(domain,'Public metadata could not be refreshed. Cached evidence, if any, is retained.');}
  })().finally(()=>this.inflight.delete(domain));
  this.inflight.set(domain,task);return task;
 }
 clear(){this.generation++;if(this.file)fs.rmSync(this.file,{force:true});this.cache.clear();}
}
module.exports={DOMAINS,TTL,MEDICAL_NOTICE,domainInfo,queryUrl,evidence,ranked,readJson,ProfessionalClient};
