'use strict';
const {classify,TOPICS,ranked}=require('./engine.cjs');
function infer(title=''){
 if(typeof title!=='string'||/password|banking|wallet|sign.in|inprivate|incognito/i.test(title))return{weights:{},topic:null,status:'omitted'};
 const weights=classify(title.slice(0,500));
 const aliases=[[/Visual Studio Code|VS Code|IntelliJ|PyCharm|Cursor/i,'tools'],[/Photoshop|Figma|Illustrator|Canva|DaVinci|Blender/i,'design'],[/Excel|Power BI|Jupyter|Notebook/i,'data'],[/Docker|Terminal|PowerShell|Ubuntu|Linux/i,'systems'],[/Ollama|ChatGPT|LM Studio|llama|pytorch/i,'ai'],[/React|Next.js|JavaScript|TypeScript|HTML/i,'web']];
 for(const [pattern,topic]of aliases)if(pattern.test(title))weights[topic]=(weights[topic]||0)+4;
 const topic=Object.keys(weights).sort((a,b)=>weights[b]-weights[a])[0]||null;
 return{weights,topic,status:topic?'available':'unknown'};
}
async function foreground({platform=process.platform,exec=require('node:child_process').execFile}={}){
 if(platform!=='win32')return{weights:{},topic:null,status:'unsupported'};
 const script=`Add-Type -TypeDefinition 'using System; using System.Text; using System.Runtime.InteropServices; public class RepoPulseContext { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder t, int n); }'; $t=New-Object System.Text.StringBuilder 512; [void][RepoPulseContext]::GetWindowText([RepoPulseContext]::GetForegroundWindow(),$t,512); [Console]::OutputEncoding=[System.Text.Encoding]::UTF8; [Console]::Write($t.ToString())`;
 try{const title=await new Promise((resolve,reject)=>exec('powershell.exe',['-NoProfile','-NonInteractive','-WindowStyle','Hidden','-Command',script],{windowsHide:true,timeout:4000,maxBuffer:8192,encoding:'utf8'},(error,stdout)=>error?reject(error):resolve(stdout)));return infer(title);}catch{return{weights:{},topic:null,status:'unavailable'};}
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
function recommend(state,context={}){const topic=context.topic||state.settings.workTopic||'tools',weights={...state.profile.weights,[topic]:Math.max(12,state.profile.weights[topic]||0)},pool=state.cache.filter(r=>require('./discovery.cjs').allowed(r,state));const repo=ranked(pool,weights,require('./engine.cjs').localDay()).find(r=>!(state.hidden||[]).includes(r.id));return repo?{repo,topic,label:TOPICS[topic]?.label||'Your interests',reason:context.topic?'Related to your recent '+(TOPICS[topic]?.label||topic).toLowerCase()+' work.':'Based on your selected work topic.',source:context.topic?'window-title':'manual'}:null;}
module.exports={infer,foreground,IdleGate,recommend};
