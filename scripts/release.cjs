'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const groups={
 'RepoPulse-Windows':{suffixes:['.exe'],minimum:2},
 'RepoPulse-macOS':{suffixes:['.dmg','.zip'],minimum:2},
 'RepoPulse-Linux':{suffixes:['.AppImage','.deb','.rpm'],minimum:3}
};
function prepare(root,version,tag){
 if(!/^\d+\.\d+\.\d+$/.test(version)||tag!=='v'+version)throw Error('Release tag must match package.json version.');
 const files=[],names=new Set();
 for(const [group,{suffixes,minimum}]of Object.entries(groups)){
  const artifact=path.join(root,group),directory=fs.existsSync(path.join(artifact,'dist'))?path.join(artifact,'dist'):artifact,entries=fs.readdirSync(directory).filter(name=>suffixes.some(ext=>name.endsWith(ext)));
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
 const tag=process.env.RELEASE_TAG,version=process.env.RELEASE_VERSION||require('../package.json').version,files=prepare(process.argv[2]||'release-artifacts',version,tag);
 const {spawnSync}=require('node:child_process');
 const result=spawnSync('gh',['release','upload',tag,...files,'--repo',process.env.GITHUB_REPOSITORY],{stdio:'inherit'});
 if(result.error)throw result.error;process.exitCode=result.status??1;
}
module.exports={prepare};
