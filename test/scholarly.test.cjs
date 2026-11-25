'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const S=require('../src/scholarly.cjs');
const DOI='10.1234/test-fixture',ORCID='0000-0002-1825-0097',SHA='a'.repeat(40),REPO='owner/repository';
const cff='cff-version: 1.2.0\ntitle: Synthetic test software\nversion: 1.0.0\ndoi: '+DOI+'\nauthors:\n  - family-names: Example\n    given-names: Test\n';
const cffResponse=body=>({path:'CITATION.cff',size:Buffer.byteLength(body),encoding:'base64',content:Buffer.from(body).toString('base64')});
const fixtures={
 citation:[REPO,cffResponse(cff)],crossref:[DOI,{message:{DOI,title:['Synthetic fixture'],type:'software'}}],openalex:[DOI,{doi:'https://doi.org/'+DOI,id:'https://openalex.org/W1',display_name:'Synthetic fixture',publication_year:2026}],
 orcid:[ORCID,{'orcid-identifier':{path:ORCID},person:{name:{'given-names':{value:'Test'},'family-name':{value:'Example'}}}}],
 pubmed:['123',{result:{uids:['123'],'123':{uid:'123',title:'Synthetic test title',pubdate:'2026'}}}],europepmc:['123',{resultList:{result:[{id:'123',source:'MED',title:'Synthetic test title',pubYear:'2026'}]}}],zenodo:['123',{id:123,metadata:{title:'Synthetic archive fixture',doi:DOI,version:'1.0'}}],
 arxiv:['2601.12345','<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>http://arxiv.org/abs/2601.12345v1</id><title>Synthetic fixture</title><published>2026-01-01</published></entry></feed>'],softwareheritage:['swh:1:rev:'+SHA,{id:SHA,directory:'b'.repeat(40)}],
 releases:[REPO,[{tag_name:'v1',draft:false,published_at:'2026-01-01'}]],issues:[REPO,[{number:1,updated_at:'2026-01-01'},{number:2,pull_request:{}}]],advisories:[REPO,[{state:'published',ghsa_id:'GHSA-aaaa-bbbb-cccc',severity:'low'},{state:'draft',ghsa_id:'GHSA-dddd-eeee-ffff'}]],atom:[REPO,'<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>tag:example</id><title>Synthetic fixture</title><updated>2026-01-01</updated></entry></feed>']
};
for(const [source,[id,data]]of Object.entries(fixtures))test(source+' adapter returns provenance on every field without inventing repository association',async()=>{
 let calls=0;const client=new S.ScholarlyClient({now:()=>100000,fetchImpl:async(url,options)=>{calls++;assert.equal(url,S.endpoint(source,id));assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');assert.equal(options.body,undefined);assert.equal(options.headers.Authorization,undefined);return new Response(typeof data==='string'?data:JSON.stringify(data));}});
 assert.equal((await client.get(source,id)).status,'unavailable');assert.equal(calls,0);
 const result=await client.get(source,id,{refresh:true});assert.equal(result.status,'live');assert.ok(Object.keys(result.record.fields).length);
 for(const field of Object.values(result.record.fields)){assert.ok(Object.hasOwn(field,'value'));assert.equal(field.source,S.endpoint(source,id));assert.equal(field.identifier,id);assert.ok(field.fetched_at&&field.verification_state);}
 if(!S.REPOSITORY_SOURCES.has(source))assert.ok(result.record.association.includes('not established'));
 await client.get(source,id);assert.equal(calls,1);
});
test('Identifiers, checksum and hostile source inputs fail before any network access',async()=>{
 const c=new S.ScholarlyClient({fetchImpl:()=>assert.fail('no request')});
 for(const [source,id]of [['orcid','0000-0002-1825-0098'],['crossref','patient name'],['pubmed','patient-123'],['citation','../repo'],['citation','owner/..'],['arxiv','https://evil.test'],['__proto__','x']])await assert.rejects(c.get(source,id,{refresh:true}));
});
test('Mismatched provider identifiers, unsafe XML and invalid YAML never become verified cache records',async()=>{
 for(const [source,id,body]of [['crossref',DOI,JSON.stringify({message:{DOI:'10.1234/wrong'}})],['orcid',ORCID,JSON.stringify({'orcid-identifier':{path:'wrong'}})],['arxiv','2601.12345','<!DOCTYPE feed [<!ENTITY x SYSTEM "file:///secret">]><feed/>'],['citation',REPO,JSON.stringify(cffResponse('cff-version: 1.2.0\ntitle: !bad dangerous'))]]){
  const c=new S.ScholarlyClient({fetchImpl:async()=>new Response(body)}),r=await c.get(source,id,{refresh:true});assert.equal(r.record,null);assert.ok(r.error);
 }
});
test('Offline and stale metadata keep original provenance; persistence failure rolls back',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'repopulse-scholarly-')),file=path.join(dir,'public.json');let time=100000,offline=false;
 try{const client=new S.ScholarlyClient({file,now:()=>time,fetchImpl:async()=>{if(offline)throw Error('offline');return new Response(JSON.stringify(fixtures.crossref[1]));}});const first=await client.get('crossref',DOI,{refresh:true});offline=true;time+=S.TTL+1;
  const reopened=new S.ScholarlyClient({file,now:()=>time,fetchImpl:async()=>{throw Error('offline');}}),stale=await reopened.get('crossref',DOI,{refresh:true});assert.equal(stale.status,'stale');assert.equal(stale.record.fetched_at,first.record.fetched_at);
  offline=false;client.persist=()=>{throw Error('disk full');};const rollback=await client.get('crossref',DOI,{refresh:true});assert.equal(rollback.record.fetched_at,first.record.fetched_at);client.clear();assert.equal(fs.existsSync(file),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('Rate-limit headers suppress further requests; clearing during a fetch prevents repopulation',async()=>{
 let calls=0;const c=new S.ScholarlyClient({now:()=>0,fetchImpl:async()=>{calls++;return new Response('',{status:429,headers:{'retry-after':'120'}});}});await c.get('crossref',DOI,{refresh:true});await c.get('crossref',DOI,{refresh:true});assert.equal(calls,1);
 let resolve;const promise=new Promise(r=>resolve=r),d=new S.ScholarlyClient({fetchImpl:()=>promise});const pending=d.get('crossref',DOI,{refresh:true});d.clear();resolve(new Response(JSON.stringify(fixtures.crossref[1])));await pending;assert.equal((await d.get('crossref',DOI)).record,null);
});
test('Citation authors are preserved beyond twenty and oversized lists are rejected, not silently truncated',()=>{
 const authors=Array.from({length:21},(_,i)=>'  - name: Test author '+i).join('\n'),body='cff-version: 1.2.0\ntitle: Synthetic software\nauthors:\n'+authors;
 assert.equal(S.parse('citation',REPO,JSON.stringify(cffResponse(body))).authors.length,21);
 const huge='cff-version: 1.2.0\ntitle: Synthetic software\nauthors:\n'+Array.from({length:201},(_,i)=>'  - name: Test author '+i).join('\n');assert.throws(()=>S.parse('citation',REPO,JSON.stringify(cffResponse(huge))),/not truncated/);
});
