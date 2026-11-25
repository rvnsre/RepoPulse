'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {readBuffer,readUtf8}=require('../src/bounded-file.cjs');
function temporary(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'repopulse-bounded-'));try{fn(path.join(dir,'input'));}finally{fs.rmSync(dir,{recursive:true,force:true});}}
test('An opened descriptor retains original bytes if the file path is replaced',()=>temporary(file=>{
 fs.writeFileSync(file,'original');const io={...fs,openSync:(name,flags)=>{const fd=fs.openSync(name,flags);fs.renameSync(name,name+'.old');fs.writeFileSync(name,'replacement');return fd;}};
 assert.equal(readUtf8(file,32,io),'original');assert.equal(fs.readFileSync(file,'utf8'),'replacement');
}));
test('Growth after descriptor stat is still bounded, and failure closes the descriptor',()=>temporary(file=>{
 fs.writeFileSync(file,'x');let closed=false;const io={...fs,fstatSync:fd=>{const stat=fs.fstatSync(fd);fs.appendFileSync(file,'a'.repeat(100));return stat;},closeSync:fd=>{closed=true;fs.closeSync(fd);}};
 assert.throws(()=>readBuffer(file,8,io),/grew beyond/);assert.equal(closed,true);
}));
test('Oversized files, directories and invalid limits fail without unbounded reads',()=>temporary(file=>{
 fs.writeFileSync(file,'long content');assert.throws(()=>readBuffer(file,2),/size limit/);assert.throws(()=>readBuffer(path.dirname(file),100));assert.throws(()=>readBuffer(file,Infinity),/Invalid read limit/);
}));
