'use strict';
const {normalizeRepo}=require('./engine.cjs');
function repositoryUrl(repo){if(!normalizeRepo(repo))throw new Error('Invalid repository');return 'https://github.com/'+repo.full_name;}
function destination(repo,kind='repository',release){const base=repositoryUrl(repo);if(['repository','learn'].includes(kind))return base;if(kind==='latest-release'){
 const tag=typeof release?.tag==='string'?release.tag.trim():'';
 if(tag&&tag!=='.'&&tag!=='..')return base+'/releases/tag/'+encodeURIComponent(tag);
 return base+'/releases'+(release?.checkedAt?'':'/latest');
 }if(kind==='readme')return base+'#readme';const paths={feed:'/releases.atom',issues:'/issues',pulls:'/pulls',discussions:'/discussions',wiki:'/wiki',actions:'/actions',contributors:'/graphs/contributors',license:'#license-1-ov-file',commits:'/commits',tags:'/tags',forks:'/forks',stargazers:'/stargazers'};if(Object.hasOwn(paths,kind))return base+paths[kind];if(kind==='releases'){if(release?.available!==true)return null;return base+'/releases';}throw new Error('Unsupported repository action');}
function releaseAssets(releases,repo,platform,arch){
 const prefix=repositoryUrl(repo).toLowerCase()+'/releases/download/';
 const windows=/[._-](win(?:dows|32|64)?)(?=[._-])/;
 const mac=/[._-](mac(?:os)?|darwin|osx)(?=[._-])/;
 const linux=/[._-]linux(?=[._-])/;
 const names=new Set(),out=[];
 for(const release of releases){
  for(const item of Array.isArray(release.assets)?release.assets:[]){
   if(item?.state!=='uploaded'||typeof item.name!=='string'||!Number.isSafeInteger(item.size)||item.size<=0)continue;
   const name=item.name.toLowerCase(),token='-'+name;
   if(/(?:^|[._-])(source|src|symbols|debug)(?=[._-])/.test(name))continue;
   const universal=/(?:^|[._-])universal(?:2)?(?=[._-])/.test(name);
   const cpu=/(?:^|[._-])(?:aarch64|arm64)(?=[._-])/.test(name)?'arm64':/(?:^|[._-])(?:x64|amd64|x86_64|win64)(?=[._-])/.test(name)?'x64':null;
   const binary=platform==='win32'?/\.(exe|msi|msix)$/.test(name)||(windows.test(token)&&/\.zip$/.test(name)):
    platform==='darwin'?/\.(dmg|pkg|app\.tar\.gz)$/.test(name):
    platform==='linux'&&(/\.(rpm|deb|appimage)$/.test(name)||(linux.test(token)&&/\.tar\.gz$/.test(name)));
   if(!binary||!(cpu===arch||platform==='darwin'&&universal)||names.has(name))continue;
   let url;
   try{url=new URL(item.browser_download_url);}catch{continue;}
   if(url.origin!=='https://github.com'||url.username||url.password||!url.href.toLowerCase().startsWith(prefix))continue;
   names.add(name);
   out.push({name:item.name,size:item.size,url:url.href,tag:release.tag_name});
  }
 }
 return out.slice(0,24);
}
class ReleaseClient{
 constructor({fetchImpl=fetch,now=Date.now,ttl=900000,timeout=8000}={}){this.fetch=fetchImpl;this.now=now;this.ttl=ttl;this.timeout=timeout;this.cache=new Map();this.inflight=new Map();this.retryAt=0;}
 remember(key,value,ttl=this.ttl,etag=null){this.cache.delete(key);this.cache.set(key,{value,etag,expires:this.now()+ttl});while(this.cache.size>256)this.cache.delete(this.cache.keys().next().value);return value;}
 async get(repo,force=false){
  repositoryUrl(repo);const key=repo.full_name.toLowerCase(),cached=this.cache.get(key);if(!force&&cached&&cached.expires>this.now())return cached.value;if(this.inflight.has(key))return this.inflight.get(key);if(this.now()<this.retryAt)return{status:'unknown',available:null,error:'GitHub rate limit reached. Retry releases later.'};
  const task=(async()=>{
   try{
    const response=await this.fetch('https://api.github.com/repos/'+key+'/releases?per_page=5',{headers:{Accept:'application/vnd.github+json','User-Agent':'RepoPulse',...(cached?.etag?{'If-None-Match':cached.etag}:{})},signal:AbortSignal.timeout(this.timeout)});
    if(response.status===304&&cached)return this.remember(key,cached.value,this.ttl,cached.etag);
    if(!response.ok){if(response.status===404){const value={status:'missing',available:false,tag:null,checkedAt:new Date(this.now()).toISOString()};return this.remember(key,value);}if([403,429].includes(response.status)){const retry=Number(response.headers?.get('retry-after')),reset=Number(response.headers?.get('x-ratelimit-reset'))*1000;this.retryAt=Math.max(this.now()+60000,Number.isFinite(reset)?Math.min(reset,this.now()+3600000):0,Number.isFinite(retry)?this.now()+Math.min(3600,retry)*1000:0);return this.remember(key,{status:'unknown',available:null,error:'GitHub rate limit reached. Retry releases later.'},60000);}throw new Error('GitHub releases returned '+response.status);}
    const data=await response.json();if(!Array.isArray(data))throw new Error('Unexpected release response.');
    const releases=data.filter(r=>r&&!r.draft&&typeof r.tag_name==='string'&&r.tag_name.trim().length>0);
    const release=releases[0];
    const value={assets:releaseAssets(releases,repo,process.platform,process.arch),status:release?'available':'missing',available:!!release,tag:release?release.tag_name.slice(0,120):null,checkedAt:new Date(this.now()).toISOString()};
    return this.remember(key,value,this.ttl,response.headers?.get('etag'));
   }catch(error){return this.remember(key,{status:'unknown',available:null,error:error.name==='TimeoutError'?'Release lookup timed out. Try again.':error.message},30000);}
  })();this.inflight.set(key,task);try{return await task;}finally{this.inflight.delete(key);}
 }
}
module.exports={repositoryUrl,destination,releaseAssets,ReleaseClient};

