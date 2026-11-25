'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {sarif,secretSummary}=require('../scripts/check-security-evidence.cjs'),{validateCatalog}=require('../scripts/validate-catalog.cjs');
const clean=()=>({version:'2.1.0',runs:[{tool:{driver:{name:'CodeQL'}},results:[]}]});
test('Missing, malformed, ambiguous or nonempty scan reports cannot pass the security gate',()=>{
 assert.equal(sarif(clean()).findings,0);for(const report of [null,{}, {version:'2.1.0',runs:[]},{version:'2.1.0',runs:[{tool:{driver:{name:'CodeQL'}}}]}])assert.throws(()=>sarif(report));
 const report=clean();report.runs[0].results=[{level:'note',suppressions:[{status:'accepted'}]}];assert.throws(()=>sarif(report),/require review/);
});
test('Secret summaries expose counts and commit only, never secret values or snippets',()=>{
 const summary=secretSummary([{Secret:'SYNTHETIC-SENSITIVE-FIXTURE',Match:'private snippet',File:'path'}],'a'.repeat(40));assert.equal(summary.findings,1);assert.ok(!JSON.stringify(summary).includes('SYNTHETIC'));assert.ok(!Object.hasOwn(summary,'Secret'));assert.throws(()=>secretSummary(null,'a'.repeat(40)));
});
test('Catalog gate rejects fabricated counts, duplicate IDs/names, future dates and incomplete provenance',()=>{
 const base={count:1,source:'fixture',verifiedAt:'2026-01-01T00:00:00Z',repos:[{id:1,full_name:'owner/project',stargazers_count:20000}]},now=Date.parse('2026-11-25T00:00:00Z');assert.equal(validateCatalog(base,now).records,1);
 for(const value of [{...base,count:1000},{...base,count:2,repos:[...base.repos,...base.repos]},{...base,verifiedAt:'2099-01-01'},{...base,collection:{complete:false,pages:[]}}])assert.throws(()=>validateCatalog(value,now));
 assert.equal(validateCatalog(base,now).liveVerificationPerformed,false);
});
