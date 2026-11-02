# 01 — Product requirements and scope

## 1.1 User promise
One extension that transforms the live desktop web UIs of youtube.com, google.com search, and facebook.com to carefully researched 2012-era appearances. The actual site remains responsible for content, search, media, identity, posting, and recommendations. No 2012 backend is recreated.

## 1.2 Personas and workflows
- Nostalgia user: install, explicitly enable per domain, select 2012 variant, navigate, instantly disable.
- Accessibility user: control reduced motion, zoom, contrast exception and keyboard focus.
- QA engineer: inspect active adapter/version, diagnostic event counts, rollback.
- Reviewer: reproduce archival references and compare screenshots against stable fixtures.

## 1.3 Functional requirements
FR-001 Per-site opt-in toggle and global kill switch. FR-002 Persist preferences locally; no account required. FR-003 Apply early critical styles before paint where feasible. FR-004 Reconcile client-side route changes and asynchronously added DOM. FR-005 Retain original links, forms, playback, input, event handlers and accessible names. FR-006 Preserve modern-only features using historically styled fallback components. FR-007 Show adapter health state and disable broken transformations safely. FR-008 Support browser zoom 80–200% and desktop viewports 1024–2560px; define narrower behavior separately. FR-009 Offer reduced-motion preference and system preference compliance. FR-010 Distinguish authentic and compatibility display modes. FR-011 Never change search engine, homepage, new-tab or outbound destinations. FR-012 Avoid restyling password, authentication, payment, CAPTCHA and security warning interfaces.

## 1.4 Nonfunctional targets (provisional engineering budgets)
- No more than 100ms additional p95 main-thread time during initial 5 seconds on reference hardware; test under CPU throttling.
- No more than 30ms p95 adapter processing per navigation (excluding browser paint); mutations processed in bounded batches.
- No more than 10MB additional extension memory per tab at steady state, measured with reproducible tooling.
- No added external network requests by default; no analytics by default.
- No critical keyboard accessibility regression; WCAG 2.2 AA as an aspirational audit baseline with documented historic-style exceptions, not a blanket conformance claim.
- Zero known critical/high security findings at release.
- 100% pass of P0 workflows; >=95% P1 regression checks; no untriaged P1 failures.

## 1.5 Scope boundaries
In: desktop home/search/results/watch/profile/feed; top navigation, spacing, color, typography, icons, loading placeholders, interaction states. Out for first release: mobile native apps, mobile websites, internal APIs, server response alteration, ad blocking, premium bypass, private messages content access, unsupported languages. Ads and monetization elements must remain functional and not be deliberately hidden or bypassed.

## 1.6 Milestones
M0 evidence and legal feasibility; M1 framework + Google pilot; M2 YouTube; M3 Facebook; M4 stabilization; M5 store release. Order may change after evidence assessment.

## 1.6.1 Requirement traceability (updated 2026-10-31, all three adapters)
Status is what is actually covered by automated tests today; "gap" means not implemented or not measured.

| Req | Owner | Severity | Automated evidence | Status |
|---|---|---|---|---|
| FR-001 opt-in + kill switch | Engine | P0 | `storage.test` (defaults off), `engine.test` kill switch, e2e opt-in and kill switch | covered |
| FR-002 local prefs | Engine | P1 | `storage.test` migration/round-trip | covered |
| FR-003 early styles | Engine | P1 | `registration.test`, e2e (computed colors after navigation) | covered (flash not measured) |
| FR-004 route/async changes | Engine | P0 | `engine.test` route change, `observer.test` | covered (fixtures only) |
| FR-005 preserve behaviour | Adapter | P0 | `engine.test` no DOM mutation, e2e ads/consent/form intact | covered (fixtures only) |
| FR-006 modern-only fallbacks | Adapter | P1 | none | **gap** |
| FR-007 health + safe disable | Engine | P0 | `health.test`, `engine.test` fail-open, e2e fail-open | covered |
| FR-008 zoom 80–200%, 1024–2560px | QA | P1 | e2e viewport matrix 512–2560px (512/720 stand in for 200%/140% zoom): attributes persist, no horizontal overflow | partial (fixtures; real browser zoom not driven) |
| FR-009 reduced motion | Engine | P1 | `style-manager.test`, e2e (system emulation and forced pref) | covered |
| FR-010 authentic/compatibility | Adapter | P2 | `engine.test` mode attribute | partial (compatibility styling minimal) |
| FR-011 never change search/outbound | Security | P0 | `routes.test`, manifest permission tests (no search overrides) | covered |
| FR-012 skip auth/payment/CAPTCHA | Adapter | P0 | `routes.test`, `routes-sites.test`, `css-safety.test`, `sites.test` (login never styled), e2e (no attribute write on a login fixture), live logged-out facebook.com and Google CAPTCHA page left native; ADR-026 allows one decorative bar on the Facebook landing page (form untouched, `sites.test` and e2e) | covered |
| NFR perf/memory budgets | QA | P1 | `perf.test` sanity checks only (jsdom, loose thresholds) | **gap**: no Chrome traces, no memory measurement |
| NFR no network, no analytics | Security | P0 | e2e request log, `audit-package.mjs` | covered |
| NFR keyboard/a11y of extension UI | QA | P1 | e2e axe scan (WCAG 2.0/2.1 A/AA) of popup and options | covered (themed sites not audited) |
| Live-site selector validity | Adapter | P0 | `scripts/live-check.mjs`, manual, logged out | partial: Google home, YouTube home/results/watch, Facebook login wall verified; Google results and all signed-in pages **not** verified |

## 1.7 Review gate G1
Reviewer verifies every requirement has an owner, measurable acceptance test, and severity. Must approve scope and non-goals before architecture starts. Deliver signed checklist, unresolved questions, and change requests.
