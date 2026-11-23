'use strict';
const fs=require('node:fs');

function createGitHubSession({safeStorage,tokenPath,fetchImpl=fetch,now=Date.now}){
 let token='',loaded=false,warning=null;
 const limits=new Map();
 const active=new AbortController();
 const valid=value=>typeof value==='string'&&/^[-A-Za-z0-9_]{20,255}$/.test(value);
 function encryptionAvailable(){
  try{return safeStorage.isEncryptionAvailable()&&safeStorage.getSelectedStorageBackend?.()!=='basic_text';}
  catch{return false;}
 }
 function load(){
  if(loaded)return token;
  loaded=true;
  if(!fs.existsSync(tokenPath))return token;
  if(!encryptionAvailable()){
   warning='The OS keychain is unavailable. GitHub requests are anonymous until you enter a session token.';
   return token;
  }
  try{
   const stored=safeStorage.decryptString(fs.readFileSync(tokenPath));
   if(!valid(stored))throw Error('Invalid stored token');
   token=stored;
  }catch{warning='The saved GitHub token could not be unlocked. Requests are anonymous until you replace it.';}
  return token;
 }
 function set(value){
  if(typeof value!=='string')throw new Error('Invalid GitHub token.');
  const next=value.trim();
  if(next&&!valid(next))throw new Error('Invalid GitHub token format.');
  let notice=null;
  if(!next)fs.rmSync(tokenPath,{force:true});
  else if(!encryptionAvailable()){
   notice='The OS keychain is unavailable. This token is kept in memory for this session only.';
  }else{
   const temp=tokenPath+'.'+require('node:crypto').randomUUID()+'.tmp';
   try{fs.writeFileSync(temp,safeStorage.encryptString(next),{mode:0o600,flag:'wx'});fs.renameSync(temp,tokenPath);}
   finally{fs.rmSync(temp,{force:true});}
  }
  token=next;loaded=true;warning=notice;limits.clear();
 }
 async function request(input,options={}){
  const url=new URL(input);
  if(url.origin!=='https://api.github.com'||url.username||url.password)throw new Error('Unsupported GitHub API endpoint.');
  const scope=url.pathname.startsWith('/search/')?'search':'core';
  const current=limits.get(scope);
  if(current?.until>now())throw new Error('GitHub rate limit. Retry after '+new Date(current.until).toLocaleTimeString()+'.');
  const credential=load();
  const response=await fetchImpl(url.href,{...options,redirect:'error',signal:options.signal?AbortSignal.any([options.signal,active.signal]):active.signal,headers:{...options.headers,...(credential?{Authorization:'Bearer '+credential}:{})}});
  if(response.status===401)throw new Error('GitHub rejected the configured token. Replace or remove it in Settings.');
  if(response.status===403||response.status===429){
   const attempts=(current?.attempts||0)+1;
   const reset=Number(response.headers?.get('x-ratelimit-reset'))*1000;
   const retry=Number(response.headers?.get('retry-after'))*1000;
   const until=Math.max(now()+Math.min(3600000,30000*2**Math.min(attempts,7)),reset||0,now()+(retry||0));
   limits.set(scope,{attempts,until});
   throw new Error('GitHub rate limit. Retry after '+new Date(until).toLocaleTimeString()+'.');
  }
  if(response.ok||response.status===304)limits.delete(scope);
  return response;
 }
 return {request,set,retryAt:()=>Math.max(0,...[...limits.values()].map(limit=>limit.until)),close:()=>active.abort(),configured:()=>Boolean(load()),notice:()=>{load();return warning;}};
}
module.exports={createGitHubSession};
