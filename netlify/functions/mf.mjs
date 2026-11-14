import {getStore} from '@netlify/blobs';
import {createHash} from 'node:crypto';
import {json,permitRequest,getEnv} from './_shared.mjs';
import {readThroughCache} from './mf-cache.mjs';
import {paginateSearchResults,filterBrowseRows,paginateBrowseRows} from './mf-query.mjs';

const base='https://api.mfapi.in/mf',cacheKey=value=>'mf-cache:'+createHash('sha256').update(value).digest('hex');
const upstream=async url=>{let lastError;for(let attempt=0;attempt<2;attempt++){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const response=await fetch(url,{headers:{accept:'application/json','user-agent':'Capitalo mutual fund NAV proxy'},signal:controller.signal,redirect:'error'});if(!response.ok){const error=new Error(`upstream_error_${response.status}`);if(attempt===0&&(response.status===429||response.status>=500)){lastError=error;await new Promise(resolve=>setTimeout(resolve,250));continue}throw error}return await response.json()}catch(error){lastError=error;if(attempt===0&&(error?.name==='AbortError'||error?.message==='fetch failed')){await new Promise(resolve=>setTimeout(resolve,250));continue}throw error}finally{clearTimeout(timer)}}throw lastError||new Error('upstream_error_502')};
const errorCode=error=>error?.name==='AbortError'?'timeout':/^upstream_error_\d{3}$/.test(error?.message||'')?error.message:'upstream_error_502';

export default async request=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'content-type'}});
 if(request.method!=='GET')return json(405,{ok:false,error:'method_not_allowed'});
 if(getEnv('MFAPI_DISABLED').toLowerCase()==='true')return json(503,{ok:false,data:null,fetchedAt:null,stale:false,error:'blocked_by_config'});
 if(!await permitRequest(request,'mf',60))return json(429,{ok:false,data:null,fetchedAt:null,stale:false,error:'upstream_error_429'});
 const url=new URL(request.url),segments=url.pathname.split('/').filter(Boolean),mfIndex=segments.indexOf('mf'),parts=mfIndex>=0?segments.slice(mfIndex+1):segments;
 if(parts[0]==='browse'){
  const key=cacheKey('schemes:all:v1'),saved=await readThroughCache({store:getStore('capitalo-data'),key,ttl:86400000,load:async()=>{const payload=await upstream(`${base}?limit=100000&offset=0`),rows=Array.isArray(payload)?payload:(Array.isArray(payload?.data)?payload.data:[]);return rows.map(row=>({schemeCode:Number(row.schemeCode||row.scheme_code),schemeName:String(row.schemeName||row.scheme_name||'').trim()})).filter(row=>Number.isSafeInteger(row.schemeCode)&&row.schemeName)}}),all=Array.isArray(saved.data)?saved.data:[],filtered=filterBrowseRows(all,{amc:url.searchParams.get('amc')||'',plan:url.searchParams.get('plan')||'',option:url.searchParams.get('option')||'',category:url.searchParams.get('category')||'',q:url.searchParams.get('q')||''}),page=paginateBrowseRows(filtered,{offset:url.searchParams.get('offset'),limit:url.searchParams.get('limit')});return json(200,{ok:true,...page,source:'MFapi.in',sourceUrl:'https://www.mfapi.in/docs/',fetchedAt:saved.fetchedAt,stale:saved.stale});
 }
 let kind,key,ttl,load;
 if(parts.at(-1)==='search'||url.searchParams.has('search')||url.searchParams.has('q')){
  const term=String(url.searchParams.get('search')||url.searchParams.get('q')||'').trim().slice(0,100);if(term.length<2)return json(400,{ok:false,data:null,fetchedAt:null,stale:false,error:'upstream_error_400'});
  kind='search';key=term.toLowerCase();ttl=300000;load=()=>upstream(`${base}/search?q=${encodeURIComponent(term)}`);
 }else{
  const latest=parts.at(-1)==='latest',raw=latest?parts.at(-2):parts.at(-1),code=String(url.searchParams.get('code')||raw||'').replace(/\D/g,'');if(!/^\d{4,8}$/.test(code))return json(400,{ok:false,data:null,fetchedAt:null,stale:false,error:'upstream_error_400'});
  kind=latest?'latest':'history';key=code;ttl=latest?900000:3600000;load=()=>upstream(`${base}/${code}${latest?'/latest':''}`);
 }
 try{
  const saved=await readThroughCache({store:getStore('capitalo-data'),key:cacheKey(`v2:${kind}:${key}`),ttl,load});
  let data=saved.data,total;
  if(kind==='search'){
   const page=paginateSearchResults(data,{limit:url.searchParams.get('limit')||15,offset:url.searchParams.get('offset')||0});
   data=page.data;total=page.total;
   const payload={ok:true,kind,data,total,limit:page.limit,offset:page.offset,source:'MFapi.in',fetchedAt:saved.fetchedAt,stale:saved.stale};
   return json(200,payload,{'cache-control':'public, max-age=300, stale-while-revalidate=300'});
  }
  const payload={ok:true,kind,data,source:'MFapi.in',fetchedAt:saved.fetchedAt,stale:saved.stale};
  const maxAge=kind==='latest'?900:kind==='history'?3600:300;
  return json(200,payload,{'cache-control':`public, max-age=${maxAge}, stale-while-revalidate=${maxAge}`});
 }catch(error){const code=errorCode(error);console.error(`[capitalo-mf] ${code}`);return json(503,{ok:false,kind,data:null,source:'MFapi.in',fetchedAt:null,stale:false,error:code})}
};
