'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../src/catalog-policy.cjs'),E=require('../src/engine.cjs'),D=require('../src/discovery.cjs'),{fetchCatalog}=require('../src/github.cjs');
const repo=(id,stars=55000)=>E.normalizeRepo({id,full_name:'owner'+id+'/repo'+id,stargazers_count:stars,description:'Developer tools',topics:['cli']});
test('One policy governs defaults, eligibility and live query threshold',async()=>{assert.equal(P.MIN_STARS,5000);assert.equal(D.settings().minStars,20000);assert.equal(E.eligible(repo(1,4999)),false);assert.equal(E.eligible(repo(1,5000)),true);const rows=await fetchCatalog([],async url=>{assert.match(new URL(url).searchParams.get('q'),/stars:>=5000/);return{ok:true,json:async()=>({total_count:1,items:[repo(1)]})};});assert.equal(rows.length,1);assert.equal(fetchCatalog.info.target,10001);});
test('70K default migrates once while explicit higher filters survive',()=>{for(const minStars of [70000,100000,200000]){const s=D.initialize({...E.defaults(),settings:{catalogRevision:2,minStars}});assert.equal(s.settings.minStars,minStars===70000?5000:minStars);assert.equal(s.catalogUpgradePending,true);s.cacheAt='2026-11-18T00:00:00Z';D.initialize(s);assert.equal(s.cacheAt,'2026-11-18T00:00:00Z');}});
test('Upgrade merges the bundled pool into a nonempty old cache offline',()=>{const s=D.initialize({...E.defaults(),cache:[repo(1,80000)],saved:[repo(1,80000)],settings:{catalogRevision:2,minStars:70000}});const before=JSON.stringify(s.saved);D.bootstrap(s,[repo(1),repo(2),repo(3)]);assert.equal(s.cache.length,3);assert.equal(s.daily.repos.length,2);assert.ok(s.daily.repos.every(repo=>repo.id!==1));assert.equal(s.cacheAt,null);assert.equal(s.catalogUpgradePending,false);assert.equal(s.catalogInfo.target,10001);assert.equal(JSON.stringify(s.saved),before);D.bootstrap(s,[repo(4)]);assert.equal(s.cache.length,3);});
test('Verified startup snapshot has unique real IDs and includes new 50K–70K entries',()=>{const seed=require('../src/catalog-seed.json');assert.equal(seed.count,seed.repos.length);assert.equal(new Set(seed.repos.map(r=>r.id)).size,seed.repos.length);assert.ok(seed.repos.length>301);assert.ok(seed.repos.every(r=>E.eligible(r)&&r.stargazers_count>=5000));assert.ok(seed.repos.some(r=>r.stargazers_count<70000));});
test('No 50K floor is silently bypassed by a current row or a replacement',()=>{const s=D.initialize(E.defaults());s.cache=[repo(1,4999),repo(2),repo(3),repo(4),repo(5)];D.present(s);assert.equal(s.daily.repos.length,4);for(let i=0;i<12;i++){D.rotate(s,s.daily.repos[0].id);assert.ok(s.daily.repos.every(r=>r.stargazers_count>=5000));}});
test('Repeated pages cannot masquerade as a complete unique catalog',async()=>{const items=Array.from({length:100},(_,i)=>repo(i+1));await assert.rejects(fetchCatalog([],async()=>({ok:true,json:async()=>({total_count:200,items})})),/fewer results/);});
test('Missing totals at GitHub 1000-result cap do not claim completeness',async()=>{await assert.rejects(fetchCatalog([],async url=>{const page=Number(new URL(url).searchParams.get('page'));return{ok:true,json:async()=>({items:Array.from({length:100},(_,i)=>repo(page*100+i))})};}),/omitted total/);});
for(const total_count of [-1,NaN,Infinity,'531'])test('Malformed total count '+String(total_count)+' is rejected',async()=>{await assert.rejects(fetchCatalog([],async()=>({ok:true,json:async()=>({total_count,items:[]})})),/unexpected response/);});
test('A false empty successful response cannot wipe a known catalog',async()=>{await assert.rejects(fetchCatalog([repo(1)],async()=>({ok:true,json:async()=>({total_count:0,items:[]})})),/no eligible/);});
test('Contradictory zero total with nonempty items is rejected',async()=>{await assert.rejects(fetchCatalog([],async()=>({ok:true,json:async()=>({total_count:0,items:[repo(1)]})})),/unexpected response/);});
test('A 10,105-repo fixture exercises actual sharded pagination without shipping fake entries',async()=>{const data=Array.from({length:10105},(_,i)=>repo(i+1,50000+i));const rows=await fetchCatalog([],async url=>{const u=new URL(url),m=u.searchParams.get('q').match(/stars:(?:>=(\d+)|(\d+)\.\.(\d+))/),lo=Number(m[1]||m[2]),hi=m[3]?Number(m[3]):Infinity,page=Number(u.searchParams.get('page')),items=data.filter(r=>r.stargazers_count>=lo&&r.stargazers_count<=hi).sort((a,b)=>b.stargazers_count-a.stargazers_count);return{ok:true,json:async()=>({total_count:items.length,items:items.slice((page-1)*100,page*100)})};});assert.equal(rows.length,10105);assert.equal(new Set(rows.map(r=>r.id)).size,10105);});

test('Overlapping star partitions cannot claim a complete catalog',async()=>{await assert.rejects(fetchCatalog([],async url=>{const u=new URL(url),q=u.searchParams.get('q'),page=Number(u.searchParams.get('page'));if(q==='stars:>=5000 archived:false fork:false is:public')return{ok:true,json:async()=>({total_count:1001,items:Array.from({length:100},(_,i)=>repo(i+1,80000+i))})};const lower=q.includes('..'),count=lower?500:501,items=Array.from({length:count},(_,i)=>repo(i+1));return{ok:true,json:async()=>({total_count:count,items:items.slice((page-1)*100,page*100)})};}),/fewer unique/);});
test('Annotation capacity treats zero-padded imported IDs as the same repository',()=>{const w=require('../src/workspace.cjs'),records=Object.fromEntries(Array.from({length:2000},(_,i)=>[i+1,{}]));assert.doesNotThrow(()=>w.ensureCapacity(records,['0001','0002']));});

test('Small search-index drift retains cached entries without claiming completeness',async()=>{
 const previous=[repo(1),repo(2),repo(3)];
 const result=await fetchCatalog(previous,async()=>({ok:true,json:async()=>({total_count:3,items:previous.slice(0,2)})}));
 assert.deepEqual(new Set(result.map(item=>item.id)),new Set([1,2,3]));
 assert.equal(fetchCatalog.info.complete,false);
});

test('A large catalog shortfall refuses to replace the existing cache',async()=>{
 const previous=Array.from({length:20},(_,i)=>repo(i+1));
 await assert.rejects(fetchCatalog(previous,async()=>({ok:true,json:async()=>({total_count:20,items:previous.slice(0,15)})})),/Cached projects remain available/);
 assert.equal(previous.length,20);
});
