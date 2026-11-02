/**
 * The 2016 YouTube home page had a two-tab strip under the header ("Home", "Trending") where modern
 * YouTube shows a row of topic chips. At the owner's request the strip is drawn over the chip bar:
 *
 *  - one small `nav` with two plain links to fixed, real YouTube addresses (https only, no page text,
 *    no scripts), marked `data-retroweb-injected`, added to <body>;
 *  - it is positioned from the chip bar's own measured box and follows it (resize, scroll, guide
 *    open/close), so it works whatever YouTube's markup does with the bar;
 *  - the chips stay in the page underneath (nothing is deleted, moved or restyled), but are covered,
 *    so the topic filter is not usable while the strip is on (a deliberate trade-off the owner chose);
 *  - shown only on the home route, in Authentic mode, on a light page; removed otherwise.
 */
export const TABS_ID = 'rw-ytnav';

export const TABS: readonly { label: string; href: string }[] = [
  { label: 'Home', href: 'https://www.youtube.com/' },
  { label: 'Trending', href: 'https://www.youtube.com/feed/trending' },
];

/** The visible chip bar, most specific first: the fixed wrapper, the bar, the older cloud element. */
const CHIP_BARS = [
  'ytd-feed-filter-chip-bar-renderer #chips-wrapper',
  'ytd-feed-filter-chip-bar-renderer',
  'yt-chip-cloud-renderer',
];

type Box = { x: number; y: number; width: number; height: number };

export interface TabsOptions {
  /** Tests inject geometry because jsdom has no layout. */
  rectOf?: (el: Element) => Box;
}

let observed: Element | null = null;
let resizeObserver: ResizeObserver | null = null;

function findChipBar(doc: Document, rectOf: (el: Element) => Box): { el: Element; box: Box } | null {
  for (const sel of CHIP_BARS) {
    const el = doc.querySelector(sel);
    if (!el) continue;
    const box = rectOf(el);
    // A real, visible bar: wide and tall enough (a collapsed or hidden one has no size).
    if (box.width >= 300 && box.height >= 30) return { el, box };
  }
  return null;
}

function build(doc: Document): HTMLElement {
  const nav = doc.createElement('nav');
  nav.id = TABS_ID;
  nav.setAttribute('data-retroweb-injected', '');
  nav.setAttribute('aria-label', 'Home and Trending');
  for (const t of TABS) {
    const a = doc.createElement('a');
    a.href = t.href;
    a.textContent = t.label;
    a.rel = 'noopener';
    if (t.label === 'Home') a.setAttribute('aria-current', 'page');
    nav.append(a);
  }
  return nav;
}

function place(nav: HTMLElement, box: Box): void {
  const set = (prop: 'left' | 'top' | 'width' | 'height', v: number) => {
    const px = `${Math.round(v)}px`;
    if (nav.style[prop] !== px) nav.style[prop] = px;
  };
  set('left', box.x);
  set('top', box.y);
  set('width', box.width);
  set('height', box.height);
}

export function unmountHomeTabs(doc: Document): void {
  doc.getElementById(TABS_ID)?.remove();
  resizeObserver?.disconnect();
  resizeObserver = null;
  observed = null;
}

/**
 * Brings the strip in line with the page: shows and positions it over the chip bar when the page is the
 * styled, light home page; removes it otherwise. Returns true while the strip is up.
 */
export function syncHomeTabs(doc: Document, options: TabsOptions = {}): boolean {
  const root = doc.documentElement;
  const wanted =
    root.hasAttribute('data-retroweb') &&
    root.getAttribute('data-retroweb') === 'youtube' &&
    root.getAttribute('data-retroweb-route') === 'home' &&
    root.getAttribute('data-retroweb-mode') === 'authentic' &&
    root.getAttribute('data-retroweb-scheme') === 'light';
  if (!wanted || !doc.body) {
    unmountHomeTabs(doc);
    return false;
  }
  const rectOf = options.rectOf ?? ((el: Element) => el.getBoundingClientRect());
  const bar = findChipBar(doc, rectOf);
  if (!bar) {
    unmountHomeTabs(doc);
    return false;
  }
  let nav = doc.getElementById(TABS_ID);
  if (!nav) {
    nav = build(doc);
    doc.body.append(nav);
  }
  place(nav, bar.box);

  // Follow the bar when it changes size (guide opened or closed, window resized).
  const view = doc.defaultView;
  if (view && typeof view.ResizeObserver === 'function' && observed !== bar.el) {
    resizeObserver?.disconnect();
    resizeObserver = new view.ResizeObserver(() => {
      const current = doc.getElementById(TABS_ID);
      if (current && bar.el.isConnected) place(current, rectOf(bar.el));
    });
    resizeObserver.observe(bar.el);
    observed = bar.el;
  }
  return true;
}

/**
 * Early watcher, started by the document_start script. YouTube builds the home page with script, so the
 * chip bar appears after the first byte; each DOM change schedules one check in requestAnimationFrame,
 * which runs before the frame paints: the strip is up in the frame the bar first appears. The DOM
 * watch stops once the strip is up (or the page is not the home page, or after 15 seconds), and the
 * scroll, resize and navigation listeners keep it in place at no lasting cost.
 */
let watching = false;
export function watchHomeTabs(doc: Document): void {
  const view = doc.defaultView;
  if (!view || watching || typeof view.MutationObserver !== 'function') return;
  watching = true;
  const root = doc.documentElement;
  let scheduled = false;
  let mutations: MutationObserver | null = null;
  let giveUp: ReturnType<typeof setTimeout> | null = null;

  const stopWatching = () => {
    mutations?.disconnect();
    mutations = null;
    if (giveUp) clearTimeout(giveUp);
    giveUp = null;
  };
  const run = () => {
    scheduled = false;
    const up = syncHomeTabs(doc);
    if (up || root.getAttribute('data-retroweb-route') !== 'home') stopWatching();
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    view.requestAnimationFrame(run);
  };
  const startWatching = () => {
    if (mutations) return;
    mutations = new view.MutationObserver(schedule);
    mutations.observe(root, { childList: true, subtree: true });
    giveUp = setTimeout(stopWatching, 15_000);
  };

  startWatching();
  schedule();
  doc.addEventListener('yt-navigate-finish', () => {
    startWatching();
    schedule();
  });
  view.addEventListener('scroll', schedule, { passive: true });
  view.addEventListener('resize', schedule);
}
