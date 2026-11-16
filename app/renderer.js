'use strict';
const api=window.pulse;
const $=id=>document.getElementById(id);
let state=null,section='today',open=false,toastTimer,draft={},busy=false;
function element(tag,props={},text){const e=document.createElement(tag);for(const [key,value]of Object.entries(props))e.setAttribute(key,value);if(text!==undefined)e.textContent=text;return e;}
function button(text,action,cls='',label){const e=element('button',{class:cls},text);if(label)e.setAttribute('aria-label',label);e.addEventListener('click',()=>run(action));return e;}
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,6500);}
async function run(action){try{await action();}catch(error){toast(error.message||'Something went wrong. Please try again.');}}
async function expand(value){open=value;$('expanded').hidden=!value;$('island').classList.toggle('open',value);$('toggle').setAttribute('aria-expanded',String(value));if(api)await api.expand(value);}
function navigate(tab){section=tab;if(tab==='tune')draft={...state.profile.weights};render();}
function stat(value,label){const e=element('div',{class:'stat'});e.append(element('b',{},String(value)),element('span',{},label));return e;}
function renderCard(repo){
 const card=element('article',{class:'repo'}),top=element('div',{class:'repo-top'}),[owner,name]=repo.full_name.split('/');
 top.append(element('div',{class:'repo-avatar','aria-hidden':'true'},owner.charAt(0).toUpperCase()));
 const heading=element('div',{class:'repo-heading'});heading.append(element('span',{class:'owner'},owner));
 const h2=element('h2');h2.append(button(name,()=>api.open(repo.id)));heading.append(h2);top.append(heading);
 const stars=element('div',{class:'stars'});stars.append(element('span',{},'☆ '),document.createTextNode(Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(repo.stargazers_count)));top.append(stars);card.append(top,element('p',{class:'description'},repo.description));
 const reason=element('div',{class:'reason'});reason.append(element('span',{},'✦'),document.createTextNode(repo.reason||'Saved to your personal open-source collection.'));card.append(reason);
 const bottom=element('div',{class:'repo-bottom'}),lang=element('span',{class:'language'});lang.append(element('i',{'aria-hidden':'true'}),document.createTextNode(repo.language||'Open source'));bottom.append(lang);
 const actions=element('div',{class:'actions'}),saved=state.saved.some(r=>r.id===repo.id);
 actions.append(button('♡',async()=>{await api.react(repo.id,'like');toast('Interest noted. Future discoveries will adapt.');},'',`More like ${name}`),button(saved?'Saved':'Save',async()=>{state=await api.react(repo.id,'save');render();},saved?'selected':'',`${saved?'Unsave':'Save'} ${name}`),button('×',async()=>{state=await api.react(repo.id,'hide');render();toast('Hidden from your daily feed.');},'',`Hide ${name}`),button('Open ↗',()=>api.open(repo.id),'visit',`Open ${repo.full_name} on GitHub`));bottom.append(actions);card.append(bottom);return card;
}
function empty(title,description,action,label){const e=element('div',{class:'empty'});e.append(element('div',{class:'empty-symbol','aria-hidden':'true'},'⌘'),element('h2',{},title),element('p',{},description));if(action)e.append(button(label,action,'primary'));return e;}
function renderToday(root){
 const repos=state.daily?.repos||[],label=element('div',{class:'section-label'});label.append(element('strong',{},'CURATED FOR YOUR CURIOSITY'),element('span',{},`${repos.length} / 3 discoveries`));root.append(label);
 if(!Object.keys(state.profile.weights).length){const n=element('div',{class:'notice'},'Make this yours. Pick a few interests in Tune your feed, or import a local browser profile.');root.append(n);}
 if(!repos.length){root.append(empty('Your next favorite starts here.',state.cacheAt?'No unseen repositories remain in the current 50K+ catalog. Refresh later for new eligible projects.':'Connect to GitHub to discover three standout projects. No account or API key needed.',()=>refresh(true),'Discover my three'));return;}
 repos.forEach(r=>root.append(renderCard(r)));
 if(repos.length<3)root.append(element('p',{class:'footnote'},'The current catalog has fewer than three unseen matches. RepoPulse keeps the 50K+ threshold instead of repeating old picks.'));
}
function renderSaved(root){
 if(!state.saved.length){root.append(empty('Good finds deserve a home.','Save a repository from Today to keep it here. Your collection stays on this device.',()=>navigate('today'),'Explore today'));return;}
 const search=element('input',{class:'search',type:'search',placeholder:'Find a saved project…','aria-label':'Search saved repositories'}),list=element('div');
 const draw=()=>{list.replaceChildren();const q=search.value.toLowerCase();const matches=state.saved.filter(r=>`${r.full_name} ${r.description} ${r.language}`.toLowerCase().includes(q));if(!matches.length)list.append(element('p',{class:'intro'},'No saved projects match your search.'));matches.forEach(r=>list.append(renderCard(r)));};search.addEventListener('input',draw);root.append(search,list);draw();
}
function renderTune(root){
 root.append(element('p',{class:'intro'},'A feed that feels like you. Choose what you are curious about. Your reactions refine future daily picks. Today’s existing picks stay stable.'));
 const grid=element('div',{class:'topic-grid'});
 for(const [key,t]of Object.entries(state.topics)){
  const selected=(draft[key]||0)>0,b=button(t.label,()=>{if(draft[key])delete draft[key];else draft[key]=8;render();},`topic ${selected?'selected':''}`);b.setAttribute('aria-pressed',String(selected));b.append(element('small',{},selected?'✓':'+'));grid.append(b);
 }
 root.append(grid);
 const row=element('div',{class:'import-row'});row.append(button('Save my interests',async()=>{state=await api.profile(draft);toast('Interests saved. Your next daily picks will adapt.');navigate('today');},'primary'),button('Import browser profile',async()=>{const result=await api.importProfile();if(result){state=result;draft={...state.profile.weights};render();toast('Local interest profile imported.');}},'secondary'));root.append(row);
 root.append(element('div',{class:'notice'},'Browser companion: enable history access only when you choose Analyze. It reads up to 1,000 recent pages locally and exports topic scores only. Import that small JSON file here. Cookies, URLs and page titles are never included in the export.'));
 if(state.profile.importedAt)root.append(element('p',{class:'footnote'},`Last updated ${new Date(state.profile.importedAt).toLocaleString()}. Source: ${state.profile.source||'manual'}.`));
}
function renderSettings(root){
 root.append(element('h2',{class:'settings-title'},'YOUR ISLAND, YOUR RULES'));
 const rows=[['pinned','Always on top','Keep your island above other windows.'],['reducedMotion','Reduce motion','Use a calmer interface.'],['launchAtLogin','Launch at login','On Linux, configure this in desktop session settings.']];
 for(const [key,title,description]of rows){const row=element('label',{class:'setting'}),text=element('div');text.append(element('strong',{},title),element('p',{},description));const input=element('input',{type:'checkbox','aria-label':title});input.checked=!!state.settings[key];input.addEventListener('change',()=>run(async()=>{try{state=await api.settings({[key]:input.checked});render();}catch(e){input.checked=!input.checked;throw e;}}));row.append(text,input);root.append(row);}
 const stats=element('div',{class:'stat-row'});stats.append(stat(state.catalogSize,'projects in catalog'),stat(state.saved.length,'saved for later'),stat(Object.keys(state.profile.weights).length,'active interests'));root.append(stats);
 root.append(element('p',{class:'footnote'},`Catalog ${state.cacheAt?'updated '+new Date(state.cacheAt).toLocaleString():'not downloaded yet'}. Refreshes at most every six hours unless requested. Daily picks roll over at local midnight while the app is running, or next launch.`));
 root.append(element('p',{class:'footnote'},'Shortcut: Ctrl/Cmd + Shift + Space. Drag the top bar to move. Hide the island and reopen it from the system tray. No analytics, cloud profile or cookie access.'));
 root.append(button('Delete local data',async()=>{const result=await api.clear();if(result){state=result;draft={};render();toast('Local data cleared.');}},'secondary danger'));
 const controls=element('div',{class:'settings-buttons'});controls.append(button('Hide island',()=>api.hide(),'secondary'),button('Quit RepoPulse',()=>api.quit(),'secondary'));root.append(controls);
}
function render(){if(!state)return;document.body.classList.toggle('reduced',state.settings.reducedMotion);document.body.classList.toggle('motion',!state.settings.reducedMotion);$('date').textContent=new Date().toLocaleDateString('en',{weekday:'long',month:'short',day:'numeric'});$('todayCount').textContent=String(state.daily?.repos?.length||0);$('savedCount').textContent=String(state.saved.length);$('count').replaceChildren(document.createTextNode(`${state.daily?.repos?.length||0} discoveries `),element('span',{},'↗'));document.querySelectorAll('[data-tab]').forEach(e=>{e.classList.toggle('active',e.dataset.tab===section);e.setAttribute('aria-current',e.dataset.tab===section?'page':'false');});const root=$('content');root.replaceChildren();({today:renderToday,saved:renderSaved,tune:renderTune,settings:renderSettings})[section](root);}
async function refresh(force=false){if(busy)return;busy=true;$('refresh').disabled=true;try{const result=await api.refresh(force);state=result.state;render();if(result.error)toast(result.error);else if(force)toast('Your catalog is up to date.');}finally{busy=false;$('refresh').disabled=false;}}
$('toggle').addEventListener('click',()=>run(()=>expand(!open)));$('count').addEventListener('click',()=>run(()=>expand(!open)));$('collapse').addEventListener('click',()=>run(()=>expand(false)));$('refresh').addEventListener('click',()=>run(()=>refresh(true)));document.querySelectorAll('[data-tab]').forEach(e=>e.addEventListener('click',()=>navigate(e.dataset.tab)));document.addEventListener('keydown',e=>{if(e.key==='Escape')run(()=>expand(false));});
(async()=>{if(!api){$('content').append(empty('Desktop preview','This interface runs inside the RepoPulse desktop app.'));await expand(true);return;}state=await api.state();draft={...state.profile.weights};api.onState(next=>{state=next;render();});render();if(state.recoveryNotice)toast(state.recoveryNotice);await refresh();})().catch(e=>toast(e.message));
