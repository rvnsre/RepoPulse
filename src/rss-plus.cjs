'use strict';

const fs=require('node:fs'),path=require('node:path');
const CHECKOUT='https://ravansariyev.gumroad.com/l/rss';
const PRODUCT_ID='2fUpm0yYjNHhRoLT597Reg==';
const VERIFY='https://api.gumroad.com/v2/licenses/verify';
const RECHECK=6*60*60*1000;
const RETRY=15*60*1000;
const OFFLINE=24*60*60*1000;

function normalizeKey(value){
 if(typeof value!=='string'||value.length>256)return null;
 const key=value.normalize('NFKC').trim().replace(/[‐‑‒–—−]/g,'-').replace(/\s+/g,'').toUpperCase();
 if(/^(?:[0-9A-F]{8}-){3}[0-9A-F]{8}$/.test(key))return key;
 if(/^[0-9A-F]{32}$/.test(key))return key.match(/.{8}/g).join('-');
 return null;
}

const TIER_ID='7y1PoKaK1JZcHVvI-UEQ-Q==';
function tierValues(value){
 if(typeof value==='string')return value.trim()?value.split(/\s*[,;\n]\s*/):[];
 if(Array.isArray(value))return value.flatMap(tierValues);
 if(value&&typeof value==='object')return Object.values(value).flatMap(tierValues);
 return [];
}

function assess(body,now){
 const p=body?.purchase;
 if(body?.success===false)return {status:'not-found'};
 if(body?.success!==true||!p||typeof p!=='object')return {status:'unavailable'};
 if(p.product_id!==PRODUCT_ID)return {status:'wrong-product'};
 if(p.recurrence!=='monthly'||!p.subscription_id)return {status:'wrong-plan'};
 const tiers=tierValues(p.variants??p.variant);
 const plus=p.variant_id===TIER_ID||tiers.some(part=>/^(?:[^:]+:\s*)?RSS\s*\+$/i.test(part.trim()));
 const monthlyPaidFallback=!tiers.length&&!p.variant_id&&p.price===500&&String(p.currency).toLowerCase()==='usd';
 if(!plus&&!monthlyPaidFallback)return {status:'wrong-plan'};
 if(p.refunded||p.chargebacked||p.disputed&&!p.dispute_won||p.test||p.is_test||p.license_disabled)
  return {status:'inactive'};
 const dates=[p.subscription_ended_at,p.subscription_cancelled_at,p.subscription_failed_at].filter(value=>value!=null);
 const timestamps=dates.map(value=>Date.parse(value));
 if(timestamps.some(value=>!Number.isFinite(value)))return {status:'unavailable'};
 const endsAt=timestamps.length?Math.min(...timestamps):null;
 if(endsAt!==null&&endsAt<=now)return {status:'inactive'};
 return {status:'active',endsAt};
}

async function verify(key,fetcher=fetch,now=Date.now){
 key=normalizeKey(key);if(!key)return {status:'invalid-format'};
 try{
  const response=await fetcher(VERIFY,{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
   body:new URLSearchParams({product_id:PRODUCT_ID,license_key:key,increment_uses_count:'false'})
  });
  if(response.status===404)return {status:'not-found'};
  if(!response.ok)return {status:'unavailable'};
  return assess(await response.json(),now());
 }catch{return {status:'unavailable'};}
}

function createLicense({safeStorage,file,fetcher=fetch,now=Date.now}){
 let key=null,verified=null,status='free',persistent=false,next=0,generation=0,inflight=null,pending=0;
 const available=()=>safeStorage.isEncryptionAvailable()&&safeStorage.getSelectedStorageBackend?.()!=='basic_text';
 function load(){
  if(!available()||!fs.existsSync(file))return;
  try{key=normalizeKey(safeStorage.decryptString(fs.readFileSync(file)));persistent=!!key;if(key)status='unverified';}
  catch{status='unverified';}
 }
 function save(value){
  if(!available())return false;
  const temporary=file+'.tmp';
  try{
   fs.mkdirSync(path.dirname(file),{recursive:true});
   fs.writeFileSync(temporary,safeStorage.encryptString(value),{mode:0o600});
   fs.renameSync(temporary,file);
   return true;
  }catch{return false;}
  finally{try{fs.rmSync(temporary,{force:true});}catch{}}
 }
 function snapshot(){
  const current=now();
  const active=!!verified&&current<Math.min(verified.checkedAt+OFFLINE,verified.endsAt??Infinity);
  return {active,persistent,endsAt:verified?.endsAt??null,checkedAt:verified?.checkedAt??null,
   status:active?(status==='unavailable'?'offline':'active'):status==='active'?'unverified':status};
 }
 function refresh(force=false){
  if(!key||pending||(!force&&now()<next))return Promise.resolve(snapshot());
  if(inflight)return inflight;
  const requested=key,revision=generation;
  const work=verify(requested,fetcher,now).then(result=>{
   if(revision!==generation)return snapshot();
   status=result.status;
   next=now()+(status==='unavailable'?RETRY:RECHECK);
   if(status==='active')verified={...result,checkedAt:now()};
   else if(status!=='unavailable')verified=null;
   return snapshot();
  }).finally(()=>{if(inflight===work)inflight=null;});
  inflight=work;
  return work;
 }
 async function activate(input){
  const candidate=normalizeKey(input);
  if(!candidate)return {status:'invalid-format',license:snapshot()};
  const revision=++generation;pending=revision;inflight=null;
  const result=await verify(candidate,fetcher,now);
  if(revision!==generation)return {status:'superseded',license:snapshot()};
  pending=0;
  if(result.status==='active'){
   key=candidate;verified={...result,checkedAt:now()};status='active';next=now()+RECHECK;
   persistent=save(candidate);
   if(!persistent)try{fs.rmSync(file,{force:true});}catch{}
  }
  return {status:result.status,license:snapshot()};
 }
 function clear(){
  fs.rmSync(file,{force:true});generation++;key=null;verified=null;status='free';persistent=false;inflight=null;pending=0;
  return snapshot();
 }
 return {load,activate,refresh,clear,snapshot};
}

module.exports={CHECKOUT,PRODUCT_ID,assess,verify,createLicense};
