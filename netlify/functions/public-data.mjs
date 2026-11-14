export function publicProjection(value){
  if(Array.isArray(value))return value.map(publicProjection);
  if(!value||typeof value!=='object')return value;
  const out={};for(const [key,child] of Object.entries(value)){
    if(key==='internal_source_url')continue;
    if((key==='isin'||key==='bse')&&value.verified!==true)continue;
    out[key]=publicProjection(child);
  }return out;
}

export async function readPublicDocument({store,name,fallback,memory}){
 let wrapper=null,storageFailed=false;try{wrapper=await store.get(`published:${name}`,{type:'json'})}catch{storageFailed=true}
 wrapper=wrapper||memory?.get?.(`published:${name}`)||null;
 const data=wrapper?.data??fallback;
 const updatedAt=wrapper?.updatedAt||data?.as_of||data?.meta?.as_of||data?.items?.[0]?.as_of||(Array.isArray(data)?data[0]?.as_of:null)||null;
 return {version:wrapper?.version||0,updatedAt,updatedBy:wrapper?.updatedBy||'Capitalo team (manual updates)',data:publicProjection(data),fetchedAt:wrapper?.updatedAt||updatedAt,stale:storageFailed};
}
