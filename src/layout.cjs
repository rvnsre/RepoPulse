'use strict';
function bounds(area,prefs={},mode='panel',center){
 const scale=([100,115,130,150].includes(prefs.textScale)?prefs.textScale:100)/100;
 const margin=12,usableWidth=Math.max(240,area.width-margin*2),width=Math.min(mode==='collapsed'?360:(prefs.panelWidth||1280),usableWidth);
 const count=Math.max(1,Math.min(3,prefs.visibleRows||2));
 const row=(prefs.density==='compact'?150:170)*scale;
 const narrow=width<860?1.65:1;
 const panel=Math.ceil(140*scale+count*row*narrow+(count-1)*12);
 const height=Math.min(Math.max(90,area.height-margin*2),mode==='collapsed'?52:mode==='workspace'?Math.max(panel+390,700):panel);
 let cx=center?.cx??area.x+area.width/2,y=center?.y??area.y+6;
 if(!center){if(prefs.anchor==='left')cx=area.x+width/2+margin;if(prefs.anchor==='right')cx=area.x+area.width-width/2-margin;}
 return{x:Math.round(Math.max(area.x+margin,Math.min(cx-width/2,area.x+area.width-width-margin))),y:Math.round(Math.max(area.y,Math.min(y,area.y+area.height-height))),width:Math.round(width),height:Math.round(height)};
}
module.exports={bounds};
