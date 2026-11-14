# Pass 4 — Item 4: initials-only entity marks

The earlier logo import and display work was superseded by the initials-only instruction. Entity logos, logo routes, admin tools, logo data, and manifest assets have been removed.

`EntityMark` renders deterministic initials for banks, foreign banks, corporate FDs, fund houses, ETFs, and stocks. Gold, silver, bonds, government instruments, and Post Office assets retain the inline SVG marks. Brand wordmarks and the favicon remain.

The exact initials table and source-level removals are checked by `tests/marks.test.js`; public row rendering is covered by `tests/calculator-browser.test.js`.
