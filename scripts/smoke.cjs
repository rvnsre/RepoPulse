'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
async function smoke({app,window,store,resize,TOPICS,snapshot}){
 const root=path.join(__dirname,'../dist');fs.mkdirSync(root,{recursive:true});const errors=[];
 window.webContents.on('console-message',(_event,level,message)=>{if(level>=3)errors.push(message);});
 await new Promise(resolve=>window.webContents.isLoading()?window.webContents.once('did-finish-load',resolve):resolve());
 const evaluate=script=>window.webContents.executeJavaScript(script);
 async function until(check){for(let i=0;i<50;i++){if(await check())return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Native UI did not reach the expected state: '+JSON.stringify(await evaluate(`({rows:[...document.querySelectorAll('.repo-row')].map(r=>r.dataset.repoId),selected:document.getElementById('selectedLabel').textContent,toast:document.getElementById('toast').textContent,expanded:!document.getElementById('expanded').hidden,drawer:!document.getElementById('drawer').hidden})`)));}
 await until(()=>evaluate(`!!document.querySelector('.repo-row')`));
 await new Promise(r=>setTimeout(r,500));let dimensions=await evaluate(`({rows:document.querySelectorAll('.repo-row').length,width:innerWidth,height:innerHeight,footer:document.querySelector('footer').getBoundingClientRect().bottom})`);
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
 await evaluate(`window.originalRow=document.querySelector('.repo-row');document.querySelector('.row-extra button').focus();document.querySelector('.row-extra button').click()`);await until(()=>store.state.saved.length===1);await new Promise(r=>setTimeout(r,100));
 assert.equal(await evaluate(`window.originalRow===document.querySelector('.repo-row')`),true,'Saving must retain the row DOM');
 const fonts=await evaluate(`({description:parseFloat(getComputedStyle(document.querySelector('.repo-description')).fontSize),code:parseFloat(getComputedStyle(document.querySelector('pre')).fontSize),overflow:document.documentElement.scrollWidth>innerWidth})`);
 assert.ok(fonts.description>=14);assert.ok(fonts.code>=13);assert.equal(fonts.overflow,false);
 await evaluate(`document.getElementById('learn').click()`);await until(()=>store.state.history.length===1);
 assert.equal(snapshot().lastExternal.url,'https://github.com/'+first.full_name);assert.equal(snapshot().lastExternal.kind,'learn');assert.notEqual(store.state.daily.repos[0].id,first.id);assert.equal(store.state.daily.repos[1].id,second.id);
 await until(()=>evaluate(`!document.getElementById('undo').disabled`));await evaluate(`document.getElementById('undo').click()`);await until(()=>store.state.daily.repos[0].id===first.id);
 await until(()=>evaluate(`document.querySelector('.repo-row').dataset.repoId==='${first.id}'&&document.getElementById('selectedLabel').textContent==='${first.full_name}'&&!document.getElementById('install').disabled`));await evaluate(`document.getElementById('install').click()`);await until(()=>snapshot().lastExternal?.kind==='releases');assert.equal(snapshot().lastExternal.url,'https://github.com/'+first.full_name+'/releases');
 await until(()=>evaluate(`!document.getElementById('undo').disabled`));await evaluate(`document.getElementById('undo').click()`);await until(()=>store.state.daily.repos[0].id===first.id);
 await until(()=>evaluate(`document.querySelector('.repo-row').dataset.repoId==='${first.id}'`));
 await evaluate(`document.querySelector('.row-extra button:last-child').click()`);await until(()=>evaluate(`!document.getElementById('drawer').hidden`));await capture('workspace-preview.png');
 await evaluate(`document.querySelector('[data-tab="tune"]').click()`);await until(()=>evaluate(`document.querySelectorAll('.topic').length===8`));
 await evaluate(`document.querySelector('[data-tab="settings"]').click()`);await until(()=>evaluate(`document.querySelectorAll('.setting').length>=12`));
 await evaluate(`document.querySelector('[data-tab="saved"]').click()`);await until(()=>evaluate(`document.querySelectorAll('.list-row').length===1`));
 await evaluate(`window.pulse.settings({textScale:150,motion:'none',visibleRows:3})`);await until(()=>evaluate(`document.body.dataset.scale==='150'&&document.querySelectorAll('.repo-row').length===3`));
 assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,'Large text must fit');
 await evaluate(`document.getElementById('closeDrawer').click()`);await until(()=>evaluate(`document.getElementById('drawer').hidden`));
 await evaluate(`window.pulse.settings({textScale:100,motion:'system',visibleRows:2})`);await until(()=>evaluate(`document.body.dataset.scale==='100'`));
 await evaluate(`document.getElementById('collapse').click();document.getElementById('toggle').click()`);await until(()=>evaluate(`!document.getElementById('expanded').hidden`));
 assert.deepEqual(errors,[]);console.log('Native UI passed: readable fonts, stable row DOM, direct Learn URL, verified Releases URL, independent replacement, undo, native screenshots, settings, 150% text, three rows, rapid toggle and collection.');app.exit(0);
}
module.exports={smoke};
