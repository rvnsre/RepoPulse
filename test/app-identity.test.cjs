'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {appId}=require('../app/identity.cjs');

test('The runtime Windows notification identity matches the installer identity',()=>{
 assert.equal(appId,require('../package.json').build.appId);
});
