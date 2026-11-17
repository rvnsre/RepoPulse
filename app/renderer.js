'use strict';
const UI=window.RepoPulseUI,raw=window.pulse,$=id=>document.getElementById(id);
let state,section='details',expanded=true,drawer=false,selectedId=null,pair=0,draft={},toastTimer,busy=false,search='',sort='recent',savedLanguage='',renderQueued=false,transition=0,rootAnimation=null,drawerStamp='',releaseTimer;
const pending=new Set(),slots=[],releaseStates=new Map(),releaseRequests=new Map();
const api=raw?{...raw}:null;
function adopt(next){state=UI.accept(state,next);return state;}
if(api)for(const name of ['state','open','react','undo','settings','profile','importProfile','importData','clear','clearHistory','resetControls','removeHistory','removeExclusion','workspacePatch','workspaceBulk','workspaceCollection'])if(raw[name])api[name]=async(...args)=>{const value=await raw[name](...args);return value?.settings&&value?.profile?adopt(value):value;};
function el(tag,props={},text){const e=document.createElement(tag);for(const [k,v]of Object.entries(props))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;if(props['aria-label'])e.dataset.focusKey=props['aria-label'];return e;}
function btn(text,action,cls='',label){const e=el('button',{class:cls},text);e.dataset.focusKey=label||text;if(label){e.setAttribute('aria-label',label);e.title=label;}e.addEventListener('click',()=>run(action));return e;}
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,(state?.settings.toastSeconds||5)*1000);}
async function run(fn){try{await fn();}catch(error){toast(error.message||'Unable to complete this action.');}}
function repos(){return state?.daily?.repos||[];}
function selected(){return [...repos(),...(state?.saved||[]),...(state?.history||[]).map(h=>h.repo),...(state?.catalog||[])].find(r=>r.id===selectedId)||repos()[0]||null;}
function visible(){return UI.visible(repos(),pair,state?.settings.visibleRows||2);}
function canAnimate(){return UI.motion(state?.settings,matchMedia('(prefers-reduced-motion: reduce)').matches,document.hidden);}
async function effect(node,frames,duration){if(!node||!canAnimate())return;const a=node.animate(frames,{duration:duration||state.settings.motionDuration||220,easing:'cubic-bezier(.2,.8,.2,1)'});try{await a.finished;}catch{}}
async function windowMode(){
 const serial=++transition;rootAnimation?.cancel();const mode=expanded?(drawer?'workspace':'panel'):'collapsed';
 islandController?.configure(state?.settings||{},mode);
 if(!expanded&&canAnimate()){const spec=IslandMotion.frames('exit',state.settings);rootAnimation=$('expanded').animate(spec.keyframes,{...spec.options,duration:Math.min(80,spec.options.duration)});try{await rootAnimation.finished;}catch{}if(serial!==transition)return;}
 $('expanded').hidden=!expanded;$('drawer').hidden=!drawer;document.body.classList.toggle('collapsed',!expanded);document.body.classList.toggle('workspace-open',expanded&&drawer);$('toggle').setAttribute('aria-expanded',String(expanded));$('menu').setAttribute('aria-expanded',String(drawer));
 await api?.expand(mode);if(serial!==transition)return;if(drawer)renderDrawer(false);requestFit();
 if(canAnimate()){const spec=IslandMotion.frames(expanded?'enter':'dock',state.settings,matchMedia('(prefers-reduced-motion: reduce)').matches);rootAnimation=(expanded?$('expanded'):$('island')).animate(spec.keyframes,spec.options);try{await rootAnimation.finished;}catch{}}
 ultimateStatus();
}
async function openDrawer(tab){if(tab==='library'&&section!=='library')uFilters.pinnedFirst=state.settings.pinnedFirst;section=tab;drawer=true;expanded=true;if(tab==='tune')draft={...state.profile.weights};search='';drawerStamp='';await windowMode();renderDrawer();}
async function closeDrawer(){drawer=false;await windowMode();$('menu').focus({preventScroll:true});}
function compact(number){return state?.settings.exactStars?Intl.NumberFormat('en').format(number):Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(number);}
function commands(repo){const name=repo.full_name.split('/')[1];return{clone:'git clone https://github.com/'+repo.full_name+'.git',inspect:'git -C "'+name+'" status\ngit -C "'+name+'" log -1 --oneline'};}
function choose(id){selectedId=id;document.querySelectorAll('.repo-row').forEach(row=>row.classList.toggle('selected',Number(row.dataset.repoId)===id));updateActions();if(drawer&&section==='details')renderDrawer(false);}
async function checkRelease(repo,force=false){
 if(releaseRequests.has(repo.id))return releaseRequests.get(repo.id);
 const previous=releaseStates.get(repo.id);
 if(!force&&previous&&previous.status!=='unknown'&&Date.now()-Date.parse(previous.checkedAt)<900000)return previous;
 const request=(async()=>{
  releaseStates.set(repo.id,{status:'checking',available:null});updateActions();
  let value;try{value=await api.releaseCheck(repo.id,force);}catch(error){value={status:'unknown',available:null,error:error.message||'Release check failed. Try again.'};}
  releaseStates.set(repo.id,value);updateActions();if(drawer&&section==='details'&&selectedId===repo.id)renderDrawer(false);return value;
 })();
 releaseRequests.set(repo.id,request);try{return await request;}finally{releaseRequests.delete(repo.id);}
}
function updateActions(){
 const repo=selected();$('install').disabled=!repo;$('learn').disabled=!repo;$('learn').title=repo?'Open '+repo.full_name+' in your browser':'Choose a repository';$('install').title=repo?'Open '+repo.full_name+' releases, when available':'Choose a repository';
 $('selectedLabel').textContent=repo?repo.full_name:'No repository selected';if($('workspaceContext'))$('workspaceContext').textContent=repo?repo.full_name:'Your discovery workspace';
 const release=repo&&releaseStates.get(repo.id);$('install').textContent=release?.status==='checking'?'Checking...':release?.available===false?'No release':'Install';$('install').disabled=!repo||release?.status==='checking'||release?.available===false;
 for(const row of document.querySelectorAll('.repo-row')){const id=Number(row.dataset.repoId),saved=state.saved.some(r=>r.id===id),save=row.querySelector('[data-action="save"]');if(save){save.textContent=saved?'Saved':'Save';save.setAttribute('aria-pressed',String(saved));}
  const status=releaseStates.get(id),install=row.querySelector('.row-install');if(install){install.textContent=status?.status==='checking'?'Checking...':status?.available===false?'No release':'Install';install.disabled=status?.status==='checking'||status?.available===false;install.title=status?.available===false?'No public release. Use Guide in Details.':'Open verified public releases';}
 }
}
async function openRepo(repo,kind='repository'){
 if(pending.has(repo.id))return;pending.add(repo.id);islandController?.hold('opening',true);const index=repos().findIndex(r=>r.id===repo.id);
 document.querySelectorAll('[data-repo-id="'+repo.id+'"]').forEach(n=>n.setAttribute('aria-busy','true'));
 try{
  if(kind==='releases'){const release=await checkRelease(repo);if(release.available!==true){toast(release.available===false?'No public release is available. Guide remains available in Details.':release.error||'Releases could not be checked. Retry later.');return;}}
  const next=await api.open(repo.id,kind);adopt(next);
  if(['repository','learn','releases'].includes(kind)&&selectedId===repo.id&&index>=0)selectedId=repos()[Math.min(index,repos().length-1)]?.id??null;
  toast(kind==='releases'?'Opened public releases in your browser.':kind==='readme'?'Opened the official README.':'Opened '+repo.full_name+' in your browser.');
  $('announcer').textContent=state.settings.autoReplace&&index>=0&&['repository','learn','releases'].includes(kind)?'New discovery: '+(selected()?.full_name||'The unseen catalog is exhausted.'):'Repository opened.';
  render();
 }finally{pending.delete(repo.id);islandController?.hold('opening',pending.size>0);document.querySelectorAll('[data-repo-id="'+repo.id+'"]').forEach(n=>n.removeAttribute('aria-busy'));}
}
async function react(repo,action){adopt(await api.react(repo.id,action));render();toast(({save:'Collection updated.',like:'Preference recorded.',hide:'Repository hidden.',snooze:'Snoozed for 7 days.',block:'Owner excluded.'})[action]);}
async function copy(repo,kind){await api.copy(repo.id,kind);toast(kind==='markdown'?'Markdown link copied.':kind==='url'?'Repository link copied.':'Command copied for '+repo.full_name+'.');}
function codeBlock(repo,kind,label,cls=''){const block=el('div',{class:'code-block '+cls}),top=el('div',{class:'code-top'});top.append(el('span',{},label),btn('Copy',()=>copy(repo,kind),'', 'Copy '+kind+' command for '+repo.full_name));block.append(top,el('pre',{},commands(repo)[kind]));return block;}
function row(repo,index){
 const article=el('article',{class:'repo-row','data-repo-id':String(repo.id),'aria-label':repo.full_name});
 const identity=el('div',{class:'repo-identity'}),name=btn(repo.full_name.split('/')[1],()=>{choose(repo.id);return openRepo(repo,'learn');},'repo-name','Open '+repo.full_name);identity.append(name);
 if(state.settings.showOwners)identity.append(el('span',{class:'repo-owner'},repo.full_name.split('/')[0]));
 const meta=el('div',{class:'repo-meta'});meta.append(el('span',{title:Intl.NumberFormat('en').format(repo.stargazers_count)+' stars'},compact(repo.stargazers_count)+' stars'),el('span',{},repo.language||'Open source'));identity.append(meta);
 const extra=el('div',{class:'row-extra'}),save=btn(state.saved.some(r=>r.id===repo.id)?'Saved':'Save',()=>react(repo,'save'),'','Save '+repo.full_name);save.dataset.action='save';extra.append(save,btn('Like',()=>react(repo,'like'),'','Like '+repo.full_name),btn('Details',()=>{choose(repo.id);return openDrawer('details');},'','Details for '+repo.full_name));if(state.settings.showQuickActions!==false)identity.append(extra);
 const badges=ultimateBadges(repo);if(badges)identity.append(badges);
 const text=el('div',{class:'repo-copy'});if(state.settings.showDescriptions)text.append(el('p',{class:'repo-description'},repo.description));
 if(state.settings.showReasons)text.append(el('p',{class:'repo-reason'},repo.reason||'A widely adopted open-source project.'));
 const actions=el('div',{class:'row-actions'});actions.append(btn('Learn More',()=>{choose(repo.id);return openRepo(repo,'learn');},'row-learn','Learn more about '+repo.full_name),btn('Install',()=>{choose(repo.id);return openRepo(repo,'releases');},'row-install','Install '+repo.full_name));text.append(actions);
 article.append(identity,text,el('div',{class:'connector','aria-hidden':'true'}),codeBlock(repo,'clone','Source / Bash + PowerShell'),el('div',{class:'connector second down','aria-hidden':'true'}),codeBlock(repo,'inspect','Inspect after cloning','inspect-block'));
 article.addEventListener('focusin',()=>choose(repo.id));article.addEventListener('pointerdown',event=>{if(!event.target.closest('button,a,input,select'))choose(repo.id);});
 article.classList.toggle('selected',selectedId===repo.id);return article;
}
function empty(title,body,action,label){const box=el('div',{class:'empty'});box.append(el('h2',{},title),el('p',{},body));if(action)box.append(btn(label,action,'secondary'));return box;}
function rowKey(repo){return JSON.stringify([repo.full_name,repo.description,repo.stargazers_count,repo.language,repo.reason,state.settings.showCommands,state.settings.showDescriptions,state.settings.showOwners,state.settings.showReasons,state.settings.exactStars,state.settings.showQuickActions,state.settings.showBadges,state.workspace?.records?.[repo.id]]);}
function reconcile(){
 const desired=visible();$('feed').querySelector('.empty')?.remove();
 if(!desired.length){for(const slot of slots)slot.element.remove();slots.length=0;$('feed').append(empty('No unseen matches remain.','Broaden filters, restore an exclusion, or refresh the catalog later.',()=>refresh(true),'Refresh catalog'));return;}
 for(let i=0;i<desired.length;i++){
  const repo=desired[i],key=rowKey(repo);let slot=slots[i];
  if(!slot){slot={element:el('div',{class:'repo-slot'}),version:0,id:null,key:null,desired:null,effect:null};slots[i]=slot;$('feed').append(slot.element);}
  if(slot.id===repo.id&&slot.key===key){if(slot.desired&&slot.desired!==key){slot.version++;slot.effect?.cancel();slot.desired=null;}slot.element.querySelector('.repo-row')?.classList.toggle('selected',repo.id===selectedId);continue;}
  if(slot.desired===key)continue;slot.desired=key;const serial=++slot.version;slot.effect?.cancel();const old=slot.element.firstElementChild,hadFocus=old?.contains(document.activeElement),changed=slot.id!==null&&slot.id!==repo.id;
  (async()=>{
   if(changed&&canAnimate()&&old){slot.effect=old.animate(IslandMotion.frames('leave',state.settings).keyframes,{...IslandMotion.frames('leave',state.settings).options,duration:Math.min(160,IslandMotion.config(state.settings).duration)});try{await slot.effect.finished;}catch{}}
   if(serial!==slot.version)return;
   const node=row(repo,i);slot.element.replaceChildren(node);slot.id=repo.id;slot.key=key;slot.desired=null;
   if(hadFocus)node.querySelector('.repo-name').focus({preventScroll:true});
   if(changed&&canAnimate()){slot.effect=node.animate(IslandMotion.frames('replace',state.settings).keyframes,{...IslandMotion.frames('replace',state.settings).options,delay:state.settings.stagger?i*35:0});try{await slot.effect.finished;}catch{}}
   updateActions();
  })().catch(e=>toast(e.message));
 }
 while(slots.length>desired.length){const removed=slots.pop();removed.version++;removed.effect?.cancel();removed.element.remove();}
}
let fitFrame=0;
function requestFit(){if(fitFrame||!api||expanded&&drawer)return;fitFrame=requestAnimationFrame(()=>{fitFrame=0;const height=Math.ceil($('island').offsetHeight+(24));api.fit({height,mode:expanded?(drawer?'workspace':'panel'):'collapsed'}).catch(()=>{});});}
function render(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;renderNow();});}
function renderNow(){
 if(!state)return;const prefs=state.settings;ultimateRender();
 for(const theme of ['graphite','contrast'])document.body.classList.toggle(theme,prefs.theme===theme);
 for(const [name,value]of Object.entries({compact:prefs.density==='compact',reduced:!canAnimate(),'no-commands':!prefs.showCommands,'wrap-names':prefs.wrapNames,'wrap-code':prefs.codeWrap}))document.body.classList.toggle(name,value);
 document.body.dataset.scale=String(UI.textScale(prefs.textScale));
 if(!selected())selectedId=repos()[0]?.id??null;
 const age=state.cacheAt?Math.max(0,Math.floor((Date.now()-Date.parse(state.cacheAt))/60000)):null;
 $('status').textContent=state.lastError?'Offline / cached discoveries':repos().length+' picks / '+state.catalogSize+' projects / '+(age===null?'loading':age<1?'just synced':age+'m since sync');
 $('status').title=state.lastError||'Interests remain on this device.';
 $('system').textContent=(({win32:'Windows',darwin:'macOS',linux:'Linux'})[state.platform]||'Desktop')+' / 50K+ stars / '+new Date().toLocaleDateString('en',{month:'short',day:'numeric'});
 $('undo').disabled=!state.canUndo;$('next').disabled=repos().length<=state.settings.visibleRows;
 if(!canAnimate())for(const slot of slots)slot.effect?.cancel();reconcile();updateActions();if(drawer)renderDrawer(false);requestFit();
 clearTimeout(releaseTimer);const target=selected();if(target&&!releaseStates.has(target.id))releaseTimer=setTimeout(()=>run(()=>checkRelease(target)),350);
}
function heading(root,title,actions=[]){const h=el('div',{class:'drawer-heading'});h.append(el('h2',{},title));const stack=el('div',{class:'stack'});stack.append(...actions);h.append(stack);root.append(h);}
function overview(root){const repo=selected();if(!repo){root.append(empty('Nothing selected yet.','Choose a repository when your feed is ready.'));return;}
 heading(root,repo.full_name,[btn('Save',()=>react(repo,'save'),'secondary'),btn('Open repository',()=>openRepo(repo),'primary')]);root.append(el('p',{class:'intro'},repo.description),el('div',{class:'notice'},repo.reason||'Selected from the established open-source catalog.'));
 const release=releaseStates.get(repo.id);root.append(el('p',{class:'notice'},release?.available===true?'Public release available: '+release.tag:release?.available===false?'No public release. Use Guide to read setup instructions.':release?.error||'Release availability is checked before opening Install.'));const stats=el('div',{class:'stat-row'});for(const [value,label]of [[compact(repo.stargazers_count),'GitHub stars'],[repo.language||'Mixed','language'],[repo.license||'Not specified','license'],[repo.pushed_at?new Date(repo.pushed_at).toLocaleDateString():'Unknown','last push']]){const box=el('div',{class:'stat'});box.append(el('b',{},value),el('span',{},label));stats.append(box);}root.append(stats);
 const tags=el('div',{class:'stack'});(repo.topics||[]).slice(0,8).forEach(t=>tags.append(el('span',{class:'tag'},t)));root.append(tags);
 const columns=el('div',{class:'detail-columns'});columns.append(codeBlock(repo,'clone','Get source - not an installer'),codeBlock(repo,'inspect','After cloning - inspect locally'));root.append(columns);
 const actions=el('div',{class:'stack'});actions.append(btn('Install release',()=>openRepo(repo,'releases'),'primary'),btn('Retry release check',()=>checkRelease(repo,true),'secondary'),btn('Copy Markdown',()=>copy(repo,'markdown'),'secondary'),btn('Hide repository',()=>react(repo,'hide'),'secondary'),btn('Guide',()=>openRepo(repo,'readme'),'primary'),btn('Copy link',()=>copy(repo,'url'),'secondary'),btn('Snooze 7 days',()=>react(repo,'snooze'),'secondary'),btn('Hide this owner',()=>react(repo,'block'),'secondary danger'));ultimateDetails(root,repo);root.append(el('p',{class:'intro'},'Install opens public GitHub releases when a release exists. Learn More opens the repository directly. Guide opens its README. Commands are copied only.'),actions);
}
function collectionView(root,history=false){
 const data=history?UI.history(state.history,state.settings.uniqueHistory):state.saved;
 heading(root,history?'Your discovery history':'Saved for later',history?[btn('Export history',()=>api.exportData('history'),'secondary'),btn('Clear history',async()=>{const next=await api.clearHistory();if(next){state=next;render();}},'secondary')]:[btn('Import collection',async()=>{const next=await api.importData('collection');if(next){state=next;render();toast('Collection imported.');}},'secondary'),btn('Export collection',()=>api.exportData('collection'),'secondary')]);
 if(!data.length){root.append(empty(history?'The first click starts your story.':'Keep the projects worth returning to.',history?'Opened projects appear here with their visit time.':'Use Save on a repository to add it to this local collection.'));return;}
 const controls=el('div',{class:'stack'}),input=el('input',{class:'search',type:'search',placeholder:'Search name, description or language','aria-label':history?'Search history':'Search saved repositories'}),select=el('select',{'aria-label':'Sort repositories'});input.value=search;
 for(const [value,label]of [['recent','Most recent'],['stars','Most stars'],['name','Name A-Z']])select.append(el('option',{value},label));select.value=sort;const list=el('div',{class:'list'}),resultCount=el('span',{class:'result-count','aria-live':'polite'});
 function draw(){search=input.value;sort=select.value;let rows=UI.search(data,search,sort,savedLanguage);resultCount.textContent=rows.length+' / '+data.length+' results';list.replaceChildren();rows.forEach(repo=>{const item=el('article',{class:'list-row'}),info=el('div',{class:'list-info'});info.append(btn(repo.full_name,()=>openRepo(repo),'list-name',`Open ${repo.full_name}`),el('p',{class:'list-desc'},`${compact(repo.stargazers_count)} stars / ${repo.language||'Open source'}${repo.openedAt?' / '+new Date(repo.openedAt).toLocaleString():''} / ${repo.description}`));const actions=el('div',{class:'stack'});actions.append(btn('Copy',()=>copy(repo,'url'),'',`Copy link for ${repo.full_name}`),btn(state.saved.some(r=>r.id===repo.id)?'Unsave':'Save',()=>react(repo,'save'),'',`Toggle saved state for ${repo.full_name}`));if(history)actions.append(btn('Remove',async()=>{adopt(await api.removeHistory(repo.id,repo.openedAt));render();},'','Remove history record for '+repo.full_name));item.append(info,actions);list.append(item);});if(!rows.length)list.append(el('p',{class:'intro'},'No matching repositories.'));}
 input.addEventListener('input',draw);select.addEventListener('change',draw);const language=el('select',{'aria-label':'Filter collection language'});language.append(el('option',{value:''},'All languages'));[...new Set(data.map(r=>r.language).filter(Boolean))].sort().forEach(name=>language.append(el('option',{value:name},name)));language.value=savedLanguage;language.addEventListener('change',()=>{savedLanguage=language.value;draw();});controls.append(input,select,language,btn('Clear search',()=>{input.value='';savedLanguage='';language.value='';draw();input.focus();},'secondary'),resultCount);root.append(controls,list);draw();
}
function tune(root){heading(root,'A feed shaped around you',[btn('Import browser profile',async()=>{const next=await api.importProfile();if(next){state=next;draft={...state.profile.weights};render();}},'secondary'),btn('Export interests',()=>api.exportData('profile'),'secondary')]);root.append(el('p',{class:'intro'},'Choose your interests. First-time choices update the feed immediately; later reactions shape new discoveries without rearranging the projects you are reading.'));
 const grid=el('div',{class:'topic-grid'});for(const [key,t]of Object.entries(state.topics)){const b=btn(t.label,()=>{if(draft[key])delete draft[key];else draft[key]=8;renderDrawer();},`topic ${draft[key]?'selected':''}`);b.setAttribute('aria-pressed',String(!!draft[key]));b.append(el('span',{},draft[key]?'Selected':'+'));grid.append(b);}root.append(grid,btn('Save interests',async()=>{state=await api.profile(draft);render();toast('Your interests have been saved.');},'primary'),el('div',{class:'notice'},'The browser companion analyzes recent history on your device when you request it. Import its score-only JSON profile here. No cookies, URLs or page titles are uploaded. Reactions can be paused in Settings.'));
}
async function changeSettings(update){adopt(await api.settings(update));render();}
function setting(root,key,title,detail,kind='checkbox',options){const label=el('label',{class:'setting'}),text=el('div');text.append(el('span',{},title));if(detail)text.append(el('small',{},detail));let input;
 if(kind==='select'){input=el('select',{'aria-label':title});for(const [value,name]of options)input.append(el('option',{value},name));input.value=String(state.settings[key]);}
 else{input=el('input',{type:kind,'aria-label':title});if(kind==='checkbox')input.checked=!!state.settings[key];else{input.min='65';input.max='100';input.value=String(state.settings[key]);}}
 input.addEventListener('change',()=>run(async()=>{try{await changeSettings({[key]:kind==='checkbox'?input.checked:kind==='range'||key==='minStars'?Number(input.value):input.value});}catch(e){renderDrawer();throw e;}}));label.append(text,input);root.append(label);
}
function settingsView(root){heading(root,`Your workspace / v${state.version}`,[btn('Export RSS',()=>api.exportRss(),'secondary'),btn('Hide panel',()=>api.hide(),'secondary'),btn('Quit',()=>api.quit(),'secondary')]);
 const stats=el('div',{class:'stat-row'});for(const [value,label]of [[state.catalogSize,'catalog projects'],[state.saved.length,'saved projects'],[state.history.length,'recorded opens'],[Object.keys(state.profile.weights).length,'active interests']]){const box=el('div',{class:'stat'});box.append(el('b',{},String(value)),el('span',{},label));stats.append(box);}root.append(stats);
 const grid=el('div',{class:'settings-grid'});
 for(const [key,title,detail]of [['autoReplace','Replace after opening','The clicked row is replaced with a new unseen project.'],['pinned','Always on top','Keep the panel above other windows.'],['hoverExpand','Expand on hover','Reveal a collapsed panel when the pointer enters.'],['reducedMotion','Reduced motion','Disable entry animations.'],['pausedLearning','Pause reaction learning','Keep manual interests without learning from opens and likes.'],['notifications','New-day notification','Notify when a new day of discoveries is ready.'],['launchAtLogin','Launch at login','Linux uses desktop session settings.']])setting(grid,key,title,detail);
 setting(grid,'opacity','Window opacity','65 to 100 percent.','range');setting(grid,'theme','Panel theme','Reference palette is the default.','select',[['reference','Warm / ocean'],['graphite','Graphite'],['contrast','High contrast']]);setting(grid,'density','Density','','select',[['comfortable','Comfortable'],['compact','Compact']]);setting(grid,'anchor','Screen anchor','Recenter or move to a top corner.','select',[['left','Top left'],['center','Top center'],['right','Top right']]);setting(grid,'minStars','Minimum stars','Never below 50,000.','select',[[50000,'50K+'],[75000,'75K+'],[100000,'100K+'],[200000,'200K+']]);root.append(grid);

 const display=el('div',{class:'settings-grid'});
 setting(display,'textScale','Text size','Readable sizes across the entire interface.','select',[[100,'100%'],[115,'115%'],[130,'130%'],[150,'150%']]);
 setting(display,'motion','Animation preference','System mode respects reduced motion.','select',[['system','Follow system'],['full','Animate'],['none','No animation']]);
 setting(display,'motionDuration','Animation speed','','select',[[80,'Instant'],[140,'Quick'],[220,'Balanced'],[320,'Relaxed']]);
 setting(display,'visibleRows','Visible repositories','','select',[[1,'One row'],[2,'Two rows'],[3,'Three rows']]);
 setting(display,'panelWidth','Preferred panel width','Clamped to your monitor.','select',[[960,'960 px'],[1080,'1080 px'],[1280,'1280 px'],[1440,'1440 px']]);
 setting(display,'toastSeconds','Message duration','','select',[[3,'3 seconds'],[5,'5 seconds'],[8,'8 seconds']]);
 for(const [key,title,description]of [['showCommands','Show source commands','Hide code blocks for a calmer feed.'],['showDescriptions','Show descriptions','Keep or hide project summaries.'],['showOwners','Show repository owners','Distinguish similarly named projects.'],['showReasons','Show relevance explanations','Explain why a project is recommended.'],['wrapNames','Wrap long names','Avoid losing long repository names.'],['codeWrap','Wrap command lines','Read long commands without horizontal scrolling.'],['shortcuts','Keyboard shortcuts','Disable letter shortcuts if preferred.'],['exactStars','Exact star counts','Display full cached counts instead of compact notation.'],['uniqueHistory','Unique history view','Show only the newest visit per project.']])setting(display,key,title,description);
 root.append(el('h3',{class:'subheading'},'Readability and interaction'),display);
 const resets=el('div',{class:'stack'});resets.append(btn('Reset appearance',()=>changeSettings({textScale:100,motion:'system',motionDuration:80,visibleRows:2,panelWidth:960,showCommands:true,showDescriptions:true,showOwners:true,showReasons:false,wrapNames:true,codeWrap:true,theme:'reference',density:'compact',opacity:100,reducedMotion:false}),'secondary'),btn('Reset feed filters',()=>changeSettings({minStars:50000,languages:[]}),'secondary'));root.append(resets);
 ultimateSettings(root);
 root.append(el('p',{class:'intro'},'Language filters - leave all unchecked for every language. Changes refill only projects that no longer match.'));
 const languages=el('div',{class:'stack'});(state.languages||[]).forEach(language=>{const selected=state.settings.languages.includes(language),b=btn(language,()=>changeSettings({languages:selected?state.settings.languages.filter(l=>l!==language):[...state.settings.languages,language]}),`secondary ${selected?'primary':''}`);b.setAttribute('aria-pressed',String(selected));languages.append(b);});root.append(languages);
 const controls=el('div',{class:'stack'});controls.append(btn(`Restore exclusions (${state.blockedOwners.length} owners / ${state.snoozedCount} snoozed)`,async()=>{const next=await api.resetControls();if(next){state=next;render();}},'secondary'),btn('Reset local data',async()=>{const next=await api.clear();if(next){state=next;render();}},'secondary danger'));root.append(el('p',{class:'intro'},'Shortcuts: J/K select row, Enter open, S save, U undo replacement, R refresh, / search, Escape close. Ctrl/Cmd+Shift+Space toggles the island. Drag the header to move it; position is remembered.'),controls);
}
function exclusionsView(root){
 heading(root,'Manage exclusions');root.append(el('p',{class:'intro'},'Restore individual projects or allow an owner again. Restoring a hidden or snoozed project deliberately allows it to return to discovery.'));
 const groups=[['hidden','Hidden projects',state.exclusions.hidden],['snoozed','Snoozed projects',state.exclusions.snoozed],['owner','Blocked owners',state.exclusions.owners.map(name=>({id:name,name}))]];
 for(const [kind,title,items]of groups){root.append(el('h3',{class:'subheading'},title));if(!items.length){root.append(el('p',{class:'intro'},'None'));continue;}const list=el('div',{class:'list'});for(const item of items){const row=el('div',{class:'list-row'});row.append(el('span',{class:'list-info'},item.name+(item.until?' / until '+new Date(item.until).toLocaleDateString():'')),btn('Restore',async()=>{adopt(await api.removeExclusion(kind,item.id));render();},'secondary','Restore '+kind+' '+item.name));list.append(row);}root.append(list);}
}
function renderDrawer(force=true){
 if(!state||!drawer)return;
 document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===section);b.setAttribute('aria-current',b.dataset.tab===section?'page':'false');});
 const stamp=JSON.stringify([section,section==='history'?[state.settings.uniqueHistory,state.settings.exactStars]:section==='saved'?state.settings.exactStars:null,section==='details'?[selected(),releaseStates.get(selected()?.id)]:null,section==='saved'?state.saved:null,section==='history'?state.history:null,section==='tune'?state.profile:null,section==='settings'?[state.settings,state.saved.length,state.history.length,state.catalogSize]:null,section==='exclusions'?state.exclusions:null,['library','collections','compare','insights'].includes(section)?[state.workspace,state.saved,state.history,state.analytics]:null,section==='details'?state.workspace?.records?.[selected()?.id]:null]);
 if(!force&&stamp===drawerStamp)return;drawerStamp=stamp;
 $('drawer').dataset.view=section;const root=$('drawerContent'),active=document.activeElement,within=root.contains(active),key=within?(active.dataset.focusKey||active.id):null,scroll=root.scrollTop;
 let cursor=null;try{if(within&&typeof active.selectionStart==='number')cursor=[active.selectionStart,active.selectionEnd];}catch{}
 root.replaceChildren();({details:overview,saved:r=>collectionView(r,false),history:r=>collectionView(r,true),tune,settings:settingsView,exclusions:exclusionsView,library:ultimateLibrary,collections:ultimateCollections,compare:ultimateCompare,insights:ultimateInsights,commands:ultimateCommands})[section](root);
 if(key){const replacement=Array.from(root.querySelectorAll('[data-focus-key],input[id]')).find(n=>(n.dataset.focusKey||n.id)===key);if(replacement){replacement.focus({preventScroll:true});if(cursor)try{replacement.setSelectionRange(...cursor);}catch{}}}root.scrollTop=scroll;
}
async function refresh(force=false){if(busy)return;islandController?.hold('refresh',true);busy=true;$('refresh').disabled=true;try{const result=await api.refresh(force);adopt(result.state);render();if(result.error)toast(result.error);else if(force)toast('Catalog refreshed. Unseen projects remain ready for your next click.');}finally{busy=false;islandController?.hold('refresh',false);$('refresh').disabled=false;}}
$('browseLibrary').addEventListener('click',()=>run(()=>openDrawer('library')));
$('toggle').addEventListener('click',()=>run(async()=>{expanded=!expanded;if(!expanded)drawer=false;await windowMode();}));
$('collapse').addEventListener('click',()=>run(async()=>{expanded=false;drawer=false;await windowMode();}));
$('menu').addEventListener('click',()=>run(()=>drawer?closeDrawer():openDrawer('settings')));
$('closeDrawer').addEventListener('click',()=>run(closeDrawer));
$('refresh').addEventListener('click',()=>run(()=>refresh(true)));
$('undo').addEventListener('click',()=>run(async()=>{adopt(await api.undo());selectedId=repos()[0]?.id??null;render();toast('Last replacement restored.');}));
$('next').addEventListener('click',()=>{pair=(pair+(state.settings.visibleRows||2))%Math.max(1,repos().length);selectedId=visible()[0]?.id??null;render();});
$('install').addEventListener('click',()=>run(()=>{const r=selected();return r&&openRepo(r,'releases');}));
$('learn').addEventListener('click',()=>run(()=>{const r=selected();return r&&openRepo(r,'learn');}));
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>run(()=>openDrawer(b.dataset.tab))));
document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const slot of slots)slot.effect?.cancel();});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>render());
window.addEventListener('keydown',e=>{
 const key=e.key.toLowerCase(),typing=['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName);
 if(key==='escape'){islandController?.pause(600);e.preventDefault();run(async()=>{if(drawer)await closeDrawer();else{expanded=false;await windowMode();}});return;}
 if((e.ctrlKey||e.metaKey)&&key==='k'){e.preventDefault();run(()=>openDrawer('commands'));return;}
 if((e.ctrlKey||e.metaKey)&&['+','=','-','0'].includes(key)){e.preventDefault();run(()=>changeSettings({textScale:key==='0'?100:UI.nextScale(state.settings.textScale,key==='-'?-1:1)}));return;}
 if(typing||!state?.settings.shortcuts||e.ctrlKey||e.metaKey||e.altKey)return;
 if(key==='j'||key==='k'){e.preventDefault();const rows=visible();if(!rows.length)return;const current=rows.findIndex(r=>r.id===selectedId),repo=rows[(Math.max(0,current)+(key==='j'?1:rows.length-1))%rows.length];choose(repo.id);document.querySelector('[data-repo-id="'+repo.id+'"] .repo-name')?.focus();}
 if(key==='enter'&&e.target===document.body&&selected())run(()=>openRepo(selected(),'learn'));
 if(key==='s'&&selected())run(()=>react(selected(),'save'));
 if(key==='u')$('undo').click();
 if(key==='r')run(()=>refresh(true));
 if(key==='n')$('next').click();
 if(key==='q'&&selected())run(()=>ultimatePatch(selected(),{queued:!ultimateMeta(selected()).queued}));
 if(key==='p'&&selected())run(()=>ultimatePatch(selected(),{pinned:!ultimateMeta(selected()).pinned}));
 if(key==='d'&&selected())run(()=>openDrawer('details'));
 if(key==='f')run(()=>ultimateFocus());
 if(key==='?')run(()=>openDrawer('commands'));
 if(key==='i'&&selected())run(()=>openRepo(selected(),'releases'));
 if(key==='/'){e.preventDefault();run(async()=>{await openDrawer('saved');document.querySelector('.search')?.focus();});}
});
(async()=>{
 if(!api){$('feed').append(empty('RepoPulse desktop','Open this interface in the desktop app.'));return;}
 adopt(await api.state());draft={...state.profile.weights};selectedId=repos()[0]?.id??null;
 api.onState(next=>{adopt(next);render();});
 api.onMode?.(next=>{const nextExpanded=next!=='collapsed',nextDrawer=next==='workspace';if(nextExpanded===expanded&&nextDrawer===drawer)return;transition++;rootAnimation?.cancel();expanded=nextExpanded;drawer=nextDrawer;document.body.classList.toggle('collapsed',!expanded);document.body.classList.toggle('workspace-open',expanded&&drawer);$('expanded').hidden=!expanded;$('drawer').hidden=!drawer;$('toggle').setAttribute('aria-expanded',String(expanded));$('menu').setAttribute('aria-expanded',String(drawer));islandController?.configure(state.settings,next);ultimateStatus();requestFit();if(drawer)renderDrawer(false);});
 new ResizeObserver(requestFit).observe($('island'));if(state.windowMode==='collapsed'){expanded=false;drawer=false;$('expanded').hidden=true;document.body.classList.add('collapsed');}ultimateInit();render();if(state.recoveryNotice)toast(state.recoveryNotice);await refresh();
})().catch(e=>toast(e.message));

