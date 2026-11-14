const dateValue=value=>{
  if(value instanceof Date)return value.getTime();
  const text=String(value||'');
  const m=text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  const date=m?new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00Z`):new Date(text);
  return Number.isFinite(date.getTime())?date.getTime():NaN;
};
const sortedHistory=rows=>(Array.isArray(rows)?rows:[]).map(row=>({date:dateValue(row.date),value:Number(row.nav??row.value??row.close)})).filter(row=>Number.isFinite(row.date)&&Number.isFinite(row.value)&&row.value>0).sort((a,b)=>a.date-b.date);

export function cagrFromHistory(rows,minimumYears=1){
  const points=sortedHistory(rows);if(points.length<2)return null;
  const years=(points.at(-1).date-points[0].date)/(365.2425*86400000);
  if(years<minimumYears)return null;
  return Math.pow(points.at(-1).value/points[0].value,1/years)-1;
}

export function riskFromHistory(rows){
  const points=sortedHistory(rows);if(points.length<2||(points.at(-1).date-points[0].date)<365.2425*86400000)return {available:false,reason:'not_enough_history'};
  const returns=[];for(let i=1;i<points.length;i++){const days=(points[i].date-points[i-1].date)/86400000;if(days>0)returns.push({date:points[i].date,days,rate:points[i].value/points[i-1].value-1})}
  if(returns.length<2)return {available:false,reason:'not_enough_history'};
  const mean=returns.reduce((s,r)=>s+r.rate,0)/returns.length;
  const variance=returns.reduce((s,r)=>s+(r.rate-mean)**2,0)/(returns.length-1);
  const averageGap=returns.reduce((s,r)=>s+r.days,0)/returns.length;
  const volatility=Math.sqrt(variance)*Math.sqrt(365.2425/averageGap);
  let peak=points[0].value,maxDrawdown=0;for(const point of points){peak=Math.max(peak,point.value);maxDrawdown=Math.min(maxDrawdown,point.value/peak-1)}
  const oneYear=[];let j=0;for(let i=0;i<points.length;i++){while(j<i&&(points[i].date-points[j].date)>=(365.2425*86400000)){if((points[i].date-points[j].date)<(366.5*86400000))oneYear.push(points[i].value/points[j].value-1);j++}}
  oneYear.sort((a,b)=>a-b);const worstYearReturn=oneYear.length?oneYear[Math.floor((oneYear.length-1)*.05)]:null;
  return {available:true,volatility,maxDrawdown,worstYearReturn,score:Math.max(1,Math.min(10,Math.ceil(volatility*25))),label:volatility<.08?'Low':volatility<=.18?'Medium':'High'};
}
