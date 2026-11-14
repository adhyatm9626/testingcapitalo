export const rowsFrom=value=>Array.isArray(value)?value:Array.isArray(value?.items)?value.items:[];
export function catalogueRows(data,dataset,section){if(dataset==='bullion'&&['gold','silver'].includes(section))return Array.isArray(data?.[section])?data[section]:[];return rowsFrom(data)}
export function fundPlan(name){const text=String(name||'').toLowerCase();return /\bdirect\b/.test(text)?'direct':/\bregular\b/.test(text)?'regular':'other'}
export function fundType(name){const text=String(name||'').toLowerCase();if(/\bbonus\b/.test(text))return 'bonus';if(/\bgrowth\b/.test(text))return 'growth';if(/\bidcw\b|dividend|payout|reinvestment/.test(text))return 'idcw';return 'other'}
export function filterFundRows(rows,{plan='direct',type='growth',house=''}={}){return (Array.isArray(rows)?rows:[]).filter(row=>{const name=row.schemeName||row.scheme_name||row.name||'',provider=row.fundHouse||row.fund_house||'';const houseMatch=!house||(provider?provider.toLowerCase().includes(house.toLowerCase()):String(name).toLowerCase().includes(house.toLowerCase()));return (!plan||fundPlan(name)===plan)&&(!type||fundType(name)===type)&&houseMatch})}
export function bullionDisplayValue(value,unit=''){
 const number=Number(String(value??'').replace(/[^\d.]/g,''));if(!Number.isFinite(number))return String(value??'');
 const amount=new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(number);let suffix=String(unit).toLowerCase();
 suffix=suffix.replace(/per\s+10\s+grams?/,'per 10 g').replace(/per\s+kilogram/,'per kg').replace(/\s*·.*$/,'').trim();return `Rs ${amount}${suffix?` ${suffix}`:''}`;
}
export function stockListState(data,{published=true}={}){const items=rowsFrom(data);return {count:published?items.length:0,rows:published?items:[],blocked:false,switchedOff:!published,reason:published?'':'stocks_list_switched_off'}}
