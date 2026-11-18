'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
async function smoke({app,window,store,resize,TOPICS,snapshot}){
 const root=path.join(__dirname,'../dist');fs.mkdirSync(root,{recursive:true});const errors=[];
 window.webContents.on('console-message',(event,...legacy)=>{const level=event.level??legacy[0],message=event.message??legacy[1];if(level==='error'||typeof level==='number'&&level>=3){errors.push(message);console.error('RENDERER_ERROR:',message);}});
 await new Promise(resolve=>window.webContents.isLoading()?window.webContents.once('did-finish-load',resolve):resolve());
 const evaluate=async script=>{try{return await window.webContents.executeJavaScript(script);}catch(error){console.error('FAILED_NATIVE_SCRIPT:',script,'Renderer errors:',JSON.stringify(errors));throw error;}};
 async function until(check,attempts=50){for(let i=0;i<attempts;i++){if(await check())return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Native UI did not reach the expected state: '+JSON.stringify(await evaluate(`({rows:[...document.querySelectorAll('.repo-row')].map(r=>r.dataset.repoId),selected:document.querySelector('.repo-row.selected')?.dataset.repoId,toast:document.getElementById('toast').textContent,expanded:!document.getElementById('expanded').hidden,drawer:!document.getElementById('drawer').hidden,live:document.getElementById('liveToggle')?.textContent,commands:[...document.querySelectorAll('.repo-row pre')].map(n=>n.textContent),axiosActivity:typeof activityStates!=='undefined'?activityStates.get(9001):null,metadataPending:typeof activityPending!=='undefined'?[...activityPending]:null,pointerTrace:window.pointerTrace?.slice(-8),nativePointer:window.lastNativePointer,cssHover:document.documentElement.matches(':hover'),controller:typeof islandController!=='undefined'?islandController.status():null})`)));}
 await evaluate("window.lastNativePointer=null;window.pulse.onPointer(v=>window.lastNativePointer=v);window.pointerTrace=[];for(const type of ['pointerenter','pointerleave'])document.addEventListener(type,e=>{if(e.target===document.documentElement){window.pointerTrace.push({type,x:e.clientX,y:e.clientY});if(window.pointerTrace.length>50)window.pointerTrace.shift();}},true)");
 async function moveScreen(x,y){const point={x:Math.max(0,Math.round(x)),y:Math.max(0,Math.round(y))};require('node:child_process').execFileSync('xdotool',['mousemove',String(point.x),String(point.y)],{timeout:2000});await new Promise(r=>setTimeout(r,50));const location=require('node:child_process').execFileSync('xdotool',['getmouselocation','--shell'],{encoding:'utf8',timeout:2000});const actual=Object.fromEntries(location.trim().split(/\r?\n/).map(line=>line.split('=')));assert.equal(Number(actual.X),point.x,'X server pointer x');assert.equal(Number(actual.Y),point.y,'X server pointer y');}
 async function movePointer(x,y){const b=window.getBounds();await moveScreen(b.x+x,b.y+y);}
 await until(()=>evaluate(`!!document.querySelector('.repo-row')`));
 await new Promise(r=>setTimeout(r,500));let dimensions=await evaluate(`({rows:document.querySelectorAll('.repo-row').length,width:innerWidth,height:innerHeight,natural:document.getElementById('expanded').scrollHeight,island:document.getElementById('island').offsetHeight,footer:document.querySelector('footer').getBoundingClientRect().bottom})`);
 assert.equal(dimensions.rows,3);assert.ok(dimensions.width>=900&&dimensions.width<=960);assert.ok(dimensions.height<=650,JSON.stringify(dimensions));assert.ok(dimensions.footer<=dimensions.height+1,JSON.stringify(dimensions));

 async function capture(name){
  window.show();window.focus();window.webContents.focus();let png=null;
  for(let attempt=0;attempt<12;attempt++){
   await new Promise(resolve=>setTimeout(resolve,400));const bounds=window.getBounds();
   const image=await window.webContents.capturePage({x:0,y:0,width:bounds.width,height:bounds.height},{stayHidden:false,stayAwake:true});
   if(!image.isEmpty()){
    const bytes=image.toPNG(),tiny=name==='edge-hidden-preview.png'||name==='collapsed-preview.png';
    const bitmap=tiny?image.toBitmap():null;
    const varied=!tiny||bitmap.some((value,i)=>value!==bitmap[i%4]);
    if(bytes.length>(tiny?100:5000)&&varied){png=bytes;break;}
   }
  }
  assert.ok(png,'Native preview '+name+' must be painted. '+JSON.stringify(await evaluate("({nativeMode:state.windowMode,expanded,drawer,morphing,busy,autoHide:state.settings.autoHide,controller:islandController?.status(),width:innerWidth,height:innerHeight})")));fs.writeFileSync(path.join(root,name),png);
  if(name==='idle-insight-preview.png'){const encoded=png.toString('base64');for(let n=0;n<encoded.length;n+=4096)console.log('REPOPULSE_INSIGHT:'+encoded.slice(n,n+4096));}
  if(name==='audit-preview.png'){const encoded=png.toString('base64');for(let n=0;n<encoded.length;n+=4096)console.log('REPOPULSE_AUDIT:'+encoded.slice(n,n+4096));}
  if(name==='desktop-preview.png'){const encoded=png.toString('base64');for(let n=0;n<encoded.length;n+=4096)console.log('REPOPULSE_PREVIEW:'+encoded.slice(n,n+4096));}
 }

 const scroll=await evaluate(`(()=>{const f=document.getElementById('feed');return{client:f.clientHeight,total:f.scrollHeight,text:document.getElementById('pickRange').textContent,footerActions:document.querySelectorAll('footer .row-learn,footer #install,footer #learn').length};})()`);assert.ok(scroll.total>scroll.client);assert.equal(scroll.footerActions,0);assert.ok(scroll.text.includes('of 3'));
 await evaluate("document.getElementById('feed').scrollTop=9999");await new Promise(r=>setTimeout(r,100));assert.ok((await evaluate("document.getElementById('pickRange').textContent")).includes('3 of 3'));await evaluate("document.getElementById('feed').scrollTop=0");
 await capture('desktop-preview.png');
 const first=store.state.daily.repos[0],second=store.state.daily.repos[1];
 await evaluate(`window.originalRow=document.querySelector('.repo-row');document.querySelector('.row-extra button').focus();document.querySelector('.row-extra button').click()`);await until(()=>store.state.saved.length===1);await new Promise(r=>setTimeout(r,100));
 assert.equal(await evaluate(`window.originalRow===document.querySelector('.repo-row')`),true,'Saving must retain the row DOM');
 const fonts=await evaluate(`({description:parseFloat(getComputedStyle(document.querySelector('.repo-description')).fontSize),code:parseFloat(getComputedStyle(document.querySelector('pre')).fontSize),overflow:document.documentElement.scrollWidth>innerWidth})`);
 assert.ok(fonts.description>=14);assert.ok(fonts.code>=13);assert.equal(fonts.overflow,false);
 await evaluate(`document.querySelector('.repo-row .row-learn').click()`);await until(()=>store.state.history.length===1);
 assert.equal(snapshot().lastExternal.url,'https://github.com/'+first.full_name);assert.equal(snapshot().lastExternal.kind,'learn');assert.notEqual(store.state.daily.repos[0].id,first.id);assert.equal(store.state.daily.repos[1].id,second.id);
 await until(()=>evaluate(`!!document.querySelector('.toast-undo')`));await evaluate(`document.querySelector('.toast-undo').click()`);await until(()=>store.state.daily.repos[0].id===first.id);
 await until(()=>evaluate(`document.querySelector('.repo-row').dataset.repoId==='${first.id}'&&!!document.querySelector('.repo-row .download-link')`));await evaluate(`document.querySelector('.repo-row .download-link').click()`);await until(()=>snapshot().lastExternal?.kind==='releases');assert.equal(snapshot().lastExternal.url,'https://github.com/'+first.full_name+'/releases');
 await until(()=>evaluate(`!!document.querySelector('.toast-undo')`));await evaluate(`document.querySelector('.toast-undo').click()`);await until(()=>store.state.daily.repos[0].id===first.id);
 await until(()=>evaluate(`document.querySelector('.repo-row').dataset.repoId==='${first.id}'`));
 await evaluate(`document.getElementById('menu').click();document.querySelector('[data-tab=details]').click()`);await until(()=>evaluate(`!document.getElementById('drawer').hidden`));await capture('workspace-preview.png');
 const workspaceBounds=await evaluate(`({open:document.body.classList.contains('workspace-open'),drawer:document.getElementById('drawer').getBoundingClientRect().toJSON(),content:document.getElementById('drawerContent').getBoundingClientRect().toJSON(),feed:getComputedStyle(document.getElementById('feed')).display,height:innerHeight})`);assert.equal(workspaceBounds.open,true);assert.equal(workspaceBounds.feed,'none');assert.ok(workspaceBounds.content.height>250,JSON.stringify(workspaceBounds));assert.ok(workspaceBounds.drawer.bottom<=workspaceBounds.height,JSON.stringify(workspaceBounds));

 await evaluate(`document.querySelector('[data-tab="tune"]').click()`);await until(()=>evaluate(`document.querySelectorAll('.topic').length===8`));
 await evaluate(`document.querySelector('[data-tab="settings"]').click()`);await until(()=>evaluate(`document.querySelectorAll('.setting').length>=12`));
 await evaluate(`document.querySelector('[data-tab="saved"]').click()`);await until(()=>evaluate(`document.querySelectorAll('.list-row').length===1`));
 await evaluate(`window.pulse.settings({textScale:150,motion:'none',visibleRows:3})`);await until(()=>evaluate(`document.body.dataset.scale==='150'&&document.querySelectorAll('.repo-row').length===3`));
 assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,'Large text must fit');
 await evaluate(`document.getElementById('closeDrawer').click()`);await until(()=>evaluate(`document.getElementById('drawer').hidden`));
 await evaluate(`window.pulse.settings({textScale:100,motion:'system',visibleRows:2})`);await until(()=>evaluate(`document.body.dataset.scale==='100'`));
 await evaluate(`document.getElementById('collapse').click();document.getElementById('toggle').click()`);await until(()=>evaluate(`!document.getElementById('expanded').hidden`));
 
 await evaluate("window.pulse.workspacePatch("+first.id+",{notes:'Native workspace note',tags:['native','testing'],rating:4,pinned:true,queued:true})");
 await until(()=>store.state.workspace.records[first.id]?.queued===true);
 await evaluate("document.querySelector('[data-tab=\"details\"]').click()");
 await until(()=>evaluate("!!document.querySelector('[aria-label=\"Private repository notes\"]')"));
 await evaluate("window.pulse.workspacePatch("+first.id+",{notes:'Fresh imported note'})");
 await until(()=>evaluate("document.querySelector('[aria-label=\"Private repository notes\"]').value==='Fresh imported note'"));
 await evaluate("document.querySelector('[aria-label=\"Private repository notes\"]').value='Unfinished draft';document.querySelector('[aria-label=\"Private repository notes\"]').dispatchEvent(new Event('input',{bubbles:true}))");
 await evaluate("window.pulse.workspacePatch("+first.id+",{rating:3})");
 await new Promise(r=>setTimeout(r,100));
 assert.equal(await evaluate("document.querySelector('[aria-label=\"Private repository notes\"]').value"),'Unfinished draft','Dirty notes must survive unrelated updates');

 await evaluate("document.querySelector('[data-tab=\"library\"]').click()");
 await until(()=>evaluate("document.querySelectorAll('.library-row').length>0"));
 await evaluate("document.querySelector('[aria-label=\"Search project library\"]').value='tag:native';document.querySelector('[aria-label=\"Search project library\"]').dispatchEvent(new Event('input',{bubbles:true}));");
 await until(()=>evaluate("document.querySelectorAll('.library-row').length===1"));
 await evaluate("document.querySelector('[aria-label=\"Search project library\"]').focus();document.querySelector('[aria-label=\"Search project library\"]').setSelectionRange(2,2);");
 await evaluate("window.pulse.workspacePatch("+first.id+",{rating:5})");
 await until(()=>store.state.workspace.records[first.id].rating===5);
 await new Promise(r=>setTimeout(r,150));
 assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"),'Search project library','Library focus must survive a workspace update');
 assert.equal(await evaluate("document.activeElement.selectionStart"),2,'Search cursor must survive updates');
 await evaluate("document.querySelector('.library-row input').click();const action=document.querySelector('[aria-label=\"Bulk action\"]');action.value='read';action.dispatchEvent(new Event('change',{bubbles:true}));[...document.querySelectorAll('button')].find(b=>b.textContent==='Apply to selected').click();");
 await until(()=>store.state.workspace.records[first.id].read===true);
 await evaluate("document.querySelector('[data-tab=\"collections\"]').click()");
 await until(()=>evaluate("!!document.querySelector('[aria-label=\"New collection name\"]')"));
 await evaluate("document.querySelector('[aria-label=\"New collection name\"]').value='Native collection';[...document.querySelectorAll('button')].find(b=>b.textContent==='Create collection').click()");
 await until(()=>store.state.workspace.collections.length===1);
 const collectionId=store.state.workspace.collections[0].id;
 await evaluate("window.pulse.workspaceCollection('add',{id:"+JSON.stringify(collectionId)+",repos:["+first.id+"]})");
 assert.ok(store.state.workspace.collections[0].repos.includes(first.id));
 await evaluate("document.querySelector('[data-tab=\"library\"]').click()");
 await until(()=>evaluate("document.querySelectorAll('.library-row').length===1"));
 await evaluate("[...document.querySelectorAll('.library-row button')].find(b=>b.textContent==='Compare').click();document.querySelector('[data-tab=\"compare\"]').click()");
 await until(()=>evaluate("!!document.querySelector('.comparison')"));
 await evaluate("document.querySelector('[data-tab=\"insights\"]').click()");
 await until(()=>evaluate("document.querySelectorAll('.insight-card').length===11"));
 await capture('insights-preview.png');
 await evaluate("document.getElementById('commandButton').click()");
 await until(()=>evaluate("document.querySelectorAll('.command-item').length>=28"));
 await evaluate("document.getElementById('focusButton').click()");
 assert.equal(await evaluate("document.body.classList.contains('focus-session')"),true);
 await evaluate("document.getElementById('focusButton').click()");
 await evaluate("document.getElementById('closeDrawer').click()");
 await until(()=>evaluate("document.getElementById('drawer').hidden"));
 await evaluate("document.activeElement.blur();window.pulse.settings({autoHide:true,collapseOnLeave:true,idleCollapse:false,keepOnFocus:false,hideDelay:600,hoverDelay:80,hoverExpand:true,hoverScale:102,hoverLift:true,motion:'full',motionPreset:'fluid'})");
 await movePointer(-20,-20);
 await until(()=>evaluate("document.body.classList.contains('collapsed')&&document.getElementById('expanded').hidden"));
 await capture('collapsed-preview.png');

 assert.ok(window.getBounds().width<=120&&window.getBounds().height<=16,JSON.stringify(window.getBounds()));
 const edge=await evaluate("({bar:getComputedStyle(document.getElementById('edgeReveal')).display,header:getComputedStyle(document.querySelector('.topbar')).display,line:document.querySelector('#edgeReveal span').getBoundingClientRect().height})");
 assert.equal(edge.header,'none');assert.notEqual(edge.bar,'none');assert.equal(edge.line,3);
 await capture('edge-hidden-preview.png');
 const edgeHistory=store.state.history.length;
 await evaluate("document.getElementById('edgeReveal').click()");
 await until(()=>evaluate("!document.getElementById('expanded').hidden"));
 assert.equal(store.state.history.length,edgeHistory,'Reveal handle opens the panel, never a repository');
 await evaluate("document.getElementById('collapse').click()");
 await until(()=>evaluate("document.getElementById('expanded').hidden"));
 console.log('11.6 hidden handle passed: 120x16 native footprint, 3px indicator, no header and accessible click reveal.');


 await movePointer(-20,-20);
 await movePointer(60,4);
 await until(()=>evaluate("!document.getElementById('expanded').hidden"));
 await new Promise(r=>setTimeout(r,500));
 const growth=await evaluate("getComputedStyle(document.getElementById('island')).transform");
 assert.ok(!snapshot().windowPolicy.transparent||growth.includes('1.02'), 'Transparent hover magnification: '+growth);
 await capture('hover-preview.png');
 // Use actual Chromium mouse input at a fixed screen coordinate near a clamped edge.
 await evaluate("window.pulse.settings({autoHide:false,keepOnFocus:false})");
 await evaluate("document.getElementById('collapse').click()");
 await until(()=>evaluate("document.getElementById('expanded').hidden"));
 await new Promise(r=>setTimeout(r,160));
 const work=require('electron').screen.getDisplayMatching(window.getBounds()).workArea;
 // The dock owns its top-center anchor; verify entry there rather than a user-dragged bottom edge.
 await new Promise(r=>setTimeout(r,450));
 const dockAnchor=window.getBounds(),point={x:dockAnchor.x+dockAnchor.width/2,y:dockAnchor.y+4};
 await moveScreen(work.x-20,work.y-20);
 await evaluate("window.hoverModes=[];window.stopHoverTrace=window.pulse.onMode(m=>window.hoverModes.push(m));window.pulse.settings({autoHide:true,collapseOnLeave:true,hideDelay:0,hoverDelay:0,keepOnFocus:false})");
 await moveScreen(point.x,point.y);
 await until(()=>evaluate("!document.getElementById('expanded').hidden"));
 for(let i=0;i<8;i++)await moveScreen(point.x,point.y);
 assert.equal(await evaluate("document.getElementById('expanded').hidden"),false,'A stationary pointer must not cause resize/hover oscillation');
 await moveScreen(work.x-20,work.y-20);
 await until(()=>evaluate("document.getElementById('expanded').hidden"));
 await new Promise(r=>setTimeout(r,160));
 const restored=window.getBounds();assert.ok(Math.abs(restored.x-dockAnchor.x)<=1&&Math.abs(restored.y-dockAnchor.y)<=1,'Dock anchor must survive clamped expansion: '+JSON.stringify({dockAnchor,restored}));
 const trace=await evaluate("window.hoverModes.map(m=>m.mode||m);");assert.equal(trace.filter(m=>m==='panel').length,1,'One physical entry must produce one panel request: '+JSON.stringify(trace));
 // Interrupt closing with re-entry several times and finish in the latest requested mode.
 for(let i=0;i<3;i++){await moveScreen(point.x,point.y);await new Promise(r=>setTimeout(r,20));await moveScreen(work.x-20,work.y-20);}
 await moveScreen(point.x,point.y);await until(()=>evaluate("!document.getElementById('expanded').hidden"));
 await new Promise(r=>setTimeout(r,250));assert.equal(await evaluate("document.body.classList.contains('collapsed')"),false,'A delayed close acknowledgement must not override re-entry');
 await evaluate("window.stopHoverTrace()");
 console.log('Real pointer/resize regression passed: stable edge hover, exact dock-anchor restoration and interrupted close/re-entry.');

 await evaluate("window.pulse.settings({autoHide:false,motion:'none',hoverLift:false})");
 await evaluate("document.getElementById('edgeReveal').click()");
 await until(()=>window.getBounds().height>100);
 await movePointer(-20,-20);
 window.setBounds({width:600});
 await new Promise(r=>setTimeout(r,250));
 assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"),true,'Narrow native window must not overflow');

 // Verify real IPC and renderer timing, not a manual replacement helper.
 const historyBefore=store.state.history.length,weightsBefore=JSON.stringify(store.state.profile.weights);
 await evaluate("document.activeElement.blur();window.pulse.settings({panelWidth:960,textScale:100,visibleRows:2,autoHide:false,dynamicRefresh:true,cycleMin:3,cycleMax:3,cyclePauseHover:false,cyclePauseFocus:false,motion:'full',motionPreset:'snappy',motionDuration:80})");
 const cycleBefore=store.state.daily.repos.map(r=>r.id).join(',');
 await until(()=>store.state.daily.repos.map(r=>r.id).join(',')!==cycleBefore,160); // Includes the intentional 10-second post-Undo protection.
 assert.equal(store.state.history.length,historyBefore,'Autonomous display must not become a recorded visit');
 assert.equal(JSON.stringify(store.state.profile.weights),weightsBefore,'Autonomous display must not train interests');
 await evaluate("document.getElementById('liveToggle').click()");
 await until(()=>store.state.settings.dynamicRefresh===false);
 const pausedIds=store.state.daily.repos.map(r=>r.id).join(',');
 await new Promise(r=>setTimeout(r,3300));
 assert.equal(store.state.daily.repos.map(r=>r.id).join(','),pausedIds,'Pause must stop the live feed');
 const scenes=await evaluate(`(async()=>{const node=document.querySelector('.repo-row');for(const [id]of DynamicFeed.styles){const spec=DynamicFeed.transition(id,0,{duration:1});await node.animate(spec.enter,spec.options).finished;}return DynamicFeed.styles.length;})()`);
 assert.equal(scenes,22,'Every scene must be accepted by the native animation engine');
 await capture('dynamic-preview.png');
 console.log('Dynamic native checks passed: automatic 3-second replacement without a click, unchanged history/interests, live pause and all 22 animation scenes.');
 console.log('Version 10 workspace/draft regressions passed.');console.log('Ultimate native checks passed: notes, tags, ratings, pinned queue, search operators, cursor retention, bulk read, collections, comparison, insights, palette, focus session, auto-hide, animated hover reveal, 2% hover growth and narrow layout.');

 
 await evaluate("document.activeElement.blur();window.pulse.settings({autoHide:false,dynamicRefresh:false})");
 const nextBefore=store.state.daily.repos.map(r=>r.id),nextHistory=store.state.history.length;
 await evaluate("document.getElementById('next').click()");
 await until(()=>store.state.daily.repos.every(r=>!nextBefore.includes(r.id)));
 assert.equal(store.state.history.length,nextHistory);
 await evaluate("window.pulse.previewInsight()");
 await until(()=>evaluate("!document.getElementById('idleInsight').hidden&&document.getElementById('insightName').textContent.includes('/')"));
 assert.ok(window.getBounds().width<=480&&window.getBounds().height<=250);
 assert.equal(await evaluate("document.getElementById('expanded').hidden"),true);
 assert.equal(await evaluate("document.getElementById('insightName').textContent.includes('/')"),true);
 assert.equal(await evaluate("document.getElementById('toast').hidden"),true,'Previous toasts must not cover insight actions');
 await capture('idle-insight-preview.png');
 await evaluate("document.getElementById('insightDismiss').click()");
 await until(()=>evaluate("document.getElementById('idleInsight').hidden&&document.body.classList.contains('collapsed')"));
 console.log('11.0 native regression passed: new Next batch through real IPC, no phantom visits, compact idle advice and dismissal.');
 await evaluate("window.pulse.settings({autoHide:false,dynamicRefresh:false})");
 const axios=require('../src/engine.cjs').normalizeRepo({id:9001,full_name:'axios/axios',stargazers_count:150000,language:'JavaScript',description:'Promise based HTTP client for browser and Node.js. Includes a clean package manager installation.'});
 store.state.cache.push(axios);store.state.daily.repos[0]=axios;
 console.log('AXIOS_IPC_METADATA',JSON.stringify(await evaluate("window.pulse.activity(9001)")));
 await evaluate("window.pulse.settings({})");await evaluate("document.getElementById('toggle').click()");
 await until(()=>evaluate("!!document.querySelector('.repo-row[data-repo-id=\"9001\"] .smart-code')&&document.querySelector('.repo-row[data-repo-id=\"9001\"] pre').textContent==='npm install axios'"));
 await evaluate("document.querySelector('.repo-row[data-repo-id=\"9001\"] .copy-command').click()");
 await until(()=>require('electron').clipboard.readText()==='npm install axios');
 const baseline=await evaluate("(()=>{const row=document.querySelector('.repo-row[data-repo-id=\"9001\"]');return{left:row.querySelector('.row-extra').getBoundingClientRect().bottom,right:row.querySelector('.row-actions').getBoundingClientRect().bottom,wrap:getComputedStyle(row.querySelector('pre')).whiteSpace};})()");
 assert.ok(Math.abs(baseline.left-baseline.right)<=1,JSON.stringify(baseline));assert.equal(baseline.wrap,'pre');
 await evaluate("document.querySelector('.repo-row[data-repo-id=\"9001\"] .command-tab[aria-selected=true]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));document.querySelector('.repo-row[data-repo-id=\"9001\"] .copy-command').click()");
 await until(()=>require('electron').clipboard.readText()==='git clone https://github.com/axios/axios.git');
 await evaluate("state.cacheAt=new Date(Date.now()-78*60000).toISOString();state.lastError=null;renderSync();dynamicStatus({enabled:true,remaining:3000,period:3000,reason:'exhausted'})");
 assert.match(await evaluate("document.getElementById('status').textContent"),/Last synced 78m ago/);
 assert.ok(!(await evaluate("document.getElementById('liveToggle').textContent")).includes('Live'));
 assert.equal(await evaluate("document.getElementById('connectionDot').dataset.status"),'stale');
 await evaluate("window.pulse.settings({})");await capture('audit-preview.png');
 console.log('11.1 audit native checks passed: all three picks reachable, no duplicated footer actions, exact button baselines, npm/clone copy, nowrap code and stale sync consistency.');

 // Reproduce the reported 0-pick state with a fully seen catalog on a new day.
 const recoveryHistory=store.state.history.length,recoveryWeights=JSON.stringify(store.state.profile.weights);
 store.state.seen=store.state.cache.map(r=>r.id);store.state.daily={day:'2000-01-01',repos:[]};
 await evaluate("window.pulse.settings({autoHide:false,dynamicRefresh:false})");
 await until(()=>evaluate("document.querySelectorAll('.repo-row').length===3"));
 assert.equal(store.state.daily.repos.length,3);assert.ok(store.state.daily.repos.every(r=>r.stargazers_count>=50000));
 await evaluate("document.getElementById('next').click()");await until(()=>evaluate("document.querySelectorAll('.repo-row').length===3"));
 assert.equal(store.state.history.length,recoveryHistory);assert.equal(JSON.stringify(store.state.profile.weights),recoveryWeights);
 await evaluate("window.pulse.settings({languages:['NotARealLanguage']})");await until(()=>evaluate("!!document.querySelector('#feed>.empty')"));
 await until(()=>window.getBounds().height>=300);
 assert.ok(await evaluate("document.querySelector('#feed>.empty').getBoundingClientRect().height>=180"));
 await capture('empty-filter-preview.png');
 await evaluate("document.querySelector('#feed>.empty button').click()");await until(()=>evaluate("document.querySelectorAll('.repo-row').length===3"));
 await capture('catalog-recovery-preview.png');
 console.log('11.2 recovery checks passed: fully seen new-day catalog refills automatically, 50K hard floor, no phantom visits, readable filter-empty recovery and reset to three cards.');

 // Real measured geometry across narrow widths, large fonts and command visibility.
 await evaluate("window.pulse.settings({autoHide:false,dynamicRefresh:false,motion:'none',hoverLift:false})");
 for(const width of [440,600,960])for(const scale of [100,150])for(const commands of [false,true]){
  await evaluate("window.pulse.settings({textScale:"+scale+",showCommands:"+commands+",visibleRows:1})");
  window.setBounds({width});await new Promise(r=>setTimeout(r,200));await evaluate("document.getElementById('feed').scrollTop=0");
  const geometry=await evaluate(`(()=>{const row=document.querySelector('.repo-row'),feed=document.getElementById('feed'),r=row.getBoundingClientRect(),f=feed.getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth,rowOverflow:row.scrollWidth>row.clientWidth+1,visible:r.bottom<=f.bottom+1,height:r.height,feedHeight:f.height};})()`);
  assert.equal(geometry.overflow,false,JSON.stringify({width,scale,commands,geometry}));
  assert.equal(geometry.rowOverflow,false,JSON.stringify({width,scale,commands,geometry}));
  // Very tall cards intentionally scroll on short displays.
  assert.ok(geometry.visible||geometry.height>window.getBounds().height-160,JSON.stringify({width,scale,commands,geometry}));
 }
 await evaluate("window.pulse.settings({panelWidth:960,textScale:100,visibleRows:2,showCommands:true,motion:'full',hoverLift:true})");
 await new Promise(r=>setTimeout(r,300));
 await capture('geometry-preview.png');
 console.log('11.3 measured geometry passed: 440/600/960 widths, 100/150 percent text, commands on/off, no horizontal card overflow and visible first-card actions.');

 // Saving a draft must not discard keystrokes that arrive while IPC is pending.
 await evaluate("window.pulse.settings({autoHide:false,dynamicRefresh:false,motion:'none'})");
 const draftRace=await evaluate(`(async()=>{
  await openDrawer('details');const real=api.workspacePatch;let finish;
  api.workspacePatch=(...args)=>new Promise(resolve=>{finish=async()=>resolve(await real(...args));});
  try{
   const id=selected().id,notes=document.querySelector('.personal-notes');
   notes.value='Before pending save';notes.dispatchEvent(new Event('input',{bubbles:true}));
   [...document.querySelectorAll('#drawerContent button')].find(b=>b.textContent==='Save notes and tags').click();
   notes.value='Newer unsaved edit';notes.dispatchEvent(new Event('input',{bubbles:true}));
   await finish();await new Promise(r=>setTimeout(r,100));
   return {draft:uDrafts.get(id)?.notes,persisted:state.workspace.records[id].notes};
  }finally{api.workspacePatch=real;}
 })()`);
 assert.equal(draftRace.persisted,'Before pending save');assert.equal(draftRace.draft,'Newer unsaved edit');
 await evaluate("uDrafts.clear();closeDrawer()");
 await evaluate("window.pulse.settings({showOwners:false,opacity:85})");await new Promise(r=>setTimeout(r,150));
 assert.equal(await evaluate("document.querySelector('.repo-name').textContent.includes('/')"),false);
 assert.equal(await evaluate("document.querySelector('.owner-avatar').hidden"),true);
 await evaluate("window.pulse.settings({showOwners:true,opacity:100})");
 console.log('11.4 native regressions passed: pending-save draft preservation and working owner/opacity preferences.');

 const emerging=require('../src/catalog-seed.json').repos.find(r=>r.stargazers_count>=50000&&r.stargazers_count<70000);
 assert.ok(emerging);store.state.cache.push(emerging);store.state.daily.repos[0]=emerging;
 await evaluate("window.pulse.settings({minStars:50000,languages:[],autoHide:false,dynamicRefresh:false})");
 await until(()=>evaluate("Array.from(document.querySelectorAll('.repo-row')).some(r=>r.dataset.repoId==="+JSON.stringify(String(emerging.id))+")"));
 assert.ok(store.state.daily.repos.some(r=>r.id===emerging.id));
 assert.ok((await evaluate("document.getElementById('libraryStat').textContent")).includes('50K+'));
 await capture('50k-catalog-preview.png');
 console.log('11.5 native passed: verified 50K–70K repository renders through real state IPC and visible policy label.');

 // Reproduce the reported defect: a pending sync and stale keyboard focus must not pin the feed.
 await evaluate("window.pulse.settings({autoHide:true,collapseOnLeave:true,hideDelay:80,hoverDelay:0,keepOnFocus:true,motion:'full',windowMotionDuration:160})");
 await moveScreen(0,100);await until(()=>window.getBounds().height<=16);
 const activation=window.getBounds(),center=activation.x+activation.width/2;
 await moveScreen(center+activation.width,activation.y+4);await new Promise(r=>setTimeout(r,150));
 assert.ok(window.getBounds().height<=16,'Neighboring browser tabs must not reveal the island');
 await moveScreen(center,activation.y+4);await until(()=>evaluate("!document.getElementById('expanded').hidden"));
 await evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Control'}));window.actualRefresh=api.refresh;api.refresh=()=>new Promise(resolve=>window.finishPendingRefresh=resolve);document.getElementById('refresh').click()");
 await until(()=>evaluate("busy===true"));
 await moveScreen(0,100);await until(()=>window.getBounds().height<=16);
 assert.equal(await evaluate("islandController.status().held"),false,'Background sync cannot hold hiding');
 await evaluate("api.refresh=window.actualRefresh;window.finishPendingRefresh({state,error:null})");
 await until(()=>evaluate("busy===false"));
 assert.ok(window.getBounds().height<=16);
 await moveScreen(center,activation.y+4);await until(()=>evaluate("!document.getElementById('expanded').hidden"));
 await new Promise(r=>setTimeout(r,200));assert.equal(await evaluate("document.body.classList.contains('collapsed')"),false);
 await moveScreen(0,100);await until(()=>window.getBounds().height<=16);
 console.log('11.6 native regression passed: background sync and stale keyboard focus cannot prevent hiding; only top-center entry reveals; physical leave hides again.');
 assert.deepEqual(errors,[]);console.log('Native UI passed: readable fonts, stable row DOM, direct Learn URL, verified Releases URL, independent replacement, undo, native screenshots, settings, 150% text, three rows, rapid toggle and collection.');app.exit(0);
}
module.exports={smoke};

