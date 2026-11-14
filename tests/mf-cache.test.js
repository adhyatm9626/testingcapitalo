import test from 'node:test';import assert from 'node:assert/strict';import {readThroughCache} from '../netlify/functions/mf-cache.mjs';
test('MFapi cache returns fresh data and stale saved values after upstream failure',async()=>{
 let value=null;const store={async get(){return value},async setJSON(k,v){value=v}};const fresh=await readThroughCache({store,key:'x',ttl:60000,now:1000,load:async()=>({value:42})});assert.equal(fresh.data.value,42);const cached=await readThroughCache({store,key:'x',ttl:60000,now:2000,load:async()=>{throw Error('offline')}});assert.equal(cached.stale,false);const stale=await readThroughCache({store,key:'x',ttl:10,now:20000,load:async()=>{throw Error('offline')}});assert.equal(stale.data.value,42);assert.equal(stale.stale,true);
});
