'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const D=require('../src/discovery.cjs'),E=require('../src/engine.cjs');
const {CardScheduler}=require('../app/dynamic-feed.js');
function harness(){
 let now=0,id=0,blocked='';const jobs=new Map(),calls=[];
 const scheduler=new CardScheduler({now:()=>now,setTimer:(fn,ms)=>{jobs.set(++id,{fn,at:now+ms});return id;},clearTimer:id=>jobs.delete(id),blocked:()=>blocked,rotate:index=>{calls.push({index,at:now});return{};}});
 async function advance(ms){const end=now+ms;for(let guard=0;guard<10000;guard++){const due=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;jobs.delete(due[0]);due[1].fn();await Promise.resolve();await Promise.resolve();}now=end;}
 return{scheduler,calls,jobs,advance,block:reason=>blocked=reason};
}
test('Fresh installs and legacy migrations start manual without changing the star filter',()=>{
 assert.equal(D.settings().dynamicRefresh,false);
 for(const settings of [{},{liveRevision:1,dynamicRefresh:true,minStars:20000},{liveRevision:2,dynamicRefresh:true,minStars:25000}]){
  const state=D.initialize({...E.defaults(),settings});
  assert.equal(state.settings.dynamicRefresh,false);
  if(settings.minStars)assert.equal(state.settings.minStars,settings.minStars);
  state.settings.dynamicRefresh=true;D.initialize(state);assert.equal(state.settings.dynamicRefresh,true);
 }
});
test('Card intervals honor preferences and retain independent 300ms stagger',async()=>{
 const h=harness();h.scheduler.configure({dynamicRefresh:true,cycleSeconds:15});
 await h.advance(14999);assert.equal(h.calls.length,0);await h.advance(901);
 assert.deepEqual(h.calls.map(c=>c.at),[15000,15300,15600,15900]);h.scheduler.destroy();
});
test('Focus/motion suspension remains latched through blur and state refresh until explicit resume',async()=>{
 const h=harness(),prefs={dynamicRefresh:true,cycleSeconds:10};h.scheduler.configure(prefs);
 h.scheduler.suspend();h.scheduler.configure(prefs,'new catalog');await h.advance(60000);
 assert.equal(h.calls.length,0);assert.equal(h.jobs.size,0);
 h.scheduler.resume();h.scheduler.configure(prefs);await h.advance(10000);assert.equal(h.calls.length,1);h.scheduler.destroy();
});
for(const reason of ['hidden','editing','workspace','focus session','busy'])test('Swaps block while '+reason,async()=>{
 const h=harness();h.scheduler.configure({dynamicRefresh:true,cycleSeconds:5});h.block(reason);await h.advance(10000);assert.equal(h.calls.length,0);
 h.block('');await h.advance(1000);assert.ok(h.calls.length>0);h.scheduler.destroy();
});
test('Manual-mode reset does not arm any timers',async()=>{
 const h=harness();h.scheduler.configure({dynamicRefresh:false});h.scheduler.reset();await h.advance(60000);assert.equal(h.calls.length,0);assert.equal(h.jobs.size,0);
});
