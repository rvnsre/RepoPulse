'use strict';
const fs=require('node:fs');
function readBuffer(file,maxBytes,io=fs){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1)throw Error('Invalid read limit.');
 const fd=io.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));
 try{
  const stat=io.fstatSync(fd);if(!stat.isFile())throw Error('Choose a regular file.');
  if(stat.size>maxBytes)throw Error('File exceeds the allowed size limit.');
  const chunks=[];let total=0;
  for(;;){
   const buffer=Buffer.allocUnsafe(Math.min(65536,maxBytes-total+1)),read=io.readSync(fd,buffer,0,buffer.length,null);
   if(!read)break;total+=read;if(total>maxBytes)throw Error('File grew beyond the allowed size limit.');chunks.push(buffer.subarray(0,read));
  }
  return Buffer.concat(chunks,total);
 }finally{io.closeSync(fd);}
}
function readUtf8(file,maxBytes,io=fs){return readBuffer(file,maxBytes,io).toString('utf8');}
module.exports={readBuffer,readUtf8};
