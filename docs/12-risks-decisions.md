# 12 — Risk register and architectural decision records

| ID | Risk | Probability | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R01 | Website DOM changes frequently | High | High | Versioned adapters, probes, fallback, weekly tests | Adapter lead |
| R02 | Historical sources incomplete | High | Medium | Confidence labels, corroboration, avoid exactness claims | Research lead |
| R03 | Historic icon/logo rights | Medium | High | Asset ledger, counsel review, independently authored equivalents | Legal/design |
| R04 | Old layout conflicts with new features | High | High | Compatibility mode, feature crosswalk, prioritize native behavior | Product/engineering |
| R05 | Modern UI flashes before theme | Medium | Medium | Critical CSS at document_start, measured fallback | Engine lead |
| R06 | Mutation observer causes jank | Medium | High | Scoped roots, batching, profiling, cleanup | Engine lead |
| R07 | Login/privacy flows break | Medium | Critical | Exclusion zones, P0 tests, fail-open rollback | QA/security |
| R08 | Store policy rejection | Medium | High | Pre-submission review, honest metadata, least privilege | Release/legal |
| R09 | A/B experiments and localization | High | Medium | Probes, supported matrix, fallback | QA |
| R10 | Ads/consent accidentally hidden | Medium | High | Exclusion rules and regression tests | QA/legal |
| R11 | Unlicensed archive capture distribution | Medium | High | Evidence vault separate from package, license scan | Research/legal |
| R12 | Historical loaders misleading | Medium | Medium | Bind to real loading state, timeout and reduced motion | Design/QA |

## Decisions resolved for the M0–M1 pilot (2026-10-30)

| ADR | Decision | Rationale |
|---|---|---|
| ADR-003 | Site access is an **optional** host permission requested on activation. Content scripts are registered dynamically (`chrome.scripting.registerContentScripts`) only while a site is enabled, permitted and not killed. | Least privilege; lets the stylesheet paint at `document_start` without an async storage lookup. Verified in the Playwright suite. |
| ADR-004 | Responsive/mobile web is deferred. | Out of scope for first release (docs/01 §1.5). |
| ADR-005 | Diagnostics are local-only, allow-listed event counters (names, never page content). No export in the pilot. | docs/08 §8.2. |
| ADR-006 | Pilot supports `https://www.google.com` only. Regional domains are native until separately researched. | Avoids unverified locale layouts and broad host patterns. |
| ADR-008 | Minimum Chrome version 120. | Dynamic content-script registration, `:not()` complex selectors and the new headless test mode are all available. |
| ADR-011 | Two build flavors. `dev`/`test` include a recreated look-alike wordmark (independent artwork, CSS-only swap). `store` excludes it and `scripts/audit-package.mjs` fails the build if it appears. | The user wants logos; trademark/copyright exposure of look-alike marks is unresolved (ADR-010), so they must not reach a public package without legal review. |

Still pending: ADR-001 (exact reference month per route), ADR-002 (original vs reconstructed icon licensing), ADR-007 (labeling modern-only components), ADR-009 (compatibility break thresholds), ADR-010 (trademark review outcome).

## Decisions pending
ADR-001 Exact 2012 reference month per route. ADR-002 Original vs reconstructed icon licensing. ADR-003 Optional host permissions vs installation permissions. ADR-004 Whether responsive mobile web is deferred. ADR-005 Diagnostic data policy (default none). ADR-006 Supported Google regional domains. ADR-007 How to label unavoidable modern-only components. ADR-008 Supported Chrome minimum version. ADR-009 Site compatibility break severity thresholds. ADR-010 Brand/trademark review outcome.

## Hard stop conditions
Security/privacy regression; unlicensed bundled assets; inaccessible critical controls; broken login/search/video/posting; hidden legal/consent UI; unreviewed permission expansion; missing independent reviewer approval.
