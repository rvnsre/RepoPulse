(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.FeedUI=factory();})(typeof window==='object'?window:this,function(){
'use strict';
function age(iso,now=Date.now()){const at=Date.parse(iso);if(!Number.isFinite(at)||at>now+60000)return null;const minutes=Math.max(0,Math.floor((now-at)/60000));return minutes<1?'just now':minutes<60?minutes+'m ago':minutes<1440?Math.floor(minutes/60)+'h ago':Math.floor(minutes/1440)+'d ago';}
function sync(state={},now=Date.now()){const at=Date.parse(state.cacheAt),fresh=!state.lastError&&Number.isFinite(at)&&at<=now+60000&&now-at<300000;return{fresh,tone:state.lastError?'error':fresh?'fresh':'stale',label:state.lastError?'Offline · cached picks':fresh?'Synced '+age(state.cacheAt,now):age(state.cacheAt,now)?'Last synced '+Math.max(0,Math.floor((now-at)/60000))+'m ago':'Not synced yet'};}
function activity(repo,entry={},now=Date.now()){if(entry.tag&&entry.releasedAt)return entry.tag+' · released '+(age(entry.releasedAt,now)||'date unavailable');if(entry.committedAt)return 'Commit '+(entry.sha||'')+' · '+(age(entry.committedAt,now)||'date unavailable');return repo.pushed_at?'Last push · '+(age(repo.pushed_at,now)||'date unavailable'):'Activity not fetched';}
function shortcut(platform){return platform==='darwin'?'⌘K':'Ctrl+K';}
return{age,sync,activity,shortcut};
});
