import {roundMoney} from './calc.js?v=2026-11-14p1';

export const ISLAND_KEY='capitalo.island',MAX_ISLAND_ITEMS=12;
const number=value=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0};
const safeItem=item=>({id:String(item?.id||''),type:String(item?.type||'investment'),name:String(item?.name||'Investment'),markName:item?.markName?String(item.markName):null,markType:item?.markType?String(item.markType):null,mode:item?.mode==='sip'?'sip':'onetime',amount:roundMoney(number(item?.amount)),years:Math.min(40,Math.max(1,number(item?.years))),rate:roundMoney(number(item?.rate)),rateSource:String(item?.rateSource||'Your own assumption'),invested:roundMoney(number(item?.invested)),finalValue:roundMoney(number(item?.finalValue)),low:roundMoney(number(item?.low)),high:roundMoney(number(item?.high))});
const readItems=storage=>{try{const parsed=JSON.parse(storage?.getItem(ISLAND_KEY)||'[]');return Array.isArray(parsed)?parsed.filter(item=>item?.id).slice(0,MAX_ISLAND_ITEMS).map(safeItem):[]}catch{return []}};
const persist=(storage,items)=>{try{storage?.setItem(ISLAND_KEY,JSON.stringify(items))}catch{}};

export function createIslandStore(storage=null){
 try{storage?.removeItem('capitalo.plan')}catch{}
 let items=readItems(storage);const listeners=new Set();
 const emit=()=>{persist(storage,items);for(const listener of listeners)listener(items.map(item=>({...item})))};
 return {
  get:()=>items.map(item=>({...item})),
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener)},
  add(value){const item=safeItem(value);if(!item.id||item.amount<1||item.years<1||item.rate<0||item.rate>50||item.invested<0||item.finalValue<0)return {ok:false,reason:'invalid_inputs'};const index=items.findIndex(current=>current.id===item.id);if(index>=0){items[index]=item;emit();return {ok:true,updated:true,item:{...item}}}if(items.length>=MAX_ISLAND_ITEMS)return {ok:false,reason:'item_limit'};items.push(item);emit();return {ok:true,updated:false,item:{...item}}},
  remove(id){const index=items.findIndex(item=>item.id===String(id));if(index<0)return null;const [item]=items.splice(index,1);emit();return {item:{...item},index}},
  undo(removed){if(!removed?.item||items.some(item=>item.id===removed.item.id)||items.length>=MAX_ISLAND_ITEMS)return false;items.splice(Math.min(items.length,Math.max(0,removed.index)),0,safeItem(removed.item));emit();return true},
  clear(){items=[];emit()},
  totals(){const invested=roundMoney(items.reduce((sum,item)=>sum+item.invested,0)),finalValue=roundMoney(items.reduce((sum,item)=>sum+item.finalValue,0)),low=roundMoney(items.reduce((sum,item)=>sum+item.low,0)),high=roundMoney(items.reduce((sum,item)=>sum+item.high,0));const totalForShare=finalValue||invested;const groups=new Map();for(const item of items){const key=item.type;groups.set(key,(groups.get(key)||0)+(totalForShare===finalValue?item.finalValue:item.invested))}const entries=[...groups].map(([type,value])=>({type,value:roundMoney(value),share:totalForShare?roundMoney(value/totalForShare*100):0}));if(entries.length){const sum=entries.slice(0,-1).reduce((a,row)=>a+row.share,0);entries.at(-1).share=roundMoney(100-sum)}return {invested,finalValue,gain:roundMoney(finalValue-invested),low,high,count:items.length,differentHorizons:new Set(items.map(item=>item.years)).size>1,allocation:entries}}
 };
}

let store=null;try{store=createIslandStore(globalThis.localStorage)}catch{store=createIslandStore()}
export const islandStore=store;



