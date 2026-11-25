'use strict';
// Throttle each stable card slot independently; a global throttle defeats stagger.
class RotationGate{
 constructor({now=Date.now}={}){this.now=now;this.last=new Map();}
 allowed(slot,seconds=15){
  if(!Number.isInteger(slot)||slot<0||slot>3)return false;
  const period=Math.max(5,Math.min(3600,Number.isFinite(seconds)?seconds:15))*1000;
  return !this.last.has(slot)||this.now()-this.last.get(slot)>=period;
 }
 record(slot){if(Number.isInteger(slot)&&slot>=0&&slot<4)this.last.set(slot,this.now());}
}
module.exports={RotationGate};
