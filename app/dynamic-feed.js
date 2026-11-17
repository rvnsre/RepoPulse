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
 const id=style==='auto'?calm[Math.abs(sequence)%calm.length]:style;
 const selected=styles.find(s=>s[0]===id)||styles[0],initial=selected[2];
 const final={opacity:1,transform:'none',filter:'blur(0px)',clipPath:'inset(0)'};
 const start={...final,...initial,opacity:0};
 return{style:selected[0],enter:[start,final],exit:[final,start],options:{duration:Math.max(0,Math.min(600,Number(motion.duration)||0)),easing:id==='soft-spring'?'cubic-bezier(.2,1.15,.35,1)':motion.easing||'ease-out'}};
}
function interval(p={}){
 const clamp=(value,fallback)=>{const number=typeof value==='number'||typeof value==='string'&&value.trim()!==''?Number(value):NaN;return Number.isFinite(number)?Math.max(3,Math.min(10,Math.round(number))):fallback;};
 const a=clamp(p.cycleMin,3),b=clamp(p.cycleMax,10);return{min:Math.min(a,b)*1000,max:Math.max(a,b)*1000};
}
class Scheduler{
 constructor({rotate,onStatus=()=>{},blocked=()=>'',now=Date.now,random=Math.random,setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id)}={}){
  this.rotate=rotate;this.onStatus=onStatus;this.blocked=blocked;this.now=now;this.random=random;this.setTimer=setTimer;this.clearTimer=clearTimer;this.enabled=false;this.busy=false;this.destroyed=false;this.timer=null;this.remaining=0;this.period=0;this.deadline=0;this.reason='off';this.exhausted=false;this.key=null;this.policy='';this.range=interval();this.error=null;
 }
 delay(){return this.range.min+Math.floor(Math.max(0,Math.min(.999999,this.random()))*(this.range.max-this.range.min+1));}
 clear(){if(this.timer!==null){this.clearTimer(this.timer);this.timer=null;}}
 configure(p={},key=''){
  const range=interval(p),policy=JSON.stringify([p.dynamicRefresh!==false,range.min,range.max]);
  if(this.key!==key){this.key=key;this.exhausted=false;}
  const changed=policy!==this.policy;this.policy=policy;this.range=range;this.enabled=p.dynamicRefresh!==false;
  if(changed){this.exhausted=false;this.remaining=this.delay();this.period=this.remaining;this.deadline=this.now()+this.remaining;this.reason='';this.error=null;this.clear();}
  if(!this.enabled){this.reason='off';this.clear();this.report();return;}
  if(!this.timer&&!this.busy&&!this.destroyed)this.arm();
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
return{styles,transition,interval,Scheduler};
});
