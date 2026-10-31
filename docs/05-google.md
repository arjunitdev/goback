# 05 — Google Search 2012 implementation specification

## 5.1 Historical baseline
Provisional November–December 2012 desktop results redesign, documented by Google's November 6, 2012 Search blog. Google homepage must be researched independently; do not assume results-page layout is the homepage design.

## 5.2 Route inventory
Homepage; results `/search?q=...`; images; news; videos; shopping; maps links; knowledge panels; autocomplete; voice/image search entry points; settings; regional domain variations; signed-in vs anonymous.

## 5.3 Visual inventory
Logo region, top navigation, search field, button, suggestion panel, result title/snippet/URL, knowledge panel, filters/tools, pagination, image grid, inline cards, loading placeholders, no-results/error states, sticky header behavior. Document exact 2012 alignment and spacing per route.

## 5.4 Preservation rules
Never modify query strings, ranking, sponsored labels, ads, result destinations, safe-search controls, privacy prompts, login flows or browser search defaults. Never simulate a Google login dialog. Modern AI results and rich results should use compatibility styling rather than be hidden.

## 5.5 Engineering details
Prefer CSS token/style overrides and grid repositioning over DOM reparenting. Preserve search focus/autocomplete keyboard navigation, enter-to-submit, accessibility announcements, pagination, knowledge panel links, image preview and browser history. Scope selectors to `google.com` supported routes; locale and experiment variation require probes.

## 5.6 Critical tests
Submit query; autocomplete keyboard; sponsored result visibility; AI overview visibility if present; images and news navigation; SafeSearch; login boundary; accessibility; dynamic results expansion; zero changes to URL destination semantics.

## 5.7 Review gate G5
Independent engineer checks reference fidelity, paid-result labeling, functional navigation, privacy/security exclusions, and locale fallback. Reject if any query, ad or result destination is altered.
