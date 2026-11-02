import type { AdapterContext, SiteAdapter } from '../../shared/types';
import { evaluateProbes } from '../probe';
import { hasLandingBar, isLoginLanding, mountLandingBar, unmountLandingBar } from './chrome';
import { clearHeader, markHeaderNow } from './header';
import { FB_HINT_KEY, rememberSignedIn } from './hint';
import { matchesFacebook, routeFromUrl, type FacebookRoute } from './routes';
import { FORBIDDEN, PROBES } from './selectors';

export const FACEBOOK_ADAPTER_VERSION = '0.1.0';

/**
 * Facebook is styled purely by CSS scoped to html[data-retroweb="facebook"].
 * `earlyStyle: false` is deliberate: the first paint at `/` may be the login wall, which must
 * not be restyled. Attributes are therefore set only after a probe confirms either a signed-in
 * shell (banner + main landmarks, no password field) or the logged-out landing page, where the
 * only change is one empty decorative bar above the page (ADR-026); the login form is untouched.
 * The adapter reads element existence only: never posts, messages, names or form values.
 */
function syncLandingBar(ctx: AdapterContext): void {
  if (ctx.route === 'feed' && ctx.site.mode === 'authentic' && isLoginLanding(ctx.document)) {
    mountLandingBar(ctx.document);
    clearHeader(ctx.document);
  } else {
    unmountLandingBar(ctx.document);
    // Signed-in pages: find the real header layers so the stylesheet can paint them (see ./header.ts).
    if (ctx.site.mode === 'authentic') markHeaderNow(ctx.document);
    else clearHeader(ctx.document);
  }
}

export const facebookAdapter: SiteAdapter = {
  id: 'facebook',
  version: FACEBOOK_ADAPTER_VERSION,
  matches: matchesFacebook,
  detectRoute: (_doc, url) => routeFromUrl(url),
  probe(doc, route) {
    // Landing page: supported once the bar is in place. The stylesheet then leaves the form alone.
    if (route === 'feed' && isLoginLanding(doc)) {
      rememberSignedIn(false);
      const ready = hasLandingBar(doc);
      return { supported: ready, missing: ready ? [] : ['landing-bar'] };
    }
    const outcome = evaluateProbes(doc, PROBES[route as FacebookRoute], FORBIDDEN);
    if (outcome.supported) rememberSignedIn(true);
    else if (outcome.missing.some((m) => m.startsWith('blocked:'))) rememberSignedIn(false);
    return outcome;
  },
  earlyStyle: false,
  earlyHintKey: FB_HINT_KEY,
  mount: syncLandingBar,
  refresh: syncLandingBar,
  unmount(ctx) {
    clearHeader(ctx.document);
    unmountLandingBar(ctx.document);
  },
};
