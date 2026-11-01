# 04 — YouTube 2012 implementation specification

## 4.1 Historical baseline
Provisional early-2012 post-December-2011 redesign; official YouTube blog documents a cleaner homepage/watch page, consistent background and larger thumbnails. Archive-led verification required before exact visual values are frozen.

## 4.2 Route inventory
Home `/`; watch `/watch?v=...`; search `/results?search_query=...`; channel `/@...` and `/channel/...`; subscriptions; playlists; Shorts; live; settings; history; notifications; sign-in boundaries. Account for A/B experiments, localization and logged-out states.

## 4.3 Component inventory
Global header, logo region, search field/button, upload/create, account menu, sidebar/navigation, feed tiles, thumbnails, metadata, watch video/player boundary, title/description, engagement buttons, channel badge, subscribe button, comments/replies, recommendations, progress indicators, pagination/infinite scroll, skeleton loaders, toast/dialog, dropdown, tooltip, empty/error states.

## 4.4 Feature crosswalk
Keep current player, playback speed, captions, chapters, theater/fullscreen, casting, miniplayer, live chat, memberships, Shorts, playlists, notifications, creator tools, search suggestions, moderation and safety notices. Modern features absent in 2012 receive 'compatibility' visual wrappers matching 2012 palette and shape; never fabricate legacy functionality.

## 4.5 Implementation sequence
A. Header and global color/typography tokens. B. Home grid and navigation. C. Search results. D. Watch layout without replacing player. E. Channel and playlists. F. Shorts/live compatibility. G. Modal/menu/loading states. H. Responsive and keyboard audit. For each: snapshot reference, selectors/probes, CSS, behavioral tests, visual diff, peer review.

## 4.6 Critical test cases
Video plays, pauses, seeks, captions and fullscreen; ads and consent remain functional; autoplay toggles; login/logout unaffected; comment posting/replies; subscribe/unsubscribe; playlist actions; search suggestions; browser back/forward; Shorts and live chat; no blank player after route transitions. Test signed-in/signed-out where authorized.

## 4.7 Loading design
Style skeletons and spinner containers when exposed by stable DOM. Avoid fake indefinite spinners, blocked interactions, or intercepting requests. When historical loader not evidenced, use explicitly documented approximation.

## 4.7.1 Pilot design tokens (all confidence = `inferred`)
Source of truth: `src/styles/tokens/youtube.tokens.css`.

| Token | Value | Use |
|---|---|---|
| `--rw-yt-font` | `arial, sans-serif` | All text outside the player/popups (authentic mode) |
| `--rw-yt-page` | `#f1f1f1` | Page background (light pages only) |
| `--rw-yt-masthead-top/bottom` | `#fcfcfc` → `#f1f1f1` | Masthead gradient |
| `--rw-yt-border` | `#d3d3d3` | Masthead bottom border |
| `--rw-yt-radius` | `2px` | Buttons and search box; thumbnails are square (0) |

**Open question (ADR-001):** whether the early-2012 masthead was light or dark could not be settled from memory. The light variant is used because it keeps every native icon and label readable. Do not call it "accurate" until G2 resolves this from dated captures.

## 4.7.2 Live verification record (2026-10-31, logged out, one page load each)
| Route | Result |
|---|---|
| Home | Probes pass, `healthy`. Grey page, Arial, square thumbnails/search box, masthead gradient, look-alike wordmark applied. |
| Results `/results?search_query=music` | `healthy`. A sponsored result was present and remained intact and labelled. |
| Watch `/watch?v=…` | `healthy`. The player kept its own font and shape; the video loaded (`readyState` 4). |

Defect found: on a cold, slow load YouTube rendered `ytd-search` after the original ~4.6s retry window and the engine wrongly failed open. The window is now ~20s (ADR-014). Not verified: signed-in pages, Shorts, live chat, channel/playlist/feed routes, consent screens, any non-US locale, or ad playback on watch pages.

## 4.8 Review gate G4
Engineer verifies visual annotations against 2012 evidence, all P0 playback workflows, no ad/consent bypass, no leaked listeners, route transition recovery, and fallback for unsupported experiments.
