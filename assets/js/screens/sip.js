import {strings} from '../strings.js?v=2026-11-14p1';
import {calculateProjection,formatINR} from '../calc.js?v=2026-11-14p1';
import {getSharedState,setSharedAmount,setSharedState} from '../shared-state.js?v=2026-11-14p1';
import {shareLink} from '../share.js?v=2026-11-14p1';
import {takeSelectedAsset} from '../route-state.js?v=2026-11-14p1';
import {element,input,button,labeled,EntityMark,sourceLink,mountSharedAmountControl,refreshSharedAmountControl} from '../ui.js?v=2026-11-14p1';
import {addToIslandButton,createIslandItem} from '../island.js?v=2026-11-14p1';

const MAX_AMOUNT=1_000_000_000;
const assetIcon=asset=>{
  if(!asset)return 'calculator';
  const type=String(asset.type||'').toLowerCase(),id=String(asset.id||'').toLowerCase(),name=String(asset.name||'').toLowerCase();
  if(type.includes('gold')||name.includes('gold')||id.includes('gold'))return 'gold';
  if(type.includes('silver')||name.includes('silver')||id.includes('silver'))return 'silver';
  if(type.includes('bond')||name.includes('bond')||name.includes('treasury')||name.includes('t-bill')||name.includes('g-sec'))return 'bond';
  if(type.includes('stock'))return 'stock';
  if(type==='fd'||type.includes('bank'))return 'bank';
  if(type==='etf'||type.includes('etf'))return 'etf';
  return 'fund';
};

export function mount(host,route={}){
  if(route.shareParams){const sharedMode=route.shareParams.mode==='sip'?'sip':'onetime';setSharedState({amount:route.shareParams.amount,mode:sharedMode})}
  const asset=takeSelectedAsset(),sharedState=getSharedState();
  const hasAssetRate=Number.isFinite(asset?.ratePct),hasSharedRate=route.shareParams?.rate!==undefined&&route.shareParams.rate!==null&&route.shareParams.rate!=='';
  const initialRate=hasSharedRate?route.shareParams.rate:hasAssetRate?asset.ratePct:'';
  const initialYears=route.shareParams?.years||asset?.defaultYears||5;
  const form=element('section','calculator-form');
  const monthly=input('monthly',{value:sharedState.mode==='sip'?sharedState.amount||'':'',type:'number',mode:'numeric',min:1,max:MAX_AMOUNT});
  const oneTime=input('one-time',{value:sharedState.mode==='onetime'?sharedState.amount||'':'',type:'number',mode:'numeric',min:1,max:MAX_AMOUNT});
  const years=input('years',{value:initialYears,type:'number',mode:'numeric',min:1,max:40,step:1});
  const rate=input('rate',{value:initialRate,type:'number',mode:'decimal',min:0,max:50,step:1,placeholder:'0–50'});
  const shared=mountSharedAmountControl({onChange:state=>{
    if(state.mode==='sip'){monthly.value=state.amount||'';oneTime.value=''}
    else{oneTime.value=state.amount||'';monthly.value=''}
    calculateNow();
  }});
  shared.querySelector('[name="shared-amount"]')?.addEventListener('input',event=>{const value=Number(String(event.currentTarget.value).replace(/[₹,\s]/g,''));if(Number.isFinite(value)&&value>MAX_AMOUNT){event.currentTarget.value=String(MAX_AMOUNT);setSharedAmount(MAX_AMOUNT);const mode=getSharedState().mode;if(mode==='sip')monthly.value=String(MAX_AMOUNT);else oneTime.value=String(MAX_AMOUNT);calculateNow();amountGuard.textContent=strings.amountClamped;amountGuard.hidden=false}},{passive:true});
  const amountGuard=element('p','validation-note');amountGuard.hidden=true;
  form.append(labeled(strings.monthlyAmount,monthly),labeled(strings.oneTimeAmount,oneTime),labeled(strings.years,years),labeled(strings.annualReturn,rate));

  const yearChips=element('div','range-row year-chips'),yearLabel=element('p','subtle-note','Years');
  for(const value of [1,3,5,10]){const chip=button(`${value} years`,{className:'button secondary compact',action:'year-chip'});chip.dataset.years=String(value);chip.setAttribute('aria-pressed',String(Number(years.value)===value));yearChips.append(chip)}
  const rateChips=element('div','range-row rate-chips'),chipLabel=element('p','subtle-note',strings.exampleScenarios);
  for(const value of [8,12,15]){const chip=button(`${value}%`,{className:'button secondary compact',action:'rate-chip'});chip.dataset.rate=String(value);chip.setAttribute('aria-pressed','false');rateChips.append(chip)}

  const advanced=element('details','advanced-panel'),summary=element('summary','',strings.advanced),inflation=input('inflation',{value:6,type:'number',mode:'decimal',min:0,max:20,step:.1});
  advanced.append(summary,labeled(strings.inflation,inflation),element('p','subtle-note',strings.inflationExample));
  const source=element('p','subtle-note calculator-source',asset?`${asset.source||asset.rateSource||strings.userAssumption}${asset.asOf?` · ${strings.asOf.toLowerCase()} ${asset.asOf}`:''}`:strings.userAssumption);
  const sourceUrl=asset?sourceLink(asset.sourceUrl,strings.source):null;if(sourceUrl)source.append(' ',sourceUrl);
  const outputs=element('div','projection-output');outputs.setAttribute('aria-live','polite');
  const scenarioNote=element('p','subtle-note',strings.scenarioLabel),scenario=element('div','scenario-strip'),shareStatus=element('p','inline-status'),monthlyLine=element('p','inline-status'),shareNotice=element('p','subtle-note',strings.shareNumbersMayDiffer);
  const addTotal=addToIslandButton({item:{},invalidReason:strings.islandInvalid});shareNotice.hidden=!route.shareParams;
  const formActions=element('div','form-actions'),calculate=button(strings.calculate,{className:'button primary',action:'calculate'}),share=button(strings.shareProjection,{className:'button secondary',action:'share'});share.disabled=true;formActions.append(calculate,share);
  if(asset){const banner=element('div','asset-banner'),copy=element('div','asset-banner-copy'),icon=assetIcon(asset);copy.append(element('strong','',strings.assetTitle.replace('{name}',asset.name)),source);const brandType=asset.type==='stocks'?'stock':asset.type==='fd'?'bank':['etf','etf-catalogue','mutual-fund'].includes(asset.type)?'amc':null,house=strings.mfFundHouses.find(value=>asset.name.toLowerCase().startsWith(value.toLowerCase()))||'';banner.append(EntityMark(brandType==='amc'?(house||asset.name):asset.name,icon,brandType),copy);host.replaceChildren(banner)}
  host.append(shared,amountGuard,form,yearLabel,yearChips,chipLabel,rateChips,formActions,advanced);if(!asset)host.append(source);host.append(shareNotice,monthlyLine,outputs,scenarioNote,scenario,shareStatus);

  function calculateNow(){
    amountGuard.textContent='';amountGuard.hidden=true;
    let m=Number(monthly.value)||0,l=Number(oneTime.value)||0;
    for(const [field,value] of [[monthly,m],[oneTime,l]])if(value>MAX_AMOUNT){field.value=String(MAX_AMOUNT);if(field===monthly)m=MAX_AMOUNT;else l=MAX_AMOUNT;amountGuard.textContent=strings.amountClamped;amountGuard.hidden=false}else if(value<0){field.value='0';if(field===monthly)m=0;else l=0}
    const activeAmount=getSharedState().mode==='sip'?m:l, y=Number(years.value), r=rate.value===''?NaN:Number(rate.value),missing=[];
    if(!Number.isFinite(activeAmount)||activeAmount<1)missing.push(strings.amount.toLowerCase());
    if(years.value===''||!Number.isFinite(y))missing.push(strings.years.toLowerCase());
    if(rate.value===''||!Number.isFinite(r))missing.push('a return');
    if(missing.length){outputs.replaceChildren(element('p','inline-status',`${strings.pickInputsPrefix}${missing.join(', ')} ${strings.pickInputsSuffix}`));addTotal.setItem({},strings.islandInvalid);scenario.replaceChildren();share.disabled=true;monthlyLine.textContent='';return}
    if(y<1||y>40||r<0||r>50){outputs.replaceChildren(element('p','inline-status error',strings.invalidInputs));addTotal.setItem({},strings.islandInvalid);scenario.replaceChildren();share.disabled=true;return}
    const result=calculateProjection({monthly:m,oneTime:l,annualRatePct:r,years:y});
    if(!result||![result.finalValue,result.invested,result.gain].every(Number.isFinite)){outputs.replaceChildren(element('p','inline-status error',strings.invalidInputs));addTotal.setItem({},strings.islandInvalid);scenario.replaceChildren();share.disabled=true;return}
    const card=element('div','result-card'),main=element('div','result-main');main.append(element('small','',strings.finalValue),element('strong','',formatINR(result.finalValue)));
    const metrics=element('div','result-grid');for(const [label,value] of [[strings.invested,result.invested],[strings.gain,result.gain]]){const cell=element('div','result-number');cell.append(element('small','',label),element('strong','',formatINR(value)));metrics.append(cell)}
    card.append(main,metrics);if(getSharedState().mode==='sip')card.append(element('p','subtle-note',strings.endOfMonth));
    if(advanced.open){const real=result.finalValue/Math.pow(1+Math.max(0,Number(inflation.value)||0)/100,y);card.append(element('p','subtle-note',`${strings.afterInflation}: ${formatINR(real)}`))}
    const mode=getSharedState().mode,id=asset?.id||`${asset?.type||'calculator'}:${asset?.name||'sip'}`,item=createIslandItem({id,type:asset?.type||'sip',name:asset?.name||strings.sipCalculator,mode,amount:mode==='sip'?m:l,years:y,rate:r,rateSource:asset?.rateSource||asset?.source||strings.userAssumption,markType:asset?.type==='stocks'?'stock':asset?.type==='fd'?'bank':['etf','etf-catalogue','mutual-fund'].includes(asset?.type)?'amc':null,markName:asset?.type==='stocks'||asset?.type==='fd'?asset.name:['etf','etf-catalogue','mutual-fund'].includes(asset?.type)?(strings.mfFundHouses.find(house=>asset.name.toLowerCase().startsWith(house.toLowerCase()))||asset.name):null,invested:result.invested,finalValue:result.finalValue,low:result.lowerScenario,high:result.higherScenario});
    addTotal.setItem(item);card.append(addTotal);outputs.replaceChildren(card);share.disabled=false;scenario.replaceChildren();
    for(const [label,value] of [[strings.scenarioLow,result.lowerScenario],[strings.scenarioHigh,result.higherScenario]]){const item=element('p');item.append(element('span','',label),element('strong','',formatINR(value)));scenario.append(item)}
    monthlyLine.textContent=mode==='sip'?strings.monthlySchedule.replace('{amount}',new Intl.NumberFormat('en-IN',{maximumFractionDigits:0}).format(m)).replace('{months}',String(y*12)):'';
  }

  for(const field of [monthly,oneTime,years,rate,inflation])field.addEventListener('input',()=>{
    if(field===monthly&&getSharedState().mode==='sip'){setSharedAmount(monthly.value);refreshSharedAmountControl(shared)}
    if(field===oneTime&&getSharedState().mode==='onetime'){setSharedAmount(oneTime.value);refreshSharedAmountControl(shared)}
    if(field===years)for(const chip of yearChips.querySelectorAll('[data-years]'))chip.setAttribute('aria-pressed',String(Number(chip.dataset.years)===Number(years.value)));
    calculateNow();
  },{passive:true});
  advanced.addEventListener('toggle',calculateNow);
  formActions.addEventListener('click',event=>{
    const action=event.target.closest('[data-action]')?.dataset.action;
    if(action==='calculate')calculateNow();
    if(action==='share'&&!share.disabled)void shareLink({screen:'sip',amount:getSharedState().amount,mode:getSharedState().mode,years:Number(years.value),rate:Number(rate.value)}).then(status=>{shareStatus.textContent=status==='copied'?strings.shareCopied:status==='shared'?strings.shareSent:strings.shareUnavailable}).catch(error=>{if(error?.name!=='AbortError')shareStatus.textContent=strings.shareUnavailable});
  });
  yearChips.addEventListener('click',event=>{const chip=event.target.closest('[data-years]');if(!chip)return;years.value=chip.dataset.years;for(const candidate of yearChips.querySelectorAll('[data-years]'))candidate.setAttribute('aria-pressed',String(candidate===chip));calculateNow()});
  rateChips.addEventListener('click',event=>{const chip=event.target.closest('[data-rate]');if(!chip)return;rate.value=chip.dataset.rate;for(const candidate of rateChips.querySelectorAll('[data-rate]'))candidate.setAttribute('aria-pressed',String(candidate===chip));calculateNow()});
  calculateNow();
}




