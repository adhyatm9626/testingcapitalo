export function paginateSearchResults(items,{limit=15,offset=0}={}){
 const all=(Array.isArray(items)?items:[]).slice().sort((a,b)=>Number(a.schemeCode)-Number(b.schemeCode));
 const pageSize=Math.max(1,Math.min(50,Number.parseInt(limit,10)||15)),start=Math.max(0,Number.parseInt(offset,10)||0);
 return {data:all.slice(start,start+pageSize),total:all.length,limit:pageSize,offset:start};
}

const HOUSES=['SBI','HDFC','ICICI Prudential','Axis','Kotak','Nippon India','UTI','Mirae Asset','DSP','Tata','Aditya Birla Sun Life','Franklin India','Invesco','Bandhan','Parag Parikh','Motilal Oswal','Quant','HSBC','Canara Robeco','Sundaram','Edelweiss'];
const LARGE_MID=/\blarge\s*(?:&|and)\s*mid\s*cap\b/i;
const CATEGORY_RULES={
 large_cap:/\blarge\s+cap\b/i,
 large_mid_cap:LARGE_MID,
 mid_cap:/\bmid\s+cap\b/i,
 small_cap:/\bsmall\s+cap\b/i,
 index:/\bindex\b|\bnifty\b|\bsensex\b/i,
 flexi_cap:/\bflexi\s+cap\b/i,
 value:/\bvalue\b|\bcontra\b/i,
 tax_saver:/\belss\b|\btax\s+saver\b/i,
 sectoral:/\b(?:banking|pharma|healthcare|technology|infrastructure|consumption|manufacturing|psu|energy|thematic|sectoral)\b/i,
 multi_asset:/\bmulti\s+asset\b/i,
 hybrid:/\bhybrid\b|\bbalanced\b/i,
 debt:/\bdebt\b|\bgilt\b|\bbond\b/i,
 liquid_overnight:/\bliquid\b|\bovernight\b/i,
 gold_silver:/\bgold\b|\bsilver\b/i,
 international:/\binternational\b|\bfund\s+of\s+funds\b|\bfof\b/i
};

export function filterBrowseRows(rows,{amc='',plan='direct',option='growth',category='',q=''}={}){
 const needle=String(q).trim().toLowerCase(),houseNeedle=String(amc).toLowerCase(),categoryNeedle=String(category).toLowerCase();
 return (Array.isArray(rows)?rows:[]).filter(row=>{
  const name=String(row.schemeName||row.scheme_name||''),lower=name.toLowerCase(),house=HOUSES.find(value=>lower.startsWith(value.toLowerCase()))||'';
  if(!needle&&/\betf\b/i.test(name))return false;
  if(houseNeedle&&house.toLowerCase()!==houseNeedle)return false;
  if(plan&&!lower.includes(`${String(plan).toLowerCase()} plan`))return false;
  if(option&&!lower.includes(String(option).toLowerCase()))return false;
  if(categoryNeedle){const rule=CATEGORY_RULES[categoryNeedle];if(!rule||!rule.test(name))return false;if(categoryNeedle==='large_cap'&&LARGE_MID.test(name))return false;if(categoryNeedle==='mid_cap'&&LARGE_MID.test(name))return false}
  return !needle||lower.includes(needle)||String(row.schemeCode||row.scheme_code||'').includes(needle);
 }).sort((a,b)=>String(a.schemeName||a.scheme_name||'').localeCompare(String(b.schemeName||b.scheme_name||''),'en',{sensitivity:'base'}));
}

export function paginateBrowseRows(rows,{offset=0,limit=25}={}){const start=Math.max(0,Math.min(1_000_000,Number.parseInt(offset,10)||0)),size=Math.max(1,Math.min(100,Number.parseInt(limit,10)||25));return {data:rows.slice(start,start+size),total:rows.length,offset:start,limit:size}}
