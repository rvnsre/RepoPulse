'use strict';
const {selectDaily, ranked, eligible, localDay, normalizeRepo, defaults}=require('./engine.cjs');
const SETTINGS={pinned:true,reducedMotion:false,launchAtLogin:false,autoReplace:true,hoverExpand:false,notifications:false,pausedLearning:false,opacity:100,anchor:'center',theme:'reference',density:'comfortable',minStars:50000,languages:[]};
function settings(input={}) {
 const out={...SETTINGS};
 for(const key of ['pinned','reducedMotion','launchAtLogin','autoReplace','hoverExpand','notifications','pausedLearning'])if(typeof input[key]==='boolean')out[key]=input[key];
 if(Number.isFinite(input.opacity))out.opacity=Math.max(65,Math.min(100,Math.round(input.opacity)));
 if(Number.isFinite(input.minStars))out.minStars=Math.max(50000,Math.min(1000000,Math.round(input.minStars)));
 for(const [key,values]of Object.entries({anchor:['left','center','right'],theme:['reference','graphite','contrast'],density:['comfortable','compact']}))if(values.includes(input[key]))out[key]=input[key];
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
 state.daily=selectFeed(state.cache,state);
 state.seen=[...new Set([...(state.seen||[]),...state.daily.repos.map(r=>r.id)])];
 return state.daily;
}
function rotate(state,id,now=Date.now()) {
 const before=state.daily, index=before?.repos.findIndex(r=>r.id===id)??-1;
 if(index<0)return false;
 state.lastRotation={day:before.day,repos:before.repos.map(r=>({...r}))};
 const oldIds=new Set(before.repos.map(r=>r.id));
 const candidate=ranked(state.cache,state.profile?.weights||{},before.day).find(r=>allowed(r,state,now)&&!oldIds.has(r.id)&&!(state.seen||[]).includes(r.id));
 const next=before.repos.filter(r=>r.id!==id);
 if(candidate)next.splice(index,0,candidate);
 state.daily={day:before.day,repos:next};
 state.seen=[...new Set([...(state.seen||[]),id,...next.map(r=>r.id)])];
 return true;
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
 state.settings=settings(state.settings);state.history=Array.isArray(state.history)?state.history.filter(h=>h&&normalizeRepo(h.repo)&&Number.isFinite(Date.parse(h.openedAt))).slice(0,500).map(h=>({repo:normalizeRepo(h.repo),openedAt:h.openedAt})):[];
 state.blockedOwners=Array.isArray(state.blockedOwners)?state.blockedOwners.filter(s=>typeof s==='string'&&/^[\w.-]+$/.test(s)):[];
 state.snoozed=state.snoozed&&typeof state.snoozed==='object'&&!Array.isArray(state.snoozed)?state.snoozed:{};
 return state;
}
module.exports={SETTINGS,settings,allowed,selectFeed,present,rotate,undo,collection,sources,initialize};
