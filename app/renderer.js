'use strict';
const UI=window.RepoPulseUI,raw=window.pulse,$=id=>document.getElementById(id);
let miniRepoId=null,miniTimer=null,miniAnimation=null,miniOpen=false,insightOpen=false,morphing=false,sceneSequence=0,manualPaging=false;
let state,section='details',expanded=true,drawer=false,selectedId=null,pair=0,draft={},toastTimer,busy=false,search='',sort='recent',savedLanguage='',transition=0,rootAnimation=null,drawerStamp='',releaseTimer;
const pending=new Set(),slots=[],releaseStates=new Map(),releaseRequests=new Map();
const api=raw?{...raw}:null;
const rendererLifetime=new AbortController(),rendererCleanup=[];
function listen(target,event,callback,options={}){
 target.addEventListener(event,callback,{...options,signal:rendererLifetime.signal});
}
function onRendererCleanup(callback){if(typeof callback==='function')rendererCleanup.push(callback);}
window.addEventListener('beforeunload',()=>{
 rendererLifetime.abort();
 for(const cleanup of rendererCleanup.splice(0).reverse()){
  try{cleanup();}catch(error){console.error('Renderer cleanup failed:',error);}
 }
 for(const animation of document.getAnimations())animation.cancel();
},{once:true});
function adopt(next){if(!rendererLifetime.signal.aborted)state=UI.accept(state,next);return state;}

if(api)for(const name of ['state','open','react','undo','settings','profile','importProfile','importData','clear','clearHistory','resetControls','removeHistory','removeExclusion','workspacePatch','workspaceBulk','workspaceCollection'])if(raw[name])api[name]=async(...args)=>{const value=await raw[name](...args);return value?.settings&&value?.profile?adopt(value):value;};
function el(tag,props={},text){const e=document.createElement(tag);for(const [k,v]of Object.entries(props))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;if(props['aria-label'])e.dataset.focusKey=props['aria-label'];return e;}
function btn(text,action,cls='',label){const e=el('button',{class:cls},text);e.dataset.focusKey=label||text;if(label){e.setAttribute('aria-label',label);e.title=label;}e.addEventListener('click',()=>run(action));return e;}
let toastDeadline=0,toastRemaining=0,toastHovered=false;
const toastNotice=$('toast');
function dismissToast(){
 clearTimeout(toastTimer);toastTimer=null;toastNotice.hidden=true;toastHovered=false;
}
function scheduleToast(){
 if(toastNotice.hidden)return;
 if(toastTimer!=null){
  clearTimeout(toastTimer);toastTimer=null;
  toastRemaining=Math.max(0,toastDeadline-Date.now());
 }
 if(toastHovered||toastNotice.contains(document.activeElement))return;
 toastDeadline=Date.now()+toastRemaining;
 toastTimer=setTimeout(dismissToast,toastRemaining);
}
listen(toastNotice,'pointerenter',()=>{toastHovered=true;scheduleToast();});
listen(toastNotice,'pointerleave',()=>{toastHovered=false;scheduleToast();});
listen(toastNotice,'focusin',scheduleToast);
listen(toastNotice,'focusout',()=>queueMicrotask(scheduleToast));
function toast(message){
 if(insightOpen){dismissToast();$('insightReason').textContent=message;$('announcer').textContent=message;return;}
 clearTimeout(toastTimer);toastTimer=null;
 toastNotice.replaceChildren(el('span',{class:'toast-message'},message),btn('×',dismissToast,'toast-close','Dismiss message'));
 toastNotice.hidden=false;
 toastRemaining=(state?.settings.toastSeconds||5)*1000;
 scheduleToast();
}
async function run(fn){if(rendererLifetime.signal.aborted)return;try{await fn();}catch(error){if(!rendererLifetime.signal.aborted)toast(error.message||'Unable to complete this action.');}}
function repos(){return state?.daily?.repos||[];}
function selected(){return [...repos(),...(state?.saved||[]),...(state?.history||[]).map(h=>h.repo),...(state?.catalog||[])].find(r=>r.id===selectedId)||repos()[0]||null;}
function visible(){return repos();}
function canAnimate(){return UI.motion(state?.settings,matchMedia('(prefers-reduced-motion: reduce)').matches,document.hidden);}
async function effect(node,frames,duration){if(!node||!canAnimate())return;const a=node.animate(frames,{duration:duration||state.settings.motionDuration||220,easing:'cubic-bezier(.2,.8,.2,1)'});try{await a.finished;}catch{}}
function applyMode(){
 if(!expanded||miniOpen||insightOpen)manualPaging=false;
 if(insightOpen||miniOpen||!expanded)dismissToast();
 $('miniIsland').hidden=!miniOpen;document.body.classList.toggle('mini-open',miniOpen);
 $('expanded').hidden=!expanded||insightOpen||miniOpen;$('idleInsight').hidden=!insightOpen;$('drawer').hidden=!drawer;
 document.body.classList.toggle('collapsed',!expanded&&!insightOpen);document.body.classList.toggle('insight-open',insightOpen);document.body.classList.toggle('workspace-open',expanded&&drawer&&!insightOpen);
 syncMiniTimer();
 $('edgeReveal').setAttribute('aria-expanded',String(expanded));$('menu').setAttribute('aria-expanded',String(drawer));
}
function desiredHeight(){
 if(!expanded)return state.windowPolicy?.reveal?.height??16;
 if(drawer||insightOpen||miniOpen)return undefined;
 const feed=$('feed'),style=getComputedStyle(feed),columns=Number(style.getPropertyValue('--feed-columns'))||1,rows=[];
 [...feed.querySelectorAll('.repo-slot')].forEach((slot,index)=>{
  const row=Math.floor(index/columns);
  rows[row]=Math.max(rows[row]||0,slot.offsetHeight);
 });
 const island=$('island'),discovery=$('discoveryPanel'),px=(node,key)=>parseFloat(getComputedStyle(node)[key])||0;
 const padding=(state.windowPolicy?.padding??8)+px(island,'borderBottomWidth')+
  px(discovery,'paddingTop')+px(discovery,'paddingBottom');
 return IslandMorph.panelHeight({
  header:document.querySelector('.topbar').offsetHeight,
  heading:document.querySelector('.feed-heading').offsetHeight,footer:document.querySelector('footer').offsetHeight+$('notifications').offsetHeight,
  padding:Math.max(0,padding-12),gap:parseFloat(style.rowGap)||0,count:state.settings.visibleRows,
  rows,empty:feed.querySelector('.empty')?.offsetHeight||100
 });
}
async function showMini(focus=false){
 if(miniOpen)return;
 miniOpen=true;expanded=true;insightOpen=false;drawer=false;
 await windowMode();
 if(focus&&miniOpen)$('miniExpand').focus({preventScroll:true});
}
async function windowMode(){
 fitKey='';const serial=++transition,currentTransform=getComputedStyle($('island')).transform;
 rootAnimation?.cancel();hoverAnimation?.cancel();morphing=true;
 const node=$('island'),mode=miniOpen?'mini':insightOpen?'insight':expanded?(drawer?'workspace':'panel'):'collapsed',before=pointerBounds||state.windowBounds;
 const surfacePadding=state.windowPolicy?.padding??8,fromHidden=before?.height<=16;
 const duration=Math.max(220,IslandMorph.duration(state.settings,matchMedia('(prefers-reduced-motion: reduce)').matches));
 islandController?.configure(state.settings,mode==='mini'?'panel':mode);
 try{
  if(mode==='collapsed'&&before&&canAnimate()&&api.previewBounds){
   const target=await api.previewBounds(mode);if(serial!==transition)return;
   rootAnimation=node.animate([{transform:currentTransform==='none'?'none':currentTransform,opacity:1},
    {transform:IslandMorph.transform(before,IslandMorph.revealBounds(target),surfacePadding,0),opacity:.15}],
    {duration:180,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
   try{await rootAnimation.finished;}catch{}if(serial!==transition)return;
  }
  const reply=await api?.expand({mode,requestId:serial});if(serial!==transition)return;
  applyMode();ultimateStatus();
  updatePointerBounds(reply?.bounds);rootAnimation?.cancel();if(drawer)renderDrawer(false);
  if(mode!=='collapsed'&&before&&reply?.bounds&&canAnimate()){
   rootAnimation=node.animate([{transform:IslandMorph.transform(reply.bounds,fromHidden?IslandMorph.revealBounds(before):before,surfacePadding,fromHidden?0:surfacePadding),opacity:.85},
    {transform:'none',opacity:1}],{duration,easing:'cubic-bezier(.16,1,.3,1)'});
   const contents=mode==='mini'?[$('miniIsland')]:[document.querySelector('.topbar'),$('expanded')];
   for(const content of contents)content.animate([{opacity:0},{opacity:0,offset:.18},{opacity:1}],{duration,easing:'ease-out'});
   try{await rootAnimation.finished;}catch{}if(serial!==transition)return;rootAnimation.cancel();
  }
 }finally{if(serial===transition){rootAnimation?.cancel();morphing=false;ultimateStatus();ultimateMagnify(!!islandController?.pointer);requestFit();}}
}
async function openDrawer(tab){miniOpen=false;insightOpen=false;if(tab==='library'&&section!=='library')uFilters.pinnedFirst=state.settings.pinnedFirst;section=tab;drawer=true;expanded=true;if(tab==='professional')professionalSnapshot=await api.professionalGet(professionalDomain,false);if(tab==='metadata'){metadataRepo=metadataRepo||selected();metadataSources=await api.metadataSources();}if(tab==='tune')draft={...state.profile.weights};search='';drawerStamp='';await windowMode();renderDrawer();}
async function closeDrawer(){drawer=false;await windowMode();$('toggle').focus({preventScroll:true});}
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
  releaseStates.set(repo.id,value);if(releaseStates.size>256)releaseStates.delete(releaseStates.keys().next().value);for(const block of document.querySelectorAll('[data-repo-id="'+repo.id+'"] .smart-code'))block.refresh?.();updateActions();if(drawer&&section==='details'&&selectedId===repo.id)renderDrawer(false);return value;
 })();
 releaseRequests.set(repo.id,request);try{return await request;}finally{releaseRequests.delete(repo.id);}
}
function compactProjects(){
 const catalog=new Map((state.catalog||[]).map(repo=>[repo.id,repo]));
 const picks=[...repos(),...(state.feed?.queueIds||[]).map(id=>catalog.get(id)).filter(Boolean)];
 return [...new Map(picks.map(repo=>[repo.id,repo])).values()];
}
function fitMiniSummary(){
 const text=$('miniSummary');
 if(!miniOpen||!text.clientWidth)return;
 text.classList.add('measuring');
 for(const fit of ['0','1','2','3']){
  text.dataset.fit=fit;
  const style=getComputedStyle(text);
  if(text.scrollHeight<=Math.ceil(parseFloat(style.lineHeight)*3)&&text.scrollHeight<=47)break;
 }
 text.classList.remove('measuring');
}
function compactRepo(id=miniRepoId){
 const picks=compactProjects();
 const current=picks.find(repo=>repo.id===id);
 return current||UI.dockModel(picks,selectedId).repo;
}
function updateMini(preferredId=miniRepoId){
 if(!miniOpen)return;
 const repo=compactRepo(preferredId),id=repo?.id??null,changed=miniRepoId!==id;
 miniRepoId=id;
 const release=state.releaseMetadata?.[id];
 const tag=release?.fullName===repo?.full_name?release?.tag:null;
 const text=$('miniSummary');
 const summary=repo?UI.compactSummary(repo.description):'Open the panel to discover projects.';
 $('miniTitle').textContent=repo?.full_name.split('/')[1]||'RepoPulse';
 $('miniTitle').title=repo?.full_name||'RepoPulse';
 if(text.textContent!==summary){text.textContent=summary;text.title=summary;}
 fitMiniSummary();
 $('miniLink').disabled=!repo;
 const label=tag?'Open '+tag+' on GitHub':'Open GitHub releases';
 $('miniLink').title=label;
 $('miniLink').setAttribute('aria-label',label);
 const avatar=$('miniAvatar'),key=id+':'+(repo?.avatar_url||'');
 if(avatar.dataset.repo!==key){
  avatar.dataset.repo=key;avatar.textContent=repo?.full_name[0].toUpperCase()||'R';
  if(repo?.avatar_url&&!state.fixture){
   const img=el('img',{src:repo.avatar_url,alt:'',referrerpolicy:'no-referrer'});
   img.addEventListener('error',()=>img.remove());avatar.append(img);
  }
 }
 if(changed&&canAnimate()){
  miniAnimation?.cancel();
  miniAnimation=$('miniExpand').animate([{opacity:.25,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],
   {duration:260,easing:'cubic-bezier(.2,.75,.25,1)'});
 }
}
function syncMiniTimer(){
 if(!miniOpen||document.hidden){
  clearInterval(miniTimer);miniTimer=null;
  miniAnimation?.cancel();
  if(!miniOpen)miniRepoId=null;
  return;
 }
 updateMini();
 if(miniTimer!==null)return;
 miniTimer=setInterval(()=>{
  const picks=compactProjects();
  if(picks.length<2)return;
  const index=picks.findIndex(repo=>repo.id===miniRepoId);
  updateMini(picks[(index+1)%picks.length].id);
 },5000);
}
function updateActions(){
 const repo=selected();
 updateMini();
 if($('workspaceContext'))$('workspaceContext').textContent=repo?.full_name||'Your discovery workspace';
 for(const row of document.querySelectorAll('.repo-row')){
  const id=Number(row.dataset.repoId),save=row.querySelector('[data-action="save"]'),saved=state.saved.some(item=>item.id===id);
  if(save){save.textContent=saved?'Bookmarked':'Bookmark';save.setAttribute('aria-pressed',String(saved));}
 }
 updatePickRange();
}
async function undoLast(){if(!state.canUndo)return;dynamicHoldUntil=Date.now()+1000;adopt(await api.undo());selectedId=repos()[0]?.id??null;render();toast('Previous picks restored.');}
function undoToast(message){toast(message);if(!insightOpen&&state.canUndo)toastNotice.insertBefore(btn('Undo',undoLast,'toast-undo','Undo last replacement'),toastNotice.lastElementChild);}
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
async function react(repo,action){const key='reaction:'+repo.id;if(pending.has(key))return;pending.add(key);try{const before=state.revision;adopt(await api.react(repo.id,action,state.feed?.epoch));render();if(state.revision===before)return;if(action==='skip'){if(repos().some(item=>item.id===repo.id))toast('No replacement is available for this pick.');else undoToast('Skipped '+repo.full_name+'.');return;}toast(({save:'Collection updated.',like:'Preference recorded.',hide:'Repository hidden.',snooze:'Snoozed for 7 days.',block:'Owner excluded.'})[action]);}finally{pending.delete(key);}}
async function copy(repo,kind){await api.copy(repo.id,kind);toast(kind==='markdown'?'Markdown link copied.':kind==='url'?'Repository link copied.':'Command copied for '+repo.full_name+'.');}
function codeBlock(repo,kind,label,cls=''){const block=el('div',{class:'code-block '+cls}),top=el('div',{class:'code-top'});top.append(el('span',{},label),btn('Copy',()=>copy(repo,kind),'', 'Copy '+kind+' command for '+repo.full_name));block.append(top,el('pre',{},commands(repo)[kind]));return block;}
const activityStates=new Map(),activityPending=new Set(),commandTabs=new Map();
function starTrend(repo){
 const record=state?.starTrends?.[repo.id],trend=record?.velocity??activityStates.get(repo.id)?.velocity;
 if(trend)return (trend.delta>=0?'+':'')+trend.delta+' stars / '+trend.hours+'h'+(trend.weekly!=null&&trend.hours===24?' · '+(trend.weekly>=0?'+':'')+trend.weekly+' / 7d':'');
 const today=new Date().toISOString().slice(0,10);
 return record?.baseline===today?'Star trend · baseline recorded today':record?.baseline?'Star trend · waiting for a comparable UTC day':'Star trend · awaiting first GitHub sample';
}
function fillActivity(repo,node){const cached=state?.releaseMetadata?.[repo.id],current=activityStates.get(repo.id)||{};const entry=cached?.fullName===repo.full_name&&(!current.releaseChecked||Date.parse(cached.checkedAt)>Date.parse(current.checkedAt))?{...current,...cached}:current;node.textContent=FeedUI.activity(repo,entry);node.title=entry.checkedAt?'GitHub activity checked '+new Date(entry.checkedAt).toLocaleString():'Repository push timestamp from the catalog';}
function installPlan(repo){if(!repo)return{command:null,label:'Downloads',clone:''};return activityStates.get(repo.id)?.install||{label:'Downloads',command:null,downloadLabel:({win32:'.exe / .msi',darwin:'.dmg / .zip',linux:'.rpm / .deb / AppImage'})[state.platform]||'release assets',clone:commands(repo).clone};}
function smartCode(repo){const block=el('div',{class:'code-block smart-code'}),tabs=el('div',{class:'code-top'}),selector=el('div',{class:'command-tabs',role:'tablist','aria-label':'Command for '+repo.full_name}),pre=el('pre',{tabindex:'0'}),info=el('span',{class:'command-hint'});let current=commandTabs.get(repo.id)||'install';
 const installTab=btn('Install',()=>draw('install'),'command-tab'),cloneTab=btn('Git Clone',()=>draw('clone'),'command-tab');for(const [b,key]of [[installTab,'install'],[cloneTab,'clone']]){b.setAttribute('role','tab');b.id='tab-'+key+'-'+repo.id;b.setAttribute('aria-controls','code-'+repo.id);b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();draw(e.key==='Home'?'install':e.key==='End'?'clone':current==='install'?'clone':'install');(current==='install'?installTab:cloneTab).focus();}});}pre.id='code-'+repo.id;pre.setAttribute('role','tabpanel');selector.append(installTab,cloneTab);
 const copyButton=btn('Copy',async()=>{const plan=installPlan(repo);await copy(repo,current==='clone'?'clone':'package');},'copy-command','Copy full command for '+repo.full_name);
 const download=btn('Check GitHub releases',()=>checkRelease(repo,true),'download-link','Check releases for '+repo.full_name);
 const assets=el('div',{class:'release-assets'});
 function draw(tab=current){current=tab;commandTabs.delete(repo.id);commandTabs.set(repo.id,tab);if(commandTabs.size>256)commandTabs.delete(commandTabs.keys().next().value);const plan=installPlan(repo);installTab.textContent=plan.label;installTab.setAttribute('aria-selected',String(tab==='install'));cloneTab.setAttribute('aria-selected',String(tab==='clone'));installTab.tabIndex=tab==='install'?0:-1;cloneTab.tabIndex=tab==='clone'?0:-1;pre.setAttribute('aria-labelledby','tab-'+tab+'-'+repo.id);pre.textContent=tab==='clone'?plan.clone:plan.command||'GitHub release assets';pre.title=pre.textContent;copyButton.hidden=tab==='install'&&!plan.command;download.hidden=tab==='clone'||!!plan.command;const release=releaseStates.get(repo.id),matches=release?.assets||[];
  assets.replaceChildren();
  const showAssets=tab==='install'&&!plan.command;
  assets.hidden=!showAssets;
  if(showAssets&&matches.length){
   for(const asset of matches)assets.append(btn(asset.name+' · '+(asset.size/1048576).toFixed(1)+' MiB',()=>api.asset(repo.id,asset.url),'','Download '+asset.name));
   assets.append(btn('Open Releases ↗',()=>openRepo(repo,'releases'),''));
  }
  info.textContent=tab==='clone'?'Source code · requires Git':plan.command?'Package command · copied, never executed':
   matches.length?'Verified assets for this OS and CPU':release?.available!=null?'No binary installers published for '+({win32:'Windows',darwin:'macOS',linux:'Linux'}[state.platform]||'this OS')+' / '+(state.arch||'this CPU')+'. Try Git Clone.':release?.error||'Check GitHub for matching downloads.';
  download.hidden=!showAssets||release?.available!=null;}
 tabs.append(selector,copyButton);block.append(tabs,pre,info,assets,download);block.refresh=draw;draw();return block;}
async function requestActivity(repo){if(!api.activity||activityPending.size>0||(activityStates.get(repo.id)?.expires||0)>Date.now())return;activityPending.add(repo.id);try{const entry=await api.activity(repo.id);activityStates.set(repo.id,{...entry,expires:Date.now()+(entry.status==='ready'?900000:60000)});if(activityStates.size>512)activityStates.delete(activityStates.keys().next().value);for(const node of document.querySelectorAll('[data-repo-id="'+repo.id+'"] .feed-activity'))fillActivity(repo,node);for(const code of document.querySelectorAll('[data-repo-id="'+repo.id+'"] .smart-code'))code.refresh?.();const row=document.querySelector('.repo-row[data-repo-id="'+repo.id+'"]');if(row){row.querySelector('.star-velocity').textContent=starTrend(repo);const action=row.querySelector('.row-install');if(action&&entry.install?.command)action.textContent='Copy install';}}catch(error){activityStates.set(repo.id,{status:'unavailable',error:error.message,expires:Date.now()+60000});}finally{activityPending.delete(repo.id);queueMicrotask(()=>{const next=repos().find(r=>(activityStates.get(r.id)?.expires||0)<=Date.now());if(next&&expanded&&!drawer)void requestActivity(next);});}}
function row(repo,index){
 const article=el('article',{class:'repo-row','data-repo-id':String(repo.id),'aria-label':repo.full_name,tabindex:'-1'}),identity=el('div',{class:'repo-identity'}),title=el('div',{class:'identity-title'}),avatar=el('img',{class:'owner-avatar',src:state.fixture?'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Ccircle cx="16" cy="16" r="16" fill="%23687285"/%3E%3C/svg%3E':repo.avatar_url||'https://github.com/'+encodeURIComponent(repo.full_name.split('/')[0])+'.png?size=64',alt:'','aria-hidden':'true',loading:'eager',decoding:'async',referrerpolicy:'no-referrer'}),initial=el('span',{class:'avatar-fallback','aria-hidden':'true'},repo.full_name[0].toUpperCase());avatar.addEventListener('error',()=>{avatar.hidden=true;});
 const name=el('button',{class:'repo-name',type:'button', 'aria-label':'Open '+repo.full_name+' on GitHub'},repo.full_name.split('/')[1]);name.title=repo.full_name;name.addEventListener('click',()=>run(()=>openRepo(repo)));avatar.hidden=!!state.fixture||!state.settings.showOwners;initial.hidden=!state.settings.showOwners;title.append(initial,avatar,name);identity.append(title);
 const meta=el('div',{class:'repo-meta'});meta.append(el('span',{title:Intl.NumberFormat('en').format(repo.stargazers_count)+' stars'},compact(repo.stargazers_count)+' stars'),el('span',{},repo.language||'Open source'));identity.append(meta);
 const activity=el('p',{class:'feed-activity'});fillActivity(repo,activity);identity.append(activity);
 const rate=el('p',{class:'star-velocity'},starTrend(repo));rate.title='Measured from local GitHub star-count observations; no estimate is fabricated.';identity.append(rate);
 const feedLink=btn('Release RSS ↗',()=>openRepo(repo,'feed'),'rss-link','Open official GitHub release Atom feed for '+repo.full_name);identity.append(feedLink);
 const extra=el('div',{class:'row-extra'}),save=btn(state.saved.some(r=>r.id===repo.id)?'Bookmarked':'Bookmark',()=>react(repo,'save'),'','Bookmark '+repo.full_name);save.dataset.action='save';extra.append(btn('Overview',()=>{choose(repo.id);return openDrawer('details');},'','Overview for '+repo.full_name),save,btn('Skip',()=>react(repo,'skip'),'','Skip this pick; Undo is available'));const badges=ultimateBadges(repo);if(badges)identity.append(badges);if(state.license?.active&&api.plusToggle){const watched=state.plusRepos?.some(item=>item.id===repo.id);const watch=btn(watched?'Watching':'Watch',async()=>{adopt(await api.plusToggle(repo.id));render();},'', 'Toggle RSS+ watchlist for '+repo.full_name);watch.setAttribute('aria-pressed',String(!!watched));extra.append(watch);}if(state.settings.showQuickActions!==false)identity.append(extra);
 const summary=el('div',{class:'repo-summary'});
 if(state.settings.showDescriptions)summary.append(el('p',{class:'repo-description'},repo.description));
 if(state.settings.showReasons)summary.append(el('p',{class:'repo-reason'},repo.reason||'A widely adopted project.'));
 identity.insertBefore(summary,extra.parentNode===identity?extra:null);
 article.append(identity);
 article.addEventListener('contextmenu',event=>{event.preventDefault();choose(repo.id);run(()=>openDrawer('details'));});article.addEventListener('focusin',()=>choose(repo.id));article.addEventListener('pointerdown',()=>choose(repo.id));article.classList.toggle('selected',selectedId===repo.id);queueMicrotask(()=>void requestActivity(repo));return article;
}
function empty(title,body,action,label){const box=el('div',{class:'empty'});box.append(el('h2',{},title),el('p',{},body));if(action)box.append(btn(label,action,'secondary'));return box;}
function rowKey(repo){return JSON.stringify([repo.full_name,repo.description,repo.stargazers_count,repo.language,repo.reason,state.settings.showCommands,state.settings.showDescriptions,state.settings.showOwners,state.settings.showReasons,state.settings.exactStars,state.settings.showQuickActions,state.settings.showBadges,!!state.license?.active,!!state.plusRepos?.some(item=>item.id===repo.id),state.workspace?.records?.[repo.id]]);}
function catalogMinimum(){return state.catalogPolicy?.MIN_STARS||5000;}
function reconcile(){
 const desired=visible();
 const batchSwap=slots.filter((slot,index)=>slot.id!==null&&desired[index]&&slot.id!==desired[index].id).length>1;
 $('feed').querySelector('.empty')?.remove();
 if(!desired.length){for(const slot of slots){slot.version++;slot.effect?.cancel();slot.element.remove();}slots.length=0;$('feed').append(empty('No projects match these filters.','Seen projects are reused automatically. Change language filters or restore hidden projects in Settings.',()=>changeSettings({minStars:catalogMinimum(),languages:[],topics:[]}), 'Reset feed filters'));return;}
 for(let i=0;i<desired.length;i++){
  const repo=desired[i],key=rowKey(repo);let slot=slots[i];
  if(!slot){slot={element:el('div',{class:'repo-slot'}),version:0,id:null,key:null,desired:null,effect:null};slots[i]=slot;$('feed').append(slot.element);}
  if(slot.id===repo.id&&slot.key===key){if(slot.desired&&slot.desired!==key){slot.version++;slot.effect?.cancel();slot.desired=null;}slot.element.querySelector('.repo-row')?.classList.toggle('selected',repo.id===selectedId);continue;}
  if(slot.desired===key)continue;slot.desired=key;const serial=++slot.version;slot.effect?.cancel();const old=slot.element.firstElementChild,hadFocus=old?.contains(document.activeElement),changed=slot.id!==null&&slot.id!==repo.id;
  const rowMotion=canAnimate()&&expanded&&!drawer&&!miniOpen;
  const scene=DynamicFeed.transition(state.settings.transitionStyle,repo.id+i,{...IslandMotion.config(state.settings,matchMedia('(prefers-reduced-motion: reduce)').matches),duration:canAnimate()?IslandMorph.tempo(state.settings.cycleMotion,sceneSequence++):0});
  (async()=>{
   if(changed&&rowMotion&&old){slot.effect=old.animate([{opacity:1,transform:'translateY(0) scale(1)',filter:'blur(0px)'},{opacity:0,transform:'translateY(-10px) scale(.98)',filter:'blur(2px)'}],{duration:180,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});try{await slot.effect.finished;}catch{}}
   if(serial!==slot.version)return;
   // Focus can enter after the timer/request starts or during an exit animation.
   // Keep the existing card intact; focusout will retry reconciliation.
   if(changed&&old?.contains(document.activeElement)){slot.effect?.cancel();slot.desired=null;return;}
   const node=row(repo,i);slot.element.replaceChildren(node);slot.id=repo.id;slot.key=key;slot.desired=null;
   if(hadFocus)node.querySelector('.repo-name').focus({preventScroll:true});
   if(changed&&rowMotion){slot.effect=node.animate([{opacity:0,transform:'translateY(10px) scale(.98)',filter:'blur(2px)'},{opacity:1,transform:'translateY(0) scale(1)',filter:'blur(0px)'}],{duration:360,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});try{await slot.effect.finished;}catch{}}
   if(serial!==slot.version)return;
   if(changed&&rowMotion&&state.settings.cycleAccent)node.animate([{outline:'1px solid '+getComputedStyle(node).getPropertyValue('--accent-border').trim(),outlineOffset:'-2px'},{outline:'1px solid transparent',outlineOffset:'-2px'}],{duration:Math.min(400,scene.options.duration*3),easing:'ease-out'});
   requestFit();updateActions();
  })().catch(e=>toast(e.message));
 }
 while(slots.length>desired.length){const removed=slots.pop();removed.version++;removed.effect?.cancel();removed.element.remove();}
}
let fitKey='';
const queueFit=UI.renderQueue(()=>{
 if(!api||morphing||insightOpen||miniOpen||expanded&&drawer)return;
 const height=desiredHeight(),mode=expanded?'panel':'collapsed',key=mode+':'+height+':'+innerWidth;
 if(height===undefined||key===fitKey)return;fitKey=key;
 api.fit({height,mode,requestId:transition}).then(reply=>{if(reply?.mode===(expanded?'panel':'collapsed'))updatePointerBounds(reply.bounds);}).catch(()=>{fitKey='';});
});
function requestFit(){if(!api||morphing||insightOpen||miniOpen||expanded&&drawer)return;queueFit();}
const queueRender=UI.renderQueue(()=>renderNow());
function render(){queueRender();}
onRendererCleanup(()=>{queueFit.cancel();queueRender.cancel();});
function renderNow(){
 if(!state)return;fitKey='';const prefs=state.settings;document.body.classList.toggle('rss-dark',!['light','contrast'].includes(prefs.theme));renderInsight();ultimateRender();
 document.body.classList.toggle('graphite',prefs.theme==='graphite'||prefs.theme==='reference'&&matchMedia('(prefers-color-scheme: dark)').matches);
 document.body.classList.toggle('contrast',prefs.theme==='contrast');
 for(const [name,value]of Object.entries({compact:prefs.density==='compact',reduced:!canAnimate(),'no-commands':!prefs.showCommands,'wrap-names':prefs.wrapNames,'wrap-code':prefs.codeWrap}))document.body.classList.toggle(name,value);
 document.body.dataset.scale=String(UI.textScale(prefs.textScale));
 $('pinButton').setAttribute('aria-pressed',String(prefs.pinned));
 $('pinButton').title=prefs.pinned?'Turn off Always on top':'Turn on Always on top';
 if(!drawer&&!repos().some(r=>r.id===selectedId))selectedId=repos()[0]?.id??null;
 renderSync();if(expanded&&!drawer)for(const repo of repos())void requestActivity(repo);renderPagination();
 dynamicSync();if(!canAnimate()){rootAnimation?.cancel();for(const slot of slots)slot.effect?.cancel();}reconcile();updateActions();if(drawer)renderDrawer(false);requestFit();
 // Release checks are demand-driven: live rotation must not poll GitHub for every card.
 clearTimeout(releaseTimer);
}
function heading(root,title,actions=[]){const h=el('div',{class:'drawer-heading'});h.append(el('h2',{},title));const stack=el('div',{class:'stack'});stack.append(...actions);h.append(stack);root.append(h);}
function overview(root){const repo=selected();if(!repo){root.append(empty('Nothing selected yet.','Choose a repository when your feed is ready.'));return;}
 heading(root,repo.full_name,[btn('Save',()=>react(repo,'save'),'secondary'),btn('Open repository',()=>openRepo(repo),'primary')]);root.append(el('p',{class:'intro'},repo.description),el('div',{class:'notice'},repo.reason||'Selected from the established open-source catalog.'));
 const release=releaseStates.get(repo.id);root.append(el('p',{class:'notice'},release?.available===true?'Public release available: '+release.tag:release?.available===false?'No public release. Use Guide to read setup instructions.':release?.error||'Release availability is checked before opening Install.'));const stats=el('div',{class:'stat-row'});for(const [value,label]of [[compact(repo.stargazers_count),'GitHub stars'],[repo.language||'Mixed','language'],[repo.license||'Not specified','license'],[repo.pushed_at?new Date(repo.pushed_at).toLocaleDateString():'Unknown','last push']]){const box=el('div',{class:'stat'});box.append(el('b',{},value),el('span',{},label));stats.append(box);}root.append(stats);
 const tags=el('div',{class:'stack'});(repo.topics||[]).slice(0,8).forEach(t=>tags.append(el('span',{class:'tag'},t)));root.append(tags);
 if(state.settings.showCommands){
  const columns=el('div',{class:'detail-columns','data-repo-id':String(repo.id)});
  columns.append(smartCode(repo),codeBlock(repo,'inspect','Inspect a local clone'));root.append(columns);
 }
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
async function changeSettings(update){
 if(update.dynamicRefresh===true)dynamicScheduler?.resume();
 if(update.dynamicRefresh===false||update.reducedMotion===true||update.motion==='none')dynamicScheduler?.suspend();
 adopt(await api.settings(update));render();
}
function setting(root,key,title,detail,kind='checkbox',options){const label=el('label',{class:'setting'}),text=el('div');text.append(el('span',{},title));if(detail)text.append(el('small',{},detail));let input;
 if(kind==='select'){input=el('select',{'aria-label':title});for(const [value,name]of options)input.append(el('option',{value},name));input.value=String(state.settings[key]);}
 else{input=el('input',{type:kind,'aria-label':title});if(kind==='checkbox'){input.setAttribute('role','switch');input.checked=!!state.settings[key];}else{input.min='65';input.max='100';input.value=String(state.settings[key]);}}
 input.addEventListener('change',()=>run(async()=>{try{await changeSettings({[key]:kind==='checkbox'?input.checked:kind==='range'||key==='minStars'?Number(input.value):input.value});}catch(e){renderDrawer();throw e;}}));label.append(text,input);root.append(label);
}
function settingsView(root){heading(root,'Settings',[btn('Export RSS',()=>api.exportRss(),'secondary'),btn('Hide panel',()=>api.hide(),'secondary'),btn('Quit',()=>api.quit(),'secondary')]);
 const grid=el('div',{class:'settings-grid'});
 const topicLabel=el('label',{class:'setting'}),topicInput=el('input',{type:'text',placeholder:'e.g. cli, rust','aria-label':'Discovery topics'});
 topicInput.value=(state.settings.topics||[]).join(', ');
 topicInput.addEventListener('change',()=>run(()=>changeSettings({topics:topicInput.value.split(',').map(value=>value.trim()).filter(Boolean)})));
 topicLabel.append(el('span',{},'Discovery topics'),topicInput);grid.append(topicLabel);
 setting(grid,'cooldownWindowMs','Replay cooldown','','select',[[1800000,'30 minutes'],[43200000,'12 hours'],[86400000,'24 hours']]);
 for(const [key,title,detail]of [['autoReplace','Replace after opening','The clicked row is replaced with a new unseen project.'],['pinned','Always on top','Keep the panel above other windows.'],['hoverExpand','Expand on hover','Reveal a collapsed panel when the pointer enters.'],['reducedMotion','Reduced motion','Disable entry animations.'],['pausedLearning','Pause reaction learning','Keep manual interests without learning from opens and likes.'],['notifications','New-day notification','Notify when a new day of discoveries is ready.'],['launchAtLogin','Launch at login','Start RepoPulse when you sign in.']])setting(grid,key,title,detail);

setting(grid,'density','Density','','select',[['comfortable','Comfortable'],['compact','Compact']]);setting(grid,'minStars','Minimum stars','','select',[[5000,'5K+'],[10000,'10K+'],[20000,'20K+'],[25000,'25K+'],[50000,'50K+'],[70000,'70K+'],[75000,'75K+'],[100000,'100K+'],[200000,'200K+']]);
 const display=el('div',{class:'settings-grid'});
 setting(display,'theme','Panel theme','','select',[['reference','RSS dark'],['light','Light'],['graphite','Dark'],['contrast','High contrast']]);
 setting(display,'textScale','Text size','Readable sizes across the entire interface.','select',[[100,'100%'],[115,'115%'],[130,'130%'],[150,'150%']]);
 setting(display,'motion','Animation preference','System mode respects reduced motion.','select',[['system','Follow system'],['full','Animate'],['none','No animation']]);
 setting(display,'motionDuration','Animation speed','','select',[[80,'Instant'],[140,'Quick'],[220,'Balanced'],[320,'Relaxed']]);
 setting(display,'visibleRows','Panel height','','select',[[1,'Compact'],[2,'Balanced'],[3,'Roomy']]);
 setting(display,'panelWidth','Preferred panel width','Clamped to your monitor.','select',[[920,'920 px'],[1080,'1080 px'],[1280,'1280 px'],[1440,'1440 px']]);
 setting(display,'toastSeconds','Message duration','','select',[[3,'3 seconds'],[5,'5 seconds'],[8,'8 seconds']]);
 for(const [key,title,description]of [['showCommands','Show source commands','Hide code blocks for a calmer feed.'],['showDescriptions','Show descriptions','Keep or hide project summaries.'],['showReasons','Show relevance explanations','Explain why a project is recommended.'],['shortcuts','Keyboard shortcuts','Disable letter shortcuts if preferred.'],['exactStars','Exact star counts','Display full cached counts instead of compact notation.'],['uniqueHistory','Unique history view','Show only the newest visit per project.']])setting(display,key,title,description);
 root.append(el('h3',{class:'subheading'},'Appearance'),display,el('h3',{class:'subheading'},'Discovery and startup'),grid);
 const resets=el('div',{class:'stack'});resets.append(btn('Reset appearance',()=>changeSettings({textScale:100,motion:'system',motionDuration:80,visibleRows:2,panelWidth:920,showCommands:true,showDescriptions:true,showOwners:true,showReasons:false,wrapNames:true,codeWrap:true,theme:'reference',density:'compact',opacity:100,reducedMotion:false}),'secondary'),btn('Reset feed filters',()=>changeSettings({minStars:catalogMinimum(),languages:[]}),'secondary'));root.append(resets);
 ultimateSettings(root);
 if(api.testNotification){
  const messages={shown:'Test notification sent.',requested:'Notification requested. Check your system notification center.',failed:'System notification failed. Check OS permissions for RepoPulse.',unavailable:'System notifications are unavailable.'};
  root.append(el('h3',{class:'subheading'},'Notifications'),btn('Send test notification',async()=>toast(messages[await api.testNotification()]),'secondary'));
 }
 if(api.githubToken){
  const credential=el('input',{type:'password',autocomplete:'off','aria-label':'GitHub API token',placeholder:'Optional GitHub API token'});
  const security=el('div',{class:'stack'});
  async function updateToken(value){
   const request=api.githubToken(value);credential.value='';
   const result=await request;adopt(result.state);render();
   toast(result.error||'GitHub credential settings updated.');
  }
  security.append(credential,btn('Save token',()=>updateToken(credential.value),'secondary'),btn('Remove token',()=>updateToken(''),'secondary'));
  root.append(el('h3',{class:'subheading'},'GitHub authentication'),el('p',{class:'intro'},state.githubTokenNotice||(state.githubTokenConfigured?'Token protected by the OS keychain.':'Public GitHub API access.')),security);
 }
 if(api.recover){
  const recovery=el('div',{class:'stack'});
  for(const [kind,label] of [['diagnostics','Export diagnostics'],['rebuild','Clear queue and rebuild'],['cache','Reset catalog cache']]){
   recovery.append(btn(label,async()=>{const result=await api.recover(kind);if(result?.settings){adopt(result);render();}},'secondary'));
  }
  root.append(el('h3',{class:'subheading'},'Diagnostics'),recovery);
 }
 root.append(el('p',{class:'intro'},'Language filters - leave all unchecked for every language. Changes refill only projects that no longer match.'));
 const languages=el('div',{class:'stack'});(state.languages||[]).forEach(language=>{const selected=state.settings.languages.includes(language),b=btn(language,()=>changeSettings({languages:selected?state.settings.languages.filter(l=>l!==language):[...state.settings.languages,language]}),`secondary ${selected?'primary':''}`);b.setAttribute('aria-pressed',String(selected));languages.append(b);});root.append(languages);
 const controls=el('div',{class:'stack'});controls.append(btn(`Restore exclusions (${state.blockedOwners.length} owners / ${state.snoozedCount} snoozed)`,async()=>{const next=await api.resetControls();if(next){state=next;render();}},'secondary'),btn('Reset local data',async()=>{const next=await api.clear();if(next){resetWorkspaceView();state=next;selectedId=null;search='';savedLanguage='';render();toast('Local data and unsaved drafts reset.');}},'secondary danger'));root.append(el('p',{class:'intro'},'Shortcuts: J/K select row, Enter open, S save, U undo replacement, R refresh, / search, Escape close. Ctrl/Cmd+Shift+Space toggles the island. Summon with Ctrl/Cmd+Shift+P to dock on the active display.'),controls);
}
function exclusionsView(root){
 heading(root,'Manage exclusions');root.append(el('p',{class:'intro'},'Restore individual projects or allow an owner again. Restoring a hidden or snoozed project deliberately allows it to return to discovery.'));
 const groups=[['hidden','Hidden projects',state.exclusions.hidden],['snoozed','Snoozed projects',state.exclusions.snoozed],['owner','Blocked owners',state.exclusions.owners.map(name=>({id:name,name}))]];
 for(const [kind,title,items]of groups){root.append(el('h3',{class:'subheading'},title));if(!items.length){root.append(el('p',{class:'intro'},'None'));continue;}const list=el('div',{class:'list'});for(const item of items){const row=el('div',{class:'list-row'});row.append(el('span',{class:'list-info'},item.name+(item.until?' / until '+new Date(item.until).toLocaleDateString():'')),btn('Restore',async()=>{adopt(await api.removeExclusion(kind,item.id));render();},'secondary','Restore '+kind+' '+item.name));list.append(row);}root.append(list);}
}
function plusView(root){
 const membership=state.license||{status:'free',active:false};
 const checkout=btn('Subscribe on Gumroad ↗',()=>api.plusCheckout(),'primary');
 heading(root,'RSS+',api.plusCheckout?[checkout]:[]);
 if(!api.plusActivate){root.append(el('p',{class:'intro'},'Activate RSS+ from the desktop app.'));return;}
 if(!membership.active){
  root.append(el('p',{class:'plus-price'},'$5 per month'),
   el('p',{class:'intro'},'Track repositories in your watchlist and export release feeds or a Markdown digest.'));
  const form=el('form',{class:'license-form'}),key=el('input',{type:'password',autocomplete:'off','aria-label':'Gumroad license key',maxlength:'256',placeholder:'XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX',required:''});
  const result=el('p',{class:'field-hint',role:'status'},membership.status==='inactive'?'This membership has ended.':membership.status==='unavailable'?'Gumroad verification is temporarily unavailable.':membership.status==='not-found'?'This key is no longer valid.':'Use the license key from your Gumroad receipt.');
  const submit=el('button',{type:'submit',class:'primary'},'Activate RSS+');
  form.append(key,submit,result);
  form.addEventListener('submit',event=>{
   event.preventDefault();if(submit.disabled)return;submit.disabled=true;result.textContent='Verifying with Gumroad…';
   void run(async()=>{
    try{
     const reply=await api.plusActivate(key.value);
     if(reply.status==='active'){key.value='';adopt(await api.state());render();toast('RSS+ activated.');return;}
     result.textContent=({inactive:'This membership has ended or the purchase was reversed.','invalid-format':'Paste the license key from your Gumroad receipt.','not-found':'Gumroad did not recognize this key. Check the key in your purchase receipt.','wrong-product':'This license belongs to another Gumroad product.','wrong-plan':'This purchase is not the monthly RSS+ membership.',unavailable:'Gumroad could not verify this key right now. Try again shortly.'})[reply.status]||'Activation did not complete.';
    }finally{submit.disabled=false;}
   });
  });
  root.append(form);return;
 }
 root.append(el('p',{class:'intro'},membership.status==='offline'?'RSS+ is active using your last verification.':membership.persistent?'RSS+ membership is active.':'RSS+ is active for this session. Secure key storage is unavailable.'));
 if(membership.endsAt)root.append(el('p',{class:'field-hint'},'Access ends '+new Date(membership.endsAt).toLocaleDateString()+'.'));
 const watch=state.plusRepos||[],repo=selected(),actions=el('div',{class:'stack'});
 if(repo)actions.append(btn(watch.some(item=>item.id===repo.id)?'Remove selected repository':'Watch '+repo.full_name,async()=>{adopt(await api.plusToggle(repo.id));render();},'primary'));
 for(const [kind,label]of [['rss','Export release feeds'],['digest','Export Markdown digest']]){
  const action=btn(label,()=>api.plusExport(kind),'secondary');action.disabled=!watch.length;actions.append(action);
 }
 root.append(el('h3',{class:'subheading'},'Watchlist'),actions);
 const list=el('div',{class:'list'});
 for(const item of watch){
  const entry=el('div',{class:'list-row'}),info=el('div',{class:'list-info'});
  info.append(btn(item.full_name,()=>openRepo(item,'feed'),'list-name','Open releases feed for '+item.full_name),el('p',{class:'list-desc'},compact(item.stargazers_count)+' stars · '+(item.language||'Open source')));
  entry.append(info,btn('Remove',async()=>{adopt(await api.plusToggle(item.id));render();},'secondary','Remove '+item.full_name+' from watchlist'));list.append(entry);
 }
 if(!watch.length)list.append(el('p',{class:'intro'},'Select a repository in the feed, then add it here.'));
 root.append(list,btn('Remove key from this device',async()=>{adopt(await api.plusClear());render();},'secondary'));
}
function renderDrawer(force=true){
 if(!state||!drawer)return;
 document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===section);b.setAttribute('aria-current',b.dataset.tab===section?'page':'false');});
 const stamp=JSON.stringify([section,section==='history'?[state.settings.uniqueHistory,state.settings.exactStars]:section==='saved'?state.settings.exactStars:null,section==='details'?[selected(),releaseStates.get(selected()?.id),state.settings.showCommands]:null,section==='saved'?state.saved:null,section==='history'?state.history:null,section==='tune'?state.profile:null,section==='settings'?[state.settings,state.githubTokenConfigured,state.githubTokenNotice,state.saved.length,state.history.length,state.catalogSize]:null,section==='exclusions'?state.exclusions:null,section==='plus'?[state.license,state.plusRepos,selectedId]:null,['library','collections','compare','insights'].includes(section)?[state.workspace,state.saved,state.history,state.analytics]:null,section==='details'?state.workspace?.records?.[selected()?.id]:null]);
 if(!force&&stamp===drawerStamp)return;drawerStamp=stamp;
 $('drawer').dataset.view=section;const root=$('drawerContent'),active=document.activeElement,within=root.contains(active),key=within?(active.dataset.focusKey||active.id):null,scroll=root.scrollTop;
 let cursor=null;try{if(within&&typeof active.selectionStart==='number')cursor=[active.selectionStart,active.selectionEnd];}catch{}
 root.replaceChildren();({details:overview,saved:r=>collectionView(r,false),history:r=>collectionView(r,true),tune,settings:settingsView,exclusions:exclusionsView,plus:plusView,library:ultimateLibrary,professional:professionalView,metadata:metadataView,collections:ultimateCollections,compare:ultimateCompare,insights:ultimateInsights,commands:ultimateCommands})[section](root);
 if(key){const replacement=Array.from(root.querySelectorAll('[data-focus-key],input[id]')).find(n=>(n.dataset.focusKey||n.id)===key);if(replacement){replacement.focus({preventScroll:true});if(cursor)try{replacement.setSelectionRange(...cursor);}catch{}}}root.scrollTop=scroll;
}
async function refresh(force=false){if(busy)return;busy=true;$('refresh').disabled=true;try{const result=await api.refresh(force);adopt(result.state);render();if(result.error)toast(result.error);else if(force)toast(result.state.cacheAt?'Catalog checked.':'Catalog metadata is unavailable.');}finally{busy=false;$('refresh').disabled=false;}}
listen($('browseLibrary'),'click',()=>run(()=>openDrawer('library')));
listen($('plusButton'),'click',()=>run(()=>openDrawer('plus')));
listen($('miniButton'),'click',()=>run(()=>showMini(true)));
listen($('miniExpand'),'click',()=>run(async()=>{
 miniOpen=false;expanded=true;await windowMode();$('toggle').focus({preventScroll:true});
}));
listen($('miniIsland'),'click',event=>{if(event.target===$('miniIsland'))$('miniExpand').click();});
listen($('miniLink'),'click',()=>run(async()=>{
 const repo=compactRepo();
 if(repo)await api.open(repo.id,'latest-release');
}));
listen($('toggle'),'click',()=>run(()=>drawer?closeDrawer():openDrawer('commands')));
listen($('collapse'),'click',()=>run(async()=>{insightOpen=false;expanded=false;drawer=false;await windowMode();}));
listen($('menu'),'click',()=>run(()=>drawer?closeDrawer():openDrawer('settings')));
listen($('closeDrawer'),'click',()=>run(closeDrawer));
listen($('refresh'),'click',()=>run(()=>refresh(true)));
listen($('pinButton'),'click',()=>run(()=>changeSettings({pinned:!state.settings.pinned})));
function renderPagination(){
 const {manualRemaining:remaining,canRestartManual}=state.feed||{};
 const loading=pending.has('next'),finished=remaining===0;
 const button=$('next');
 const label=finished?(canRestartManual?'Browse again':'Open library'):'Next';
 // Disabling a focused native button drops focus while its request is pending.
 // Keep it focusable; the pending guard prevents duplicate requests.
 button.disabled=!state.catalogSize;
 button.setAttribute('aria-disabled',String(loading||!state.catalogSize));
 if(button.firstChild.textContent!==label+' ')button.firstChild.textContent=label+' ';
 button.title=finished?(canRestartManual?'Start another pass with the same filters':'Browse the full cached catalog'):'Show the next repositories';
 button.setAttribute('aria-busy',String(loading));
 $('nextStatus').textContent=finished&&state.catalogSize?(repos().length?'End of matching picks':'No projects match your feed filters'):
  remaining>0?Intl.NumberFormat().format(remaining)+' left':'';
}
listen($('next'),'click',()=>run(async()=>{
 if(pending.has('next')||!state.catalogSize)return;
 const restart=state.feed?.manualRemaining===0;
 if(restart&&!state.feed.canRestartManual){await openDrawer('library');return;}
 pending.add('next');
 renderPagination();
 islandController?.hold('next picks',true);
 try{
  let result;
  for(let attempt=0;attempt<2;attempt++){
   result=await api.next(state.feed?.epoch,restart);
   if(result.state)adopt(result.state);
   if(result.reason!=='stale')break;
  }
  if(!result.changed){render();return;}
  manualPaging=true;
  if(dynamicScheduler?.enabled)dynamicScheduler.reset();
  $('feed').scrollTop=0;
  pair=0;
  selectedId=repos()[0]?.id??null;
  render();
  undoToast(result.count+' new repositories shown. '+(state.feed?.manualRemaining??0)+' eligible repositories remain.');
 }finally{
  pending.delete('next');
  renderPagination();
  islandController?.hold('next picks',false);
 }
}));

document.querySelectorAll('[data-tab]').forEach(b=>listen(b,'click',()=>run(()=>openDrawer(b.dataset.tab))));
listen(document,'visibilitychange',()=>{syncMiniTimer();if(document.hidden){rootAnimation?.cancel();for(const slot of slots)slot.effect?.cancel();}});
for(const query of ['(prefers-reduced-motion: reduce)','(prefers-color-scheme: dark)'])listen(matchMedia(query),'change',render);
listen(window,'keydown',e=>{
 if(!state)return;
 const key=e.key.toLowerCase(),typing=e.target.isContentEditable||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName);
 if(key==='escape'){islandController?.pause(600);e.preventDefault();run(async()=>{if(drawer)await closeDrawer();else{miniOpen=false;insightOpen=false;expanded=false;await windowMode();}});return;}
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
 adopt(await api.state());if(rendererLifetime.signal.aborted)return;draft={...state.profile.weights};selectedId=repos()[0]?.id??null;
 const stopState=api.onState(next=>{adopt(next);render();});
 const stopMode=api.onMode?.(message=>{const next=UI.externalMode(message);if(!next||Number.isSafeInteger(message?.requestId)&&message.requestId<transition)return;if(message?.insight){state={...state,insight:message.insight};renderInsight();}if(message?.bounds)pointerBounds=message.bounds;const nextExpanded=next!=='collapsed',nextDrawer=next==='workspace',nextInsight=next==='insight',nextMini=next==='mini';if(nextExpanded===expanded&&nextDrawer===drawer&&nextInsight===insightOpen&&nextMini===miniOpen)return;transition++;rootAnimation?.cancel();hoverAnimation?.cancel();morphing=false;expanded=nextExpanded;drawer=nextDrawer;insightOpen=nextInsight;miniOpen=nextMini;applyMode();if(nextInsight&&canAnimate())$('idleInsight').animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:200,easing:'cubic-bezier(.16,1,.3,1)'});islandController?.configure(state.settings,next==='mini'?'panel':next);if(next==='panel')islandController?.pause(1200);ultimateStatus();updatePointerBounds(pointerBounds);requestFit();if(drawer)renderDrawer(false);});
 const observer=new ResizeObserver(()=>{fitMiniSummary();requestFit();updatePickRange();});observer.observe($('island'));observer.observe($('notifications'));observer.observe($('miniExpand'));listen($('feed'),'scroll',()=>{updatePickRange();dynamicHoldUntil=Date.now()+1000;},{passive:true});const syncTimer=setInterval(renderSync,30000);onRendererCleanup(stopState);onRendererCleanup(stopMode);onRendererCleanup(()=>{observer.disconnect();clearInterval(miniTimer);clearInterval(syncTimer);clearTimeout(toastTimer);clearTimeout(releaseTimer);});expanded=state.windowMode!=='collapsed';miniOpen=state.windowMode==='mini';drawer=state.windowMode==='workspace';applyMode();ultimateInit();render();if(state.recoveryNotice)toast(state.recoveryNotice);await refresh();
})().catch(e=>toast(e.message));


function renderSync(){if(!state)return;const sync=FeedUI.sync(state);const remaining=Math.max(0,Math.ceil(((state.rateLimitUntil||0)-Date.now())/60000));$('status').textContent=remaining?'GitHub rate limit · retry in '+remaining+'m':sync.label;$('status').title=state.lastError||'Latest successful GitHub catalog sync. Release check times appear on each repository card.';$('connectionDot').dataset.status=sync.tone;document.body.dataset.platform=state.platform;document.body.classList.toggle('opaque-surface',state.windowPolicy?.transparent===false);document.body.classList.toggle('docked',true);document.documentElement.style.setProperty('--surface-padding',(state.windowPolicy?.padding??8)+'px');$('commandButton').textContent=FeedUI.shortcut(state.platform);$('commandButton').title='Command palette ('+FeedUI.shortcut(state.platform)+')';$('commandButton').setAttribute('aria-label',$('commandButton').title);for(const repo of repos()){for(const node of document.querySelectorAll('[data-repo-id="'+repo.id+'"] .feed-activity'))fillActivity(repo,node);for(const node of document.querySelectorAll('[data-repo-id="'+repo.id+'"] .star-velocity'))node.textContent=starTrend(repo);}}
