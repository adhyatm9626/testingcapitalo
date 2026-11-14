import {createHmac,createHash,timingSafeEqual,randomBytes} from 'node:crypto';

export const ADMIN_SESSION_SECONDS=7200;
export const ADMIN_MAX_DOCUMENT_BYTES=512*1024;
export const ADMIN_DOCUMENTS=new Set(['fd-banks','foreign-banks','corporate-fds','post-office','bullion','etf-catalogue','bonds-catalogue','stocks-list','mf-curated','tax-rules','site-notice','icons','site-settings']);

export function constantTimeEqual(left,right){
  const a=createHash('sha256').update(String(left??'')).digest(),b=createHash('sha256').update(String(right??'')).digest();
  return timingSafeEqual(a,b)&&String(left??'').length===String(right??'').length;
}

export function validAdminConfig(password,sessionSecret){return typeof password==='string'&&password.length>0&&typeof sessionSecret==='string'&&Buffer.byteLength(sessionSecret,'utf8')>=32}

export function signSession({editor,csrf= randomBytes(32).toString('base64url'),now=Date.now(),secret}){
  secret=String(secret??'').trim();
  const payload=Buffer.from(JSON.stringify({editor:String(editor||'').slice(0,80),csrf,exp:Math.floor(now/1000)+ADMIN_SESSION_SECONDS,nonce:randomBytes(12).toString('base64url')})).toString('base64url');
  const signature=createHmac('sha256',secret).update(payload).digest('base64url');
  return {token:`${payload}.${signature}`,csrf};
}

export function verifySessionResult(token,secret,csrfHeader,now=Date.now(),requireCsrf=true){
  secret=String(secret??'').trim();
  if(!token)return {ok:false,reason:'no_session'};
  if(typeof token!=='string'||token.length>2048||!secret)return {ok:false,reason:'bad_signature'};
  const [payload,signature,...rest]=token.split('.');if(!payload||!signature||rest.length)return {ok:false,reason:'bad_signature'};
  const expected=createHmac('sha256',secret).update(payload).digest('base64url');if(!constantTimeEqual(signature,expected))return {ok:false,reason:'bad_signature'};
  try{const value=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));if(!value?.editor||!value?.csrf||!Number.isInteger(value.exp))return {ok:false,reason:'bad_signature'};if(value.exp<Math.floor(now/1000))return {ok:false,reason:'expired'};if(requireCsrf&&!csrfHeader)return {ok:false,reason:'csrf_missing'};if(requireCsrf&&!constantTimeEqual(value.csrf,csrfHeader))return {ok:false,reason:'csrf_mismatch'};return {ok:true,session:value}}catch{return {ok:false,reason:'bad_signature'}}
}

export function verifySession(token,secret,csrfHeader,now=Date.now()){
  const result=verifySessionResult(token,secret,csrfHeader,now);return result.ok?result.session:null;
}

export function readCookie(header,name='capitalo_admin'){
  const prefix=`${name}=`;for(const part of String(header||'').split(';')){const value=part.trim();if(value.startsWith(prefix))return decodeURIComponent(value.slice(prefix.length))}return '';
}

export function normalizeOrigin(value){try{return new URL(String(value||'')).origin.toLowerCase().replace(/\/$/,'')}catch{return ''}}

export function requestOrigin(host){const value=String(host||'').split(',')[0].trim();return value?normalizeOrigin(`https://${value}`):''}

export function matchEditor(candidate,editors){const normalized=String(candidate||'').trim().toLocaleLowerCase('en-US');return (Array.isArray(editors)?editors:[]).find(value=>String(value||'').trim().toLocaleLowerCase('en-US')===normalized)||''}

export function authorizeAdmin({method='GET',origin,siteOrigin,host,secFetchSite,referer,cookie,csrfHeader,secret,now}){
  const actual=normalizeOrigin(origin),configured=normalizeOrigin(siteOrigin),own=requestOrigin(host);
  const matches=value=>Boolean(value&&(value===configured||value===own));
  const safeRead=method==='GET'||method==='HEAD';
  if(actual){if(!matches(actual))return {ok:false,reason:'origin_mismatch'}}
  else if(safeRead){if(secFetchSite!=='same-origin'&&normalizeOrigin(referer)!==configured&&normalizeOrigin(referer)!==own)return {ok:false,reason:'origin_missing'}}
  else return {ok:false,reason:'origin_missing'};
  const checked=verifySessionResult(cookie,secret,csrfHeader,now,!safeRead);return checked.ok?{ok:true,session:checked.session}:checked;
}

export function updateLockout(state,now=Date.now(),success=false){
  if(success)return {count:0,windowStart:0,until:0,locked:false};
  if(state?.until>now)return {...state,locked:true};
  const withinWindow=Number.isFinite(state?.windowStart)&&now-state.windowStart<15*60*1000;
  const count=(withinWindow?Number(state.count)||0:0)+1,windowStart=withinWindow?state.windowStart:now;
  const until=count>=5?now+15*60*1000:0;return {count,windowStart,until,locked:until>now};
}

export function validateAdminDocument(name,data){
  if(!ADMIN_DOCUMENTS.has(name))return {ok:false,error:'unknown_document'};
  let encoded;try{encoded=JSON.stringify(data)}catch{return {ok:false,error:'invalid_json'}}
  if(typeof encoded!=='string'||Buffer.byteLength(encoded,'utf8')>ADMIN_MAX_DOCUMENT_BYTES)return {ok:false,error:'document_too_large'};
  let invalidRate=false,invalidPrice=false,invalidText=false,unverifiedSource=false;
  const walk=(value,key='',parent='')=>{
    if(typeof value==='string'&&value.length>5000)invalidText=true;
    if(typeof value==='number'&&(/^(?:rate|rate_pct|y1|y3|y5|valuePct|highest)$/i.test(key)||/^(?:senior_extra_pp|tax_saving_5y)$/i.test(parent))&&(value<1||value>15))invalidRate=true;
    if(typeof value==='number'&&/^return_[135]y$/i.test(key)&&(value<0||value>50))invalidRate=true;
    if(typeof value==='number'&&/^yield$/i.test(key)&&(value<0||value>100))invalidRate=true;
    if(typeof value==='number'&&/price/i.test(key)&&value<=0)invalidPrice=true;
    if(Array.isArray(value)){for(const child of value)walk(child,key,parent);return}
    if(value&&typeof value==='object'){
      if(value.verified===true&&(!/^https?:\/\//i.test(String(value.source_url||''))||!/^\d{4}-\d{2}-\d{2}$/.test(String(value.verified_on||''))))unverifiedSource=true;
      for(const [childKey,child] of Object.entries(value))walk(child,childKey,key);
    }
  };
  walk(data);
  if(invalidRate)return {ok:false,error:'rate_out_of_range'};
  if(invalidPrice)return {ok:false,error:'price_must_be_positive'};
  if(invalidText)return {ok:false,error:'text_too_long'};
  if(unverifiedSource)return {ok:false,error:'verified_records_need_source_and_date'};
  return {ok:true,bytes:Buffer.byteLength(encoded,'utf8')};
}

export function appendDocumentVersion(history,document,max=20){
  const versions=Array.isArray(history)?history.slice():[];versions.push(document);return versions.slice(-max);
}

export function rollbackDocument(history,version){
  const found=(Array.isArray(history)?history:[]).find(item=>item?.version===Number(version));return found?JSON.parse(JSON.stringify(found)):null;
}

