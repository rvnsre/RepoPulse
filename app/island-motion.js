(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.IslandMotion=factory();})(typeof window==='object'?window:this,function(){
'use strict';
const presets={fluid:{duration:340,easing:'cubic-bezier(.16,1,.3,1)',distance:10},snappy:{duration:190,easing:'cubic-bezier(.2,.9,.3,1)',distance:7},calm:{duration:460,easing:'cubic-bezier(.25,.46,.45,.94)',distance:5},spring:{duration:420,easing:'cubic-bezier(.22,1.22,.36,1)',distance:12}};
function config(prefs={},reduced=false){const p=presets[prefs.motionPreset]||presets.fluid;return{...p,duration:prefs.motion==='none'||prefs.reducedMotion||(prefs.motion!=='full'&&reduced)?0:Math.round(p.duration*(Number(prefs.motionDuration)||220)/220),scale:Math.max(1,Math.min(1.03,Number(prefs.hoverScale||102)/100)),distance:prefs.subtleMotion?p.distance/2:p.distance};}
function frames(kind,prefs={},reduced=false){const c=config(prefs,reduced),d=c.distance;
 const pairs={enter:[{opacity:0,transform:'translateY('+d+'px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],exit:[{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(-'+d/2+'px) scale(.985)'}],replace:[{opacity:0,transform:'translateX('+d+'px)'},{opacity:1,transform:'translateX(0)'}],leave:[{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(-'+d+'px)'}],dock:[{opacity:.65,transform:'scale(.96)'},{opacity:1,transform:'scale(1)'}]};
 return {keyframes:pairs[kind]||pairs.enter,options:{duration:c.duration,easing:c.easing}};
}
class Controller{
 constructor({onExpand=()=>{},onCollapse=()=>{},onChange=()=>{},setTimer=setTimeout,clearTimer=clearTimeout,now=Date.now}={}){
  this.onExpand=onExpand;this.onCollapse=onCollapse;this.onChange=onChange;this.setTimer=setTimer;this.clearTimer=clearTimer;this.now=now;this.timers={};this.pointer=false;this.focused=false;this.holds=new Set();this.pausedUntil=0;this.mode='panel';this.prefs={};this.destroyed=false;this.lastActivity=now();
 }
 clear(name){if(this.timers[name]!==undefined){this.clearTimer(this.timers[name]);delete this.timers[name];}}
 schedule(name,delay,fn){this.clear(name);if(this.destroyed)return;this.timers[name]=this.setTimer(()=>{delete this.timers[name];if(!this.destroyed)fn();},Math.max(0,delay));}
 configure(prefs,mode=this.mode){this.prefs={...prefs};this.mode=mode;this.rearm();}
 blocked(){return this.holds.size>0||this.mode==='workspace'||this.now()<this.pausedUntil||(this.focused&&this.prefs.keepOnFocus!==false);}
 rearm(){this.clear('idle');this.clear('leave');if(!this.prefs.autoHide||this.mode!=='panel'||this.blocked())return;
  if(!this.pointer&&this.prefs.collapseOnLeave)this.schedule('leave',this.prefs.hideDelay||1200,()=>this.collapse('leave'));
  if(this.prefs.idleCollapse)this.schedule('idle',(this.prefs.idleSeconds||30)*1000,()=>this.collapse('idle'));
 }
 collapse(reason){if(this.blocked()||this.mode!=='panel'||(reason==='leave'&&this.pointer)||(reason==='idle'&&this.pointer&&this.prefs.keepOnHover!==false))return;this.mode='collapsed';this.clear('hover');this.clear('idle');this.clear('leave');this.onCollapse(reason);this.onChange(this.status());}
 enter(){this.pointer=true;this.clear('leave');if(this.prefs.hoverExpand&&this.mode==='collapsed')this.schedule('hover',this.prefs.hoverDelay??160,()=>{if(this.pointer&&this.mode==='collapsed'){this.mode='panel';this.onExpand('hover');this.rearm();}});this.onChange(this.status());}
 leave(){this.pointer=false;this.clear('hover');this.rearm();this.onChange(this.status());}
 focus(value){this.focused=!!value;this.activity();}
 activity(){this.lastActivity=this.now();this.rearm();}
 hold(name,value=true){if(value)this.holds.add(name);else this.holds.delete(name);this.rearm();this.onChange(this.status());}
 pause(ms){this.pausedUntil=this.now()+Math.max(0,ms);this.clear('resume');this.rearm();if(ms>0)this.schedule('resume',ms,()=>{this.pausedUntil=0;this.rearm();this.onChange(this.status());});this.onChange(this.status());}
 status(){return{mode:this.mode,pointer:this.pointer,paused:this.now()<this.pausedUntil,held:this.holds.size>0,reason:this.holds.size?[...this.holds].join(', '):this.mode==='workspace'?'workspace':this.now()<this.pausedUntil?'paused':'ready'};}
 destroy(){this.destroyed=true;for(const key of Object.keys(this.timers))this.clear(key);this.holds.clear();}
}
return{presets,config,frames,Controller};
});