import type { AdapterContext, SiteAdapter } from '../../shared/types';
import { mountHomeChrome, unmountHomeChrome } from './chrome';
import { runProbes } from './features';
import { matchesGoogle, routeFromUrl, type GoogleRoute } from './routes';

export const GOOGLE_ADAPTER_VERSION = '0.1.0';

/** The 2012 home chrome (services bar, search tools) exists on the home route only. */
function syncHomeChrome(ctx: AdapterContext): void {
  if (ctx.route === 'home' && ctx.site.mode === 'authentic') mountHomeChrome(ctx.document);
  else unmountHomeChrome(ctx.document);
}

/**
 * Google is styled by CSS scoped to html[data-retroweb="google"]. Nothing existing is reparented,
 * replaced or hidden, so focus, autocomplete, form submission and history stay native. The only
 * additions are the two marked home-page link groups in ./chrome.ts.
 */
export const googleAdapter: SiteAdapter = {
  id: 'google',
  version: GOOGLE_ADAPTER_VERSION,
  matches: matchesGoogle,
  detectRoute: (_doc, url) => routeFromUrl(url),
  probe: (doc, route) => runProbes(doc, route as GoogleRoute),
  // Authentic mode holds the theme light with a generated variable pin alone (no attribute to hold).
  pinsLight: true,
  mount: syncHomeChrome,
  refresh: syncHomeChrome,
  unmount: (ctx) => unmountHomeChrome(ctx.document),
};
