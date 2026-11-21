(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.IslandMorph=factory();})(typeof window==='object'?window:this,function(){
'use strict';
function shape(frame,target,padding=8){const w=Math.max(1,frame.width-padding*2),h=Math.max(1,frame.height-padding),x=Math.max(0,Math.min(w,target.x-frame.x)),y=Math.max(0,Math.min(h,target.y-frame.y)),tw=Math.min(w-x,Math.max(1,target.width-padding*2)),th=Math.min(h-y,Math.max(1,target.height-padding));return 'inset('+y+'px '+Math.max(0,w-x-tw)+'px '+Math.max(0,h-y-th)+'px '+x+'px round 28px)';}
function duration(p={},reduced=false){return p.motion==='none'||p.reducedMotion||(p.motion!=='full'&&reduced)?0:([160,200,280,360].includes(p.windowMotionDuration)?p.windowMotionDuration:200);}
function tempo(mode='adaptive',sequence=0){return mode==='fast'?140:mode==='slow'?360:[140,220,160,360,180,280][Number.isFinite(sequence)?Math.abs(Math.trunc(sequence))%6:0];}
function safeScale(scale,width,height,padding){if(![scale,width,height,padding].every(Number.isFinite)||width<=0||height<=0||padding<=2)return 1;return Math.max(1,Math.min(1.03,scale,1+2*(padding-2)/width,1+(padding-2)/height));}
// Device-independent geometry shared by native transitions and DOM measurement.
function revealBounds(rect){
 const width=Math.min(68,rect.width),y=Math.min(2,rect.height-1);
 return {x:rect.x+(rect.width-width)/2,y:rect.y+y,width,height:Math.min(5,rect.height-y)};
}
function transform(frame,target,padding=8,targetPadding=padding){
 const size=(n)=>Number.isFinite(n)?Math.max(1,n):1,p=Number.isFinite(padding)?Math.max(0,padding):0,tp=Number.isFinite(targetPadding)?Math.max(0,targetPadding):0;
 const fw=size(frame?.width-p*2),fh=size(frame?.height-p),tw=size(target?.width-tp*2),th=size(target?.height-tp);
 const coordinate=n=>Number.isFinite(n)?n:0;const dx=coordinate(target?.x)-coordinate(frame?.x)+(size(target?.width)-size(frame?.width))/2,dy=coordinate(target?.y)-coordinate(frame?.y);
 return 'translate('+dx+'px,'+dy+'px) scale('+tw/fw+','+th/fh+')';
}
function panelHeight({header=48,heading=42,footer=49,padding=8,gap=12,rows=[],count=2,empty=210}={}){
 const finite=(n,f=0)=>Number.isFinite(n)?Math.max(0,n):f;
 rows=Array.isArray(rows)?rows:[];const visible=rows.slice(0,Math.max(1,Math.min(3,Math.round(count)||2)));
 return Math.ceil(finite(header)+finite(heading)+finite(footer)+finite(padding)+12+
 (visible.length?visible.reduce((sum,n)=>sum+finite(n,174),0)+Math.max(0,visible.length-1)*finite(gap):finite(empty,210)));
}
return{shape,duration,tempo,safeScale,revealBounds,transform,panelHeight};
});
