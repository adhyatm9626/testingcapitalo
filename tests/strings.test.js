import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {strings} from '../assets/js/strings.js';

test('English copy is bundled and every static copy key resolves',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const keys=[...html.matchAll(/data-copy="([^"]+)"/g)].map(match=>match[1]);
  for(const key of keys)assert.ok(typeof strings[key]==='string',`missing bundled copy ${key}`);
  assert.match(html,/type="module" src="\/assets\/js\/app\.js/);
  assert.doesNotMatch(`${html}\n${await readFile(new URL('../assets/js/app.js',import.meta.url),'utf8')}`,/fetch\([^)]*i18n\/|loadLanguageFile|loadLang\(/i);
  assert.equal(Object.keys(strings).some(key=>key.toLowerCase().includes('hindi')||key.toLowerCase().includes('locale')),false);
});

test('home investment prompt and sticky label use the requested wording',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.equal(strings.amountLabel,'How much would you like to invest?');
 assert.equal(strings.investingLabel,'Investing');
 assert.match(html,/class="investing-sticky" data-copy="investingLabel"/);
 assert.doesNotMatch(`${html}\n${JSON.stringify(strings)}`,new RegExp(['invest','now'].join('\\s+'),'i'));
});

test('disclaimer, first visit copy, and credit line stay exact',()=>{
  assert.equal(strings.disclaimer,'Capitalo is an educational tool, not a SEBI-registered investment adviser. Projections are estimates based on past data and are not guarantees of future returns. We are not responsible for any losses incurred. Prices and rates may be delayed or out of date; check the source link and last-updated time. Always consult a SEBI-registered investment adviser before investing.');
  assert.equal(`${strings.welcomeTitle} ${strings.welcomeCopy}`,'Capitalo is educational, not advice. Consult a SEBI-registered adviser before investing.');
  assert.equal(strings.understand,'I understand');
  assert.equal(strings.credit,'Built by Ayush Agrawal and Adhyatma Sahu');
});

test('public shell uses same-origin brand imagery and no remote images',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),css=await readFile(new URL('../assets/css/app.css',import.meta.url),'utf8'),js=await readFile(new URL('../assets/js/app.js',import.meta.url),'utf8');
  const source=`${html}\n${css}\n${js}`;
  assert.doesNotMatch(source,/<(?:img|source)[^>]+(?:src|srcset)="https?:\/\//i);
  assert.doesNotMatch(source,/url\(["']?https?:\/\//i);
});
