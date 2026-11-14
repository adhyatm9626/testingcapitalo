import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateAdminDocument} from '../netlify/functions/admin-core.mjs';

const document=JSON.parse(fs.readFileSync(new URL('../data/etf-catalogue.json',import.meta.url),'utf8'));

test('ETF catalogue stores explicit MFapi matching state and omits the old placeholder',()=>{
 assert.equal(document.items.length,30);
 for(const item of document.items){assert.ok(['auto','confirmed','none'].includes(item.match_status));if(item.match_status==='none')assert.equal(item.scheme_code,null);else assert.ok(item.scheme_code&&item.matched_name)}
 assert.equal(JSON.stringify(document).includes('Live price / NAV not embedded'),false);
 assert.ok(document.items.some(item=>item.match_status==='auto'));
});

test('admin accepts optional sourced reference fields and enforces return bounds',()=>{
 const base={items:[{name:'Sample ETF',price:10,return_1y:5,return_3y:8,return_5y:10,yield:1,source_name:'Manual source',source_url:'https://example.com',as_of:'2026-11-11',scheme_code:'1234',matched_name:'Sample ETF - Direct Plan',match_status:'confirmed'}]};
 assert.equal(validateAdminDocument('etf-catalogue',base).ok,true);
 assert.equal(validateAdminDocument('etf-catalogue',{items:[{return_3y:51}]}).error,'rate_out_of_range');
});
