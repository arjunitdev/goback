import type { SiteAdapter } from '../../shared/types';
import { evaluateProbes } from '../probe';
import { matchesFacebook, routeFromUrl, type FacebookRoute } from './routes';
import { FORBIDDEN, PROBES } from './selectors';

export const FACEBOOK_ADAPTER_VERSION = '0.1.0';

/**
 * Facebook is styled purely by CSS scoped to html[data-retroweb="facebook"].
 * `earlyStyle: false` is deliberate: the first paint at `/` may be the login
 * wall, which must never be restyled. Attributes are therefore set only after a
 * probe confirms a signed-in shell (banner + main landmarks, no password field).
 * The adapter reads element existence only: never posts, messages, names or form values.
 */
export const facebookAdapter: SiteAdapter = {
  id: 'facebook',
  version: FACEBOOK_ADAPTER_VERSION,
  matches: matchesFacebook,
  detectRoute: (_doc, url) => routeFromUrl(url),
  probe: (doc, route) => evaluateProbes(doc, PROBES[route as FacebookRoute], FORBIDDEN),
  earlyStyle: false,
  mount() {},
  refresh() {},
  unmount() {},
};
