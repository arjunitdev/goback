import type { Probe } from '../probe';
import type { GoogleRoute } from './routes';

/**
 * Probe selectors. Google's markup changes frequently (R01) and uses hashed
 * class names, so only structural/semantic hooks are used. See ../probe.ts for
 * the pass/fail semantics. The `home` probes were checked against the live
 * logged-out site on 2026-10-31. The `results` and `images` probes could NOT be
 * checked (Google serves a CAPTCHA to automated browsers) and remain unverified.
 */

const SEARCH_BOX: Probe = {
  name: 'search-box',
  any: ['textarea[name="q"]', 'input[name="q"]'],
  required: true,
};

export const PROBES: Record<GoogleRoute, readonly Probe[]> = {
  home: [SEARCH_BOX, { name: 'search-form', any: ['form[action="/search"]'], required: false }],
  results: [
    SEARCH_BOX,
    { name: 'results-container', any: ['#search', '#rso', '#center_col'], required: true },
    { name: 'tools-bar', any: ['#hdtb', '[role="navigation"]'], required: false },
    { name: 'footer', any: ['#foot', '#footcnt', '#botstuff'], required: false },
  ],
  images: [
    SEARCH_BOX,
    { name: 'images-grid', any: ['#search', '#islrg', '#islmp'], required: false },
  ],
};

/**
 * Exclusion zones (docs/05 §5.4, FR-010–012, R10). The stylesheet must never
 * target these; tests assert it. Listed here so the intent lives next to the probes.
 */
export const EXCLUDED_SELECTOR_FRAGMENTS: readonly string[] = [
  '#tads',
  '#tadsb',
  '#bottomads',
  '[data-text-ad]',
  '[aria-label*="Sponsored"]',
  '[aria-label*="Ad"]',
  'form[action*="consent"]',
  '[data-consent]',
  '#CXQnmb',
  'input[type="password"]',
  '#safeui',
  '[name="safe"]',
  'g-recaptcha',
  '#recaptcha',
  '[aria-modal]',
  '[role="alertdialog"]',
];
