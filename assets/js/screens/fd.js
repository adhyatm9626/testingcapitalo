import {strings} from '../strings.js?v=2026-11-14p1';
import {loadFdRecords} from '../fd-data.js?v=2026-11-14p1';
import {element,input,select,button,EntityMark,optionBadge,pagedList,stateMessage,showSkeleton,installDebouncedSearch,dateLabel,sourceLink,mountSharedAmountControl} from '../ui.js?v=2026-11-14p1';

const rate=(record,years)=>Number(record.rates?.[`y${years}`])||null;
const groupLabel=group=>({bank:strings.groupBank,foreign:strings.groupForeign,corporate:strings.groupCorporate,'post-office':strings.groupPostOffice,'tax-saving':strings.groupTaxSaving}[group]||strings.groupBank);
const iconFor=record=>record.group==='foreign'?'bank':record.group==='corporate'?'building':record.group==='post-office'?'building':'bank';

export function mount(host){
  const search=input('search',{mode:'search',placeholder:strings.searchPlaceholder});search.type='search';search.autocomplete='off';
  const group=select('group',[{value:'all',label:strings.allGroups},{value:'bank',label:strings.groupBank},{value:'foreign',label:strings.groupForeign},{value:'corporate',label:strings.groupCorporate},{value:'post-office',label:strings.groupPostOffice},{value:'tax-saving',label:strings.groupTaxSaving}],{value:'all'});
  const type=select('type',[{value:'all',label:strings.allTypes},{value:'public',label:strings.typePublic},{value:'private',label:strings.typePrivate},{value:'small_finance',label:strings.typeSmallFinance},{value:'corporate',label:strings.typeCorporate},{value:'foreign',label:strings.typeForeign}],{value:'all'});
  const tenure=select('tenure',[{value:'all',label:strings.allTenures},{value:'1',label:'1 year'},{value:'3',label:'3 years'},{value:'5',label:'5 years'}],{value:'all'});
  const sort=select('sort',[{value:'name',label:strings.sortName},{value:'rate',label:strings.sortRate}],{value:'name'});
  const tools=element('div','screen-tools');for(const [label,control] of [[strings.search,search],[strings.filterGroup,group],[strings.filterType,type],[strings.filterTenure,tenure],[strings.sortBy,sort]])tools.append((()=>{const wrap=element('label','field-label',label);wrap.append(control);return wrap})());
  const intro=element('p','reference-note',strings.fixedDepositIntro),listHost=element('div','fd-list'),shared=mountSharedAmountControl();host.replaceChildren(shared,tools,intro,listHost);
  let records=[];
  const render=query=>{
    const term=query.toLocaleLowerCase('en-IN'),g=group.value,t=type.value,y=tenure.value;
    const rows=records.filter(record=>{
      const matchesGroup=g==='all'||record.group===g;const matchesType=t==='all'||record.type===t;
      const matchesTenure=y==='all'||rate(record,Number(y))!==null;
      const matchesText=`${record.name} ${record.group} ${record.type} ${record.id}`.toLocaleLowerCase('en-IN').includes(term);
      return matchesGroup&&matchesType&&matchesTenure&&matchesText;
    }).sort((a,b)=>sort.value==='rate'?((rate(b,Number(y)||1)||0)-(rate(a,Number(y)||1)||0))||a.name.localeCompare(b.name):a.name.localeCompare(b.name,'en-IN'));
    pagedList(listHost,rows,record=>{
      const li=element('li');li.dataset.rowIndex=String(rows.indexOf(record));const icon=record.group==='post-office'||record.postOffice?'post':iconFor(record),entityType=record.group==='foreign'?'foreign':record.group==='corporate'?'corporate':record.group==='bank'?'bank':null;li.append(EntityMark(record.name,icon,entityType));
      const copy=element('div','list-copy');copy.append(element('strong','',record.name));copy.append(element('small','',groupLabel(record.group)));
      const rates=element('small','');const years=[1,3,5].filter(n=>rate(record,n)!==null);rates.textContent=years.map(n=>`${n}Y ${rate(record,n).toFixed(2)}%`).join(' · ')||strings.notAvailable;copy.append(rates);
      copy.append(optionBadge(record.verified===true?strings.verifiedRate:strings.referenceRate.replace('{date}',dateLabel(record.as_of))));
      if(record.rates?.highest!==undefined)copy.append(element('small','',`${strings.highestSlab}: ${Number(record.rates.highest).toFixed(2)}%`));
      const actions=element('div','list-actions');actions.append(button(strings.details,{className:'button secondary compact',action:'open'}));li.append(copy,actions);return li;
    },{pageSize:25,emptyMessage:strings.emptyState,onAction:(action,record)=>{if(action==='open')location.hash=`#fd/${encodeURIComponent(record.id)}`}});
  };
  const load=async(force=false)=>{showSkeleton(listHost);try{const result=await loadFdRecords({force});records=result.records;render(search.value)}catch(error){stateMessage(listHost,{kind:'error',message:strings.dataUnavailable,code:error.code||'data_unavailable',retry:()=>load(true)})}};
  installDebouncedSearch(search,query=>render(query));for(const field of [group,type,tenure,sort])field.addEventListener('change',()=>render(search.value));load();
}



