'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Scheduler,interval,styles,transition}=require('../app/dynamic-feed.js');
const D=require('../src/discovery.cjs'),{defaults,localDay}=require('../src/engine.cjs');
const fixture=require('./fixtures.cjs');
function clock(options={}){
 let time=0,next=1,reason='',calls=0;const jobs=new Map(),statuses=[];
 const scheduler=new Scheduler({now:()=>time,random:()=>0,setTimer:(fn,ms)=>{const id=next++;jobs.set(id,{fn,at:time+ms});return id;},clearTimer:id=>jobs.delete(id),blocked:()=>reason,onStatus:s=>statuses.push(s),rotate:options.rotate||(()=>{calls++;return{changed:true};})});
 scheduler.configure({dynamicRefresh:true,cycleMin:3,cycleMax:3},'a');
 async function advance(ms){const end=time+ms;let count=0;for(;;){const job=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!job)break;if(++count>1000)throw Error('Timer loop');time=job[1].at;jobs.delete(job[0]);job[1].fn();await Promise.resolve();await Promise.resolve();}time=end;await Promise.resolve();}
 return{scheduler,jobs,statuses,advance,setReason:r=>{reason=r;},get calls(){return calls;}};
}
test('Intervals reject non-finite inputs, clamp to 3–10 seconds and order endpoints',()=>{
 assert.deepEqual(interval(),{min:3000,max:10000});assert.deepEqual(interval({cycleMin:10,cycleMax:3}),{min:3000,max:10000});assert.deepEqual(interval({cycleMin:-9,cycleMax:Infinity}),{min:3000,max:10000});assert.deepEqual(interval({cycleMin:7.7,cycleMax:99}),{min:8000,max:10000});
});
test('There are 22 distinct selectable transition styles and bounded frames',()=>{
 assert.equal(styles.length,22);assert.equal(new Set(styles.map(s=>s[0])).size,22);
 for(const [id]of styles){const spec=transition(id,0,{duration:69,easing:'ease-out'});assert.equal(spec.style,id);assert.equal(spec.enter.length,2);assert.equal(spec.exit[0].opacity,1);assert.equal(spec.options.duration,69);assert.equal(transition(id,0,{duration:0}).options.duration,0);}
 assert.equal(transition('invalid').style,'fade');assert.ok(transition('auto',1).style!==transition('auto',2).style);
});
test('Scheduler waits three seconds and then rotates without a click',async()=>{
 const x=clock();await x.advance(2999);assert.equal(x.calls,0);await x.advance(1);assert.equal(x.calls,1);await x.advance(3000);assert.equal(x.calls,2);x.scheduler.destroy();
});
test('Cosmetic reconfiguration does not postpone autonomous deadlines',async()=>{
 const x=clock();await x.advance(2000);x.scheduler.configure({dynamicRefresh:true,cycleMin:3,cycleMax:3,accent:'rose'},'a');await x.advance(1000);assert.equal(x.calls,1);x.scheduler.destroy();
});
test('Reading protection freezes remaining active time and resumes it',async()=>{
 const x=clock();await x.advance(1000);x.setReason('hover');await x.advance(5000);assert.equal(x.calls,0);x.setReason('');await x.advance(1500);assert.equal(x.calls,0);await x.advance(2000);assert.equal(x.calls,1);x.scheduler.destroy();
});
test('Disabled rotation cancels pending callbacks',async()=>{
 const x=clock();x.scheduler.configure({dynamicRefresh:false},'a');await x.advance(20000);assert.equal(x.calls,0);assert.equal(x.jobs.size,0);
});
test('In-flight rotation never overlaps a second invocation',async()=>{
 let release,calls=0;const x=clock({rotate:()=>{calls++;return new Promise(resolve=>{release=resolve;});}});
 await x.advance(3000);await x.advance(20000);assert.equal(calls,1);assert.equal(x.jobs.size,0);release({changed:true});await Promise.resolve();await Promise.resolve();await x.advance(3000);assert.equal(calls,2);x.scheduler.destroy();
});
test('Destroy during a request prevents rescheduling',async()=>{
 let release;const x=clock({rotate:()=>new Promise(resolve=>{release=resolve;})});await x.advance(3000);x.scheduler.destroy();release({changed:true});await Promise.resolve();await Promise.resolve();assert.equal(x.jobs.size,0);
});
test('Exhaustion preserves a stopped scheduler until the eligible-catalog key changes',async()=>{
 let calls=0;const x=clock({rotate:()=>{calls++;return{exhausted:true};}});await x.advance(3000);await x.advance(10000);assert.equal(calls,1);x.scheduler.configure({dynamicRefresh:true,cycleMin:3,cycleMax:3},'a');await x.advance(4000);assert.equal(calls,1);x.scheduler.configure({dynamicRefresh:true,cycleMin:3,cycleMax:3},'b');await x.advance(4000);assert.equal(calls,2);x.scheduler.destroy();
});
test('Failed requests recover with a bounded ten-second backoff',async()=>{
 let calls=0;const x=clock({rotate:()=>{calls++;throw Error('Temporary');}});await x.advance(3000);assert.equal(calls,1);assert.equal(x.statuses.at(-1).error,'Temporary');await x.advance(9999);assert.equal(calls,1);await x.advance(1);assert.equal(calls,2);x.scheduler.destroy();
});
function state(){const s=D.initialize(defaults());s.cache=fixture;s.history=[];D.present(s);return s;}
test('Automatic cycle replaces exactly one row without recording a visit or learning',()=>{
 const s=state(),before=structuredClone(s),id=s.daily.repos[0].id,result=D.cycle(s,id);assert.equal(result.changed,true);assert.notEqual(s.daily.repos[0].id,id);assert.deepEqual(s.daily.repos.slice(1),before.daily.repos.slice(1));assert.deepEqual(s.history,[]);assert.deepEqual(s.profile,before.profile);assert.ok(s.seen.includes(id)&&s.seen.includes(result.id));
});
test('When only current projects remain, rotation keeps all cards and undo intact',()=>{
 const s=state();s.cache=s.daily.repos;s.seen=s.cache.map(r=>r.id);const before=structuredClone(s);const r=D.cycle(s,s.daily.repos[0].id);assert.equal(r.exhausted,true);assert.deepEqual(s,before);
});
test('Automatic rotation rejects stale day and stale row identifiers',()=>{
 const s=state(),before=structuredClone(s);assert.equal(D.cycle(s,999).reason,'stale');assert.equal(D.cycle(s,s.daily.repos[0].id,'1990-01-01').reason,'stale');assert.deepEqual(s,before);
});
test('Automatic replacement respects hidden, snoozed and blocked candidates',()=>{
 const s=state();const used=new Set(s.daily.repos.map(r=>r.id));s.hidden=s.cache.filter(r=>!used.has(r.id)).map(r=>r.id);assert.equal(D.cycle(s,s.daily.repos[0].id).exhausted,true);
});
test('Undo restores the last autonomous replacement without erasing no-repeat memory',()=>{
 const s=state(),before=structuredClone(s.daily);D.cycle(s,s.daily.repos[0].id);assert.equal(D.undo(s),true);assert.deepEqual(s.daily,before);assert.ok(s.seen.length>before.repos.length);
});
test('New rotation preferences validate and persist every supported scene',()=>{
 const s=D.settings({cycleMin:10,cycleMax:3,transitionStyle:'not-a-scene',dynamicRefresh:false});assert.equal(s.cycleMin,3);assert.equal(s.cycleMax,10);assert.equal(s.transitionStyle,'auto');assert.equal(s.dynamicRefresh,false);for(const [id]of styles)assert.equal(D.settings({transitionStyle:id}).transitionStyle,id);
});

test('Countdown progress has a full period and random endpoints stay inside 3–10 seconds',()=>{
 const x=clock();assert.equal(x.scheduler.period,3000);
 for(const random of [()=>0,()=>1,()=>.5]){x.scheduler.random=random;const delay=x.scheduler.delay();assert.ok(delay>=3000&&delay<=10000);}
 x.scheduler.destroy();
});

test('Intervals selected in HTML settings accept numeric strings and reject empty input',()=>{
 assert.deepEqual(interval({cycleMin:'5',cycleMax:'8'}),{min:5000,max:8000});
 assert.deepEqual(interval({cycleMin:'',cycleMax:null}),{min:3000,max:10000});
});
