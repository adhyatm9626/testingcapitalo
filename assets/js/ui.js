import {strings} from './strings.js?v=2026-11-14p1';
import {makeIcon} from './icons.js?v=2026-11-14p1';
import {getSharedState,setSharedAmount,setSharedMode} from './shared-state.js?v=2026-11-14p1';

export const element=(tag,className='',text='')=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==''&&text!==null)node.textContent=String(text);return node};
export const labeled=(labelText,control)=>{const label=element('label','field-label',labelText),wrapper=control?.parentElement?.classList.contains('numeric-control')?control.parentElement:control;label.append(wrapper);return label};
const nativeValue=typeof HTMLInputElement==='undefined'?null:Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value'),numericRaw=new WeakMap();
let numericId=0;
const indianDigits=value=>{const digits=String(value??'').replace(/\D/g,'');if(!digits)return '';return new Intl.NumberFormat('en-IN',{maximumFractionDigits:0}).format(Number(digits))};
function numericKind(name,max){if(name==='years')return 'integer';if(['rate','tax','inflation','annual-return'].includes(name))return 'decimal';if(max===100)return 'integer';return 'amount'}
export function normalizeNumericText(value,kind){const text=String(value??'');if(kind==='decimal'){const clean=text.replace(/[^\d.]/g,'');const dot=clean.indexOf('.');return dot<0?clean:clean.slice(0,dot+1)+clean.slice(dot+1).replace(/\./g,'')}return text.replace(/\D/g,'')}
export function clampNumericValue(value,{min=1,max=1_000_000_000,kind='amount'}={}){const number=Number(String(value??'').replace(/[₹,\s]/g,''));if(!Number.isFinite(number))return '';const bounded=Math.min(max,Math.max(min,number));return String(kind==='decimal'?Number(bounded.toFixed(2)):Math.round(bounded))}
export function stepNumericValue(value,direction,{min=1,max=1_000_000_000,kind='amount'}={}){const current=Number(String(value??'').replace(/[₹,\s]/g,'')),base=Number.isFinite(current)?current:min,next=Math.min(max,Math.max(min,base+direction));return kind==='decimal'?String(Number(next.toFixed(2))):String(Math.round(next))}
function setNumericRaw(field,value,display=true){const text=normalizeNumericText(value,field.dataset.numericKind||'integer');numericRaw.set(field,text);const shown=display&&field.dataset.numericKind==='amount'?indianDigits(text):text;nativeValue.set.call(field,shown)}
export function enhanceNumericField(field,{kind='amount',min=1,max=1_000_000_000,errorNode=null}={}){
  const wrap=field.closest('.numeric-control');if(!wrap)return field;field.dataset.numericKind=kind;field.dataset.min=String(min);field.dataset.max=String(max);field.type='text';field.inputMode=kind==='decimal'?'decimal':'numeric';field.autocomplete='off';field.enterKeyHint='done';field.id=field.id||`numeric-field-${++numericId}`;field.setAttribute('role','spinbutton');field.setAttribute('aria-valuemin',String(min));field.setAttribute('aria-valuemax',String(max));if(errorNode){const described=[field.getAttribute('aria-describedby'),errorNode.id].filter(Boolean).join(' ');field.setAttribute('aria-describedby',described)}Object.defineProperty(field,'value',{configurable:true,get(){return numericRaw.get(field)??nativeValue.get.call(field)},set(value){setNumericRaw(field,value)}});
  setNumericRaw(field,nativeValue.get.call(field)||'',true);
  const showError=message=>{if(errorNode){errorNode.textContent=message;errorNode.hidden=!message}field.setAttribute('aria-invalid',String(Boolean(message)))};
  field.addEventListener('input',()=>{const old=nativeValue.get.call(field),caret=field.selectionStart??old.length,digitsBefore=(old.slice(0,caret).match(/\d/g)||[]).length;let clean;
    clean=normalizeNumericText(old,kind);
    numericRaw.set(field,clean);const display=kind==='amount'?indianDigits(clean):clean;nativeValue.set.call(field,display);if(clean!==''&&Number.isFinite(Number(clean)))field.setAttribute('aria-valuenow',String(Number(clean)));else field.removeAttribute('aria-valuenow');
    if(kind==='amount'){let pos=0,count=0;while(pos<display.length&&count<digitsBefore){if(/\d/.test(display[pos]))count++;pos++}try{field.setSelectionRange(pos,pos)}catch{}}
    showError('');
  },{passive:true});
  const validate=()=>{const raw=numericRaw.get(field)??'',number=Number(raw);if(raw===''){showError('');return}
    if(!Number.isFinite(number)){showError(strings.numericInvalidMessage);return}
    const lower=Number(field.dataset.min),upper=Number(field.dataset.max),fixed=clampNumericValue(raw,{min:lower,max:upper,kind}),changed=Number(fixed)!==number;
    setNumericRaw(field,fixed);field.setAttribute('aria-valuenow',fixed);showError(changed?strings.numericClampMessage:'');if(changed)field.dispatchEvent(new Event('input',{bubbles:true}));
  };
  field.addEventListener('blur',validate);
  const stepBy=direction=>{const next=stepNumericValue(numericRaw.get(field),direction,{min:Number(field.dataset.min),max:Number(field.dataset.max),kind});setNumericRaw(field,next);field.setAttribute('aria-valuenow',next);showError('');field.dispatchEvent(new Event('input',{bubbles:true}))};field.addEventListener('keydown',event=>{if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();stepBy(event.key==='ArrowUp'?1:-1)}});
  const minus=wrap.querySelector('[data-step="-1"]'),plus=wrap.querySelector('[data-step="1"]');
  for(const [control,direction,label] of [[minus,-1,strings.decreaseValue],[plus,1,strings.increaseValue]])if(control){control.setAttribute('aria-label',label);let holdTimer=0,repeatTimer=0;const stop=()=>{clearTimeout(holdTimer);clearInterval(repeatTimer);holdTimer=repeatTimer=0};control.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();stepBy(direction);holdTimer=window.setTimeout(()=>{repeatTimer=window.setInterval(()=>stepBy(direction),90)},480)});for(const type of ['pointerup','pointercancel','pointerleave','lostpointercapture','blur'])control.addEventListener(type,stop);control.addEventListener('click',event=>{if(event.detail===0)stepBy(direction)})}
  return field;
}
export const input=(name,{value='',type='text',mode='numeric',min,max,step,placeholder='',className='control-input'}={})=>{
  const field=document.createElement('input');field.className=className;field.name=name;
  if(type!=='number'){field.type=type;if(mode)field.inputMode=mode;if(value!==undefined)field.value=String(value);if(placeholder)field.placeholder=placeholder;field.enterKeyHint='done';return field}
  const kind=numericKind(name,max),defaultMin=kind==='decimal'?0:kind==='integer'?(name==='years'?1:0):1,defaultMax=kind==='decimal'?50:kind==='integer'?(name==='years'?40:100):1_000_000_000,lower=kind==='amount'?1:(min??defaultMin),upper=max??defaultMax,wrap=element('div','numeric-control');
  const decrease=element('button','stepper-button','−'),increase=element('button','stepper-button','+');decrease.type=increase.type='button';decrease.dataset.step='-1';increase.dataset.step='1';const error=element('small','field-error',strings.numericInvalidMessage);error.id=`numeric-error-${++numericId}`;error.hidden=true;field.setAttribute('aria-describedby',error.id);
  field.inputMode=mode||((kind==='decimal')?'decimal':'numeric');field.placeholder=placeholder;field.enterKeyHint='done';wrap.append(decrease,field,increase,error);enhanceNumericField(field,{kind,min:lower,max:upper,errorNode:error});if(value!==undefined)setNumericRaw(field,String(value));return field;
};
export const select=(name,options,{value,className='control-select',ariaLabel=''}={})=>{const field=document.createElement('select');field.className=className;field.name=name;if(ariaLabel)field.setAttribute('aria-label',ariaLabel);for(const option of options){const node=document.createElement('option');node.value=String(option.value);node.textContent=String(option.label);field.append(node)}if(value!==undefined)field.value=String(value);return field};
export const button=(labelText,{className='button',action='',type='button'}={})=>{const node=element('button',className,labelText);node.type=type;if(action)node.dataset.action=action;return node};
export const sourceLink=(url,labelText)=>{try{const value=new URL(url);if(!['http:','https:'].includes(value.protocol))return null;const link=element('a','source-link',labelText);link.href=value.href;link.target='_blank';link.rel='noopener noreferrer';return link}catch{return null}};
export function stateMessage(host,{kind='empty',message=strings.emptyState,code='',retry=null}={}){
  const box=element('section',`state-card ${kind}`);box.setAttribute('role',kind==='error'?'alert':'status');const text=element('p','state-copy',message);box.append(text);
  if(code){const reason=element('small','reason-code',code);box.append(reason)}
  if(retry){const retryButton=button(strings.retry,{className:'button secondary',action:'retry'});box.append(retryButton);box.addEventListener('click',event=>{if(event.target.closest('[data-action="retry"]'))retry()},{once:true})}
  host.replaceChildren(box);return box;
}
export function showSkeleton(host,label=strings.loading){const box=element('div','skeleton-state');box.setAttribute('aria-label',label);const line=element('span','skeleton-line');const line2=element('span','skeleton-line short');box.append(line,line2);host.replaceChildren(box)}
export function installDebouncedSearch(field,callback,delay=250){let timer=0,controller=null;const listener=()=>{clearTimeout(timer);controller?.abort();controller=new AbortController();const current=controller;timer=window.setTimeout(()=>{if(!current.signal.aborted)callback(field.value.trim(),current.signal)},delay)};field.addEventListener('input',listener,{passive:true});return ()=>{clearTimeout(timer);controller?.abort();field.removeEventListener('input',listener)}}
export function pagedList(host,rows,renderRow,{pageSize=25,onAction=null,emptyMessage=strings.emptyState,emptyCode='no_items',onRetry=()=>location.reload()}={}){
  host.replaceChildren();const count=element('p','subtle-note list-count',`${rows.length} items`),ul=element('ul','data-list');ul.setAttribute('aria-live','polite');const more=button(strings.showMore,{className:'button secondary show-more',action:'show-more'});let visible=0;
  const paint=()=>{const fragment=document.createDocumentFragment(),end=Math.min(rows.length,visible+pageSize);for(let index=visible;index<end;index++)fragment.append(renderRow(rows[index],index));ul.append(fragment);visible=end;more.hidden=visible>=rows.length};
  if(!ul.dataset.delegated){ul.dataset.delegated='true';ul.addEventListener('click',event=>{const target=event.target.closest('[data-action]');if(!target)return;const row=target.closest('[data-row-index]'),index=Number(row?.dataset.rowIndex);if(target.dataset.action==='show-more'){paint();return}if(Number.isInteger(index))onAction?.(target.dataset.action,rows[index],index,event)})}
  if(!rows.length){stateMessage(host,{kind:'empty',message:emptyMessage,code:emptyCode,retry:onRetry});host.prepend(count);return ul}
  paint();host.append(count,ul,more);more.addEventListener('click',()=>paint());return ul;
}
const omittedInitialWords=new Set(['of','the','and','&','ltd','limited','co','company']);
export function entityInitials(name){
  const words=String(name||'').match(/[A-Za-z0-9]+\.?|&/g)||[],kept=words.filter(word=>!omittedInitialWords.has(word.toLowerCase().replace(/\.$/,'')));
  if(!kept.length)return '';
  const first=kept[0].replace(/\.$/,''),acronym=/^[A-Z0-9]{2,5}$/.test(first);
  if(acronym)return first==='ICICI'?first:first.slice(0,4);
  if(/small\s+finance\s+bank/i.test(String(name||'')))return first.slice(0,2).toUpperCase();
  if(kept.length===1)return first.slice(0,2).toUpperCase();
  return kept.slice(0,3).map(word=>word.replace(/\.$/,'')[0]||'').join('').toUpperCase();
}
export function EntityMark(name,iconName='fund',entityType=null){
  const brand=['bank','foreign','corporate','amc','stock'].includes(entityType),identity=String(name||''),hash=[...identity].reduce((value,char)=>Math.imul(value^char.codePointAt(0),16777619),2166136261)>>>0,hue=255+(hash%51);
  const tile=element('span',`entity-mark mark-${iconName}${brand?' is-brand-mark':''}`);tile.setAttribute('aria-hidden','true');
  if(brand){const initials=entityInitials(identity);tile.style.setProperty('--mark-hue',String(hue));tile.append(element('span',`entity-mark-initials initials-length-${Math.min(initials.length,4)}`,initials));return tile}
  tile.append(makeIcon(iconName,'entity-mark-icon'));return tile;
}
export function dateLabel(value){if(!value)return strings.dateUnavailable;const date=new Date(`${String(value).slice(0,10)}T12:00:00+05:30`);if(!Number.isFinite(date.getTime()))return strings.dateUnavailable;return new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(date)}
export function setStatus(host,text,code=''){const status=element('p','inline-status',text);status.setAttribute('role','status');if(code)status.append(element('small','reason-code',code));host.replaceChildren(status);return status}
export function optionBadge(text){return element('span','small-badge',text)}
export function mountSharedAmountControl({onChange=null,includeAmount=true}={}){
  const root=element('section','shared-input-card');root.setAttribute('aria-label',strings.sharedAmount);const state=getSharedState();
  if(includeAmount){const amount=input('shared-amount',{value:state.amount||'',type:'number',mode:'numeric',min:1,max:1_000_000_000,placeholder:strings.amountPlaceholder});amount.autocomplete='off';const label=labeled(strings.sharedAmount,amount);root.append(label);amount.addEventListener('input',()=>{const value=amount.value;setSharedAmount(value);const next=getSharedState();root.dispatchEvent(new CustomEvent('shared-change',{detail:next}));onChange?.(next)})}
  const group=element('div','mode-control shared-mode-control');group.dataset.mode=state.mode;group.setAttribute('role','group');group.setAttribute('aria-label',strings.sharedMode);const options=[{key:'onetime',text:strings.onetimeMode},{key:'sip',text:strings.monthlyMode}];for(const option of options){const control=button(option.text,{className:'mode-button'});control.dataset.sharedMode=option.key;control.setAttribute('aria-pressed',String(state.mode===option.key));group.append(control)}const indicator=element('span','mode-indicator');indicator.setAttribute('aria-hidden','true');group.append(indicator);group.addEventListener('click',event=>{const target=event.target.closest('[data-shared-mode]');if(!target)return;setSharedMode(target.dataset.sharedMode);group.dataset.mode=target.dataset.sharedMode;for(const choice of group.querySelectorAll('[data-shared-mode]'))choice.setAttribute('aria-pressed',String(choice===target));const next=getSharedState();root.dispatchEvent(new CustomEvent('shared-change',{detail:next}));onChange?.(next)});root.append(group);return root;
}
export function refreshSharedAmountControl(root){const field=root?.querySelector('[name="shared-amount"]'),value=getSharedState().amount;if(field&&document.activeElement!==field)field.value=value?new Intl.NumberFormat('en-IN',{maximumFractionDigits:0}).format(value):''}



