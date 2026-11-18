'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('../src/discovery.cjs'),E=require('../src/engine.cjs');
const {releaseAssets}=require('../src/navigation.cjs');
const repo=(id,name='example/repo'+id,stars=110000)=>({id,full_name:name,stargazers_count:stars,language:'Rust',topics:['cli']});
const now=Date.UTC(2026,10,18);
function state(cache){
 const s=D.initialize(E.defaults());
 s.settings.minStars=100000;
 s.cache=cache;
 D.present(s,now);
 return s;
}
test('Queue filters low stars, book marks and both aliases of a canonical repo',()=>{
 const s=state([repo(1),repo(2),repo(3),repo(4),repo(5,'EXAMPLE/Repo4'),repo(6,'other/low',99999)]);
 assert.equal(s.feed.matchingCount,4);
 assert.equal(s.feed.queueIds.length,1);
 const before=s.daily.repos.map(r=>r.id);
 const next=D.nextBatch(s,now+1);
 assert.equal(next.revisited,false);
 assert.equal(s.feed.queueIds.length,0);
 assert.ok(!before.includes(next.id));
 assert.equal(D.nextBatch(s,now+2).changed,false);
 const last=s.daily.repos.map(r=>r.id);
 const replay=D.nextBatch(s,now+s.settings.cooldownWindowMs+2);
 assert.equal(replay.revisited,true);
 assert.ok(!last.includes(replay.id));
});
test('Undo revalidates current metadata and all active filters',()=>{
 const s=state(Array.from({length:7},(_,i)=>repo(i+1)));
 const previous=s.daily.repos[0].id;
 D.nextBatch(s,now+1);
 s.cache=s.cache.map(r=>r.id===previous?{...r,stargazers_count:1}:r);
 D.undo(s,now+2);
 assert.ok(s.daily.repos.every(r=>r.stargazers_count>=100000));
 assert.ok(!s.daily.repos.some(r=>r.id===previous));
});
test('Only matching uploaded assets from the same repository are offered',()=>{
 const project=repo(1);
 const names=['project-linux-x64.AppImage','project-linux-arm64.rpm','project-win-x64.exe','source-linux-x64.tar.gz','project.tar.gz'];
 const assets=names.map(name=>({name,size:4096,state:'uploaded',browser_download_url:'https://github.com/example/repo1/releases/download/v1/'+name}));
 assets.push({...assets[0],name:'foreign-linux-x64.deb',browser_download_url:'https://example.test/installer'});
 const release={tag_name:'v1',assets};
 assert.deepEqual(releaseAssets([release],project,'linux','x64').map(a=>a.name),[names[0]]);
 assert.deepEqual(releaseAssets([release],project,'win32','x64').map(a=>a.name),[names[2]]);
});

test('Linux launch on login quotes the installed binary without a shell command',()=>{
 const {desktopEntry}=require('../src/startup.cjs');
 assert.match(desktopEntry('/opt/Repo Pulse/bin'),/Exec="\/opt\/Repo Pulse\/bin"/);
 assert.throws(()=>desktopEntry('/opt/repo\nExec=bad'),/Invalid/);
});

test('A settings update cannot strand an already queued hover reveal',()=>{
 const {Controller}=require('../app/island-motion.js');
 const pending=new Map();let id=0,expanded=0;
 const controller=new Controller({setTimer:fn=>{pending.set(++id,fn);return id;},clearTimer:id=>pending.delete(id),onExpand:()=>expanded++});
 controller.configure({hoverExpand:true,hoverDelay:80},'collapsed');
 controller.enter();
 controller.configure({hoverExpand:true,hoverDelay:0},'collapsed');
 assert.equal(pending.size,1);
 pending.values().next().value();
 assert.equal(expanded,1);
});

test('Mixed catalog responses do not date cached star counts as new observations',async()=>{
 const {fetchCatalog}=require('../src/github.cjs'),{observe}=require('../src/activity.cjs');
 const rows=Array.from({length:101},(_,i)=>repo(i+1));
 const read=revalidate=>async url=>{
  const page=Number(new URL(url).searchParams.get('page'));
  if(revalidate&&page===2)return{status:304};
  return{ok:true,headers:new Headers({etag:'page-'+page}),json:async()=>({total_count:101,items:page===2?rows.slice(100):rows.slice(0,100)})};
 };
 const first=await fetchCatalog([],read(false),{cachePages:true});
 const prior=observe({},first,now);
 const second=await fetchCatalog(first,read(true),{cachePages:true});
 const next=observe(prior,fetchCatalog.observations,now+86400000,second);
 assert.equal(next[1].length,2);
 assert.equal(next[101].length,1);
});

test('An unsuccessful or older lookup preserves the verified release',()=>{
 const {rememberRelease}=require('../src/activity.cjs');
 const current=rememberRelease({},repo(1),{releaseChecked:true,tag:'v2',checkedAt:'2026-11-18T00:00:00Z'});
 assert.equal(current[1].tag,'v2');
 assert.strictEqual(rememberRelease(current,repo(1),{releaseChecked:false}),current);
 assert.strictEqual(rememberRelease(current,repo(1),{releaseChecked:true,tag:'v1',checkedAt:'2026-11-17T00:00:00Z'}),current);
});
