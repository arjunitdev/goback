import { afterEach, describe, expect, it } from 'vitest';
import { TABS_ID, syncHomeTabs, unmountHomeTabs } from '../../src/adapters/youtube/home-tabs';

type R = { x: number; y: number; width: number; height: number };
const NONE: R = { x: 0, y: 0, width: 0, height: 0 };

function page(attrs: Record<string, string> = {}) {
  const root = document.documentElement;
  const all = {
    'data-retroweb': 'youtube',
    'data-retroweb-route': 'home',
    'data-retroweb-mode': 'authentic',
    'data-retroweb-scheme': 'light',
    ...attrs,
  };
  for (const [k, v] of Object.entries(all)) root.setAttribute(k, v);
  document.body.innerHTML = `
    <ytd-feed-filter-chip-bar-renderer id="bar">
      <div id="chips-wrapper"><button>All</button></div>
    </ytd-feed-filter-chip-bar-renderer>`;
  const wrapper = document.getElementById('chips-wrapper')!;
  const rectOf = (el: Element): R =>
    el === wrapper ? { x: 220, y: 56, width: 1100, height: 48 } : NONE;
  return { rectOf };
}

afterEach(() => {
  unmountHomeTabs(document);
  document.body.innerHTML = '';
  for (const a of [
    'data-retroweb',
    'data-retroweb-route',
    'data-retroweb-mode',
    'data-retroweb-scheme',
  ]) {
    document.documentElement.removeAttribute(a);
  }
});

describe('youtube home tabs', () => {
  it('draws two real links over the chip bar, sized to its box, with Home current', () => {
    const { rectOf } = page();
    expect(syncHomeTabs(document, { rectOf })).toBe(true);
    const nav = document.getElementById(TABS_ID)!;
    expect(nav.hasAttribute('data-retroweb-injected')).toBe(true);
    expect(
      [...nav.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')]),
    ).toEqual([
      ['Home', 'https://www.youtube.com/'],
      ['Trending', 'https://www.youtube.com/feed/trending'],
    ]);
    expect(nav.querySelector('a[aria-current="page"]')?.textContent).toBe('Home');
    expect([nav.style.left, nav.style.top, nav.style.width, nav.style.height]).toEqual([
      '220px',
      '56px',
      '1100px',
      '48px',
    ]);
    // The chips are still in the page, untouched.
    expect(document.querySelector('#chips-wrapper button')?.textContent).toBe('All');
  });

  it('is idempotent and follows the bar when its box changes', () => {
    const { rectOf } = page();
    syncHomeTabs(document, { rectOf });
    syncHomeTabs(document, { rectOf });
    expect(document.querySelectorAll('#' + TABS_ID)).toHaveLength(1);
    const wider = (el: Element): R =>
      el.id === 'chips-wrapper' ? { x: 72, y: 56, width: 1250, height: 48 } : NONE;
    syncHomeTabs(document, { rectOf: wider });
    expect(document.getElementById(TABS_ID)?.style.left).toBe('72px');
  });

  it('is absent off the home route, in compatibility mode, on dark pages, or without a visible bar', () => {
    const cases: Record<string, string>[] = [
      { 'data-retroweb-route': 'watch' },
      { 'data-retroweb-mode': 'compatibility' },
      { 'data-retroweb-scheme': 'dark' },
    ];
    for (const attrs of cases) {
      const { rectOf } = page(attrs);
      expect(syncHomeTabs(document, { rectOf }), JSON.stringify(attrs)).toBe(false);
      expect(document.getElementById(TABS_ID)).toBeNull();
    }
    page();
    expect(syncHomeTabs(document, { rectOf: () => NONE })).toBe(false);
  });

  it('removes the strip when the page stops being the home page', () => {
    const { rectOf } = page();
    syncHomeTabs(document, { rectOf });
    document.documentElement.setAttribute('data-retroweb-route', 'watch');
    expect(syncHomeTabs(document, { rectOf })).toBe(false);
    expect(document.getElementById(TABS_ID)).toBeNull();
  });
});
