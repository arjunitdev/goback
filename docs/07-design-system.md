# 07 — Historical design system, icons, loaders

## 7.1 Token catalog
Per site and route: primary/secondary/background colors; text/disabled/link colors; border/hover/active/focus colors; contrast ratios; font family/size/weight/line-height; spacing scale; widths/heights; radius; shadow; z-index; thumbnail aspect ratios; icon grid and stroke weights; spinner timing/easing. Values remain `TBD-EVIDENCE` until measured from dated sources.

## 7.2 Asset pipeline
Each icon has ID, intended use, historic reference URL/date, screenshot crop hash, ownership/licensing status, independently recreated SVG path or approved license, dimensions, color variants, QA reviewer. Use own original artwork or licensed assets where exact historic files cannot legally be bundled. Avoid claiming exact original icon if recreated. Logos/trademarks require special review; rely on live site's own assets when appropriate and permitted, not downloaded archive copies.

## 7.3 Loader and motion catalog
Enumerate initial page, search, infinite feed, video buffering, image lazy load, button pending, navigation, modal loading, error and retry. For each: source evidence, shape, frame count, duration, easing, stop condition, aria-busy/live semantics, reduced-motion alternative, timeout/failure fallback. Only style loading states actually reported by host page; never create misleading progress.

## 7.4 Fidelity scoring
Weighted score: layout 30%, typography/spacing 20%, colors/contrast 15%, iconography 15%, loading/motion 10%, responsive behavior 10%. Score on fixed reference viewport and state; report per-route score, evidence confidence and deviations. Initial target >=90% on evidence-backed elements, subject to feasibility and rights. Pixel diffs alone are insufficient because live content varies.

## 7.5 Accessibility guardrails
Visible focus rings; minimum readable font; semantic controls; keyboard focus order; high contrast option; respect `prefers-reduced-motion`; avoid flashing; test zoom; do not hide labels or screen reader instructions. Historic low-contrast palettes can be an opt-in authenticity mode with accessible alternative.

## 7.6 Review gate G7
Designer and engineer jointly sign evidence provenance, asset rights, motion behavior, contrast exceptions, reference screenshots and token accuracy. No unlicensed historical asset enters distribution package.
