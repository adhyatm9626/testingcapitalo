import test from 'node:test';
import assert from 'node:assert/strict';
import {cagrFromHistory,riskFromHistory} from '../assets/js/metrics.js';

test('CAGR is computed from a short, valid history window',()=>{
  const value=cagrFromHistory([{date:'01-01-2024',nav:100},{date:'01-01-2025',nav:110}]);
  assert.ok(Math.abs(value-.1)<.001);
});

test('CAGR and risk stay unavailable with less than one year of history',()=>{
  const rows=[{date:'01-01-2025',nav:100},{date:'01-07-2025',nav:110}];
  assert.equal(cagrFromHistory(rows),null);
  assert.equal(riskFromHistory(rows).available,false);
});
