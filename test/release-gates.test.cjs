'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {REQUIRED_GATES,missingGates}=require('../scripts/release-gates.cjs');
const green=()=>REQUIRED_GATES.map(name=>({name,status:'completed',conclusion:'success'}));
test('Legacy packaging success cannot authorize the master-spec release',()=>{
 const jobs=green().slice(0,7);
 assert.ok(missingGates(jobs).includes('accessibility'));
 assert.ok(missingGates(jobs).includes('installed-macos-arm64'));
});
test('Every required gate must complete successfully exactly once',()=>{
 assert.deepEqual(missingGates(green()),[]);
 for(const name of REQUIRED_GATES){
  for(const conclusion of ['failure','skipped','cancelled','neutral',null]){
   const jobs=green();jobs.find(j=>j.name===name).conclusion=conclusion;
   assert.deepEqual(missingGates(jobs),[name]);
  }
  const jobs=green();jobs.find(j=>j.name===name).status='in_progress';
  assert.deepEqual(missingGates(jobs),[name]);
  assert.deepEqual(missingGates([...green(),{name,status:'completed',conclusion:'success'}]),[name]);
 }
});
