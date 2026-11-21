'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {settings,initialize}=require('../src/discovery.cjs');
const {bounds}=require('../src/layout.cjs');
const {Controller,config}=require('../app/island-motion.js');
test('Compact defaults reveal immediately and debounce pointer leave',()=>{
 const p=settings();assert.equal(p.panelWidth,920);assert.equal(p.hideDelay,80);assert.equal(p.hoverDelay,0);assert.ok(config(p).duration<=80);
});
test('Old installations receive compact settings once without losing personal controls',()=>{
 const s=initialize({settings:{panelWidth:1280,hideDelay:1600,hoverDelay:160,textScale:130,autoReplace:false}});
 assert.equal(s.settings.panelWidth,920);assert.equal(s.settings.hideDelay,80);assert.equal(s.settings.textScale,130);assert.equal(s.settings.autoReplace,false);
 s.settings.panelWidth=1080;s.settings.hideDelay=600;initialize(s);assert.equal(s.settings.panelWidth,1080);assert.equal(s.settings.hideDelay,600);
});
test('Zero leave delay remains zero and does not fall back to a long timeout',()=>{
 const jobs=[],events=[];const c=new Controller({setTimer:(fn,ms)=>{jobs.push({fn,ms});return jobs.length;},clearTimer:()=>{},onCollapse:r=>events.push(r)});
 c.configure({...settings(),hideDelay:0,idleCollapse:false});assert.equal(jobs[0].ms,0);jobs[0].fn();assert.deepEqual(events,['leave']);c.destroy();
});
test('Compact bounds substantially reduce discovery footprint',()=>{
 const r=bounds({x:0,y:0,width:1920,height:1080},settings());assert.equal(r.width,920);assert.ok(r.height<500);
 const dock=bounds({x:0,y:0,width:1920,height:1080},settings(),'collapsed');assert.equal(dock.width,120);assert.equal(dock.height,16);
});
