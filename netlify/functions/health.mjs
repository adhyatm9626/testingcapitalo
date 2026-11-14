import {getStore} from '@netlify/blobs';
import {getEnv,json,logSafeError,generateGemini} from './_shared.mjs';
import {ADMIN_DOCUMENTS} from './admin-core.mjs';
import {getStore as getBlobsStore} from '@netlify/blobs';
import fdBanks from '../../data/fd-banks.json' with {type:'json'};
import foreignBanks from '../../data/foreign-banks.json' with {type:'json'};
import corporateFds from '../../data/corporate-fds.json' with {type:'json'};
import postOffice from '../../data/post-office.json' with {type:'json'};
import bullion from '../../data/bullion.json' with {type:'json'};
import etfs from '../../data/etf-catalogue.json' with {type:'json'};
import bonds from '../../data/bonds-catalogue.json' with {type:'json'};
import stocks from '../../data/stocks-list.json' with {type:'json'};
import mfCurated from '../../data/mf-curated.json' with {type:'json'};
import taxRules from '../../data/tax-rules.json' with {type:'json'};
import siteSettings from '../../data/site-settings.json' with {type:'json'};
const bundled={'fd-banks':fdBanks,'foreign-banks':foreignBanks,'corporate-fds':corporateFds,'post-office':postOffice,bullion,'etf-catalogue':etfs,'bonds-catalogue':bonds,'stocks-list':stocks,'mf-curated':mfCurated,'tax-rules':taxRules,'site-settings':siteSettings};
const countRows=data=>Array.isArray(data)?data.length:Array.isArray(data?.items)?data.items.length:['gold','silver'].some(key=>Array.isArray(data?.[key]))?['gold','silver'].reduce((n,key)=>n+(data[key]?.length||0),0):data&&typeof data==='object'?Object.keys(data).length:0;
async function dataCounts(){const store=getBlobsStore('capitalo-data'),counts={};let settings=siteSettings;for(const name of ADMIN_DOCUMENTS){let data=bundled[name]??{};try{const published=await store.get(`published:${name}`,{type:'json'});if(published?.data!==undefined)data=published.data}catch{}if(name==='site-settings')settings=data;counts[name]=countRows(data)}if(settings?.stocks_list_published===false)counts['stocks-list']=0;return counts}

const defaultModel='gemini-3.5-flash-lite',defaultFallback='gemini-3.5-flash';
const modelName=()=>getEnv('GEMINI_MODEL')||defaultModel;
const fallbackName=()=>getEnv('GEMINI_FALLBACK_MODEL')||defaultFallback;
const redact=(value,secret)=>{const text=String(value??'');return secret?text.split(secret).join('[redacted]'):text};
const safeGoogleReason=(data,status,parseError,apiKey)=>{const error=data?.error||{},details=error.details===undefined?'':JSON.stringify(error.details),message=error.message||parseError?.message||'Google returned an unreadable error response';return redact([error.status||status,message,details].filter(Boolean).join(': '),apiKey).replace(/[\r\n\t]+/g,' ').slice(0,300)};

async function reservePingSlot(){
  const store=getStore('capitalo-ai-limits'),key='health:gemini-ping:global';
  for(let attempt=0;attempt<5;attempt++){
    const old=await store.getWithMetadata(key),now=Date.now(),lastAt=old?.data?Number(JSON.parse(old.data).lastAt)||0:0;
    if(now-lastAt<60000)return false;
    const expiresAt=now+120000,write=await store.set(key,JSON.stringify({lastAt:now,expiresAt}),old?.etag?{onlyIfMatch:old.etag,metadata:{expiresAt}}:{onlyIfNew:true,metadata:{expiresAt}});
    if(write?.modified!==false)return true;
  }
  return false;
}

async function pingModel(model,apiKey){
  try{
    const result=await generateGemini({model,apiKey,systemInstruction:'Reply with OK only.',text:'Say OK',maxOutputTokens:5,timeoutMs:8000});
    if(!result.response.ok){const reason=safeGoogleReason(result.data,result.response.status,result.parseError,apiKey);logSafeError('health Gemini response',new Error('HTTP '+result.response.status+': '+reason),apiKey);return {ok:false,status:result.response.status,reason,model}}
    const reply=result.data?.candidates?.[0]?.content?.parts?.map(part=>part?.text||'').join('').trim()||'';
    if(!reply){const reason='Google returned no text in its successful response';logSafeError('health Gemini response',new Error(reason),apiKey);return {ok:false,status:502,reason,model}}
    return {ok:true,status:result.response.status,model};
  }catch(error){const timeout=error?.name==='AbortError',stage=error?.stage||'headers',status=timeout?504:502;logSafeError('health Gemini ping',new Error((timeout?'Timeout':'Request failed')+' at '+stage+': '+(error?.message||'unknown error')),apiKey);return {ok:false,status,stage,model}}
}

async function pingGemini(){
  const apiKey=getEnv('GEMINI_API_KEY'),model=modelName();
  if(!apiKey)return json(503,{ok:false,status:503,ms:0,model});
  try{if(!await reservePingSlot())return json(429,{ok:false,status:429,ms:0,model})}
  catch(error){logSafeError('health ping rate limit',error,apiKey);return json(503,{ok:false,status:503,ms:0,model})}
  const started=Date.now();let result=await pingModel(model,apiKey);
  if(result.status===404||result.status===429||(result.status>=500&&result.status<=599)){await new Promise(resolve=>setTimeout(resolve,1000));const fallback=fallbackName();if(/^[a-zA-Z0-9._-]{1,80}$/.test(fallback))result=await pingModel(fallback,apiKey);else logSafeError('health Gemini fallback configuration',new Error('GEMINI_FALLBACK_MODEL is invalid'),apiKey)}
  return json(result.ok?200:result.status,{ok:result.ok,status:result.status,ms:Date.now()-started,model:result.model,...(result.reason?{reason:result.reason}:{}),...(result.stage?{stage:result.stage}:{})});
}

export default async req=>{
  if(req.method!=='GET')return json(405,{error:'Method not allowed'});
  const url=new URL(req.url);
  if(url.searchParams.get('ping')==='1')return pingGemini();
  let storageAvailable=false;
  try{await getBlobsStore('capitalo-data').get('__capitalo_health_probe__');storageAvailable=true}
  catch(error){logSafeError('health storage probe',error)}
  const counts=await dataCounts().catch(error=>{logSafeError('health data counts',error);return Object.fromEntries([...ADMIN_DOCUMENTS].map(name=>[name,countRows(bundled[name]??{})]))});
  return json(200,{hasKey:Boolean(getEnv('GEMINI_API_KEY')),model:modelName(),storageAvailable,mfapiEnabled:getEnv('MFAPI_DISABLED').toLowerCase()!=='true',counts});
};
