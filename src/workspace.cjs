'use strict';
const {normalizeRepo,localDay}=require('./engine.cjs');
const COLORS=['sand','ocean','violet','mint','rose'];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const idValid=id=>(typeof id==='number'||typeof id==='string'&&/^\d+$/.test(id))&&Number.isSafeInteger(Number(id))&&Number(id)>0;
const safeText=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
function tags(input){return [...new Set((Array.isArray(input)?input:[]).map(t=>safeText(t,32).toLowerCase()).filter(Boolean))].slice(0,12);}
function metadata(input={}){input=input&&typeof input==='object'?input:{};return{notes:typeof input.notes==='string'?input.notes.slice(0,20000):'',tags:tags(input.tags),rating:(typeof input.rating==='number'||typeof input.rating==='string'&&input.rating.trim()!=='')&&[0,1,2,3,4,5].includes(Number(input.rating))?Number(input.rating):0,pinned:input.pinned===true,read:input.read===true,queued:input.queued===true,priority:['low','normal','high'].includes(input.priority)?input.priority:'normal',updatedAt:typeof input.updatedAt==='string'&&Number.isFinite(Date.parse(input.updatedAt))?input.updatedAt:null};}
function normalize(input={}){
 const out={schema:'repopulse.workspace.v1',records:{},collections:[]};
 for(const [id,record]of Object.entries(input?.records||{}).slice(0,2000)){if(!idValid(id)||!record||typeof record!=='object')continue;const repo=normalizeRepo(record.repo);if(!repo||repo.id!==Number(id))continue;out.records[Number(id)]={...metadata(record),repo};}
 const seen=new Set();
 for(const c of (Array.isArray(input?.collections)?input.collections:[]).slice(0,50)){const id=safeText(c?.id,64),name=safeText(c?.name,80);if(!/^[a-zA-Z0-9_-]+$/.test(id)||!name||seen.has(id))continue;seen.add(id);out.collections.push({id,name,color:COLORS.includes(c.color)?c.color:'sand',repos:[...new Set((Array.isArray(c.repos)?c.repos:[]).filter(id=>idValid(id)).map(Number))].slice(0,2000)});}
 return out;
}
function patch(input,repo,changes,now=Date.now()){
 const out=normalize(input);repo=normalizeRepo(repo);if(!repo)throw new Error('Repository unavailable.');
 if(!changes||typeof changes!=='object'||Array.isArray(changes))throw new Error('Invalid annotation.');
 const current=out.records[repo.id]||metadata();const update={};
 for(const key of ['notes','tags','rating','pinned','read','queued','priority'])if(own(changes,key))update[key]=changes[key];
 if(!out.records[repo.id]&&Object.keys(out.records).length>=2000)throw new Error('Maximum 2,000 annotated repositories. Export or remove annotations first.');out.records[repo.id]={...metadata({...current,...update}),repo,updatedAt:new Date(now).toISOString()};return out;
}
function collection(input,action,payload={},known=[]){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Invalid collection input.');const out=normalize(input),id=safeText(payload.id,64),current=out.collections.find(c=>c.id===id),allowed=new Set(known.filter(idValid).map(Number));
 if(action==='create'){if(out.collections.length>=50)throw new Error('Maximum 50 collections.');if(!/^[a-zA-Z0-9_-]{1,64}$/.test(id)||!safeText(payload.name,80)||current)throw new Error('Choose a unique collection name.');out.collections.push({id,name:safeText(payload.name,80),color:COLORS.includes(payload.color)?payload.color:'sand',repos:[]});return out;}
 if(!current)throw new Error('Collection unavailable.');
 if(action==='rename'){if(!safeText(payload.name,80))throw new Error('Collection name is required.');current.name=safeText(payload.name,80);}
 else if(action==='color'){if(!COLORS.includes(payload.color))throw new Error('Unknown collection color.');current.color=payload.color;}
 else if(action==='delete')out.collections=out.collections.filter(c=>c.id!==id);
 else if(action==='clear')current.repos=[];
 else if(['add','remove'].includes(action)){const ids=(Array.isArray(payload.repos)?payload.repos:[]).filter(idValid).map(Number);current.repos=action==='add'?[...new Set([...current.repos,...ids.filter(i=>allowed.has(i))])].slice(0,2000):current.repos.filter(i=>!ids.includes(i));}
 else throw new Error('Unknown collection action.');return out;
}
function merge(current,incoming){
 if(incoming?.records&&Object.keys(incoming.records).length>2000)throw new Error('Workspace exceeds 2,000 annotations; import cancelled.');if(incoming?.schema!=='repopulse.workspace.v1')throw new Error('Choose a RepoPulse workspace export.');
 const a=normalize(current),b=normalize(incoming);if(!Object.keys(b.records).length&&!b.collections.length)throw new Error('Workspace contains no valid items.');
 const timestamp=value=>value&&Number.isFinite(Date.parse(value))?Date.parse(value):-Infinity;
 for(const [id,r]of Object.entries(b.records)){if(!a.records[id]||timestamp(r.updatedAt)>timestamp(a.records[id].updatedAt))a.records[id]=r;}
 if(Object.keys(a.records).length>2000)throw new Error('Workspace exceeds 2,000 annotations; import cancelled.');for(const c of b.collections){const old=a.collections.find(x=>x.id===c.id);if(old)old.repos=[...new Set([...old.repos,...c.repos])].slice(0,2000);else if(a.collections.length<50)a.collections.push(c);}return normalize(a);
}
function query(repos,input={},workspace={},saved=[],history=[]){
 input=input&&typeof input==='object'&&!Array.isArray(input)?input:{};repos=[...new Map((Array.isArray(repos)?repos:[]).map(normalizeRepo).filter(Boolean).map(r=>[r.id,r])).values()];const w=normalize(workspace),savedIds=new Set((Array.isArray(saved)?saved:[]).filter(Boolean).map(r=>r.id)),visited=new Set((Array.isArray(history)?history:[]).filter(h=>h?.repo).map(h=>h.repo.id)),terms=String(input.query||'').slice(0,1000).toLowerCase().trim().split(/\s+/).filter(t=>t&&t!=='-');
 let rows=repos.filter(r=>{const m=w.records[r.id]||metadata();const hay=[r.full_name,r.description,r.language,...(r.topics||[]),m.notes,...m.tags].join(' ').toLowerCase();
 if(input.language&&r.language!==input.language)return false;if(input.topic&&!(r.topics||[]).includes(input.topic))return false;if(input.license&&r.license!==input.license)return false;
 if(input.scope==='saved'&&!savedIds.has(r.id)||input.scope==='queued'&&!m.queued||input.scope==='pinned'&&!m.pinned||input.scope==='noted'&&!m.notes||input.scope==='rated'&&!m.rating||input.scope==='read'&&!m.read||input.scope==='unread'&&m.read||input.scope==='visited'&&!visited.has(r.id))return false;
 if(input.collection&&!w.collections.find(c=>c.id===input.collection)?.repos.includes(r.id))return false;
 return terms.every(raw=>{const negative=raw.startsWith('-'),t=negative?raw.slice(1):raw;let found;
 if(t.startsWith('owner:'))found=r.full_name.split('/')[0].toLowerCase()===t.slice(6);
 else if(t.startsWith('lang:'))found=String(r.language||'').toLowerCase()===t.slice(5);
 else if(t.startsWith('tag:'))found=m.tags.includes(t.slice(4))||(r.topics||[]).some(topic=>topic.toLowerCase()===t.slice(4));
 else if(t.startsWith('is:')){const flags={saved:savedIds.has(r.id),queued:m.queued,pinned:m.pinned,read:m.read,unread:!m.read,noted:!!m.notes,rated:m.rating>0,visited:visited.has(r.id)};found=flags[t.slice(3)]===true;}
 else found=hay.includes(t);return negative?!found:found;});
 });
 const priority={high:2,normal:1,low:0};
 const sorts={stars:(a,b)=>b.stargazers_count-a.stargazers_count,name:(a,b)=>a.full_name.localeCompare(b.full_name),updated:(a,b)=>(Date.parse(b.pushed_at)||0)-(Date.parse(a.pushed_at)||0),rating:(a,b)=>(w.records[b.id]?.rating||0)-(w.records[a.id]?.rating||0),priority:(a,b)=>(priority[w.records[b.id]?.priority]??1)-(priority[w.records[a.id]?.priority]??1)};
 if(own(sorts,input.sort))rows.sort(sorts[input.sort]);if(input.pinnedFirst)rows.sort((a,b)=>Number(w.records[b.id]?.pinned||false)-Number(w.records[a.id]?.pinned||false));return rows;
}
function csv(repos,workspace={}){const w=normalize(workspace);const cell=v=>{let s=String(v??'');if(/^(\s*[=+\-@]|[\t\r])/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};return[['repository','url','stars','language','license','rating','read','queued','tags','notes'],...repos.map(r=>{const m=w.records[r.id]||metadata();return[r.full_name,'https://github.com/'+r.full_name,r.stargazers_count,r.language,r.license,m.rating,m.read,m.queued,m.tags.join('; '),m.notes];})].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';}
function analytics(history=[],workspace={},now=Date.now()){
 const valid=(Array.isArray(history)?history:[]).filter(h=>h?.repo&&typeof h.openedAt==='string'&&Number.isFinite(Date.parse(h.openedAt))&&Date.parse(h.openedAt)<=now+60000),languages=Object.create(null),topics=Object.create(null);for(const h of valid){const lang=h.repo.language||'Other';languages[lang]=(languages[lang]||0)+1;for(const t of h.repo.topics||[])topics[t]=(topics[t]||0)+1;}
 const days=Array.from({length:7},(_,i)=>{const d=new Date(now);d.setDate(d.getDate()-(6-i));const day=localDay(d);return{day,count:valid.filter(h=>localDay(new Date(h.openedAt))===day).length};});
 const w=normalize(workspace),records=Object.values(w.records),unique=new Set(valid.map(h=>h.repo.id)).size;
 return{opens:valid.length,unique,revisits:valid.length-unique,today:days[6].count,week:days.reduce((a,b)=>a+b.count,0),days,languages:Object.entries(languages).sort((a,b)=>b[1]-a[1]),topics:Object.entries(topics).sort((a,b)=>b[1]-a[1]).slice(0,12),notes:records.filter(r=>r.notes).length,queued:records.filter(r=>r.queued).length,pinned:records.filter(r=>r.pinned).length,read:records.filter(r=>r.read).length,rated:records.filter(r=>r.rating).length,collections:w.collections.length};
}
module.exports={COLORS,metadata,normalize,patch,collection,merge,query,csv,analytics};
