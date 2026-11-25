'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {normalizeRepo}=require('../src/engine.cjs');
const MAX_PAGE_BYTES=1024*1024;
class CatalogCheckpoint{
 constructor(directory,{now=Date.now,ttl=3600000}={}){this.directory=directory;this.now=now;this.ttl=ttl;this.pages=new Map();this.resumed=0;}
 file(url){
  const parsed=new URL(url);
  if(parsed.origin!=='https://api.github.com'||parsed.pathname!=='/search/repositories'||parsed.username||parsed.password)throw Error('Unsupported catalog checkpoint endpoint.');
  return path.join(this.directory,crypto.createHash('sha256').update(url).digest('hex')+'.json');
 }
 read(url){
  try{
   const file=this.file(url);if(fs.statSync(file).size>MAX_PAGE_BYTES)return null;
   const page=JSON.parse(fs.readFileSync(file,'utf8'));
   const age=this.now()-Date.parse(page.fetched_at);
   if(page.schema!==1||page.source!==url||!Number.isFinite(age)||age<0||age>this.ttl||!validPage(page.data))return null;
   this.pages.set(url,page.fetched_at);this.resumed++;return page.data;
  }catch{return null;}
 }
 write(url,data){
  if(!validPage(data))throw Error('Cannot checkpoint incomplete or malformed catalog data.');
  const fetched_at=new Date(this.now()).toISOString();
  const page={schema:1,source:url,fetched_at,data:{total_count:data.total_count,incomplete_results:false,items:data.items.map(normalizeRepo)}};
  const content=JSON.stringify(page);if(Buffer.byteLength(content)>MAX_PAGE_BYTES)throw Error('Catalog page exceeds checkpoint limit.');
  fs.mkdirSync(this.directory,{recursive:true});const file=this.file(url),temp=file+'.'+crypto.randomUUID()+'.tmp';
  try{fs.writeFileSync(temp,content,{mode:0o600,flag:'wx'});fs.renameSync(temp,file);}finally{fs.rmSync(temp,{force:true});}
  this.pages.set(url,fetched_at);
 }
 provenance(){return [...this.pages].map(([source,fetched_at])=>({source,fetched_at}));}
}
function validPage(data){return data&&Number.isSafeInteger(data.total_count)&&data.total_count>=0&&data.incomplete_results!==true&&Array.isArray(data.items)&&data.items.length<=100&&data.items.length<=data.total_count&&data.items.every(r=>normalizeRepo(r));}
async function retryRequest(url,options,{fetchImpl=fetch,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=Date.now,attempts=5,maxWait=65000}={}){
 for(let attempt=0;attempt<attempts;attempt++){
  let response;
  try{response=await fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(20000)});}
  catch(error){if(attempt===attempts-1)throw error;await wait(Math.min(maxWait,1000*2**attempt));continue;}
  if(![403,429,500,502,503,504].includes(response.status))return response;
  const reset=Number(response.headers?.get('x-ratelimit-reset'))*1000-now();
  const raw=response.headers?.get('retry-after');
  const retry=raw?(Number.isFinite(Number(raw))?Number(raw)*1000:Date.parse(raw)-now()):0;
  const delay=Math.max(1000*2**attempt,Number.isFinite(reset)?reset+1000:0,Number.isFinite(retry)?retry:0);
  await response.body?.cancel();
  if(attempt===attempts-1||delay>maxWait)throw Error('GitHub request is unavailable or rate-limited; resume the checkpoint after the server retry time.');
  await wait(delay);
 }
 throw Error('GitHub retry budget exhausted.');
}
module.exports={CatalogCheckpoint,retryRequest};
