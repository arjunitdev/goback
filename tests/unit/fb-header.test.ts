import { afterEach, describe, expect, it } from 'vitest';
import { HEADER_ATTR, clearHeader, markHeader } from '../../src/adapters/facebook/header';

type R = { x: number; y: number; width: number; height: number };

/**
 * A header like Facebook's: the banner itself is transparent, the dark colour is painted by a wrapper
 * six levels above it, and the search pill sits inside a left cluster.
 */
function page() {
  document.body.innerHTML = `
    <div id="app" style="background:#18191a">
      <div id="paint" style="background:#242526">
        <div id="w1"><div id="w2"><div id="w3"><div id="w4"><div id="w5">
          <div role="banner" id="banner">
            <div id="left"><a href="/" aria-label="Facebook"><svg></svg></a>
              <label id="pill" style="background:#3a3b3c"><input type="search" id="q" /></label></div>
            <div id="right"><button style="background:#3a3b3c"></button></div>
          </div>
        </div></div></div></div></div>
      </div>
    </div>`;
  const by = (id: string) => document.getElementById(id)!;
  const rects = new Map<Element, R>([
    [by('app'), { x: 0, y: 0, width: 1800, height: 2400 }],
    [by('paint'), { x: 0, y: 0, width: 1800, height: 56 }],
    [by('w1'), { x: 0, y: 0, width: 1800, height: 56 }],
    [by('w5'), { x: 0, y: 0, width: 1800, height: 56 }],
    [by('banner'), { x: 0, y: 0, width: 1800, height: 56 }],
    [by('left'), { x: 0, y: 0, width: 300, height: 56 }],
    [by('pill'), { x: 58, y: 8, width: 240, height: 40 }],
    [by('q'), { x: 80, y: 10, width: 200, height: 30 }],
    [by('right'), { x: 1600, y: 0, width: 200, height: 56 }],
  ]);
  const rectOf = (el: Element): R => rects.get(el) ?? { x: 0, y: 0, width: 24, height: 24 };
  // What is painted at an empty point of the bar, topmost first.
  const stackAt = () => ['banner', 'w5', 'w4', 'w3', 'w2', 'w1', 'paint', 'app'].map(by);
  return { doc: document, rects, rectOf, stackAt };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('facebook header measurement', () => {
  it('finds the layer that paints the bar however far above the banner it is, and the search pill', () => {
    const { doc, rectOf, stackAt } = page();
    markHeader(doc, { rectOf, stackAt, viewportWidth: 1800 });
    const kind = (id: string) => doc.getElementById(id)?.getAttribute(HEADER_ATTR);
    expect(kind('paint')).toBe('bar');
    expect(kind('pill')).toBe('search');
    expect(kind('app')).toBeNull(); // page-sized, not part of the header
    expect(kind('left')).toBeNull(); // narrow, transparent
    expect(kind('right')).toBeNull();
    expect(kind('q')).toBeNull(); // the input is not the pill
    expect(doc.querySelector('button')?.hasAttribute(HEADER_ATTR)).toBe(false);
  });

  it('marks nothing without a banner and clears its marks', () => {
    const { doc, rectOf, stackAt } = page();
    markHeader(doc, { rectOf, stackAt, viewportWidth: 1800 });
    clearHeader(doc);
    expect(doc.querySelector(`[${HEADER_ATTR}]`)).toBeNull();
    doc.getElementById('banner')?.removeAttribute('role');
    expect(markHeader(doc, { rectOf, stackAt, viewportWidth: 1800 })).toBe(0);
  });
});
