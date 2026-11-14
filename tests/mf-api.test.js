import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateNavReturns,dateText} from '../assets/js/mf-api.js';

test('MFapi DD-MM-YYYY NAV history is ordered by actual date for CAGR windows',()=>{
  const data=[
    {date:'10-11-2021',nav:'91'},
    {date:'10-11-2022',nav:'100'},
    {date:'10-11-2023',nav:'110'},
    {date:'10-11-2024',nav:'121'},
    {date:'10-11-2025',nav:'133.1'},
    {date:'10-11-2026',nav:'146.41'}
  ];
  const results=calculateNavReturns({data});
  assert.equal(results.length,3);
  assert.ok(Math.abs(results[0].value-.1)<1e-4);
  assert.ok(Math.abs(results[1].value-.1)<1e-4);
  assert.ok(Math.abs(results[2].value-.1)<3e-4);
  assert.equal(results[0].startDate,'10-11-2025');
  assert.match(dateText('10-11-2026'),/10 Nov 2026/);
});

test('MFapi history without a complete period does not invent a return',()=>{
  assert.equal(calculateNavReturns({data:[{date:'01-01-2026',nav:'20'},{date:'01-06-2026',nav:'25'}]}).every(row=>row.value===null),true);
});
