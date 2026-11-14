const MAX_AMOUNT=1_000_000_000;
const validAmount=value=>{const parsed=Number(String(value??'').replace(/[₹,\s]/g,''));return Number.isFinite(parsed)&&parsed>=1?Math.min(MAX_AMOUNT,Math.round(parsed)):0};
export function createSharedState(storage=null){
  const safeGet=key=>{try{return storage?.getItem(key)??null}catch{return null}};
  const safeSet=(key,value)=>{try{storage?.setItem(key,String(value))}catch{}}
  const state={amount:validAmount(safeGet('capitalo.amount')),mode:safeGet('capitalo.mode')==='sip'?'sip':'onetime'};
  const listeners=new Set();
  const emit=()=>{const value={...state};for(const listener of listeners)listener(value);if(typeof document!=='undefined')document.dispatchEvent(new CustomEvent('capitalo:shared-state',{detail:value}))};
  return {get:()=>({...state}),subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener)},setAmount(value){state.amount=validAmount(value);safeSet('capitalo.amount',state.amount);emit();return state.amount},setMode(value){state.mode=value==='sip'?'sip':'onetime';safeSet('capitalo.mode',state.mode);emit();return state.mode},set(value){if(value&&Object.hasOwn(value,'amount'))state.amount=validAmount(value.amount);if(value&&Object.hasOwn(value,'mode'))state.mode=value.mode==='sip'?'sip':'onetime';safeSet('capitalo.amount',state.amount);safeSet('capitalo.mode',state.mode);emit();return {...state}}};
}
let storage=null;try{storage=globalThis.localStorage}catch{}
export const sharedState=createSharedState(storage);
export const getSharedState=()=>sharedState.get();
export const setSharedAmount=value=>sharedState.setAmount(value);
export const setSharedMode=value=>sharedState.setMode(value);
export const setSharedState=value=>sharedState.set(value);
