import {strings} from './strings.js?v=2026-11-14p1';
import {resolveRoute,renderRoute} from './router.js?v=2026-11-14p1';
import {makeIcon,mountIcons} from './icons.js?v=2026-11-14p1';
import {getSharedState,setSharedAmount,setSharedMode} from './shared-state.js?v=2026-11-14p1';
import {enhanceNumericField} from './ui.js?v=2026-11-14p1';
import {mountIsland} from './island.js?v=2026-11-14p1';

const $=selector=>document.querySelector(selector);
const themeSelect=$('#theme'),themeButton=$('#themeCycle'),themeIcon=$('#themeIcon');
const systemTheme=matchMedia('(prefers-color-scheme: light)');
const safeGet=key=>{try{return localStorage.getItem(key)}catch{return null}};
const safeSet=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
const copyIntoDocument=()=>{
  for(const node of document.querySelectorAll('[data-copy]'))node.textContent=strings[node.dataset.copy]??'';
  for(const node of document.querySelectorAll('[data-alt]'))node.alt=strings[node.dataset.alt]??'';
  for(const node of document.querySelectorAll('[data-aria]'))node.setAttribute('aria-label',strings[node.dataset.aria]??'');
  for(const node of document.querySelectorAll('[data-placeholder]'))node.placeholder=strings[node.dataset.placeholder]??'';
  themeSelect.setAttribute('aria-label',strings.theme);
};
function effectiveTheme(preference){return preference==='system'?(systemTheme.matches?'light':'dark'):preference}
function applyTheme(preference,persist=true){
  const value=['system','dark','light'].includes(preference)?preference:'system',effective=effectiveTheme(value);
  document.documentElement.dataset.theme=effective;themeSelect.value=value;
  const selectedIcon=value==='system'?'system':value==='dark'?'dark':'light';themeIcon.replaceChildren(makeIcon(selectedIcon));
  themeButton.setAttribute('aria-label',`${strings.theme}: ${strings[value]}`);
  const metas=[...document.querySelectorAll('meta[name="theme-color"]')];
  for(const meta of metas){const selected=meta.media.includes(effective);meta.media=selected?'all':'not all';meta.content=effective==='light'?'#FEFEFE':'#07060B'}
  const logo=$('#heroLogo');if(logo)logo.src=`/assets/img/capitalo-${effective}.webp?v=2026-11-14p1`;
  if(persist)safeSet('capitalo-theme',value);
}
function formatAmount(raw){const digits=String(raw).replace(/[^\d]/g,'');if(!digits)return '';const value=Number(digits);return Number.isSafeInteger(value)?new Intl.NumberFormat('en-IN',{maximumFractionDigits:0}).format(value):digits}
function setupAmount(){
  const amount=$('#amount'),modeControl=$('.mode-control');
  enhanceNumericField(amount,{kind:'amount',min:1,max:1_000_000_000,errorNode:$('#amount-error')});
  const saved=getSharedState();if(saved.amount)amount.value=formatAmount(saved.amount);
  setMode(saved.mode,false);
  amount.addEventListener('input',()=>{setSharedAmount(amount.value.replace(/\D/g,''));document.dispatchEvent(new CustomEvent('capitalo:inputs',{detail:readInputs()}))},{passive:true});
  amount.addEventListener('blur',()=>{amount.value=formatAmount(amount.value)});
  modeControl.addEventListener('click',event=>{const button=event.target.closest('[data-mode]');if(!button)return;setMode(button.dataset.mode);document.dispatchEvent(new CustomEvent('capitalo:inputs',{detail:readInputs()}))});
}
function setMode(mode,dispatch=true){
  const selected=mode==='sip'?'sip':'onetime',control=$('.mode-control');setSharedMode(selected);control.dataset.mode=selected;
  for(const button of control.querySelectorAll('[data-mode]')){const active=button.dataset.mode===selected;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active))}
  if(dispatch)document.dispatchEvent(new CustomEvent('capitalo:inputs',{detail:readInputs()}));
}
export function readInputs(){return getSharedState()}
function updateNavigation(route){
  const tab=route.name==='home'?'home':route.name==='compare'?'compare':route.name==='ask'?'ask':'sip';
  for(const link of document.querySelectorAll('[data-tab]')){if(link.dataset.tab===tab)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')}
}
let lastPath='';
function navigate(){const route=resolveRoute(location.hash);if(route.path===lastPath&&route.name==='home')return;lastPath=route.path;renderRoute(route);updateNavigation(route);if(route.name!=='home')$('#screenTitle').focus({preventScroll:true})}
function showWelcome(){const dialog=$('#welcomeDialog');$('#understand').addEventListener('click',()=>{safeSet('capitalo-disclaimer-dismissed','1');dialog.close()});if(!safeGet('capitalo-disclaimer-dismissed')){try{dialog.showModal()}catch{dialog.setAttribute('open','')}}}
async function loadActiveSources(){
  const list=$('#providerSources');list.replaceChildren();
  const datasets=['fd-banks','post-office','bullion','bonds-catalogue','etf-catalogue','stocks-list'];
  try{const [providerResponse,healthResponse,metaResponse]=await Promise.all([fetch('/api/data/providers',{headers:{accept:'application/json'}}),fetch('/api/health',{headers:{accept:'application/json'}}),fetch(`/api/data/meta?sets=${datasets.join(',')}`,{headers:{accept:'application/json'}})]);const [providerEnvelope,health,metadata]=await Promise.all([providerResponse.ok?providerResponse.json():null,healthResponse.ok?healthResponse.json():null,metaResponse.ok?metaResponse.json():null]);for(const provider of providerEnvelope?.data?.providers||[]){if(!provider.enabled||(provider.id==='gemini'&&!health?.hasKey)||(provider.id==='mfapi'&&health?.mfapiEnabled===false))continue;const item=document.createElement('li'),link=provider.terms_url?document.createElement('a'):null;if(link){link.href=provider.terms_url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=provider.name;item.append(link)}else item.textContent=provider.name;if(['mfapi','gemini'].includes(provider.id))item.append(document.createTextNode(` · ${strings.providerConditional.replace('{provider}',provider.name)}`));if(provider.id==='nse-index-constituents')item.append(document.createTextNode(' · as of 2 Nov 2026'));if(provider.id==='manual'){const dates=datasets.map(name=>metadata?.datasets?.[name]?.as_of).filter(Boolean);if(dates.length)item.append(document.createTextNode(` · ${strings.manualSourceDate.replace('{date}',dates.join(', '))}`))}list.append(item)}if(!list.children.length){const item=document.createElement('li');item.textContent=strings.sourceInfoUnavailable;list.append(item)}}catch{const item=document.createElement('li');item.textContent=strings.sourceInfoUnavailable;list.append(item)}
}
copyIntoDocument();mountIcons();applyTheme(safeGet('capitalo-theme')||'system',false);setupAmount();const island=mountIsland($('#islandRoot'));$('#printPage').addEventListener('click',()=>island.print());
$('#yearNow').textContent=String(new Date().getFullYear());
$('#theme').addEventListener('change',()=>applyTheme(themeSelect.value));
$('#themeCycle').addEventListener('click',()=>{const next={system:'dark',dark:'light',light:'system'}[themeSelect.value]||'system';applyTheme(next)});
systemTheme.addEventListener('change',()=>{if(themeSelect.value==='system')applyTheme('system',false)});
$('#backButton').addEventListener('click',()=>{if(history.length>1)history.back();else location.hash='#home'});
window.addEventListener('hashchange',navigate,{passive:true});
document.addEventListener('click',event=>{const link=event.target.closest('[data-scroll-target]');if(!link)return;event.preventDefault();const target=document.getElementById(link.dataset.scrollTarget);if(!target)return;target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});document.getElementById('explore-title')?.focus({preventScroll:true})});
if(!location.hash)history.replaceState(null,'','#home');navigate();showWelcome();loadActiveSources();



