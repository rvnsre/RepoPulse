'use strict';
const fs=require('node:fs'),path=require('node:path');
const {defaults}=require('./engine.cjs');
const {Worker}=require('node:worker_threads');
const {setTimeout:delay}=require('node:timers/promises');
const {readBuffer}=require('./bounded-file.cjs');
const MAX_STATE_BYTES=32*1024*1024;
const RETRIABLE=new Set(['EPERM','EBUSY','EACCES']);
function serialize(state){
 return new Promise((resolve,reject)=>{
  const worker=new Worker(`
    const {parentPort,workerData}=require('node:worker_threads');
    parentPort.postMessage(JSON.stringify(workerData));
  `,{eval:true,workerData:state});
  worker.once('message',resolve);
  worker.once('error',reject);
  worker.once('exit',code=>reject(new Error('State serializer exited with code '+code)));
 });
}
async function atomicWrite(file,state){
 const content=await serialize(state);
 if(Buffer.byteLength(content)>MAX_STATE_BYTES)throw Error('State exceeds 32 MB.');
 await fs.promises.mkdir(path.dirname(file),{recursive:true});
 const temp=file+'.'+require('node:crypto').randomUUID()+'.tmp';
 try{
  await fs.promises.writeFile(temp,content,{mode:0o600,flag:'wx'});
  for(let attempt=0;;attempt++){
   try{await fs.promises.rename(temp,file);break;}
   catch(error){if(attempt===5||!RETRIABLE.has(error.code))throw error;await delay(40*2**attempt);}
  }
 }finally{await fs.promises.rm(temp,{force:true}).catch(()=>{});}
}
function freezeCatalog(value){
 if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
 for(const entry of Object.values(value))freezeCatalog(entry);
 return Object.freeze(value);
}
class Store{
 constructor(file,{deferred=false,onError=()=>{}}={}){
  this.file=file;this.deferred=deferred;this.onError=onError;
  this.pending=null;this.writing=null;this.timer=null;
  this.state=defaults();this.load();
 }
 load(){
  let bytes;
  try{
   bytes=readBuffer(this.file,MAX_STATE_BYTES);
   const data=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));
   if(!data||Array.isArray(data)||data.version!==1)throw Error('Unsupported state version');
   this.state=require('./discovery.cjs').initialize({...defaults(),...data});
  }catch(error){
   if(error.code==='ENOENT')return;
   const recovery=this.file+'.recovery-'+require('node:crypto').randomUUID();
   if(bytes)fs.writeFileSync(recovery,bytes,{mode:0o600,flag:'wx'});
   else fs.renameSync(this.file,recovery);
   this.state=defaults();this.state.recoveryNotice='Settings could not be read. A recovery copy was preserved on this device.';
  }
 }
 save(){return this.writeSync(this.state);}
 writeSync(state){
  const content=JSON.stringify(state);
  if(Buffer.byteLength(content)>MAX_STATE_BYTES)throw Error('State exceeds 32 MB; changes were not saved.');
  fs.mkdirSync(path.dirname(this.file),{recursive:true});const temp=this.file+'.tmp';
  try{fs.writeFileSync(temp,content,{mode:0o600});fs.renameSync(temp,this.file);}
  catch(error){try{fs.unlinkSync(temp);}catch{}throw error;}
 }
 replace(value){
  if(!value||Array.isArray(value)||value.version!==1)throw Error('Invalid replacement state.');
  return this.commit(structuredClone(value));
 }
 commit(next){
  if(this.deferred){
   if(next.cache!==this.state.cache)freezeCatalog(next.cache);
   this.state=next;
   this.pending=next;
   if(!this.timer&&!this.writing){
    this.timer=setTimeout(()=>{this.flush().catch(this.onError);},300);
   }
   return this.state;
  }
  const previous=this.state;this.state=next;
  try{this.save();}catch(error){this.state=previous;throw error;}return this.state;
 }
 async flush(){
  clearTimeout(this.timer);this.timer=null;
  if(this.writing)return this.writing;
  if(!this.pending)return;
  this.writing=(async()=>{
   while(this.pending){
    const state=this.pending;this.pending=null;
    try{await atomicWrite(this.file,state);}
    catch(error){this.pending??=state;throw error;}
   }
  })().finally(()=>{this.writing=null;});
  return this.writing;
 }
 async flushOnQuit(){
  clearTimeout(this.timer);this.timer=null;
  if(this.writing)await this.writing.catch(()=>{});
  if(!this.pending)return;
  const state=this.pending;
  try{
   this.writeSync(state);
   this.pending=null;
  }catch(error){
   if(!RETRIABLE.has(error.code))throw error;
   await this.flush();
  }
 }
 update(fn){
  if(typeof fn!=='function'||fn.constructor?.name==='AsyncFunction')throw Error('State updates must be synchronous.');
  const next=this.deferred
   ?{...structuredClone({...this.state,cache:null}),cache:freezeCatalog(this.state.cache)}
   :structuredClone(this.state);
  const result=fn(next);
  if(result&&typeof result.then==='function')throw Error('State updates must be synchronous.');
  return this.commit(next);
 }
}
module.exports={Store,MAX_STATE_BYTES};
