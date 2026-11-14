import {fdMaturity} from './calc.js';
export function nearestFDTenure(years){return [1,3,5].reduce((best,current)=>Math.abs(current-years)<Math.abs(best-years)?current:best,1)}
export function fdRate(record,years,citizen='general'){
 const tenure=nearestFDTenure(years),base=Number(record?.rates?.[`y${tenure}`]);if(!Number.isFinite(base)||base<=0)return {rate:null,tenure,nearest:tenure!==years,seniorAvailable:Boolean(record?.senior_extra_pp)};
 let extra=0,rangeApplied=false;if(citizen==='senior'&&record?.senior_extra_pp){const senior=record.senior_extra_pp;extra=Number(senior.min??senior);rangeApplied=Number.isFinite(Number(senior.max))&&Number(senior.max)!==extra}
 return {rate:base+extra,tenure,nearest:tenure!==years,seniorAvailable:Boolean(record?.senior_extra_pp),rangeApplied,rangeLower:extra};
}
export function fdProjection(principal,ratePct,years,compounding=4){return fdMaturity(principal,ratePct/100,years,compounding)}
export function fdStale(asOf,now=Date.now()){const date=new Date(`${asOf}T12:00:00+05:30`).getTime();return !Number.isFinite(date)||now-date>45*86400000}
