'use strict';
// Loopback-only development fixture. This file is excluded from desktop packages.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const advisor=require('../src/advisor.cjs');
const {defaults,TOPICS,localDay}=require('../src/engine.cjs'),D=require('../src/discovery.cjs'),W=require('../src/workspace.cjs'),{destination}=require('../src/navigation.cjs');
function createPreviewServer(){
 let state=D.initialize(defaults()),revision=0,mode='panel',lastExternal=null,insight=null;
 state.settings.autoHide=false;state.cache=require('../test/fixtures.cjs');state.cacheAt=new Date().toISOString();state.profile.weights={ai:10,tools:8,systems:6};D.present(state);
 function snapshot(){return{...structuredClone(state),revision,insight,contextStatus:'fixture',windowMode:mode,lastExternal,catalog:state.cache,catalogSize:state.cache.length,analytics:W.analytics(state.history,state.workspace),topics:TOPICS,languages:[...new Set(state.cache.map(r=>r.language).filter(Boolean))],version:require('../package.json').version,platform:'linux',canUndo:!!state.lastRotation,exclusions:{hidden:[],snoozed:[],owners:[]}};}
 const find=id=>[...state.cache,...state.saved].find(r=>r.id===id);
 async function command(name,args=[]){
  if(name==='previewBounds')return require('../src/layout.cjs').bounds({x:0,y:0,width:1280,height:800},state.settings,args[0]);
  if(name==='next'){const result=D.nextBatch(state);if(result.changed)revision++;return{...result,state:snapshot()};}
  if(name==='previewInsight'){insight=advisor.recommend(state);mode='insight';revision++;return snapshot();}
  if(name==='dismissInsight'){insight=null;mode='collapsed';revision++;return snapshot();}
  if(name==='state')return snapshot();if(name==='refresh')return{state:snapshot(),error:null};
  if(name==='expand'){mode=typeof args[0]==='object'?args[0].mode:args[0];return null;}if(name==='fit'||name==='copy')return true;
  if(name==='libraryQuery')return W.query(state.cache,args[0],state.workspace,state.saved,state.history);
  if(name==='releaseCheck')return{id:args[0],status:'available',available:true,tag:'v1.0.0',checkedAt:new Date().toISOString()};
  if(name==='settings'){state.settings=D.settings({...state.settings,...args[0]});D.present(state);}
  else if(name==='workspacePatch')state.workspace=W.patch(state.workspace,find(args[0]),args[1]);
  else if(name==='workspaceCollection'){const [action,payload]=args;state.workspace=W.collection(state.workspace,action,{...payload,id:action==='create'?'preview-'+Date.now():payload.id},state.cache.map(r=>r.id));}
  else if(name==='workspaceBulk'){const [ids,action]=args;for(const id of ids){const repo=find(id);if(!repo)continue;if(action==='save')state.saved=[...new Map([...state.saved,repo].map(r=>[r.id,r])).values()];else if(action==='unsave')state.saved=state.saved.filter(r=>r.id!==id);else state.workspace=W.patch(state.workspace,repo,{[({read:'read',unread:'read',pin:'pinned',unpin:'pinned',queue:'queued',unqueue:'queued'})[action]]:['read','pin','queue'].includes(action)});}}
  else if(name==='react'){const [id,action]=args,repo=find(id);if(!repo)throw Error('Fixture not found');if(action==='save')state.saved=state.saved.some(r=>r.id===id)?state.saved.filter(r=>r.id!==id):[repo,...state.saved];if(action==='hide'){state.hidden.push(id);D.present(state);}}
  else if(name==='open'){const [id,kind]=args,repo=find(id);lastExternal={url:destination(repo,kind,{available:true}),kind,id};if(['repository','learn','releases'].includes(kind)){state.history.unshift({repo,openedAt:new Date().toISOString()});D.rotate(state,id);}}
  else if(name==='cycle'){const result=state.settings.dynamicRefresh?D.cycle(state,args[0]?.id,args[0]?.day):{changed:false,reason:'paused'};if(result.changed)revision++;return{...result,state:snapshot()};}
  else if(name==='undo')D.undo(state);
  else if(name==='profile'){state.profile.weights=args[0];}
  else if(['exportRss','exportData','hide','quit','importProfile','importData','clear','clearHistory','resetControls','removeHistory','removeExclusion'].includes(name))return null;
  else throw Error('Unsupported fixture operation');revision++;return snapshot();
 }
 const bridge=`(()=>{let listener,modeListener;async function invoke(name,...args){const response=await fetch('/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,args})});const result=await response.json();if(!response.ok)throw new Error(result.error);if(result?.settings&&result?.profile)listener?.(structuredClone(result));if(name==='expand')modeListener?.(args[0]);if(name==='previewInsight'||name==='dismissInsight')modeListener?.({mode:result.windowMode,insight:result.insight});return result;}const names=${JSON.stringify(['next','previewBounds','previewInsight','dismissInsight','state','refresh','expand','fit','copy','libraryQuery','releaseCheck','settings','workspacePatch','workspaceCollection','workspaceBulk','react','open','cycle','undo','profile','exportRss','exportData','hide','quit','importProfile','importData','clear','clearHistory','resetControls','removeHistory','removeExclusion'])};window.pulse=Object.fromEntries(names.map(name=>[name,(...args)=>invoke(name,...args)]));window.pulse.onState=fn=>{listener=fn;return()=>{listener=null;}};window.pulse.onMode=fn=>{modeListener=fn;return()=>{modeListener=null;}};document.title='RepoPulse 11 · Fixture preview';document.body.dataset.preview='true';})();`;
 return http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1');if(req.method==='POST'&&url.pathname==='/rpc'){let body='';for await(const chunk of req){body+=chunk;if(body.length>100000)throw Error('Request too large');}const {name,args}=JSON.parse(body);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(await command(name,args)));return;}
 if(req.method!=='GET'){res.writeHead(405);res.end();return;}if(url.pathname==='/preview-bridge.js'){res.setHeader('Content-Type','application/javascript');res.end(bridge);return;}
 const name=url.pathname==='/'?'index.html':url.pathname.slice(1),allowed=['index.html','styles.css','renderer.js','ui-core.js','island-motion.js','morph.js','dynamic-feed.js','ultimate.js'];if(!allowed.includes(name)){res.writeHead(404);res.end();return;}
 let source=fs.readFileSync(path.join(__dirname,'../app',name),'utf8');if(name==='index.html')source=source.replace("connect-src 'none'","connect-src 'self'").replace('<script src="ui-core.js">','<script src="preview-bridge.js"></script><script src="ui-core.js">');res.setHeader('Content-Type',name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':'application/javascript');res.end(source);
 }catch(error){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message}));}});
}
if(require.main===module)createPreviewServer().listen(4173,'127.0.0.1',()=>console.log('Fixture preview: http://127.0.0.1:4173'));
module.exports={createPreviewServer};
