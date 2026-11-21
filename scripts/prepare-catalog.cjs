'use strict';

const fs = require('node:fs');
const { setTimeout: wait } = require('node:timers/promises');
const { fetchCatalog, MIN_STARS } = require('../src/github.cjs');
const { TARGET_CATALOG } = require('../src/catalog-policy.cjs');

async function request(url, options) {
 for (let attempt = 0; attempt < 5; attempt++) {
  try {
   const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(20000),
    headers: { ...options.headers, Authorization: 'Bearer ' + process.env.GH_TOKEN }
   });
   if (response.ok || ![403, 429, 500, 502, 503, 504].includes(response.status)) return response;
   const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000 - Date.now();
   const retry = Number(response.headers.get('retry-after')) * 1000;
   await response.body?.cancel();
   await wait(Math.max(3000, Math.min(65000, reset + 1000), Math.min(65000, retry)));
  } catch (error) {
   if (attempt === 4) throw error;
   await wait(3000);
  }
 }
 throw new Error('GitHub search did not recover after five attempts.');
}

async function main() {
 if (!process.env.GH_TOKEN) throw new Error('GH_TOKEN is needed to prepare the release catalog.');
 const repos = await fetchCatalog([], request, { delayMs: 2200, requireComplete: false });
 if (repos.length < TARGET_CATALOG) throw new Error('Only ' + repos.length + ' repositories qualified.');
 if (new Set(repos.map(repo => repo.full_name.toLowerCase())).size !== repos.length) throw new Error('GitHub returned duplicate names.');
 const snapshot = { source: 'GitHub repository search API', verifiedAt: new Date().toISOString(), minStars: MIN_STARS, count: repos.length, repos };
 const target = process.argv[2] || 'src/catalog-seed.json';
 fs.writeFileSync(target + '.tmp', JSON.stringify(snapshot) + '\n');
 fs.renameSync(target + '.tmp', target);
 console.log('Validated ' + repos.length + ' unique public GitHub repositories with ' + MIN_STARS + '+ stars.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });

