'use strict';
class PointerTracker{
 constructor(){this.last=null;}
 update(point,bounds){
  if(!point||!bounds||!['x','y'].every(k=>Number.isFinite(point[k]))||!['x','y','width','height'].every(k=>Number.isFinite(bounds[k])))return null;
  const inside=point.x>=bounds.x&&point.y>=bounds.y&&point.x<bounds.x+bounds.width&&point.y<bounds.y+bounds.height;
  const moved=!this.last||point.x!==this.last.point.x||point.y!==this.last.point.y;
  const entered=inside&&!this.last?.inside,left=!inside&&!!this.last?.inside;
  const geometry=!this.last||['x','y','width','height'].some(k=>bounds[k]!==this.last.bounds[k]);
  const sample={inside,entered,left,moved,point:{...point},bounds:{...bounds},changed:moved||entered||left||geometry};
  this.last=sample;return sample;
 }
}
module.exports={PointerTracker};
