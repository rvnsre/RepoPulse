'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {createNotifier}=require('../src/notifications.cjs');
const {syncTopmost}=require('../src/window-policy.cjs');

test('Restoring the pinned window reasserts topmost using the Windows stacking level',()=>{
 let pinned=true;
 const writes=[];
 const window={isDestroyed:()=>false,isAlwaysOnTop:()=>pinned,setAlwaysOnTop(value,level){pinned=value;writes.push([value,level]);}};
 syncTopmost(window,true,'win32');
 syncTopmost(window,true,'win32',true);
 syncTopmost(window,false,'win32');
 syncTopmost(window,false,'win32',true);
 assert.deepEqual(writes,[[true,'pop-up-menu'],[false,'pop-up-menu']]);
});

test('A delivered notification retains its click action and failed delivery is reported',async()=>{
 let notification,opened=0,fail=false;
 class Notification extends EventEmitter {
  static isSupported(){return true;}
  constructor(){super();notification=this;}
  show(){this.emit(fail?'failed':'show');}
  close(){this.emit('close');}
 }
 const service=createNotifier(Notification,()=>opened++);
 assert.equal(await service.send('RepoPulse','Daily picks'),'shown');
 notification.emit('click');
 assert.equal(opened,1);
 fail=true;
 assert.equal(await service.send('RepoPulse','Test'),'failed');
 service.close();
});
