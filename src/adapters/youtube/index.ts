import type { SiteAdapter } from '../../shared/types';
import { evaluateProbes } from '../probe';
import { syncHomeTabs, unmountHomeTabs, watchHomeTabs } from './home-tabs';
import { matchesYoutube, routeFromUrl, type YoutubeRoute } from './routes';
import { PROBES } from './selectors';

export const YOUTUBE_ADAPTER_VERSION = '0.1.0';

/**
 * YouTube is styled purely by CSS scoped to html[data-retroweb="youtube"]. The
 * player, ads, consent and dialogs are never touched. Because YouTube is a
 * single-page app, route changes arrive via its own `yt-navigate-finish` event
 * (a plain DOM event, so no page-world code is injected).
 */
/**
 * The 2012 order puts the title and owner rows above the player, so the player sits lower than
 * in modern YouTube. YouTube focuses the player after load, and the browser scrolls it fully into
 * view, which on shorter windows jumps the page down and hides the title. We cannot style the
 * player (exclusion zone), so instead: if the page moved by itself and the person has not
 * scrolled or pressed a key, put it back at the top. Any input stops the correction.
 */
export const SCROLL_SETTLE_MS: readonly number[] = [300, 1000, 2500, 5000];
const INPUT_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

let stopHolding: (() => void) | null = null;
let heldFor = '';

function holdScrollAtTop(doc: Document, key: string): void {
  const win = doc.defaultView;
  if (!win || heldFor === key) return;
  stopHolding?.();
  heldFor = key;
  let touched = false;
  const onInput = () => {
    touched = true;
  };
  for (const ev of INPUT_EVENTS) win.addEventListener(ev, onInput, { passive: true, once: true });
  const timers = SCROLL_SETTLE_MS.map((ms) =>
    win.setTimeout(() => {
      if (!touched && win.scrollY > 0) win.scrollTo(0, 0);
    }, ms),
  );
  stopHolding = () => {
    for (const t of timers) win.clearTimeout(t);
    for (const ev of INPUT_EVENTS) win.removeEventListener(ev, onInput);
    stopHolding = null;
    heldFor = '';
  };
}

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
  // The home page gets the two-tab strip over the chip bar; the early script starts the watcher.
  earlyWatch: watchHomeTabs,
  mount(ctx) {
    if (ctx.route === 'watch') holdScrollAtTop(ctx.document, ctx.url.href);
    syncHomeTabs(ctx.document);
  },
  // Route changes keep the adapter mounted, so a new watch page is noticed here.
  refresh(ctx) {
    if (ctx.route === 'watch') holdScrollAtTop(ctx.document, ctx.url.href);
    syncHomeTabs(ctx.document);
  },
  unmount(ctx) {
    stopHolding?.();
    unmountHomeTabs(ctx.document);
  },
};
