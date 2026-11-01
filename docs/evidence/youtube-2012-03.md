# Evidence ledger — YouTube, March 2012

Measured on 2026-10-31 from Internet Archive captures, using computed styles read from the archived page and values read from its original stylesheets. This file records **facts and sources only**. No archived image, stylesheet or script is stored in this repository (the raw files sit in the git-ignored `evidence-vault/`).

## Sources (source type B: Wayback captures with verified timestamps)
| ID | Page | Archive timestamp (as served) | Notes |
|---|---|---|---|
| YT-1 | `youtube.com/` home | 2012-03-15 00:16:36 | Logged out. Flash-upgrade banner present; ignore it. |
| YT-2 | `youtube.com/watch?v=dQw4w9WgXcQ` | 2012-03-15 16:38:38 | Carries a promotional channel skin (LMFAO/Lady Gaga). **Not a clean baseline**; only used for layout cross-check. |
| YT-3 | `youtube.com/watch?v=jNQXAC9IVRw` ("Me at the zoo") | 2012-03-13 15:33:28 | **Clean baseline** for the watch page. |
| YT-CSS | `s.ytimg.com/yt/cssbin/www-refresh-vflgmBNbk.css` and `…vfl1B0Nkn.css` | 2012-03-14 23:53:44 and 2012-03-15 00:24:44 | Original 2012 stylesheets, read for exact rule values. |

**Excluded:** a `www-core-vflVwkGa_.css` file and a search-results capture resolved to **2013-02** and were discarded so 2013 values cannot contaminate 2012 ones. **No dated 2012 search-results capture was obtained**, so results-page values are extrapolated (below).

## Measured values (confidence: `measured`)
| Element | Value | Source |
|---|---|---|
| Body | background `#ebebeb` + tiled paper texture image; text `#333`; font `arial, sans-serif`; base 12px | YT-1, YT-3 |
| Column | 970px wide, centred | YT-CSS (`#masthead,#masthead-subnav ul {width:970px}`) |
| Masthead | 970px, `padding:10px 0`, height 40px, font 13px; container background `transparent` (no bar) | YT-CSS |
| Logo | `#logo` 100×40, background-sprite offset `-114px -146px` | YT-CSS |
| Search field | height 32px; white; `1px solid #ccc` unfocused; `inset 0 1px 2px #eee`; radius `3px 0 0 3px`; text 13px | YT-3 computed |
| Search button | 35×32; gradient `#fff → #e0e0e0`; border `#ccc`, bottom `#aaa`; radius `0 3px 3px 0`; icon 14×14 at sprite `-163px -102px`, opacity .6 | YT-1 computed, YT-CSS |
| Nav / user links | 13px, `#333`, padding `6px 10px` | YT-CSS |
| Default button (`.yt-uix-button-default`) | height `2.95em`; padding `0 .91em`; `1px solid #ccc` (bottom `#aaa`); radius 3px; gradient `#fff → #e0e0e0`; text `#555` bold 11px; `text-shadow: 0 1px 0 #fff`; `box-shadow: inset 0 0 1px #fff`; hover border `#999`, shadow `0 1px 2px rgba(0,0,0,.25), inset 0 0 3px #fff` | YT-CSS, YT-3 computed |
| Primary button | gradient `#6891e7 → #304ea6`; border `#304ea6 #304ea6 #000`; text `#fff`, `text-shadow: 0 1px 0 rgba(0,0,0,.45)` | YT-CSS |
| Links | `a { color:#1c62b9; text-decoration:none }`, underline on hover | YT-CSS |
| Watch headline | 22px bold `#333`, line-height 25px, margin-bottom 5px | YT-3 computed |
| Player | 640×390 | YT-3 computed |
| Sidebar | 310px wide; 120×90 thumbnails | YT-3 computed |
| Related item | title 13px bold `#333`, line-height 15px, margin-bottom 2px; stats 11px `#666` (computed `#333` on some lines), line-height 15.4px | YT-3 computed |
| Duration badge | black, `opacity .75`, radius 3px, white 11px bold, padding `0 4px`, height 14px, `right:2px; bottom:2px` | YT-3 computed |
| View count | 22px, regular, `#333` | YT-3 computed |
| Uploader line | 11px `#666` | YT-3 computed |
| Description | 13.08px, `#333`, line-height 18.3px | YT-3 computed |
| List item hover (related) | background `#d1e1fa`; title colour `#03c`, visited `#408` | YT-CSS |

## Extrapolated (not in a clean 2012 capture)
Results-page layout and typography, channel pages, playlists, shorts (did not exist), comments styling beyond the 12px/`#333` base, and the home-page "From YouTube" module. These use the measured neighbours above and are **not** claimed as accurate.

## Known limits of a CSS-only restyle
- Modern YouTube serves different layouts to different visitors (A/B tests), for example comments moved to a side panel. CSS can restyle what is present but cannot restore the 2012 page structure for every variant.
- Several 2012 elements have no modern equivalent (the Browse / Movies / Upload links, the green-red like bar, the "Show more" description toggle). They are not fabricated.
- The player and its controls are deliberately left untouched.
