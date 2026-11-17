'use strict';
function bounds(area,prefs={},mode='panel',center){
 const scale=([100,115,130,150].includes(prefs.textScale)?prefs.textScale:100)/100;
 const margin=Math.min(12,Math.max(0,area.width/8));
 const usableWidth=Math.max(1,area.width-margin*2),usableHeight=Math.max(1,area.height-Math.min(24,area.height/8));
 const width=Math.min(mode==='collapsed'?360:([960,1080,1280,1440].includes(prefs.panelWidth)?prefs.panelWidth:960),usableWidth);
 const count=Math.max(1,Math.min(3,prefs.visibleRows||2)),row=(prefs.density==='compact'?150:170)*scale;
 const panel=Math.ceil(145*scale+count*row*(width<720?1.45:1)+(count-1)*12);
 const height=Math.min(usableHeight,mode==='collapsed'?80:mode==='workspace'?620:panel);
 let cx=Number.isFinite(center?.cx)?center.cx:area.x+area.width/2,y=Number.isFinite(center?.y)?center.y:area.y+6;
 if(!center){if(prefs.anchor==='left')cx=area.x+width/2+margin;if(prefs.anchor==='right')cx=area.x+area.width-width/2-margin;}
 return{x:Math.round(Math.max(area.x+margin,Math.min(cx-width/2,area.x+area.width-width-margin))),y:Math.round(Math.max(area.y,Math.min(y,area.y+area.height-height))),width:Math.max(1,Math.floor(width)),height:Math.max(1,Math.floor(height))};
}
module.exports={bounds};
