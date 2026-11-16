'use strict';
const {app,BrowserWindow,ipcMain,shell,Tray,Menu,globalShortcut,nativeImage,screen,dialog,Notification,clipboard}=require('electron');
const path=require('node:path'),fs=require('node:fs');
const {Store}=require('../src/store.cjs');
const {TOPICS,localDay,validateProfile,validWeights,repoTopics,defaults,normalizeRepo}=require('../src/engine.cjs');
const discovery=require('../src/discovery.cjs');
const {fetchCatalog}=require('../src/github.cjs');
let window,store,tray,timer,refreshPromise,quitting=false,mode='panel',lastError=null,moveTimer,adjusting=false;
const opening=new Map(),smokeMode=!app.isPackaged&&process.argv.includes('--smoke-test');
const singleton=app.requestSingleInstanceLock();if(!singleton)app.quit();
function snapshot(){const s=store.state;return {daily:s.daily,saved:s.saved,history:s.history,settings:s.settings,profile:s.profile,topics:TOPICS,cacheAt:s.cacheAt,catalogSize:s.cache.length,languages:[...new Set(s.cache.map(r=>r.language).filter(Boolean))].sort(),blockedOwners:s.blockedOwners,snoozedCount:Object.values(s.snoozed).filter(t=>t>Date.now()).length,canUndo:!!s.lastRotation&&s.lastRotation.day===localDay(),lastError,version:app.getVersion(),platform:process.platform,recoveryNotice:s.recoveryNotice||null};}
function emit(){if(window&&!window.isDestroyed())window.webContents.send('state:changed',snapshot());}
function findRepo(id){return [...(store.state.daily?.repos||[]),...store.state.saved,...store.state.cache,...store.state.history.map(h=>h.repo)].find(r=>r?.id===id);}
function resize(next='panel',anchor=false){
 mode=next===false||next==='collapsed'?'collapsed':next==='workspace'?'workspace':'panel';if(!window)return;
 const area=screen.getDisplayMatching(window.getBounds()).workArea,prefs=store.state.settings;
 const width=mode==='collapsed'?300:Math.min(1080,area.width-20),base=prefs.density==='compact'?204:222,height=Math.min(mode==='collapsed'?39:mode==='workspace'?610:base,area.height-12);
 const bounds=window.getBounds();let cx=bounds.x+bounds.width/2,y=bounds.y;
 if(anchor){cx=prefs.anchor==='left'?area.x+width/2+12:prefs.anchor==='right'?area.x+area.width-width/2-12:area.x+area.width/2;y=area.y+6;}
 const x=Math.round(Math.max(area.x,Math.min(cx-width/2,area.x+area.width-width)));y=Math.max(area.y,Math.min(y,area.y+area.height-height));
 adjusting=true;window.setBounds({x,y:Math.round(y),width,height},false);window.webContents.send('window:mode',mode);setTimeout(()=>{adjusting=false;},100);
}
function show(){window.show();window.focus();}
async function refresh(force=false){
 if(refreshPromise)return refreshPromise;
 refreshPromise=(async()=>{lastError=null;const previousDay=store.state.daily?.day;
  if(force||!store.state.cacheAt||Date.now()-Date.parse(store.state.cacheAt)>6*3600000){try{const cache=await fetchCatalog(store.state.cache);store.update(s=>{s.cache=cache;s.cacheAt=new Date().toISOString();});}catch(e){lastError=e.message;}}
  store.update(s=>{discovery.present(s);});emit();
  if(previousDay&&previousDay!==localDay()&&store.state.settings.notifications&&Notification.isSupported()&&store.state.daily.repos.length)new Notification({title:'Your GitHub discoveries are ready',body:`${store.state.daily.repos.length} new 50K+ star projects, selected for you.`}).show();
  return {state:snapshot(),error:lastError};
 })().finally(()=>{refreshPromise=null;});return refreshPromise;
}
function recordOpen(id){
 return store.update(s=>{const repo=findRepo(id);s.history=[{repo:{...repo},openedAt:new Date().toISOString()},...s.history].slice(0,500);
  if(!s.settings.pausedLearning)for(const key of Object.keys(repoTopics(repo)))s.profile.weights[key]=Math.min(100,(s.profile.weights[key]||0)+0.5);
  if(s.settings.autoReplace)discovery.rotate(s,id);
 });
}
async function openRepo(id,kind='repository'){
 if(!Number.isSafeInteger(id))throw new Error('Invalid repository');
 const repo=findRepo(id);if(!repo)throw new Error('Repository is no longer available.');
 if(kind==='readme'){if(!smokeMode)await shell.openExternal(discovery.sources(repo).readme);return snapshot();}
 if(opening.has(id))return opening.get(id);
 const task=(async()=>{if(!smokeMode)await shell.openExternal(`https://github.com/${repo.full_name}`);recordOpen(id);emit();return snapshot();})();
 opening.set(id,task);try{return await task;}finally{setTimeout(()=>opening.delete(id),700);}
}
function createWindow(){
 const area=screen.getPrimaryDisplay().workArea,w=Math.min(1080,area.width-20),geometry=store.state.geometry;
 window=new BrowserWindow({width:w,height:222,x:Math.round(geometry?.cx?geometry.cx-w/2:area.x+(area.width-w)/2),y:geometry?.y??area.y+6,transparent:!smokeMode,frame:false,resizable:false,hasShadow:false,alwaysOnTop:store.state.settings.pinned,skipTaskbar:true,backgroundColor:smokeMode?'#253d43':'#00000000',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
 window.setOpacity(store.state.settings.opacity/100);resize('panel',!geometry);
 window.loadFile(path.join(__dirname,'index.html'));
 window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',event=>event.preventDefault());window.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
 window.on('moved',()=>{if(adjusting)return;clearTimeout(moveTimer);moveTimer=setTimeout(()=>{if(window.isDestroyed())return;const b=window.getBounds();store.update(s=>{s.geometry={cx:b.x+b.width/2,y:b.y};});},300);});
 window.on('close',event=>{if(!quitting){event.preventDefault();window.hide();}});
}
async function confirm(message,detail='') {const r=await dialog.showMessageBox(window,{type:'warning',buttons:['Cancel','Confirm'],defaultId:0,cancelId:0,message,detail});return r.response===1;}
async function exportData(kind){
 const s=store.state;let content,name,extension='json';
 if(kind==='rss'){content=require('../src/feed.cjs').rss(s.daily);name='repopulse-daily';extension='xml';}
 else if(kind==='collection'){content=JSON.stringify({schema:'repopulse.collection.v1',repos:s.saved},null,2);name='repopulse-collection';}
 else if(kind==='profile'){content=JSON.stringify({schema:'repopulse.interests.v1',weights:s.profile.weights},null,2);name='repopulse-interests';}
 else throw new Error('Unsupported export');
 const result=await dialog.showSaveDialog(window,{title:'Export RepoPulse data',defaultPath:`${name}.${extension}`,filters:[{name:extension.toUpperCase(),extensions:[extension]}]});if(result.canceled||!result.filePath)return false;
 fs.writeFileSync(result.filePath,content,'utf8');return true;
}
async function importData(kind){
 if(!['profile','collection'].includes(kind))throw new Error('Unsupported import');
 const result=await dialog.showOpenDialog(window,{title:`Import ${kind}`,filters:[{name:'RepoPulse JSON',extensions:['json']}],properties:['openFile']});if(result.canceled)return null;
 const file=result.filePaths[0];if(fs.statSync(file).size>(kind==='profile'?65536:2000000))throw new Error('The selected file is too large.');
 const input=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
 const data=kind==='profile'?validateProfile(input):discovery.collection(input);
 store.update(s=>{if(kind==='profile'){const initial=!Object.keys(s.profile.weights).length;s.profile=data;if(initial){s.daily=null;discovery.present(s);}}else s.saved=[...new Map([...data,...s.saved].map(r=>[r.id,r])).values()];});emit();return snapshot();
}
function attachIpc(){
 const handle=(name,fn)=>ipcMain.handle(name,(event,...args)=>{if(event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame)throw new Error('Untrusted sender');return fn(...args);});
 handle('state:get',()=>snapshot());handle('catalog:refresh',force=>refresh(force===true));
 handle('window:expand',next=>resize(next));handle('window:hide',()=>window.hide());handle('app:quit',()=>{quitting=true;app.quit();});
 handle('repo:open',openRepo);
 handle('repo:copy',(id,kind)=>{const repo=findRepo(id);if(!repo)throw new Error('Repository unavailable');const commands=discovery.sources(repo);const values={url:`https://github.com/${repo.full_name}`,clone:commands.clone,inspect:commands.inspect};if(!Object.hasOwn(values,kind))throw new Error('Unsupported copy');clipboard.writeText(values[kind]);return true;});
 handle('repo:react',(id,action)=>{
  if(!Number.isSafeInteger(id)||!['save','like','hide','snooze','block'].includes(action))throw new Error('Invalid reaction');const repo=findRepo(id);if(!repo)throw new Error('Repository unavailable');
  store.update(s=>{
   if(action==='save')s.saved=s.saved.some(r=>r.id===id)?s.saved.filter(r=>r.id!==id):[repo,...s.saved];
   if(action==='like'){s.liked=Array.isArray(s.liked)?s.liked:[];if(!s.liked.includes(id)){s.liked.push(id);if(!s.settings.pausedLearning)for(const key of Object.keys(repoTopics(repo)))s.profile.weights[key]=Math.min(100,(s.profile.weights[key]||0)+2);}}
   if(action==='hide')s.hidden=[...new Set([...s.hidden,id])];
   if(action==='snooze'){s.snoozed[id]=Date.now()+7*86400000;s.seen=s.seen.filter(value=>value!==id);}
   if(action==='block')s.blockedOwners=[...new Set([...s.blockedOwners,repo.full_name.split('/')[0]])];
   if(['hide','snooze','block'].includes(action)){s.lastRotation=null;discovery.present(s);}
  });emit();return snapshot();
 });
 handle('feed:undo',()=>{store.update(s=>discovery.undo(s));emit();return snapshot();});
 handle('feed:export',()=>exportData('rss'));handle('data:export',exportData);handle('data:import',importData);
 handle('profile:import',()=>importData('profile'));
 handle('profile:set',input=>{const weights=validWeights(input),initial=!Object.keys(store.state.profile.weights).length;store.update(s=>{s.profile={weights,source:'manual',importedAt:new Date().toISOString()};if(initial){s.daily=null;discovery.present(s);}});emit();return snapshot();});
 handle('settings:set',input=>{
  const previous=store.state.settings,next=discovery.settings({...previous,...input});
  if(next.launchAtLogin!==previous.launchAtLogin){if(process.platform==='linux')throw new Error('Configure autostart in your Linux desktop session settings.');app.setLoginItemSettings({openAtLogin:next.launchAtLogin});}
  store.update(s=>{s.settings=next;discovery.present(s);});window.setAlwaysOnTop(next.pinned);window.setOpacity(next.opacity/100);resize(mode,next.anchor!==previous.anchor);emit();return snapshot();
 });
 handle('data:reset-controls',async()=>{if(!await confirm('Restore hidden, snoozed and blocked projects?','Previously opened projects remain in your discovery history.'))return null;store.update(s=>{s.hidden=[];s.snoozed={};s.blockedOwners=[];discovery.present(s);});emit();return snapshot();});
 handle('data:clear-history',async()=>{if(!await confirm('Clear your local viewing history?','No-repeat memory is retained so old projects do not reappear.'))return null;store.update(s=>{s.history=[];});emit();return snapshot();});
 handle('data:clear',async()=>{if(!await confirm('Delete all local RepoPulse data?','Interests, saved repositories and discovery history will be reset. Browser history and exported files are not deleted.'))return null;store.state=discovery.initialize(defaults());store.save();window.setAlwaysOnTop(true);window.setOpacity(1);if(process.platform!=='linux')app.setLoginItemSettings({openAtLogin:false});emit();return snapshot();});
}
if(singleton)app.whenReady().then(()=>{
 store=new Store(path.join(app.getPath('userData'),smokeMode?'smoke-state.json':'state.json'));discovery.initialize(store.state);
 if(smokeMode){store.state=discovery.initialize(defaults());store.state.cache=require('../test/fixtures.cjs');store.state.cacheAt=new Date().toISOString();store.state.profile.weights={ai:10,tools:8,systems:6};discovery.present(store.state);}
 createWindow();attachIpc();tray=new Tray(nativeImage.createFromDataURL(require('./tray-icon.cjs')));tray.setToolTip('RepoPulse - GitHub rss');tray.setContextMenu(Menu.buildFromTemplate([{label:'Open RepoPulse',click:()=>{show();resize('panel');}},{label:'Refresh catalog',click:()=>refresh(true)},{type:'separator'},{label:'Quit',click:()=>{quitting=true;app.quit();}}]));tray.on('click',()=>{show();resize(mode==='collapsed'?'panel':'collapsed');});
 globalShortcut.register('CommandOrControl+Shift+Space',()=>{show();resize(mode==='collapsed'?'panel':'collapsed');window.webContents.send('window:mode',mode);});
 timer=setInterval(()=>{if(store.state.daily?.day!==localDay())refresh();},60000);app.on('second-instance',show);app.on('activate',show);
 if(smokeMode)require('../scripts/smoke.cjs').smoke({app,window,store,resize,TOPICS,snapshot}).catch(error=>{console.error(error);app.exit(1);});
}).catch(error=>{dialog.showErrorBox('RepoPulse could not start',error.message);app.quit();});
app.on('before-quit',()=>{quitting=true;clearInterval(timer);clearTimeout(moveTimer);});app.on('will-quit',()=>globalShortcut.unregisterAll());app.on('window-all-closed',()=>{});
