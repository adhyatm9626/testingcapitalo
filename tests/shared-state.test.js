import test from 'node:test';
import assert from 'node:assert/strict';
import {createSharedState} from '../assets/js/shared-state.js';

test('shared amount and mode persist across calculator screens using one canonical state',()=>{
  const values=new Map([['capitalo.amount','1000'],['capitalo.mode','sip']]);
  const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,String(value))};
  const state=createSharedState(storage);assert.deepEqual(state.get(),{amount:1000,mode:'sip'});
  state.set({amount:'25,000',mode:'onetime'});assert.deepEqual(state.get(),{amount:25000,mode:'onetime'});
  assert.equal(values.get('capitalo.amount'),'25000');assert.equal(values.get('capitalo.mode'),'onetime');
});

test('legacy lump mode migrates to canonical onetime mode',()=>{
  const storage={getItem:key=>key==='capitalo.mode'?'lump':null,setItem(){}};
  assert.equal(createSharedState(storage).get().mode,'onetime');
});
