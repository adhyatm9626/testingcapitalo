# Stage B — calculators and data screens

**Status: Partial.**

The shared one-time/monthly amount state reaches the calculator screens; SIP, one-time FD, and monthly recurring-deposit calculations have golden tests. MF browse filters and paging, ETF calculate routes, source-aware bullion sections, and the default-on 100-name stocks list are implemented. REITs have been removed.

`npm test` passes for the locally modeled data and formulas. Live MFapi scheme enumeration and NAV matching could not be verified from this environment; see `QA-REPORT.md`.
