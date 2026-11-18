'use strict';
const {repositoryUrl}=require('./navigation.cjs');
const validDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?value:null;
const DAY=86400000;
function sampleDay(sample) {
 if(typeof sample?.dateUtc==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(sample.dateUtc)&&Number.isFinite(Date.parse(sample.dateUtc)))return sample.dateUtc;
 if(Number.isSafeInteger(sample?.at)&&Math.abs(sample.at)<=8640000000000000)return new Date(sample.at).toISOString().slice(0,10);
 return null;
}
function observe(previous={},repos=[],now=Date.now(),catalog=repos){
 const today=new Date(now).toISOString().slice(0,10),first=new Date(now-89*DAY).toISOString().slice(0,10);
 const out={},observations=new Map(repos.map(repo=>[repo.id,repo.stargazers_count]));
 for(const repo of catalog){
  const days=new Map();
  for(const sample of Array.isArray(previous?.[repo.id])?previous[repo.id]:[]){
   const dateUtc=sampleDay(sample);
   if(dateUtc&&dateUtc>=first&&dateUtc<=today&&Number.isSafeInteger(sample.stars)&&sample.stars>=0)days.set(dateUtc,{dateUtc,stars:sample.stars});
  }
  const stars=observations.get(repo.id);
  if(Number.isSafeInteger(stars)&&stars>=0)days.set(today,{dateUtc:today,stars});
  if(days.size)out[repo.id]=[...days.values()].sort((a,b)=>a.dateUtc.localeCompare(b.dateUtc));
 }
 return out;
}
function velocity(input=[]){
 const days=new Map();
 for(const sample of Array.isArray(input)?input:[]){
  const day=sampleDay(sample);
  if(day&&Number.isSafeInteger(sample.stars)&&sample.stars>=0)days.set(day,sample.stars);
 }
 const latest=[...days.keys()].sort().at(-1);
 if(!latest)return null;
 const current=Date.parse(latest);
 const delta=offset=>{
  const day=new Date(current-offset*DAY).toISOString().slice(0,10);
  return days.has(day)?days.get(latest)-days.get(day):null;
 };
 const daily=delta(1),weekly=delta(7);
 if(daily===null&&weekly===null)return null;
 return {delta:daily??weekly,hours:daily===null?168:24,daily,weekly,observedAt:latest};
}
class ActivityClient{
 constructor({fetchImpl=fetch,now=Date.now,limit=36,ttl=900000}={}){this.fetch=fetchImpl;this.now=now;this.limit=limit;this.ttl=ttl;this.used=[];this.cache=new Map();this.inflight=new Map();this.active=0;this.retryAt=0;}
 async get(repo){repositoryUrl(repo);const key=repo.full_name.toLowerCase(),now=this.now(),cached=this.cache.get(key);if(cached?.expires>now)return cached.value;if(this.inflight.has(key))return this.inflight.get(key);this.used=this.used.filter(t=>now-t<3600000);if(now<this.retryAt||this.used.length+(!require('./install.cjs').known(repo)&&['JavaScript','TypeScript'].includes(repo.language)?3:2)>this.limit||this.active>=2)return cached?.value||{status:'deferred'};
  const manifestRequired=!require('./install.cjs').known(repo)&&['JavaScript','TypeScript'].includes(repo.language);this.used.push(now,now,...(manifestRequired?[now]:[]));this.active++;
  const task=(async()=>{try{const headers={Accept:'application/vnd.github+json','User-Agent':'RepoPulse/11.1'};const settled=await Promise.allSettled(['releases/latest','commits?per_page=1',...(manifestRequired?['contents/package.json']:[])].map(route=>this.fetch('https://api.github.com/repos/'+key+'/'+route,{headers:{...headers,...(route==='contents/package.json'?{Accept:'application/vnd.github.raw+json'}:{})},signal:AbortSignal.timeout(8000)})));
   if(settled.every(r=>r.status==='rejected'))throw Error('GitHub activity unavailable');const responses=settled.map(r=>r.status==='fulfilled'?r.value:{ok:false,status:0});for(const r of responses)if([403,429].includes(r.status)){const reset=Number(r.headers?.get('x-ratelimit-reset'))*1000;this.retryAt=Math.max(now+60000,Number.isFinite(reset)?Math.min(reset,now+3600000):now+900000);throw Error('GitHub activity rate-limited');}
   const malformed=new Set();const [release,commits,manifest]=await Promise.all(responses.map(async (r,index)=>{if(!r.ok)return null;try{return await r.json();}catch{malformed.add(index);return null;}}));
   const commit=Array.isArray(commits)?commits[0]:null;
   const value={releaseChecked:responses[0].status===404||responses[0].ok&&!malformed.has(0)&&typeof release?.tag_name==='string'&&!!release.tag_name.trim(),packageName:require('./install.cjs').packageName(manifest,repo),status:!malformed.size&&responses.every(r=>r.ok||[404,409].includes(r.status))?'ready':'partial',tag:typeof release?.tag_name==='string'&&release.tag_name.trim()?release.tag_name.trim().slice(0,120):null,releasedAt:validDate(release?.published_at),committedAt:validDate(commit?.commit?.committer?.date),sha:typeof commit?.sha==='string'&&/^[a-f0-9]{40,64}$/i.test(commit.sha)?commit.sha.slice(0,7):null,checkedAt:new Date(now).toISOString()};this.cache.set(key,{value,expires:now+(value.status==='ready'?this.ttl:60000)});while(this.cache.size>256)this.cache.delete(this.cache.keys().next().value);return value;
  }catch{const value=cached?.value||{status:'unavailable'};this.cache.set(key,{value,expires:now+60000});while(this.cache.size>256)this.cache.delete(this.cache.keys().next().value);return value;}finally{this.active--;}})();this.inflight.set(key,task);try{return await task;}finally{this.inflight.delete(key);}
 }
}
function rememberRelease(previous,repo,activity){
 if(!activity.releaseChecked||!Number.isFinite(Date.parse(activity.checkedAt)))return previous;
 const key=String(repo.id),entry={fullName:repo.full_name,tag:activity.tag,releasedAt:activity.releasedAt,checkedAt:activity.checkedAt};
 const input=previous&&typeof previous==='object'&&!Array.isArray(previous)?previous:{};
 if(input[key]?.fullName===entry.fullName&&Date.parse(input[key].checkedAt)>=Date.parse(entry.checkedAt))return previous;
 return Object.fromEntries(Object.entries({...input,[key]:entry}).sort((a,b)=>Date.parse(b[1]?.checkedAt)-Date.parse(a[1]?.checkedAt)).slice(0,512));
}
module.exports={ActivityClient,observe,velocity,rememberRelease};
