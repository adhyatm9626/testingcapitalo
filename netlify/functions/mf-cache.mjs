const memory=globalThis.__capitaloMfCache||(globalThis.__capitaloMfCache=new Map());
export async function readThroughCache({store,key,ttl,load,now=Date.now()}){
 let old=memory.get(key)||null;try{old=await store.get(key,{type:'json'})||old}catch{}
 if(old?.savedAt&&now-old.savedAt<ttl)return {...old.payload,stale:false};
 try{const data=await load(),payload={ok:true,data,fetchedAt:new Date(now).toISOString(),stale:false},entry={savedAt:now,payload};memory.set(key,entry);try{await store.setJSON(key,entry)}catch{}return payload}
 catch(error){if(old?.payload){memory.set(key,old);return {...old.payload,stale:true}}throw error}
}
