'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
async function smoke({app,window,store,resize,TOPICS,snapshot}){
 const root=path.join(__dirname,'../dist');fs.mkdirSync(root,{recursive:true});const errors=[];
 window.webContents.on('console-message',(event,...legacy)=>{const level=event.level??legacy[0],message=event.message??legacy[1];if(level==='error'||typeof level==='number'&&level>=3){errors.push(message);console.error('RENDERER_ERROR:',message);}});
 await new Promise(resolve=>window.webContents.isLoading()?window.webContents.once('did-finish-load',resolve):resolve());
 const evaluate=async script=>{try{return await window.webContents.executeJavaScript(script);}catch(error){console.error('FAILED_NATIVE_SCRIPT:',script,'Renderer errors:',JSON.stringify(errors));throw error;}};
 async function until(check,attempts=50){for(let i=0;i<attempts;i++){if(await check())return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Native UI did not reach the expected state: '+JSON.stringify(await evaluate(`({rows:[...document.querySelectorAll('.repo-row')].map(r=>r.dataset.repoId),selected:document.getElementById('selectedLabel').textContent,toast:document.getElementById('toast').textContent,expanded:!document.getElementById('expanded').hidden,drawer:!document.getElementById('drawer').hidden,live:document.getElementById('liveToggle')?.textContent,pointerTrace:window.pointerTrace?.slice(-8)})`)));}
 await evaluate("window.pointerTrace=[];for(const type of ['pointerenter','pointerleave'])document.addEventListener(type,e=>{if(e.target===document.documentElement){window.pointerTrace.push({type,x:e.clientX,y:e.clientY});if(window.pointerTrace.length>50)window.pointerTrace.shift();}},true)");
 async function movePointer(x,y){window.webContents.sendInputEvent({type:'mouseMove',x:Math.round(x),y:Math.round(y)});await new Promise(r=>setTimeout(r,40));}
 async function moveScreen(x,y){const b=window.getBounds();await movePointer(x-b.x,y-b.y);}
 await until(()=>evaluate(`!!document.querySelector('.repo-row')`));
 await new Promise(r=>setTimeout(r,500));let dimensions=await evaluate(`({rows:document.querySelectorAll('.repo-row').length,width:innerWidth,height:innerHeight,footer:document.querySelector('footer').getBoundingClientRect().bottom})`);
 assert.equal(dimensions.rows,2);assert.ok(dimensions.width>=900&&dimensions.width<=960);assert.ok(dimensions.height<500,JSON.stringify(dimensions));assert.ok(dimensions.footer<=dimensions.height+1,JSON.stringify(dimensions));

 async function capture(name){
  window.show();window.focus();window.webContents.focus();let png=null;
  for(let attempt=0;attempt<12;attempt++){
   await new Promise(resolve=>setTimeout(resolve,400));const bounds=window.getBounds();
   const image=await window.webContents.capturePage({x:0,y:0,width:bounds.width,height:bounds.height},{stayHidden:false,stayAwake:true});
   if(!image.isEmpty()){const bytes=image.toPNG();if(bytes.length>5000){png=bytes;break;}}
  }
  assert.ok(png,'The compositor must produce a visible native preview within five seconds.');fs.writeFileSync(path.join(root,name),png);
  if(name==='desktop-preview.png'){const encoded=png.toString('base64');for(let n=0;n<encoded.length;n+=4096)console.log('REPOPULSE_PREVIEW:'+encoded.slice(n,n+4096));}
 }

 await capture('desktop-preview.png');
 const first=store.state.daily.repos[0],second=store.state.daily.repos[1];
 await evaluate(`window.originalRow=document.querySelector('.repo-row');document.querySelector('.row-extra button').focus();document.querySelector('.row-extra button').click()`);await until(()=>store.state.saved.length===1);await new Promise(r=>setTimeout(r,100));
 assert.equal(await evaluate(`window.originalRow===document.querySelector('.repo-row')`),true,'Saving must retain the row DOM');
 const fonts=await evaluate(`({description:parseFloat(getComputedStyle(document.querySelector('.repo-description')).fontSize),code:parseFloat(getComputedStyle(document.querySelector('pre')).fontSize),overflow:document.documentElement.scrollWidth>innerWidth})`);
 assert.ok(fonts.description>=14);assert.ok(fonts.code>=13);assert.equal(fonts.overflow,false);
 await evaluate(`document.getElementById('learn').click()`);await until(()=>store.state.history.length===1);
 assert.equal(snapshot().lastExternal.url,'https://github.com/'+first.full_name);assert.equal(snapshot().lastExternal.kind,'learn');assert.notEqual(store.state.daily.repos[0].id,first.id);assert.equal(store.state.daily.repos[1].id,second.id);
 await until(()=>evaluate(`!document.getElementById('undo').disabled`));await evaluate(`document.getElementById('undo').click()`);await until(()=>store.state.daily.repos[0].id===first.id);
 await until(()=>evaluate(`document.querySelector('.repo-row').dataset.repoId==='${first.id}'&&document.getElementById('selectedLabel').textContent==='${first.full_name}'&&!document.getElementById('install').disabled`));await evaluate(`document.getElementById('install').click()`);await until(()=>snapshot().lastExternal?.kind==='releases');assert.equal(snapshot().lastExternal.url,'https://github.com/'+first.full_name+'/releases');
 await until(()=>evaluate(`!document.getElementById('undo').disabled`));await evaluate(`document.getElementById('undo').click()`);await until(()=>store.state.daily.repos[0].id===first.id);
 await until(()=>evaluate(`document.querySelector('.repo-row').dataset.repoId==='${first.id}'`));
 await evaluate(`document.querySelector('.row-extra button:last-child').click()`);await until(()=>evaluate(`!document.getElementById('drawer').hidden`));await capture('workspace-preview.png');
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
 const dock=await evaluate(`(()=>{const b=document.getElementById('dockOpen'),r=b.getBoundingClientRect(),t=document.querySelector('.toolbar').getBoundingClientRect();return{id:Number(b.dataset.repoId),summary:document.getElementById('dockSummary').textContent,clickable:getComputedStyle(b).pointerEvents,overlap:r.right>t.left+1,x:r.x+r.width/2,y:r.y+r.height/2};})()`);
 assert.ok(dock.id>0&&dock.summary.length>0);assert.equal(dock.clickable,'auto');assert.equal(dock.overlap,false);
 await movePointer(dock.x,dock.y);
 await new Promise(r=>setTimeout(r,120));assert.equal(await evaluate("document.body.classList.contains('collapsed')"),true,'Hover over the compact link must keep its click target stable');
 const compactBefore=store.state.history.length,compactRepo=store.state.daily.repos.find(r=>r.id===dock.id);
 await evaluate("document.getElementById('dockOpen').click()");
 await until(()=>store.state.history.length===compactBefore+1);
 assert.equal(snapshot().lastExternal.url,'https://github.com/'+compactRepo.full_name);
 assert.equal(await evaluate("document.body.classList.contains('collapsed')"),true,'Compact link must not also expand the panel');
 await evaluate("document.getElementById('dockOpen').dispatchEvent(new MouseEvent('click',{bubbles:true,detail:2}))");
 await new Promise(r=>setTimeout(r,100));assert.equal(store.state.history.length,compactBefore+1,'Double clicks must not open a second replacement');
 await evaluate("document.querySelector('.topbar').dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}))");
 await until(()=>evaluate("!document.getElementById('expanded').hidden"));
 await evaluate("document.getElementById('collapse').click()");
 await until(()=>evaluate("document.getElementById('expanded').hidden"));
 console.log('Compact action checks passed: short explanation, non-overlapping hit area, stable hover, direct GitHub click, no duplicate open and blank-header expansion.');

 await movePointer(-20,-20);
 await movePointer(30,30);
 await until(()=>evaluate("!document.getElementById('expanded').hidden"));
 await new Promise(r=>setTimeout(r,500));
 const growth=await evaluate("getComputedStyle(document.getElementById('island')).transform");
 assert.ok(growth.includes('1.02'), 'Hover should grow the island: '+growth);
 await capture('hover-preview.png');
 // Use actual Chromium mouse input at a fixed screen coordinate near a clamped edge.
 await evaluate("window.pulse.settings({autoHide:false,keepOnFocus:false})");
 await evaluate("document.getElementById('collapse').click()");
 await until(()=>evaluate("document.getElementById('expanded').hidden"));
 await new Promise(r=>setTimeout(r,160));
 const work=require('electron').screen.getDisplayMatching(window.getBounds()).workArea;
 window.setBounds({x:work.x+12,y:work.y+work.height-window.getBounds().height});
 await new Promise(r=>setTimeout(r,450));
 const dockAnchor=window.getBounds(),point={x:dockAnchor.x+30,y:dockAnchor.y+30};
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

 assert.deepEqual(errors,[]);console.log('Native UI passed: readable fonts, stable row DOM, direct Learn URL, verified Releases URL, independent replacement, undo, native screenshots, settings, 150% text, three rows, rapid toggle and collection.');app.exit(0);
}
module.exports={smoke};

