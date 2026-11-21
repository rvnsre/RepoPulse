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
function dockShape(width,height,collapsed=false){const w=Math.max(1,Math.round(width)),h=Math.max(1,Math.round(height));if(collapsed&&w<=120&&h<=16)return[{x:Math.max(0,Math.floor((w-Math.min(66,w))/2)),y:Math.min(2,h-1),width:Math.min(66,w),height:Math.min(6,Math.max(1,h-2))}];const r=Math.min(collapsed?32:18,Math.floor(w/2),Math.floor(h/2));if(!r)return[{x:0,y:0,width:w,height:h}];const rows=[{x:0,y:0,width:w,height:h-r}];for(let y=0;y<r;y++){const inset=Math.ceil(r-Math.sqrt(r*r-(y+.5)**2));rows.push({x:inset,y:h-r+y,width:Math.max(1,w-inset*2),height:1});}return rows;}
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
