import type { Probe } from '../probe';
import type { YoutubeRoute } from './routes';

/**
 * Probe selectors. YouTube is built from custom elements whose tag names are far
 * more stable than its class names, so probes use tags. Checked against the live
 * logged-out home page on 2026-10-31; the other routes are checked by
 * `npm run live-check` as noted in docs/04 §4.8.
 */
const APP: Probe = { name: 'app', any: ['ytd-app'], required: true };
const SEARCH_BOX: Probe = {
  name: 'search-box',
  any: ['input[name="search_query"]', 'yt-searchbox input', 'ytd-searchbox input'],
  required: true,
};
const MASTHEAD: Probe = { name: 'masthead', any: ['ytd-masthead'], required: false };
const GUIDE: Probe = {
  name: 'guide',
  any: ['ytd-guide-renderer', 'ytd-mini-guide-renderer'],
  required: false,
};

export const PROBES: Record<YoutubeRoute, readonly Probe[]> = {
  home: [
    APP,
    SEARCH_BOX,
    { name: 'home-page', any: ['ytd-browse'], required: true },
    MASTHEAD,
    GUIDE,
  ],
  watch: [
    APP,
    SEARCH_BOX,
    { name: 'watch-page', any: ['ytd-watch-flexy'], required: true },
    { name: 'player', any: ['#movie_player', '#player'], required: false },
    MASTHEAD,
  ],
  results: [
    APP,
    SEARCH_BOX,
    { name: 'results-page', any: ['ytd-search'], required: true },
    MASTHEAD,
    GUIDE,
  ],
  channel: [
    APP,
    SEARCH_BOX,
    { name: 'channel-page', any: ['ytd-browse'], required: true },
    MASTHEAD,
  ],
  playlist: [
    APP,
    SEARCH_BOX,
    { name: 'playlist-page', any: ['ytd-browse'], required: true },
    MASTHEAD,
  ],
  feed: [APP, SEARCH_BOX, { name: 'feed-page', any: ['ytd-browse'], required: true }, MASTHEAD],
  shorts: [
    APP,
    SEARCH_BOX,
    { name: 'shorts-page', any: ['ytd-shorts'], required: false },
    MASTHEAD,
  ],
};

/**
 * Exclusion zones (docs/04 §4.8, FR-005, R10): the player, ads, consent and
 * dialogs. The stylesheet must never target these; tests assert it.
 */
export const EXCLUDED_SELECTOR_FRAGMENTS: readonly string[] = [
  '#movie_player',
  '.html5-video-player',
  'ytd-player',
  '#player-container',
  'video',
  'ytd-ad-slot-renderer',
  'ytd-display-ad-renderer',
  'ytd-promoted-sparkles-web-renderer',
  'ytd-in-feed-ad-layout-renderer',
  'ytd-banner-promo-renderer',
  '#player-ads',
  '.ytp-ad',
  'ytd-consent-bump-v2-lightbox',
  'tp-yt-paper-dialog',
  'ytd-popup-container',
  'ytd-report-form-modal-renderer',
  'input[type="password"]',
  '[aria-modal]',
  '[role="dialog"]',
  '[role="alertdialog"]',
];
