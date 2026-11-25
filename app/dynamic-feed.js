(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DynamicFeed=factory();})(typeof window==='object'?window:this,function(){
'use strict';
const styles=[
 ['fade','Soft fade',{}],
 ['rise','Rise',{transform:'translateY(8px)'}],
 ['sink','Sink',{transform:'translateY(-8px)'}],
 ['left','Slide left',{transform:'translateX(12px)'}],
 ['right','Slide right',{transform:'translateX(-12px)'}],
 ['zoom-in','Zoom in',{transform:'scale(.97)'}],
 ['zoom-out','Zoom out',{transform:'scale(1.025)'}],
 ['blur','Focus in',{filter:'blur(3px)'}],
 ['blur-rise','Focus rise',{filter:'blur(2px)',transform:'translateY(6px)'}],
 ['flip-x','Flip horizontal',{transform:'perspective(700px) rotateX(8deg)'}],
 ['flip-y','Flip vertical',{transform:'perspective(700px) rotateY(8deg)'}],
 ['skew-left','Skew left',{transform:'skewX(3deg) translateX(6px)'}],
 ['skew-right','Skew right',{transform:'skewX(-3deg) translateX(-6px)'}],
 ['tilt-left','Tilt left',{transform:'rotate(-1deg) translateY(4px)'}],
 ['tilt-right','Tilt right',{transform:'rotate(1deg) translateY(4px)'}],
 ['wipe-left','Reveal from left',{clipPath:'inset(0 100% 0 0)'}],
 ['wipe-right','Reveal from right',{clipPath:'inset(0 0 0 100%)'}],
 ['wipe-up','Reveal upward',{clipPath:'inset(100% 0 0 0)'}],
 ['wipe-down','Reveal downward',{clipPath:'inset(0 0 100% 0)'}],
 ['diagonal','Diagonal glide',{transform:'translate(8px,6px)'}],
 ['soft-spring','Soft spring',{transform:'scale(.985) translateY(5px)'}],
 ['focus-zoom','Focus zoom',{filter:'blur(2px)',transform:'scale(.985)'}]
];
const calm=['fade','rise','left','right','zoom-in','soft-spring'];
function transition(style='auto',sequence=0,motion={duration:80,easing:'ease-out'}){
 motion=motion&&typeof motion==='object'?motion:{};const id=style==='auto'?calm[Number.isFinite(sequence)?Math.abs(Math.trunc(sequence))%calm.length:0]:style;
 const selected=styles.find(s=>s[0]===id)||styles[0],initial=selected[2];
 const final={opacity:1,transform:'none',filter:'blur(0px)',clipPath:'inset(0)'};
 const start={...final,...initial,opacity:0};
 return{style:selected[0],enter:[start,final],exit:[final,start],options:{duration:Math.max(0,Math.min(600,Number(motion.duration)||0)),easing:id==='soft-spring'?'cubic-bezier(.2,1.15,.35,1)':motion.easing||'ease-out'}};
}
function interval(p={}){
 p=p&&typeof p==='object'?p:{};
 const clamp=(value,fallback)=>{const number=typeof value==='number'||typeof value==='string'&&value.trim()!==''?Number(value):NaN;return Number.isFinite(number)?Math.max(3,Math.min(10,Math.round(number))):fallback;};
 const a=clamp(p.cycleMin,3),b=clamp(p.cycleMax,10);return{min:Math.min(a,b)*1000,max:Math.max(a,b)*1000};
}
class Scheduler{
 constructor({rotate,onStatus=()=>{},blocked=()=>'',now=Date.now,random=Math.random,setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id)}={}){
  this.rotate=rotate;this.onStatus=onStatus;this.blocked=blocked;this.now=now;this.random=random;this.setTimer=setTimer;this.clearTimer=clearTimer;this.enabled=false;this.busy=false;this.destroyed=false;this.timer=null;this.remaining=0;this.period=0;this.deadline=0;this.reason='off';this.exhausted=false;this.key=null;this.policy='';this.range=interval();this.error=null;
 }
 delay(){const sample=this.random(),value=Number.isFinite(sample)?Math.max(0,Math.min(.999999,sample)):0;return this.range.min+Math.floor(value*(this.range.max-this.range.min+1));}
 clear(){if(this.timer!==null){this.clearTimer(this.timer);this.timer=null;}}
 configure(p={},key=''){
  p=p&&typeof p==='object'?p:{};
  const range=interval(p),policy=JSON.stringify([p.dynamicRefresh!==false,range.min,range.max]);
  if(this.key!==key){this.key=key;this.exhausted=false;}
  const changed=policy!==this.policy;this.policy=policy;this.range=range;this.enabled=p.dynamicRefresh!==false;
  if(changed){this.exhausted=false;this.remaining=this.delay();this.period=this.remaining;this.deadline=this.now()+this.remaining;this.reason='';this.error=null;this.clear();}
  if(!this.enabled){this.reason='off';this.clear();this.report();return;}
  if(this.timer===null&&!this.busy&&!this.destroyed)this.arm();
 }
 arm(){this.clear();if(this.destroyed||!this.enabled||this.exhausted||this.busy){this.report();return;}this.timer=this.setTimer(()=>{this.timer=null;void this.tick();},Math.min(250,Math.max(0,this.deadline-this.now())));}
 report(){if(!this.destroyed)this.onStatus({enabled:this.enabled,busy:this.busy,reason:this.exhausted?'exhausted':this.reason,remaining:Math.max(0,this.remaining),period:this.period,error:this.error});}
 async tick(){
  if(this.destroyed||!this.enabled||this.busy||this.exhausted)return;
  const reason=this.blocked()||'';
  if(reason){if(!this.reason)this.remaining=Math.max(0,this.deadline-this.now());this.reason=reason;this.report();this.clear();this.timer=this.setTimer(()=>{this.timer=null;void this.tick();},250);return;}
  if(this.reason){this.deadline=this.now()+Math.max(250,this.remaining);this.reason='';}
  this.remaining=Math.max(0,this.deadline-this.now());this.report();
  if(this.remaining>0){this.arm();return;}
  this.busy=true;this.report();
  try{const result=await this.rotate();if(this.destroyed)return;this.exhausted=!!result?.exhausted;this.error=null;}
  catch(error){this.error=error?.message||'Automatic replacement failed';}
  finally{this.busy=false;if(!this.destroyed){this.remaining=this.error?10000:this.delay();this.period=this.remaining;this.deadline=this.now()+this.remaining;this.report();this.arm();}}
 }
 destroy(){this.destroyed=true;this.clear();}
}

class CardScheduler{
 constructor({rotate,blocked=()=>'',paused=()=>false,onStatus=()=>{},now=Date.now,setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id)}={}){
  this.rotate=rotate;this.blocked=blocked;this.paused=paused;this.onStatus=onStatus;this.now=now;this.setTimer=setTimer;this.clearTimer=clearTimer;this.timers=Array(4).fill(null);this.deadlines=Array(4).fill(0);this.inFlight=new Set();this.enabled=false;this.destroyed=false;this.exhausted=new Set();this.key=null;this.error=null;
 }
 clear(){for(let i=0;i<4;i++){if(this.timers[i]!==null)this.clearTimer(this.timers[i]);this.timers[i]=null;}}
 suspend(){this.suspended=true;this.enabled=false;this.clear();this.report();}
 resume(){this.suspended=false;}
 report(){if(!this.destroyed)this.onStatus({enabled:this.enabled,busy:this.inFlight.size>0,reason:this.exhausted.size===4?'exhausted':this.blocked()||'',remaining:Math.max(0,Math.min(...this.deadlines.map(t=>t||this.now()+this.period))-this.now()),period:this.period,error:this.error});}
 configure(p={},key=''){
  if(this.destroyed)return;
  if(this.key!==key){this.key=key;this.exhausted.clear();for(let i=0;i<4;i++)if(this.enabled&&this.timers[i]===null&&!this.inFlight.has(i))this.arm(i);}
  const enabled=p.dynamicRefresh===true&&!this.suspended;
  const raw=Number(p.cycleSeconds??5),period=(Number.isFinite(raw)?Math.max(5,Math.min(3600,Math.round(raw))):15)*1000;
  if(enabled===this.enabled&&period===this.period&&this.deadlines[0]){this.report();return;}
  this.period=period;
  this.enabled=enabled;this.clear();
  if(enabled)this.reset();else this.report();
 }
 reset(){if(this.destroyed)return;this.clear();this.exhausted.clear();this.error=null;this.deadlines=Array.from({length:4},(_,i)=>this.now()+this.period+i*300);if(this.enabled)for(let i=0;i<4;i++)this.arm(i);this.report();}
 arm(i){if(this.destroyed||!this.enabled||this.exhausted.has(i))return;this.timers[i]=this.setTimer(()=>{this.timers[i]=null;void this.tick(i);},Math.max(25,Math.min(250,this.deadlines[i]-this.now())));}
 async tick(i){
  if(this.destroyed||!this.enabled||this.inFlight.has(i))return;
  if(this.blocked()||this.paused(i)){this.deadlines[i]=this.now()+250;this.report();this.arm(i);return;}
  if(this.now()<this.deadlines[i]){this.arm(i);return;}
  if(this.inFlight.size){this.deadlines[i]=this.now()+300;this.arm(i);return;}
  this.inFlight.add(i);this.report();
  try{const result=await this.rotate(i);if(result?.exhausted)this.exhausted.add(i);this.error=null;}catch(e){this.error=e?.message||'Automatic rotation failed';}
  finally{this.inFlight.delete(i);if(!this.destroyed){this.deadlines[i]=this.now()+(this.error?10000:this.period);this.report();this.arm(i);}}
 }
 destroy(){this.destroyed=true;this.clear();}
}
return{styles,transition,interval,Scheduler,CardScheduler};
});
