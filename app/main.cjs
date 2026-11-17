'use strict';
const {app,BrowserWindow,ipcMain,shell,Tray,Menu,globalShortcut,nativeImage,screen,dialog,Notification,clipboard,powerMonitor}=require('electron');
const path=require('node:path'),fs=require('node:fs');
const {Store}=require('../src/store.cjs');
const {TOPICS,localDay,validateProfile,validWeights,repoTopics,defaults,normalizeRepo}=require('../src/engine.cjs');
const discovery=require('../src/discovery.cjs');
const workspace=require('../src/workspace.cjs');
const {fetchCatalog}=require('../src/github.cjs');
const {ReleaseClient,destination,repositoryUrl}=require('../src/navigation.cjs');
const {bounds:layoutBounds,fittedHeight,defaultAnchor}=require('../src/layout.cjs');
const {PointerTracker}=require('../src/pointer.cjs');
const advisor=require('../src/advisor.cjs');const idleGate=new advisor.IdleGate();let insight=null,context={topic:null,status:'off'},advisorTimer,contextTimer,screenLocked=false,contextBusy=false;
const {policy,activeDisplay,topAnchor,dockShape}=require('../src/window-policy.cjs');const windowPolicy=policy(process.platform,process.env,smokeFlag());function smokeFlag(){return !app.isPackaged&&process.argv.includes('--smoke-test');}
const {ActivityClient,observe,velocity}=require('../src/activity.cjs');const install=require('../src/install.cjs');let activityClient,lastSyncAttempt=0,shortcutAvailable=false,trayAvailable=false;
if(process.platform==='linux'&&process.env.WAYLAND_DISPLAY){if(process.env.DISPLAY)app.commandLine.appendSwitch('ozone-platform','x11');else app.commandLine.appendSwitch('enable-features','GlobalShortcutsPortal');}
const pointerTracker=new PointerTracker();let pointerTimer;
let lastExternal=null,revision=0;
let releaseClient,lastAutomaticAt=0,windowAnchor=null,lastWindowRequest=0;
let window,store,tray,timer,refreshPromise,quitting=false,mode='panel',lastError=null,moveTimer,lastProgrammaticPosition=null;
const opening=new Map(),smokeMode=!app.isPackaged&&process.argv.includes('--smoke-test');
const singleton=app.requestSingleInstanceLock();if(!singleton)app.quit();
function snapshot(){const s=store.state;return {windowPolicy:{...windowPolicy,options:undefined},shortcutAvailable,trayAvailable,insight,contextStatus:context.status,windowMode:mode,windowBounds:window?.getBounds(),workspace:s.workspace,catalog:[...new Map([...s.cache,...s.saved,...Object.values(s.workspace?.records||{}).map(r=>r.repo)].map(r=>[r.id,r])).values()],analytics:workspace.analytics(s.history,s.workspace),revision,daily:s.daily,saved:s.saved,history:s.history,settings:s.settings,profile:s.profile,topics:TOPICS,cacheAt:s.cacheAt,catalogSize:s.cache.length,languages:[...new Set(s.cache.map(r=>r.language).filter(Boolean))].sort(),blockedOwners:s.blockedOwners,snoozedCount:Object.values(s.snoozed).filter(t=>t>Date.now()).length,canUndo:!!s.lastRotation&&s.lastRotation.day===localDay(),lastError,version:app.getVersion(),platform:process.platform,recoveryNotice:s.recoveryNotice||null,...(smokeMode?{lastExternal,fixture:true}:{}),exclusions:{hidden:s.hidden.map(id=>({id,name:findRepo(id)?.full_name||String(id)})),snoozed:Object.entries(s.snoozed).filter(([,until])=>until>Date.now()).map(([id,until])=>({id:Number(id),name:findRepo(Number(id))?.full_name||id,until})),owners:s.blockedOwners}};}
function emit(){revision++;if(window&&!window.isDestroyed())window.webContents.send('state:changed',snapshot());}
function findRepo(id){return [...(store.state.daily?.repos||[]),...store.state.saved,...store.state.cache,...store.state.history.map(h=>h.repo),...Object.values(store.state.workspace?.records||{}).map(r=>r.repo)].find(r=>r?.id===id);}
let lastShape='';function applyWindowShape(){if(!window||window.isDestroyed())return;if(process.platform==='darwin')window.invalidateShadow();if(process.platform!=='linux'||windowPolicy.nativeWayland||windowPolicy.transparent)return;const b=window.getBounds(),key=b.width+':'+b.height+':'+mode;if(key===lastShape)return;try{window.setShape(dockShape(b.width,b.height,mode==='collapsed'));windowPolicy.shaped=true;lastShape=key;}catch{windowPolicy.shaped=false;}}
function resize(next='panel',anchor=false,requestId=null){
 mode=next===false||next==='collapsed'?'collapsed':next==='insight'?'insight':next==='workspace'?'workspace':'panel';if(!window)return;
 const area=(windowAnchor?screen.getDisplayNearestPoint({x:Math.round(windowAnchor.cx),y:Math.round(windowAnchor.y)}):screen.getDisplayMatching(window.getBounds())).workArea,current=window.getBounds();
 if(anchor||!windowAnchor)windowAnchor=defaultAnchor(area,store.state.settings);
 const rect=layoutBounds(area,store.state.settings,mode,windowAnchor);
 if(['x','y','width','height'].some(k=>rect[k]!==current[k])){clearTimeout(moveTimer);lastProgrammaticPosition={x:rect.x,y:rect.y};window.setBounds(rect,false);}
 applyWindowShape();
 window.webContents.send('window:mode',{mode,requestId,bounds:window.getBounds(),...(mode==='insight'?{insight}:{})});
}
function samplePointer(){
 if(!windowPolicy.pointer||!window||window.isDestroyed()||!window.isVisible())return null;
 let point;
 try{if(smokeMode&&process.platform==='linux'){const output=require('node:child_process').execFileSync('xdotool',['getmouselocation','--shell'],{encoding:'utf8',timeout:1000});const values=Object.fromEntries(output.trim().split(/\r?\n/).map(line=>line.split('=')));point={x:Number(values.X),y:Number(values.Y)};}else point=screen.getCursorScreenPoint();}catch{return null;}
 const value=pointerTracker.update(point,window.getBounds());if(value?.changed)window.webContents.send('pointer:state',value);return value;
}
function show(){const display=activeDisplay(screen);windowAnchor=topAnchor(display);resize('panel');window.show();window.focus();}
function summon(){if(!window.isVisible()||mode==='collapsed'||activeDisplay(screen).id!==screen.getDisplayMatching(window.getBounds()).id){show();}else resize('collapsed');}
async function refresh(force=false){
 if(refreshPromise)return refreshPromise;
 refreshPromise=(async()=>{const previousDay=store.state.daily?.day;
  if(force||(!Number.isFinite(Date.parse(store.state.cacheAt))||Date.now()-Date.parse(store.state.cacheAt)>=240000)&&Date.now()-lastSyncAttempt>=240000){lastSyncAttempt=Date.now();try{const cache=await fetchCatalog(store.state.cache);store.update(s=>{s.cache=cache;s.cacheAt=new Date().toISOString();s.starSamples=observe(s.starSamples,cache);});lastError=null;}catch(e){lastError=e.message;}}
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
 if(!['repository','learn','releases','readme','issues','pulls','discussions','wiki','actions','contributors','license','commits','tags','forks','stargazers','feed'].includes(kind))throw new Error('Unsupported repository action.');
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
 const display=activeDisplay(screen),area=display.workArea;windowAnchor=topAnchor(display);const rect=layoutBounds(area,store.state.settings,'panel',windowAnchor);
 window=new BrowserWindow({...rect,...windowPolicy.options,alwaysOnTop:store.state.settings.pinned,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
 if(process.platform==='darwin'){app.dock?.hide();window.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:false});}window.setAlwaysOnTop(store.state.settings.pinned,'floating');
 window.once('ready-to-show',()=>{if(store.state.settings.startCollapsed&&!smokeMode)resize('collapsed');window.showInactive();});window.on('resize',applyWindowShape);
 window.setOpacity(store.state.settings.opacity/100);resize('panel');
 window.loadFile(path.join(__dirname,'index.html'));
 window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',event=>event.preventDefault());window.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
 screen.on('display-metrics-changed',()=>{windowAnchor=topAnchor(screen.getDisplayMatching(window.getBounds()));resize(mode);});
 screen.on('display-removed',()=>{windowAnchor=topAnchor(activeDisplay(screen));resize(mode);});
 window.on('close',event=>{if(!quitting){event.preventDefault();if(!trayAvailable&&!shortcutAvailable){window.setSkipTaskbar(false);window.minimize();}else window.hide();}});
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
async function collectContext(){
 if(contextBusy||!store.state.settings.screenContext||screenLocked)return;contextBusy=true;
 try{const value=await advisor.foreground();if(store.state.settings.screenContext&&value.status!=='self')context=value;}finally{contextBusy=false;}
}
function showInsight(){
 const value=advisor.recommend(store.state,store.state.settings.screenContext?context:{});
 if(!value)return false;insight=value;window.showInactive();resize('insight');emit();return true;
}
function attachIpc(){
 const handle=(name,fn)=>ipcMain.handle(name,(event,...args)=>{if(event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame)throw new Error('Untrusted sender');return fn(...args);});
 handle('library:query',input=>{if(!input||typeof input!=='object')input={};return workspace.query(snapshot().catalog,input,store.state.workspace,store.state.saved,store.state.history);});
 handle('workspace:patch',(id,input)=>{if(!Number.isSafeInteger(id))throw new Error('Invalid repository');const repo=findRepo(id);if(!repo)throw new Error('Repository unavailable');store.update(s=>{s.workspace=workspace.patch(s.workspace,repo,input);});emit();return snapshot();});
 handle('workspace:bulk',(ids,action)=>{if(!Array.isArray(ids)||ids.length>2000||!['save','unsave','read','unread','queue','unqueue','pin','unpin'].includes(action))throw new Error('Invalid bulk action');const found=[...new Set(ids)].filter(Number.isSafeInteger).map(findRepo).filter(Boolean);store.update(s=>{for(const repo of found){if(action==='save'&&!s.saved.some(r=>r.id===repo.id))s.saved.push(repo);else if(action==='unsave')s.saved=s.saved.filter(r=>r.id!==repo.id);else if(!['save','unsave'].includes(action)){const key=({read:'read',unread:'read',queue:'queued',unqueue:'queued',pin:'pinned',unpin:'pinned'})[action];s.workspace.records[repo.id]={...workspace.metadata({...s.workspace.records[repo.id],[key]:['read','queue','pin'].includes(action)}),repo,updatedAt:new Date().toISOString()};}}});emit();return snapshot();});
 handle('workspace:collection',async(action,payload)=>{if(['delete','clear'].includes(action)&&!await confirm(action==='delete'?'Delete this collection?':'Clear this collection?','Repository notes, ratings and saved projects remain available.'))return null;if(action==='create')payload={...payload,id:require('node:crypto').randomUUID()};store.update(s=>{s.workspace=workspace.collection(s.workspace,action,payload,[...s.cache,...s.saved,...Object.values(s.workspace.records).map(r=>r.repo)].map(r=>r.id));if(action==='add')for(const id of payload.repos||[]){const repo=findRepo(id);if(repo&&!s.workspace.records[id])s.workspace.records[id]={...workspace.metadata(),repo,updatedAt:new Date().toISOString()};}});emit();return snapshot();});
 handle('insight:preview',()=>{showInsight();return snapshot();});
 handle('insight:dismiss',()=>{idleGate.dismiss();insight=null;resize('collapsed');emit();return snapshot();});
 handle('window:preview',next=>{if(!['panel','collapsed','workspace','insight'].includes(next))throw new Error('Invalid window mode');return layoutBounds(screen.getDisplayMatching(window.getBounds()).workArea,store.state.settings,next,windowAnchor);});
 handle('feed:next',()=>{let result;store.update(s=>{result=discovery.nextBatch(s);});if(result.changed)emit();return{...result,state:snapshot()};});
 handle('pointer:get',()=>samplePointer());handle('state:get',()=>snapshot());handle('catalog:refresh',force=>refresh(force===true));
 handle('window:expand',input=>{const next=typeof input==='object'?input?.mode:input,requestId=typeof input==='object'?input?.requestId:null;if(!['panel','collapsed','workspace','insight'].includes(next))throw new Error('Invalid window mode');if(requestId!=null){if(!Number.isSafeInteger(requestId)||requestId<=0)throw new Error('Invalid window request');if(requestId<=lastWindowRequest)return{mode,requestId,ignored:true,bounds:window.getBounds()};lastWindowRequest=requestId;}resize(next,false,requestId);return{mode,requestId,bounds:window.getBounds()};});
 handle('window:fit',payload=>{if(!payload||payload.mode!==mode||!Number.isFinite(payload.height))return;const current=window.getBounds(),area=screen.getDisplayMatching(current).workArea,height=fittedHeight(payload.height,area.height,mode==='collapsed');if(Math.abs(current.height-height)>1){clearTimeout(moveTimer);const y=Math.round(Math.max(area.y,Math.min(windowAnchor?.y??current.y,area.y+area.height-height)));lastProgrammaticPosition={x:current.x,y};window.setBounds({height,y},false);}return{mode,bounds:window.getBounds()};});handle('window:hide',()=>window.hide());handle('app:quit',()=>{quitting=true;app.quit();});
 handle('repo:open',openRepo);
 handle('repo:activity',async id=>{const repo=findRepo(id);if(!repo||!Number.isSafeInteger(id))throw Error('Invalid repository');const value=await activityClient.get(repo);return{...value,velocity:velocity(store.state.starSamples?.[id]),install:install.plan(repo,process.platform,value.packageName)};});
 handle('repo:release-check',async(id,force=false)=>{const repo=findRepo(id);if(!repo)throw new Error('Repository unavailable');return {...await releaseClient.get(repo,force===true),id};});
 handle('repo:copy',(id,kind)=>{const repo=findRepo(id);if(!repo)throw new Error('Repository unavailable');const commands=discovery.sources(repo);const values={package:install.plan(repo,process.platform,activityClient.cache.get(repo.full_name.toLowerCase())?.value?.packageName).command||repositoryUrl(repo)+'/releases',url:`https://github.com/${repo.full_name}`,clone:commands.clone,inspect:commands.inspect,markdown:`[${repo.full_name}](https://github.com/${repo.full_name})`,releases:repositoryUrl(repo)+'/releases',name:repo.full_name,owner:repo.full_name.split('/')[0],shallow:'git clone --depth 1 '+repositoryUrl(repo)+'.git',ssh:'git clone git@github.com:'+repo.full_name+'.git',cli:'gh repo clone '+repo.full_name,json:JSON.stringify(repo,null,2),stars:String(repo.stargazers_count)};if(!Object.hasOwn(values,kind))throw new Error('Unsupported copy');clipboard.writeText(values[kind]);return true;});
 handle('repo:react',(id,action)=>{
  if(!Number.isSafeInteger(id)||!['skip','save','like','hide','snooze','block'].includes(action))throw new Error('Invalid reaction');const repo=findRepo(id);if(!repo)throw new Error('Repository unavailable');
  store.update(s=>{
   if(action==='skip')discovery.rotate(s,id);
   if(action==='save')s.saved=s.saved.some(r=>r.id===id)?s.saved.filter(r=>r.id!==id):[repo,...s.saved];
   if(action==='like'){s.liked=Array.isArray(s.liked)?s.liked:[];if(!s.liked.includes(id)){s.liked.push(id);if(!s.settings.pausedLearning)for(const key of Object.keys(repoTopics(repo)))s.profile.weights[key]=Math.min(100,(s.profile.weights[key]||0)+2);}}
   if(action==='hide')s.hidden=[...new Set([...s.hidden,id])];
   if(action==='snooze'){s.snoozed[id]=Date.now()+7*86400000;s.seen=s.seen.filter(value=>value!==id);}
   if(action==='block')s.blockedOwners=[...new Set([...s.blockedOwners,repo.full_name.split('/')[0]])];
   if(['hide','snooze','block'].includes(action)){s.lastRotation=null;discovery.present(s);}
  });emit();return snapshot();
 });
 handle('feed:cycle',payload=>{
  const prefs=store.state.settings;
  if(!prefs.dynamicRefresh||['workspace','insight'].includes(mode)||!window.isVisible())return{changed:false,reason:'paused',state:snapshot()};
  if(Date.now()-lastAutomaticAt<3000)return{changed:false,reason:'cooldown',state:snapshot()};
  if(!payload||!Number.isSafeInteger(payload.id)||typeof payload.day!=='string')throw new Error('Invalid automatic replacement');
  if(payload.day!==localDay())return{changed:false,reason:'stale',state:snapshot()};
  let result;store.update(s=>{result=discovery.cycle(s,payload.id,payload.day);});
  if(result.changed){lastAutomaticAt=Date.now();emit();}
  return{...result,state:snapshot()};
 });
 handle('feed:undo',()=>{store.update(s=>discovery.undo(s));emit();return snapshot();});
 handle('feed:export',()=>exportData('rss'));handle('data:export',exportData);handle('data:import',importData);
 handle('profile:import',()=>importData('profile'));
 handle('profile:set',input=>{const weights=validWeights(input),initial=!Object.keys(store.state.profile.weights).length;store.update(s=>{s.profile={weights,source:'manual',importedAt:new Date().toISOString()};if(initial){s.daily=null;discovery.present(s);}});emit();return snapshot();});
 handle('settings:set',input=>{
  const previous=store.state.settings,next=discovery.settings({...previous,...input});
  if(next.launchAtLogin!==previous.launchAtLogin){if(process.platform==='linux')throw new Error('Configure autostart in your Linux desktop session settings.');app.setLoginItemSettings({openAtLogin:next.launchAtLogin});}
  store.update(s=>{s.settings=next;discovery.present(s);});if(!next.screenContext)context={topic:null,status:'off'};else if(!previous.screenContext)void collectContext();window.setAlwaysOnTop(next.pinned,'floating');window.setOpacity(next.opacity/100);resize(mode,next.anchor!==previous.anchor);emit();return snapshot();
 });
 handle('history:remove',(id,time)=>{if(!Number.isSafeInteger(id)||typeof time!=='string')throw new Error('Invalid history item');store.update(s=>{s.history=s.history.filter(h=>!(h.repo.id===id&&h.openedAt===time));});emit();return snapshot();});
 handle('exclusion:remove',(kind,value)=>{store.update(s=>{if(kind==='owner')s.blockedOwners=s.blockedOwners.filter(v=>v!==value);else if(kind==='hidden'&&Number.isSafeInteger(value)){s.hidden=s.hidden.filter(v=>v!==value);s.seen=s.seen.filter(v=>v!==value);}else if(kind==='snoozed'&&Number.isSafeInteger(value)){delete s.snoozed[value];s.seen=s.seen.filter(v=>v!==value);}else throw new Error('Invalid exclusion');discovery.present(s);});emit();return snapshot();});
 handle('data:reset-controls',async()=>{if(!await confirm('Restore hidden, snoozed and blocked projects?','Previously opened projects remain in your discovery history.'))return null;store.update(s=>{const restore=new Set([...s.hidden,...Object.keys(s.snoozed).map(Number)]);s.seen=s.seen.filter(id=>!restore.has(id));s.hidden=[];s.snoozed={};s.blockedOwners=[];discovery.present(s);});emit();return snapshot();});
 handle('data:clear-history',async()=>{if(!await confirm('Clear your local viewing history?','No-repeat memory is retained so old projects do not reappear.'))return null;store.update(s=>{s.history=[];});emit();return snapshot();});
 handle('data:clear',async()=>{if(!await confirm('Delete all local RepoPulse data?','Interests, saved repositories and discovery history will be reset. Browser history and exported files are not deleted.'))return null;store.state=discovery.initialize(defaults());store.save();window.setAlwaysOnTop(true);window.setOpacity(1);if(process.platform!=='linux')app.setLoginItemSettings({openAtLogin:false});emit();return snapshot();});
}
if(singleton)app.whenReady().then(()=>{
 store=new Store(path.join(app.getPath('userData'),smokeMode?'smoke-state.json':'state.json'));discovery.initialize(store.state);
 if(smokeMode){store.state=discovery.initialize(defaults());store.state.settings.autoHide=false;store.state.settings.dynamicRefresh=false;store.state.cache=require('../test/fixtures.cjs');store.state.cacheAt=new Date().toISOString();store.state.profile.weights={ai:10,tools:8,systems:6};discovery.present(store.state);}
 activityClient=new ActivityClient(smokeMode?{fetchImpl:async url=>({ok:true,status:200,json:async()=>url.includes('commits?')?[{sha:'a'.repeat(40),commit:{committer:{date:new Date().toISOString()}}}]:{tag_name:'v1.0.0',published_at:new Date().toISOString()}})}:{});
 releaseClient=new ReleaseClient(smokeMode?{fetchImpl:async()=>({ok:true,json:async()=>[{tag_name:'v1.0.0',draft:false}]})}:{});
 createWindow();attachIpc();pointerTimer=setInterval(samplePointer,40);try{tray=new Tray(nativeImage.createFromDataURL(require('./tray-icon.cjs')));trayAvailable=true;tray.setToolTip('RepoPulse — GitHub feed');tray.setContextMenu(Menu.buildFromTemplate([{label:'Summon on active display',click:show},{label:'Collapse / expand',click:summon},{label:'Force GitHub sync',click:()=>void refresh(true)},{type:'separator'},{label:'Quit',click:()=>{quitting=true;app.quit();}}]));tray.on('click',summon);}catch(error){lastError='System tray unavailable: '+error.message;}
 try{shortcutAvailable=globalShortcut.register('CommandOrControl+Shift+P',summon);shortcutAvailable=globalShortcut.register('CommandOrControl+Shift+Space',summon)||shortcutAvailable;}catch{shortcutAvailable=false;}
 powerMonitor.on('lock-screen',()=>{screenLocked=true;context={topic:null,status:'locked'};if(mode==='insight'){insight=null;resize('collapsed');}});
 powerMonitor.on('unlock-screen',()=>{screenLocked=false;});
 if(!smokeMode){contextTimer=setInterval(()=>{if(powerMonitor.getSystemIdleTime()<480)void collectContext();},60000);advisorTimer=setInterval(()=>{const busy=mode==='workspace'||opening.size>0||!window.isVisible();if(idleGate.tick(powerMonitor.getSystemIdleTime(),{enabled:store.state.settings.idleAdvisor,locked:screenLocked,busy}))showInsight();},15000);if(store.state.settings.screenContext)void collectContext();}
 powerMonitor.on('resume',()=>{if(!quitting)refresh().catch(error=>{lastError=error.message;emit();});});timer=setInterval(()=>{if(!smokeMode&&(store.state.daily?.day!==localDay()||Date.now()-Date.parse(store.state.cacheAt)>=240000))void refresh().catch(error=>{lastError=error.message;emit();});},60000);app.on('second-instance',show);app.on('activate',show);
 if(smokeMode)require('../scripts/smoke.cjs').smoke({app,window,store,resize,TOPICS,snapshot}).catch(error=>{console.error(error);app.exit(1);});
}).catch(error=>{dialog.showErrorBox('RepoPulse could not start',error.message);app.quit();});
app.on('before-quit',()=>{quitting=true;clearInterval(timer);clearInterval(pointerTimer);clearInterval(advisorTimer);clearInterval(contextTimer);clearTimeout(moveTimer);});app.on('will-quit',()=>globalShortcut.unregisterAll());app.on('window-all-closed',()=>{});

