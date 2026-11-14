import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
test('public CSS keeps only the two requested blur surfaces and avoids costly effects',async()=>{
  const css=await read('assets/css/app.css');
  const blurSelectors=new Set([...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([,selector,body])=>/(?<!-)backdrop-filter\s*:\s*blur/.test(body)).flatMap(([,selector])=>selector.slice(selector.lastIndexOf('}')+1).trim().split(',').map(value=>value.trim().split(/\s+/).at(-1))));
  assert.deepEqual([...blurSelectors].sort(),['.mobile-nav','.topbar']);
  assert.equal([...css.matchAll(/-webkit-backdrop-filter\s*:\s*blur/g)].length,3);
  assert.doesNotMatch(css,/(?<!backdrop-)filter\s*:\s*blur\s*\(|mix-blend-mode|background-attachment|transition\s*:\s*all|animation-iteration-count\s*:\s*infinite/i);
});
test('deployment headers and environment sample do not expose secrets or inline scripts',async()=>{
  const [toml,env,packageText]=await Promise.all([read('netlify.toml'),read('.env.example'),read('package.json')]);
  assert.match(toml,/script-src 'self'/);assert.match(toml,/style-src 'self'/);
  assert.ok(env.trim().split(/\r?\n/).every(line=>/^[A-Z0-9_]+$/.test(line)));
  const pkg=JSON.parse(packageText);assert.deepEqual(Object.keys(pkg.dependencies||{}),['@netlify/blobs']);
});
test('all lazy public routes resolve to source modules',async()=>{
  const router=await read('assets/js/router.js'),map=router.match(/const screenModules=\{([^}]+)\}/)?.[1]||'',matches=[...map.matchAll(/:'([a-z-]+)'/g)].map(match=>match[1]);
  for(const name of [...new Set(matches)])await read(`assets/js/screens/${name}.js`);
});
