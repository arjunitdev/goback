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
| ADR-012 | The 2012 colour palette applies only when the engine measures a **light** page (`data-retroweb-scheme='light'`, from the page's own background). Dark pages get shape/typography only. | Found live: a forced white body made Google's light-on-dark header unreadable. A test requires every colour rule to be scheme-gated. |
| ADR-013 | Adapters may set `earlyStyle: false` and declare `forbidden` probes. Facebook does both. | The first paint at `/` may be a login wall, which FR-012 forbids restyling. |
| ADR-014 | Probe retry window is ~20s (0.4, 1.2, 3, 6, 10s) before failing open. The Playwright build uses 3×150ms. | Found live: YouTube rendered a route after ~5s on a cold load, and the earlier ~4.6s window wrongly dropped the theme. |
| ADR-015 | Site access is a per-site optional host permission for `www.google.com`, `www.youtube.com`, `www.facebook.com` only (no regional or sub-domains). | Least privilege (R08). Regional domains need separate research (ADR-006). |

| ADR-016 | Archive-derived assets (the real 2012 YouTube logo and paper texture) are allowed **only** as private, git-ignored files in `src/assets/private/`, used by non-store builds on the owner's machine. They are never committed, pushed or packaged for the store; the build, registration logic and store audit each enforce this independently, and tests pin it. | The owner asked for the exact logo. Distributing it would infringe trademark/copyright (ADR-010), so personal use is the only safe form. |

| ADR-017 | Authentic mode renders YouTube in its LIGHT theme even for dark-theme accounts, by pinning YouTube's ~380 colour variables to their light values (`scripts/gen-youtube-theme.mjs`, regenerated on demand) and holding the `dark` attribute off <html> and the masthead. Compatibility mode keeps the user's theme. If the pin goes stale the engine measures the page as dark and withholds the 2012 palette, so text stays readable. | The 2012 site had no dark theme and the owner's account is dark. Found live: removing the `dark` attribute alone does nothing, because YouTube serves the dark values straight on <html>. |

| ADR-018 | YouTube Authentic mode fills the window instead of reproducing the 970px column: the masthead spans the screen, the 200px dark guide is fixed to the left edge for the full window height, and the home/results content and the watch player use the remaining width. The home feed keeps YouTube's own grid. Colours, fonts, button shapes, logo and the dark guide stay 2012. | The owner found the 970px column wasted most of a modern screen and preferred the full-width grid layout. Layout fidelity to the 2012 column is traded for usability; typography and palette fidelity are unchanged. |

| ADR-019 | The engine keeps the theme painted across same-site route changes for CSS-only adapters (`keepOnRouteChange`, YouTube) and runs DOM-mutation work (scheme measurement, probes) at most once per second while healthy; unhealthy pages are still checked every batch. The first mount no longer clears and re-sets the attributes the early script already applied. | Measured live on YouTube (search, then click a video): the extension added ~110ms style and ~100ms layout per navigation and ~700ms of long tasks, because every click rebuilt the theme and every DOM batch forced a style flush. After the change the navigation cost matches a no-extension baseline. The page-wide font rule was measured and is NOT a cost. |

Still pending: ADR-001 (exact reference month per route), ADR-002 (original vs reconstructed icon licensing), ADR-007 (labeling modern-only components), ADR-009 (compatibility break thresholds), ADR-010 (trademark review outcome).

## Decisions pending
ADR-001 Exact 2012 reference month per route. ADR-002 Original vs reconstructed icon licensing. ADR-003 Optional host permissions vs installation permissions. ADR-004 Whether responsive mobile web is deferred. ADR-005 Diagnostic data policy (default none). ADR-006 Supported Google regional domains. ADR-007 How to label unavoidable modern-only components. ADR-008 Supported Chrome minimum version. ADR-009 Site compatibility break severity thresholds. ADR-010 Brand/trademark review outcome.

## Hard stop conditions
Security/privacy regression; unlicensed bundled assets; inaccessible critical controls; broken login/search/video/posting; hidden legal/consent UI; unreviewed permission expansion; missing independent reviewer approval.
