import {getStore} from '@netlify/blobs';
import {createHash} from 'node:crypto';
import {json,getEnv} from './_shared.mjs';
import fdBanksFallback from '../../data/fd-banks.json' with {type:'json'};
import siteSettingsFallback from '../../data/site-settings.json' with {type:'json'};
import {ADMIN_DOCUMENTS,authorizeAdmin,constantTimeEqual,validAdminConfig,signSession,readCookie,updateLockout,validateAdminDocument,appendDocumentVersion,rollbackDocument,normalizeOrigin,matchEditor} from './admin-core.mjs';

const store=()=>getStore('capitalo-data');
const parse=async request=>{try{return await request.json()}catch{return null}};
const ipKey=request=>createHash('sha256').update(request.headers.get('x-nf-client-connection-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown').digest('hex');
const cookieHeader=token=>`capitalo_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=7200`;
const safeErrors=new Set(['admin_disabled','bad_credentials','locked','origin_mismatch','origin_missing','csrf_missing','csrf_mismatch','bad_signature','expired','no_session','storage_unavailable','server_error']);
const fail=(code,status=403)=>{const safe=safeErrors.has(code)?code:'server_error';console.error(`[capitalo-admin] ${safe}`);return json(status,{ok:false,error:safe})};
const audit=async(entry,s=store())=>{const key='audit:log',old=await s.get(key,{type:'json'})||[];old.unshift(entry);await s.setJSON(key,old.slice(0,500))};
const publicProject=value=>Array.isArray(value)?value.map(publicProject):(!value||typeof value!=='object'?value:Object.fromEntries(Object.entries(value).filter(([key])=>key!=='internal_source_url').filter(([key])=>!['isin','bse'].includes(key)||value.verified===true).map(([key,child])=>[key,publicProject(child)])));

export default async request=>{
 const url=new URL(request.url),parts=url.pathname.split('/').filter(Boolean),index=parts.indexOf('admin'),route=parts.slice(index+1),action=route[0]||'',name=route[1]||'';
 if(action==='status'&&(request.method==='GET'||request.method==='HEAD'))return json(200,{enabled:Boolean(getEnv('ADMIN_PASSWORD')&&validAdminConfig(getEnv('ADMIN_PASSWORD'),getEnv('ADMIN_SESSION_SECRET')))});
 const password=getEnv('ADMIN_PASSWORD'),secret=getEnv('ADMIN_SESSION_SECRET');
 if(!password||!validAdminConfig(password,secret))return fail('admin_disabled',503);
 try{
  const siteOrigin=getEnv('SITE_ORIGIN'),origin=request.headers.get('origin');
  if(action==='login'){
   if(request.method!=='POST')return json(405,{ok:false,error:'server_error'});
   const normalized=normalizeOrigin(origin),own=normalizeOrigin(`https://${request.headers.get('host')||''}`),site=normalizeOrigin(siteOrigin);
   if(!normalized)return fail('origin_missing');if(normalized!==site&&normalized!==own)return fail('origin_mismatch');
   const s=store(),key=`lockout:${ipKey(request)}`,state=await s.get(key,{type:'json'})||{count:0,until:0};if(state.until>Date.now())return fail('locked',429);
   const body=await parse(request),editors=getEnv('ADMIN_EDITORS').split(',').map(value=>value.trim()).filter(Boolean),editor=String(body?.editor||'').trim();
   const allowedEditor=matchEditor(editor,editors);
   const good=constantTimeEqual(String(body?.password??''),password)&&Boolean(allowedEditor);const next=updateLockout(state,Date.now(),good);await s.setJSON(key,next,{metadata:{expiresAt:next.until||Date.now()+900000}});
   if(!good)return fail(next.locked?'locked':'bad_credentials',next.locked?429:401);
   const signed=signSession({editor:allowedEditor.trim(),secret});return json(200,{ok:true,csrf:signed.csrf,editor:allowedEditor.trim()},{'set-cookie':cookieHeader(signed.token),'cache-control':'no-store'});
  }
  const auth=authorizeAdmin({method:request.method,origin,siteOrigin,host:request.headers.get('host'),secFetchSite:request.headers.get('sec-fetch-site'),referer:request.headers.get('referer'),cookie:readCookie(request.headers.get('cookie')),csrfHeader:request.headers.get('x-capitalo-csrf'),secret});
  if(!auth.ok)return fail(auth.reason,auth.reason.startsWith('origin')?403:401);
  const s=store();
  if(action==='logout'&&request.method==='POST')return json(200,{ok:true},{'set-cookie':'capitalo_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'});
  if(action==='me'&&(request.method==='GET'||request.method==='HEAD'))return json(200,{ok:true,editor:auth.session.editor,csrf:auth.session.csrf});
  if(action==='preview'&&request.method==='GET'&&ADMIN_DOCUMENTS.has(name)){const draft=await s.get(`draft:${name}`,{type:'json'}),published=await s.get(`published:${name}`,{type:'json'});return json(200,{ok:true,data:publicProject(draft?.data??published?.data??{})})}
  if(action==='doc'&&request.method==='GET'&&ADMIN_DOCUMENTS.has(name)){const draft=await s.get(`draft:${name}`,{type:'json'}),published=await s.get(`published:${name}`,{type:'json'}),history=await s.get(`history:${name}`,{type:'json'})||[],fallback=name==='fd-banks'?{version:0,updatedAt:fdBanksFallback.meta?.as_of,updatedBy:'Bundled fallback',data:fdBanksFallback}:name==='site-settings'?{version:0,updatedAt:siteSettingsFallback.updated_at,updatedBy:'Bundled fallback',data:siteSettingsFallback}:null;return json(200,{ok:true,draft,published:published||fallback,history:history.map(({data,version,updatedAt,updatedBy})=>({version,updatedAt,updatedBy}))})}
  if(action==='draft'&&request.method==='PUT'&&ADMIN_DOCUMENTS.has(name)){const body=await parse(request),valid=validateAdminDocument(name,body?.data);if(!valid.ok)return json(400,{ok:false,error:valid.error});const doc={version:Number(body?.version)||0,updatedAt:new Date().toISOString(),updatedBy:auth.session.editor,data:body.data};await s.setJSON(`draft:${name}`,doc);await audit({at:doc.updatedAt,by:doc.updatedBy,action:'draft',document:name},s);return json(200,{ok:true,draft:doc})}
  if(action==='publish'&&request.method==='POST'&&ADMIN_DOCUMENTS.has(name)){const draft=await s.get(`draft:${name}`,{type:'json'});if(!draft)return json(404,{ok:false,error:'server_error'});const valid=validateAdminDocument(name,draft.data);if(!valid.ok)return json(400,{ok:false,error:valid.error});const history=await s.get(`history:${name}`,{type:'json'})||[],doc={...draft,version:(history.at(-1)?.version||0)+1,updatedAt:new Date().toISOString(),updatedBy:auth.session.editor};await s.setJSON(`published:${name}`,doc);await s.setJSON(`history:${name}`,appendDocumentVersion(history,doc,20));await audit({at:doc.updatedAt,by:doc.updatedBy,action:'publish',document:name,version:doc.version},s);return json(200,{ok:true,published:doc})}
  if(action==='rollback'&&request.method==='POST'&&ADMIN_DOCUMENTS.has(name)){const body=await parse(request),history=await s.get(`history:${name}`,{type:'json'})||[],old=rollbackDocument(history,body?.version);if(!old)return json(404,{ok:false,error:'server_error'});const doc={...old,version:(history.at(-1)?.version||0)+1,updatedAt:new Date().toISOString(),updatedBy:auth.session.editor};await s.setJSON(`published:${name}`,doc);await s.setJSON(`history:${name}`,appendDocumentVersion(history,doc,20));await audit({at:doc.updatedAt,by:doc.updatedBy,action:'rollback',document:name,version:doc.version,restored:old.version},s);return json(200,{ok:true,published:doc})}
  if(action==='dashboard'&&request.method==='GET'){const counts={};for(const docName of ADMIN_DOCUMENTS){const value=await s.get(`published:${docName}`,{type:'json'});counts[docName]=Array.isArray(value?.data)?value.data.length:Array.isArray(value?.data?.items)?value.data.items.length:0}return json(200,{ok:true,counts,recentEdits:(await s.get('audit:log',{type:'json'})||[]).slice(0,20)})}
  if(action==='audit'&&request.method==='GET')return json(200,{ok:true,entries:await s.get('audit:log',{type:'json'})||[]});
  if(action==='backup'&&request.method==='GET'){const all={};for(const docName of ADMIN_DOCUMENTS)all[docName]={published:await s.get(`published:${docName}`,{type:'json'}),draft:await s.get(`draft:${docName}`,{type:'json'}),history:await s.get(`history:${docName}`,{type:'json'})||[]};return json(200,{ok:true,documents:all,audit:await s.get('audit:log',{type:'json'})||[]})}
  if(action==='backup'&&request.method==='PUT'){const body=await parse(request);if(!body?.documents||typeof body.documents!=='object')return json(400,{ok:false,error:'server_error'});for(const docName of Object.keys(body.documents)){if(!ADMIN_DOCUMENTS.has(docName))return json(400,{ok:false,error:'server_error'});for(const key of ['published','draft']){const doc=body.documents[docName]?.[key];if(doc&&!validateAdminDocument(docName,doc.data).ok)return json(400,{ok:false,error:'server_error'})}}for(const [docName,docs]of Object.entries(body.documents)){for(const key of ['published','draft','history'])if(docs[key])await s.setJSON(`${key==='published'?'published':key}:${docName}`,docs[key])}await audit({at:new Date().toISOString(),by:auth.session.editor,action:'backup_import'},s);return json(200,{ok:true})}
  return json(404,{ok:false,error:'server_error'});
 }catch(error){console.error('[capitalo-admin] storage_unavailable');return fail('storage_unavailable',503)}
};
