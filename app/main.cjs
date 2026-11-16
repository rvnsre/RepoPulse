'use strict';
const {app,BrowserWindow,ipcMain,shell,Tray,Menu,globalShortcut,nativeImage,screen,dialog,Notification,clipboard}=require('electron');
const path=require('node:path'),fs=require('node:fs');
const {Store}=require('../src/store.cjs');
const {TOPICS,localDay,validateProfile,validWeights,repoTopics,defaults,normalizeRepo}=require('../src/engine.cjs');
const discovery=require('../src/discovery.cjs');
const workspace=require('../src/workspace.cjs');
const {fetchCatalog}=require('../src/github.cjs');
const {ReleaseClient,destination,repositoryUrl}=require('../src/navigation.cjs');
const {bounds:layoutBounds}=require('../src/layout.cjs');
let lastExternal=null,revision=0;
let releaseClient;
let window,store,tray,timer,refreshPromise,quitting=false,mode='panel',lastError=null,moveTimer,adjusting=false;
const opening=new Map(),smokeMode=!app.isPackaged&&process.argv.includes('--smoke-test');
const singleton=app.requestSingleInstanceLock();if(!singleton)app.quit();
function snapshot(){const s=store.state;return {windowMode:mode,workspace:s.workspace,catalog:[...new Map([...s.cache,...s.saved,...Object.values(s.workspace?.records||{}).map(r=>r.repo)].map(r=>[r.id,r])).values()],analytics:workspace.analytics(s.history,s.workspace),revision,daily:s.daily,saved:s.saved,history:s.history,settings:s.settings,profile:s.profile,topics:TOPICS,cacheAt:s.cacheAt,catalogSize:s.cache.length,languages:[...new Set(s.cache.map(r=>r.language).filter(Boolean))].sort(),blockedOwners:s.blockedOwners,snoozedCount:Object.values(s.snoozed).filter(t=>t>Date.now()).length,canUndo:!!s.lastRotation&&s.lastRotation.day===localDay(),lastError,version:app.getVersion(),platform:process.platform,recoveryNotice:s.recoveryNotice||null,...(smokeMode?{lastExternal}:{}),exclusions:{hidden:s.hidden.map(id=>({id,name:findRepo(id)?.full_name||String(id)})),snoozed:Object.entries(s.snoozed).filter(([,until])=>until>Date.now()).map(([id,until])=>({id:Number(id),name:findRepo(Number(id))?.full_name||id,until})),owners:s.blockedOwners}};}
function emit(){revision++;if(window&&!window.isDestroyed())window.webContents.send('state:changed',snapshot());}
function findRepo(id){return [...(store.state.daily?.repos||[]),...store.state.saved,...store.state.cache,...store.state.history.map(h=>h.repo),...Object.values(store.state.workspace?.records||{}).map(r=>r.repo)].find(r=>r?.id===id);}
function resize(next='panel',anchor=false){
 mode=next===false||next==='collapsed'?'collapsed':next==='workspace'?'workspace':'panel';if(!window)return;
 const area=screen.getDisplayMatching(window.getBounds()).workArea,current=window.getBounds();
 const rect=layoutBounds(area,store.state.settings,mode,anchor?null:{cx:current.x+current.width/2,y:current.y});
 if(['x','y','width','height'].some(k=>rect[k]!==current[k])){adjusting=true;window.setBounds(rect,false);setTimeout(()=>{adjusting=false;},100);}
 window.webContents.send('window:mode',mode);
}
function show(){window.show();window.focus();}
async function refresh(force=false){
 if(refreshPromise)return refreshPromise;
 refreshPromise=(async()=>{lastError=null;const previousDay=store.state.daily?.day;
  if(force||!Number.isFinite(Date.parse(store.state.cacheAt))||Date.now()-Date.parse(store.state.cacheAt)>6*3600000){try{const cache=await fetchCatalog(store.state.cache);store.update(s=>{s.cache=cache;s.cacheAt=new Date().toISOString();});}catch(e){lastError=e.message;}}
  store.update(s=>{discovery.present(s);});emit();
  if(previousDay&&previousDay!==localDay()&&store.state.settings.notifications&&!store.state.settings.quietMode&&Notification.isSupported()&&store.state.daily.repos.length)new Notification({title:'Your GitHub discoveries are ready',body:`${store.state.daily.repos.length} new 50K+ star projects, selected for you.`}).show();
  return {state:snapshot(),error:lastError};
 })().finally(()=>{refreshPromise=null;});return refreshPromise;
}
function recordOpen(id){
 return store.update(s=>{const repo=findRepo(id);if(s.settings.markReadOnOpen)s.workspace=workspace.patch(s.workspace,repo,{read:true});s.history=[{repo:{...repo},openedAt:new Date().toISOString()},...s.history].slice(0,500);
  if(!s.settings.pausedLearning)for(const key of Object.keys(repoTopics(repo)))s.profile.weights[key]=Math.min(100,(s.profile.weights[key]||0)+0.5);
  if(s.settings.autoReplace)discovery.rotate(s,id);
 });
}
async function openRepo(id,kind='repository'){
 if(!Number.isSafeInteger(id))throw new Error('Invalid repository');
 const repo=findRepo(id);if(!repo)throw new Error('Repository is no longer available.');
 if(!['repository','learn','releases','readme','issues','pulls','discussions','wiki','actions','contributors','license','commits','tags','forks','stargazers'].includes(kind))throw new Error('Unsupported repository action.');
 const key=id+':'+kind;
 if(opening.has(key)){await opening.get(key);return snapshot();}
 const task=(async()=>{
  const release=kind==='releases'?await releaseClient.get(repo):null;
  if(kind==='releases'&&release.available!==true)throw new Error(release.available===false?'No public release is available for this repository. Use Guide for setup instructions.':release.error||'Release availability could not be checked. Try again.');
  const url=destination(repo,kind,release);
  if(!smokeMode)await shell.openExternal(url);else lastExternal={url,kind,id};
  if(['repository','learn','releases'].includes(kind))recordOpen(id);
  emit();return snapshot();
 })();
 opening.set(key,task);try{return await task;}finally{opening.delete(key);}
}
function createWindow(){
 const area=screen.getPrimaryDisplay().workArea,geometry=store.state.geometry,rect=layoutBounds(area,store.state.settings,'panel',geometry);
 window=new BrowserWindow({...rect,transparent:!smokeMode,frame:false,resizable:false,hasShadow:false,alwaysOnTop:store.state.settings.pinned,skipTaskbar:true,backgroundColor:smokeMode?'#253d43':'#00000000',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
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
 else if(kind==='workspace'){content=JSON.stringify(workspace.normalize(s.workspace),null,2);name='repopulse-workspace';}
 else if(kind==='workspacecsv'){content=workspace.csv([...new Map([...s.saved,...Object.values(s.workspace.records).map(r=>r.repo)].map(r=>[r.id,r])).values()],s.workspace);name='repopulse-workspace';extension='csv';}
 else if(kind==='history'){content=JSON.stringify({schema:'repopulse.history.v1',entries:s.history},null,2);name='repopulse-history';}
 else throw new Error('Unsupported export');
 const result=await dialog.showSaveDialog(window,{title:'Export RepoPulse data',defaultPath:`${name}.${extension}`,filters:[{name:extension.toUpperCase(),extensions:[extension]}]});if(result.canceled||!result.filePath)return false;
 fs.writeFileSync(result.filePath,content,'utf8');return true;
}
async function importData(kind){
 if(!['profile','collection','workspace'].includes(kind))throw new Error('Unsupported import');
 const result=await dialog.showOpenDialog(window,{title:`Import ${kind}`,filters:[{name:'RepoPulse JSON',extensions:['json']}],properties:['openFile']});if(result.canceled)return null;
 const file=result.filePaths[0];if(fs.statSync(file).size>(kind==='profile'?65536:2000000))throw new Error('The selected file is too large.');
 const input=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
 const data=kind==='profile'?validateProfile(input):kind==='workspace'?workspace.merge(store.state.workspace,input):discovery.collection(input);
 store.update(s=>{if(kind==='workspace')s.workspace=data;else if(kind==='profile'){const initial=!Object.keys(s.profile.weights).length;s.profile=data;if(initial){s.daily=null;discovery.present(s);}}else s.saved=[...new Map([...data,...s.saved].map(r=>[r.id,r])).values()];});emit();return snapshot();
}
function attachIpc(){
 const handle=(name,fn)=>ipcMain.handle(name,(event,...args)=>{if(event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame)throw new Error('Untrusted sender');return fn(...args);});
 handle('library:query',input=>{if(!input||typeof input!=='object')input={};return workspace.query(snapshot().catalog,input,store.state.workspace,store.state.saved,store.state.history);});
 handle('workspace:patch',(id,input)=>{if(!Number.isSafeInteger(id))throw new Error('Invalid repository');const repo=findRepo(id);if(!repo)throw new Error('Repository unavailable');store.update(s=>{s.workspace=workspace.patch(s.workspace,repo,input);});emit();return snapshot();});
 handle('workspace:bulk',(ids,action)=>{if(!Array.isArray(ids)||ids.length>2000||!['save','unsave','read','unread','queue','unqueue','pin','unpin'].includes(action))throw new Error('Invalid bulk action');const found=[...new Set(ids)].filter(Number.isSafeInteger).map(findRepo).filter(Boolean);store.update(s=>{for(const repo of found){if(action==='save'&&!s.saved.some(r=>r.id===repo.id))s.saved.push(repo);else if(action==='unsave')s.saved=s.saved.filter(r=>r.id!==repo.id);else if(!['save','unsave'].includes(action)){const key=({read:'read',unread:'read',queue:'queued',unqueue:'queued',pin:'pinned',unpin:'pinned'})[action];s.workspace.records[repo.id]={...workspace.metadata({...s.workspace.records[repo.id],[key]:['read','queue','pin'].includes(action)}),repo,updatedAt:new Date().toISOString()};}}});emit();return snapshot();});
 handle('workspace:collection',async(action,payload)=>{if(['delete','clear'].includes(action)&&!await confirm(action==='delete'?'Delete this collection?':'Clear this collection?','Repository notes, ratings and saved projects remain available.'))return null;if(action==='create')payload={...payload,id:require('node:crypto').randomUUID()};store.update(s=>{s.workspace=workspace.collection(s.workspace,action,payload,[...s.cache,...s.saved,...Object.values(s.workspace.records).map(r=>r.repo)].map(r=>r.id));if(action==='add')for(const id of payload.repos||[]){const repo=findRepo(id);if(repo&&!s.workspace.records[id])s.workspace.records[id]={...workspace.metadata(),repo,updatedAt:new Date().toISOString()};}});emit();return snapshot();});
 handle('state:get',()=>snapshot());handle('catalog:refresh',force=>refresh(force===true));
 handle('window:expand',next=>resize(next));
 handle('window:fit',payload=>{if(!payload||payload.mode!==mode||!Number.isFinite(payload.height))return;const current=window.getBounds(),area=screen.getDisplayMatching(current).workArea,height=Math.round(Math.max(mode==='collapsed'?80:160,Math.min(payload.height,area.height-12)));if(Math.abs(current.height-height)>1){adjusting=true;window.setBounds({height,y:Math.round(Math.max(area.y,Math.min(current.y,area.y+area.height-height)))},false);setTimeout(()=>{adjusting=false;},100);}});handle('window:hide',()=>window.hide());handle('app:quit',()=>{quitting=true;app.quit();});
 handle('repo:open',openRepo);
 handle('repo:release-check',async(id,force=false)=>{const repo=findRepo(id);if(!repo)throw new Error('Repository unavailable');return {...await releaseClient.get(repo,force===true),id};});
 handle('repo:copy',(id,kind)=>{const repo=findRepo(id);if(!repo)throw new Error('Repository unavailable');const commands=discovery.sources(repo);const values={url:`https://github.com/${repo.full_name}`,clone:commands.clone,inspect:commands.inspect,markdown:`[${repo.full_name}](https://github.com/${repo.full_name})`,releases:repositoryUrl(repo)+'/releases',name:repo.full_name,owner:repo.full_name.split('/')[0],shallow:'git clone --depth 1 '+repositoryUrl(repo)+'.git',ssh:'git clone git@github.com:'+repo.full_name+'.git',cli:'gh repo clone '+repo.full_name,json:JSON.stringify(repo,null,2),stars:String(repo.stargazers_count)};if(!Object.hasOwn(values,kind))throw new Error('Unsupported copy');clipboard.writeText(values[kind]);return true;});
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
 handle('history:remove',(id,time)=>{if(!Number.isSafeInteger(id)||typeof time!=='string')throw new Error('Invalid history item');store.update(s=>{s.history=s.history.filter(h=>!(h.repo.id===id&&h.openedAt===time));});emit();return snapshot();});
 handle('exclusion:remove',(kind,value)=>{store.update(s=>{if(kind==='owner')s.blockedOwners=s.blockedOwners.filter(v=>v!==value);else if(kind==='hidden'&&Number.isSafeInteger(value)){s.hidden=s.hidden.filter(v=>v!==value);s.seen=s.seen.filter(v=>v!==value);}else if(kind==='snoozed'&&Number.isSafeInteger(value)){delete s.snoozed[value];s.seen=s.seen.filter(v=>v!==value);}else throw new Error('Invalid exclusion');discovery.present(s);});emit();return snapshot();});
 handle('data:reset-controls',async()=>{if(!await confirm('Restore hidden, snoozed and blocked projects?','Previously opened projects remain in your discovery history.'))return null;store.update(s=>{const restore=new Set([...s.hidden,...Object.keys(s.snoozed).map(Number)]);s.seen=s.seen.filter(id=>!restore.has(id));s.hidden=[];s.snoozed={};s.blockedOwners=[];discovery.present(s);});emit();return snapshot();});
 handle('data:clear-history',async()=>{if(!await confirm('Clear your local viewing history?','No-repeat memory is retained so old projects do not reappear.'))return null;store.update(s=>{s.history=[];});emit();return snapshot();});
 handle('data:clear',async()=>{if(!await confirm('Delete all local RepoPulse data?','Interests, saved repositories and discovery history will be reset. Browser history and exported files are not deleted.'))return null;store.state=discovery.initialize(defaults());store.save();window.setAlwaysOnTop(true);window.setOpacity(1);if(process.platform!=='linux')app.setLoginItemSettings({openAtLogin:false});emit();return snapshot();});
}
if(singleton)app.whenReady().then(()=>{
 store=new Store(path.join(app.getPath('userData'),smokeMode?'smoke-state.json':'state.json'));discovery.initialize(store.state);
 if(smokeMode){store.state=discovery.initialize(defaults());store.state.settings.autoHide=false;store.state.cache=require('../test/fixtures.cjs');store.state.cacheAt=new Date().toISOString();store.state.profile.weights={ai:10,tools:8,systems:6};discovery.present(store.state);}
 releaseClient=new ReleaseClient(smokeMode?{fetchImpl:async()=>({ok:true,json:async()=>[{tag_name:'v1.0.0',draft:false}]})}:{});
 createWindow();attachIpc();if(store.state.settings.startCollapsed&&!smokeMode)window.webContents.once('did-finish-load',()=>resize('collapsed'));tray=new Tray(nativeImage.createFromDataURL(require('./tray-icon.cjs')));tray.setToolTip('RepoPulse - GitHub rss');tray.setContextMenu(Menu.buildFromTemplate([{label:'Open RepoPulse',click:()=>{show();resize('panel');}},{label:'Refresh catalog',click:()=>refresh(true)},{type:'separator'},{label:'Quit',click:()=>{quitting=true;app.quit();}}]));tray.on('click',()=>{show();resize(mode==='collapsed'?'panel':'collapsed');});
 globalShortcut.register('CommandOrControl+Shift+Space',()=>{show();resize(mode==='collapsed'?'panel':'collapsed');});
 timer=setInterval(()=>{if(store.state.daily?.day!==localDay())refresh();},60000);app.on('second-instance',show);app.on('activate',show);
 if(smokeMode)require('../scripts/smoke.cjs').smoke({app,window,store,resize,TOPICS,snapshot}).catch(error=>{console.error(error);app.exit(1);});
}).catch(error=>{dialog.showErrorBox('RepoPulse could not start',error.message);app.quit();});
app.on('before-quit',()=>{quitting=true;clearInterval(timer);clearTimeout(moveTimer);});app.on('will-quit',()=>globalShortcut.unregisterAll());app.on('window-all-closed',()=>{});
