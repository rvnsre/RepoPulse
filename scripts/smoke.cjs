'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
async function smoke({app,window,store,resize,TOPICS,snapshot}){
 const root=path.join(__dirname,'../dist');fs.mkdirSync(root,{recursive:true});const errors=[];
 window.webContents.on('console-message',(_event,level,message)=>{if(level>=3)errors.push(message);});
 await new Promise(resolve=>window.webContents.isLoading()?window.webContents.once('did-finish-load',resolve):resolve());
 const evaluate=script=>window.webContents.executeJavaScript(script);
 async function until(check){for(let i=0;i<50;i++){if(await check())return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Native UI did not reach the expected state.');}
 await until(()=>evaluate(`!!document.querySelector('.repo-row')`));
 let dimensions=await evaluate(`({rows:document.querySelectorAll('.repo-row').length,width:innerWidth,height:innerHeight,footer:document.querySelector('footer').getBoundingClientRect().bottom})`);
 assert.equal(dimensions.rows,2);assert.ok(dimensions.width>=900);assert.ok(dimensions.footer<=dimensions.height+1,JSON.stringify(dimensions));

 async function capture(name){
  window.show();window.focus();window.webContents.focus();let png=null;
  for(let attempt=0;attempt<12;attempt++){
   await new Promise(resolve=>setTimeout(resolve,400));const bounds=window.getBounds();
   const image=await window.webContents.capturePage({x:0,y:0,width:bounds.width,height:bounds.height},{stayHidden:false,stayAwake:true});
   if(!image.isEmpty()){const bytes=image.toPNG();if(bytes.length>5000){png=bytes;break;}}
  }
  assert.ok(png,'The compositor must produce a visible native preview within five seconds.');fs.writeFileSync(path.join(root,name),png);
  if(name==='desktop-preview.png'){const encoded=png.toString('base64');for(let n=0;n<encoded.length;n+=4096)console.log('REPOPULSE_PREVIEW:'+encoded.slice(n,n+4096));}
 }

 await capture('desktop-preview.png');
 const first=store.state.daily.repos[0],second=store.state.daily.repos[1];
 await evaluate(`document.querySelector('.row-extra button').click()`);await until(()=>store.state.saved.length===1);
 await evaluate(`document.querySelector('.repo-name').click()`);await until(()=>store.state.history.length===1);
 assert.notEqual(store.state.daily.repos[0].id,first.id);assert.equal(store.state.daily.repos[1].id,second.id);
 await evaluate(`document.getElementById('undo').click()`);await until(()=>store.state.daily.repos[0].id===first.id);
 await evaluate(`document.getElementById('learn').click()`);await until(()=>evaluate(`!document.getElementById('drawer').hidden`));await capture('workspace-preview.png');
 await evaluate(`document.querySelector('[data-tab="tune"]').click()`);await until(()=>evaluate(`document.querySelectorAll('.topic').length===8`));
 await evaluate(`document.querySelector('[data-tab="settings"]').click()`);await until(()=>evaluate(`document.querySelectorAll('.setting').length>=12`));
 await evaluate(`document.querySelector('[data-tab="saved"]').click()`);await until(()=>evaluate(`document.querySelectorAll('.list-row').length===1`));
 assert.deepEqual(errors,[]);console.log('Native UI passed: reference panel, two rows, pixel capture, save, auto-replace in place, undo, interests, settings and saved collection.');app.exit(0);
}
module.exports={smoke};
