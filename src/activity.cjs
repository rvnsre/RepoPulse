'use strict';
const {repositoryUrl}=require('./navigation.cjs');
const validDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?value:null;
function observe(previous={},repos=[],now=Date.now()){
 const out={};for(const repo of repos){const old=Array.isArray(previous[repo.id])?previous[repo.id].filter(s=>Number.isFinite(s.at)&&s.at<=now&&s.at>=now-3*86400000&&Number.isSafeInteger(s.stars)&&s.stars>=0):[];const day=new Date(now).toISOString().slice(0,10),sample={at:now,stars:repo.stargazers_count};out[repo.id]=[...old.filter(s=>new Date(s.at).toISOString().slice(0,10)!==day),sample].slice(-4);}return out;
}
function velocity(samples=[]){if(samples.length<2)return null;const latest=samples.at(-1),prior=samples.slice(0,-1).find(s=>latest.at-s.at>=23*3600000&&latest.at-s.at<=25*3600000);return prior?{delta:latest.stars-prior.stars,hours:Math.round((latest.at-prior.at)/3600000),observedAt:new Date(latest.at).toISOString()}:null;}
class ActivityClient{
 constructor({fetchImpl=fetch,now=Date.now,limit=36,ttl=900000}={}){this.fetch=fetchImpl;this.now=now;this.limit=limit;this.ttl=ttl;this.used=[];this.cache=new Map();this.inflight=new Map();this.active=0;this.retryAt=0;}
 async get(repo){repositoryUrl(repo);const key=repo.full_name.toLowerCase(),now=this.now(),cached=this.cache.get(key);if(cached?.expires>now)return cached.value;if(this.inflight.has(key))return this.inflight.get(key);this.used=this.used.filter(t=>now-t<3600000);if(now<this.retryAt||this.used.length+(!require('./install.cjs').known(repo)&&['JavaScript','TypeScript'].includes(repo.language)?3:2)>this.limit||this.active>=2)return cached?.value||{status:'deferred'};
  const manifestRequired=!require('./install.cjs').known(repo)&&['JavaScript','TypeScript'].includes(repo.language);this.used.push(now,now,...(manifestRequired?[now]:[]));this.active++;
  const task=(async()=>{try{const headers={Accept:'application/vnd.github+json','User-Agent':'RepoPulse/11.1'};const responses=await Promise.all(['releases/latest','commits?per_page=1',...(manifestRequired?['contents/package.json']:[])].map(route=>this.fetch('https://api.github.com/repos/'+key+'/'+route,{headers:{...headers,...(route==='contents/package.json'?{Accept:'application/vnd.github.raw+json'}:{})},signal:AbortSignal.timeout(8000)})));
   for(const r of responses)if([403,429].includes(r.status)){const reset=Number(r.headers?.get('x-ratelimit-reset'))*1000;this.retryAt=Math.max(now+60000,Number.isFinite(reset)?reset:now+900000);throw Error('GitHub activity rate-limited');}
   const [release,commits,manifest]=await Promise.all(responses.map(async r=>r.ok?await r.json():null));
   const commit=Array.isArray(commits)?commits[0]:null;
   const value={packageName:require('./install.cjs').packageName(manifest,repo),status:responses.every(r=>r.ok||[404,409].includes(r.status))?'ready':'partial',tag:typeof release?.tag_name==='string'&&release.tag_name.trim()?release.tag_name.trim().slice(0,120):null,releasedAt:validDate(release?.published_at),committedAt:validDate(commit?.commit?.committer?.date),sha:typeof commit?.sha==='string'&&/^[a-f0-9]{40,64}$/i.test(commit.sha)?commit.sha.slice(0,7):null,checkedAt:new Date(now).toISOString()};this.cache.set(key,{value,expires:now+this.ttl});return value;
  }catch{return cached?.value||{status:'unavailable'};}finally{this.active--;}})();this.inflight.set(key,task);try{return await task;}finally{this.inflight.delete(key);}
 }
}
module.exports={ActivityClient,observe,velocity};
