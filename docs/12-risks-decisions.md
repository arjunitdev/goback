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

## Decisions pending
ADR-001 Exact 2012 reference month per route. ADR-002 Original vs reconstructed icon licensing. ADR-003 Optional host permissions vs installation permissions. ADR-004 Whether responsive mobile web is deferred. ADR-005 Diagnostic data policy (default none). ADR-006 Supported Google regional domains. ADR-007 How to label unavoidable modern-only components. ADR-008 Supported Chrome minimum version. ADR-009 Site compatibility break severity thresholds. ADR-010 Brand/trademark review outcome.

## Hard stop conditions
Security/privacy regression; unlicensed bundled assets; inaccessible critical controls; broken login/search/video/posting; hidden legal/consent UI; unreviewed permission expansion; missing independent reviewer approval.
