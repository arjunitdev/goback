import type { SiteAdapter } from '../../shared/types';
import { runProbes } from './features';
import { matchesGoogle, routeFromUrl, type GoogleRoute } from './routes';

export const GOOGLE_ADAPTER_VERSION = '0.1.0';

/**
 * Google is styled purely by CSS scoped to html[data-retroweb="google"]; the
 * adapter only reports routes and health. No DOM is reparented or replaced, so
 * focus, autocomplete, form submission and history stay entirely native.
 */
export const googleAdapter: SiteAdapter = {
  id: 'google',
  version: GOOGLE_ADAPTER_VERSION,
  matches: matchesGoogle,
  detectRoute: (_doc, url) => routeFromUrl(url),
  probe: (doc, route) => runProbes(doc, route as GoogleRoute),
  mount() {},
  refresh() {},
  unmount() {},
};
