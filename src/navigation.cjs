'use strict';
const {normalizeRepo}=require('./engine.cjs');
function repositoryUrl(repo){if(!normalizeRepo(repo))throw new Error('Invalid repository');return 'https://github.com/'+repo.full_name;}
function destination(repo,kind='repository',release){const base=repositoryUrl(repo);if(['repository','learn'].includes(kind))return base;if(kind==='readme')return base+'#readme';const paths={issues:'/issues',pulls:'/pulls',discussions:'/discussions',wiki:'/wiki',actions:'/actions',contributors:'/graphs/contributors',license:'#license-1-ov-file',commits:'/commits',tags:'/tags',forks:'/forks',stargazers:'/stargazers'};if(Object.hasOwn(paths,kind))return base+paths[kind];if(kind==='releases'){if(release?.available!==true)return null;return base+'/releases';}throw new Error('Unsupported repository action');}
class ReleaseClient{
 constructor({fetchImpl=fetch,now=Date.now,ttl=900000,timeout=8000}={}){this.fetch=fetchImpl;this.now=now;this.ttl=ttl;this.timeout=timeout;this.cache=new Map();this.inflight=new Map();}
 async get(repo,force=false){
  repositoryUrl(repo);const key=repo.full_name.toLowerCase(),cached=this.cache.get(key);if(!force&&cached&&cached.expires>this.now())return cached.value;if(this.inflight.has(key))return this.inflight.get(key);
  const task=(async()=>{
   try{
    const response=await this.fetch('https://api.github.com/repos/'+key+'/releases?per_page=1',{headers:{Accept:'application/vnd.github+json','User-Agent':'RepoPulse/0.3'},signal:AbortSignal.timeout(this.timeout)});
    if(!response.ok){if(response.status===404){const value={status:'missing',available:false,tag:null,checkedAt:new Date(this.now()).toISOString()};this.cache.set(key,{value,expires:this.now()+this.ttl});return value;}if([403,429].includes(response.status))return{status:'unknown',available:null,error:'GitHub rate limit reached. Retry releases later.'};throw new Error('GitHub releases returned '+response.status);}
    const data=await response.json();if(!Array.isArray(data))throw new Error('Unexpected release response.');
    const release=data.find(r=>r&&!r.draft&&typeof r.tag_name==='string'&&r.tag_name.trim().length>0);
    const value={status:release?'available':'missing',available:!!release,tag:release?release.tag_name.slice(0,120):null,checkedAt:new Date(this.now()).toISOString()};
    this.cache.set(key,{value,expires:this.now()+this.ttl});return value;
   }catch(error){return{status:'unknown',available:null,error:error.name==='TimeoutError'?'Release lookup timed out. Try again.':error.message};}
  })();this.inflight.set(key,task);try{return await task;}finally{this.inflight.delete(key);}
 }
}
module.exports={repositoryUrl,destination,ReleaseClient};

