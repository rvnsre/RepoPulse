'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {CatalogCheckpoint,retryRequest}=require('../scripts/catalog-checkpoint.cjs');
const url='https://api.github.com/search/repositories?q=stars%3A%3E%3D5000&per_page=100&page=1';
const data={total_count:1,incomplete_results:false,items:[{id:1,full_name:'owner/repo',stargazers_count:20000}]};
test('Checkpoint resumes across process instances with source/time and no credentials',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'repopulse-checkpoint-'));
 try{let now=100000;const c=new CatalogCheckpoint(dir,{now:()=>now,ttl:1000});c.write(url,data);
  const resumed=new CatalogCheckpoint(dir,{now:()=>now,ttl:1000});assert.equal(resumed.read(url).items[0].id,1);assert.equal(resumed.resumed,1);assert.equal(resumed.provenance()[0].source,url);
  now+=1001;assert.equal(resumed.read(url),null);now=99000;assert.equal(resumed.read(url),null);
  assert.throws(()=>c.write(url,{...data,incomplete_results:true}),/incomplete/);
  assert.throws(()=>c.write('https://evil.test/path',data),/Unsupported/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('Malformed persisted pages are never reused',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'repopulse-checkpoint-'));
 try{const c=new CatalogCheckpoint(dir);fs.writeFileSync(c.file(url),'{broken');assert.equal(c.read(url),null);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('Transient errors use bounded exponential backoff and reject redirects',async()=>{
 const waits=[];let calls=0;const result=await retryRequest(url,{}, {now:()=>0,wait:async ms=>waits.push(ms),fetchImpl:async(_url,options)=>{assert.equal(options.redirect,'error');return{status:++calls<3?503:200,headers:new Headers()};}});
 assert.equal(result.status,200);assert.deepEqual(waits,[1000,2000]);
});
test('Long rate-limit deadlines fail instead of retrying before the server permits',async()=>{
 let calls=0;await assert.rejects(retryRequest(url,{}, {now:()=>0,wait:async()=>assert.fail('must not wait'),fetchImpl:async()=>{calls++;return{status:429,headers:new Headers({'retry-after':'120'})};}}),/resume the checkpoint/);assert.equal(calls,1);
});
test('Retry-After and reset headers are respected within the wait budget',async()=>{
 const waits=[];let calls=0;await retryRequest(url,{}, {now:()=>0,wait:async ms=>waits.push(ms),fetchImpl:async()=>({status:++calls===1?429:200,headers:new Headers({'retry-after':'3','x-ratelimit-reset':'5'})})});assert.deepEqual(waits,[6000]);
});
test('Interrupted release collection resumes pages and refuses incomplete inventory',async()=>{
 const {prepareCatalog}=require('../scripts/prepare-catalog.cjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'repopulse-release-catalog-')),target=path.join(dir,'catalog.json');
 const items=Array.from({length:101},(_,i)=>({id:i+1,full_name:'owner/repo'+i,stargazers_count:20000}));
 let fail=true,firstPageCalls=0;
 const fetchImpl=async input=>{const page=Number(new URL(input).searchParams.get('page'));if(page===1)firstPageCalls++;if(page===2&&fail)throw Error('interrupted');return new Response(JSON.stringify({total_count:101,incomplete_results:false,items:items.slice((page-1)*100,page*100)}));};
 try{
  const options={target,token:'test-token-not-persisted',minCount:1,delayMs:0,fetchImpl,retryOptions:{attempts:1}};
  await assert.rejects(prepareCatalog(options),/interrupted/);assert.equal(fs.existsSync(target),false);
  fail=false;const snapshot=await prepareCatalog(options);assert.equal(firstPageCalls,1);assert.equal(snapshot.count,101);assert.equal(snapshot.collection.resumedPages,1);assert.equal(snapshot.collection.complete,true);
  for(const file of fs.readdirSync(target+'.checkpoint'))assert.ok(!fs.readFileSync(path.join(target+'.checkpoint',file),'utf8').includes(options.token));
  assert.ok(snapshot.collection.pages.every(p=>p.source&&p.fetched_at));
  await assert.rejects(prepareCatalog({...options,target:path.join(dir,'partial.json'),fetchImpl:async()=>new Response(JSON.stringify({...data,total_count:2}))}),/fewer results/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
