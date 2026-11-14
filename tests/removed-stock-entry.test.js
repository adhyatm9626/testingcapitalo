import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const textExtensions=new Set(['.js','.mjs','.html','.css','.json','.md','.csv','.txt']);
async function sourceFiles(dir){const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory()){if(!['node_modules','.git'].includes(entry.name))files.push(...await sourceFiles(full))}else if(textExtensions.has(path.extname(entry.name).toLowerCase()))files.push(full)}return files}

test('source, data, strings, docs and tests contain no removed custom-stock entry flow',async()=>{
  const forbidden=['Add your '+'own stock','own-stock-'+'name','own-stock-'+'symbol','own-stock-'+'return','stock:own'+':'];
  const files=await sourceFiles(root),hits=[];
  for(const file of files){const content=await readFile(file,'utf8');for(const phrase of forbidden)if(content.toLowerCase().includes(phrase.toLowerCase()))hits.push(`${path.relative(root,file)}: ${phrase}`)}
  assert.deepEqual(hits,[]);
});
