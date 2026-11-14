import test from 'node:test';import assert from 'node:assert/strict';import {constantTimeEqual,validAdminConfig,signSession,verifySession,verifySessionResult,authorizeAdmin,updateLockout,validateAdminDocument,appendDocumentVersion,rollbackDocument,matchEditor} from '../netlify/functions/admin-core.mjs';
const secret='0123456789abcdef0123456789abcdef';
test('admin credential compare, HMAC tampering, expiry, CSRF and origin checks',()=>{
 assert.equal(validAdminConfig('pw',secret),true);assert.equal(validAdminConfig('pw','short'),false);assert.equal(constantTimeEqual('abc','abc'),true);assert.equal(constantTimeEqual('abc','abd'),false);const signed=signSession({editor:'Ayush',secret,now:100000});assert.equal(verifySession(signed.token,secret,signed.csrf,100000).editor,'Ayush');assert.equal(verifySession(signed.token+'x',secret,signed.csrf,100000),null);assert.equal(verifySession(signed.token,secret,'',100000),null);assert.equal(verifySession(signed.token,secret,signed.csrf,9000000),null);assert.equal(authorizeAdmin({origin:'https://wrong.example',siteOrigin:'https://site.example',cookie:signed.token,csrfHeader:signed.csrf,secret}).ok,false);assert.equal(authorizeAdmin({origin:'https://site.example',siteOrigin:'https://site.example',cookie:signed.token,csrfHeader:'',secret}).ok,false);
});
test('admin guard accepts same-origin GET without Origin and rejects unsafe origin/CSRF gaps',()=>{
 const signed=signSession({editor:'Ayush',secret:` ${secret} `,now:1_000_000}),base={siteOrigin:'https://testingcapitalo.netlify.app/',host:'testingcapitalo.netlify.app',cookie:signed.token,secret,csrfHeader:signed.csrf,now:1_000_000};
 assert.equal(authorizeAdmin({...base,method:'GET',origin:null,secFetchSite:'same-origin'}).ok,true);
 assert.equal(authorizeAdmin({...base,method:'GET',origin:null,secFetchSite:'same-origin',csrfHeader:''}).ok,true);
 assert.equal(authorizeAdmin({...base,method:'GET',origin:'https://evil.example',secFetchSite:'same-origin'}).reason,'origin_mismatch');
 assert.equal(authorizeAdmin({...base,method:'POST',origin:null,secFetchSite:'same-origin'}).reason,'origin_missing');
 assert.equal(authorizeAdmin({...base,method:'POST',origin:'https://testingcapitalo.netlify.app',csrfHeader:''}).reason,'csrf_missing');
 assert.equal(authorizeAdmin({...base,method:'POST',origin:'https://testingcapitalo.netlify.app',cookie:signed.token+'x'}).reason,'bad_signature');
 assert.equal(authorizeAdmin({...base,method:'GET',origin:'https://testingcapitalo.netlify.app',now:10_000_000}).reason,'expired');
});
test('admin sign then verify uses trimmed secret and editor matching is trimmed and case-insensitive',()=>{
 const signed=signSession({editor:'Ayush',secret:` ${secret} `,now:1000});assert.equal(verifySessionResult(signed.token,secret,signed.csrf,1000).ok,true);assert.equal(matchEditor('  aYuSh ',['Ayush','Adhyatma']),'Ayush');
});
test('admin login lockout begins at five failures and expires after fifteen minutes',()=>{let state={count:0,until:0};for(let i=0;i<4;i++)state=updateLockout(state,1000+i);assert.equal(state.locked,false);state=updateLockout(state,2000);assert.equal(state.locked,true);assert.equal(state.until,902000);assert.deepEqual(updateLockout(state,2100,true),{count:0,windowStart:0,until:0,locked:false})});
test('admin schema validates rates, verified sources, price bounds and text limits',()=>{
 assert.equal(validateAdminDocument('bullion',{items:[{rate:16}]}).error,'rate_out_of_range');assert.equal(validateAdminDocument('stocks-list',{items:[{verified:true}]}).error,'verified_records_need_source_and_date');assert.equal(validateAdminDocument('stocks-list',{items:[{price:0}]}).error,'price_must_be_positive');assert.equal(validateAdminDocument('site-notice',{text:'x'.repeat(5001)}).error,'text_too_long');assert.equal(validateAdminDocument('missing',{}).error,'unknown_document');
});
test('admin history retains twenty versions and can restore a prior version',()=>{const history=Array.from({length:21},(_,i)=>({version:i+1,data:i}));const last=appendDocumentVersion(history,{version:22},20);assert.equal(last.length,20);assert.equal(last[0].version,3);assert.equal(rollbackDocument(last,7).data,6);assert.equal(rollbackDocument(last,2),null)});

