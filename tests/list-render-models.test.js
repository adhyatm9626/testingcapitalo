import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalogueRows,filterFundRows,bullionDisplayValue,stockListState} from '../assets/js/list-models.js';

const fixture=name=>JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}-response.json`,import.meta.url),'utf8'));

test('saved stocks response renders the full team-approved list by default and can be switched off',()=>{
 const response=fixture('stocks-list'),model=stockListState(response.data);
 assert.equal(response.ok,true);assert.equal(model.count,100);assert.equal(model.rows.length,100);assert.equal(stockListState(response.data,{published:false}).switchedOff,true);
});

test('saved MFapi search response supports the default Direct plus Growth filter',()=>{
 const response=fixture('mf-search-tata'),rows=response.data;
 assert.equal(response.ok,true);assert.equal(rows.length,15);
 const visible=filterFundRows(rows,{plan:'direct',type:'growth'});
 assert.ok(visible.length<rows.length);for(const row of visible){assert.match(row.schemeName,/Direct/i);assert.match(row.schemeName,/Growth/i)}
});

test('saved ETF response produces its catalogue rows',()=>{
 assert.equal(catalogueRows(fixture('etf-catalogue').data,'etf-catalogue','items').length,30);
});

test('saved bullion response separates gold and silver rows and groups benchmark values in Indian style',()=>{
 const data=fixture('bullion').data,gold=catalogueRows(data,'bullion','gold'),silver=catalogueRows(data,'bullion','silver');
 assert.equal(gold.length,7);assert.equal(silver.length,3);
 assert.equal(bullionDisplayValue(gold[0].value,gold[0].unit),'Rs 1,42,707 per 10 g');
 assert.equal(bullionDisplayValue(silver[0].value,silver[0].unit),'Rs 1,93,442 per kg');
 assert.ok(gold.find(row=>row.name==='Gold ETFs').link_etf_list);
 assert.equal(silver.find(row=>row.name==='Silver futures').hide_calculate,true);
});
