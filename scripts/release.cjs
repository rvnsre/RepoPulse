'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const groups={
 'RepoPulse-Windows':{suffixes:['.exe'],minimum:2},
 'RepoPulse-macOS':{suffixes:['.dmg','.zip'],minimum:2},
 'RepoPulse-Linux':{suffixes:['.AppImage','.deb','.rpm'],minimum:3}
};
function parseRepository(value){
 const raw=typeof value==='string'?value:value?.url;
 const match=raw?.trim().match(/^(?:(?:git\+)?https:\/\/github\.com\/|ssh:\/\/git@github\.com\/|git@github\.com:|github:)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i);
 return match&&match[1]!=='.'&&match[1]!=='..'&&match[2]!=='.'&&match[2]!=='..'?match[1]+'/'+match[2]:null;
}
function releaseRepository(env=process.env, readOrigin=()=>require('node:child_process').execFileSync('git',['remote','get-url','origin'],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:2000})){
 if(env.GITHUB_REPOSITORY?.trim()){
  const explicit=env.GITHUB_REPOSITORY.trim();
  if(!/^[\w.-]+\/[\w.-]+$/.test(explicit)||parseRepository(explicit)!==explicit)throw Error('Invalid GITHUB_REPOSITORY.');
  return explicit;
 }
 let origin;
 try{origin=parseRepository(readOrigin());}catch{}
 const repo=origin||parseRepository(require('../package.json').repository);
 if(!repo)throw Error('Pass GITHUB_REPOSITORY=owner/repo or configure a GitHub origin.');
 return repo;
}
function prepare(root,version,tag,{requireMacArchitectures=false}={}){

 if(!/^\d+\.\d+\.\d+$/.test(version)||tag!=='v'+version)throw Error('Release tag must match package.json version.');
 const files=[],names=new Set();
 const targets=Object.entries(groups);
 if(requireMacArchitectures)targets.push(['RepoPulse-macOS-Intel',groups['RepoPulse-macOS']]);
 for(const [group,{suffixes,minimum}]of targets){
  const artifact=path.join(root,group),directory=fs.existsSync(path.join(artifact,'dist'))?path.join(artifact,'dist'):artifact;
  const arch=group==='RepoPulse-macOS-Intel'?'x64':group==='RepoPulse-macOS'?'arm64':null;
  const entries=fs.readdirSync(directory).filter(name=>suffixes.some(ext=>name.endsWith(ext))&&(!requireMacArchitectures||!arch||suffixes.some(ext=>name==='RepoPulse-'+version+'-macOS-'+arch+ext)));

  if(entries.length<minimum||suffixes.some(ext=>!entries.some(name=>name.endsWith(ext))))throw Error('Missing installers for '+group);
  for(const name of entries){
   if(!name.includes('-'+version+'-')||names.has(name))throw Error('Incorrect version or duplicate asset: '+name);
   const file=path.join(directory,name),stat=fs.lstatSync(file);
   if(!stat.isFile()||stat.size<1024)throw Error('Empty or invalid installer: '+name);
   names.add(name);files.push(file);
  }
 }
 files.sort((a,b)=>path.basename(a).localeCompare(path.basename(b),'en'));
 const checksumFile=path.join(root,'SHA256SUMS.txt');
 fs.writeFileSync(checksumFile,files.map(file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')+'  '+path.basename(file)).join('\n')+'\n');
 return [...files,checksumFile];
}
if(require.main===module){
 try{
  const version=process.env.RELEASE_VERSION||require('../package.json').version;
  const tag=process.env.RELEASE_TAG||'v'+version;
  const flags=process.argv.slice(2);
  const files=prepare(flags.find(arg=>!arg.startsWith('--'))||'release-artifacts',version,tag,{requireMacArchitectures:flags.includes('--require-mac-architectures')});
  if(!flags.includes('--validate-only')){
   const repo=releaseRepository();
   const result=require('node:child_process').spawnSync('gh',['release','upload',tag,...files,'--clobber','--repo',repo],{stdio:'inherit'});
   if(result.error?.code==='ENOENT')throw Error('GitHub CLI (gh) is required to upload assets. Install it or run --validate-only.');
   if(result.error)throw result.error;
   process.exitCode=result.status??1;
  }
 }catch(error){console.error('Release failed: '+error.message);process.exitCode=1;}
}
module.exports={prepare,releaseRepository};
