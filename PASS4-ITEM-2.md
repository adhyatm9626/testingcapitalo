# Pass 4 — Item 2: Nifty 100 only

Removed the standalone free-text instrument form and its button handler from the Stocks screen. Rows now come only from the Nifty 100 source list.

Added `tests/removed-stock-entry.test.js`, which scans source, data, strings, docs, and tests for the deleted visible copy and its field/route keys. The test passes, and the source folder contains no remaining implementation of that flow.

Files changed: `assets/js/screens/stocks.js`, `tests/removed-stock-entry.test.js`; asset cache keys advanced to `2026-11-12p4`.

Verification: `npm test` passed **67/67**. The six calculator browser tests remain green.
