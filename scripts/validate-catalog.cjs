'use strict';
const fs=require('node:fs'),{normalizeRepo}=require('../src/engine.cjs'),{MIN_STARS,MAX_CATALOG}=require('../src/catalog-policy.cjs');
function validateCatalog(catalog,now=Date.now()){
 if(!catalog||!Array.isArray(catalog.repos)||!catalog.repos.length||catalog.repos.length>MAX_CATALOG||catalog.count!==catalog.repos.length)throw Error('Catalog inventory count does not match its records.');
 const verified=Date.parse(catalog.verifiedAt);if(!Number.isFinite(verified)||verified>now+60000)throw Error('Missing or future catalog timestamp.');
 const ids=new Set(),names=new Set();
 for(const raw of catalog.repos){const repo=normalizeRepo(raw);if(!repo||repo.fork||repo.archived||repo.stargazers_count<MIN_STARS||ids.has(repo.id)||names.has(repo.full_name.toLowerCase()))throw Error('Invalid, ineligible or duplicate catalog record.');ids.add(repo.id);names.add(repo.full_name.toLowerCase());}
 if(catalog.collection){
  if(catalog.collection.complete!==true||!Array.isArray(catalog.collection.pages)||!catalog.collection.pages.length)throw Error('Release collection is incomplete or lacks provenance.');
  for(const page of catalog.collection.pages){const url=new URL(page.source),time=Date.parse(page.fetched_at);if(url.origin!=='https://api.github.com'||url.pathname!=='/search/repositories'||url.username||url.password||!Number.isFinite(time)||time>now+60000||[...url.searchParams.keys()].some(key=>!['q','page','per_page','sort','order'].includes(key)))throw Error('Invalid catalog page provenance.');}
 }
 return{records:ids.size,verifiedAt:catalog.verifiedAt,source:catalog.source||'unspecified',liveVerificationPerformed:false};
}
if(require.main===module){try{console.log(JSON.stringify(validateCatalog(JSON.parse(fs.readFileSync(process.argv[2]||'src/catalog-seed.json','utf8'))),null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={validateCatalog};
