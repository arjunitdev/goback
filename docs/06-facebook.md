# 06 — Facebook 2012 implementation specification

## 6.1 Historical baseline
Provisional early-2012 Timeline rollout; Meta documented Timeline availability in January 2012. Distinguish profile Timeline from News Feed: they were not identical. Capture each separately.

## 6.2 Route inventory
News Feed; personal profile; public page; groups; events; photos; videos; notifications; friend requests; comments; composer; messenger entry point; settings/privacy; search; marketplace and stories as modern-only compatibility surfaces. Exclude private messaging contents from inspection and telemetry.

## 6.3 Component inventory
Blue top navigation, search, left rail, central feed, right rail/chat, post composer, post card, reaction/comment/share controls, profile cover/photo, Timeline columns, modal overlays, notification dropdown, loading spinners, photo viewer, privacy selectors, menus, banners and errors. All historic details subject to evidence review.

## 6.4 Preservation and safety
Never read/store posts, private messages, contacts, tokens, session data, or typed form values. Never alter privacy audience selections, reporting/blocking flows, consent screens, authentication or account security. Maintain native React-managed DOM and event listeners; prefer styling existing nodes. Handle virtualized feeds and frequently replaced roots without observer storms.

## 6.5 Implementation sequence
A. Site shell/nav. B. Feed and post cards. C. Profile Timeline. D. Comments/reactions/composer. E. Groups/pages. F. Notifications and overlays. G. New features compatibility. H. Loading states and motion. Use signed-in test accounts with permission and synthetic content only.

## 6.6 Critical tests
Read feed; navigate profile; post/edit/delete synthetic post; react/unreact; comment; share; set privacy audience; notification navigation; group/page navigation; photo modal; scrolling virtualized feed; back/forward; security dialogs remain visible and native. Do not automate real-user mass interactions.

## 6.6.1 Implementation status and verification record (2026-10-31)
- **Implemented:** feed (`/`), profile (single vanity segment or `/profile.php`) and groups routes; everything else (login, checkpoint, recovery, settings, privacy, security, payments, messaging, ads tools, marketplace, events, stories, reels) stays native.
- **Login wall guarantee:** the adapter uses `earlyStyle: false` and a `forbidden` probe (any password field, login form or checkpoint form). Attributes are set only after a probe sees a signed-in shell (banner + main landmarks and no forbidden element), and a login form that appears later removes the theme. Verified by integration and Playwright tests (no attribute is ever written, not even for one frame) **and on the real logged-out facebook.com**: no attributes set, native fonts, native login form; the engine reported `blocked:password-field` and failed open.
- **Not verified:** every signed-in surface. No approved test account was available, so selectors (ARIA landmark roles) and CSS are exercised against synthetic fixtures only. **G6 cannot pass until a human checks a signed-in session** (feed, profile, composer, notifications, photo viewer, security dialogs).
- **Tokens (all `inferred`):** font `lucida grande, tahoma, verdana, arial`; page `#e9eaed`; header `#3b5998` with border `#29447e`; card radius 3px. Source: `src/styles/tokens/facebook.tokens.css`.
- **Privacy:** the adapter only tests that landmark elements exist. It never reads posts, messages, names, form values or tokens, and the stylesheet never targets dialogs, alerts, audience selectors or chat.

## 6.7 Review gate G6
Independent engineer validates account/privacy integrity, composer and feed behaviors, no sensitive data access, historic reference accuracy, mutation CPU use and graceful disable on DOM changes.
