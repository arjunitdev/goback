import type { SiteAdapter } from '../../shared/types';
import { evaluateProbes } from '../probe';
import { matchesYoutube, routeFromUrl, type YoutubeRoute } from './routes';
import { PROBES } from './selectors';

export const YOUTUBE_ADAPTER_VERSION = '0.1.0';

/**
 * YouTube is styled purely by CSS scoped to html[data-retroweb="youtube"]. The
 * player, ads, consent and dialogs are never touched. Because YouTube is a
 * single-page app, route changes arrive via its own `yt-navigate-finish` event
 * (a plain DOM event, so no page-world code is injected).
 */
export const youtubeAdapter: SiteAdapter = {
  id: 'youtube',
  version: YOUTUBE_ADAPTER_VERSION,
  matches: matchesYoutube,
  detectRoute: (_doc, url) => routeFromUrl(url),
  probe: (doc, route) => evaluateProbes(doc, PROBES[route as YoutubeRoute]),
  navigationEvents: ['yt-navigate-finish'],
  mount() {},
  refresh() {},
  unmount() {},
};
