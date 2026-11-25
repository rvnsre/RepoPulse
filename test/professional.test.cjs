'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {ProfessionalClient,DOMAINS,TTL,queryUrl}=require('../src/professional.cjs');
const now=Date.parse('2026-11-25T08:00:00Z');
const repo=(id,stars=10,extra={})=>({id,full_name:'owner/repo'+id,stargazers_count:stars,topics:['medical-imaging'],pushed_at:'2026-11-20T00:00:00Z',license:{spdx_id:'Apache-2.0'},...extra});
const response=items=>new Response(JSON.stringify({incomplete_results:false,total_count:items.length,items}));
test('All sixteen professional profiles use fixed topics without popularity floors or free-text input',()=>{
 assert.equal(Object.keys(DOMAINS).length,16);for(const domain of Object.keys(DOMAINS)){const url=new URL(queryUrl(domain));assert.equal(url.origin,'https://api.github.com');assert.ok(!url.searchParams.get('q').includes('stars:'));assert.equal(url.searchParams.get('per_page'),'30');}
 for(const invalid of ['__proto__','patient name','https://evil.test',null])assert.throws(()=>queryUrl(invalid),/supported/);
});
test('Professional results include low-star repositories and transparent uncertain evidence',async()=>{
 const c=new ProfessionalClient({now:()=>now,fetchImpl:async()=>response([repo(1,1),repo(2,999999,{topics:[],pushed_at:'2020-01-01T00:00:00Z',license:null}),repo(1,1),repo(3,10,{fork:true}),repo(4,10,{private:true})])});
 const page=await c.get('imaging',{refresh:true});assert.equal(page.entries.length,2);assert.equal(page.entries[0].repo.id,1);const e=page.entries[0].evidence;
 assert.equal(e.verification_state,'source-reported');assert.equal(e.identifier,'1');assert.ok(e.source&&e.fetched_at);assert.ok(e.unknown.includes('security advisories'));assert.ok(page.medicalNotice.includes('not clinical validation'));
});
test('No network request occurs without explicit refresh and no profile data is sent',async()=>{
 let calls=0;const c=new ProfessionalClient({now:()=>now,fetchImpl:async(url,options)=>{calls++;assert.equal(url,queryUrl('imaging'));assert.equal(options.method,'GET');assert.equal(options.body,undefined);assert.equal(options.redirect,'error');return response([repo(1)]);}});
 assert.equal((await c.get('imaging')).status,'unavailable');assert.equal(calls,0);await c.get('imaging',{refresh:true});assert.equal(calls,1);await c.get('imaging');assert.equal(calls,1);
});
test('Fresh/stale cache and offline/no-cache states expose age, preserve provenance and persist across restart',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'repopulse-professional-')),file=path.join(dir,'public.json');let time=now;
 try{const c=new ProfessionalClient({file,now:()=>time,fetchImpl:async()=>response([repo(1)])});const live=await c.get('imaging',{refresh:true});assert.equal(live.live,true);
  const offline=new ProfessionalClient({file,now:()=>time,fetchImpl:async()=>{throw Error('offline');}});assert.equal((await offline.get('imaging')).status,'cached');time+=TTL+1;
  const stale=await offline.get('imaging',{refresh:true});assert.equal(stale.status,'stale');assert.equal(stale.fetched_at,live.fetched_at);assert.equal(stale.entries[0].repo.id,1);assert.ok(stale.error);offline.clear();assert.equal(fs.existsSync(file),false);assert.equal((await offline.get('imaging')).status,'unavailable');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('Malformed and incomplete refreshes retain prior evidence; oversized response fails closed',async()=>{
 let data=response([repo(1)]);const c=new ProfessionalClient({now:()=>now,fetchImpl:async()=>data});await c.get('imaging',{refresh:true});
 for(const bad of [new Response('{bad'),new Response(JSON.stringify({incomplete_results:true,total_count:0,items:[]})),new Response('x',{headers:{'content-length':'99999999'}})]){data=bad;const page=await c.get('imaging',{refresh:true});assert.equal(page.entries[0].repo.id,1);assert.ok(page.error);}
});
test('Deleting the cache during a pending refresh prevents it being repopulated',async()=>{
 let resolve;const promise=new Promise(r=>resolve=r),c=new ProfessionalClient({now:()=>now,fetchImpl:()=>promise});
 const pending=c.get('imaging',{refresh:true});c.clear();resolve(response([repo(1)]));await pending;assert.equal((await c.get('imaging')).entries.length,0);
});
