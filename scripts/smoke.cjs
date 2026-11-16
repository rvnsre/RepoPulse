'use strict';
// Native smoke check runs only in development via --smoke-test.
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
async function smoke({app,window,store,resize,TOPICS}){
  const root=path.join(__dirname,'../dist');fs.mkdirSync(root,{recursive:true});
  const errors=[];window.webContents.on('console-message',(_event,level,message)=>{if(level>=3)errors.push(message);});
  await new Promise(resolve=>{if(window.webContents.isLoading())window.webContents.once('did-finish-load',resolve);else resolve();});
  const fixture=require('../test/fixtures.cjs');store.state.cache=fixture;
  store.state.cacheAt=new Date().toISOString();store.state.profile.weights={ai:10,tools:8,systems:6};
  const {selectDaily}=require('../src/engine.cjs');store.state.daily=selectDaily(fixture,store.state);
  // Refresh uses the prepopulated cache; test fixtures never enter the shipped application.
  window.webContents.send('state:changed',{daily:store.state.daily,saved:[],settings:store.state.settings,profile:store.state.profile,topics:TOPICS,cacheAt:store.state.cacheAt,catalogSize:fixture.length});
  resize(true);
  await window.webContents.executeJavaScript(`document.getElementById('toggle').click()`);
  await new Promise(resolve=>setTimeout(resolve,450));
  const dimensions=await window.webContents.executeJavaScript(`({cards:document.querySelectorAll('article.repo').length, footer:document.querySelector('footer').getBoundingClientRect().bottom, height:innerHeight, expanded:!document.getElementById('expanded').hidden})`);
  assert.equal(dimensions.cards,3);assert.equal(dimensions.expanded,true);assert.ok(dimensions.footer<=dimensions.height+1,JSON.stringify(dimensions));
  fs.writeFileSync(path.join(root,'desktop-preview.png'),(await window.webContents.capturePage()).toPNG());
  await window.webContents.executeJavaScript(`document.querySelector('[data-tab="tune"]').click()`);
  assert.equal(await window.webContents.executeJavaScript(`document.querySelectorAll('.topic').length`),8);
  await window.webContents.executeJavaScript(`document.querySelector('[data-tab="today"]').click();document.querySelector('.actions button:nth-child(2)').click()`);
  await new Promise(resolve=>setTimeout(resolve,200));
  assert.equal(store.state.saved.length,1);
  assert.deepEqual(errors,[]);
  console.log('Native UI smoke passed: three cards, fitted footer, tune page and saved state.');
  app.exit(0);
}
module.exports={smoke};
