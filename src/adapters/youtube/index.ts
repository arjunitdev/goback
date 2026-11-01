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
  // YouTube's dark theme is the `dark` attribute on <html>; the 2012 site had no dark theme.
  forceLightAttr: 'dark',
  // Pure-CSS adapter: a click on a video must not drop and rebuild the theme.
  keepOnRouteChange: true,
  // YouTube inserts thousands of nodes per page; watching them all costs more than it tells us.
  // Page swaps happen in <ytd-page-manager> and are also announced by yt-navigate-finish.
  observeRoot: (doc) => doc.querySelector('ytd-page-manager') ?? doc.body ?? doc.documentElement,
  observeShallow: true,
  mount() {},
  refresh() {},
  unmount() {},
};
