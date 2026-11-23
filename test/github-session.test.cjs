'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createGitHubSession}=require('../src/github-session.cjs');

test('Without secure storage GitHub uses anonymous requests or a memory-only token',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'repopulse-keychain-'));
 const tokenPath=path.join(dir,'token'),headers=[];
 const encrypted='existing encrypted data';
 fs.writeFileSync(tokenPath,encrypted);
 const session=createGitHubSession({tokenPath,safeStorage:{isEncryptionAvailable:()=>false},fetchImpl:async(_url,opts)=>{
  headers.push(opts.headers);return {ok:true,status:200};
 }});
 const url='https://api.github.com/repos/example/project';
 try{
  await session.request(url);
  assert.equal(headers[0].Authorization,undefined);
  assert.equal(session.configured(),false);
  const key='example_default_token_123456';
  session.set(key);
  await session.request(url);
  assert.equal(headers[1].Authorization,'Bearer '+key);
  assert.match(session.notice(),/this session only/);
  assert.equal(fs.readFileSync(tokenPath,'utf8'),encrypted);
  session.set('');
  assert.equal(fs.existsSync(tokenPath),false);
 }finally{session.close();fs.rmSync(dir,{recursive:true,force:true});}
});
