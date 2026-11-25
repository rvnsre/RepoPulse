'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {CatalogCheckpoint,retryRequest}=require('./catalog-checkpoint.cjs');
const { fetchCatalog, MIN_STARS } = require('../src/github.cjs');
const { TARGET_CATALOG } = require('../src/catalog-policy.cjs');

async function prepareCatalog({target='src/catalog-seed.json',fetchImpl=fetch,token=process.env.GH_TOKEN,minCount=TARGET_CATALOG,delayMs=2200,checkpointDirectory=target+'.checkpoint',retryOptions={}}={}) {
 if (!token) throw new Error('GH_TOKEN is needed to prepare the release catalog.');
 const checkpoint=new CatalogCheckpoint(checkpointDirectory);
 async function request(url,options){
  const cached=checkpoint.read(url);
  if(cached)return new Response(JSON.stringify(cached),{status:200});
  const response=await retryRequest(url,{...options,headers:{...options.headers,Authorization:'Bearer '+token}},{...retryOptions,fetchImpl});
  if(!response.ok)return response;
  const data=await response.json();checkpoint.write(url,data);
  return new Response(JSON.stringify(data),{status:response.status,headers:response.headers});
 }
 const repos = await fetchCatalog([], request, { delayMs, requireComplete: true });
 if (!fetchCatalog.info.complete) throw new Error('An incomplete collection cannot become a release catalog.');
 if (repos.length < minCount) throw new Error('Only ' + repos.length + ' repositories qualified.');
 if (new Set(repos.map(repo => repo.full_name.toLowerCase())).size !== repos.length) throw new Error('GitHub returned duplicate names.');
 const provenance=checkpoint.provenance(),oldest=provenance.map(p=>p.fetched_at).sort()[0];
 const snapshot = { source: 'GitHub repository search API', verifiedAt: oldest, collectedAt:new Date().toISOString(), minStars: MIN_STARS, count: repos.length, collection:{...fetchCatalog.info,resumedPages:checkpoint.resumed,pages:provenance}, repos };
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target + '.tmp', JSON.stringify(snapshot) + '\n');
 fs.renameSync(target + '.tmp', target);
 console.log('Validated ' + repos.length + ' unique public GitHub repositories with ' + MIN_STARS + '+ stars.');
 return snapshot;
}

if(require.main===module)prepareCatalog({target:process.argv[2]||'src/catalog-seed.json'}).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports={prepareCatalog};

