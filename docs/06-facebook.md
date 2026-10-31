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

## 6.7 Review gate G6
Independent engineer validates account/privacy integrity, composer and feed behaviors, no sensitive data access, historic reference accuracy, mutation CPU use and graceful disable on DOM changes.
