'use strict';
const {MIN_STARS,MAX_CATALOG,TARGET_CATALOG,CATALOG_REVISION}=require('./catalog-policy.cjs');
const {ranked, eligible, localDay, normalizeRepo, defaults}=require('./engine.cjs');
const SETTINGS={...{"autoHide":true,"hoverExpand":true,"collapseOnLeave":true,"idleCollapse":true,"hideDelay":80,"idleSeconds":30,"hoverDelay":0,"keepOnFocus":false,"keepOnHover":true,"hoverScale":102,"motionPreset":"snappy","subtleMotion":false,"hoverLift":true,"glow":true,"showBadges":true,"showQuickActions":true,"showStatus":true,"showQueueCount":true,"pinnedFirst":true,"markReadOnOpen":false,"quietMode":false,"focusMinutes":25,"accent":"sand","cardStyle":"soft","roundness":20,"stagger":true,"startCollapsed":true,"protectEditing":true,"showHints":true},pinned:true,reducedMotion:false,launchAtLogin:false,autoReplace:true,notifications:false,pausedLearning:false,opacity:100,anchor:'center',theme:'reference',density:'compact',minStars:MIN_STARS,languages:[],topics:[],cooldownWindowMs:43200000,textScale:100,motion:'system',motionDuration:80,visibleRows:2,panelWidth:960,compactRevision:1,dynamicRefresh:true,cycleMin:3,cycleMax:10,transitionStyle:'auto',cyclePauseHover:false,cyclePauseFocus:true,cycleCountdown:true,cycleAccent:true,liveRevision:2,dockRevision:1,catalogRevision:CATALOG_REVISION,edgeRevision:1,cycleMotion:'adaptive',windowMotionDuration:160,idleAdvisor:true,screenContext:false,workTopic:'tools',showCommands:true,showDescriptions:true,showOwners:true,showReasons:false,wrapNames:true,codeWrap:true,shortcuts:true,exactStars:false,toastSeconds:5,uniqueHistory:false};
function settings(input={}) {
 input=input&&typeof input==='object'&&!Array.isArray(input)?input:{};const out={...SETTINGS};
 for(const key of ['idleAdvisor','screenContext','dynamicRefresh','cyclePauseHover','cyclePauseFocus','cycleCountdown','cycleAccent','pinned','reducedMotion','launchAtLogin','autoReplace','hoverExpand','notifications','pausedLearning','showCommands','showDescriptions','showOwners','showReasons','wrapNames','codeWrap','shortcuts','exactStars','uniqueHistory','autoHide','hoverExpand','collapseOnLeave','idleCollapse','keepOnFocus','keepOnHover','subtleMotion','hoverLift','glow','showBadges','showQuickActions','showStatus','showQueueCount','pinnedFirst','markReadOnOpen','quietMode','stagger','startCollapsed','protectEditing','showHints'])if(typeof input[key]==='boolean')out[key]=input[key];
 if(Number.isFinite(input.opacity))out.opacity=Math.max(65,Math.min(100,Math.round(input.opacity)));
 if(Number.isFinite(input.minStars))out.minStars=Math.max(MIN_STARS,Math.min(1000000,Math.round(input.minStars)));
 for(const [key,values]of Object.entries({motionPreset:['fluid','snappy','calm','spring'],accent:['sand','ocean','violet','mint','rose'],cardStyle:['soft','outlined','flat'],anchor:['left','center','right'],motion:['system','full','none'],theme:['reference','graphite','contrast'],density:['comfortable','compact']}))if(values.includes(input[key]))out[key]=input[key];
 for(const [key,values]of Object.entries({hideDelay:[0,80,140,160,600,1200,1600,2400,4000],idleSeconds:[15,30,60,120,300],hoverDelay:[0,80,160,280,400],hoverScale:[100,101,102,103],focusMinutes:[5,15,25,45,60],roundness:[12,20,28],textScale:[100,115,130,150],motionDuration:[80,140,220,320],visibleRows:[1,2,3],panelWidth:[960,1080,1280,1440],toastSeconds:[3,5,8]}))if((typeof input[key]==='number'||typeof input[key]==='string'&&input[key].trim())&&values.includes(Number(input[key])))out[key]=Number(input[key]);
 const timing=require('../app/dynamic-feed.js').interval({cycleMin:input.cycleMin,cycleMax:input.cycleMax});out.cycleMin=timing.min/1000;out.cycleMax=timing.max/1000;
 if(['auto',...require('../app/dynamic-feed.js').styles.map(s=>s[0])].includes(input.transitionStyle))out.transitionStyle=input.transitionStyle;
 if(['adaptive','fast','slow'].includes(input.cycleMotion))out.cycleMotion=input.cycleMotion;
 if((typeof input.windowMotionDuration==='number'||typeof input.windowMotionDuration==='string'&&input.windowMotionDuration.trim())&&[160,200,280,360].includes(Number(input.windowMotionDuration)))out.windowMotionDuration=Number(input.windowMotionDuration);
 if(Object.hasOwn(require('./engine.cjs').TOPICS,input.workTopic))out.workTopic=input.workTopic;
 if(Array.isArray(input.languages))out.languages=[...new Set(input.languages.filter(s=>typeof s==='string').map(s=>s.trim()).filter(s=>s&&s.length<=64))].slice(0,20);
 if(Array.isArray(input.topics))out.topics=[...new Set(input.topics.filter(t=>typeof t==='string'&&/^[a-z0-9-]{1,80}$/i.test(t)).map(t=>t.toLowerCase()))].slice(0,20);
 if(Number.isSafeInteger(input.cooldownWindowMs))out.cooldownWindowMs=Math.max(1800000,Math.min(604800000,input.cooldownWindowMs));
 return out;
}
function canonicalKey(repo) {
 return repo.full_name.toLowerCase();
}
function distinct(repos) {
 const ids=new Set(),names=new Set();
 return repos.filter(repo=>{
  const name=canonicalKey(repo);
  if(ids.has(repo.id)||names.has(name))return false;
  ids.add(repo.id);names.add(name);return true;
 });
}
function matchesActiveFilters(repo,prefs) {
 return eligible(repo)&&repo.stargazers_count>=prefs.minStars&&
  (!prefs.languages.length||prefs.languages.includes(repo.language))&&
  (!prefs.topics?.length||prefs.topics.some(topic=>repo.topics?.some(value=>value.toLowerCase()===topic)));
}
function allowed(repo,state,now=Date.now(),prefs=settings(state.settings)) {
 return matchesActiveFilters(repo,prefs)&&!(state.hidden||[]).includes(repo.id)&&
  !(state.blockedOwners||[]).some(owner=>owner.toLowerCase()===canonicalKey(repo).split('/')[0])&&
  !(Number(state.snoozed?.[repo.id])>now);
}
function filteredCatalog(pool,state,now) {
 const prefs=settings(state.settings);
 const normalized=(Array.isArray(pool)?pool:[]).map(normalizeRepo).filter(Boolean);
 return distinct(normalized).filter(repo=>allowed(repo,state,now,prefs));
}
function identityIndex(repos) {
 const ids=new Set(repos.map(repo=>repo.id)),names=new Set(repos.map(canonicalKey));
 return repo=>ids.has(repo.id)||names.has(canonicalKey(repo));
}
function feedPools(state,visible,now,pool=filteredCatalog(state.cache,state,now),day=state.daily?.day||localDay()) {
 const isVisible=identityIndex(visible),isBookmarked=identityIndex(state.saved||[]);
 const seen=new Set(state.seen||[]),recentIds=new Map(),recentNames=new Map();
 for(const entry of state.seenHistory||[]){
  recentIds.set(entry.id,Math.max(recentIds.get(entry.id)||0,entry.timestamp));
  recentNames.set(entry.key,Math.max(recentNames.get(entry.key)||0,entry.timestamp));
 }
 const prefs=settings(state.settings);
 const lastSeen=repo=>Math.max(recentIds.get(repo.id)||0,recentNames.get(canonicalKey(repo))||0,Number(state.presentedAt?.[repo.id])||0);
 const available=ranked(pool,state.profile?.weights||{},day).filter(repo=>!isVisible(repo));
 const unseen=available.filter(repo=>!seen.has(repo.id)&&!lastSeen(repo)&&!isBookmarked(repo));
 const replay=unseen.length?[]:available.filter(repo=>{
  const last=lastSeen(repo);
  return last>0?now-last>=prefs.cooldownWindowMs:!seen.has(repo.id);
 }).sort((a,b)=>lastSeen(a)-lastSeen(b)||b.score-a.score);
 return {unseen,replay};
}
function hydrate(pool,repos) {
 const byId=new Map(pool.map(repo=>[repo.id,repo])),byName=new Map(pool.map(repo=>[canonicalKey(repo),repo]));
 return distinct(repos.map(repo=>byId.get(repo.id)||byName.get(canonicalKey(repo))).filter(Boolean));
}
function selectFeed(pool,state,day=localDay(),now=Date.now()) {
 const filtered=filteredCatalog(pool,state,now);
 const visible=hydrate(filtered,state.daily?.repos||[]).slice(0,3);
 const {unseen,replay}=feedPools(state,visible,now,filtered,day);
 return {day,repos:[...visible,...(unseen.length?unseen:replay)].slice(0,3)};
}
function recordAction(state,repo,action,now=Date.now()) {
 state.seenHistory=[...(state.seenHistory||[]),{id:repo.id,key:canonicalKey(repo),timestamp:now,action}].slice(-20000);
}
function markPresented(state,repos,now) {
 state.presentedAt=state.presentedAt||{};
 state.seen=[...new Set([...(state.seen||[]),...repos.map(repo=>repo.id)])];
 for(const repo of repos){
  state.presentedAt[repo.id]=now;
  recordAction(state,repo,'shown',now);
 }
}
function saveFeed(state,now,phase='ready',bump=true) {
 const pool=filteredCatalog(state.cache,state,now);
 const {unseen,replay}=feedPools(state,state.daily?.repos||[],now,pool);
 state.feed={phase,epoch:(state.feed?.epoch||0)+Number(bump),visibleIds:(state.daily?.repos||[]).map(repo=>repo.id),queueIds:unseen.map(repo=>repo.id),hasReplay:replay.length>0,matchingCount:pool.length};
 return state.feed;
}
function present(state,now=Date.now()) {
 const wasVisible=identityIndex(state.daily?.repos||[]);
 state.daily=selectFeed(state.cache,state,localDay(),now);
 markPresented(state,state.daily.repos.filter(repo=>!wasVisible(repo)),now);
 saveFeed(state,now);
 return state.daily;
}
function candidates(state,now=Date.now()) {
 const {unseen,replay}=feedPools(state,state.daily?.repos||[],now);
 return unseen.length?unseen:replay;
}
function advance(state,index,now) {
 const before=state.daily;
 const filtered=filteredCatalog(state.cache,state,now);
 const previous=hydrate(filtered,before?.repos||[]);
 const day=before?.day||localDay();
 const {unseen,replay}=feedPools(state,previous,now,filtered,day);
 const chosen=(unseen.length?unseen:replay).slice(0,index===null?3:1);
 if(!chosen.length){
  if(JSON.stringify(previous.map(repo=>repo.id))!==JSON.stringify(before?.repos?.map(repo=>repo.id))){
   state.daily={day,repos:previous};
   saveFeed(state,now);
  }
  return {changed:false,exhausted:true,reason:'exhausted'};
 }
 const revisited=!unseen.length;
 const target=index===null?null:before.repos[index];
 const slot=target?previous.findIndex(identityIndex([target])):-1;
 const repos=index===null?[...chosen,...previous.slice(chosen.length)].slice(0,3):
  slot<0?[...previous,...chosen].slice(0,3):previous.map((repo,i)=>i===slot?chosen[0]:repo);
 state.lastRotation={day,repos:previous};
 state.daily={day,repos};
 markPresented(state,chosen,now);
 saveFeed(state,now,revisited?'rebuilding':'ready');
 return {changed:true,count:chosen.length,revisited,id:chosen[0].id,index};
}
function nextBatch(state,now=Date.now()) {
 return advance(state,null,now);
}
function rotate(state,id,now=Date.now()) {
 const index=state.daily?.repos.findIndex(repo=>repo.id===id)??-1;
 return index>=0&&advance(state,index,now).changed;
}
function cycle(state,id,day=localDay(),now=Date.now()) {
 const index=state.daily?.repos.findIndex(repo=>repo.id===id)??-1;
 if(!Number.isSafeInteger(id)||state.daily?.day!==day||index<0)return {changed:false,reason:'stale'};
 return advance(state,index,now);
}
function undo(state,now=Date.now()) {
 if(state.lastRotation?.day!==localDay())return false;
 const repos=hydrate(filteredCatalog(state.cache,state,now),state.lastRotation.repos);
 state.lastRotation=null;
 if(!repos.length){present(state,now);return false;}
 state.daily={day:localDay(),repos};
 markPresented(state,repos,now);
 present(state,now);
 return true;
}
function collection(input) {
 if(input?.schema!=='repopulse.collection.v1'||!Array.isArray(input.repos)||input.repos.length>2000)throw new Error('Choose a RepoPulse collection JSON file (up to 2,000 repositories).');
 return [...new Map(input.repos.map(normalizeRepo).filter(Boolean).map(r=>[r.id,r])).values()];
}
function sources(repo) {
 if(!repo||!normalizeRepo(repo))throw new Error('Invalid repository');
 const name=repo.full_name.split('/')[1];
 return {clone:`git clone https://github.com/${repo.full_name}.git`,inspect:`git -C "${name}" status\ngit -C "${name}" log -1 --oneline`,readme:`https://github.com/${repo.full_name}#readme`};
}
function initialize(state) {
 if(!state||typeof state!=='object'||Array.isArray(state))state=defaults();
 const unique=input=>[...new Map((Array.isArray(input)?input:[]).map(raw=>{const r=normalizeRepo(raw);return r?{...r,...(typeof raw.reason==='string'?{reason:raw.reason.slice(0,200)}:{})}:null;}).filter(Boolean).map(r=>[r.id,r])).values()];
 state.cache=distinct(unique(state.cache)).filter(eligible);state.saved=distinct(unique(state.saved));
 state.seenHistory=(Array.isArray(state.seenHistory)?state.seenHistory:[]).filter(e=>e&&Number.isSafeInteger(e.id)&&typeof e.key==='string'&&Number.isFinite(e.timestamp)&&e.timestamp>0&&['shown','skipped','bookmarked'].includes(e.action)).slice(-20000);
 state.feed={phase:'hydrating',epoch:0,visibleIds:[],queueIds:[],hasReplay:false};state.profile={...(state.profile&&typeof state.profile==='object'?state.profile:{}),weights:require('./engine.cjs').validWeights(state.profile?.weights)};
 for(const key of ['seen','hidden','liked'])state[key]=[...new Set((Array.isArray(state[key])?state[key]:[]).filter(id=>Number.isSafeInteger(id)&&id>0))];
 if(state.daily)state.daily={day:typeof state.daily.day==='string'?state.daily.day:'',repos:unique(state.daily.repos)};
 if(state.lastRotation)state.lastRotation={day:typeof state.lastRotation.day==='string'?state.lastRotation.day:'',repos:unique(state.lastRotation.repos)};
 if(state.settings?.catalogRevision!==CATALOG_REVISION){const old=state.settings?.catalogRevision;state.catalogUpgradePending=state.catalogUpgradePending===true||old===2;state.settings={...state.settings,catalogRevision:CATALOG_REVISION,...(old===2&&state.settings.minStars===70000?{minStars:MIN_STARS}:{})};state.cacheAt=null;}
 if(state.settings?.dockRevision!==1)state.settings={...state.settings,hideDelay:140,anchor:'center'};
 if(state.settings?.compactRevision!==1)state.settings={...state.settings,panelWidth:960,density:'compact',motionDuration:80,motionPreset:'snappy',hoverDelay:0,hideDelay:140,autoHide:true,collapseOnLeave:true,hoverExpand:true};
 if(state.settings?.liveRevision!==2)state.settings={...state.settings,dynamicRefresh:true,cyclePauseHover:false};
 if(state.settings?.edgeRevision!==1)state.settings={...state.settings,autoHide:true,hoverExpand:true,collapseOnLeave:true,hideDelay:80,hoverDelay:0,keepOnFocus:false,startCollapsed:true,anchor:'center',windowMotionDuration:160};
 const presented=state.presentedAt&&typeof state.presentedAt==='object'&&!Array.isArray(state.presentedAt)?state.presentedAt:{};state.presentedAt=Object.fromEntries(Object.entries(presented).filter(([id,time])=>Number.isSafeInteger(Number(id))&&Number.isFinite(time)&&time>0));for(const id of state.seen||[])if(!state.presentedAt[id])state.presentedAt[id]=Date.now();
 state.workspace=require('./workspace.cjs').normalize(state.workspace);state.settings=settings({...state.settings,...(state.settings?.autoHide===undefined?{hoverExpand:true}:{})});state.history=Array.isArray(state.history)?state.history.filter(h=>h&&normalizeRepo(h.repo)&&Number.isFinite(Date.parse(h.openedAt))).sort((a,b)=>Date.parse(b.openedAt)-Date.parse(a.openedAt)).slice(0,500).map(h=>({repo:normalizeRepo(h.repo),openedAt:h.openedAt})):[];
 state.blockedOwners=Array.isArray(state.blockedOwners)?[...new Set(state.blockedOwners.filter(s=>typeof s==='string'&&/^[\w.-]+$/.test(s)).map(s=>s.toLowerCase()))]:[];
 state.snoozed=Object.fromEntries(Object.entries(state.snoozed&&typeof state.snoozed==='object'&&!Array.isArray(state.snoozed)?state.snoozed:{}).filter(([id,time])=>Number.isSafeInteger(Number(id))&&Number(id)>0&&Number.isFinite(time)&&time>Date.now()));
 return state;
}
function bootstrap(state,seed=require('./catalog-seed.json').repos){
 const clean=items=>[...new Map((Array.isArray(items)?items:[]).map(normalizeRepo).filter(r=>r&&eligible(r)).map(r=>[r.id,r])).values()];
 const cached=distinct(clean(state.cache)),upgrade=state.catalogUpgradePending===true,bundled=distinct(clean(seed));
 if(!cached.length||upgrade){
  state.cache=distinct([...cached,...bundled]).sort((a,b)=>b.stargazers_count-a.stargazers_count||a.id-b.id).slice(0,MAX_CATALOG);
  state.cacheAt=null;state.catalogInfo={source:cached.length?'bundled-upgrade':'bundled',loaded:state.cache.length,minStars:MIN_STARS,target:TARGET_CATALOG,capacity:MAX_CATALOG};
 }else state.cache=cached;
 state.catalogUpgradePending=false;present(state);return state;
}
module.exports={bootstrap,SETTINGS,settings,allowed,canonicalKey,distinct,matchesActiveFilters,recordAction,saveFeed,selectFeed,present,candidates,nextBatch,rotate,cycle,undo,collection,sources,initialize};
