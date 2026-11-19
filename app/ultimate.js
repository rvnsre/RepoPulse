'use strict';
let uKeyboardFocus=false,uMotionSignature='',compactProtectedEntry=false,pointerBounds=null;
let islandController=null,hoverAnimation=null,uFocusUntil=0,uFocusTimer=null,uQueryVersion=0,uLimit=60,uLastTab='details';
let uResetRevision=0;
const uDrafts=new Map(),uCompare=new Set(),uSelected=new Set();
function resetWorkspaceView(){
 uResetRevision++;uDrafts.clear();uCompare.clear();uSelected.clear();uResults=[];uQueryVersion++;uLimit=60;
 Object.assign(uFilters,{query:'',scope:'all',sort:'stars',language:'',topic:'',license:'',collection:'',pinnedFirst:true});
 clearInterval(uFocusTimer);uFocusUntil=0;islandController?.hold('focus session',false);islandController?.pause(0);drawerStamp='';draft={};
}

const uFilters={query:'',scope:'all',sort:'stars',language:'',topic:'',license:'',collection:'',pinnedFirst:true};
let uResults=[];
function ultimateMeta(repo){return state.workspace?.records?.[repo.id]||{notes:'',tags:[],rating:0,pinned:false,queued:false,read:false,priority:'normal'};}
function ultimateRepo(id){return state.catalog.find(r=>r.id===Number(id));}
async function ultimatePatch(repo,changes){const next=await api.workspacePatch(repo.id,changes);if(next)adopt(next);render();}
function ultimateBadges(repo){if(!state.settings.showBadges)return null;const m=ultimateMeta(repo),box=el('div',{class:'repo-badges'});
 for(const [flag,label]of [[m.pinned,'Pinned'],[m.queued,'Queued'],[m.read,'Read'],[m.notes,'Notes'],[m.rating,m.rating+'/5']])if(flag)box.append(el('span',{class:'mini-badge'},label));return box.childElementCount?box:null;}
function ultimateStatus(){
 if(!state)return;const status=islandController?.status(),remaining=Math.max(0,Math.ceil((uFocusUntil-Date.now())/1000)),f=$('focusButton');
 f.textContent=remaining?Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0'):'';if(!remaining)f.innerHTML=iconSVG('clock');f.title=remaining?'Stop focus session':'Start '+state.settings.focusMinutes+' minute focus session';f.setAttribute('aria-label',f.title);f.setAttribute('aria-pressed',String(remaining>0));
 $('autoHideButton').setAttribute('aria-checked',String(state.settings.autoHide));$('autoHideButton').title='Toggle automatic collapse';
 $('queueCount').textContent=String(state.feed?.queueIds.length||0);if($('editionLabel'))$('editionLabel').textContent=new Date().toLocaleDateString('en',{weekday:'long',month:'short',day:'numeric'});if($('libraryStat'))$('libraryStat').textContent=(state.feed?.matchingCount??state.catalogSize)+' projects · '+compact(state.settings.minStars)+'+';$('queueButton').hidden=!state.settings.showQueueCount;
 document.body.classList.toggle('workspace-open',expanded&&drawer);$('dockHint').hidden=expanded;const dock=UI.dockModel(repos(),selectedId),open=$('dockOpen');if($('dockText').textContent!==dock.title)$('dockText').textContent=dock.title;if($('dockSummary').textContent!==dock.summary)$('dockSummary').textContent=dock.summary;open.disabled=!dock.repo||pending.has(dock.repo.id);open.dataset.repoId=dock.repo?.id||'';open.title=dock.repo?dock.title+'\n'+dock.repo.description:'Open the panel to find a repository';open.setAttribute('aria-label',dock.repo?'Open '+dock.title+' on GitHub':'No repository available');document.body.classList.toggle('focus-session',remaining>0);
 $('island').setAttribute('aria-label',expanded?'RepoPulse discovery panel':'RepoPulse hidden. Move to the top-center screen edge or activate the reveal handle.');
}
function ultimateRender(){
 if(islandController&&!islandController.pointer&&!drawer&&(islandController.focused||uKeyboardFocus)){uKeyboardFocus=false;islandController.focus(false);}
 const p=state.settings;document.body.classList.toggle('workspace-open',expanded&&drawer);document.body.classList.toggle('offline',!!state.lastError);document.body.dataset.accent=p.accent;document.body.dataset.card=p.cardStyle;document.body.dataset.roundness=String(p.roundness);document.body.classList.toggle('no-glow',!p.glow);document.body.classList.toggle('hide-hints',!p.showHints);$('status').hidden=!p.showStatus;
 islandController?.configure(p,insightOpen?'insight':expanded?(drawer?'workspace':'panel'):'collapsed');const signature=JSON.stringify([p.hoverLift,p.hoverScale,p.motionPreset,p.motion,p.reducedMotion,p.motionDuration]);if(signature!==uMotionSignature){uMotionSignature=signature;if(hoverAnimation||islandController?.pointer)ultimateMagnify(!!islandController?.pointer);}ultimateStatus();
}
function ultimateMagnify(active){
 document.body.classList.toggle('pointer-near',active);if(morphing)return;const current=getComputedStyle($('island')).transform;hoverAnimation?.cancel();
 if(state.windowPolicy?.padding===0||morphing||insightOpen||!state?.settings.hoverLift||!canAnimate())return;
 const c=IslandMotion.config(state.settings),node=$('island'),scale=IslandMorph.safeScale(c.scale,node.offsetWidth,node.offsetHeight,state.windowPolicy?.padding??8);hoverAnimation=$('island').animate([{transform:current==='none'?'scale(1)':current},{transform:'scale('+(active?scale:1)+')'}],{duration:active?100:80,easing:c.easing,fill:'forwards'});
}
function ultimateFocus(){
 if(uFocusUntil>Date.now()){uFocusUntil=0;islandController.hold('focus session',false);clearInterval(uFocusTimer);ultimateStatus();toast('Focus session ended.');return;}
 uFocusUntil=Date.now()+state.settings.focusMinutes*60000;islandController.hold('focus session',true);toast('Focus session started. Automatic hiding is paused.');
 clearInterval(uFocusTimer);uFocusTimer=setInterval(()=>{if(Date.now()>=uFocusUntil){clearInterval(uFocusTimer);uFocusUntil=0;islandController.hold('focus session',false);$('announcer').textContent='Focus session complete.';toast('Focus session complete.');}ultimateStatus();},1000);ultimateStatus();
}
function leaveSurface(){
 compactProtectedEntry=false;uKeyboardFocus=false;islandController.focus(false);islandController.leave();
}
function ultimateInit(){
 uFilters.pinnedFirst=state.settings.pinnedFirst;installIcons();dynamicInit();
 islandController=new IslandMotion.Controller({onExpand:()=>run(async()=>{expanded=true;await windowMode();}),onCollapse:()=>run(async()=>{expanded=false;drawer=false;await windowMode();}),onChange:ultimateStatus});
 islandController.configure(state.settings,expanded?'panel':'collapsed');
 // Native pointer samples are independent of animated DOM hit boundaries.
 pointerBounds=state.windowBounds||null;
 if(state.windowPolicy?.pointer!==false&&api.onPointer&&api.pointerState){
  const acceptPointer=value=>{if(!value)return;const before=islandController.pointer;if(value.inside){const x=value.point.x-value.bounds.x,y=value.point.y-value.bounds.y,target=document.elementFromPoint(x,y),protectedTarget=!expanded&&!!target?.closest('#dockOpen,.toolbar');const force=value.moved&&compactProtectedEntry&&!protectedTarget;compactProtectedEntry=protectedTarget;islandController.enter(value.entered&&value.moved&&!protectedTarget,force);if(value.moved)islandController.activity();}else if(before||islandController.focused||uKeyboardFocus){leaveSurface();}if(before!==value.inside)ultimateMagnify(value.inside);};
  const stopPointer=api.onPointer(acceptPointer);run(async()=>acceptPointer(await api.pointerState()));window.addEventListener('beforeunload',stopPointer);
 }else{
  // Browser fixture has no native window; its viewport never resizes for island modes.
  const surface=document.documentElement;
  surface.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){const target=document.elementFromPoint(e.clientX,e.clientY);compactProtectedEntry=!expanded&&!!target?.closest('#dockOpen,.toolbar');islandController.enter(!compactProtectedEntry);ultimateMagnify(true);}});
  surface.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch'){leaveSurface();ultimateMagnify(false);}});
  surface.addEventListener('pointermove',e=>{if(compactProtectedEntry&&!expanded&&!e.target.closest('#dockOpen,.toolbar')){compactProtectedEntry=false;islandController.enter(true,true);}});
 }
 $('island').addEventListener('pointerdown',()=>{uKeyboardFocus=false;islandController.focus(false);islandController.activity();});$('island').addEventListener('wheel',()=>islandController.activity(),{passive:true});
 document.addEventListener('keydown',()=>{uKeyboardFocus=true;islandController.focus(true);islandController.activity();});
 document.addEventListener('focusin',e=>{islandController.focus(uKeyboardFocus||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName));islandController.hold('editing',state.settings.protectEditing&&['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName));});
 document.addEventListener('focusout',()=>queueMicrotask(()=>{const active=document.activeElement;islandController.focus($('island').contains(active)&&(uKeyboardFocus||['INPUT','TEXTAREA','SELECT'].includes(active?.tagName)));islandController.hold('editing',state.settings.protectEditing&&['INPUT','TEXTAREA','SELECT'].includes(active?.tagName));}));
 window.addEventListener('blur',()=>{uKeyboardFocus=false;islandController.focus(false);islandController.hold('editing',false);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)hoverAnimation?.cancel();});
 matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{if(state.settings.motion!=='full'||state.settings.reducedMotion){hoverAnimation?.cancel();document.body.classList.remove('pointer-near');}});
 $('edgeReveal').addEventListener('click',()=>run(async()=>{if(!islandController.pointer)islandController.pause(1200);insightOpen=false;expanded=true;drawer=false;await windowMode();}));
 $('commandButton').addEventListener('click',()=>run(()=>openDrawer('commands')));$('focusButton').addEventListener('click',()=>run(ultimateFocus));
 $('autoHideButton').addEventListener('click',()=>run(()=>{const enabled=!state.settings.autoHide;if(enabled)islandController.pause(0);return changeSettings({autoHide:enabled,...(enabled?{collapseOnLeave:true,hoverExpand:true}:{})});}));$('historyButton').addEventListener('click',()=>run(()=>openDrawer('history')));
 $('queueButton').addEventListener('click',()=>run(async()=>{await openDrawer('library');}));
 window.addEventListener('beforeunload',()=>{islandController.destroy();clearInterval(uFocusTimer);clearTimeout(releaseTimer);clearTimeout(toastTimer);hoverAnimation?.cancel();});
}
function ultimateSelect(label,values,value,onChange){const select=el('select',{'aria-label':label});for(const [v,text]of values)select.append(el('option',{value:v},text));select.value=String(value??'');select.addEventListener('change',()=>run(()=>onChange(select.value)));return select;}
function ultimateToggleCompare(repo){if(uCompare.has(repo.id))uCompare.delete(repo.id);else{if(uCompare.size>=3){toast('Compare up to three repositories. Remove one first.');return;}uCompare.add(repo.id);}drawerStamp='';if(drawer)renderDrawer();toast(uCompare.size+' repositories selected for comparison.');}
function ultimateDetails(root,repo){
 const meta=ultimateMeta(repo),draft=uDrafts.get(repo.id)||{notes:meta.notes,tags:meta.tags.join(', ')};
 root.append(el('h3',{class:'subheading'},'Personal workspace'));
 const tools=el('div',{class:'stack'});tools.append(btn(meta.queued?'Remove from queue':'Read later',()=>ultimatePatch(repo,{queued:!meta.queued}),'secondary','Toggle queue for '+repo.full_name),btn(meta.pinned?'Unpin':'Pin',()=>ultimatePatch(repo,{pinned:!meta.pinned}),'secondary','Toggle pin for '+repo.full_name),btn(meta.read?'Mark unread':'Mark read',()=>ultimatePatch(repo,{read:!meta.read}),'secondary','Toggle read state for '+repo.full_name),btn(uCompare.has(repo.id)?'Remove comparison':'Compare',()=>ultimateToggleCompare(repo),'secondary'));
 const ratings=ultimateSelect('Personal rating',[[0,'No rating'],[1,'1 / 5'],[2,'2 / 5'],[3,'3 / 5'],[4,'4 / 5'],[5,'5 / 5']],meta.rating,value=>ultimatePatch(repo,{rating:Number(value)}));
 const priority=ultimateSelect('Reading priority',[['low','Low priority'],['normal','Normal priority'],['high','High priority']],meta.priority,value=>ultimatePatch(repo,{priority:value}));tools.append(ratings,priority);root.append(tools);
 const notes=el('textarea',{class:'personal-notes',maxlength:'20000','aria-label':'Private repository notes',placeholder:'Your notes stay on this device.'});notes.value=draft.notes;
 const count=el('span',{class:'field-hint'},draft.notes.length+' / 20000 characters');
 notes.addEventListener('input',()=>{draft.notes=notes.value;uDrafts.set(repo.id,draft);count.textContent=notes.value.length+' / 20000 characters / unsaved';islandController.activity();});
 const labels=el('input',{class:'search',maxlength:'400','aria-label':'Personal repository tags',placeholder:'Personal tags, separated by commas'});labels.value=draft.tags;labels.addEventListener('input',()=>{draft.tags=labels.value;uDrafts.set(repo.id,draft);});
 const noteActions=el('div',{class:'stack'});noteActions.append(btn('Save notes and tags',async()=>{const generation=uResetRevision,saved={notes:draft.notes,tags:draft.tags};await ultimatePatch(repo,{notes:saved.notes,tags:saved.tags.split(',')});if(generation!==uResetRevision)return;if(draft.notes===saved.notes&&draft.tags===saved.tags){uDrafts.delete(repo.id);toast('Notes and tags saved locally.');}else{uDrafts.set(repo.id,draft);toast('Saved. Newer edits are still unsaved.');}drawerStamp='';renderDrawer();},'primary'),btn('Discard unsaved edits',()=>{uDrafts.delete(repo.id);drawerStamp='';renderDrawer();},'secondary'));
 root.append(notes,count,labels,noteActions);
 const collections=state.workspace.collections;
 if(collections.length){let collectionId=collections[0].id;const picker=ultimateSelect('Add repository to collection',collections.map(c=>[c.id,c.name]),collectionId,v=>{collectionId=v;});const membership=el('div',{class:'stack'});membership.append(picker,btn('Add to collection',async()=>{const next=await api.workspaceCollection('add',{id:collectionId,repos:[repo.id]});if(next)adopt(next);render();},'secondary'));for(const c of collections.filter(c=>c.repos.includes(repo.id)))membership.append(btn('Remove from '+c.name,async()=>{const next=await api.workspaceCollection('remove',{id:c.id,repos:[repo.id]});if(next)adopt(next);render();},'secondary'));root.append(membership);}
 const links=el('div',{class:'stack repo-links'});
 for(const [kind,label]of [['issues','Issues'],['pulls','Pull requests'],['discussions','Discussions'],['wiki','Wiki'],['actions','Actions'],['contributors','Contributors'],['license','License'],['commits','Commits'],['tags','Tags'],['forks','Forks'],['stargazers','Stargazers']])links.append(btn(label,()=>openRepo(repo,kind),'secondary','Open '+label+' for '+repo.full_name));
 root.append(el('h3',{class:'subheading'},'Explore on GitHub'),links);
 let copyKind='name';const copies=el('div',{class:'stack'});copies.append(ultimateSelect('Copy format',[['name','Full repository name'],['owner','Owner'],['shallow','Shallow clone command'],['ssh','SSH clone command'],['cli','GitHub CLI clone'],['json','Repository JSON'],['stars','Exact star count']],copyKind,v=>{copyKind=v;}),btn('Copy selected format',()=>copy(repo,copyKind),'secondary'));root.append(el('h3',{class:'subheading'},'Copy and share'),copies);
}
function ultimateLibrary(root){
 heading(root,'Project library',[btn('Collections',()=>openDrawer('collections'),'secondary'),btn('Export workspace',()=>api.exportData('workspace'),'secondary'),btn('Export CSV',()=>api.exportData('workspacecsv'),'secondary')]);
 root.append(el('p',{class:'intro'},'Search the cached public catalog and your personal notes. Operators: owner:name, lang:rust, tag:ai, is:queued, is:pinned, is:read, and -excludedword.'));
 const controls=el('div',{class:'library-filters'});
 const input=el('input',{class:'search',type:'search','aria-label':'Search project library',placeholder:'Search projects, notes, tags...'});input.value=uFilters.query;
 const list=el('div',{class:'library-list'}),count=el('div',{class:'result-count','aria-live':'polite'});
 const repaint=async()=>{const serial=++uQueryVersion;const results=await api.libraryQuery(uFilters);if(serial!==uQueryVersion||!list.isConnected)return;uResults=results;const ids=new Set(results.map(r=>r.id));for(const id of uSelected)if(!ids.has(id))uSelected.delete(id);draw(results);};
 input.addEventListener('input',()=>{uFilters.query=input.value;uLimit=60;run(repaint);});
 controls.append(input,ultimateSelect('Library view',[['all','All projects'],['saved','Saved'],['queued','Read later'],['pinned','Pinned'],['noted','With notes'],['rated','Rated'],['read','Read'],['unread','Unread'],['visited','Previously opened']],uFilters.scope,v=>{uFilters.scope=v;uLimit=60;return repaint();}),ultimateSelect('Library sort',[['stars','Most stars'],['name','Name A-Z'],['updated','Recently pushed'],['rating','Personal rating'],['priority','Reading priority']],uFilters.sort,v=>{uFilters.sort=v;return repaint();}));
 const catalog=state.catalog,language=[...new Set(catalog.map(r=>r.language).filter(Boolean))].sort(),topics=[...new Set(catalog.flatMap(r=>r.topics||[]))].sort(),licenses=[...new Set(catalog.map(r=>r.license).filter(Boolean))].sort();
 for(const [key,label,values]of [['language','Language',language],['topic','GitHub topic',topics],['license','License',licenses]])controls.append(ultimateSelect('Filter '+label,[['','All '+label.toLowerCase()+'s'],...values.map(v=>[v,v])],uFilters[key],v=>{uFilters[key]=v;uLimit=60;return repaint();}));
 controls.append(ultimateSelect('Filter personal collection',[['','All collections'],...state.workspace.collections.map(c=>[c.id,c.name])],uFilters.collection,v=>{uFilters.collection=v;return repaint();}),btn('Reset search and filters',()=>{Object.assign(uFilters,{query:'',scope:'all',sort:'stars',language:'',topic:'',license:'',collection:''});uSelected.clear();uLimit=60;renderDrawer();},'secondary'));
 const pinLabel=el('label',{class:'inline-check'}),pin=el('input',{type:'checkbox','aria-label':'Pinned projects first'});pin.checked=uFilters.pinnedFirst;pin.addEventListener('change',()=>{uFilters.pinnedFirst=pin.checked;run(repaint);});pinLabel.append(pin,el('span',{},'Pinned first'));controls.append(pinLabel);root.append(controls,count);
 const bulk=el('div',{class:'stack bulk-actions'}),selection=el('span',{class:'selection-count'},'0 selected');bulk.append(selection,btn('Select visible',()=>{uResults.slice(0,uLimit).forEach(r=>uSelected.add(r.id));draw(uResults);},'secondary'),btn('Clear selection',()=>{uSelected.clear();draw(uResults);},'secondary'));
 let action='save';bulk.append(ultimateSelect('Bulk action',[['save','Save'],['unsave','Unsave'],['read','Mark read'],['unread','Mark unread'],['queue','Add to queue'],['unqueue','Remove from queue'],['pin','Pin'],['unpin','Unpin']],action,v=>{action=v;}),btn('Apply to selected',async()=>{if(!uSelected.size){toast('Select one or more repositories.');return;}const next=await api.workspaceBulk([...uSelected],action);if(next)adopt(next);uSelected.clear();render();toast('Selected repositories updated.');},'primary'));
 if(state.workspace.collections.length){let chosen=state.workspace.collections[0].id;bulk.append(ultimateSelect('Bulk collection',state.workspace.collections.map(c=>[c.id,c.name]),chosen,v=>{chosen=v;}),btn('Add selected to collection',async()=>{if(!uSelected.size)return toast('Select repositories first.');const next=await api.workspaceCollection('add',{id:chosen,repos:[...uSelected]});if(next)adopt(next);render();},'secondary'));}
 root.append(bulk,list);
 function draw(results){list.replaceChildren();selection.textContent=uSelected.size+' selected';count.textContent=results.length+' matches / '+state.catalog.length+' cached projects';
  for(const repo of results.slice(0,uLimit)){const m=ultimateMeta(repo),item=el('article',{class:'library-row'}),check=el('input',{type:'checkbox','aria-label':'Select '+repo.full_name});check.checked=uSelected.has(repo.id);check.addEventListener('change',()=>{if(check.checked)uSelected.add(repo.id);else uSelected.delete(repo.id);selection.textContent=uSelected.size+' selected';});
   const info=el('div',{class:'library-info'});info.append(btn(repo.full_name,()=>{choose(repo.id);return openDrawer('details');},'list-name','Details '+repo.full_name),el('p',{class:'list-desc'},compact(repo.stargazers_count)+' stars / '+(repo.language||'Mixed')+' / '+(repo.license||'License unspecified')),el('p',{class:'list-desc'},repo.description));const badges=ultimateBadges(repo);if(badges)info.append(badges);if(m.tags.length)info.append(el('p',{class:'personal-tags'},m.tags.join(' · ')));
   const actions=el('div',{class:'stack'});actions.append(btn('Open',()=>openRepo(repo,'learn'),'secondary','Open library '+repo.full_name),btn(m.queued?'Unqueue':'Queue',()=>ultimatePatch(repo,{queued:!m.queued}),'secondary','Queue library '+repo.full_name),btn(m.pinned?'Unpin':'Pin',()=>ultimatePatch(repo,{pinned:!m.pinned}),'secondary','Pin library '+repo.full_name),btn(uCompare.has(repo.id)?'Comparing':'Compare',()=>ultimateToggleCompare(repo),'secondary','Compare library '+repo.full_name));
   item.append(check,info,actions);list.append(item);}
  if(!results.length)list.append(empty('No projects match.','Clear a filter or refresh the catalog.'));
  if(results.length>uLimit)list.append(btn('Load 60 more',()=>{uLimit+=60;draw(results);},'secondary'));
 }
 run(repaint);
}
function ultimateCollections(root){
 heading(root,'Personal collections',[btn('Import workspace',async()=>{const next=await api.importData('workspace');if(next){adopt(next);render();}},'secondary'),btn('Export workspace',()=>api.exportData('workspace'),'secondary')]);
 root.append(el('p',{class:'intro'},'Create up to 50 collections. Collection membership, notes and tags stay on this device. Export a workspace backup before transferring to another computer.'));
 const form=el('div',{class:'stack'}),name=el('input',{class:'search',maxlength:'80','aria-label':'New collection name',placeholder:'Collection name'});let color='sand';form.append(name,ultimateSelect('New collection color',[['sand','Blue'],['ocean','Teal'],['violet','Violet'],['mint','Mint'],['rose','Rose']],color,v=>{color=v;}),btn('Create collection',async()=>{if(!name.value.trim())return toast('Enter a collection name.');const next=await api.workspaceCollection('create',{name:name.value,color});if(next)adopt(next);render();},'primary'));root.append(form);
 if(!state.workspace.collections.length)root.append(empty('Organize your discoveries.','Add projects from Overview or use bulk selection in Library.'));
 const grid=el('div',{class:'collection-grid'});
 for(const c of state.workspace.collections){const card=el('article',{class:'collection-card','data-color':c.color}),title=el('input',{maxlength:'80','aria-label':'Rename '+c.name});title.value=c.name;card.append(el('h3',{},c.name),el('p',{class:'intro'},c.repos.length+' projects'),title);
 const actions=el('div',{class:'stack'});actions.append(btn('Browse',()=>{uFilters.collection=c.id;uFilters.scope='all';return openDrawer('library');},'primary','Browse '+c.name),btn('Rename',async()=>{const next=await api.workspaceCollection('rename',{id:c.id,name:title.value});if(next)adopt(next);render();},'secondary','Save name '+c.name),ultimateSelect('Color '+c.name,[['sand','Blue'],['ocean','Teal'],['violet','Violet'],['mint','Mint'],['rose','Rose']],c.color,async value=>{const next=await api.workspaceCollection('color',{id:c.id,color:value});if(next)adopt(next);render();}),btn('Clear',async()=>{const next=await api.workspaceCollection('clear',{id:c.id});if(next)adopt(next);render();},'secondary','Clear collection '+c.name),btn('Delete',async()=>{const next=await api.workspaceCollection('delete',{id:c.id});if(next)adopt(next);render();},'secondary danger','Delete collection '+c.name));card.append(actions);grid.append(card);}root.append(grid);
}
function ultimateCompare(root){
 heading(root,'Compare projects',[btn('Choose in Library',()=>openDrawer('library'),'secondary'),btn('Clear comparison',()=>{uCompare.clear();renderDrawer();},'secondary')]);const repos=[...uCompare].map(ultimateRepo).filter(Boolean);
 if(!repos.length){root.append(empty('Compare up to three projects.','Use Compare in Overview or Library.'));return;}
 const wrapper=el('div',{class:'comparison-scroll'}),table=el('table',{class:'comparison'}),thead=el('thead'),tr=el('tr');tr.append(el('th',{},'Metric'));for(const repo of repos){const th=el('th');th.append(btn(repo.full_name,()=>openRepo(repo,'learn'),'list-name'),btn('Remove',()=>{uCompare.delete(repo.id);renderDrawer();},'secondary','Remove comparison '+repo.full_name));tr.append(th);}thead.append(tr);table.append(thead);const body=el('tbody');
 for(const [name,value]of [['Stars',r=>Intl.NumberFormat('en').format(r.stargazers_count)],['Language',r=>r.language||'Mixed'],['License',r=>r.license||'Not specified'],['Last push',r=>r.pushed_at?new Date(r.pushed_at).toLocaleDateString():'Unknown'],['Topics',r=>(r.topics||[]).join(', ')||'None'],['Your rating',r=>ultimateMeta(r).rating+'/5'],['Read later',r=>ultimateMeta(r).queued?'Queued':'No'],['Your tags',r=>ultimateMeta(r).tags.join(', ')||'None'],['Notes',r=>ultimateMeta(r).notes||'None']]){const row=el('tr');row.append(el('th',{},name));repos.forEach(repo=>row.append(el('td',{},value(repo))));body.append(row);}table.append(body);wrapper.append(table);root.append(wrapper);const shared=(repos[0].topics||[]).filter(t=>repos.every(r=>(r.topics||[]).includes(t)));root.append(el('p',{class:'notice'},'Shared topics: '+(shared.join(', ')||'none in cached metadata')));
}
function ultimateInsights(root){
 heading(root,'Your discovery insights',[btn('Export history',()=>api.exportData('history'),'secondary')]);root.append(el('p',{class:'intro'},'Calculated from local viewing history. No analytics or telemetry is sent to a server. Clearing history also resets these visit statistics.'));
 const a=state.analytics,stats=el('div',{class:'insight-grid'});
 for(const [value,label]of [[a.today,'opens today'],[a.week,'opens in 7 days'],[a.opens,'all recorded opens'],[a.unique,'unique projects'],[a.revisits,'repeat visits'],[a.queued,'queued projects'],[a.read,'marked read'],[a.notes,'projects with notes'],[a.pinned,'pinned projects'],[a.rated,'rated projects'],[a.collections,'collections']]){const card=el('div',{class:'insight-card'});card.append(el('b',{},String(value)),el('span',{},label));stats.append(card);}root.append(stats);
 function chart(title,entries){const card=el('section',{class:'insight-chart'});card.append(el('h3',{},title));if(!entries.length)card.append(el('p',{class:'intro'},'Open projects to build this view.'));const max=Math.max(1,...entries.map(x=>x[1]));for(const [label,value]of entries){const row=el('div',{class:'chart-row'});row.append(el('span',{},label),el('progress',{value:String(value),max:String(max),'aria-label':label+': '+value}),el('b',{},String(value)));card.append(row);}return card;}
 root.append(chart('Last seven days',a.days.map(d=>[d.day,d.count])),chart('Languages',a.languages),chart('Most visited topics',a.topics));
}
function ultimateSettings(root){
 root.append(el('p',{class:'intro'},state.windowPolicy?.positioning==='compositor'?'Native Wayland: placement, stacking and global shortcuts depend on your compositor. XWayland is selected automatically when DISPLAY is available.':'Docked to the active display in device-independent pixels. Summon: Ctrl/Cmd+Shift+P.'));
 root.append(el('h3',{class:'subheading'},'After 8 minutes away'));
 const advice=el('div',{class:'settings-grid'});
 setting(advice,'idleAdvisor','Quiet work recommendations','One compact suggestion after 8 minutes with no keyboard or mouse activity. No focus stealing.');
 setting(advice,'screenContext','Use active-window context (Windows)','Optional local title analysis while active. No screenshots, raw title storage, cookie access or cloud upload. Sensitive titles are omitted. Other systems use your selected topic.');
 setting(advice,'workTopic','Work topic fallback','','select',Object.entries(state.topics).map(([key,t])=>[key,t.label]));
 advice.append(btn('Preview recommendation',async()=>{adopt(await api.previewInsight());render();},'secondary'));root.append(advice,el('p',{class:'intro'},'Context: '+state.contextStatus+'. Automatic suggestions pause while locked, hidden or in a workspace.'));
 root.append(el('h3',{class:'subheading'},'Live discovery / 3–10 seconds'));
 const live=el('div',{class:'settings-grid'});
 for(const [key,title,detail]of [['dynamicRefresh','Autonomous repository rotation','Replace one visible row without opening its page. No visit or preference is recorded.'],['cyclePauseHover','Pause over a repository','Keep the card steady while reading or clicking.'],['cyclePauseFocus','Pause during keyboard navigation','Keep a focused repository stable.'],['cycleCountdown','Show live countdown','A compact remaining-time indicator.'],['cycleAccent','Highlight arriving cards','A subtle outline pulse on replacement.']])setting(live,key,title,detail);
 setting(live,'cycleMin','Minimum interval','','select',Array.from({length:8},(_,i)=>[i+3,(i+3)+' seconds']));
 setting(live,'cycleMax','Maximum interval','','select',Array.from({length:8},(_,i)=>[i+3,(i+3)+' seconds']));
 setting(live,'transitionStyle','Repository transition','','select',[['auto','Automatic subtle mix'],...DynamicFeed.styles.map(([id,label])=>[id,label])]);setting(live,'cycleMotion','Transition speed','','select',[['adaptive','Mixed fast and slow'],['fast','Fast / 140 ms'],['slow','Smooth / 360 ms']]);root.append(live);
 root.append(el('p',{class:'intro'},'Uses unseen, eligible cached projects. Pauses while editing, in a workspace or focus session, when hidden, and during an operation. Unseen projects appear first. When exhausted, the least recently shown eligible projects return automatically. Current cards are never removed just because the unseen pool is exhausted. Next picks can revisit earlier projects sooner. Relevance is balanced with star-tier weights: 200K+ highest, 100K–200K medium, 50K–100K lower.'));
 root.append(el('h3',{class:'subheading'},'Dynamic Island / Ultimate'));
 const grid=el('div',{class:'settings-grid'});
 for(const [key,title,detail]of [['autoHide','Automatic hiding','Collapse to the compact island while inactive.'],['collapseOnLeave','Collapse after pointer leaves','Uses the leave delay below.'],['idleCollapse','Collapse after idle time','Uses the inactivity timer below.'],['keepOnHover','Stay open while hovered','Prevents idle collapse under the pointer.'],['keepOnFocus','Stay open while focused','Protect keyboard navigation.'],['protectEditing','Protect editing controls','Hold open while editing notes and filters.'],['hoverLift','Grow gently on hover','Magnify the island within its safe margin.'],['subtleMotion','Subtle motion distances','Reduce travel while retaining transitions.'],['stagger','Stagger replacement entry','Separate simultaneous row entries slightly.'],['glow','Soft island rim glow','Emphasize the active island.'],['showBadges','Personal project badges','Show pin, queue, notes, rating and read state.'],['showQuickActions','Show row quick actions','Save, Like and Details controls.'],['showStatus','Show synchronization status','Keep or hide top-bar connection details.'],['showQueueCount','Show reading queue count','A quick shortcut to queued projects.'],['pinnedFirst','Pinned projects first by default','Used when opening the project library.'],['markReadOnOpen','Mark read when opened','Opening a repository marks it read locally.'],['quietMode','Quiet notifications','Suppress new-day system notifications.'],['startCollapsed','Start collapsed','Open as the compact island on the next launch.'],['showHints','Show secondary hints','Descriptions under settings and fields.']])setting(grid,key,title,detail);
 setting(grid,'hoverDelay','Hover reveal delay','','select',[[0,'Immediate'],[80,'80 ms'],[160,'160 ms'],[280,'280 ms'],[400,'400 ms']]);
 setting(grid,'hideDelay','Pointer leave delay','','select',[[0,'Immediate'],[80,'80 ms'],[140,'140 ms'],[160,'160 ms'],[600,'0.6 seconds'],[1200,'1.2 seconds'],[1600,'1.6 seconds'],[2400,'2.4 seconds'],[4000,'4 seconds']]);
 setting(grid,'idleSeconds','Inactivity timeout','','select',[[15,'15 seconds'],[30,'30 seconds'],[60,'1 minute'],[120,'2 minutes'],[300,'5 minutes']]);
 setting(grid,'windowMotionDuration','Island morph duration','','select',[[160,'Fast / 160 ms'],[200,'Balanced / 200 ms'],[280,'Smooth / 280 ms'],[360,'Slow / 360 ms']]);
 setting(grid,'hoverScale','Hover growth','','select',[[100,'No growth'],[101,'1%'],[102,'2%'],[103,'3%']]);
 setting(grid,'motionPreset','Motion character','','select',[['fluid','Fluid'],['snappy','Snappy'],['calm','Calm'],['spring','Soft spring']]);
 setting(grid,'focusMinutes','Focus session length','','select',[[5,'5 minutes'],[15,'15 minutes'],[25,'25 minutes'],[45,'45 minutes'],[60,'60 minutes']]);
 setting(grid,'accent','Accent color','','select',[['sand','Blue'],['ocean','Teal'],['violet','Violet'],['mint','Mint'],['rose','Rose']]);
 setting(grid,'cardStyle','Card appearance','','select',[['soft','Soft'],['outlined','Outlined'],['flat','Flat']]);
 setting(grid,'roundness','Corner shape','','select',[[12,'Tight'],[20,'Balanced'],[28,'Rounded']]);root.append(grid);
 const presets=el('div',{class:'stack'});
 for(const [name,prefs]of [['Focus',{visibleRows:1,showCommands:false,autoHide:false,motionPreset:'calm',quietMode:true}],['Research',{visibleRows:3,showCommands:true,showDescriptions:true,autoHide:false,showBadges:true}],['Compact',{visibleRows:2,panelWidth:960,showCommands:true,autoHide:true,density:'compact',hoverExpand:true,collapseOnLeave:true,hideDelay:0,hoverDelay:0,motionDuration:80,motionPreset:'snappy'}],['Balanced',{visibleRows:2,showCommands:true,autoHide:true,hoverExpand:true,motionPreset:'fluid',quietMode:false,density:'comfortable'}]])presets.append(btn(name+' preset',()=>changeSettings(prefs),'secondary'));
 presets.append(btn(uFocusUntil>Date.now()?'Stop focus session':'Start focus session',ultimateFocus,'primary'),btn('Pause hiding / 5 minutes',()=>islandController.pause(300000),'secondary'),btn('Resume hiding',()=>islandController.pause(0),'secondary'));root.append(presets);
 root.append(el('p',{class:'intro'},'Ultimate shortcuts: Ctrl/Cmd+K command palette, Q queue, P pin, D details, F focus session, ? command help. Hover expansion respects the reduced-motion preference.'));
}
function ultimateCommands(root){
 heading(root,'Command palette');const input=el('input',{class:'search',type:'search','aria-label':'Search commands',placeholder:'Type a command...'}),list=el('div',{class:'command-list','aria-label':'Commands'});
 const actions=[['Browse project library',()=>openDrawer('library')],['Open reading queue',()=>{uFilters.scope='queued';return openDrawer('library');}],['Browse pinned projects',()=>{uFilters.scope='pinned';return openDrawer('library');}],['Browse projects with notes',()=>{uFilters.scope='noted';return openDrawer('library');}],['Manage collections',()=>openDrawer('collections')],['Compare projects',()=>openDrawer('compare')],['View discovery insights',()=>openDrawer('insights')],['View saved repositories',()=>openDrawer('saved')],['View history',()=>openDrawer('history')],['Tune interests',()=>openDrawer('tune')],['Open settings',()=>openDrawer('settings')],['Manage exclusions',()=>openDrawer('exclusions')],['Refresh public catalog',()=>refresh(true)],['Undo last replacement',undoLast],['Next repository rows',()=>{$('next').click();}],['Collapse island',async()=>{expanded=false;drawer=false;await windowMode();}],['Toggle focus session',ultimateFocus],['Pause hiding for 5 minutes',()=>islandController.pause(300000)],['Resume automatic hiding',()=>islandController.pause(0)],['Export workspace JSON',()=>api.exportData('workspace')],['Export workspace CSV',()=>api.exportData('workspacecsv')],['Export daily RSS',()=>api.exportRss()],['Import workspace JSON',async()=>{const next=await api.importData('workspace');if(next){adopt(next);render();}}],['Increase text size',()=>changeSettings({textScale:UI.nextScale(state.settings.textScale,1)})],['Decrease text size',()=>changeSettings({textScale:UI.nextScale(state.settings.textScale,-1)})],['Reset text size',()=>changeSettings({textScale:100})],['Toggle source commands',()=>changeSettings({showCommands:!state.settings.showCommands})],['Toggle reduced motion',()=>changeSettings({motion:state.settings.motion==='none'?'system':'none'})]];
 const repo=selected();if(repo)actions.unshift(['Open '+repo.full_name,()=>openRepo(repo,'learn')],['Install release for selected project',()=>openRepo(repo,'releases')],['Show selected project details',()=>openDrawer('details')],['Save selected project',()=>react(repo,'save')],['Queue selected project',()=>ultimatePatch(repo,{queued:!ultimateMeta(repo).queued})],['Pin selected project',()=>ultimatePatch(repo,{pinned:!ultimateMeta(repo).pinned})],['Copy selected project link',()=>copy(repo,'url')]);
 let buttons=[],active=-1;
 function draw(){const terms=input.value.toLowerCase().trim().split(/\s+/).filter(Boolean);list.replaceChildren();buttons=actions.filter(([name])=>terms.every(t=>name.toLowerCase().includes(t))).map(([name,fn])=>btn(name,fn,'command-item'));list.append(...buttons);active=-1;if(!buttons.length)list.append(el('p',{class:'intro'},'No commands match.'));}
 input.addEventListener('input',draw);input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!buttons.length)return;active=(active+(e.key==='ArrowDown'?1:buttons.length-1)+buttons.length)%buttons.length;buttons.forEach((b,i)=>b.classList.toggle('command-active',i===active));buttons[active].scrollIntoView({block:'nearest'});}if(e.key==='Enter'){e.preventDefault();buttons[Math.max(0,active)]?.click();}});root.append(input,list);draw();requestAnimationFrame(()=>input.focus({preventScroll:true}));
}


/* Autonomous discovery owns a single cancellable timer and never records a view. */
let dynamicScheduler=null,dynamicCursor=0,dynamicHoldUntil=0;
function dynamicBlocked(){
 if(document.hidden)return 'hidden';
 if(insightOpen)return 'recommendation';if(drawer)return 'workspace';
 if(Date.now()<dynamicHoldUntil)return 'interaction';
 if(busy||pending.size||slots.some(slot=>slot.desired))return 'busy';
 if(uFocusUntil>Date.now())return 'focus session';
 if(state.settings.cyclePauseHover&&document.querySelector('.repo-row:hover,#dockOpen:hover'))return 'hover';
 const active=document.activeElement;
 if(['INPUT','TEXTAREA','SELECT'].includes(active?.tagName))return 'editing';
 if(state.settings.cyclePauseFocus&&uKeyboardFocus&&document.hasFocus()&&active?.closest?.('.repo-row,#dockOpen'))return 'keyboard';
 return '';
}
function dynamicStatus(status){
 const control=$('liveToggle');if(!control||!state)return;
 control.setAttribute('aria-pressed',String(status.enabled));
 control.setAttribute('aria-label',status.enabled?'Pause automatic repository rotation':'Resume automatic repository rotation');
 const sync=FeedUI.sync(state),prefix=sync.fresh?'Live':'Cached';if(!repos().length){control.textContent=state.catalogSize?'No filter matches':'Loading catalog';control.title='Use Reset feed filters or restore exclusions in Settings.';return;}
 control.textContent=!status.enabled?'Rotation paused':status.reason==='exhausted'?prefix+' · no alternatives':status.busy?prefix+' · changing':status.reason?prefix+' · paused':prefix+(state.settings.cycleCountdown?' · '+Math.ceil(status.remaining/1000)+'s':' · rotating');
 control.title=(sync.fresh?'Recently synced. ':sync.label+'. ')+(status.error||status.reason||'Automatic rotation')+'. Click to pause or resume.';

}
function dynamicSync(){
 if(!dynamicScheduler)return;
 const s=state;
 const key=JSON.stringify([Math.floor(Date.now()/30000),s.cacheAt,s.catalogSize,s.daily?.day,s.settings.minStars,s.settings.languages,s.settings.topics,s.settings.cooldownWindowMs,s.exclusions]);
 dynamicScheduler.configure(s.settings,key);
}
function dynamicInit(){
 dynamicScheduler=new DynamicFeed.Scheduler({blocked:dynamicBlocked,onStatus:dynamicStatus,rotate:async()=>{
  const rows=visible();if(!rows.length)return{exhausted:true};
  const repo=rows[dynamicCursor++%rows.length];
  const result=await api.cycle({id:repo.id,day:state.daily.day,epoch:state.feed?.epoch});
  if(result.state)adopt(result.state);
  if(result.changed){if(selectedId===repo.id)selectedId=result.id;render();}
  return result;
 }});
 $('liveToggle').addEventListener('click',()=>run(()=>changeSettings({dynamicRefresh:!state.settings.dynamicRefresh})));
 document.addEventListener('pointerdown',()=>{dynamicHoldUntil=Date.now()+800;},true);
 const syncTimer=setInterval(dynamicSync,15000);
 window.addEventListener('beforeunload',()=>{clearInterval(syncTimer);dynamicScheduler.destroy();},{once:true});
 dynamicSync();
}

let dockPressed=null;
document.getElementById('dockOpen').addEventListener('pointerdown',()=>{
 const id=Number(document.getElementById('dockOpen').dataset.repoId);
 dockPressed=[...repos(),...(state?.catalog||[])].find(r=>r.id===id)||null;
 dynamicHoldUntil=Date.now()+1000;
});
document.getElementById('dockOpen').addEventListener('pointercancel',()=>{dockPressed=null;});
document.getElementById('dockOpen').addEventListener('keydown',()=>{dockPressed=null;});
document.getElementById('dockOpen').addEventListener('click',e=>{
 e.stopPropagation();if(e.detail>1)return;
 const repo=dockPressed||UI.dockModel(repos(),selectedId).repo;dockPressed=null;
 if(repo)run(()=>openRepo(repo,'learn'));
});
document.querySelector('.topbar').addEventListener('click',e=>{
 if(!state||expanded||e.target.closest('button')||e.detail>1)return;
 run(async()=>{expanded=true;drawer=false;await windowMode();});
});

function updatePointerBounds(bounds){if(bounds&&['x','y','width','height'].every(k=>Number.isFinite(bounds[k])))pointerBounds=bounds;}

function iconSVG(name){
 const paths={pin:'<path d="m15 4 5 5-2 1-3 4v2l-2 2-3-3-5 5m5-5-4-4 2-2h2l4-3 1-2Z"/>',history:'<path d="M3 11a9 9 0 1 1 3 7M3 4v7h7m2-4v5l3 2"/>',settings:'<path d="m9 3-.5 3-2 1-3-.5-1 3 2.5 2v2L2.5 16l1.5 2.5 3-.5 2 1 .5 3h4l.5-3 2-1 3 .5 1.5-2.5-2.5-2.5v-2L21 9l-1-3-3 .5-2-1-.5-3Z"/><circle cx="11.5" cy="12" r="3"/>',chevron:'<path d="m6 14 6-6 6 6"/>',clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',command:'<rect x="8" y="8" width="8" height="8" rx="1"/><path d="M8 8H5.5A2.5 2.5 0 1 1 8 5.5V8Zm8 0h2.5A2.5 2.5 0 1 0 16 5.5V8ZM8 16H5.5A2.5 2.5 0 1 0 8 18.5V16Zm8 0h2.5a2.5 2.5 0 1 1-2.5 2.5V16Z"/>',undo:'<path d="m8 5-5 5 5 5M3 10h11a6 6 0 0 1 6 6v3"/>',refresh:'<path d="M20 8a8.5 8.5 0 0 0-15-2L3 9m0-6v6h6m-5 7a8.5 8.5 0 0 0 15 2l2-3m0 6v-6h-6"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',minus:'<path d="M5 12h14"/>',
  overview:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M10 9v11"/>',
  library:'<path d="M4 5h4v14H4zM10 5h4v14h-4zM16 6l3-1 3 13-3 1z"/>',
  collections:'<path d="M3.5 8V6A1.5 1.5 0 0 1 5 4.5h5l2 2h7a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V8Z"/><path d="M4 9h16"/>',
  compare:'<rect x="3.5" y="5" width="7" height="14" rx="1.5"/><rect x="13.5" y="5" width="7" height="14" rx="1.5"/>',
  insights:'<path d="M4 5v14h16M8 16v-4m4 4V8m4 8v-6m4 6V6"/>',
  saved:'<path d="M7 4.5h10a1 1 0 0 1 1 1v14l-6-4-6 4v-14a1 1 0 0 1 1-1Z"/>',
  tune:'<path d="M4 7h16M4 12h16M4 17h16"/><circle cx="8" cy="7" r="2" fill="var(--panel)"/><circle cx="15" cy="12" r="2" fill="var(--panel)"/><circle cx="10" cy="17" r="2" fill="var(--panel)"/>',
  exclusions:'<circle cx="12" cy="12" r="8"/><path d="m6.5 17.5 11-11"/>',
  back:'<path d="M20 12H4m6-6-6 6 6 6"/>'};
 return '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.clock)+'</svg>';
}
function installIcons(){
 initInsightButtons();
 for(const [id,name] of [['pinButton','pin'],['focusButton','clock'],['historyButton','history'],['refresh','refresh'],['menu','settings'],['collapse','chevron']])$(id).innerHTML=iconSVG(name);
 for(const button of document.querySelectorAll('nav [data-tab]'))button.insertAdjacentHTML('afterbegin',iconSVG(button.dataset.tab==='details'?'overview':button.dataset.tab));
 $('closeDrawer').insertAdjacentHTML('afterbegin',iconSVG('back'));
 $('browseLibrary').insertAdjacentHTML('afterbegin',iconSVG('library'));
}
function renderInsight(){
 const value=state.insight;if(!value)return;
 $('insightName').textContent=value.repo.full_name;$('insightDescription').textContent=UI.brief(value.repo.description,100);
 $('insightReason').textContent=value.reason+' '+compact(value.repo.stargazers_count)+' stars.';
}
function initInsightButtons(){
$('insightDismiss').addEventListener('click',()=>run(async()=>{adopt(await api.dismissInsight());insightOpen=false;expanded=false;applyMode();render();}));
$('insightDisable').addEventListener('click',()=>run(async()=>{await changeSettings({idleAdvisor:false});adopt(await api.dismissInsight());insightOpen=false;expanded=false;applyMode();render();}));
for(const id of ['insightOpen','insightName'])$(id).addEventListener('click',e=>{e.preventDefault();run(async()=>{const repo=state.insight?.repo;if(repo)await openRepo(repo,'learn');adopt(await api.dismissInsight());insightOpen=false;expanded=false;applyMode();render();});});

}
