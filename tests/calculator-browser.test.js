import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {calculateProjection} from '../assets/js/calc.js';
import {filterBrowseRows} from '../netlify/functions/mf-query.mjs';

const root=process.env.CAPITALO_ROOT||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const waitMs=Number(process.env.CAPITALO_TEST_TIMEOUT)||15000;
const chromePath=[path.join(process.env.ProgramFiles||'C:/Program Files','Google/Chrome/Application/chrome.exe'),path.join(process.env['ProgramFiles(x86)']||'C:/Program Files (x86)','Microsoft/Edge/Application/msedge.exe')].find(existsSync);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.otf':'font/otf'};
const documents={};
for(const name of ['fd-banks','post-office','bullion','bonds-catalogue','etf-catalogue','stocks-list','mf-curated','site-settings','site-notice','icons'])try{documents[name]=JSON.parse(await readFile(path.join(root,'data',`${name}.json`),'utf8'))}catch{}
const schemes=[
 {schemeCode:119160,schemeName:'Tata Large Cap Fund - Direct Plan - Growth Option',fundHouse:'Tata Mutual Fund'},
 {schemeCode:121000,schemeName:'HDFC Mid Cap Fund - Direct Plan - Growth Option',fundHouse:'HDFC Mutual Fund'},
 {schemeCode:121001,schemeName:'HDFC Large & Mid Cap Fund - Direct Plan - Growth Option',fundHouse:'HDFC Mutual Fund'},
 {schemeCode:121002,schemeName:'Nippon India ETF Nifty 50 BeES - Direct Plan - Growth Option',fundHouse:'Nippon India Mutual Fund'},
 {schemeCode:121003,schemeName:'Tata Liquid Fund - Direct Plan - Growth Option',fundHouse:'Tata Mutual Fund'}
];
const historyRows=Array.from({length:109},(_,index)=>{const date=new Date(Date.UTC(2017,0,1+index*30));return {date:`${String(date.getUTCDate()).padStart(2,'0')}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${date.getUTCFullYear()}`,nav:(100*Math.pow(1.08,index/12)).toFixed(4)}}).reverse();
let server,chrome,socket,sessionId=0,requestId=0,profile,origin;
const pending=new Map(),browserErrors=[];

async function setup(){
  assert.ok(chromePath,'Headless Chrome or Edge is required for calculator browser tests');
  server=createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost'),send=(status,body,type='application/json; charset=utf-8')=>{res.writeHead(status,{'content-type':type,'cache-control':'no-store','access-control-allow-origin':'*'});res.end(typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body))};
    if(url.pathname==='/api/admin/status'){send(200,{enabled:true});return}
    if(url.pathname==='/api/admin/me'){send(200,{ok:true,editor:'Headless test',csrf:'fixture-csrf'});return}
    if(url.pathname==='/api/admin/doc/fd-banks'){send(200,{ok:true,published:{data:{banks:[]}},history:[]});return}
    if(url.pathname==='/api/health'){send(200,{hasKey:false,model:'test-model',storageAvailable:true,mfapiEnabled:true});return}
    if(url.pathname==='/api/data/providers'){send(200,{ok:true,data:{providers:[]}});return}
    if(url.pathname==='/api/data/meta'){send(200,{ok:true,datasets:{}});return}
    if(url.pathname==='/api/data/bundle'){const datasets={};for(const name of (url.searchParams.get('sets')||'').split(',').filter(Boolean)){const data=documents[name];datasets[name]={ok:true,data,source:'Test fixture',sourceUrl:'https://example.test/source',fetchedAt:'2026-11-12T00:00:00.000Z',stale:false,disabled:false}}send(200,{ok:true,datasets,source:'Test fixture',sourceUrl:'https://example.test/source',fetchedAt:'2026-11-12T00:00:00.000Z',stale:false});return}
    if(url.pathname.startsWith('/api/data/')){const name=url.pathname.split('/').at(-1);if(documents[name]){send(200,{ok:true,data:documents[name],source:'Test fixture',sourceUrl:'https://example.test/source',fetchedAt:'2026-11-12T00:00:00.000Z',stale:false});return}send(404,{ok:false,error:'unknown_data_set'});return}
    if(url.pathname==='/api/mf/browse'||url.pathname==='/api/mf/search'){const q=url.searchParams.get('q')||'',filtered=filterBrowseRows(schemes,{amc:url.searchParams.get('amc')||'',plan:url.searchParams.get('plan')||'direct',option:url.searchParams.get('option')||'growth',category:url.searchParams.get('category')||'',q}),offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||25),data=filtered.slice(offset,offset+limit);send(200,{ok:true,kind:'browse',total:filtered.length,limit,offset,data,source:'MFapi.in',fetchedAt:'2026-11-12T00:00:00.000Z',stale:false});return}
    if(/^\/api\/mf\/\d+\/latest$/.test(url.pathname)){send(200,{ok:true,kind:'latest',data:{meta:{scheme_name:schemes[0].schemeName,fund_house:'Tata Mutual Fund',scheme_category:'Equity - Large Cap'},data:[historyRows[0]]},source:'MFapi.in',fetchedAt:'2026-11-12T00:00:00.000Z',stale:false});return}
    if(/^\/api\/mf\/\d+$/.test(url.pathname)){send(200,{ok:true,kind:'history',data:{meta:{scheme_name:schemes[0].schemeName,fund_house:'Tata Mutual Fund',scheme_category:'Equity - Large Cap'},data:historyRows},source:'MFapi.in',fetchedAt:'2026-11-12T00:00:00.000Z',stale:false});return}
    let file=path.resolve(root,`.${decodeURIComponent(url.pathname)}`);if(url.pathname==='/')file=path.join(root,'index.html');if(!file.startsWith(root+path.sep)&&file!==path.join(root,'index.html')){send(403,'forbidden','text/plain');return}
    try{send(200,await readFile(file),mime[path.extname(file)]||'application/octet-stream')}catch{send(404,'not found','text/plain')}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
  profile=await mkdtemp(path.join(os.tmpdir(),'capitalo-calculator-headless-'));
  chrome=spawn(chromePath,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
  let port;for(let attempt=0;attempt<100;attempt++){try{port=Number((await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split(/\r?\n/)[0]);if(port)break}catch{}await new Promise(resolve=>setTimeout(resolve,100))}
  assert.ok(port,'Chrome DevTools endpoint did not start');const version=await fetch(`http://127.0.0.1:${port}/json/version`).then(response=>response.json());socket=new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')browserErrors.push(message.params.exceptionDetails.text);if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error')browserErrors.push(message.params.args.map(arg=>arg.value||arg.description||'').join(' '));if(message.id&&pending.has(message.id)){const handler=pending.get(message.id);pending.delete(message.id);message.error?handler.reject(new Error(message.error.message)):handler.resolve(message.result)}});
  const send=async(method,params={})=>new Promise((resolve,reject)=>{const id=++requestId;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}))});
  const target=await send('Target.createTarget',{url:'about:blank'}),attached=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true});sessionId=attached.sessionId;await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  globalThis.page={send,evaluate:async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.result?.exception?.description||result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result?.value},wait:async expression=>{for(let i=0;i<Math.ceil(waitMs/100);i++){if(await globalThis.page.evaluate(expression).catch(()=>false))return;await new Promise(resolve=>setTimeout(resolve,100))}const screen=await globalThis.page.evaluate("document.querySelector('#screenContent')?.innerText||''").catch(()=>''),hash=await globalThis.page.evaluate('location.hash').catch(()=>''),errors=browserErrors.slice(-6);throw new Error(`Headless browser timed out waiting for ${expression}; hash=${hash}; screen=${screen}; console=${errors.join(' | ')}`)},navigate:async url=>{await send('Page.navigate',{url});await globalThis.page.wait(`location.href===${JSON.stringify(url)}&&document.readyState==='complete'`)}};
  await globalThis.page.navigate(`${origin}/#home`);await globalThis.page.wait("document.querySelector('#understand')");await globalThis.page.evaluate("document.querySelector('#understand').click()");
}
async function teardown(){try{socket?.close()}catch{}if(chrome&&!chrome.killed){chrome.kill();await Promise.race([new Promise(resolve=>chrome.once('exit',resolve)),new Promise(resolve=>setTimeout(resolve,3000))])}if(server)await new Promise(resolve=>server.close(resolve));if(profile)await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:500})}
before(setup);after(teardown);

async function goto(path){await page.evaluate(`location.hash=${JSON.stringify(`#${path}`)}`);await page.wait("document.querySelector('#screenContent')&&document.querySelector('#screenContent').textContent.trim().length>0")}
async function openCalculator(type){
  await page.navigate(`${origin}/#home`);
  if(type==='mutual fund'){await goto('mf');await setField('fund-search','Tata Large Cap Fund');await page.wait("document.querySelector('#screenContent [data-action=details]')");await page.evaluate("document.querySelector('#screenContent [data-action=details]').click()");await page.wait("location.hash.startsWith('#mf/')");await page.wait("document.querySelector('#screenContent [data-action=sip]')");await page.evaluate("document.querySelector('#screenContent [data-action=sip]').click()");}
  if(type==='ETF'){await goto('etf');await page.wait("document.querySelector('#screenContent [data-action=calculate]')");await page.evaluate("document.querySelector('#screenContent [data-action=calculate]').click()");await page.wait("document.querySelector('#screenContent .detail-heading')");await page.evaluate("document.querySelector('#screenContent .button.primary').click()");}
  if(type==='IBJA gold row'){await goto('gold');await page.wait("document.querySelector('#screenContent [data-action=calculate]')");await page.evaluate("document.querySelector('#screenContent [data-action=calculate]').click()");}
  if(type==='silver row'){await goto('silver');await page.wait("document.querySelector('#screenContent [data-action=calculate]')");await page.evaluate("document.querySelector('#screenContent [data-action=calculate]').click()");}
  if(type==='bond row'){await goto('bonds');await page.wait("document.querySelector('#screenContent [data-action=calculate]')");await page.evaluate("document.querySelector('#screenContent [data-action=calculate]').click()");}
  if(type==='stock'){await goto('stocks');await page.wait("document.querySelector('#screenContent .stocks-list-panel .entity-list button')");await page.evaluate("document.querySelector('#screenContent .stocks-list-panel .entity-list button').click()");}
  await page.wait("location.hash==='#sip'&&document.querySelector('#screenContent [name=years]')&&document.querySelector('#screenContent [name=rate]')");
}
async function setField(name,value){await page.evaluate(`(()=>{const f=document.querySelector('#screenContent [name=${JSON.stringify(name)}]');if(!f)throw new Error('missing field ${name}');f.value=${JSON.stringify(String(value))};f.dispatchEvent(new Event('input',{bubbles:true}));return true})()`)}
async function observe(){return page.evaluate("(()=>({hash:location.hash,result:document.querySelector('#screenContent .result-card')?.innerText||'',numbers:[...document.querySelectorAll('#screenContent .result-card strong')].map(el=>el.textContent),missing:document.querySelector('#screenContent .projection-output')?.innerText||'',guard:document.querySelector('#screenContent .validation-note')?.innerText||'',asset:document.querySelector('#screenContent .asset-banner')?.innerText||'',source:document.querySelector('#screenContent .calculator-source')?.innerText||'',errors:[]}))()")}

for(const type of ['mutual fund','ETF','IBJA gold row','silver row','bond row','stock'])test(`headless calculator works for ${type}`,async()=>{
  await openCalculator(type);
  await setField('shared-amount','10000');
  await setField('years','5');
  await setField('rate','8');
  await page.wait("document.querySelector('#screenContent .result-card strong')");
  const live=await observe(),golden=calculateProjection({oneTime:10000,annualRatePct:8,years:5});
  assert.ok(live.asset.trim(),`${type}: selected item should remain in the calculator header`);
  assert.ok(live.source.trim(),`${type}: source and date or the user assumption should remain attributed in the header`);
  assert.equal(live.numbers.length,3,`${type}: result card should show final, invested, and gain`);
  assert.equal(live.numbers[0].replace(/[^\d]/g,''),golden.finalValue.toFixed(2).replace('.',''),`${type}: live result should match formula`);
  await setField('rate','12');await page.wait("document.querySelector('#screenContent .result-card strong')");
  const updated=await observe(),updatedGolden=calculateProjection({oneTime:10000,annualRatePct:12,years:5});
  assert.equal(updated.numbers[0].replace(/[^\d]/g,''),updatedGolden.finalValue.toFixed(2).replace('.',''),`${type}: result should update when the return changes`);
  await page.evaluate("document.querySelector('#screenContent [data-action=calculate]').click()");
  const clicked=await observe();assert.equal(clicked.numbers[0],updated.numbers[0],`${type}: Calculate button should recalculate the visible result`);
  assert.deepEqual(browserErrors,[],`${type}: the browser console should have no errors`);
});

test('headless asset calculator lists exactly which inputs are missing and clamps oversized amount',async()=>{
  await openCalculator('stock');
  await setField('shared-amount','');await setField('years','');await setField('rate','');
  await page.evaluate("document.querySelector('#screenContent [data-action=calculate]').click()");
  let state=await observe();assert.match(state.missing,/Pick amount, years, a return to see the result\./);
  await setField('shared-amount','1000000001');state=await observe();assert.match(state.guard,/100 crore/i);assert.doesNotMatch(state.result,/NaN|Infinity/);
});

test('headless calculator recalculates monthly mode and shows the monthly schedule',async()=>{
  await openCalculator('stock');await page.evaluate("document.querySelector('#screenContent [data-shared-mode=sip]').click()");
  await setField('shared-amount','10000');await setField('years','5');await setField('rate','8');await page.wait("document.querySelector('#screenContent .result-card strong')");
  const state=await observe(),golden=calculateProjection({monthly:10000,annualRatePct:8,years:5});
  assert.equal(state.numbers[0].replace(/[^\d]/g,''),golden.finalValue.toFixed(2).replace('.',''));
  assert.match(await page.evaluate("document.querySelector('#screenContent .inline-status')?.innerText||''"),/^Monthly: Rs 10,000 x 60 months$/);
  assert.deepEqual(browserErrors,[]);
});

test('mutual fund arrival stays empty until a filter or search is chosen and category/house breadcrumbs clear',async()=>{
  await page.navigate(`${origin}/#mf`);await page.wait("document.querySelector('#screenContent .category-card')");
  const structure=await page.evaluate("(()=>({initialRows:document.querySelectorAll('#screenContent .fund-results .data-list').length,primary:document.querySelectorAll('#screenContent .category-card:first-of-type [data-category]').length,more:document.querySelectorAll('#screenContent .category-card:nth-of-type(2) [data-category]').length,houses:document.querySelectorAll('#screenContent .fund-house-grid [data-house]').length,summary:document.querySelector('#screenContent .fund-filter-row button')?.textContent}))()");
  assert.equal(structure.initialRows,0);assert.equal(structure.primary,10);assert.equal(structure.more,5);assert.equal(structure.houses,10);assert.equal(structure.summary,'Direct - Growth');
  await page.evaluate("document.querySelector('#screenContent [data-category=mid_cap]').click()");await page.wait("document.querySelector('#screenContent .fund-results .data-list .entity-row')");
  assert.equal(await page.evaluate("document.querySelector('#screenContent .fund-results .list-count').textContent"),'1 funds');
  await page.evaluate("document.querySelector('#screenContent .fund-house-grid [data-house=HDFC]').click()");
  assert.equal(await page.evaluate("document.querySelectorAll('#screenContent .filter-breadcrumbs button').length"),2);
  await page.evaluate("document.querySelector('#screenContent [data-remove-filter=amc]').click()");await page.wait("document.querySelector('#screenContent .fund-results .data-list .entity-row')");
  assert.equal(await page.evaluate("document.querySelectorAll('#screenContent .filter-breadcrumbs button').length"),1);
  await page.evaluate("document.querySelector('#screenContent [data-remove-filter=category]').click()");
  assert.equal(await page.evaluate("document.querySelectorAll('#screenContent .fund-results .data-list').length"),0);
  await page.evaluate("document.querySelector('#screenContent [name=fund-search]').value='ETF';document.querySelector('#screenContent [name=fund-search]').dispatchEvent(new Event('input',{bubbles:true}))");await page.wait("document.querySelector('#screenContent .fund-results .entity-row')");
  assert.match(await page.evaluate("document.querySelector('#screenContent .fund-results .entity-row').textContent"),/Nippon India ETF/);
});

test('stocks page renders tidy Nifty rows with one searchable Industries control',async()=>{
  await goto('stocks');await page.wait("document.querySelector('#screenContent .stock-row')");
  const state=await page.evaluate("(()=>({count:document.querySelectorAll('#screenContent .stock-row').length,heading:document.querySelector('#screenContent .stocks-list-panel h2'),controls:[...document.querySelectorAll('#screenContent .stock-group-filters button')].map(x=>x.textContent),industryButtons:document.querySelectorAll('#screenContent .industry-control').length,marked:[...document.querySelectorAll('#screenContent .stock-row')].every(row=>row.querySelector('.entity-mark')&&row.querySelector('.stock-name')&&row.querySelector('.stock-symbol')&&row.querySelector('.industry-chip')&&row.querySelector('button'))}))()")
  assert.equal(state.count,25);assert.equal(state.heading,null);assert.deepEqual(state.controls,['All groups','Nifty 50','Next 50']);assert.equal(state.industryButtons,1);assert.equal(state.marked,true);
  await page.evaluate("document.querySelector('#screenContent .industry-control').click()");await page.wait("document.querySelector('#screenContent [name=industry-search]')");
  await page.evaluate("document.querySelector('#screenContent [name=industry-search]').value='Financial';document.querySelector('#screenContent [name=industry-search]').dispatchEvent(new Event('input',{bubbles:true}))");
  await page.wait("[...document.querySelectorAll('#screenContent [data-industry]')].some(item=>item.dataset.industry==='Financial Services')");
  await page.evaluate("[...document.querySelectorAll('#screenContent [data-industry]')].find(item=>item.dataset.industry==='Financial Services').click()");
  assert.ok(await page.evaluate("document.querySelectorAll('#screenContent .stock-row .industry-chip').length>0"));
  assert.deepEqual(browserErrors,[]);
});

test('every visible public list row carries an entity mark and no entity image',async()=>{
  for(const route of ['fd','etf','gold','silver','bonds','stocks']){await goto(route);await page.wait("document.querySelector('#screenContent .data-list > li')");const rows=await page.evaluate("[...document.querySelectorAll('#screenContent .data-list > li')].map(row=>{const mark=row.querySelector('.entity-mark'),box=mark?.getBoundingClientRect();return {mark:!!mark,images:row.querySelectorAll('img').length,width:box?.width,height:box?.height}})");assert.ok(rows.length>0,route+' should render rows');assert.equal(rows.filter(row=>!row.mark||row.images||row.width!==44||row.height!==44).length,0,route+' rows should have one 44px mark and no image')}
  await goto('stocks');assert.equal(await page.evaluate("[...document.querySelectorAll('#screenContent .stock-row .entity-mark')].every(mark=>mark.classList.contains('is-brand-mark')&&mark.querySelector('.entity-mark-initials')&&!mark.querySelector('svg,img'))"),true,'stocks should show initials only');assert.equal(await page.evaluate("document.querySelector('#screenContent .stock-row .entity-mark').textContent.trim()"),'ABB','stock row should use the company initials');
  await goto('etf');assert.equal(await page.evaluate("document.querySelector('#screenContent .data-list > li .entity-mark').textContent.trim()"),'NI','ETF mark should use its fund house initials');
  await goto('mf');await page.evaluate("document.querySelector('#screenContent [data-category=mid_cap]').click()");await page.wait("document.querySelector('#screenContent .fund-results .data-list > li')");assert.equal(await page.evaluate("document.querySelector('#screenContent .fund-results .data-list > li .entity-mark').textContent.trim()"),'HDFC','mutual fund mark should use its fund house initials');
  assert.deepEqual(browserErrors,[]);
});

test('removed logo endpoints return 404 and admin has no logo screens',async()=>{
  for(const route of ['/api/asset/logo/test','/api/data/logos','/api/logos'])assert.equal((await fetch(origin+route)).status,404,route+' should be removed');
  await page.navigate(origin+'/admin/index.html');await page.wait("document.querySelector('#document')");const html=await page.evaluate("document.body.innerText+' '+document.body.innerHTML");assert.doesNotMatch(html,/Logo Manager|Import logos|logoManager|logoImport/i);
});

if(process.env.CAPITALO_SCREENSHOT_DIR)test('capture requested light/dark screenshots at 390px and 1280px',async()=>{
  const directory=path.resolve(process.env.CAPITALO_SCREENSHOT_DIR);await mkdir(directory,{recursive:true});await page.navigate(origin+'/#home');
  const capture=async(name)=>{await page.evaluate('window.scrollTo(0,0)');await page.evaluate('document.fonts?.ready');const image=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path.join(directory,`${name}.png`),Buffer.from(image.data,'base64'))};
  const views=[
    ['fd-list',async()=>{await goto('fd');await page.wait("document.querySelector('#screenContent .data-list > li')")}],
    ['mf-arrival',async()=>{await page.navigate(origin+'/#mf');await page.wait("document.querySelector('#screenContent .category-card')")}],
    ['mf-results',async()=>{await page.navigate(origin+'/#mf');await page.wait("document.querySelector('#screenContent [data-category=mid_cap]')");await page.evaluate("document.querySelector('#screenContent [data-category=mid_cap]').click()");await page.wait("document.querySelector('#screenContent .fund-results .data-list .entity-row')")}],
    ['stocks-list',async()=>{await goto('stocks');await page.wait("document.querySelector('#screenContent .stock-row')")}],
    ['island',async()=>{await page.evaluate("localStorage.setItem('capitalo.island',JSON.stringify([{id:'screenshot',type:'fd',name:'HDFC Bank',markType:'bank',markName:'HDFC Bank',mode:'onetime',amount:125000,years:5,rate:8,rateSource:'Test fixture',invested:125000,finalValue:183673,low:150000,high:200000}]))");await page.evaluate("location.hash='#home';location.reload()");await page.wait("location.hash==='#home'&&document.querySelector('.my-total-pill')");await page.evaluate("document.querySelector('.my-total-pill').click()");await page.wait("document.querySelector('.my-total-panel .island-item .entity-mark')")}]
  ];
  for(const width of [390,1280]){await page.send('Emulation.setDeviceMetricsOverride',{width,height:width===390?3900:2500,deviceScaleFactor:1,mobile:width===390});for(const theme of ['light','dark']){await page.evaluate(`(()=>{const field=document.querySelector('#theme');field.value=${JSON.stringify(theme)};field.dispatchEvent(new Event('change',{bubbles:true}))})()`);await page.wait(`document.documentElement.dataset.theme==='${theme}'`);for(const [name,prepare] of views){await prepare();await capture(`${name}-${width}-${theme}`)}}}
  assert.deepEqual(browserErrors,[]);
});






