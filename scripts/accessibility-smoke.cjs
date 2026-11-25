'use strict';
// Runs the real renderer against explicit test fixtures. No user data or live APIs.
const {app,BrowserWindow}=require('electron');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createPreviewServer}=require('./preview.cjs');
if(process.platform==='linux')app.disableHardwareAcceleration();
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let window,server;
async function main(){
 await app.whenReady();server=createPreviewServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 window=new BrowserWindow({width:1100,height:850,show:false,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
 const errors=[];window.webContents.on('console-message',event=>{if(event.level==='error')errors.push(event.message);});
 await window.loadURL('http://127.0.0.1:'+server.address().port);
 window.show();window.focus();window.webContents.focus();
 const evaluate=async script=>{try{return await window.webContents.executeJavaScript(script);}catch(error){throw Error('Renderer check failed: '+script.slice(0,160),{cause:error});}};
 async function until(script){for(let n=0;n<100;n++){if(await evaluate(script))return;await wait(50);}throw Error('Timed out: '+script+' '+JSON.stringify(await evaluate("({active:document.activeElement?.outerHTML,settings:state?.settings,enabled:dynamicScheduler?.enabled,suspended:dynamicScheduler?.suspended})")));}
 await until("typeof state!=='undefined'&&!!state&&document.querySelectorAll('.repo-row').length===4");
 assert.equal(await evaluate('state.settings.dynamicRefresh'),false);
 assert.equal(await evaluate("document.getElementById('liveToggle').compareDocumentPosition(document.getElementById('feed')) & Node.DOCUMENT_POSITION_FOLLOWING"),4);
 assert.equal(await evaluate("document.getElementById('liveToggle').getAttribute('aria-label')"),'Start automatic repository rotation');
 assert.ok(await evaluate("document.getElementById('liveToggle').getBoundingClientRect().height>0"),'Start/Pause must be visible');
 assert.equal(await evaluate("document.getElementById('nextStatus').getAttribute('role')"),null);
 assert.ok(await evaluate("document.getElementById('next').getBoundingClientRect().height>=44"));
 // A timer request that resolves after focus enters must leave that DOM card intact.
 await evaluate("document.querySelector('.repo-name').focus();window.focusedCard=document.querySelector('.repo-row');window.originalCycle=api.cycle;api.cycle=async(...args)=>{await new Promise(resolve=>setTimeout(resolve,100));return originalCycle(...args);};void 0");
 await evaluate("dynamicScheduler.resume();changeSettings({dynamicRefresh:true,cycleSeconds:5});");
 await evaluate("window.pendingCycle=dynamicScheduler.rotate(0);document.querySelector('.repo-name').focus()");
 await evaluate('pendingCycle');await wait(600);
 assert.equal(await evaluate("document.activeElement.closest('.repo-row')===focusedCard"),true);
 // Focusing an actual descendant latches pause and persists it.
 await evaluate("document.getElementById('liveToggle').focus();document.querySelector('.repo-name').focus()");
 await until('state.settings.dynamicRefresh===false&&!dynamicScheduler.enabled');
 await evaluate("document.getElementById('next').focus();dynamicSync()");
 assert.equal(await evaluate('dynamicScheduler.enabled'),false);
 await evaluate("document.getElementById('liveToggle').click()");
 await until('dynamicScheduler.enabled');
 await evaluate("document.getElementById('liveToggle').click()");await until('!dynamicScheduler.enabled');
 await evaluate("document.getElementById('next').focus();document.getElementById('next').click()");
 await until("document.getElementById('toast').textContent.includes('eligible repositories remain.')");
 assert.equal(await evaluate("document.activeElement.id"),'next');
 await evaluate("openDrawer('settings')");
 await until("!!document.querySelector('select[aria-label=\"Minimum stars\"]')");
 assert.equal(await evaluate("document.querySelector('select[aria-label=\"Minimum stars\"]').value"),'20000');
 await evaluate("changeSettings({minStars:25000})");await until("document.querySelector('select[aria-label=\"Minimum stars\"]').value==='25000'");
 await evaluate("changeSettings({minStars:20000})");await until("document.querySelector('select[aria-label=\"Minimum stars\"]').value==='20000'");
 await evaluate('closeDrawer()');
 window.webContents.debugger.attach('1.3');
 await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await until('!dynamicScheduler.enabled');
 assert.equal(await evaluate('canAnimate()'),false);
 await evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8')+';void 0');
 const directory=path.join(__dirname,'../dist/accessibility');fs.mkdirSync(directory,{recursive:true});
 for(const mode of ['default','forced-colors']){
  await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:mode==='forced-colors'?[{name:'forced-colors',value:'active'}]:[]});
  const results=await evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}})");
  fs.writeFileSync(path.join(directory,'axe-'+mode+'.json'),JSON.stringify(results,null,2));
  let screenshot;
  for(let attempt=0;attempt<8;attempt++){
   try{screenshot=await window.webContents.capturePage();if(!screenshot.isEmpty())break;}catch(error){if(error.message!=='UnknownVizError'||attempt===7)throw error;}
   await wait(200);
  }
  assert.ok(screenshot&&!screenshot.isEmpty(),'A painted screenshot is required');
  fs.writeFileSync(path.join(directory,'rotation-'+mode+'-fixture.png'),screenshot.toPNG());
  console.log(JSON.stringify({mode,violations:results.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})),incomplete:results.incomplete.length,rendererErrors:errors},null,2));
  assert.equal(results.violations.length,0,'Automated accessibility violations in '+mode+'; see dist/accessibility');
 }
 await evaluate('changeSettings({textScale:150})');
 assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'150% text must not cause horizontal page overflow');
 await evaluate("openDrawer('professional')");
 await until("!!document.querySelector('select[aria-label=\"Professional domain\"]')");
 await evaluate("professionalDomain='imaging';loadProfessional(false)");
 assert.ok(await evaluate("professionalSnapshot.medicalNotice.includes('not clinical validation')"));
 await evaluate('loadProfessional(true)');
 assert.equal(await evaluate('professionalSnapshot.entries.length'),2);
 assert.ok(await evaluate('professionalSnapshot.entries.every(e=>e.repo.stargazers_count<20000)'));
 assert.equal(await evaluate('window.professionalInjected===true'),false,'External HTML must be rendered as text');
 await evaluate("document.querySelector('button[aria-label^=\"Toggle bookmark for\"]').click()");
 await until('state.saved.some(repo=>repo.id===professionalSnapshot.entries[0].repo.id)');
 const professionalResults=await evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}})");
 fs.writeFileSync(path.join(directory,'axe-professional.json'),JSON.stringify(professionalResults,null,2));
 console.log(JSON.stringify({surface:'professional',violations:professionalResults.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),incomplete:professionalResults.incomplete.length},null,2));
 assert.equal(professionalResults.violations.length,0,'Professional accessibility violations');
 const professionalImage=await window.webContents.capturePage();fs.writeFileSync(path.join(directory,'professional-fixture.png'),professionalImage.toPNG());
 await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[]});
 await evaluate('changeSettings({textScale:100})');
 const normalProfessional=await evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}})");
 fs.writeFileSync(path.join(directory,'axe-professional-default.json'),JSON.stringify(normalProfessional,null,2));
 assert.equal(normalProfessional.violations.length,0,'Professional default-theme accessibility violations');
 const normalProfessionalImage=await window.webContents.capturePage();fs.writeFileSync(path.join(directory,'professional-default-fixture.png'),normalProfessionalImage.toPNG());
 assert.deepEqual(errors,[],'Renderer console errors');
 console.log('Renderer accessibility/focus/settings smoke passed. Automated checks do not replace screen-reader or participant testing.');
}
main().then(()=>app.exit(0),error=>{console.error(error);app.exit(1);}).finally(()=>server?.close());
