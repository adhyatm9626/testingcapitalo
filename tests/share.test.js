import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRoute} from '../assets/js/router.js';
import {encodeShareLink} from '../assets/js/share.js';

test('shared calculator links encode only screen, amount, mode, years and rate in the hash',()=>{
 const prior=globalThis.location;globalThis.location={origin:'https://example.test',pathname:'/'};
 try{const link=encodeShareLink({screen:'sip',amount:1000,mode:'sip',years:5,rate:7.25});const route=resolveRoute(link.slice(link.indexOf('#')));assert.equal(route.name,'sip');assert.deepEqual(route.shareParams,{amount:'1000',mode:'sip',years:'5',rate:'7.25'});assert.doesNotMatch(link,/items|plan|portfolio|watch/i)}finally{globalThis.location=prior}
});

test('ETF detail route opens the ETF module and preserves the symbol',()=>{
 const route=resolveRoute('#etf/NIFTYBEES');assert.equal(route.name,'etf-detail');assert.equal(route.id,'NIFTYBEES');
});
