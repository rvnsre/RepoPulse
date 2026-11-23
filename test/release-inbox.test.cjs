'use strict';

const {test}=require('node:test');
const assert=require('node:assert/strict');
const inbox=require('../src/release-inbox.cjs');
const {normalizeRepo}=require('../src/engine.cjs');

const repo=normalizeRepo({id:1,full_name:'owner/project',stargazers_count:6000});
const version=(id,day)=>inbox.release({id,tag_name:'v'+id,published_at:'2026-01-'+day+'T10:00:00Z'});

test('The watch inbox stores a silent baseline, then adds exactly one unread release',()=>{
 const old=inbox.observe(undefined,repo,version(1,'01'));
 assert.deepEqual(old.entries,[]);
 const next=inbox.observe(old,repo,version(2,'02'));
 assert.equal(next.entries[0].tag,'v2');
 assert.equal(next.entries[0].read,false);
 assert.equal(inbox.observe(next,repo,version(2,'02')),next);
 assert.equal(inbox.observe(next,repo,version(1,'01')),next);
 assert.equal(inbox.observe(next,repo,null),next);
});

test('A repository can be watched before it publishes its first release',()=>{
 const baseline=inbox.observe(undefined,repo,null);
 const next=inbox.observe(baseline,repo,version(1,'01'));
 const restored=inbox.restore(JSON.parse(JSON.stringify(inbox.markRead(next,1))),[repo]);
 assert.equal(restored.entries[0].read,true);
 assert.equal(inbox.observe(restored,repo,version(1,'01')),restored);
 assert.deepEqual(inbox.restore(restored,[]).baselines,{});
});

test('Draft, prerelease, invalid ID and invalid date are excluded',()=>{
 const valid={id:1,tag_name:'v1',published_at:'2026-01-01T10:00:00Z'};
 for(const change of [{draft:true},{prerelease:true},{id:-3},{published_at:'bad'},{tag_name:''}]){
  assert.equal(inbox.release({...valid,...change}),null);
 }
});
