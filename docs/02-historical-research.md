# 02 — Historical research and archive protocol

## 2.1 Historical date selection
2012 contained multiple designs and experiments. Establish canonical snapshots by product and route, with exact capture date and geography, not merely '2012'. Proposed starting candidates: YouTube Q1–Q2 2012 post-December-2011 redesign; Google Search Q4 2012 after November desktop redesign; Facebook Q1–Q2 2012 Timeline era. These are **provisional**, to be confirmed from dated visual evidence and signed by design reviewer. Include alternative variants if evidence reveals important within-year differences.

## 2.2 Source hierarchy
A: first-party dated screenshots, blog posts, official design documentation. B: Internet Archive captures with verifiable timestamps and original context. C: dated independent press screenshots/video. D: community recollections and recreated themes (reference only, never authoritative). Record disagreements and confidence. Wayback archives may omit dynamic content or resources; never assume archive fidelity.

## 2.3 Archival capture procedure (researcher, not yet executed)
1. Inventory routes: home, results, video, profile, feed, menus, loading and error states.
2. Query `https://web.archive.org/web/2012/https://www.youtube.com/`, `https://web.archive.org/web/2012/https://www.google.com/`, `https://web.archive.org/web/2012/https://www.facebook.com/` and month-specific snapshots. Verify the actual archive timestamp shown; archive captures can redirect or fail.
3. Save source URL, timestamp, page type, viewport, region, logged-in state, screenshot location, rights status, researcher initials, and SHA-256 of any lawfully retained file.
4. Seek first-party announcements and contemporary reviews to corroborate typography, layout, icons and animations.
5. Annotate dimensions (pixel grid, header height, content max width, gutters, colors, font metrics, borders, radii, shadow, hover/focus), responsive changes and loading sequence.
6. Capture archived images solely in an internal evidence vault subject to terms and rights; do not automatically bundle archived assets.
7. Identify missing states and recreate through independently authored designs clearly labeled inferred.
8. Record unresolved evidence gaps and assign a confidence level: verified, corroborated, inferred, unknown.

## 2.4 Evidence ledger schema
`id, site, route, date_utc, archive_url, source_type, source_title, viewport, logged_in_state, locale, claim, measurements, file_sha256, rights_status, confidence, reviewer, notes`.

## 2.5 Artifact set per page
Reference screenshot at 1440x900, layout annotation, token sheet, component inventory, state matrix (idle/hover/focus/active/loading/error/empty), functional crosswalk, and evidence ledger links. Do not fabricate screenshots when Wayback cannot render them.

## 2.6 Historical animation investigation
Capture frame-by-frame only where archival video or documented code permits. Record cycle time, easing, dimensions, sprite frames, pause/resume behavior, reduced-motion alternative. When unverified, label animation as 'historically inspired' instead of 'original'.

## 2.7 Review gate G2
Independent reviewer audits >=2 corroborating sources for each high-impact component, verifies timestamp, confirms no source was misdated, reviews rights metadata and approves canonical snapshot dates. Missing essential evidence blocks 'pixel-accurate' claims.
