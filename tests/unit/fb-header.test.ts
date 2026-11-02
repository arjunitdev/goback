import { afterEach, describe, expect, it } from 'vitest';
import { HEADER_ATTR, clearHeader, markHeader } from '../../src/adapters/facebook/header';

type R = { x: number; y: number; width: number; height: number };

/** A header like Facebook's: a banner whose dark colour is painted by an inner row, plus a search pill. */
function page(): { doc: Document; rects: Map<Element, R> } {
  document.body.innerHTML = `
    <div id="wrap" style="background:#18191a">
      <div role="banner" id="banner">
        <div id="row" style="background:#242526">
          <div id="left"><a href="/" aria-label="Facebook"><svg></svg></a>
            <label id="pill" style="background:#3a3b3c"><input type="search" id="q" /></label></div>
          <div id="right"><button style="background:#3a3b3c"></button></div>
        </div>
      </div>
    </div>`;
  const by = (id: string) => document.getElementById(id)!;
  const rects = new Map<Element, R>([
    [by('wrap'), { x: 0, y: 0, width: 1800, height: 56 }],
    [by('banner'), { x: 0, y: 0, width: 1800, height: 56 }],
    [by('row'), { x: 0, y: 0, width: 1800, height: 56 }],
    [by('left'), { x: 0, y: 0, width: 300, height: 56 }],
    [by('pill'), { x: 58, y: 8, width: 240, height: 40 }],
    [by('q'), { x: 80, y: 10, width: 200, height: 30 }],
    [by('right'), { x: 1600, y: 0, width: 200, height: 56 }],
  ]);
  return { doc: document, rects };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('facebook header measurement', () => {
  it('marks the layers that paint the bar and the search pill, and nothing else', () => {
    const { doc, rects } = page();
    const rectOf = (el: Element): R => rects.get(el) ?? { x: 0, y: 0, width: 24, height: 24 };
    markHeader(doc, { rectOf });
    const kind = (id: string) => doc.getElementById(id)?.getAttribute(HEADER_ATTR);
    expect(kind('row')).toBe('bar');
    expect(kind('wrap')).toBe('bar'); // a wrapper of the same size that paints the dark colour
    expect(kind('pill')).toBe('search');
    expect(kind('left')).toBeNull(); // narrow, transparent
    expect(kind('right')).toBeNull();
    expect(doc.querySelector('button')?.hasAttribute(HEADER_ATTR)).toBe(false);
  });

  it('does not paint page-sized wrappers and clears its marks', () => {
    const { doc, rects } = page();
    rects.set(doc.getElementById('wrap')!, { x: 0, y: 0, width: 1800, height: 2400 });
    const rectOf = (el: Element): R => rects.get(el) ?? { x: 0, y: 0, width: 24, height: 24 };
    markHeader(doc, { rectOf });
    expect(doc.getElementById('wrap')?.hasAttribute(HEADER_ATTR)).toBe(false);
    clearHeader(doc);
    expect(doc.querySelector(`[${HEADER_ATTR}]`)).toBeNull();
  });
});
