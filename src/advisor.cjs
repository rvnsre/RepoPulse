'use strict';
const {TOPICS,ranked}=require('./engine.cjs');
const APPS=new Map([
 ['code','tools'],['code - insiders','tools'],['devenv','tools'],['idea64','tools'],['pycharm64','tools'],['cursor','tools'],
 ['figma','design'],['photoshop','design'],['illustrator','design'],['blender','design'],['resolve','design'],
 ['excel','data'],['pbidesktop','data'],['windowsterminal','systems'],['powershell','systems'],['pwsh','systems'],
 ['ollama','ai'],['lm studio','ai']
]);
function infer(value=''){
 const name=typeof value==='string'?value.trim().toLowerCase():'';
 if(/^repopulse(?:$|[ .-])/.test(name))return{weights:{},topic:null,status:'self'};
 const topic=APPS.get(name)||null;
 return{weights:topic?{[topic]:4}:{},topic,status:topic?'available':'omitted'};
}
const {spawn}=require('node:child_process'),{createInterface}=require('node:readline');
const binding='using System; using System.Runtime.InteropServices; public class RepoPulseContext { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint id); }';
const readApp="$owner=[uint32]0; $handle=[RepoPulseContext]::GetForegroundWindow(); [void][RepoPulseContext]::GetWindowThreadProcessId($handle,[ref]$owner); $processName=''; if ($owner -gt 0) { $processName=[string](Get-Process -Id $owner -ErrorAction SilentlyContinue).ProcessName }";
const psArgs=['-NoProfile','-NonInteractive','-WindowStyle','Hidden','-Command'];
const unavailable=()=>({weights:{},topic:null,status:'unavailable'});
let collector=null;
function stopForeground(){
 const current=collector;
 if(!current)return;
 collector=null;
 current.finish?.(unavailable());
 current.lines.close();
 current.child.kill();
}
function startForeground(){
 const script="$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[System.Text.Encoding]::UTF8; Add-Type -TypeDefinition '"+binding+"'; while ([Console]::ReadLine() -eq 'sample') { "+readApp+"; [Console]::WriteLine([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($processName))) }";
 const child=spawn('powershell.exe',[...psArgs,script],{windowsHide:true,stdio:['pipe','pipe','ignore']});
 const lines=createInterface({input:child.stdout,crlfDelay:Infinity});
 const current={child,lines,finish:null,pending:null};
 const stop=()=>{if(collector===current)stopForeground();};
 child.once('error',stop);child.once('exit',stop);child.stdin.on('error',stop);
 lines.on('line',line=>{
  if(line.length>4096||!/^[A-Za-z0-9+/=]*$/.test(line)){stop();return;}
  current.finish?.(infer(Buffer.from(line,'base64').toString('utf8')));
 });
 return current;
}
async function foreground({platform=process.platform,exec}={}){
 if(platform!=='win32')return{weights:{},topic:null,status:'unsupported'};
 if(exec){
  try{
   const title=await new Promise((resolve,reject)=>exec('powershell.exe',[...psArgs,"Add-Type -TypeDefinition '"+binding+"'; "+readApp+"; [Console]::Write($processName)"],{windowsHide:true,timeout:4000,maxBuffer:8192,encoding:'utf8'},(error,stdout)=>error?reject(error):resolve(stdout)));
   return infer(title);
  }catch{return unavailable();}
 }
 try{
  const current=collector??=startForeground();
  if(current.pending)return current.pending;
  current.pending=new Promise(resolve=>{
   const timer=setTimeout(()=>{if(collector===current)stopForeground();},4000);
   current.finish=value=>{clearTimeout(timer);current.finish=null;current.pending=null;resolve(value);};
   current.child.stdin.write('sample\n');
  });
  return current.pending;
 }catch{stopForeground();return unavailable();}
}
class IdleGate{
 constructor(){this.issued=false;this.snoozeUntil=0;}
 dismiss(now=Date.now()){this.issued=true;this.snoozeUntil=now+480000;}
 tick(idleSeconds,{enabled=true,locked=false,busy=false,now=Date.now()}={}){
  if(!Number.isFinite(idleSeconds)||idleSeconds<0)return false;
  if(idleSeconds<15)this.issued=false;
  if(!enabled||locked||busy||this.issued||now<this.snoozeUntil||idleSeconds<480)return false;
  this.issued=true;return true;
 }
}
function recommend(state,context={}){const topic=context.topic||state.settings.workTopic||'tools',weights={...state.profile.weights,[topic]:Math.max(12,state.profile.weights[topic]||0)},pool=state.cache.filter(r=>require('./discovery.cjs').allowed(r,state));const repo=ranked(pool,weights,require('./engine.cjs').localDay()).find(r=>!(state.hidden||[]).includes(r.id));return repo?{repo,topic,label:TOPICS[topic]?.label||'Your interests',reason:context.topic?'Related to your recent '+(TOPICS[topic]?.label||topic).toLowerCase()+' work.':'Based on your selected work topic.',source:context.topic?'app-category':'manual'}:null;}
module.exports={infer,foreground,stopForeground,IdleGate,recommend};
