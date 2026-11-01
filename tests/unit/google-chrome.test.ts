import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import {
  GBAR_ID,
  GBAR_LINKS,
  GTOOLS_ID,
  GTOOLS_LINKS,
  mountHomeChrome,
  unmountHomeChrome,
} from '../../src/adapters/google/chrome';

/** A page shaped like Google's home: a relatively-positioned, wide wrapper around the field. */
function page(): Document {
  const dom = new JSDOM(
    `<!doctype html><body>
      <form role="search"><div><div id="box" style="position:relative"><textarea name="q"></textarea></div></div></form>
    </body>`,
    { pretendToBeVisual: true },
  );
  // jsdom has no layout: report a field-sized box so the "wide enough" check passes.
  dom.window.Element.prototype.getBoundingClientRect = () =>
    ({ width: 500, height: 40, top: 0, left: 0, right: 500, bottom: 40, x: 0, y: 0, toJSON() {} }) as DOMRect;
  return dom.window.document;
}

describe('Google home chrome (added links)', () => {
  it('adds the services bar and the search tools, marked as injected', () => {
    const doc = page();
    mountHomeChrome(doc);
    const bar = doc.getElementById(GBAR_ID)!;
    expect(bar.hasAttribute('data-retroweb-injected')).toBe(true);
    expect([...bar.querySelectorAll('a')].map((a) => a.textContent)).toEqual(
      GBAR_LINKS.map((l) => l.label),
    );
    expect(bar.querySelector('a[aria-current="page"]')?.textContent).toBe('Search');
    const tools = doc.getElementById(GTOOLS_ID)!;
    expect(tools.parentElement?.id).toBe('box');
    expect([...tools.querySelectorAll('a')].map((a) => a.textContent)).toEqual(
      GTOOLS_LINKS.map((l) => l.label),
    );
  });

  it('is idempotent and removes cleanly', () => {
    const doc = page();
    mountHomeChrome(doc);
    mountHomeChrome(doc);
    expect(doc.querySelectorAll(`#${GBAR_ID}, #${GTOOLS_ID}`)).toHaveLength(2);
    unmountHomeChrome(doc);
    expect(doc.querySelectorAll('[data-retroweb-injected]')).toHaveLength(0);
  });

  it('only links to fixed https addresses on Google properties, with no scripts or handlers', () => {
    const doc = page();
    mountHomeChrome(doc);
    const injected = [...doc.querySelectorAll('[data-retroweb-injected]')];
    for (const root of injected) {
      expect(root.querySelector('script, img, iframe, form, input')).toBeNull();
      for (const el of root.querySelectorAll('*')) {
        expect(el.getAttributeNames().some((n) => n.startsWith('on'))).toBe(false);
      }
      for (const a of root.querySelectorAll('a')) {
        const url = new URL(a.href);
        expect(url.protocol).toBe('https:');
        expect(url.hostname).toMatch(/(^|\.)(google|youtube)\.com$/);
      }
    }
  });

  it('leaves the existing page untouched apart from the two added groups', () => {
    const doc = page();
    const form = doc.querySelector('form')!;
    const before = form.cloneNode(true) as HTMLElement;
    mountHomeChrome(doc);
    doc.getElementById(GTOOLS_ID)?.remove();
    expect(form.outerHTML).toBe(before.outerHTML);
  });

  it('still adds the bar when the search box cannot be found', () => {
    const dom = new JSDOM('<!doctype html><body><p>hi</p></body>');
    mountHomeChrome(dom.window.document);
    expect(dom.window.document.getElementById(GBAR_ID)).not.toBeNull();
    expect(dom.window.document.getElementById(GTOOLS_ID)).toBeNull();
  });
});
