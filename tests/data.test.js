import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('Nifty 100 input is the supplied unedited universe with required columns',async()=>{
  const csv=await readFile(new URL('../data/stocks-list.csv',import.meta.url),'utf8');
  const metadata=JSON.parse(await readFile(new URL('../data/stocks-list.meta.json',import.meta.url),'utf8'));
  assert.equal(createHash('sha256').update(csv).digest('hex'),'0a53ad14c15e9ec258dc72117a8c0699546ec25f2d283c47d53412e2de8a06fc');
  assert.equal(metadata.copied_unedited,true);
  assert.equal(metadata.as_of,'2026-11-02');
  const rows=csv.trim().split(/\r?\n/);
  assert.equal(rows[0],'Company Name,Industry,Symbol,Series,ISIN Code');
  assert.equal(rows.length,101);
  assert.ok(rows.slice(1).every(row=>row.split(',').length===5));
});

test('provider registry records the team-approved stocks source and active source families',async()=>{
  const registry=JSON.parse(await readFile(new URL('../data/providers.json',import.meta.url),'utf8'));
  assert.deepEqual(registry.providers.map(x=>x.name),['MFapi.in','Google Gemini','Capitalo team (manual updates)','NSE Indices Nifty 100 list (names only)']);
  assert.equal(registry.providers.find(x=>x.id==='manual').enabled,true);
  assert.equal(registry.providers.find(x=>x.id==='mfapi').enabled,true);
  assert.equal(registry.providers.find(x=>x.id==='gemini').enabled,true);
  const nse=registry.providers.find(x=>x.id==='nse-index-constituents');assert.equal(nse.enabled,true);assert.equal(nse.verdict,'confirmed_by_team');assert.equal(nse.approved_by,'Capitalo team');assert.equal(nse.approved_on,'2026-11-11');
});

test('FD seed stays unverified and dated from the supplied cleaned JSON',async()=>{
  const data=JSON.parse(await readFile(new URL('../data/fd-banks.json',import.meta.url),'utf8'));
  assert.equal(data.meta.as_of,'2026-10-28');
  assert.equal(data.banks.length,45);
  assert.equal(data.meta.counts.foreign,3);
  assert.equal(data.meta.counts.corporate,8);
  assert.ok([...data.banks,...data.foreign_banks,...data.corporate_fds].every(x=>x.verified===false));
});

test('bundled manual catalogues have explicit as-of dates',async()=>{
  for(const file of ['bullion.json','etf-catalogue.json','bonds-catalogue.json','mf-curated.json','tax-rules.json','icons.json']){
    const data=JSON.parse(await readFile(new URL('../data/'+file,import.meta.url),'utf8'));assert.match(String(data.as_of||''),/^2026-\d{2}-\d{2}$/i,file);
  }
});
