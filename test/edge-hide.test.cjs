'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../src/layout.cjs'),W=require('../src/window-policy.cjs'),D=require('../src/discovery.cjs'),E=require('../src/engine.cjs'),M=require('../app/morph.js'),{PointerTracker}=require('../src/pointer.cjs'),{Controller}=require('../app/island-motion.js');
test('Hidden footprint is 120 by 16 DIP under the top-center camera area',()=>{for(const scaleFactor of [1,1.25,1.5,2]){const area={x:-1920,y:28,width:1920,height:1052},b=L.bounds(area,{},'collapsed');assert.equal(b.width,120);assert.equal(b.height,16);assert.equal(b.y,area.y);assert.equal(b.x+b.width/2,area.x+area.width/2);}});
test('Late fit requests cannot enlarge the collapsed minimum to the old 64px pill',()=>assert.equal(L.fittedHeight(NaN,1080,true),16));
test('Default behavior starts hidden and exposes an immediate hover trigger',()=>{const p=D.settings();assert.equal(p.startCollapsed,true);assert.equal(p.hoverExpand,true);assert.equal(p.hoverDelay,0);assert.equal(p.hideDelay,80);assert.equal(p.keepOnFocus,false);});
test('Installed preferences receive the edge migration exactly once without losing personal data',()=>{const s=D.initialize({...E.defaults(),saved:[{id:1,full_name:'owner/repo',stargazers_count:80000}],profile:{weights:{ai:8}},settings:{autoHide:false,collapseOnLeave:false,hoverExpand:false,keepOnFocus:true,anchor:'left',startCollapsed:false}});assert.equal(s.settings.autoHide,true);assert.equal(s.settings.collapseOnLeave,true);assert.equal(s.settings.startCollapsed,true);assert.equal(s.settings.anchor,'center');assert.equal(s.saved.length,1);assert.equal(s.profile.weights.ai,8);s.settings.autoHide=false;D.initialize(s);assert.equal(s.settings.autoHide,false);});
test('The tiny native hot zone excludes neighboring browser tabs and the area below it',()=>{const b=L.bounds({x:0,y:0,width:1920,height:1080},{},'collapsed'),t=new PointerTracker();assert.equal(t.update({x:960,y:4},b).inside,true);assert.equal(t.update({x:1021,y:4},b).inside,false);assert.equal(t.update({x:960,y:17},b).inside,false);});
test('A stationary camera-edge pointer remains inside across window expansion',()=>{const area={x:0,y:0,width:1920,height:1080},small=L.bounds(area,{},'collapsed'),panel=L.bounds(area,{},'panel'),t=new PointerTracker(),p={x:960,y:4};t.update(p,small);assert.equal(t.update(p,panel).left,false);assert.equal(t.update(p,small).left,false);});
test('Linux draws a 68×5 rounded indicator with a larger native hot zone',()=>{
 const shape=W.dockShape(120,16,'collapsed');
 assert.equal(Math.min(...shape.map(r=>r.x)),26);
 assert.equal(Math.max(...shape.map(r=>r.x+r.width)),94);
 assert.equal(Math.min(...shape.map(r=>r.y)),2);
 assert.equal(Math.max(...shape.map(r=>r.y+r.height)),7);
 assert.ok(shape[0].width<68&&shape.at(-1).width<68);
});
test('The compact native pill rounds both ends while Advanced remains flush at the top',()=>{
 const mini=W.dockShape(520,74,'mini'),panel=W.dockShape(920,320,'panel');
 assert.ok(mini[0].width<520&&mini.at(-1).width<520);
 assert.ok(mini.some(r=>r.width===520));
 assert.equal(panel[0].width,920);
 assert.ok(panel.at(-1).width<920);
});
test('Morphs account separately for expanded padding and the edge handle zero padding',()=>{const area={x:0,y:0,width:1920,height:1080},panel=L.bounds(area,{},'panel'),small=L.bounds(area,{},'collapsed');for(const value of [M.transform(panel,small,8,0),M.transform(small,panel,0,8)])assert.ok(!/NaN|Infinity/.test(value));});
test('A delayed reveal is cancelled immediately on a real pointer exit',()=>{let task,expanded=0;const c=new Controller({setTimer:fn=>{task=fn;return 1;},clearTimer:()=>{task=null;},onExpand:()=>expanded++});c.configure({hoverExpand:true,hoverDelay:80},'collapsed');c.enter();c.leave();assert.equal(task,null);assert.equal(expanded,0);c.destroy();});

for(const operation of ['refresh','opening','next picks'])test('Pending '+operation+' does not pin the panel after pointer exit',()=>{let next=0;const tasks=new Map(),events=[];const c=new Controller({setTimer:fn=>{tasks.set(++next,fn);return next;},clearTimer:id=>tasks.delete(id),onCollapse:r=>events.push(r)});c.configure({autoHide:true,collapseOnLeave:true,hideDelay:80,keepOnFocus:false});c.enter();c.hold(operation,true);c.leave();assert.ok(c.timers.leave!==undefined);tasks.get(c.timers.leave)();assert.deepEqual(events,['leave']);c.destroy();});
