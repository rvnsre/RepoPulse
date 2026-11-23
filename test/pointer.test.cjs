'use strict';
const test=require('node:test'),assert=require('node:assert/strict');const {PointerTracker}=require('../src/pointer.cjs');
const small={x:460,y:6,width:360,height:80},large={x:160,y:6,width:960,height:443};
test('A stationary cursor remains inside across collapse/expand bounds',()=>{const t=new PointerTracker(),p={x:600,y:35};assert.equal(t.update(p,small).entered,true);for(const b of [large,small,large,small]){const s=t.update(p,b);assert.equal(s.inside,true);assert.equal(s.moved,false);assert.equal(s.entered,false);assert.equal(s.left,false);}});
test('Physical exit and re-entry are reported exactly once',()=>{const t=new PointerTracker();t.update({x:600,y:35},small);assert.equal(t.update({x:0,y:0},small).left,true);assert.equal(t.update({x:1,y:1},small).left,false);assert.equal(t.update({x:600,y:35},small).entered,true);assert.equal(t.update({x:601,y:35},small).entered,false);});
test('Geometry can move under a stationary cursor without becoming physical entry',()=>{const t=new PointerTracker();t.update({x:300,y:35},small);const next=t.update({x:300,y:35},large);assert.equal(next.entered,true);assert.equal(next.moved,false);});
test('Invalid cursor samples never create spurious enter/leave decisions',()=>{const t=new PointerTracker();t.update({x:600,y:35},small);assert.equal(t.update({x:NaN,y:0},large),null);assert.equal(t.update({x:600,y:35},small).entered,false);});

test('Pointer and mode unsubscription returns no uncloneable Electron objects',()=>{let api;const calls=[];const electron={contextBridge:{exposeInMainWorld:(_name,value)=>{api=value;}},ipcRenderer:{on:()=>{},removeListener:(topic)=>{calls.push(topic);return{uncloneable:()=>{}};}}};require('node:vm').runInNewContext(require('node:fs').readFileSync(require.resolve('../app/preload.cjs'),'utf8'),{require:id=>{assert.equal(id,'electron');return electron;}});for(const key of ['onPointer','onState','onMode'])assert.equal(api[key](()=>{})(),undefined);assert.deepEqual(calls,['pointer:state','state:changed','window:mode']);});

test('Polling slows far from the reveal strip and suppresses subpixel motion',()=>{
 const tracker=new PointerTracker();
 const near=tracker.update({x:600.1,y:35},small);
 assert.equal(PointerTracker.interval(near,'collapsed'),50);
 assert.equal(tracker.update({x:600.2,y:35},small).moved,false);
 assert.equal(PointerTracker.interval(tracker.update({x:100,y:300},small),'collapsed'),250);
});
