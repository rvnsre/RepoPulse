'use strict';
// Electron uses device-independent pixels; never multiply these coordinates by DPI.
function policy(platform=process.platform,env=process.env,smoke=false){
 const wayland=platform==='linux'&&(env.XDG_SESSION_TYPE==='wayland'||!!env.WAYLAND_DISPLAY);
 const nativeWayland=wayland&&!env.DISPLAY;
 const transparent=!smoke&&(platform!=='linux'||env.REPOPULSE_TRANSPARENT==='1'&&!nativeWayland);
 return {reveal:require('./layout.cjs').REVEAL,platform,nativeWayland,pointer:!nativeWayland,padding:transparent?8:0,transparent,positioning:nativeWayland?'compositor':'screen',options:{show:false,frame:false,resizable:false,transparent,backgroundColor:transparent?'#00000000':'#edf0f4',hasShadow:platform!=='linux',roundedCorners:platform!=='linux',skipTaskbar:true,...(platform==='darwin'?{vibrancy:'sidebar',visualEffectState:'active',hiddenInMissionControl:true}:{}),...(nativeWayland?{resizable:true}:{} )}};
}
function activeDisplay(screen){try{return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());}catch{return screen.getPrimaryDisplay();}}
function topAnchor(display){return{cx:display.workArea.x+display.workArea.width/2,y:display.workArea.y};}
function dockShape(width,height,mode='panel'){
 const w=Math.max(1,Math.round(width)),h=Math.max(1,Math.round(height));
 const hidden=mode==='collapsed'||mode===true&&w<=120&&h<=16;
 const pill=mode==='mini'||mode===true;
 const shapeWidth=hidden?Math.min(68,w):w;
 const top=hidden?Math.min(2,h-1):0;
 const shapeHeight=hidden?Math.min(5,h-top):h;
 const left=Math.floor((w-shapeWidth)/2);
 const radius=Math.min(pill||hidden?Math.floor(shapeHeight/2):28,Math.floor(shapeWidth/2),Math.floor(shapeHeight/2));
 if(!radius)return [{x:left,y:top,width:shapeWidth,height:shapeHeight}];
 const rows=[],upper=pill||hidden?radius:0;
 for(let y=0;y<shapeHeight;y++){
  const distance=Math.max(0,upper-y-.5,y+.5-(shapeHeight-radius));
  const inset=Math.min(Math.floor((shapeWidth-1)/2),Math.round(radius-Math.sqrt(radius*radius-distance*distance)));
  const x=left+inset,width=shapeWidth-2*inset,previous=rows.at(-1);
  if(previous?.x===x&&previous.width===width)previous.height++;
  else rows.push({x,y:top+y,width,height:1});
 }
 return rows;
}
function bindInitialVisibility(window){
 let shown=false;const show=()=>{if(shown||window.isDestroyed())return;shown=true;window.showInactive();};
 // A hidden renderer may defer its first animation frame; do not wait only for paint.
 window.once('ready-to-show',show);window.webContents.once('did-finish-load',show);
}
function registerShortcuts(shortcuts,handler){let available=false;for(const key of ['CommandOrControl+Shift+P','CommandOrControl+Shift+Space'])try{available=shortcuts.register(key,handler)||available;}catch{}return available;}
function syncTopmost(window,pinned,platform=process.platform,reassert=false){
 if(!window||window.isDestroyed())return;
 const enabled=!!pinned;
 if(window.isAlwaysOnTop()!==enabled||(enabled&&reassert)){
  const level=platform==='win32'?'pop-up-menu':'floating';
  window.setAlwaysOnTop(enabled,level);
 }
}
module.exports={policy,activeDisplay,topAnchor,dockShape,registerShortcuts,bindInitialVisibility,syncTopmost};
