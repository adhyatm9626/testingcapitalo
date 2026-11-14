import test from 'node:test';
import assert from 'node:assert/strict';
import {stepNumericValue,clampNumericValue,normalizeNumericText} from '../assets/js/ui.js';

test('custom rupee steppers change by exactly one in both directions',()=>{
  let value='1000';for(let i=0;i<6;i++)value=stepNumericValue(value,1,{kind:'amount',min:1,max:1_000_000_000});assert.equal(value,'1006');
  value='1000';for(let i=0;i<6;i++)value=stepNumericValue(value,-1,{kind:'amount',min:1,max:1_000_000_000});assert.equal(value,'994');
});
test('decimal input preserves 7.25 and steppers retain fractional precision',()=>{
  assert.equal(normalizeNumericText('7.25','decimal'),'7.25');
  assert.equal(stepNumericValue('7.25',1,{kind:'decimal',min:0,max:50}),'8.25');
  assert.equal(stepNumericValue('7.25',-1,{kind:'decimal',min:0,max:50}),'6.25');
});
test('blur clamping respects rupee, year and return bounds',()=>{
  assert.equal(clampNumericValue('0',{kind:'amount',min:1,max:1_000_000_000}),'1');
  assert.equal(clampNumericValue('1000000001',{kind:'amount',min:1,max:1_000_000_000}),'1000000000');
  assert.equal(clampNumericValue('41',{kind:'integer',min:1,max:40}),'40');
  assert.equal(clampNumericValue('50.25',{kind:'decimal',min:0,max:50}),'50');
});
