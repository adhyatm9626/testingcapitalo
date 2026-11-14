import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {publicProjection,readPublicDocument} from '../netlify/functions/public-data.mjs';
test('public projection hides internal source URLs and unverified identifiers',async()=>{
 const raw=JSON.parse(await readFile(new URL('../data/fd-banks.json',import.meta.url),'utf8'));
 const row=raw.banks[0];const publicRow=publicProjection(row);assert.equal('internal_source_url'in publicRow,false);assert.equal('isin'in publicRow,false);const verified=publicProjection({verified:true,isin:'ABC',bse:'123',source_url:'https://bank.example',verified_on:'2026-11-07'});assert.equal(verified.isin,'ABC');
});

test('public data reads a published Blob document or the bundled fallback',async()=>{
 const fallback={as_of:'2026-11-07',items:[{id:'a',verified:false,isin:'private'}]};const emptyStore={get:async()=>null};const fromBundle=await readPublicDocument({store:emptyStore,name:'stocks-list',fallback});assert.equal(fromBundle.updatedAt,'2026-11-07');assert.equal(fromBundle.data.items[0].isin,undefined);
 const store={get:async()=>({version:3,updatedAt:'2026-11-08',updatedBy:'Ayush',data:{items:[{id:'b',verified:true,isin:'public'}]}})};const fromBlob=await readPublicDocument({store,name:'stocks-list',fallback});assert.equal(fromBlob.version,3);assert.equal(fromBlob.data.items[0].isin,'public');
});
