'use strict';
const {selectDaily, ranked, eligible, localDay, normalizeRepo, defaults}=require('./engine.cjs');
const SETTINGS={...{"autoHide":true,"hoverExpand":true,"collapseOnLeave":true,"idleCollapse":true,"hideDelay":0,"idleSeconds":30,"hoverDelay":0,"keepOnFocus":true,"keepOnHover":true,"hoverScale":102,"motionPreset":"snappy","subtleMotion":false,"hoverLift":true,"glow":true,"showBadges":true,"showQuickActions":true,"showStatus":true,"showQueueCount":true,"pinnedFirst":true,"markReadOnOpen":false,"quietMode":false,"focusMinutes":25,"accent":"sand","cardStyle":"soft","roundness":20,"stagger":true,"startCollapsed":false,"protectEditing":true,"showHints":true},pinned:true,reducedMotion:false,launchAtLogin:false,autoReplace:true,notifications:false,pausedLearning:false,opacity:100,anchor:'center',theme:'reference',density:'compact',minStars:50000,languages:[],textScale:100,motion:'system',motionDuration:80,visibleRows:2,panelWidth:960,compactRevision:1,dynamicRefresh:true,cycleMin:3,cycleMax:10,transitionStyle:'auto',cyclePauseHover:false,cyclePauseFocus:true,cycleCountdown:true,cycleAccent:true,liveRevision:2,cycleMotion:'adaptive',windowMotionDuration:200,idleAdvisor:true,screenContext:false,workTopic:'tools',showCommands:true,showDescriptions:true,showOwners:true,showReasons:false,wrapNames:true,codeWrap:true,shortcuts:true,exactStars:false,toastSeconds:5,uniqueHistory:false};
function settings(input={}) {
 const out={...SETTINGS};
 for(const key of ['idleAdvisor','screenContext','dynamicRefresh','cyclePauseHover','cyclePauseFocus','cycleCountdown','cycleAccent','pinned','reducedMotion','launchAtLogin','autoReplace','hoverExpand','notifications','pausedLearning','showCommands','showDescriptions','showOwners','showReasons','wrapNames','codeWrap','shortcuts','exactStars','uniqueHistory','autoHide','hoverExpand','collapseOnLeave','idleCollapse','keepOnFocus','keepOnHover','subtleMotion','hoverLift','glow','showBadges','showQuickActions','showStatus','showQueueCount','pinnedFirst','markReadOnOpen','quietMode','stagger','startCollapsed','protectEditing','showHints'])if(typeof input[key]==='boolean')out[key]=input[key];
 if(Number.isFinite(input.opacity))out.opacity=Math.max(65,Math.min(100,Math.round(input.opacity)));
 if(Number.isFinite(input.minStars))out.minStars=Math.max(50000,Math.min(1000000,Math.round(input.minStars)));
 for(const [key,values]of Object.entries({motionPreset:['fluid','snappy','calm','spring'],accent:['sand','ocean','violet','mint','rose'],cardStyle:['soft','outlined','flat'],anchor:['left','center','right'],motion:['system','full','none'],theme:['reference','graphite','contrast'],density:['comfortable','compact']}))if(values.includes(input[key]))out[key]=input[key];
 for(const [key,values]of Object.entries({hideDelay:[0,80,160,600,1200,1600,2400,4000],idleSeconds:[15,30,60,120,300],hoverDelay:[0,80,160,280,400],hoverScale:[100,101,102,103],focusMinutes:[5,15,25,45,60],roundness:[12,20,28],textScale:[100,115,130,150],motionDuration:[80,140,220,320],visibleRows:[1,2,3],panelWidth:[960,1080,1280,1440],toastSeconds:[3,5,8]}))if(values.includes(Number(input[key])))out[key]=Number(input[key]);
 const timing=require('../app/dynamic-feed.js').interval({cycleMin:input.cycleMin,cycleMax:input.cycleMax});out.cycleMin=timing.min/1000;out.cycleMax=timing.max/1000;
 if(['auto',...require('../app/dynamic-feed.js').styles.map(s=>s[0])].includes(input.transitionStyle))out.transitionStyle=input.transitionStyle;
 if(['adaptive','fast','slow'].includes(input.cycleMotion))out.cycleMotion=input.cycleMotion;
 if([160,200,280,360].includes(Number(input.windowMotionDuration)))out.windowMotionDuration=Number(input.windowMotionDuration);
 if(Object.hasOwn(require('./engine.cjs').TOPICS,input.workTopic))out.workTopic=input.workTopic;
 if(Array.isArray(input.languages))out.languages=[...new Set(input.languages.filter(s=>typeof s==='string'&&s.length<40))].slice(0,20);
 return out;
}
function allowed(repo,state,now=Date.now()) {
 const prefs=settings(state.settings);
 return eligible(repo)&&repo.stargazers_count>=prefs.minStars&&!(state.hidden||[]).includes(repo.id)&&!(state.blockedOwners||[]).includes(repo.full_name.split('/')[0])&&!(Number(state.snoozed?.[repo.id])>now)&&(!prefs.languages.length||prefs.languages.includes(repo.language));
}
function selectFeed(pool,state,day=localDay(),now=Date.now()) {
 const filtered=pool.filter(r=>allowed(r,state,now));
 const daily=state.daily?{...state.daily,repos:(state.daily.repos||[]).filter(r=>allowed(r,state,now))}:null;
 return selectDaily(filtered,{...state,daily},day);
}
function present(state) {
 const previous=new Set(state.daily?.repos.map(r=>r.id)||[]);state.daily=selectFeed(state.cache,state);markPresented(state,state.daily.repos.filter(r=>!previous.has(r.id)));
 state.seen=[...new Set([...(state.seen||[]),...state.daily.repos.map(r=>r.id)])];
 return state.daily;
}
function candidates(state,now=Date.now(),manual=false){
 const used=new Set((state.daily?.repos||[]).map(r=>r.id)),seen=new Set(state.seen||[]);
 const pool=ranked(state.cache,state.profile?.weights||{},state.daily?.day||localDay()).filter(r=>allowed(r,state,now)&&!used.has(r.id));
 const unseen=pool.filter(r=>!seen.has(r.id));if(unseen.length)return unseen;
 return pool.filter(r=>manual||now-Number(state.presentedAt?.[r.id]||now)>=1800000).sort((a,b)=>Number(state.presentedAt?.[a.id]||0)-Number(state.presentedAt?.[b.id]||0)||b.score-a.score);
}
function markPresented(state,repos,now=Date.now()){state.presentedAt=state.presentedAt||{};for(const repo of repos)state.presentedAt[repo.id]=now;}
function nextBatch(state,now=Date.now()){
 const pool=candidates(state,now,true),before=state.daily;if(!pool.length)return{changed:false,exhausted:true};
 const count=Math.min(3,pool.length),chosen=pool.slice(0,count),priorSeen=new Set(state.seen||[]);
 state.lastRotation={day:before?.day||localDay(),repos:(before?.repos||[]).map(r=>({...r}))};
 state.daily={day:before?.day||localDay(),repos:[...chosen,...(before?.repos||[]).slice(count)].slice(0,3)};
 state.seen=[...new Set([...(state.seen||[]),...chosen.map(r=>r.id)])];markPresented(state,chosen,now);
 return{changed:true,count,revisited:chosen.some(r=>priorSeen.has(r.id))};
}
function rotate(state,id,now=Date.now()) {
 const before=state.daily, index=before?.repos.findIndex(r=>r.id===id)??-1;
 if(index<0)return false;
 state.lastRotation={day:before.day,repos:before.repos.map(r=>({...r}))};
 const oldIds=new Set(before.repos.map(r=>r.id));
 const candidate=candidates(state,now)[0];
 const next=before.repos.filter(r=>r.id!==id);
 if(candidate)next.splice(index,0,candidate);
 state.daily={day:before.day,repos:next};
 state.seen=[...new Set([...(state.seen||[]),id,...next.map(r=>r.id)])];if(candidate)markPresented(state,[candidate],now);
 return true;
}
function cycle(state,id,day=localDay(),now=Date.now()) {
 if(!Number.isSafeInteger(id)||state.daily?.day!==day||!state.daily.repos.some(r=>r.id===id))return{changed:false,reason:'stale'};
 const used=new Set(state.daily.repos.map(r=>r.id)),seen=new Set(state.seen||[]);
 const candidate=candidates(state,now)[0];
 if(!candidate)return{changed:false,exhausted:true,reason:'exhausted'};
 const index=state.daily.repos.findIndex(r=>r.id===id);
 state.lastRotation={day:state.daily.day,repos:state.daily.repos.map(r=>({...r}))};
 state.daily={...state.daily,repos:state.daily.repos.map((r,i)=>i===index?candidate:r)};
 state.seen=[...new Set([...(state.seen||[]),id,candidate.id])];markPresented(state,[candidate],now);
 return{changed:true,id:candidate.id,index};
}
function undo(state) {
 if(!state.lastRotation||state.lastRotation.day!==localDay())return false;
 state.daily={...state.lastRotation,repos:state.lastRotation.repos.filter(r=>allowed(r,state))};
 state.lastRotation=null;return true;
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
 if(state.settings?.compactRevision!==1)state.settings={...state.settings,panelWidth:960,density:'compact',motionDuration:80,motionPreset:'snappy',hoverDelay:0,hideDelay:0,autoHide:true,collapseOnLeave:true,hoverExpand:true};
 if(state.settings?.liveRevision!==2)state.settings={...state.settings,dynamicRefresh:true,cyclePauseHover:false};
 const presented=state.presentedAt&&typeof state.presentedAt==='object'&&!Array.isArray(state.presentedAt)?state.presentedAt:{};state.presentedAt=Object.fromEntries(Object.entries(presented).filter(([id,time])=>Number.isSafeInteger(Number(id))&&Number.isFinite(time)&&time>0));for(const id of state.seen||[])if(!state.presentedAt[id])state.presentedAt[id]=Date.now();
 state.workspace=require('./workspace.cjs').normalize(state.workspace);state.settings=settings({...state.settings,...(state.settings?.autoHide===undefined?{hoverExpand:true}:{})});state.history=Array.isArray(state.history)?state.history.filter(h=>h&&normalizeRepo(h.repo)&&Number.isFinite(Date.parse(h.openedAt))).sort((a,b)=>Date.parse(b.openedAt)-Date.parse(a.openedAt)).slice(0,500).map(h=>({repo:normalizeRepo(h.repo),openedAt:h.openedAt})):[];
 state.blockedOwners=Array.isArray(state.blockedOwners)?state.blockedOwners.filter(s=>typeof s==='string'&&/^[\w.-]+$/.test(s)):[];
 state.snoozed=state.snoozed&&typeof state.snoozed==='object'&&!Array.isArray(state.snoozed)?state.snoozed:{};
 return state;
}
module.exports={SETTINGS,settings,allowed,selectFeed,present,candidates,nextBatch,rotate,cycle,undo,collection,sources,initialize};
