export const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const boundedRate=rate=>clamp(rate,0,.5);

export function lumpSum(principal,annualRate,years){
  if(![principal,annualRate,years].every(Number.isFinite)||principal<0||years<0)return NaN;
  return principal*Math.pow(1+boundedRate(annualRate),years);
}
export function sipFutureValue(monthly,annualRate,years){
  if(![monthly,annualRate,years].every(Number.isFinite)||monthly<0||years<0)return NaN;
  const rate=Math.pow(1+boundedRate(annualRate),1/12)-1,months=years*12;
  return Math.abs(rate)<1e-12?monthly*months:monthly*((Math.pow(1+rate,months)-1)/rate);
}
export function fdMaturity(principal,annualRate,years,compoundsPerYear=4){
  if(![principal,annualRate,years,compoundsPerYear].every(Number.isFinite)||principal<0||years<0||compoundsPerYear<0)return NaN;
  const rate=boundedRate(annualRate);
  return compoundsPerYear===0?principal*(1+rate*years):principal*Math.pow(1+rate/compoundsPerYear,compoundsPerYear*years);
}
export const roundMoney=value=>Number.isFinite(value)?Math.round((value+Number.EPSILON)*100)/100:NaN;
export function fdRecurringValue(monthly,annualRate,years,compoundsPerYear=4){
  if(![monthly,annualRate,years,compoundsPerYear].every(Number.isFinite)||monthly<0||years<0||compoundsPerYear<1)return NaN;
  const rate=boundedRate(annualRate),months=Math.round(years*12);let total=0;
  for(let k=1;k<=months;k++)total+=monthly*Math.pow(1+rate/compoundsPerYear,compoundsPerYear*(months-k+1)/12);
  return roundMoney(total);
}
export function calculateProjection({monthly=0,oneTime=0,annualRatePct=0,years=1}){
  if(![monthly,oneTime,annualRatePct,years].every(Number.isFinite)||monthly<0||oneTime<0||years<=0)return null;
  const rate=boundedRate(annualRatePct/100),invested=monthly*years*12+oneTime;
  const valueAt=assumption=>sipFutureValue(monthly,assumption,years)+lumpSum(oneTime,assumption,years);
  const finalValue=roundMoney(valueAt(rate)),roundedInvested=roundMoney(invested);
  return {finalValue,invested:roundedInvested,gain:roundMoney(finalValue-roundedInvested),rate,years,monthly,oneTime,lowerScenario:roundMoney(valueAt(boundedRate(rate-.03))),higherScenario:roundMoney(valueAt(boundedRate(rate+.03)))};
}
export function formatINR(value){
  if(!Number.isFinite(value))return '—';
  return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
}
export function parseIndianAmount(value){
  const text=String(value??'').replace(/[₹,\s]/g,''),number=Number(text);
  return text&&Number.isFinite(number)?clamp(number,0,1e9):0;
}
export function monthlyContributionForTarget(target,annualRate,years){
  if(![target,annualRate,years].every(Number.isFinite)||target<0||years<=0)return NaN;
  if(target===0)return 0;
  let lo=0,hi=target/(12*years)||1;
  while(sipFutureValue(hi,annualRate,years)<target&&hi<1e12)hi*=2;
  for(let i=0;i<90;i++){const mid=(lo+hi)/2;if(sipFutureValue(mid,annualRate,years)<target)lo=mid;else hi=mid}
  return hi;
}
