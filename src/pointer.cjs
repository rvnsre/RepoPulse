'use strict';
class PointerTracker{
 constructor(){this.last=null;}
 static interval(sample,mode){
  if(!sample)return 250;
  const {point,bounds,inside,moved}=sample;
  const dx=Math.max(bounds.x-point.x,point.x-bounds.x-bounds.width,0);
  const dy=Math.max(bounds.y-point.y,point.y-bounds.y-bounds.height,0);
  if(mode==='collapsed')return dx<=72&&dy<=48?50:250;
  return inside?(moved?80:160):dx<=72&&dy<=48?100:250;
 }
 update(point,bounds,shape){
  if(!point||!bounds||!['x','y'].every(k=>Number.isFinite(point[k]))||!['x','y','width','height'].every(k=>Number.isFinite(bounds[k])))return null;
  point={x:Math.round(point.x),y:Math.round(point.y)};
  const x=point.x-bounds.x,y=point.y-bounds.y;
  const inside=shape?shape.some(rect=>x>=rect.x&&y>=rect.y&&x<rect.x+rect.width&&y<rect.y+rect.height):
   x>=0&&y>=0&&x<bounds.width&&y<bounds.height;
  const moved=!this.last||point.x!==this.last.point.x||point.y!==this.last.point.y;
  const entered=inside&&!this.last?.inside,left=!inside&&!!this.last?.inside;
  const geometry=!this.last||['x','y','width','height'].some(k=>bounds[k]!==this.last.bounds[k]);
  const sample={inside,entered,left,moved,geometry,point:{...point},bounds:{...bounds},changed:moved||entered||left||geometry};
  this.last=sample;return sample;
 }
}
module.exports={PointerTracker};
