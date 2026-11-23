'use strict';

const {normalizeRepo}=require('./engine.cjs');

const MAX_ENTRIES=200;
const stamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?value:null;

function release(raw){
 const id=raw?.id,tag=raw?.tag_name,releasedAt=stamp(raw?.published_at);
 if(!Number.isSafeInteger(id)||id<=0||typeof tag!=='string'||!tag.trim()||tag.length>255||
    !releasedAt||raw.draft||raw.prerelease)return null;
 return {id,tag,title:typeof raw.name==='string'?raw.name.trim().slice(0,180):'',releasedAt};
}

function observe(inbox,repo,next){
 const old=inbox?.baselines?.[repo.id];
 if(!old||old.fullName!==repo.full_name){
  return {...inbox,baselines:{...inbox?.baselines,[repo.id]:{fullName:repo.full_name,release:next}},entries:inbox?.entries||[]};
 }
 // A deleted release or a temporarily older "latest" result must not rewind history.
 if(!next||old.release&&(next.id===old.release.id||Date.parse(next.releasedAt)<=Date.parse(old.release.releasedAt)))return inbox;
 const entries=inbox.entries||[];
 const newEntry={...next,repo,read:false};
 return {
  baselines:{...inbox.baselines,[repo.id]:{fullName:repo.full_name,release:next}},
  entries:entries.some(entry=>entry.id===next.id&&entry.repo.id===repo.id)?entries:[newEntry,...entries].slice(0,MAX_ENTRIES)
 };
}
function restore(input,watched=[]){
 const active=new Map(watched.map(repo=>[String(repo.id),repo]));
 const parsed=x=>release({id:x?.id,tag_name:x?.tag,name:x?.title,published_at:x?.releasedAt});
 const baselines={};
 for(const [id,baseline] of Object.entries(input?.baselines||{})){
  if(!active.has(id)||active.get(id).full_name!==baseline?.fullName)continue;
  if(baseline.release===null||parsed(baseline.release))baselines[id]={fullName:baseline.fullName,release:parsed(baseline.release)};
 }
 const entries=[],seen=new Set();
 for(const item of (Array.isArray(input?.entries)?input.entries:[])){
  const repo=normalizeRepo(item?.repo),value=parsed(item);
  if(!repo||!value)continue;
  const key=repo.id+':'+value.id;if(seen.has(key))continue;
  seen.add(key);
  entries.push({...value,repo,read:item.read===true});
  if(entries.length===MAX_ENTRIES)break;
 }
 return {baselines,entries};
}
function markRead(inbox,id){
 return {...inbox,entries:inbox.entries.map(item=>id==null||item.id===id?{...item,read:true}:item)};
}
module.exports={release,observe,restore,markRead};
