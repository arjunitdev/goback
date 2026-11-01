import type { Forbidden, Probe } from '../probe';
import type { FacebookRoute } from './routes';

/**
 * Facebook uses hashed, constantly rotating class names, so probes use ARIA
 * landmark roles only. LOGGED-IN markup could not be checked (no test account
 * was available); the logged-out login wall was checked on 2026-10-31 and is
 * handled by FORBIDDEN, which keeps the adapter inert there. Treat every
 * probe here as unverified until checked with an approved test account.
 */
const BANNER: Probe = { name: 'banner', any: ['[role="banner"]'], required: true };
const MAIN: Probe = { name: 'main', any: ['[role="main"]'], required: true };
const NAV: Probe = { name: 'navigation', any: ['[role="navigation"]'], required: false };

export const PROBES: Record<FacebookRoute, readonly Probe[]> = {
  feed: [BANNER, MAIN, NAV, { name: 'feed', any: ['[role="feed"]'], required: false }],
  profile: [BANNER, MAIN, NAV],
  groups: [BANNER, MAIN, NAV],
};

/**
 * If any of these exist the page is an authentication surface and must stay
 * native (FR-012, docs/06 §6.4). Evaluated on every probe, so a login form that
 * appears later (session expiry) also drops the theme.
 */
export const FORBIDDEN: readonly Forbidden[] = [
  { name: 'password-field', any: ['input[type="password"]'] },
  {
    name: 'login-form',
    any: ['form[action*="/login"]', '#login_form', '[data-testid="royal_login_form"]'],
  },
  { name: 'checkpoint', any: ['form[action*="checkpoint"]', '[data-testid="checkpoint_title"]'] },
];

/**
 * Exclusion zones (docs/06 §6.4, R07): authentication, dialogs, alerts and
 * privacy-audience controls. The stylesheet must never target these.
 */
export const EXCLUDED_SELECTOR_FRAGMENTS: readonly string[] = [
  'input[type="password"]',
  'form[action*="/login"]',
  '#login_form',
  'royal_login_form',
  'checkpoint',
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="alert"]',
  '[aria-modal]',
  '[aria-label*="audience"]',
  '[aria-label*="Privacy"]',
  '[data-testid*="privacy"]',
  '[data-pagelet*="Chat"]',
];
