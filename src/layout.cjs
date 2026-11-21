'use strict';
const REVEAL=Object.freeze({width:120,height:16});
function bounds(area,prefs={},mode='panel',center){
 area=area&&typeof area==='object'?area:{};area={x:Number.isFinite(area.x)?area.x:0,y:Number.isFinite(area.y)?area.y:0,width:Number.isFinite(area.width)?Math.max(1,area.width):960,height:Number.isFinite(area.height)?Math.max(1,area.height):720};prefs=prefs&&typeof prefs==='object'?prefs:{};
 const scale=([100,115,130,150].includes(prefs.textScale)?prefs.textScale:100)/100;
 const margin=Math.min(12,Math.max(0,area.width/8));
 const usableWidth=Math.max(1,area.width-margin*2),usableHeight=Math.max(1,area.height-Math.min(24,area.height/8));
 const width=Math.min(mode==='mini'?520:mode==='insight'?480:mode==='collapsed'?REVEAL.width:([920,1080,1280,1440].includes(prefs.panelWidth)?prefs.panelWidth:920),usableWidth);
 const count=Math.max(1,Math.min(3,prefs.visibleRows||2)),row=102*scale;
 const panel=Math.ceil(126*scale+count*row+(count-1)*32);
 const height=Math.min(usableHeight,mode==='mini'?74:mode==='insight'?250:mode==='collapsed'?REVEAL.height:mode==='workspace'?620:panel);
 let cx=Number.isFinite(center?.cx)?center.cx:area.x+area.width/2,y=Number.isFinite(center?.y)?center.y:area.y;
 if(!center){if(prefs.anchor==='left')cx=area.x+width/2+margin;if(prefs.anchor==='right')cx=area.x+area.width-width/2-margin;}
 return{x:Math.round(Math.max(area.x+margin,Math.min(cx-width/2,area.x+area.width-width-margin))),y:Math.round(Math.max(area.y,Math.min(y,area.y+area.height-height))),width:Math.max(1,Math.floor(width)),height:Math.max(1,Math.floor(height))};
}
function fittedHeight(requested,areaHeight,collapsed=false){const available=Math.max(1,Math.floor(Number.isFinite(areaHeight)?areaHeight:1));const minimum=Math.min(available,collapsed?REVEAL.height:160);return Math.round(Math.max(minimum,Math.min(Number.isFinite(requested)?requested:minimum,available)));}
function defaultAnchor(area,prefs){const rect=bounds(area,prefs,'collapsed');return{cx:rect.x+rect.width/2,y:rect.y};}
module.exports={bounds,fittedHeight,defaultAnchor,REVEAL};
