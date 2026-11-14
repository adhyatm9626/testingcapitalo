import test from 'node:test';
import assert from 'node:assert/strict';
import {paginateSearchResults} from '../netlify/functions/mf-query.mjs';

test('MFapi search pages are sorted, bounded and offset in the proxy',()=>{
 const input=[{schemeCode:3},{schemeCode:1},{schemeCode:2}];
 assert.deepEqual(paginateSearchResults(input,{limit:2,offset:1}),{data:[{schemeCode:2},{schemeCode:3}],total:3,limit:2,offset:1});
 assert.equal(paginateSearchResults(input,{limit:500,offset:-4}).data.length,3);
 assert.deepEqual(paginateSearchResults(input,{limit:0,offset:1}).data,[{schemeCode:2},{schemeCode:3}]);
});
