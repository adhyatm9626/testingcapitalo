const memory=new Map();
export async function readSet(name,{signal,force=false}={}){
  if(!force&&memory.has(name))return memory.get(name);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);signal?.addEventListener('abort',()=>controller.abort(),{once:true});
  let response;try{response=await fetch(`/api/data/${encodeURIComponent(name)}`,{headers:{accept:'application/json'},signal:controller.signal})}catch(error){throw Object.assign(new Error(error?.name==='AbortError'?'timeout':'data_fetch_failed'),{code:error?.name==='AbortError'?'timeout':'data_fetch_failed'})}finally{clearTimeout(timer)}
  const envelope=await response.json().catch(()=>null);
  if(!response.ok||envelope?.ok!==true||!Object.hasOwn(envelope,'data'))throw Object.assign(new Error(envelope?.error||`http_${response.status}`),{code:envelope?.error||`http_${response.status}`});
  memory.set(name,envelope);return envelope;
}
export async function readSets(names,{signal,force=false}={}){
  const missing=force?names:names.filter(name=>!memory.has(name));
  if(missing.length){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);signal?.addEventListener('abort',()=>controller.abort(),{once:true});let response;try{response=await fetch(`/api/data/bundle?sets=${missing.map(encodeURIComponent).join(',')}`,{headers:{accept:'application/json'},signal:controller.signal})}catch(error){throw Object.assign(new Error(error?.name==='AbortError'?'timeout':'data_fetch_failed'),{code:error?.name==='AbortError'?'timeout':'data_fetch_failed'})}finally{clearTimeout(timer)}
    const envelope=await response.json().catch(()=>null);
    if(!response.ok||envelope?.ok!==true||!envelope.datasets)throw Object.assign(new Error(envelope?.error||`http_${response.status}`),{code:envelope?.error||`http_${response.status}`});
    for(const [name,value] of Object.entries(envelope.datasets))memory.set(name,{ok:true,...value,source:envelope.source,sourceUrl:envelope.sourceUrl,fetchedAt:envelope.fetchedAt,stale:envelope.stale});
  }
  return Object.fromEntries(names.map(name=>[name,memory.get(name)]));
}
export function invalidateSet(name){memory.delete(name)}
export function lastUpdated(envelope){return envelope?.updatedAt||envelope?.data?.as_of||envelope?.data?.meta?.as_of||null}
