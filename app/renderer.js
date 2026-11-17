'use strict';
const UI=window.RepoPulseUI,raw=window.pulse,$=id=>document.getElementById(id);
let insightOpen=false,morphing=false,sceneSequence=0;
let state,section='details',expanded=true,drawer=false,selectedId=null,pair=0,draft={},toastTimer,busy=false,search='',sort='recent',savedLanguage='',renderQueued=false,transition=0,rootAnimation=null,drawerStamp='',releaseTimer;
const pending=new Set(),slots=[],releaseStates=new Map(),releaseRequests=new Map();
const api=raw?{...raw}:null;
function adopt(next){state=UI.accept(state,next);return state;}
if(api)for(const name of ['state','open','react','undo','settings','profile','importProfile','importData','clear','clearHistory','resetControls','removeHistory','removeExclusion','workspacePatch','workspaceBulk','workspaceCollection'])if(raw[name])api[name]=async(...args)=>{const value=await raw[name](...args);return value?.settings&&value?.profile?adopt(value):value;};
function el(tag,props={},text){const e=document.createElement(tag);for(const [k,v]of Object.entries(props))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;if(props['aria-label'])e.dataset.focusKey=props['aria-label'];return e;}
function btn(text,action,cls='',label){const e=el('button',{class:cls},text);e.dataset.focusKey=label||text;if(label){e.setAttribute('aria-label',label);e.title=label;}e.addEventListener('click',()=>run(action));return e;}
function toast(message){if(insightOpen){clearTimeout(toastTimer);$('toast').hidden=true;$('insightReason').textContent=message;$('announcer').textContent=message;return;}clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,(state?.settings.toastSeconds||5)*1000);}
async function run(fn){try{await fn();}catch(error){toast(error.message||'Unable to complete this action.');}}
function repos(){return state?.daily?.repos||[];}
function selected(){return [...repos(),...(state?.saved||[]),...(state?.history||[]).map(h=>h.repo),...(state?.catalog||[])].find(r=>r.id===selectedId)||repos()[0]||null;}
function visible(){return repos();}
function canAnimate(){return UI.motion(state?.settings,matchMedia('(prefers-reduced-motion: reduce)').matches,document.hidden);}
async function effect(node,frames,duration){if(!node||!canAnimate())return;const a=node.animate(frames,{duration:duration||state.settings.motionDuration||220,easing:'cubic-bezier(.2,.8,.2,1)'});try{await a.finished;}catch{}}
function applyMode(){
 if(insightOpen){clearTimeout(toastTimer);$('toast').hidden=true;}
 $('expanded').hidden=!expanded||insightOpen;$('idleInsight').hidden=!insightOpen;$('drawer').hidden=!drawer;
 document.body.classList.toggle('collapsed',!expanded&&!insightOpen);document.body.classList.toggle('insight-open',insightOpen);document.body.classList.toggle('workspace-open',expanded&&drawer&&!insightOpen);
 $('toggle').setAttribute('aria-expanded',String(expanded));$('menu').setAttribute('aria-expanded',String(drawer));
}
function desiredHeight(){
 if(!expanded)return 64;
 if(drawer||insightOpen)return undefined;
 const feed=$('feed'),nodes=[...feed.querySelectorAll('.repo-slot')],style=getComputedStyle(feed);
 return IslandMorph.panelHeight({header:document.querySelector('.topbar').offsetHeight,
 heading:document.querySelector('.feed-heading').offsetHeight,
 footer:document.querySelector('footer').offsetHeight,padding:state.windowPolicy?.padding??8,
 gap:parseFloat(style.rowGap)||12,count:state.settings.visibleRows||2,
 rows:nodes.map(n=>n.offsetHeight),empty:feed.querySelector('.empty')?.offsetHeight||210});
}
async function windowMode(){
 fitKey='';const serial=++transition,currentTransform=getComputedStyle($('island')).transform;
 rootAnimation?.cancel();hoverAnimation?.cancel();morphing=true;
 const node=$('island'),mode=insightOpen?'insight':expanded?(drawer?'workspace':'panel'):'collapsed',before=pointerBounds||state.windowBounds;
 const duration=IslandMorph.duration(state.settings,matchMedia('(prefers-reduced-motion: reduce)').matches);
 islandController?.configure(state.settings,mode);
 try{
  if(mode==='collapsed'&&before&&canAnimate()&&api.previewBounds){
   const target=await api.previewBounds(mode);if(serial!==transition)return;
   rootAnimation=node.animate([{transform:currentTransform==='none'?'none':currentTransform,opacity:1},
    {transform:IslandMorph.transform(before,target,state.windowPolicy?.padding??8),opacity:.9}],
    {duration:Math.min(160,duration),easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
   try{await rootAnimation.finished;}catch{}if(serial!==transition)return;
  }
  applyMode();ultimateStatus();if(!expanded)compactProtectedEntry=false;
  const reply=await api?.expand({mode,requestId:serial,height:desiredHeight()});if(serial!==transition)return;
  updatePointerBounds(reply?.bounds);rootAnimation?.cancel();if(drawer)renderDrawer(false);
  if(mode!=='collapsed'&&before&&reply?.bounds&&canAnimate()){
   rootAnimation=node.animate([{transform:IslandMorph.transform(reply.bounds,before,state.windowPolicy?.padding??8),opacity:.85},
    {transform:'none',opacity:1}],{duration,easing:'cubic-bezier(.16,1,.3,1)'});
   try{await rootAnimation.finished;}catch{}if(serial!==transition)return;rootAnimation.cancel();
  }
 }finally{if(serial===transition){rootAnimation?.cancel();morphing=false;ultimateStatus();ultimateMagnify(!!islandController?.pointer);requestFit();}}
}
async function openDrawer(tab){insightOpen=false;if(tab==='library'&&section!=='library')uFilters.pinnedFirst=state.settings.pinnedFirst;section=tab;drawer=true;expanded=true;if(tab==='tune')draft={...state.profile.weights};search='';drawerStamp='';await windowMode();renderDrawer();}
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
 const repo=selected();if($('workspaceContext'))$('workspaceContext').textContent=repo?.full_name||'Your discovery workspace';
 for(const row of document.querySelectorAll('.repo-row')){const id=Number(row.dataset.repoId),saved=state.saved.some(r=>r.id===id),save=row.querySelector('[data-action="save"]');if(save){save.textContent=saved?'Bookmarked':'Bookmark';save.setAttribute('aria-pressed',String(saved));}const status=releaseStates.get(id),install=row.querySelector('.row-install');if(install){install.disabled=status?.status==='checking';install.textContent=status?.status==='checking'?'Checking…':installPlan(selected()?.id===id?selected():repos().find(r=>r.id===id)||selected()).command?'Copy install':status?.available===false?'Setup guide':'Downloads';}}
 updatePickRange();
}
async function undoLast(){if(!state.canUndo)return;dynamicHoldUntil=Date.now()+1000;adopt(await api.undo());selectedId=repos()[0]?.id??null;render();toast('Previous picks restored.');}
function undoToast(message){toast(message);if(!insightOpen&&state.canUndo)$('toast').append(btn('Undo',undoLast,'toast-undo','Undo last replacement'));}
function updatePickRange(){const feed=$('feed'),rows=[...feed.querySelectorAll('.repo-row')],box=feed.getBoundingClientRect(),inView=rows.map((node,i)=>({i,r:node.getBoundingClientRect()})).filter(({r})=>r.bottom>box.top+12&&r.top<box.bottom-12);const more=feed.scrollHeight>feed.clientHeight+2;$('pickRange').textContent=inView.length?'Picks '+(inView[0].i+1)+'–'+(inView.at(-1).i+1)+' of '+repos().length+(more?' · scroll':''):repos().length+' picks';feed.classList.toggle('has-more',more&&feed.scrollTop+feed.clientHeight<feed.scrollHeight-3);}
async function openRepo(repo,kind='repository'){
 if(pending.has(repo.id))return;pending.add(repo.id);islandController?.hold('opening',true);const index=repos().findIndex(r=>r.id===repo.id);
 document.querySelectorAll('[data-repo-id="'+repo.id+'"]').forEach(n=>n.setAttribute('aria-busy','true'));
 try{
  if(kind==='releases'){const release=await checkRelease(repo);if(release.available!==true){toast(release.available===false?'No public release is available. Guide remains available in Details.':release.error||'Releases could not be checked. Retry later.');return;}}
  const next=await api.open(repo.id,kind);adopt(next);
  if(['repository','learn','releases'].includes(kind)&&selectedId===repo.id&&index>=0)selectedId=repos()[Math.min(index,repos().length-1)]?.id??null;
  undoToast(kind==='releases'?'Opened public releases in your browser.':kind==='readme'?'Opened the official README.':'Opened '+repo.full_name+' in your browser.');
  $('announcer').textContent=state.settings.autoReplace&&index>=0&&['repository','learn','releases'].includes(kind)?'New discovery: '+(selected()?.full_name||'The unseen catalog is exhausted.'):'Repository opened.';
  render();
 }finally{pending.delete(repo.id);islandController?.hold('opening',pending.size>0);document.querySelectorAll('[data-repo-id="'+repo.id+'"]').forEach(n=>n.removeAttribute('aria-busy'));}
}
async function react(repo,action){adopt(await api.react(repo.id,action));render();if(action==='skip'){undoToast('Skipped '+repo.full_name+'.');return;}toast(({save:'Collection updated.',like:'Preference recorded.',hide:'Repository hidden.',snooze:'Snoozed for 7 days.',block:'Owner excluded.'})[action]);}
async function copy(repo,kind){await api.copy(repo.id,kind);toast(kind==='markdown'?'Markdown link copied.':kind==='url'?'Repository link copied.':'Command copied for '+repo.full_name+'.');}
function codeBlock(repo,kind,label,cls=''){const block=el('div',{class:'code-block '+cls}),top=el('div',{class:'code-top'});top.append(el('span',{},label),btn('Copy',()=>copy(repo,kind),'', 'Copy '+kind+' command for '+repo.full_name));block.append(top,el('pre',{},commands(repo)[kind]));return block;}
const activityStates=new Map(),activityPending=new Set(),commandTabs=new Map();
function fillActivity(repo,node){const entry=activityStates.get(repo.id)||{};node.textContent=FeedUI.activity(repo,entry);node.title=entry.checkedAt?'GitHub activity checked '+new Date(entry.checkedAt).toLocaleString():'Repository push timestamp from the catalog';}
function installPlan(repo){if(!repo)return{command:null,label:'Downloads',clone:''};return activityStates.get(repo.id)?.install||{label:'Downloads',command:null,downloadLabel:({win32:'.exe / .msi',darwin:'.dmg / .zip',linux:'.rpm / .deb / AppImage'})[state.platform]||'release assets',clone:commands(repo).clone};}
function smartCode(repo){const block=el('div',{class:'code-block smart-code'}),tabs=el('div',{class:'code-top'}),selector=el('div',{class:'command-tabs',role:'tablist','aria-label':'Command for '+repo.full_name}),pre=el('pre',{tabindex:'0'}),info=el('span',{class:'command-hint'});let current=commandTabs.get(repo.id)||'install';
 const installTab=btn('Install',()=>draw('install'),'command-tab'),cloneTab=btn('Git Clone',()=>draw('clone'),'command-tab');for(const [b,key]of [[installTab,'install'],[cloneTab,'clone']]){b.setAttribute('role','tab');b.id='tab-'+key+'-'+repo.id;b.setAttribute('aria-controls','code-'+repo.id);b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();draw(e.key==='Home'?'install':e.key==='End'?'clone':current==='install'?'clone':'install');(current==='install'?installTab:cloneTab).focus();}});}pre.id='code-'+repo.id;pre.setAttribute('role','tabpanel');selector.append(installTab,cloneTab);
 const copyButton=btn('Copy',async()=>{const plan=installPlan(repo);await copy(repo,current==='clone'?'clone':'package');},'copy-command','Copy full command for '+repo.full_name);
 const download=btn('Open releases ↗',()=>openRepo(repo,'releases'),'download-link','Open verified release downloads for '+repo.full_name);
 function draw(tab=current){current=tab;commandTabs.set(repo.id,tab);const plan=installPlan(repo);installTab.textContent=plan.label;installTab.setAttribute('aria-selected',String(tab==='install'));cloneTab.setAttribute('aria-selected',String(tab==='clone'));installTab.tabIndex=tab==='install'?0:-1;cloneTab.tabIndex=tab==='clone'?0:-1;pre.setAttribute('aria-labelledby','tab-'+tab+'-'+repo.id);pre.textContent=tab==='clone'?plan.clone:plan.command||'Choose '+plan.downloadLabel+' from Releases';pre.title=pre.textContent;copyButton.hidden=tab==='install'&&!plan.command;download.hidden=tab==='clone'||!!plan.command;info.textContent=tab==='clone'?'Source code · requires Git':plan.command?'Package command · copied, never executed':'Select the asset matching your OS and CPU';}
 tabs.append(selector,copyButton);block.append(tabs,pre,info,download);block.refresh=draw;draw();return block;}
async function requestActivity(repo){if(!api.activity||activityPending.size>0||(activityStates.get(repo.id)?.expires||0)>Date.now())return;activityPending.add(repo.id);try{const entry=await api.activity(repo.id);activityStates.set(repo.id,{...entry,expires:Date.now()+(entry.status==='ready'?900000:60000)});if(activityStates.size>512)activityStates.delete(activityStates.keys().next().value);for(const node of document.querySelectorAll('[data-repo-id="'+repo.id+'"] .feed-activity'))fillActivity(repo,node);for(const code of document.querySelectorAll('[data-repo-id="'+repo.id+'"] .smart-code'))code.refresh?.();const row=document.querySelector('.repo-row[data-repo-id="'+repo.id+'"]');if(row){const velocity=entry.velocity;row.querySelector('.star-velocity').textContent=velocity?(velocity.delta>=0?'+':'')+velocity.delta+' stars / '+velocity.hours+'h':'Star trend: collecting daily samples';const action=row.querySelector('.row-install');if(action&&entry.install?.command)action.textContent='Copy install';}}catch(error){activityStates.set(repo.id,{status:'unavailable',error:error.message,expires:Date.now()+60000});}finally{activityPending.delete(repo.id);queueMicrotask(()=>{const next=repos().find(r=>(activityStates.get(r.id)?.expires||0)<=Date.now());if(next&&expanded&&!drawer)void requestActivity(next);});}}
function row(repo,index){
 const article=el('article',{class:'repo-row','data-repo-id':String(repo.id),'aria-label':repo.full_name,tabindex:'-1'}),identity=el('div',{class:'repo-identity'}),title=el('div',{class:'identity-title'}),avatar=el('img',{class:'owner-avatar',src:state.fixture?'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Ccircle cx="16" cy="16" r="16" fill="%23527a76"/%3E%3C/svg%3E':repo.avatar_url||'https://github.com/'+encodeURIComponent(repo.full_name.split('/')[0])+'.png?size=64',alt:'','aria-hidden':'true',loading:'lazy',decoding:'async',referrerpolicy:'no-referrer'}),initial=el('span',{class:'avatar-fallback','aria-hidden':'true'},repo.full_name[0].toUpperCase());avatar.addEventListener('error',()=>{avatar.hidden=true;});
 const name=el('h2',{class:'repo-name',tabindex:'-1'},repo.full_name);name.textContent=state.settings.showOwners?repo.full_name:repo.full_name.split('/')[1];name.title=repo.full_name;avatar.hidden=!state.settings.showOwners;initial.hidden=!state.settings.showOwners;title.append(initial,avatar,name);identity.append(title);
 const meta=el('div',{class:'repo-meta'});meta.append(el('span',{title:Intl.NumberFormat('en').format(repo.stargazers_count)+' stars'},compact(repo.stargazers_count)+' stars'),el('span',{},repo.language||'Open source'));identity.append(meta);
 const activity=el('p',{class:'feed-activity'});fillActivity(repo,activity);identity.append(activity);
 const velocity=activityStates.get(repo.id)?.velocity,rate=el('p',{class:'star-velocity'},velocity?(velocity.delta>=0?'+':'')+velocity.delta+' stars / '+velocity.hours+'h':'Star trend: collecting daily samples');rate.title='Measured from local GitHub star-count observations; no estimate is fabricated.';identity.append(rate);
 const feedLink=btn('Release RSS ↗',()=>openRepo(repo,'feed'),'rss-link','Open official GitHub release Atom feed for '+repo.full_name);identity.append(feedLink);
 const extra=el('div',{class:'row-extra'}),save=btn(state.saved.some(r=>r.id===repo.id)?'Bookmarked':'Bookmark',()=>react(repo,'save'),'','Bookmark '+repo.full_name);save.dataset.action='save';extra.append(save,btn('Skip',()=>react(repo,'skip'),'','Skip this pick; Undo is available'));const badges=ultimateBadges(repo);if(badges)identity.append(badges);if(state.settings.showQuickActions!==false)identity.append(extra);
 const text=el('div',{class:'repo-copy'});if(state.settings.showDescriptions)text.append(el('p',{class:'repo-description'},repo.description));if(state.settings.showReasons)text.append(el('p',{class:'repo-reason'},repo.reason||'A widely adopted project.'));
 const actions=el('div',{class:'row-actions'});actions.append(btn('Open Repo ↗',()=>{choose(repo.id);return openRepo(repo,'learn');},'row-learn','Open '+repo.full_name+' in browser'));if(!state.settings.showCommands)actions.append(btn(installPlan(repo).command?'Copy install':'Downloads',async()=>{if(installPlan(repo).command)return copy(repo,'package');const release=await checkRelease(repo);return openRepo(repo,release.available===false?'readme':'releases');},'row-install'));text.append(actions);article.append(identity,text);if(state.settings.showCommands)article.append(smartCode(repo));
 article.addEventListener('focusin',()=>choose(repo.id));article.addEventListener('pointerdown',()=>choose(repo.id));article.classList.toggle('selected',selectedId===repo.id);queueMicrotask(()=>void requestActivity(repo));return article;
}
function empty(title,body,action,label){const box=el('div',{class:'empty'});box.append(el('h2',{},title),el('p',{},body));if(action)box.append(btn(label,action,'secondary'));return box;}
function rowKey(repo){return JSON.stringify([repo.full_name,repo.description,repo.stargazers_count,repo.language,repo.reason,state.settings.showCommands,state.settings.showDescriptions,state.settings.showOwners,state.settings.showReasons,state.settings.exactStars,state.settings.showQuickActions,state.settings.showBadges,state.workspace?.records?.[repo.id]]);}
function reconcile(){
 const desired=visible();$('feed').querySelector('.empty')?.remove();
 if(!desired.length){for(const slot of slots){slot.version++;slot.effect?.cancel();slot.element.remove();}slots.length=0;$('feed').append(empty('No 70K+ projects match these filters.','Seen projects are reused automatically. Change language filters or restore hidden projects in Settings.',()=>changeSettings({minStars:70000,languages:[]}), 'Reset feed filters'));return;}
 for(let i=0;i<desired.length;i++){
  const repo=desired[i],key=rowKey(repo);let slot=slots[i];
  if(!slot){slot={element:el('div',{class:'repo-slot'}),version:0,id:null,key:null,desired:null,effect:null};slots[i]=slot;$('feed').append(slot.element);}
  if(slot.id===repo.id&&slot.key===key){if(slot.desired&&slot.desired!==key){slot.version++;slot.effect?.cancel();slot.desired=null;}slot.element.querySelector('.repo-row')?.classList.toggle('selected',repo.id===selectedId);continue;}
  if(slot.desired===key)continue;slot.desired=key;const serial=++slot.version;slot.effect?.cancel();const old=slot.element.firstElementChild,hadFocus=old?.contains(document.activeElement),changed=slot.id!==null&&slot.id!==repo.id;
  const rowMotion=canAnimate()&&expanded&&!drawer;
  const scene=DynamicFeed.transition(state.settings.transitionStyle,repo.id+i,{...IslandMotion.config(state.settings,matchMedia('(prefers-reduced-motion: reduce)').matches),duration:canAnimate()?IslandMorph.tempo(state.settings.cycleMotion,sceneSequence++):0});
  (async()=>{
   if(changed&&rowMotion&&old){slot.effect=old.animate(scene.exit,{...scene.options,duration:Math.round(scene.options.duration*.4)});try{await slot.effect.finished;}catch{}}
   if(serial!==slot.version)return;
   const node=row(repo,i);slot.element.replaceChildren(node);slot.id=repo.id;slot.key=key;slot.desired=null;
   if(hadFocus)node.querySelector('.repo-name').focus({preventScroll:true});
   if(changed&&rowMotion){slot.effect=node.animate(scene.enter,{...scene.options,delay:state.settings.stagger?i*20:0});try{await slot.effect.finished;}catch{}}
   if(serial!==slot.version)return;
   if(changed&&rowMotion&&state.settings.cycleAccent)node.animate([{outline:'1px solid #e8c89888',outlineOffset:'-2px'},{outline:'1px solid transparent',outlineOffset:'-2px'}],{duration:Math.min(400,scene.options.duration*3),easing:'ease-out'});
   requestFit();updateActions();
  })().catch(e=>toast(e.message));
 }
 while(slots.length>desired.length){const removed=slots.pop();removed.version++;removed.effect?.cancel();removed.element.remove();}
}
let fitFrame=0;
let fitKey='';
function requestFit(){
 if(fitFrame||!api||morphing||insightOpen||expanded&&drawer)return;
 fitFrame=requestAnimationFrame(()=>{
  fitFrame=0;if(morphing||insightOpen||expanded&&drawer)return;
  const height=desiredHeight(),mode=expanded?'panel':'collapsed',key=mode+':'+height+':'+innerWidth;
  if(key===fitKey)return;fitKey=key;
  api.fit({height,mode,requestId:transition}).then(reply=>{if(reply?.mode===(expanded?'panel':'collapsed'))updatePointerBounds(reply.bounds);}).catch(()=>{fitKey='';});
 });
}
function render(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;renderNow();});}
function renderNow(){
 if(!state)return;fitKey='';const prefs=state.settings;renderInsight();ultimateRender();
 for(const theme of ['graphite','contrast'])document.body.classList.toggle(theme,prefs.theme===theme);
 for(const [name,value]of Object.entries({compact:prefs.density==='compact',reduced:!canAnimate(),'no-commands':!prefs.showCommands,'wrap-names':prefs.wrapNames,'wrap-code':prefs.codeWrap}))document.body.classList.toggle(name,value);
 document.body.dataset.scale=String(UI.textScale(prefs.textScale));
 if(!drawer&&!repos().some(r=>r.id===selectedId))selectedId=repos()[0]?.id??null;
 renderSync();if(expanded&&!drawer)for(const repo of repos())void requestActivity(repo);$('next').disabled=!state.catalogSize;
 dynamicSync();if(!canAnimate()){rootAnimation?.cancel();for(const slot of slots)slot.effect?.cancel();}reconcile();updateActions();if(drawer)renderDrawer(false);requestFit();
 // Release checks are demand-driven: live rotation must not poll GitHub for every card.
 clearTimeout(releaseTimer);
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

 setting(grid,'theme','Panel theme','','select',[['reference','Warm / ocean'],['graphite','Graphite'],['contrast','High contrast']]);setting(grid,'density','Density','','select',[['comfortable','Comfortable'],['compact','Compact']]);setting(grid,'minStars','Minimum stars','','select',[[70000,'70K+'],[75000,'75K+'],[100000,'100K+'],[200000,'200K+']]);root.append(grid);
 const display=el('div',{class:'settings-grid'});
 setting(display,'textScale','Text size','Readable sizes across the entire interface.','select',[[100,'100%'],[115,'115%'],[130,'130%'],[150,'150%']]);
 setting(display,'motion','Animation preference','System mode respects reduced motion.','select',[['system','Follow system'],['full','Animate'],['none','No animation']]);
 setting(display,'motionDuration','Animation speed','','select',[[80,'Instant'],[140,'Quick'],[220,'Balanced'],[320,'Relaxed']]);
 setting(display,'visibleRows','Panel height','','select',[[1,'Compact'],[2,'Balanced'],[3,'Roomy']]);
 setting(display,'panelWidth','Preferred panel width','Clamped to your monitor.','select',[[960,'960 px'],[1080,'1080 px'],[1280,'1280 px'],[1440,'1440 px']]);
 setting(display,'toastSeconds','Message duration','','select',[[3,'3 seconds'],[5,'5 seconds'],[8,'8 seconds']]);
 for(const [key,title,description]of [['showCommands','Show source commands','Hide code blocks for a calmer feed.'],['showDescriptions','Show descriptions','Keep or hide project summaries.'],['showReasons','Show relevance explanations','Explain why a project is recommended.'],['shortcuts','Keyboard shortcuts','Disable letter shortcuts if preferred.'],['exactStars','Exact star counts','Display full cached counts instead of compact notation.'],['uniqueHistory','Unique history view','Show only the newest visit per project.']])setting(display,key,title,description);
 root.append(el('h3',{class:'subheading'},'Readability and interaction'),display);
 const resets=el('div',{class:'stack'});resets.append(btn('Reset appearance',()=>changeSettings({textScale:100,motion:'system',motionDuration:80,visibleRows:2,panelWidth:960,showCommands:true,showDescriptions:true,showOwners:true,showReasons:false,wrapNames:true,codeWrap:true,theme:'reference',density:'compact',opacity:100,reducedMotion:false}),'secondary'),btn('Reset feed filters',()=>changeSettings({minStars:70000,languages:[]}),'secondary'));root.append(resets);
 ultimateSettings(root);
 root.append(el('p',{class:'intro'},'Language filters - leave all unchecked for every language. Changes refill only projects that no longer match.'));
 const languages=el('div',{class:'stack'});(state.languages||[]).forEach(language=>{const selected=state.settings.languages.includes(language),b=btn(language,()=>changeSettings({languages:selected?state.settings.languages.filter(l=>l!==language):[...state.settings.languages,language]}),`secondary ${selected?'primary':''}`);b.setAttribute('aria-pressed',String(selected));languages.append(b);});root.append(languages);
 const controls=el('div',{class:'stack'});controls.append(btn(`Restore exclusions (${state.blockedOwners.length} owners / ${state.snoozedCount} snoozed)`,async()=>{const next=await api.resetControls();if(next){state=next;render();}},'secondary'),btn('Reset local data',async()=>{const next=await api.clear();if(next){state=next;render();}},'secondary danger'));root.append(el('p',{class:'intro'},'Shortcuts: J/K select row, Enter open, S save, U undo replacement, R refresh, / search, Escape close. Ctrl/Cmd+Shift+Space toggles the island. Summon with Ctrl/Cmd+Shift+P to dock on the active display.'),controls);
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
$('toggle').addEventListener('click',()=>run(async()=>{insightOpen=false;expanded=!expanded;if(!expanded)drawer=false;await windowMode();}));
$('collapse').addEventListener('click',()=>run(async()=>{insightOpen=false;expanded=false;drawer=false;await windowMode();}));
$('menu').addEventListener('click',()=>run(()=>drawer?closeDrawer():openDrawer('settings')));
$('closeDrawer').addEventListener('click',()=>run(closeDrawer));
$('refresh').addEventListener('click',()=>run(()=>refresh(true)));
$('next').addEventListener('click',()=>run(async()=>{if(pending.has('next'))return;pending.add('next');dynamicHoldUntil=Date.now()+1000;islandController?.hold('next picks',true);try{const result=await api.next();if(result.state)adopt(result.state);pair=0;selectedId=repos()[0]?.id??null;render();undoToast(result.changed?(result.revisited?'Revisiting earlier picks.':'New picks are ready.'):'No other eligible projects. Broaden your filters.');}finally{pending.delete('next');islandController?.hold('next picks',false);}}));
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>run(()=>openDrawer(b.dataset.tab))));
document.addEventListener('visibilitychange',()=>{if(document.hidden){rootAnimation?.cancel();for(const slot of slots)slot.effect?.cancel();}});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>render());
window.addEventListener('keydown',e=>{
 if(!state)return;
 const key=e.key.toLowerCase(),typing=e.target.isContentEditable||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName);
 if(key==='escape'){islandController?.pause(600);e.preventDefault();run(async()=>{if(drawer)await closeDrawer();else{insightOpen=false;expanded=false;await windowMode();}});return;}
 if((e.ctrlKey||e.metaKey)&&key==='k'){e.preventDefault();run(()=>openDrawer('commands'));return;}
 if((e.ctrlKey||e.metaKey)&&['+','=','-','0'].includes(key)){e.preventDefault();run(()=>changeSettings({textScale:key==='0'?100:UI.nextScale(state.settings.textScale,key==='-'?-1:1)}));return;}
 if(typing||!state?.settings.shortcuts||e.ctrlKey||e.metaKey||e.altKey)return;
 if(key==='j'||key==='k'){e.preventDefault();const rows=visible();if(!rows.length)return;const current=rows.findIndex(r=>r.id===selectedId),repo=rows[(Math.max(0,current)+(key==='j'?1:rows.length-1))%rows.length];choose(repo.id);document.querySelector('[data-repo-id="'+repo.id+'"] .repo-name')?.focus();}
 if(key==='enter'&&e.target===document.body&&selected())run(()=>openRepo(selected(),'learn'));
 if(key==='s'&&selected())run(()=>react(selected(),'save'));
 if(key==='u')run(undoLast);
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
 api.onMode?.(message=>{const next=UI.externalMode(message);if(!next)return;if(message?.insight){state={...state,insight:message.insight};renderInsight();}if(message?.bounds)pointerBounds=message.bounds;const nextExpanded=next!=='collapsed',nextDrawer=next==='workspace',nextInsight=next==='insight';if(nextExpanded===expanded&&nextDrawer===drawer&&nextInsight===insightOpen)return;transition++;rootAnimation?.cancel();hoverAnimation?.cancel();morphing=false;expanded=nextExpanded;drawer=nextDrawer;insightOpen=nextInsight;applyMode();if(nextInsight&&canAnimate())$('idleInsight').animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:200,easing:'cubic-bezier(.16,1,.3,1)'});document.body.classList.toggle('collapsed',!expanded);document.body.classList.toggle('workspace-open',expanded&&drawer);$('expanded').hidden=!expanded||insightOpen;$('drawer').hidden=!drawer;$('toggle').setAttribute('aria-expanded',String(expanded));$('menu').setAttribute('aria-expanded',String(drawer));islandController?.configure(state.settings,next);ultimateStatus();updatePointerBounds(pointerBounds);requestFit();if(drawer)renderDrawer(false);});
 new ResizeObserver(()=>{requestFit();updatePickRange();}).observe($('island'));$('feed').addEventListener('scroll',()=>{updatePickRange();dynamicHoldUntil=Date.now()+1000;},{passive:true});setInterval(renderSync,30000);if(state.windowMode==='collapsed'){expanded=false;drawer=false;$('expanded').hidden=true;document.body.classList.add('collapsed');}ultimateInit();render();if(state.recoveryNotice)toast(state.recoveryNotice);await refresh();
})().catch(e=>toast(e.message));


function renderSync(){if(!state)return;const sync=FeedUI.sync(state);$('status').textContent=sync.label;$('status').title=state.lastError||'Latest successful GitHub catalog sync';$('connectionDot').dataset.status=sync.tone;document.body.dataset.platform=state.platform;document.body.classList.toggle('opaque-surface',state.windowPolicy?.transparent===false);document.body.classList.toggle('docked',true);document.documentElement.style.setProperty('--surface-padding',(state.windowPolicy?.padding??8)+'px');$('commandButton').textContent=FeedUI.shortcut(state.platform);$('commandButton').title='Command palette ('+FeedUI.shortcut(state.platform)+')';$('commandButton').setAttribute('aria-label',$('commandButton').title);for(const repo of repos())for(const node of document.querySelectorAll('[data-repo-id="'+repo.id+'"] .feed-activity'))fillActivity(repo,node);}
