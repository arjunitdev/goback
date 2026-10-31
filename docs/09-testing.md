# 09 — Test strategy and quality evidence

## 9.1 Test layers
Unit: tokens, route matching, preferences migration, feature flags, mutation batching, adapter teardown. Integration: DOM fixtures and route transitions, duplicate event prevention, unsupported selector fallback. E2E: Chrome stable/beta on Windows/macOS/Linux as resources permit, signed-out and approved signed-in accounts. Visual: stable fixtures and archived references. Accessibility: keyboard, screen reader smoke, contrast, zoom, reduced motion. Performance: CPU/memory, long tasks, layout shift, loading flash. Security: permissions, data access, network audit.

## 9.2 Matrix
Each site x home/content/search/profile as applicable x signed-in/out x light/dark (if site supports) x 1024/1440/1920 x 100/200% zoom x browser stable/beta x authenticity/compatibility mode x reduced motion. Prioritize pairwise matrix plus explicit P0 cases rather than full Cartesian explosion. Document unsupported states.

## 9.3 Test fixtures
No real private user data in screenshots. Use synthetic content or approved test accounts. Archive reference images stored separately from distributable package. Record viewport, DPR, locale, theme, feature flags, date and DOM signature. Mask variable text/timestamps and ads for visual comparisons without masking functional assertions.

## 9.4 CI gates
On PR: typecheck, lint, unit, bundle scan, permissions diff, license scan, smoke tests. Nightly: full e2e, visual, accessibility and performance budgets. Pre-release: signed artifact integrity, security manual review, reproducible package build, store metadata and privacy audit.

## 9.5 Failure handling
P0: login/privacy/player/search/posting blocked; release blocker. P1: important feature broken, substantial visual break, high CPU; fix before release unless explicitly waived with reviewer evidence. P2: minor spacing/icon inconsistency; backlog with owner. P3: cosmetic edge. Collect reproduction URL pattern without personal query values, screenshot with sensitive content removed, browser/version, adapter version, steps, expected/actual, regression hash.

## 9.6 Acceptance metrics
All P0 pass; no open high security; no data exfiltration; historical fidelity score >=90% on measured evidence-backed states; performance budgets from requirements; accessibility issues triaged and critical barriers resolved. If budgets cannot be achieved, revise with measured rationale and independent approval rather than silently relaxing them.

## 9.7 Review gate G9
QA lead signs coverage matrix, reports, screenshot diffs, P0 list, performance traces, accessibility findings, security scan and defect disposition. No self-approval by implementer.
