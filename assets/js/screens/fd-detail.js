import {strings} from '../strings.js?v=2026-11-14p1';
import {loadFdRecords} from '../fd-data.js?v=2026-11-14p1';
import {fdMaturity,fdRecurringValue,formatINR,roundMoney} from '../calc.js?v=2026-11-14p1';
import {getSharedState} from '../shared-state.js?v=2026-11-14p1';
import {element,input,select,button,labeled,EntityMark,stateMessage,showSkeleton,dateLabel,sourceLink,optionBadge,mountSharedAmountControl} from '../ui.js?v=2026-11-14p1';
import {addToIslandButton,createIslandItem} from '../island.js?v=2026-11-14p1';

const rateFor=(record,years,senior)=>{const base=Number(record.rates?.[`y${years}`]);if(!Number.isFinite(base)||base<=0)return null;const extra=senior&&record.senior_extra_pp?Number(record.senior_extra_pp.min??record.senior_extra_pp)||0:0;return base+extra};
export function mount(host,route){
  showSkeleton(host);loadFdRecords().then(({records})=>{
    const id=decodeURIComponent(route.id||''),record=records.find(item=>item.id===id);
    if(!record){stateMessage(host,{kind:'empty',message:strings.dataUnavailable,code:'fd_not_found',retry:()=>{location.hash='#fd'}});return}
    const shared=mountSharedAmountControl(),detail=element('div','fd-detail'),heading=element('div','detail-heading');const entityType=record.group==='foreign'?'foreign':record.group==='corporate'?'corporate':record.group==='bank'?'bank':null;heading.append(EntityMark(record.name,record.postOffice?'post':'bank',entityType),element('h2','',record.name));detail.append(heading);
    const date=dateLabel(record.as_of),sourceLine=element('p','subtle-note',`${record.source_name||'Capitalo team (manual updates)'} · ${strings.asOf.toLocaleLowerCase()} ${date}`);detail.append(sourceLine);
    if(record.verified!==true)detail.append(element('p','reference-note',strings.referenceRate.replace('{date}',date)));
    if(record.as_of&&Date.now()-new Date(`${record.as_of}T12:00:00+05:30`).getTime()>45*86400000)detail.append(element('p','risk-note',strings.staleWarning));
    if(record.rates?.highest!==undefined)detail.append(element('p','subtle-note',`${strings.highestSlab}: ${Number(record.rates.highest).toFixed(2)}%. ${strings.highestExcluded}`));
    if(record.senior_extra_pp){const extra=record.senior_extra_pp,low=Number(extra.min??extra),high=Number(extra.max??extra);detail.append(element('p','subtle-note',`${strings.seniorExtra}: ${low.toFixed(2)}%${high!==low?`–${high.toFixed(2)}%`:''}. ${strings.seniorLowerUsed}`))}
    else detail.append(optionBadge(strings.seniorUnavailable));
    if(record.group==='corporate')detail.append(element('p','risk-note',strings.corporateRisk));
    if(record.group==='bank'||record.group==='foreign'){const insurance=element('p','subtle-note',strings.bankInsurance),link=sourceLink('https://www.dicgc.org.in/FAQs','DICGC FAQ');if(link)insurance.append(' ',link);detail.append(insurance)}
    if(record.postOffice)detail.append(element('p','subtle-note',strings.governmentSmallSavings+'. '+strings.validUntil.replace('{month}',record.valid_until||strings.dateUnavailable)));
    const official=sourceLink(record.official_website,strings.openBankWebsite);if(official)detail.append(official);
    const form=element('section','calculator-form'),yearsList=[1,2,3,5].filter(year=>Number.isFinite(Number(record.rates?.[`y${year}`]))),tenure=select('years',yearsList.map(year=>({value:year,label:year===1?'1 year':`${year} years`})),{value:yearsList[0]||1}),compound=select('compounding',[{value:0,label:strings.simpleInterest},{value:1,label:strings.yearly},{value:2,label:strings.halfYearly},{value:4,label:strings.quarterly},{value:12,label:strings.monthly}],{value:4});form.append(labeled(strings.years,tenure),labeled(strings.compounding,compound));
    let seniorToggle=null;if(record.senior_extra_pp){seniorToggle=input('senior',{type:'checkbox',mode:null});seniorToggle.className='control-checkbox';const label=element('label','check-field',strings.seniorToggle);label.append(seniorToggle);form.append(label)}
    const advanced=element('details','advanced-panel'),summary=element('summary','',strings.advanced),tax=input('tax',{value:'',type:'number',mode:'decimal',min:0,max:50,step:.1,placeholder:'0'});advanced.append(summary,labeled(strings.taxSlab,tax));form.append(advanced);
    const note=element('p','subtle-note',strings.scenarioLabel),recurringNote=element('p','risk-note',strings.fdRecurringNote),monthlyLine=element('p','inline-status'),result=element('div','result-card'),scenario=element('div','scenario-strip'),add=addToIslandButton({item:{},invalidReason:strings.islandInvalid});detail.append(form,note,recurringNote,monthlyLine,result,scenario);
    const render=()=>{const {amount,mode}=getSharedState(),yearsValue=Number(tenure.value)||1,selectedRate=rateFor(record,yearsValue,Boolean(seniorToggle?.checked)),periods=Number(compound.value),recurring=mode==='sip';recurringNote.hidden=!recurring;monthlyLine.hidden=!recurring;result.replaceChildren();scenario.replaceChildren();
      if(selectedRate===null){stateMessage(result,{kind:'empty',message:strings.notAvailable,code:'fd_rate_unavailable'});result.append(add);add.setItem({},strings.islandInvalid);return}
      if(amount<1){stateMessage(result,{kind:'empty',message:strings.inputsRequired,code:'inputs_required'});result.append(add);add.setItem({},strings.islandInvalid);return}
      const invested=roundMoney(recurring?amount*yearsValue*12:amount),calc=(rate)=>recurring?fdRecurringValue(amount,rate/100,yearsValue,periods===0?4:periods):fdMaturity(amount,rate/100,yearsValue,periods),final=calc(selectedRate),gain=roundMoney(final-invested);
      if(recurring)monthlyLine.textContent=strings.monthlySchedule.replace('{amount}',new Intl.NumberFormat('en-IN',{maximumFractionDigits:0}).format(amount)).replace('{months}',String(yearsValue*12));
      const main=element('div','result-main');main.append(element('small','',strings.finalValue),element('strong','',formatINR(final)));const metrics=element('div','result-grid');for(const [label,value] of [[strings.invested,invested],[strings.gain,gain]]){const box=element('div','result-number');box.append(element('small','',label),element('strong','',formatINR(value)));metrics.append(box)}result.append(main,metrics);
      const taxRate=Math.max(0,Math.min(50,Number(tax.value)||0))/100;if(taxRate>0){const post=roundMoney(invested+Math.max(0,gain)*(1-taxRate));result.append(element('p','subtle-note',`${strings.afterTax}: ${formatINR(post)}`))}
      const low=roundMoney(calc(Math.max(0,selectedRate-3))),high=roundMoney(calc(Math.min(50,selectedRate+3))),item=createIslandItem({id:`fd:${id}`,type:'fd',name:record.name,mode,amount,years:yearsValue,rate:selectedRate,rateSource:record.source_name||strings.userAssumption,markType:entityType||null,markName:record.name,invested,finalValue:roundMoney(final),low,high});add.setItem(item);result.append(add);
      for(const [label,value] of [[strings.scenarioLow,low],[strings.scenarioHigh,high]]){const cell=element('p');cell.append(element('span','',label),element('strong','',formatINR(value)));scenario.append(cell)}
    };
    for(const field of [tenure,compound,tax,...(seniorToggle?[seniorToggle]:[])])field.addEventListener('input',render,{passive:true});shared.addEventListener('shared-change',render);render();host.replaceChildren(shared,detail);
  }).catch(error=>stateMessage(host,{kind:'error',message:strings.dataUnavailable,code:error.code||'data_unavailable',retry:()=>mount(host,route)}));
}



