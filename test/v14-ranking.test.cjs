'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {ranked}=require('../src/engine.cjs');
test('V14 ranking deduplicates repository IDs and excludes malformed entries',()=>{const repo={id:1,full_name:'example/project',description:'Example',stargazers_count:100000,topics:[],language:'JavaScript'};const result=ranked([repo,{...repo}, {...repo,id:2,full_name:'../bad'},null],{},'2026-11-28');assert.deepEqual(result.map(r=>r.id),[1]);});
