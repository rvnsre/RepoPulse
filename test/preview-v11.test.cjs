'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{createPreviewServer}=require('../scripts/preview.cjs');
test('Loopback preview supports new batch, morph script and compact advice RPCs',async t=>{
 const server=createPreviewServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base='http://127.0.0.1:'+server.address().port;
 const rpc=async(name,...args)=>{const response=await fetch(base+'/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,args})});assert.equal(response.status,200);return response.json();};
 assert.equal((await fetch(base+'/morph.js')).status,200);
 const before=await rpc('state'),next=await rpc('next');assert.equal(next.changed,true);assert.ok(next.state.daily.repos.every(r=>!before.daily.repos.some(old=>old.id===r.id)));
 const preview=await rpc('previewInsight');assert.equal(preview.windowMode,'insight');assert.ok(preview.insight.repo.id);
 const bounds=await rpc('previewBounds','insight');assert.equal(bounds.width,480);assert.equal(bounds.height,250);
 const dismissed=await rpc('dismissInsight');assert.equal(dismissed.windowMode,'collapsed');assert.equal(dismissed.insight,null);
});