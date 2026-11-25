'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {RotationGate}=require('../src/rotation-gate.cjs');
test('Four backend slots may rotate 300ms apart while each retains its own interval',()=>{
 let time=10000;const gate=new RotationGate({now:()=>time});
 for(let slot=0;slot<4;slot++){assert.equal(gate.allowed(slot,5),true);gate.record(slot);time+=300;}
 time=14999;assert.equal(gate.allowed(0,5),false);time=15000;assert.equal(gate.allowed(0,5),true);assert.equal(gate.allowed(1,5),false);
 time=15900;for(let slot=0;slot<4;slot++)assert.equal(gate.allowed(slot,5),true);
});
test('Custom backend intervals, clock rollback and invalid slots fail safely',()=>{
 let time=10000;const gate=new RotationGate({now:()=>time});gate.record(0);
 time=24999;assert.equal(gate.allowed(0,15),false);time=25000;assert.equal(gate.allowed(0,15),true);
 time=1;assert.equal(gate.allowed(0,15),false);for(const slot of [-1,4,null,'0',NaN])assert.equal(gate.allowed(slot),false);
});
