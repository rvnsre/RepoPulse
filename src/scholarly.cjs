'use strict';
const fs=require('node:fs'),path=require('node:path');
const YAML=require('yaml'),{XMLParser,XMLValidator}=require('fast-xml-parser');
const {readUtf8}=require('./bounded-file.cjs');
const MAX_BYTES=2*1024*1024,TTL=86400000;
const SOURCES=Object.freeze({citation:'CITATION.cff',crossref:'Crossref',openalex:'OpenAlex',orcid:'ORCID public record',pubmed:'PubMed',europepmc:'Europe PMC',zenodo:'Zenodo',arxiv:'arXiv',softwareheritage:'Software Heritage',releases:'GitHub Releases',issues:'GitHub Issues',advisories:'GitHub published security advisories',atom:'GitHub release Atom feed'});
const REPOSITORY_SOURCES=new Set(['citation','releases','issues','advisories','atom']);
const text=value=>typeof value==='string'?(value.trim().length>1000?value.trim().slice(0,997)+'…':value.trim()):null;
const array=value=>Array.isArray(value)?value:value==null?[]:[value];
function doi(value){const id=String(value).trim().replace(/^https:\/\/(?:dx\.)?doi\.org\//i,'');if(!/^10\.\d{4,9}\/[^\s<>"?#]{1,200}$/i.test(id))throw Error('Enter an explicit DOI.');return id.toLowerCase();}
function orcid(value){const id=String(value).trim().replace(/^https:\/\/orcid\.org\//,'').toUpperCase();if(!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(id))throw Error('Enter an explicit ORCID iD.');const digits=id.replace(/-/g,'');let total=0;for(const digit of digits.slice(0,15))total=(total+Number(digit))*2;const check=(12-total%11)%11;if(digits[15]!==String(check===10?'X':check))throw Error('ORCID checksum does not match.');return id;}
function identifier(source,value){
 if(!Object.hasOwn(SOURCES,source)||typeof value!=='string'||value.length>240)throw Error('Unsupported metadata lookup.');
 const id=value.trim();
 if(REPOSITORY_SOURCES.has(source)){if(!/^[\w.-]+\/[\w.-]+$/.test(id)||id.length>140||id.split('/').some(p=>p==='.'||p==='..'))throw Error('Invalid public repository name.');return id;}
 if(['crossref','openalex'].includes(source))return doi(id);
 if(source==='orcid')return orcid(id);
 if(['pubmed','europepmc','zenodo'].includes(source)){if(!/^[1-9]\d{0,14}$/.test(id))throw Error('Enter an explicit numeric public record ID.');return id;}
 if(source==='arxiv'){if(!/^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})(?:v[1-9]\d*)?$/.test(id))throw Error('Enter an explicit arXiv identifier.');return id;}
 if(source==='softwareheritage'){if(!/^swh:1:rev:[0-9a-f]{40}$/.test(id))throw Error('Enter an explicit revision SWHID.');return id;}
 throw Error('Unsupported metadata source.');
}
function endpoint(source,input){
 const id=identifier(source,input),repo='https://api.github.com/repos/'+id;
 return {citation:()=>repo+'/contents/CITATION.cff',crossref:()=>'https://api.crossref.org/works/'+encodeURIComponent(id),openalex:()=>'https://api.openalex.org/works/https://doi.org/'+encodeURIComponent(id),orcid:()=>'https://pub.orcid.org/v3.0/'+id+'/record',pubmed:()=>'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&tool=RepoPulse&id='+id,europepmc:()=>'https://www.ebi.ac.uk/europepmc/webservices/rest/search?query='+encodeURIComponent('EXT_ID:'+id+' AND SRC:MED')+'&format=json&pageSize=1',zenodo:()=>'https://zenodo.org/api/records/'+id,arxiv:()=>'https://export.arxiv.org/api/query?id_list='+encodeURIComponent(id),softwareheritage:()=>'https://archive.softwareheritage.org/api/1/revision/'+id.slice(10)+'/',releases:()=>repo+'/releases?per_page=5',issues:()=>repo+'/issues?state=open&per_page=10',advisories:()=>repo+'/security-advisories?state=published&per_page=10',atom:()=>'https://github.com/'+id+'/releases.atom'}[source]();
}
function xml(body){if(/<!DOCTYPE|<!ENTITY/i.test(body)||XMLValidator.validate(body)!==true)throw Error('Unsafe or malformed XML.');return new XMLParser({ignoreAttributes:false,removeNSPrefix:true,processEntities:false,parseTagValue:false,parseAttributeValue:false}).parse(body);}
function citation(data){
 if(data?.encoding!=='base64'||data.path!=='CITATION.cff'||!Number.isSafeInteger(data.size)||data.size<0||data.size>65536||typeof data.content!=='string'||! /^[A-Za-z0-9+/=\r\n]+$/.test(data.content))throw Error('Invalid citation file response.');
 const bytes=Buffer.from(data.content,'base64');if(bytes.length>65536||bytes.length!==data.size)throw Error('Citation file size does not match.');
 const document=YAML.parseDocument(bytes.toString('utf8'),{schema:'core',uniqueKeys:true});if(document.errors.length||document.warnings.length)throw Error('Unsupported citation YAML.');
 const c=document.toJS({maxAliasCount:20});if(!c||typeof c!=='object'||!text(c['cff-version'])||!text(c.title))throw Error('Citation file lacks declared title/version format.');
 const result={title:text(c.title),cff_version:text(c['cff-version']),type:text(c.type)};
 for(const key of ['version','date-released','license','url','message'])if(text(c[key]))result[key.replace(/-/g,'_')]=text(c[key]);
 const declared=c.doi||array(c.identifiers).find(item=>item?.type==='doi')?.value;if(declared)result.doi=doi(declared);
 if(c['preferred-citation']?.doi)result.preferred_citation_doi=doi(c['preferred-citation'].doi);
 if(array(c.authors).length>200)throw Error('Citation author list exceeds supported limit; it was not truncated.');
 const authors=array(c.authors).map(a=>({given:text(a?.['given-names']),family:text(a?.['family-names']),name:text(a?.name),...(a?.orcid?{orcid:orcid(a.orcid)}:{})})).filter(a=>a.given||a.family||a.name);if(authors.length)result.authors=authors;
 return result;
}
function parse(source,id,body){
 if(source==='arxiv'||source==='atom'){
  const feed=xml(body).feed;if(!feed)throw Error('Missing Atom feed.');
  if(source==='atom')return{observed_entries:array(feed.entry).slice(0,10).map(e=>({id:text(e.id),title:text(e.title),updated:text(e.updated)})),sample_only:true};
  const entry=array(feed.entry).find(e=>{const observed=String(e.id).replace(/^https?:\/\/arxiv\.org\/abs\//,'');return /v\d+$/.test(id)?observed===id:observed.replace(/v\d+$/,'')===id;});if(!entry)throw Error('arXiv identifier does not match.');
  return{title:text(entry.title),version_identifier:text(entry.id),published:text(entry.published),updated:text(entry.updated),authors_sample:array(entry.author).slice(0,20).map(a=>text(a?.name)).filter(Boolean),authors_sample_only:array(entry.author).length>20};
 }
 const data=JSON.parse(body);
 if(source==='citation')return citation(data);
 if(source==='crossref'){const r=data?.message;if(doi(r?.DOI)!==id)throw Error('Crossref DOI mismatch.');return{doi:id,title:text(array(r.title)[0]),type:text(r.type),publisher:text(r.publisher)};}
 if(source==='openalex'){if(doi(data?.doi)!==id)throw Error('OpenAlex DOI mismatch.');return{doi:id,openalex_id:text(data.id),title:text(data.display_name),publication_year:Number.isSafeInteger(data.publication_year)?data.publication_year:null};}
 if(source==='orcid'){if(data?.['orcid-identifier']?.path!==id)throw Error('ORCID record mismatch.');const name=data.person?.name;return{orcid:id,given:text(name?.['given-names']?.value),family:text(name?.['family-name']?.value),credit_name:text(name?.['credit-name']?.value)};}
 if(source==='pubmed'){const r=data?.result?.[id];if(String(r?.uid)!==id||!Array.isArray(data.result.uids)||!data.result.uids.includes(id))throw Error('PubMed record mismatch.');return{pmid:id,title:text(r.title),publication_date:text(r.pubdate),journal:text(r.fulljournalname)};}
 if(source==='europepmc'){const r=array(data?.resultList?.result).find(r=>r?.source==='MED'&&r.id===id);if(!r)throw Error('Europe PMC record mismatch.');return{pmid:id,title:text(r.title),publication_year:text(r.pubYear),...(r.doi?{doi:doi(r.doi)}:{})};}
 if(source==='zenodo'){if(String(data?.id)!==id||!data.metadata)throw Error('Zenodo record mismatch.');const m=data.metadata;return{record_id:id,title:text(m.title),version:text(m.version),publication_date:text(m.publication_date),license:text(m.license?.id),...(m.doi?{doi:doi(m.doi)}:{})};}
 if(source==='softwareheritage'){if(data?.id!==id.slice(10))throw Error('Software Heritage revision mismatch.');return{swhid:id,revision:data.id,directory:text(data.directory),date:text(data.date)};}
 if(!Array.isArray(data)||data.length>100)throw Error('Unexpected GitHub metadata.');
 if(source==='releases')return{observed_releases:data.filter(r=>r&&!r.draft&&typeof r.tag_name==='string').slice(0,5).map(r=>({tag:text(r.tag_name),published_at:text(r.published_at),prerelease:r.prerelease===true})),sample_only:true};
 if(source==='issues')return{observed_open_issues:data.filter(r=>r&&!r.pull_request&&Number.isSafeInteger(r.number)).slice(0,10).map(r=>({number:r.number,updated_at:text(r.updated_at)})),sample_only:true};
 if(source==='advisories')return{observed_published_advisories:data.filter(r=>r?.state==='published'&&typeof r.ghsa_id==='string').slice(0,10).map(r=>({ghsa_id:text(r.ghsa_id),severity:text(r.severity),published_at:text(r.published_at)})),sample_only:true,absence_is_not_security_validation:true};
 throw Error('Unsupported parser.');
}
async function readText(response){
 if(Number(response.headers?.get('content-length'))>MAX_BYTES)throw Error('Metadata response exceeds limit.');
 const reader=response.body?.getReader();if(!reader)throw Error('Missing response stream.');let size=0;const chunks=[];
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>MAX_BYTES){await reader.cancel();throw Error('Metadata response exceeds limit.');}chunks.push(Buffer.from(part.value));}}finally{reader.releaseLock();}
 return Buffer.concat(chunks).toString('utf8');
}
function wrap(source,id,values,fetched_at){
 const url=endpoint(source,id),verification_state=source==='citation'?'declared-by-repository':REPOSITORY_SOURCES.has(source)?'provider-reported':'provider-record-matched';
 const fields=Object.fromEntries(Object.entries(values).filter(([,v])=>v!==null&&v!==undefined).map(([key,value])=>[key,{value,source:url,fetched_at,identifier:id,verification_state}]));
 return{adapter:source,source:url,fetched_at,identifier:id,verification_state,fields,association:REPOSITORY_SOURCES.has(source)?'repository-resource':'identifier-only; repository association not established'};
}
class ScholarlyClient{
 constructor({file=null,fetchImpl=fetch,now=Date.now}={}){
  this.file=file;this.fetch=fetchImpl;this.now=now;this.cache=new Map();this.inflight=new Map();this.generation=0;this.limits=new Map();
  if(file)try{const saved=JSON.parse(readUtf8(file,4*MAX_BYTES));if(saved.schema!==1)throw Error('Unknown metadata cache.');for(const record of array(saved.records).slice(-128)){const id=identifier(record.adapter,record.identifier);if(record.source!==endpoint(record.adapter,id)||!Number.isFinite(Date.parse(record.fetched_at))||Date.parse(record.fetched_at)>this.now()+60000||!record.fields)continue;const values=Object.fromEntries(Object.entries(record.fields).filter(([k,f])=>/^[a-z_]{1,64}$/.test(k)&&f&&Object.hasOwn(f,'value')).map(([k,f])=>[k,f.value]));this.cache.set(record.adapter+':'+id,wrap(record.adapter,id,values,record.fetched_at));}}catch{this.cache.clear();}
 }
 result(source,id,error=null,live=false){const record=this.cache.get(source+':'+id);const age=this.now()-Date.parse(record?.fetched_at);return{status:!record?'unavailable':live?'live':age>=0&&age<TTL?'cached':'stale',record:record?structuredClone(record):null,error,ttl:TTL};}
 persist(){if(!this.file)return;const content=JSON.stringify({schema:1,records:[...this.cache.values()]});if(Buffer.byteLength(content)>4*MAX_BYTES)throw Error('Metadata cache exceeds limit.');fs.mkdirSync(path.dirname(this.file),{recursive:true});const temp=this.file+'.'+require('node:crypto').randomUUID()+'.tmp';try{fs.writeFileSync(temp,content,{mode:0o600,flag:'wx'});fs.renameSync(temp,this.file);}finally{fs.rmSync(temp,{force:true});}}
 async get(source,input,{refresh=false}={}){
  const id=identifier(source,input),key=source+':'+id;if(!refresh)return this.result(source,id);if(this.inflight.has(key))return this.inflight.get(key);const generation=this.generation,url=endpoint(source,id),origin=new URL(url).origin;
  if((this.limits.get(origin)||0)>this.now())return this.result(source,id,'Provider rate limit; cached timestamps are retained.');
  const task=(async()=>{try{
   const response=await this.fetch(url,{method:'GET',redirect:'error',credentials:'omit',headers:{Accept:['arxiv','atom'].includes(source)?'application/atom+xml':'application/json','User-Agent':'RepoPulse/'+require('../package.json').version+' (+https://github.com/rvnsre/RepoPulse)'},signal:AbortSignal.timeout(10000)});
   if([403,429].includes(response.status)){const reset=Number(response.headers?.get('x-ratelimit-reset'))*1000,raw=response.headers?.get('retry-after'),retry=raw?(Number.isFinite(Number(raw))?this.now()+Number(raw)*1000:Date.parse(raw)):0;this.limits.set(origin,Math.max(this.now()+60000,Number.isFinite(reset)?reset:0,Number.isFinite(retry)?retry:0));}
   if(!response.ok)throw Error('Metadata unavailable.');
   const values=parse(source,id,await readText(response)),record=wrap(source,id,values,new Date(this.now()).toISOString());if(generation!==this.generation)return this.result(source,id);
   const previous=new Map(this.cache);this.cache.set(key,record);while(this.cache.size>128)this.cache.delete(this.cache.keys().next().value);
   try{this.persist();}catch(error){this.cache=previous;throw error;}
   return this.result(source,id,null,true);
  }catch{return this.result(source,id,'Public metadata is unavailable, rate-limited or could not be verified. Previous timestamps are retained.');}})().finally(()=>this.inflight.delete(key));
  this.inflight.set(key,task);return task;
 }
 clear(){this.generation++;if(this.file)fs.rmSync(this.file,{force:true});this.cache.clear();}
}
module.exports={SOURCES,REPOSITORY_SOURCES,TTL,identifier,endpoint,parse,wrap,readText,ScholarlyClient};
