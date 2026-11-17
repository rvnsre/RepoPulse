'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../app/morph.js'),L=require('../src/layout.cjs');
test('Measured panel size includes each actual visible card and exactly one gap',()=>{
 assert.equal(M.panelHeight({rows:[174,210,400],count:2}),48+42+49+8+12+174+210+12);
 assert.equal(M.panelHeight({rows:[174,210,400],count:1}),48+42+49+8+12+174);
});
test('Large text and stacked commands increase height rather than clipping actions',()=>{
 assert.ok(M.panelHeight({rows:[350,350],count:2})>M.panelHeight({rows:[174,174],count:2}));
});
test('Empty and short catalogs do not reserve nonexistent rows',()=>{
 assert.equal(M.panelHeight({rows:[174],count:3}),M.panelHeight({rows:[174],count:1}));
 assert.ok(M.panelHeight({rows:[]})>=300);
});
test('No motion transform uses non-finite geometry on tiny work areas',()=>{
 for(const width of [1,320,600,960,1920])for(const x of [-1920,0,1900]){
  const area={x,y:0,width,height:900},a=L.bounds(area,{},'panel'),b=L.bounds(area,{},'collapsed');
  for(const [from,to]of [[a,b],[b,a]])assert.ok(!/NaN|Infinity/.test(M.transform(from,to)));
 }
});
test('Centered morph preserves the top anchor and returns identity at its target',()=>{
 const a={x:100,y:20,width:960,height:500},b={x:400,y:20,width:360,height:64};
 assert.match(M.transform(a,b),/^translate\(0px,0px\)/);
 assert.equal(M.transform(a,a),'translate(0px,0px) scale(1,1)');
});
test('Measured sizes still clamp to the display available height',()=>{
 assert.equal(L.fittedHeight(M.panelHeight({rows:[600,600,600],count:3}),720),720);
});
