'use strict';
const fs=require('node:fs'),path=require('node:path');
const {defaults}=require('./engine.cjs');
const MAX_STATE_BYTES=32*1024*1024;
class Store{
 constructor(file){this.file=file;this.state=defaults();this.load();}
 load(){
  if(!fs.existsSync(this.file))return;
  try{
   if(fs.statSync(this.file).size>MAX_STATE_BYTES)throw Error('State file exceeds 32 MB');
   const data=JSON.parse(fs.readFileSync(this.file,'utf8').replace(/^\uFEFF/,''));
   if(!data||Array.isArray(data)||data.version!==1)throw Error('Unsupported state version');
   this.state=require('./discovery.cjs').initialize({...defaults(),...data});
  }catch(error){
   fs.copyFileSync(this.file,this.file+'.recovery-'+Date.now());
   this.state=defaults();this.state.recoveryNotice='Settings could not be read. A recovery copy was preserved on this device.';
  }
 }
 save(){
  const content=JSON.stringify(this.state);
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
  const previous=this.state;this.state=next;
  try{this.save();}catch(error){this.state=previous;throw error;}return this.state;
 }
 update(fn){
  if(typeof fn!=='function'||fn.constructor?.name==='AsyncFunction')throw Error('State updates must be synchronous.');
  const next=structuredClone(this.state),result=fn(next);
  if(result&&typeof result.then==='function')throw Error('State updates must be synchronous.');
  return this.commit(next);
 }
}
module.exports={Store,MAX_STATE_BYTES};
