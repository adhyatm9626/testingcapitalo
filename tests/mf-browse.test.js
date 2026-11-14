import test from 'node:test';
import assert from 'node:assert/strict';
import {filterBrowseRows,paginateBrowseRows} from '../netlify/functions/mf-query.mjs';

test('MF browse filters house, Direct plan, Growth option, category and returns pageable counts',()=>{
 const rows=Array.from({length:40},(_,index)=>({schemeCode:10000+index,schemeName:`Tata ${index<20?'Large Cap':'Flexi Cap'} Fund - Direct Plan - Growth`}));
 const filtered=filterBrowseRows(rows,{amc:'Tata',plan:'direct',option:'growth',category:'large_cap'});
 assert.equal(filtered.length,20);assert.equal(paginateBrowseRows(filtered,{limit:25,offset:0}).data.length,20);assert.equal(paginateBrowseRows(filtered,{limit:25,offset:25}).total,20);
});

test('MF browse supports broader house and option filters',()=>{
 const rows=[{schemeCode:1,schemeName:'HDFC Balanced Advantage Fund - Direct Plan - Growth'},{schemeCode:2,schemeName:'HDFC Balanced Advantage Fund - Regular Plan - IDCW'}];
 assert.equal(filterBrowseRows(rows,{amc:'HDFC',plan:'regular',option:'idcw',category:'hybrid'}).length,1);
});

test('MF categories distinguish Large Cap from Large and Mid Cap and avoid overlapping Mid Cap matches',()=>{
 const rows=[{schemeName:'HDFC Large Cap Fund - Direct Plan - Growth'},{schemeName:'HDFC Large & Mid Cap Fund - Direct Plan - Growth'},{schemeName:'HDFC Large and Mid Cap Fund - Direct Plan - Growth'},{schemeName:'HDFC Mid Cap Fund - Direct Plan - Growth'}];
 assert.equal(filterBrowseRows(rows,{category:'large_cap'}).length,1);assert.equal(filterBrowseRows(rows,{category:'large_mid_cap'}).length,2);assert.equal(filterBrowseRows(rows,{category:'mid_cap'}).length,1);
});

test('MF browse supports all requested scheme-name category rules and A to Z order',()=>{
 const names=['Tata Contra Fund - Direct Plan - Growth','Tata ELSS Tax Saver Fund - Direct Plan - Growth','Tata Banking Fund - Direct Plan - Growth','Tata Multi Asset Allocation Fund - Direct Plan - Growth','Tata Nifty 50 Index Fund - Direct Plan - Growth','Tata Small Cap Fund - Direct Plan - Growth','Tata Flexi Cap Fund - Direct Plan - Growth'];
 for(const [category,part] of [['value','Contra'],['tax_saver','ELSS'],['sectoral','Banking'],['multi_asset','Multi Asset'],['index','Nifty'],['small_cap','Small Cap'],['flexi_cap','Flexi Cap']])assert.equal(filterBrowseRows(names.map(schemeName=>({schemeName})),{category}).length,1,category);
 const ordered=filterBrowseRows([{schemeName:'Tata Zed Fund - Direct Plan - Growth'},{schemeName:'Tata Alpha Fund - Direct Plan - Growth'}],{q:'Tata'});assert.match(ordered[0].schemeName,/Alpha/);
});

test('MF browse hides ETF schemes by default but allows an explicit ETF search',()=>{
 const rows=[{schemeName:'Nippon India ETF Nifty 50 BeES - Direct Plan - Growth'},{schemeName:'Nippon India Index Fund - Direct Plan - Growth'}];
 assert.equal(filterBrowseRows(rows,{}).length,1);assert.equal(filterBrowseRows(rows,{q:'ETF'}).length,1);
});
