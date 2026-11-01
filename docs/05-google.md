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

## 5.5.1 Pilot design tokens (all confidence = `inferred`)
Source of truth: `src/styles/tokens/google.tokens.css`. None of these were measured from a dated capture; G2 must verify or replace them before any fidelity claim.

| Token | Value | Use |
|---|---|---|
| `--rw-font` | `arial, sans-serif` | Body and results text (authentic mode) |
| `--rw-title` / visited | `#1122cc` / `#6611cc` | Result titles |
| `--rw-url` | `#009933` | Result URL line |
| `--rw-snippet` | `#545454` | Snippet text (not yet applied; hashed class names) |
| `--rw-accent` | `#dd4b39` | Active vertical underline (3px) |
| `--rw-btn-top/bottom/border` | `#4d90fe` / `#4787ed` / `#3079ed` | Results search button |
| `--rw-tools-bg`, `--rw-border` | `#f8f8f8`, `#ebebeb` | Tools bar and dividers |
| Sizes | title 18px, snippet/URL 13px | |

Home-page buttons use the grey 2012 style (`#f2f2f2`, bold 11px). Home and results are separate routes, as required by §5.1.

## 5.5.2 Selector probes (UNVERIFIED against the live site)
`src/adapters/google/selectors.ts`. Required: a search box (`textarea[name=q]` or `input[name=q]`); on results also `#search`, `#rso` or `#center_col`. Optional (downgrade to *degraded* only): `#hdtb`, `#foot`, home form. Three consecutive failed probes (initial + 400/1200/3000 ms retries) trigger **fail-open**: the theme is removed and the native page is shown. Treat all of these as hypotheses until a human checks them on the live site.

Exclusion zones (never targeted by CSS, enforced by `tests/unit/css-safety.test.ts`): `#tads`, `#tadsb`, `#bottomads`, consent forms, SafeSearch controls, password/CAPTCHA, dialogs.

## 5.5.3 Live verification record (2026-10-31, logged out, one page load each)
Tool: `npm run build:test && node scripts/live-check.mjs <dir> <url>` (manual only; never CI).

| Route | Result |
|---|---|
| Home `/` | Probes pass, health `healthy`. Grey-button typography applied. The day's Doodle was left untouched (the swap selector targets `img[alt="Google"]`; seasonal logos use other alt text, which is the desired behaviour). |
| Results `/search?q=…` | **Not verified.** Google served its "unusual traffic" CAPTCHA to the automated browser. The extension correctly left that interstitial native (its path is not a themed route). No attempt was made to bypass it. A human must check results pages manually. |
| Images / other verticals | Not verified (same reason). |

Defect found and fixed by this check: forcing a white `<body>` made light header links unreadable on Google's dark theme. Colour rules are now gated on the measured page scheme (`data-retroweb-scheme='light'`, ADR-012).

## 5.6 Critical tests
Submit query; autocomplete keyboard; sponsored result visibility; AI overview visibility if present; images and news navigation; SafeSearch; login boundary; accessibility; dynamic results expansion; zero changes to URL destination semantics.

## 5.7 Review gate G5
Independent engineer checks reference fidelity, paid-result labeling, functional navigation, privacy/security exclusions, and locale fallback. Reject if any query, ad or result destination is altered.
