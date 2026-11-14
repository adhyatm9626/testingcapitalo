import test from 'node:test';
import assert from 'node:assert/strict';
import {createIslandStore,ISLAND_KEY,MAX_ISLAND_ITEMS} from '../assets/js/island-core.js';

class MemoryStorage{values=new Map();getItem(key){return this.values.has(key)?this.values.get(key):null}setItem(key,value){this.values.set(key,String(value))}removeItem(key){this.values.delete(key)}}
const item=(id,overrides={})=>({id,type:'gold',name:id,mode:'sip',amount:1000,years:3,rate:8,rateSource:'user',invested:36000,finalValue:42000,low:39000,high:45000,...overrides});

test('My total adds and updates by instrument id without duplicates',()=>{const store=createIslandStore(new MemoryStorage());assert.equal(store.add(item('gold:nifty')).ok,true);assert.equal(store.add(item('gold:nifty',{finalValue:44000})).updated,true);assert.equal(store.get().length,1);assert.equal(store.get()[0].finalValue,44000)});

test('remove recalculates totals immediately and undo restores the prior row',()=>{const store=createIslandStore(new MemoryStorage());store.add(item('a'));store.add(item('b',{invested:12000,finalValue:14000,low:13000,high:15000}));const removed=store.remove('a');assert.equal(store.totals().invested,12000);assert.equal(store.undo(removed),true);assert.equal(store.totals().invested,48000)});

test('My total enforces its twelve-item limit',()=>{const store=createIslandStore(new MemoryStorage());for(let index=0;index<MAX_ISLAND_ITEMS;index++)assert.equal(store.add(item(String(index))).ok,true);assert.deepEqual(store.add(item('13')),{ok:false,reason:'item_limit'});assert.equal(store.get().length,12)});

test('My total persists across reload and removes the old plan key',()=>{const storage=new MemoryStorage();storage.setItem('capitalo.plan','legacy');let store=createIslandStore(storage);store.add(item('fd:bank-3y',{type:'fd',mode:'onetime'}));store=createIslandStore(storage);assert.equal(storage.getItem('capitalo.plan'),null);assert.equal(store.get()[0].id,'fd:bank-3y');assert.equal(store.get()[0].mode,'onetime')});

test('mixed horizons are called out and allocation shares total 100 percent',()=>{const store=createIslandStore(new MemoryStorage());store.add(item('a',{type:'fd',years:1,finalValue:11000,invested:10000,low:10500,high:11500}));store.add(item('b',{type:'gold',years:3,finalValue:33000,invested:30000,low:30000,high:36000}));const totals=store.totals();assert.equal(totals.differentHorizons,true);assert.equal(totals.allocation.reduce((sum,row)=>sum+row.share,0),100)});

test('summed money is rounded to cents without binary floating-point drift',()=>{const store=createIslandStore(new MemoryStorage());store.add(item('a',{invested:1000.1,finalValue:1000.1,low:1000.1,high:1000.1}));store.add(item('b',{invested:2000.2,finalValue:2000.2,low:2000.2,high:2000.2}));assert.equal(store.totals().invested,3000.3);assert.equal(store.totals().finalValue,3000.3)});
