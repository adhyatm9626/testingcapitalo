import {getStore} from '@netlify/blobs';
import {json,logSafeError} from './_shared.mjs';
import {readPublicDocument} from './public-data.mjs';
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
import siteNotice from '../../data/site-notice.json' with {type:'json'};
import icons from '../../data/icons.json' with {type:'json'};
import siteSettings from '../../data/site-settings.json' with {type:'json'};

const builtins={'fd-banks':fdBanks,'foreign-banks':foreignBanks,'corporate-fds':corporateFds,'post-office':postOffice,bullion,'etf-catalogue':etfs,'bonds-catalogue':bonds,'stocks-list':stocks,'mf-curated':mfCurated,'tax-rules':taxRules,'site-notice':siteNotice,icons,'site-settings':siteSettings};
const known=new Set(Object.keys(builtins)),memory=new Map();
async function readSet(name){try{return await readPublicDocument({store:getStore('capitalo-data'),name,fallback:builtins[name],memory})}catch(error){logSafeError('public data store unavailable',error);return {...await readPublicDocument({store:{get:async()=>null},name,fallback:builtins[name],memory}),stale:true}}}


export default async req=>{
  if(req.method!=='GET')return json(405,{ok:false,error:'method_not_allowed'});
  const url=new URL(req.url),path=url.pathname.split('/').filter(Boolean),isBundle=path.includes('bundle');
  if(path.includes('meta')){const sets=String(url.searchParams.get('sets')||'').split(',').filter(Boolean);if(!sets.length||sets.some(set=>!known.has(set)))return json(400,{ok:false,error:'unknown_data_set'});const datasets={};for(const name of sets){const doc=await readSet(name),data=doc.data||{},asOf=data.as_of||data.meta?.as_of||null;datasets[name]={as_of:asOf,source:doc.updatedBy||'Capitalo team (manual updates)'}}return json(200,{ok:true,datasets},{'cache-control':'public, max-age=300, stale-while-revalidate=900'})}
  if(isBundle){const sets=String(url.searchParams.get('sets')||'').split(',').filter(Boolean);if(!sets.length||sets.some(set=>!known.has(set)))return json(400,{ok:false,error:'unknown_data_set'});const datasets={};for(const set of sets){let doc=await readSet(set);if(set==='stocks-list'){const settings=await readSet('site-settings'),disabled=settings.data?.stocks_list_published===false;if(disabled)doc={...doc,data:{items:[]}};doc={...doc,disabled}}datasets[set]={...doc,source:doc.updatedBy||'Capitalo team (manual updates)',sourceUrl:doc.data?.source_url||doc.data?.meta?.source_url||null,fetchedAt:doc.fetchedAt||doc.updatedAt,stale:Boolean(doc.stale)}}return json(200,{ok:true,datasets,source:'Capitalo team (manual updates)',sourceUrl:null,fetchedAt:new Date().toISOString(),stale:false},{'cache-control':'public, max-age=60, stale-while-revalidate=300'})}
  const apiAt=path.indexOf('data'),name=String(path[apiAt+1]||'').replace(/\.(?:json|csv)$/,'');if(!known.has(name))return json(404,{ok:false,error:'unknown_data_set'});
  if(name==='stocks-list'){const settings=await readSet('site-settings'),enabled=settings.data?.stocks_list_published!==false;if(!enabled)return json(200,{ok:true,data:{items:[]},source:'Capitalo team (manual updates)',sourceUrl:null,fetchedAt:new Date().toISOString(),stale:false,disabled:true},{'cache-control':'public, max-age=60, stale-while-revalidate=300'})}
  const document=await readSet(name);return json(200,{ok:true,...document,source:document.updatedBy,sourceUrl:document.data?.source_url||document.data?.meta?.source_url||null,fetchedAt:document.fetchedAt||document.updatedAt,stale:Boolean(document.stale)},{'cache-control':'public, max-age=60, stale-while-revalidate=300'});
};
