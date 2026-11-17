'use strict';
const {repositoryUrl}=require('./navigation.cjs');
// Explicit verified package mappings. Never infer a registry ID from a repository name.
const packages={'axios/axios':{type:'library',command:'npm install axios',source:'https://github.com/axios/axios/blob/v1.x/package.json'},'clash-verge-rev/clash-verge-rev':{type:'desktop',darwin:'brew install --cask clash-verge-rev',source:'https://formulae.brew.sh/cask/clash-verge-rev'}};
function packageName(manifest,repo){const name=manifest?.name,source=typeof manifest?.repository==='string'?manifest.repository:manifest?.repository?.url;if(manifest?.private||typeof name!=='string'||!/^(@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/.test(name)||name.length>214||typeof source!=='string')return null;const expected=repositoryUrl(repo).toLowerCase();return source.replace(/^git\+/, '').replace(/\.git$/,'').toLowerCase()===expected?name:null;}
function known(repo){return !!packages[repo.full_name.toLowerCase()];}
function plan(repo,platform='linux',verifiedPackage){
 const url=repositoryUrl(repo),known=packages[repo.full_name.toLowerCase()];
 const command=known?.command||known?.[platform]||(typeof verifiedPackage==='string'&&/^(@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/.test(verifiedPackage)?'npm install '+verifiedPackage:null);
 const file=({win32:'.exe / .msi',darwin:'.dmg / .zip',linux:'.rpm / .deb / AppImage'})[platform]||'release assets';
 return{type:known?.type||(verifiedPackage?'library':'repository'),command,source:known?.source||url+'#readme',label:command?'Install':'Downloads',downloadLabel:file,clone:'git clone '+url+'.git',feed:url+'/releases.atom'};
}
module.exports={plan,known,packageName};
