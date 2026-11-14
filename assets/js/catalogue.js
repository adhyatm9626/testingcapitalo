import {strings} from './strings.js?v=2026-11-14p1';
import {readSets} from './data.js?v=2026-11-14p1';
import {element,pagedList,stateMessage,showSkeleton,sourceLink,EntityMark,optionBadge,mountSharedAmountControl,button} from './ui.js?v=2026-11-14p1';
import {saveSelectedAsset} from './route-state.js?v=2026-11-14p1';
import {formatINR} from './calc.js?v=2026-11-14p1';
import {catalogueRows,bullionDisplayValue} from './list-models.js?v=2026-11-14p1';
import {searchSchemes,latestNav,navHistory,calculateNavReturns,dateText} from './mf-api.js?v=2026-11-14p1';
const hasReference=record=>Boolean(record.source_name&&record.as_of);
const returnValue=(record,years)=>record[`return_${years}y`]??record[`return_${years}Y`]??record[`y${years}`];
function appendManualReference(copy,record){
 if(!hasReference(record))return false;
 const ref=element('div','reference-data');
 if(Number.isFinite(Number(record.price))&&record.price)ref.append(element('small','',`Price: ${formatINR(Number(record.price))}`));
 for(const years of [1,3,5]){const value=returnValue(record,years);if(value!==null&&value!==''&&Number.isFinite(Number(value)))ref.append(element('small','',`${years}Y return: ${Number(value).toFixed(2)}%`))}
 if(record.yield!==null&&record.yield!==''&&record.yield!==undefined&&Number.isFinite(Number(record.yield)))ref.append(element('small','',`Distribution yield: ${Number(record.yield).toFixed(2)}%`));
 if(ref.childNodes.length){const attribution=element('small','',`${record.source_name} · As of ${record.as_of}`),link=sourceLink(record.source_url,strings.source);ref.append(attribution);if(link)ref.append(link);copy.append(ref)}
 return ref.childNodes.length>0;
}
async function loadEtfNav(target,record){
 const line=element('small','nav-loading',strings.loading);target.append(line);
 try{
  const response=await navHistory(record.scheme_code),history=response.data||{},rows=history.data||[],nav=Number(rows[0]?.nav);
  line.remove();if(!Number.isFinite(nav)||!rows[0]?.date)throw new Error('nav_not_found');
  target.append(element('small','',`NAV: ${formatINR(nav)} · ${strings.navNotMarketPrice}`),element('small','',`NAV date: ${dateText(rows[0].date)}`));
  for(const item of calculateNavReturns(history)){if(item.value!==null){record[`_return${item.years}y`]=item.value*100;target.append(element('small','',`${item.years}Y return: ${(item.value*100).toFixed(2)}% · ${dateText(item.startDate)} – ${dateText(item.endDate)}`))}}
 }catch{line.remove();target.append(element('small','',strings.etfNavNotFound))}
}
export function mountCatalogue(host,{setName,section,title,icon='fund',note=strings.descriptionOnly}){
 const names=Array.isArray(setName)?setName:[setName];showSkeleton(host);
 readSets(names).then(envelopes=>{
  const envelope=envelopes[names[0]],data=envelope.data,rows=names.flatMap(name=>catalogueRows(envelopes[name].data,name,section).map(record=>({...record,_catalogueType:name,source_name:record.source_name||null})));
  const head=element('div','catalogue-meta');head.append(element('p','reference-note',note));const date=data?.as_of||data?.meta?.as_of;if(date)head.append(element('p','subtle-note',`${strings.asOf} ${date}`));const source=sourceLink(data?.source_url||envelope.sourceUrl,strings.source);if(source)head.append(source);
  const list=element('div','catalogue-list'),mfSection=element('section','mf-metal-navs');host.replaceChildren(mountSharedAmountControl(),head,list);if(setName==='bullion')host.append(mfSection);
  pagedList(list,rows,(record,index)=>{
   const li=element('li');li.dataset.rowIndex=String(index);const markName=record.name||record.symbol||title,markIcon=/t[- ]?bill|g[- ]?sec|treasury/i.test(markName)?'building':record.post_office||record.group==='post-office'?'post':icon;li.append(EntityMark(markName,markIcon));const copy=element('div','list-copy');copy.append(element('strong','',record.name||record.symbol||title));
   if(record._catalogueType==='bullion'&&['gold','silver'].includes(section)){copy.append(element('strong','catalogue-value',bullionDisplayValue(record.value,record.unit)));if(record.information_only)copy.append(optionBadge(strings.informationOnly))}
   else if(record.category||record.unit||record.focus)copy.append(element('small','',`${record.category||record.focus||''}${(record.category||record.focus)&&record.unit?' · ':''}${record.unit||''}`));
   if(record.details)copy.append(element('small','',record.details));
   const manual=appendManualReference(copy,record);
   if(record._catalogueType==='etf-catalogue'){
    const ref=element('div','etf-nav-reference');copy.append(ref);
    if(record.scheme_code&&(record.match_status==='auto'||record.match_status==='confirmed')){ref.append(element('small','',`${strings.etfMatched}: ${record.matched_name||record.scheme_code}`));void loadEtfNav(ref,record)}
    else ref.append(element('small','',strings.etfNavNotFound));
   }
   if(record.as_of)copy.append(element('small','',`${record.source_name?`${record.source_name} · `:''}${strings.asOf} ${record.as_of}`));if(record.verified)copy.append(optionBadge(strings.verifiedRate));
   const actions=element('div','list-actions');if(!(record._catalogueType==='bullion'&&record.hide_calculate)){const action=button(strings.calculate,{className:'button secondary compact',action:'calculate'});actions.append(action)}if(record._catalogueType==='bullion'&&record.link_etf_list){const link=button(strings.openEtfNavs,{className:'button secondary compact'});link.addEventListener('click',()=>location.hash='#etf');actions.append(link)}li.append(copy,actions);return li;
  },{pageSize:25,emptyMessage:strings.emptyState,onAction:(action,record)=>{
   if(action!=='calculate'||record.hide_calculate)return;let ratePct=null,defaultYears=null,rateSource=record.source_name||null,sourceUrl=record.source_url||null;
   for(const years of [3,5,1]){const candidate=returnValue(record,years);if(candidate!==null&&candidate!==''&&Number.isFinite(Number(candidate))&&hasReference(record)){ratePct=Number(candidate);defaultYears=years;break}}
   if(record._catalogueType==='etf-catalogue'&&Number.isFinite(Number(record._return3y))){ratePct=Number(record._return3y);defaultYears=3;rateSource='MFapi.in';sourceUrl='https://www.mfapi.in/docs/'}
   if(ratePct===null){for(const years of [5,1]){const candidate=record[`_return${years}y`];if(candidate!==undefined&&Number.isFinite(Number(candidate))){ratePct=Number(candidate);defaultYears=years;rateSource='MFapi.in';sourceUrl='https://www.mfapi.in/docs/';break}}}
   saveSelectedAsset({id:`${record._catalogueType}:${record.symbol||record.name}`,name:record.name||record.symbol||title,ratePct,defaultYears,rateSource,source:rateSource||strings.userAssumption,sourceUrl,asOf:record.as_of,type:record._catalogueType});location.hash='#sip';
  }});if(setName==='bullion'&&['gold','silver'].includes(section))void loadMetalNavs(mfSection,section);
 }).catch(error=>stateMessage(host,{kind:'error',message:strings.dataUnavailable,code:error.code||'data_unavailable',retry:()=>mountCatalogue(host,{setName,section,title,icon,note})}));
}
async function loadMetalNavs(section,metal){
 const label=metal==='gold'?'Gold':'Silver';section.replaceChildren(element('h2','',`${label} funds and ETF NAV · MFapi.in`));const state=element('div','metal-nav-results');section.append(state);showSkeleton(state);
 try{const terms=metal==='gold'?['Gold ETF','Gold Fund']:['Silver ETF','Silver Fund'],results=await Promise.all(terms.map(term=>searchSchemes(term,{limit:20,offset:0}))),all=results.flatMap(result=>Array.isArray(result.data)?result.data:[]),unique=[...new Map(all.filter(item=>/\b(etf|fund)\b/i.test(item.schemeName||'')).map(item=>[String(item.schemeCode),item])).values()].slice(0,8);if(!unique.length){stateMessage(state,{kind:'empty',message:strings.emptyState,code:'mf_metal_no_schemes'});return}const list=element('ul','data-list');const values=await Promise.all(unique.map(async item=>{try{const [latest,history]=await Promise.all([latestNav(item.schemeCode),navHistory(item.schemeCode)]),row=latest.data?.data?.[0],returns=calculateNavReturns(history.data||{}),chosen=[3,5,1].map(year=>returns.find(entry=>entry.years===year&&entry.value!==null)).find(Boolean);return {item,row,chosen}}catch{return {item,error:true}}}));for(const value of values){const li=element('li','entity-row'),name=value.item.schemeName,house=strings.mfFundHouses.find(item=>name.toLowerCase().startsWith(item.toLowerCase()))||'';li.append(EntityMark(house||name,'fund','amc'));const copy=element('div','list-copy');copy.append(element('strong','',name));if(value.row?.nav&&value.row.date)copy.append(element('small','',`NAV: ${formatINR(Number(value.row.nav))} · NAV date: ${dateText(value.row.date)} · ${strings.navNotMarketPrice}`));else copy.append(element('small','',strings.etfNavNotFound));if(value.chosen)copy.append(element('small','',`${value.chosen.years}Y return: ${(value.chosen.value*100).toFixed(2)}% · ${dateText(value.chosen.startDate)} – ${dateText(value.chosen.endDate)}`));const action=button(strings.calculate,{className:'button secondary compact'});action.addEventListener('click',()=>{saveSelectedAsset({id:`${metal}-mf:${value.item.schemeCode}`,name,ratePct:value.chosen?value.chosen.value*100:undefined,defaultYears:value.chosen?.years,rateSource:'MFapi.in',source:'MFapi.in',sourceUrl:'https://www.mfapi.in/docs/',asOf:value.row?.date,type:'mutual-fund'});location.hash='#sip'});li.append(copy,action);list.append(li)}state.replaceChildren(list)}catch(error){stateMessage(state,{kind:'error',message:strings.mfUnavailable,code:error.code||'mf_metal_failed',retry:()=>loadMetalNavs(section,metal)})}
}



