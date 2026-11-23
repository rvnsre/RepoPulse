'use strict';
const USER_AGENT='RepoPulse/'+require('../package.json').version;
const {normalizeRepo,eligible}=require('./engine.cjs');
const {MIN_STARS,MAX_CATALOG,TARGET_CATALOG}=require('./catalog-policy.cjs');const pages=new Map();
async function fetchCatalog(previous=[],fetchImpl=fetch,{delayMs=fetchImpl===fetch?6500:0,cachePages=fetchImpl===fetch,requireComplete=true,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 const found=new Map(),freshRepos=new Map();let requests=0,available=0,expected=null,freshPages=0,partitionShortfall=0;
 const observedIds=new Set();
 async function read(low,high,page=1){
  if(requests++&&delayMs)await wait(delayMs);
  const stars=high==null?'>='+low:low+'..'+high,query='stars:'+stars+' archived:false fork:false is:public';
  const url='https://api.github.com/search/repositories?q='+encodeURIComponent(query)+'&sort=stars&order=desc&per_page=100&page='+page;
  const cached=pages.get(url),response=await fetchImpl(url,{headers:{Accept:'application/vnd.github+json','User-Agent':USER_AGENT,...(cached?.etag?{'If-None-Match':cached.etag}:{})},signal:AbortSignal.timeout(20000)});
  if(response.status===304&&cached)return cached.data;
  if(!response.ok){const reset=response.headers?.get('x-ratelimit-reset');if([403,429].includes(response.status))throw Error('GitHub rate limit reached. Cached projects remain available.'+(reset?' Retry after '+new Date(Number(reset)*1000).toLocaleTimeString()+'.':''));throw Error('GitHub returned '+response.status+'. Cached projects remain available.');}
  freshPages++;
  const data=await response.json();if(!data||!Array.isArray(data.items)||data.incomplete_results===true||data.total_count!=null&&(!Number.isSafeInteger(data.total_count)||data.total_count<0||data.items.length>data.total_count))throw Error('GitHub returned an incomplete or unexpected response. Cached projects remain available.');
  for(const raw of data.items){const repo=normalizeRepo(raw);if(repo&&eligible(repo))freshRepos.set(repo.id,repo);}
  if(cachePages){pages.set(url,{etag:response.headers?.get('etag'),data});while(pages.size>256)pages.delete(pages.keys().next().value);}
  return data;
 }
 function add(items){for(const raw of items){const repo=normalizeRepo(raw);if(!repo)continue;observedIds.add(repo.id);if(eligible(repo)&&repo.stargazers_count>=MIN_STARS)found.set(repo.id,repo);}if(found.size>MAX_CATALOG)throw Error('Catalog exceeds the '+MAX_CATALOG+'-project capacity. Cached projects remain available.');}
 async function range(low,high=null,depth=0){
  if(depth>32)throw Error('GitHub search partition limit reached.');
  const first=await read(low,high),count=Number.isSafeInteger(first.total_count)?first.total_count:null;if(depth===0){expected=count;available=count??first.items.length;}
  if(depth===0&&count>MAX_CATALOG)throw Error('Catalog exceeds the '+MAX_CATALOG+'-project capacity. Cached projects remain available.');if(count>1000){const peak=high??Math.max(low,...first.items.map(r=>Number(r.stargazers_count)||0));if(peak<=low)throw Error('GitHub caps identical-star search cohorts at 1000; cached projects remain available.');const mid=Math.min(peak-1,Math.max(low,Math.floor(Math.sqrt(low*peak))));await range(low,mid,depth+1);await range(mid+1,high,depth+1);return;}
  const ids=new Set();const collect=items=>{add(items);for(const r of items){const repo=normalizeRepo(r);if(repo&&eligible(repo)&&repo.stargazers_count>=MIN_STARS)ids.add(repo.id);}};collect(first.items);let loaded=first.items.length,last=first.items;
  for(let page=2;page<=10&&last.length===100&&(count==null||loaded<count);page++){const data=await read(low,high,page);last=data.items;loaded+=last.length;collect(last);}
  if(count==null&&loaded>=1000)throw Error('GitHub omitted total count at its search cap. Cached projects remain available.');if(count!=null)partitionShortfall+=Math.max(0,count-ids.size);
 }
 await range(MIN_STARS);
 if((available>0||previous.length)&&!found.size)throw Error('GitHub returned no eligible projects. Cached projects remain available.');
 const shortfall=Math.max(partitionShortfall,(expected??found.size)-found.size);
 if(requireComplete&&shortfall){
  const tolerance=Math.max(1,Math.floor((expected??found.size)*0.05));
  if(!previous.length||shortfall>tolerance){
   const detail=partitionShortfall?'fewer results than reported in a search partition':'fewer unique results across search partitions';
   throw Error('GitHub returned '+detail+'. Cached projects remain available.');
  }
  // A shifting search index must not evict cached projects based on a partial scan.
  const merged=new Map();
  for(const item of previous){
   const repo=normalizeRepo(item);
   if(repo&&!observedIds.has(repo.id)&&eligible(repo)&&repo.stargazers_count>=MIN_STARS)merged.set(repo.id,repo);
  }
  for(const [id,repo] of found)merged.set(id,repo);
  if(merged.size>MAX_CATALOG)throw Error('Partial catalog exceeds capacity. Cached projects remain available.');
  for(const [id,repo] of merged)found.set(id,repo);
 }
 const repos=[...found.values()].sort((a,b)=>b.stargazers_count-a.stargazers_count||a.id-b.id);
 fetchCatalog.info={loaded:repos.length,available:expected??repos.length,target:TARGET_CATALOG,capacity:MAX_CATALOG,minStars:MIN_STARS,complete:shortfall===0,freshPages,checkedAt:new Date().toISOString()};
 fetchCatalog.observations=repos.flatMap(repo=>freshRepos.has(repo.id)?[freshRepos.get(repo.id)]:[]);
 return repos;
}
module.exports={fetchCatalog,MIN_STARS,MAX_CATALOG};
