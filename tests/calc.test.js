import test from 'node:test';
import assert from 'node:assert/strict';
import {lumpSum,sipFutureValue,fdMaturity,fdRecurringValue,calculateProjection,formatINR,parseIndianAmount,monthlyContributionForTarget} from '../assets/js/calc.js';

const money=value=>Number(value.toFixed(2));
test('golden one-time projection: ₹1,00,000 at 8% for 5 years',()=>assert.equal(money(lumpSum(100000,.08,5)),146932.81));
test('golden monthly SIP: ₹10,000 at 12% for 10 years',()=>{
  const result=calculateProjection({monthly:10000,annualRatePct:12,years:10});
  assert.equal(money(result.finalValue),2219300.41);assert.equal(result.invested,1200000);assert.equal(money(result.gain),1019300.41);
});
test('zero-rate SIP: ₹5,000 per month for 5 years',()=>assert.equal(money(sipFutureValue(5000,0,5)),300000));
test('mixed SIP and one-time golden projection',()=>{
  const result=calculateProjection({monthly:5000,oneTime:100000,annualRatePct:10,years:3});
  assert.equal(money(result.finalValue),340645.88);assert.equal(result.invested,280000);
});
test('FD golden projections cover quarterly, annual, simple, and monthly compounding',()=>{
  assert.equal(money(fdMaturity(100000,.07,3,4)),123143.93);
  assert.equal(money(fdMaturity(100000,.07,5,1)),140255.17);
  assert.equal(money(fdMaturity(100000,.07,3,0)),121000);
  assert.equal(money(fdMaturity(50000,.065,1,12)),53348.59);
});
test('monthly FD estimate matches recurring-deposit golden values',()=>{
  assert.equal(money(fdRecurringValue(1000,.07,5,4)),71932.79);
  assert.equal(money(fdRecurringValue(1000,.07,1,4)),12462.13);
  assert.equal(money(fdRecurringValue(5000,.065,3,4)),199121.86);
  assert.equal(money(fdRecurringValue(1000,.0675,5,4)),71459.95);
});
test('annual return is clamped from zero to fifty percent',()=>{
  assert.equal(lumpSum(100000,-.1,1),100000);assert.equal(lumpSum(100000,1,1),150000);
  assert.equal(sipFutureValue(1000,-.5,1),12000);
});
test('INR formatter and amount parser use Indian grouping',()=>{
  assert.match(formatINR(100000),/1,00,000/);assert.equal(parseIndianAmount('₹1,00,000'),100000);
  assert.equal(parseIndianAmount('1'),1);assert.equal(parseIndianAmount('2000000000'),1000000000);assert.equal(parseIndianAmount(''),0);
});
test('monthly contribution goal solver uses the end-of-month SIP formula',()=>{
  const monthly=monthlyContributionForTarget(1000000,0,5);assert.ok(Math.abs(monthly*60-1000000)<.01);
});
