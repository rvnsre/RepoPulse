'use strict';
const {normalizeRepo}=require('./engine.cjs');
const pages=new Map();
async function fetchCatalog(previous=[], fetchImpl=fetch) {
  let repos=[];
  for(let page=1;page<=3;page++) {
    const url=`https://api.github.com/search/repositories?q=stars:%3E%3D50000+archived:false+fork:false&sort=stars&order=desc&per_page=100&page=${page}`;
    const cached=pages.get(url),response=await fetchImpl(url,{headers:{'Accept':'application/vnd.github+json','User-Agent':'RepoPulse/11.1',...(cached?.etag?{'If-None-Match':cached.etag}:{})},signal:AbortSignal.timeout(20000)});
    if(response.status===304&&cached){repos.push(...cached.repos);if(cached.short)break;continue;}
    if(!response.ok) {
      const reset=response.headers.get('x-ratelimit-reset');
      if(response.status===403||response.status===429) throw new Error(`GitHub rate limit reached. Your cached picks remain available.${reset?` Try after ${new Date(Number(reset)*1000).toLocaleTimeString()}.`:''}`);
      throw new Error(`GitHub returned ${response.status}. Try again later.`);
    }
    const data=await response.json();
    if(!Array.isArray(data.items)) throw new Error('GitHub returned an unexpected response.');
    const normalized=data.items.map(normalizeRepo).filter(Boolean);if(fetchImpl===fetch)pages.set(url,{etag:response.headers?.get('etag'),repos:normalized,short:data.items.length<100});repos.push(...normalized);
    if(data.items.length<100) break;
  }
  return [...new Map(repos.map(r=>[r.id,r])).values()];
}
module.exports={fetchCatalog};
