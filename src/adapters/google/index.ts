import type { AdapterContext, SiteAdapter } from '../../shared/types';
import { GTOOLS_ID, mountHomeChrome, mountServicesBar, unmountHomeChrome } from './chrome';
import { runProbes } from './features';
import { legibleNow } from './legibility';
import { matchesGoogle, routeFromUrl, type GoogleRoute } from './routes';

export const GOOGLE_ADAPTER_VERSION = '0.1.0';

/**
 * The 2012 chrome is the services bar on every styled page plus the search tools on the home
 * page; both exist in Authentic mode only.
 */
function syncHomeChrome(ctx: AdapterContext): void {
  const doc = ctx.document;
  if (ctx.site.mode !== 'authentic') return unmountHomeChrome(doc);
  if (ctx.route === 'home') return mountHomeChrome(doc);
  if (ctx.route === 'results' || ctx.route === 'images') {
    doc.getElementById(GTOOLS_ID)?.remove(); // the tools belong to the home page only
    return mountServicesBar(doc, ctx.route === 'images' ? 'Images' : 'Search');
  }
  unmountHomeChrome(doc);
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
  probe(doc, route) {
    const outcome = runProbes(doc, route as GoogleRoute);
    // Results pages are unverified live and can carry panels with hard-coded dark-theme text
    // (AI Overviews): if the restyled page is mostly unreadable, fail open to the native page.
    if (outcome.supported && route === 'results' && !legibleNow(doc, doc.location?.href ?? '')) {
      return { supported: false, missing: [...outcome.missing, 'legible-text'] };
    }
    return outcome;
  },
  // Authentic mode holds the theme light with a generated variable pin alone (no attribute to hold).
  pinsLight: true,
  mount: syncHomeChrome,
  refresh: syncHomeChrome,
  unmount: (ctx) => unmountHomeChrome(ctx.document),
};
