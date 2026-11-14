import {strings} from '../strings.js?v=2026-11-14p1';
import {browseSchemes} from '../mf-api.js?v=2026-11-14p1';
import {element,input,button,EntityMark,installDebouncedSearch} from '../ui.js?v=2026-11-14p1';
import {toggleComparedFund,getComparedFunds} from '../route-state.js?v=2026-11-14p1';

const primaryCategories=['large_cap','large_mid_cap','mid_cap','small_cap','index','flexi_cap','value','tax_saver','sectoral','multi_asset'];
const moreCategories=['hybrid','debt','liquid_overnight','gold_silver','international'];
const slug=value=>String(value||'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const schemeHouse=name=>strings.mfFundHouses.find(house=>String(name||'').toLowerCase().startsWith(house.toLowerCase()))||'';

export function mount(host){
  const term=input('fund-search',{placeholder:strings.mfSearchPlaceholder,mode:'search'});term.type='search';term.autocomplete='off';
  const mainCategories=categoryCard(strings.mfCategoriesTitle,strings.mfCategoriesSubtitle,primaryCategories),extraCategories=categoryCard(strings.mfMoreCategoriesTitle,'',moreCategories);
  const housesCard=element('section','fund-browser-card'),housesTitle=element('h2','',strings.mfFundHousesTitle),houseGrid=element('div','fund-house-grid');housesCard.append(housesTitle,houseGrid);
  const allHousesButton=button(strings.mfAllFundHouses,{className:'button secondary all-houses-button'});housesCard.append(allHousesButton);
  const filterRow=element('div','fund-filter-row'),filterButton=button('',{className:'button secondary compact filter-chip'});filterButton.type='button';filterRow.append(filterButton);
  const filterDialog=document.createElement('dialog');filterDialog.className='choice-sheet';
  const filterTitle=element('h2','',strings.mfFiltersTitle),planSelect=makeSelect('mf-plan',strings.mfPlanLabel,[["direct",strings.mfDirect],["regular",strings.mfRegular]],'direct'),optionSelect=makeSelect('mf-option',strings.mfOptionLabel,[["growth",strings.mfGrowth],["idcw",strings.mfIdcw],["bonus",strings.mfBonus]],'growth'),filterActions=element('div','sheet-actions'),cancelFilters=button(strings.mfCancel,{className:'button secondary'}),applyFilters=button(strings.mfApplyFilters,{className:'button primary'});
  filterActions.append(cancelFilters,applyFilters);filterDialog.append(filterTitle,planSelect.wrapper,optionSelect.wrapper,filterActions);

  const houseDialog=document.createElement('dialog');houseDialog.className='choice-sheet';const houseTitle=element('h2','',strings.mfAllFundHouses),houseSearch=input('house-search',{placeholder:strings.mfHouseSearch,mode:'search'}),houseList=element('ul','sheet-list');houseDialog.append(houseTitle,houseSearch,houseList);
  const breadcrumbs=element('div','filter-breadcrumbs'),results=element('section','fund-results');
  const filters={amc:'',plan:'direct',option:'growth',category:'',q:''};let rows=[],total=0,offset=0,visible=25,controller=null,stale=false;

  for(const house of strings.mfFundHouses.slice(0,10)){const selectHouse=button('',{className:'fund-house-button'});selectHouse.dataset.house=house;selectHouse.setAttribute('aria-pressed','false');selectHouse.append(EntityMark(house,'fund','amc'),element('span','',house));selectHouse.addEventListener('click',()=>{filters.amc=filters.amc===house?'':house;updateActiveControls();void run()});houseGrid.append(selectHouse)}
  allHousesButton.addEventListener('click',()=>openDialog(houseDialog));
  filterButton.addEventListener('click',()=>{planSelect.control.value=filters.plan;optionSelect.control.value=filters.option;openDialog(filterDialog)});
  cancelFilters.addEventListener('click',()=>closeDialog(filterDialog));
  applyFilters.addEventListener('click',()=>{filters.plan=planSelect.control.value;filters.option=optionSelect.control.value;closeDialog(filterDialog);updateActiveControls();if(hasResultsFilter())void run();else showIdle()});
  houseSearch.addEventListener('input',renderHouseChoices,{passive:true});
  houseList.addEventListener('click',event=>{const choice=event.target.closest('[data-house-choice]');if(!choice)return;filters.amc=choice.dataset.houseChoice;closeDialog(houseDialog);updateActiveControls();void run()});
  const stopSearch=installDebouncedSearch(term,value=>{filters.q=value;updateActiveControls();if(hasResultsFilter())void run();else showIdle()});
  for(const card of [mainCategories,extraCategories])card.addEventListener('click',event=>{const control=event.target.closest('[data-category]');if(!control)return;const category=control.dataset.category;filters.category=filters.category===category?'':category;updateActiveControls();if(hasResultsFilter())void run();else showIdle()});
  breadcrumbs.addEventListener('click',event=>{const remove=event.target.closest('[data-remove-filter]');if(!remove)return;filters[remove.dataset.removeFilter]='';if(remove.dataset.removeFilter==='q')term.value='';updateActiveControls();if(hasResultsFilter())void run();else showIdle()});

  host.replaceChildren(term,mainCategories,extraCategories,housesCard,filterRow,breadcrumbs,element('p','subtle-note mf-category-note',strings.mfCategoryNote),results,filterDialog,houseDialog);
  updateActiveControls();showIdle();

  function categoryCard(title,subtitle,keys){const card=element('section','fund-browser-card category-card'),heading=element('h2','',title);card.append(heading);if(subtitle)card.append(element('p','subtle-note',subtitle));const choices=element('div','category-pill-wrap');for(const key of keys){const choice=button(strings.mfCategoryLabels[key],{className:'button secondary category-pill'});choice.dataset.category=key;choice.setAttribute('aria-pressed','false');choices.append(choice)}card.append(choices);return card}
  function makeSelect(name,label,options,value){const wrapper=element('label','field-label',label),control=document.createElement('select');control.name=name;control.className='control-select';for(const [key,text] of options){const option=document.createElement('option');option.value=key;option.textContent=text;control.append(option)}control.value=value;wrapper.append(control);return {wrapper,control}}
  function openDialog(dialog){if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','')}
  function closeDialog(dialog){if(typeof dialog.close==='function'&&dialog.open)dialog.close();else dialog.removeAttribute('open')}
  function hasResultsFilter(){return Boolean(filters.category||filters.amc||filters.q)}
  function updateActiveControls(){
    filterButton.textContent=strings.mfFilterSummary.replace('{plan}',filters.plan=== 'direct'?strings.mfDirect:strings.mfRegular).replace('{option}',{growth:strings.mfGrowth,idcw:strings.mfIdcw,bonus:strings.mfBonus}[filters.option]);
    for(const item of houseGrid.querySelectorAll('[data-house]'))item.setAttribute('aria-pressed',String(item.dataset.house===filters.amc));
    for(const item of [...mainCategories.querySelectorAll('[data-category]'),...extraCategories.querySelectorAll('[data-category]')])item.setAttribute('aria-pressed',String(item.dataset.category===filters.category));
    breadcrumbs.replaceChildren();for(const [key,value,label] of [['category',filters.category,strings.mfCategoryLabels[filters.category]],['amc',filters.amc,filters.amc],['q',filters.q,filters.q?`${strings.searchResults}: ${filters.q}`:'']])if(value){const chip=button(`${label} ×`,{className:'button secondary compact filter-chip'});chip.dataset.removeFilter=key;chip.setAttribute('aria-label',strings.mfRemoveFilter.replace('{filter}',label));breadcrumbs.append(chip)}
  }
  function renderHouseChoices(){const query=houseSearch.value.trim().toLowerCase(),fragment=document.createDocumentFragment();for(const house of ['',...strings.mfFundHouses]){const label=house||strings.mfAllFundHouses;if(query&&!label.toLowerCase().includes(query))continue;const item=element('li','sheet-row'),choice=button('',{className:'sheet-choice'});choice.dataset.houseChoice=house;choice.append(EntityMark(label,'fund',house?'amc':null),element('span','',label));item.append(choice);fragment.append(item)}houseList.replaceChildren(fragment)}
  function showIdle(){rows=[];total=0;offset=0;visible=25;results.replaceChildren(element('p','subtle-note',strings.mfSearchEmpty))}
  function drawResults(){
    const count=element('p','subtle-note list-count',`${total.toLocaleString('en-IN')} funds`),list=element('ul','data-list entity-list');list.setAttribute('aria-live','polite');
    for(const [index,item] of rows.slice(0,visible).entries()){const name=item.schemeName||strings.mfScheme,code=String(item.schemeCode||''),house=item.fundHouse||schemeHouse(name),row=element('li','entity-row');row.dataset.rowIndex=String(index);row.append(EntityMark(house||name,'fund','amc'));const copy=element('div','list-copy'),nameText=element('strong','fund-scheme-name',name);copy.append(nameText,element('small','',`${strings.mfFundHouse}: ${house||'—'}`),element('small','',`${strings.mfScheme}: ${code}`));const actions=element('div','list-actions');actions.append(button(strings.details,{className:'button secondary compact',action:'details'}),button(strings.mfAddCompare,{className:'button secondary compact',action:'compare'}));row.append(copy,actions);list.append(row)}
    list.addEventListener('click',event=>{const target=event.target.closest('[data-action]'),row=target?.closest('[data-row-index]');if(!target||!row)return;const item=rows[Number(row.dataset.rowIndex)],code=String(item?.schemeCode||''),name=item?.schemeName||strings.mfScheme;if(target.dataset.action==='details')location.hash=`#mf/${encodeURIComponent(code)}~${encodeURIComponent(name)}`;if(target.dataset.action==='compare'){toggleComparedFund({code,name});if(getComparedFunds().length>3)results.prepend(element('p','inline-status',strings.mfCompareLimit))}});
    results.replaceChildren(count);if(rows.length)results.append(list);else results.append(element('p','subtle-note',strings.mfNoFilteredResults));if(stale)results.prepend(element('p','subtle-note',`Showing the saved list · as of ${strings.dateUnavailable}`));
    if(visible<rows.length||offset<total){const more=button(strings.showMore,{className:'button secondary show-more'});more.addEventListener('click',()=>{if(visible<rows.length){visible=Math.min(rows.length,visible+25);drawResults()}else void loadPage(true)});results.append(more)}
  }
  async function run(signal=null){controller?.abort();controller=new AbortController();offset=0;visible=25;rows=[];total=0;results.replaceChildren(skeleton());return loadPage(false,signal)}
  async function loadPage(append=false,externalSignal=null){
    if(!hasResultsFilter()){showIdle();return}
    const localController=controller||new AbortController();controller=localController;externalSignal?.addEventListener('abort',()=>localController.abort(),{once:true});
    try{const page=await browseSchemes(filters,{signal:localController.signal,limit:25,offset});if(localController.signal.aborted)return;const next=Array.isArray(page.data)?page.data:[];rows=append?[...rows,...next]:next;offset+=next.length;total=Number(page.total)||0;stale=Boolean(page.stale);if(append)visible=Math.min(rows.length,visible+25);else visible=25;drawResults()}
    catch(error){if(localController.signal.aborted)return;results.replaceChildren(element('p','state-card error',strings.mfUnavailable),element('small','reason-code',error.code||'mf_browse_failed'),button(strings.retry,{className:'button secondary'}));results.lastElementChild.addEventListener('click',()=>void run())}
  }
  function skeleton(){const box=element('div','skeleton-state');box.setAttribute('aria-label',strings.loading);box.append(element('span','skeleton-line'),element('span','skeleton-line short'));return box}
  renderHouseChoices();
}
