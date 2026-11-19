'use strict';

function createNotifier(Notification,onOpen){
 const active=new Set();

 function send(title,body){
  if(!Notification.isSupported())return Promise.resolve('unavailable');
  return new Promise(resolve=>{
   const item=new Notification({title,body});
   active.add(item);
   const requested=setTimeout(()=>resolve('requested'),2000);
   const release=setTimeout(()=>active.delete(item),60000);
   requested.unref();
   release.unref();
   const finish=result=>{clearTimeout(requested);resolve(result);};
   const cleanup=()=>{clearTimeout(release);active.delete(item);};
   item.once('show',()=>finish('shown'));
   item.once('failed',()=>{finish('failed');cleanup();});
   item.once('close',cleanup);
   item.once('click',()=>{cleanup();onOpen();});
   try{item.show();}
   catch{finish('failed');cleanup();}
  });
 }

 function close(){
  for(const item of active)item.close();
  active.clear();
 }

 return {send,close};
}

module.exports={createNotifier};
