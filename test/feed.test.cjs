'use strict';const {test}=require('node:test');const assert=require('node:assert/strict');const {rss}=require('../src/feed.cjs');const {normalizeRepo}=require('../src/engine.cjs');
test('RSS escapes untrusted descriptions, filters ineligible entries and uses stable GitHub links',()=>{const repo=normalizeRepo({id:1,full_name:'owner/repo',stargazers_count:80000,description:'a <script> & "quote"\u0001'});const feed=rss({repos:[repo,{...repo,id:2,stargazers_count:1}]},new Date('2026-01-01T12:00:00Z'));assert.ok(feed.startsWith('<?xml'));assert.ok(feed.includes('&lt;script&gt; &amp; &quot;quote&quot;'));assert.ok(!feed.includes('\u0001'));assert.equal((feed.match(/<item>/g)||[]).length,1);assert.ok(feed.includes('https://github.com/owner/repo'));assert.ok(feed.includes('Thu, 01 Jan 2026 12:00:00 GMT'));});

test('RSS exports all four cards, including projects below the old 50K floor',()=>{
 const repos=Array.from({length:5},(_,i)=>normalizeRepo({id:i+1,full_name:'owner/repo'+i,stargazers_count:6000}));
 const feed=rss({repos});
 assert.equal((feed.match(/<item>/g)||[]).length,4);
 assert.ok(feed.includes('https://github.com/owner/repo3'));
 assert.doesNotMatch(feed,/50,000/);
});
