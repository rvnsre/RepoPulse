'use strict';

const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {PRODUCT_ID,assess,verify,createLicense}=require('../src/rss-plus.cjs');
const {toggle,exportWatchlist}=require('../src/watchlist.cjs');
const {bounds}=require('../src/layout.cjs');
const key='ABCDEF12-ABCDEF12-ABCDEF12-ABCDEF12',now=Date.parse('2026-11-21T08:00:00Z');
function purchase(overrides={}){
 return {success:true,purchase:{product_id:PRODUCT_ID,variants:'Version: RSS+',recurrence:'monthly',subscription_id:'sub',...overrides}};
}
const response=data=>({ok:true,json:async()=>data});
test('Only the monthly RSS+ tier of the intended product can activate',()=>{
 assert.equal(assess(purchase(),now).status,'active');
 assert.equal(assess(purchase({product_id:'elsewhere'}),now).status,'wrong-product');
 for(const data of [{variants:'Free'},{recurrence:'yearly'},{subscription_id:null}])
  assert.equal(assess(purchase(data),now).status,'wrong-plan');
 assert.equal(assess(purchase({variants:{Tier:'RSS+'}}),now).status,'active');
 assert.equal(assess(purchase({variants:'',price:500,currency:'usd'}),now).status,'active');
 assert.equal(assess(purchase({variants:'Free',price:500,currency:'usd'}),now).status,'wrong-plan');
 for(const data of [{refunded:true},{chargebacked:true},{disputed:true},{test:true},{subscription_ended_at:new Date(now).toISOString()}])
  assert.equal(assess(purchase(data),now).status,'inactive');
 assert.deepEqual(assess(purchase({subscription_cancelled_at:new Date(now+1000).toISOString()}),now),{status:'active',endsAt:now+1000});
});
test('Verification uses POST and never counts a recheck as another use',async()=>{
 const status=await verify(key.toLowerCase().replaceAll('-','–')+'\n',async(url,opts)=>{
  assert.equal(url,'https://api.gumroad.com/v2/licenses/verify');
  assert.equal(opts.method,'POST');
  assert.equal(opts.body.get('product_id'),PRODUCT_ID);
  assert.equal(opts.body.get('license_key'),key);
  assert.equal(opts.body.get('increment_uses_count'),'false');
  return response(purchase());
 },()=>now);
 assert.equal(status.status,'active');
});
test('A timeout preserves a recent activation; known expiry and revocation remove access',async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'rp-license-'));
 const file=path.join(folder,'license');
 let timestamp=now,state=purchase();
 const safeStorage={isEncryptionAvailable:()=>false};
 const license=createLicense({safeStorage,file,now:()=>timestamp,fetcher:async()=>{
  if(!state)throw Error('network');
  return response(state);
 }});
 try{
  assert.equal((await license.activate(key)).license.active,true);
  assert.equal(fs.existsSync(file),false);
  state=null;
  assert.equal((await license.refresh(true)).status,'offline');
  timestamp+=14*24*60*60*1000;
  assert.equal(license.snapshot().active,false);
  state=purchase();
  assert.equal((await license.refresh(true)).active,true);
  state=purchase({refunded:true});
  assert.equal((await license.refresh(true)).active,false);
  assert.equal(license.clear().status,'free');
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('Removing a key cancels an outstanding activation',async()=>{
 let complete;
 const file=path.join(os.tmpdir(),'unused-rss-plus-'+process.pid);
 const license=createLicense({safeStorage:{isEncryptionAvailable:()=>false},file,fetcher:()=>new Promise(r=>{complete=r;})});
 const pending=license.activate(key);
 license.clear();
 complete(response(purchase()));
 assert.equal((await pending).status,'superseded');
 assert.equal(license.snapshot().active,false);
});
test('Watchlist exports official release feed URLs and only matching release metadata',()=>{
 const repo={id:3,full_name:'org/repo',stargazers_count:60000};
 const items=toggle([],repo);
 assert.equal(toggle(items,repo).length,0);
 assert.ok(exportWatchlist(items,'rss').includes('xmlUrl="https://github.com/org/repo/releases.atom"'));
 assert.match(exportWatchlist(items,'digest',{3:{fullName:'org/repo',tag:'v2'}}),/v2/);
 assert.doesNotMatch(exportWatchlist(items,'digest',{3:{fullName:'else/repo',tag:'v2'}}),/v2/);
});
test('Dynamic Island is wider and taller than the hidden edge handle and fits a small display',()=>{
 const area={x:20,y:30,width:400,height:260};
 const compact=bounds(area,{},'mini'),hidden=bounds(area,{},'collapsed');
 assert.equal(compact.height,74);
 assert.ok(compact.width>hidden.width&&compact.x>=area.x&&compact.x+compact.width<=area.x+area.width);
});

test('Verified licenses survive restart offline and recheck after six hours',async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'rp-license-persist-'));
 const file=path.join(folder,'license');
 const safeStorage={isEncryptionAvailable:()=>true,encryptString:value=>Buffer.from(value),decryptString:value=>value.toString()};
 let time=now,requests=0,online=true;
 const options={safeStorage,file,now:()=>time,fetcher:async()=>{
  requests++;
  if(!online)throw Error('offline');
  return response(purchase());
 }};
 try{
  await createLicense(options).activate(key);
  const license=createLicense(options);license.load();
  assert.equal(license.snapshot().active,true);
  await license.refresh();
  assert.equal(requests,1);
  time+=6*60*60*1000;online=false;
  assert.equal((await license.refresh()).status,'offline');
  assert.equal(requests,2);
  time=now+14*24*60*60*1000;
  assert.equal(license.snapshot().active,false);
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
