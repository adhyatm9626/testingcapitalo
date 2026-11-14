import {getStore} from '@netlify/blobs';
import {createHash} from 'node:crypto';

export const json=(status,body,extra={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...extra}});

export function getEnv(name){
  let value='';
  try{if(typeof Netlify!=='undefined')value=Netlify.env.get(name)||''}catch{}
  if(typeof value!=='string'||!value.trim()){
    try{value=typeof process!=='undefined'?process.env[name]||'':''}catch{value=''}
  }
  return typeof value==='string'?value.trim():String(value??'').trim();
}

export function logSafeError(scope,error,secret=''){
  let message=error instanceof Error?`${error.name}: ${error.message}`:String(error);
  if(secret)message=message.split(secret).join('[redacted]');
  console.error(`[${scope}] ${message}`);
}

export function buildGeminiBody({systemInstruction,text,maxOutputTokens}){
  return {
    systemInstruction:{parts:[{text:String(systemInstruction)}]},
    contents:[{role:'user',parts:[{text:String(text)}]}],
    generationConfig:{maxOutputTokens:Number(maxOutputTokens)}
  };
}

export async function generateGemini({model,apiKey,systemInstruction,text,maxOutputTokens=500,timeoutMs=20000}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);let stage='headers';
  const url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent';
  try{
    const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify(buildGeminiBody({systemInstruction,text,maxOutputTokens})),signal:controller.signal,redirect:'error'});
    stage='body';let data=null,parseError=null;
    try{data=await response.json()}catch(error){if(error?.name==='AbortError'){error.stage=stage;throw error}parseError=error}
    return {response,data,parseError};
  }catch(error){if(error?.name==='AbortError')error.stage=stage;throw error}
  finally{clearTimeout(timer)}
}

export const corsHeaders=req=>{const origin=req.headers.get('origin'),own=getEnv('SITE_ORIGIN');if(!own||!origin)return {};try{if(new URL(origin).origin!==new URL(own).origin)return {}}catch{return {}}return {'access-control-allow-origin':origin,'vary':'Origin'}};
export const safeFetch=async(url,ms=8000,init={})=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{return await fetch(url,{...init,signal:c.signal,redirect:'error',headers:{'user-agent':'Capitalo educational app contact via site',...(init.headers||{})}})}finally{clearTimeout(t)}};
export const methodOk=req=>req.method==='GET'||req.method==='OPTIONS';

const dayIST=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export async function permitRequest(req,route,limit=60){const ip=req.headers.get('x-nf-client-connection-ip')||req.headers.get('x-forwarded-for')?.split(',')[0];if(!ip)return false;const key=`api:${route}:${dayIST()}:${createHash('sha256').update(ip).digest('hex')}`,store=getStore('capitalo-ai-limits');for(let i=0;i<5;i++){const old=await store.getWithMetadata(key);if(old?.metadata?.expiresAt&&old.metadata.expiresAt<Date.now()){await store.delete(key);continue}const value=old?.data?JSON.parse(old.data):{count:0};if(value.count>=limit)return false;const expiresAt=Date.now()+172800000;const r=await store.set(key,JSON.stringify({count:value.count+1,expiresAt}),old?.etag?{onlyIfMatch:old.etag,metadata:{expiresAt}}:{onlyIfNew:true,metadata:{expiresAt}});if(r.modified)return true}return false}
