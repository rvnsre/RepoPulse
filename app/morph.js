(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.IslandMorph=factory();})(typeof window==='object'?window:this,function(){
'use strict';
function shape(frame,target,padding=12){const w=Math.max(1,frame.width-padding*2),h=Math.max(1,frame.height-padding*2),x=Math.max(0,Math.min(w,target.x-frame.x)),y=Math.max(0,Math.min(h,target.y-frame.y)),tw=Math.min(w-x,Math.max(1,target.width-padding*2)),th=Math.min(h-y,Math.max(1,target.height-padding*2));return 'inset('+y+'px '+Math.max(0,w-x-tw)+'px '+Math.max(0,h-y-th)+'px '+x+'px round 28px)';}
function duration(p={},reduced=false){return p.motion==='none'||p.reducedMotion||(p.motion!=='full'&&reduced)?0:([160,200,280,360].includes(p.windowMotionDuration)?p.windowMotionDuration:200);}
function tempo(mode='adaptive',sequence=0){return mode==='fast'?140:mode==='slow'?360:[140,220,160,360,180,280][Math.abs(sequence)%6];}
return{shape,duration,tempo};
});