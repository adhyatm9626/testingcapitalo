import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {entityInitials} from '../assets/js/ui.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const golden=[
 ['HDFC Bank','HDFC'],['ICICI Bank','ICICI'],['IDFC FIRST Bank','IDFC'],['YES Bank','YES'],
 ['State Bank of India','SBI'],['Punjab National Bank','PNB'],['Bank of Baroda','BB'],['Axis Bank','AB'],
 ['Karur Vysya Bank','KVB'],['Kotak Mahindra Bank','KMB'],['Federal Bank','FB'],['AU Small Finance Bank','AU'],
 ['ESAF Small Finance Bank','ESAF'],['Unity Small Finance Bank','UN'],['Utkarsh Small Finance Bank','UT'],
 ['Ujjivan Small Finance Bank','UJ'],['Suryoday Small Finance Bank','SU'],['Jana Small Finance Bank','JA'],
 ['ABB India Ltd.','ABB'],['Adani Enterprises Ltd.','AE'],['Tata Consultancy Services Ltd.','TCS'],
 ['Reliance Industries Ltd.','RI'],['Bajaj Finance Ltd.','BF'],['Kotak','KO'],['Axis','AX'],['Tata','TA'],
 ['Nippon India','NI'],['Aditya Birla Sun Life','ABS'],['Mirae Asset','MA'],['DSP','DSP'],
 ['ICICI Prudential','ICICI'],['SBI','SBI'],['HDFC','HDFC']
];

test('EntityMark initials match the supplied golden table',()=>{
 for(const [name,expected] of golden)assert.equal(entityInitials(name),expected,name);
});

test('initials-only public source contains no remote image system or entity images',async()=>{
 const directories=['assets','admin','netlify','data'];
 const files=[];async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(/\.(?:js|mjs|html|css|json|csv)$/.test(entry.name))files.push(file)}}
 for(const directory of directories)await walk(join(root,directory));files.push(join(root,'index.html'),join(root,'netlify.toml'));
 const externalMarkers=[['google.com','/s2/','favicons'].join(''),['duckduckgo.com','/ip3/'].join(''),['cdn.jsdelivr.net','/gh/'].join('')];
 const removedFolder=['assets','img','lo','gos'].join('/');
 for(const file of new Set(files)){const content=await readFile(file,'utf8');for(const marker of externalMarkers)assert.equal(content.toLowerCase().includes(marker),false,`${file} contains an old external image reference`);assert.equal(content.includes(removedFolder),false,`${file} references the removed entity asset folder`);assert.doesNotMatch(content,/entity-logo|applyEntityLogo|data-logo-type|\/api\/asset\//i,`${file} contains the removed entity image path`)}
 assert.equal(existsSync(join(root,'assets','img',['lo','gos'].join(''))),false,'the entity image folder must be deleted');
 const ui=await readFile(join(root,'assets/js/ui.js'),'utf8'),mark=ui.slice(ui.indexOf('export function EntityMark'),ui.indexOf('export function dateLabel'));assert.doesNotMatch(mark,/(?:createElement|element)\(['"]img['"]\)/i);
});
