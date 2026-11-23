'use strict';const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {Store}=require('../src/store.cjs');
test('store survives restart and preserves corrupt files before resetting',()=>{const directory=fs.mkdtempSync(path.join(os.tmpdir(),'repopulse-test-'));try{const file=path.join(directory,'state.json');const store=new Store(file);store.update(s=>{s.profile.weights={ai:8};});assert.deepEqual(new Store(file).state.profile.weights,{ai:8});fs.writeFileSync(file,'broken json');const recovered=new Store(file);assert.deepEqual(recovered.state.profile.weights,{});assert.ok(fs.readdirSync(directory).some(name=>name.startsWith('state.json.recovery-')));}finally{fs.rmSync(directory,{recursive:true,force:true});}});

test('Deferred writes coalesce, retry Windows file locks, and flush before restart',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rp-deferred-'));
 const file=path.join(dir,'state.json');
 const original=fs.promises.rename;
 let attempts=0;
 fs.promises.rename=async (...args)=>{
  if(++attempts===1)throw Object.assign(Error('Locked'),{code:'EBUSY'});
  return original(...args);
 };
 try{
  const store=new Store(file,{deferred:true});
  const cache=store.state.cache;
  store.update(s=>{s.profile.weights={ai:1};});
  store.update(s=>{s.profile.weights={ai:9};});
  assert.equal(store.state.cache,cache);
  assert.equal(fs.existsSync(file),false);
  await store.flush();
  assert.equal(attempts,2);
  assert.deepEqual(new Store(file).state.profile.weights,{ai:9});
  assert.deepEqual(fs.readdirSync(dir),['state.json']);
 }finally{fs.promises.rename=original;fs.rmSync(dir,{recursive:true,force:true});}
});

test('Deferred shutdown flush persists the last pending snapshot immediately',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rp-shutdown-'));
 const file=path.join(dir,'state.json');
 try{
  const store=new Store(file,{deferred:true});
  store.update(s=>{s.profile.weights={tools:8};});
  await store.flushOnQuit();
  assert.equal(new Store(file).state.profile.weights.tools,8);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
