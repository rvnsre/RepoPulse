'use strict';
const {app,BrowserWindow,ipcMain,shell,Tray,Menu,globalShortcut,nativeImage,screen,dialog,Notification}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {Store}=require('../src/store.cjs');
const {TOPICS,localDay,selectDaily,validateProfile,validWeights,repoTopics}=require('../src/engine.cjs');
const {fetchCatalog}=require('../src/github.cjs');
let window,store,tray,timer,refreshPromise,quitting=false,expanded=false;
const smokeMode=!app.isPackaged && process.argv.includes('--smoke-test');
const singleton=app.requestSingleInstanceLock();
if(!singleton) app.quit();
const visibleState=()=>({daily:store.state.daily,saved:store.state.saved,settings:store.state.settings,profile:store.state.profile,topics:TOPICS,cacheAt:store.state.cacheAt,catalogSize:store.state.cache.length,recoveryNotice:store.state.recoveryNotice || null});
function emit(){if(window&&!window.isDestroyed()) window.webContents.send('state:changed',visibleState());}
function resize(open){expanded=!!open; if(!window)return;const [x,y]=window.getPosition();const area=screen.getDisplayMatching(window.getBounds()).workArea;const w=expanded?508:288,h=expanded?730:68;window.setBounds({x:Math.max(area.x,Math.min(x,area.x+area.width-w)),y:Math.max(area.y,Math.min(y,area.y+area.height-Math.min(h,area.height))),width:w,height:Math.min(h,area.height)},true);}
function show(){window.show();window.focus();}
async function refresh(force=false){
  if(refreshPromise)return refreshPromise;
  refreshPromise=(async()=>{
    let error=null;
    if(force||!store.state.cacheAt||Date.now()-Date.parse(store.state.cacheAt)>6*3600000){
      try {const catalog=await fetchCatalog(store.state.cache);store.update(s=>{s.cache=catalog;s.cacheAt=new Date().toISOString();});}
      catch(e){error=e.message;}
    }
    store.update(s=>{s.daily=selectDaily(s.cache,s);s.seen=[...new Set([...s.seen,...s.daily.repos.map(r=>r.id)])];});
    emit();return {state:visibleState(),error};
  })().finally(()=>{refreshPromise=null;});return refreshPromise;
}
function createWindow(){
  const area=screen.getPrimaryDisplay().workArea;
  window=new BrowserWindow({width:288,height:68,x:Math.round(area.x+(area.width-288)/2),y:area.y+12,transparent:!smokeMode,frame:false,resizable:false,hasShadow:false,alwaysOnTop:store.state.settings.pinned,skipTaskbar:true,backgroundColor:smokeMode?'#151619':'#00000000',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  window.loadFile(path.join(__dirname,'index.html'));
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event)=>event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  window.on('close',event=>{if(!quitting){event.preventDefault();window.hide();}});
}
function attachIpc(){
  const handle=(name,fn)=>ipcMain.handle(name,(event,...args)=>{
    if(event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame)throw new Error('Untrusted sender');
    return fn(...args);
  });
  handle('state:get',()=>visibleState());
  handle('catalog:refresh',force=>refresh(force===true));
  handle('window:expand',open=>resize(open===true));
  handle('window:hide',()=>window.hide());
  handle('app:quit',()=>{quitting=true;app.quit();});
  handle('repo:open',async id=>{
    const repo=[...store.state.cache,...store.state.saved,...(store.state.daily?.repos||[])].find(r=>r.id===id);
    if(!repo)throw new Error('Repository unavailable');
    await shell.openExternal(`https://github.com/${repo.full_name}`);
    store.update(s=>{const tags=repoTopics(repo);for(const key of Object.keys(tags))s.profile.weights[key]=Math.min(100,(s.profile.weights[key]||0)+0.25);});emit();
  });
  handle('repo:react',(id,action)=>{
    if(!Number.isSafeInteger(id)||!['save','like','hide'].includes(action))throw new Error('Invalid reaction');
    const repo=[...store.state.cache,...(store.state.daily?.repos||[]),...store.state.saved].find(r=>r.id===id);
    if(!repo)throw new Error('Repository unavailable');
    store.update(s=>{
      if(action==='save'){const found=s.saved.some(r=>r.id===id);s.saved=found?s.saved.filter(r=>r.id!==id):[repo,...s.saved];}
      else if(action==='like'){
        s.liked=Array.isArray(s.liked)?s.liked:[];
        if(!s.liked.includes(id)){s.liked.push(id);for(const key of Object.keys(repoTopics(repo)))s.profile.weights[key]=Math.min(100,(s.profile.weights[key]||0)+2);}
      }
      else {s.hidden=[...new Set([...s.hidden,id])];s.daily=selectDaily(s.cache,s);s.seen=[...new Set([...s.seen,...s.daily.repos.map(r=>r.id)])];}
    });emit();return visibleState();
  });
  handle('feed:export',async()=>{
    const result=await dialog.showSaveDialog(window,{title:'Export daily discoveries as RSS',defaultPath:'repopulse-daily.xml',filters:[{name:'RSS feed',extensions:['xml']}]});
    if(result.canceled||!result.filePath)return false;
    fs.writeFileSync(result.filePath,require('../src/feed.cjs').rss(store.state.daily),'utf8');return true;
  });
  handle('profile:set',input=>{const weights=validWeights(input);store.update(s=>{s.profile={weights,source:'manual',importedAt:new Date().toISOString()};});emit();return visibleState();});
  handle('profile:import',async()=>{
    const result=await dialog.showOpenDialog(window,{title:'Import local interest profile',filters:[{name:'RepoPulse interest profile',extensions:['json']}],properties:['openFile']});
    if(result.canceled)return null;
    const file=result.filePaths[0];if(fs.statSync(file).size>65536)throw new Error('Interest profile must be smaller than 64 KB.');
    const profile=validateProfile(JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')));
    store.update(s=>{s.profile=profile;});emit();return visibleState();
  });
  handle('settings:set',input=>{
    const next={...store.state.settings};for(const key of ['pinned','reducedMotion','launchAtLogin'])if(typeof input?.[key]==='boolean')next[key]=input[key];
    if(next.launchAtLogin!==store.state.settings.launchAtLogin){
      if(process.platform==='linux')throw new Error('Use your desktop session settings to launch RepoPulse at login on Linux.');
      app.setLoginItemSettings({openAtLogin:next.launchAtLogin});
    }
    store.update(s=>{s.settings=next;});window.setAlwaysOnTop(next.pinned);emit();return visibleState();
  });
  handle('data:clear',async()=>{
    const result=await dialog.showMessageBox(window,{type:'warning',buttons:['Cancel','Delete local data'],defaultId:0,cancelId:0,title:'Clear RepoPulse',message:'Delete your interests, saved repositories and discovery history?',detail:'This only clears RepoPulse data on this device. It does not delete browser history.'});
    if(result.response!==1)return null;
    const {defaults}=require('../src/engine.cjs');store.state=defaults();store.save();window.setAlwaysOnTop(true);if(process.platform!=='linux')app.setLoginItemSettings({openAtLogin:false});emit();return visibleState();
  });
}
if(singleton) app.whenReady().then(()=>{
  store=new Store(path.join(app.getPath('userData'),process.argv.includes('--smoke-test')?'smoke-state.json':'state.json'));createWindow();attachIpc();
  const image=nativeImage.createFromDataURL(require('./tray-icon.cjs'));
  tray=new Tray(image);tray.setToolTip('RepoPulse · Your daily open-source signal');tray.setContextMenu(Menu.buildFromTemplate([{label:'Open RepoPulse',click:()=>{show();resize(true);}},{label:'Refresh discoveries',click:()=>refresh(true)},{type:'separator'},{label:'Quit RepoPulse',click:()=>{quitting=true;app.quit();}}]));tray.on('click',()=>{show();resize(!expanded);});
  globalShortcut.register('CommandOrControl+Shift+Space',()=>{show();resize(!expanded);});
  timer=setInterval(()=>{if(store.state.daily?.day!==localDay())refresh();},60000);
  app.on('second-instance',show);app.on('activate',show);
  if(!app.isPackaged && process.argv.includes('--smoke-test')) require('../scripts/smoke.cjs').smoke({app,window,store,resize,TOPICS}).catch(error=>{console.error(error);app.exit(1);});
}).catch(error=>{dialog.showErrorBox('RepoPulse could not start',error.message);app.quit();});
app.on('before-quit',()=>{quitting=true;clearInterval(timer);});
app.on('will-quit',()=>{globalShortcut.unregisterAll();});
app.on('window-all-closed',()=>{});




