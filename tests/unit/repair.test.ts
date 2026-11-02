import { afterEach, describe, expect, it } from 'vitest';
import { FIX_ATTR, clearRepairs, repairLeaks } from '../../src/adapters/google/repair';

const visible = () => true;

function page(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('google dark-leak repair', () => {
  it('marks pale text on a white page and leaves readable text alone', () => {
    const doc = page(
      `<div style="background:#fff">
         <span id="ghost" style="color:rgb(232,232,232)">Meet</span>
         <a id="ghostlink" href="#" style="color:rgb(232,232,232)">Account</a>
         <span id="mid" style="color:rgb(167,169,178)">Show more</span>
         <span id="ok" style="color:#222">Readable</span>
         <span id="grey" style="color:#70757a">Date</span>
       </div>`,
    );
    repairLeaks(doc, { isVisible: visible });
    expect(doc.getElementById('ghost')?.getAttribute(FIX_ATTR)).toBe('text');
    expect(doc.getElementById('ghostlink')?.getAttribute(FIX_ATTR)).toBe('link');
    expect(doc.getElementById('mid')?.getAttribute(FIX_ATTR)).toBe('muted');
    expect(doc.getElementById('ok')?.hasAttribute(FIX_ATTR)).toBe(false);
    expect(doc.getElementById('grey')?.hasAttribute(FIX_ATTR)).toBe(false);
  });

  it('leaves pale text on a dark or image background alone', () => {
    const doc = page(
      `<div style="background:#222"><span id="chip" style="color:#eee">4:08</span></div>
       <div style="background-image:url(x.png)"><span id="badge" style="color:#eee">Sale</span></div>`,
    );
    expect(repairLeaks(doc, { isVisible: visible })).toBe(0);
  });

  it('marks pale icon fills and dark-coloured fade gradients, and clears them again', () => {
    const doc = page(
      `<svg id="gear" style="fill:rgb(232,234,237)"><path id="p" d="M0 0h1v1z"/></svg>
       <div id="fade" style="background-image:linear-gradient(rgba(0,0,0,0) 0px, rgba(34,36,42,0.9) 52px, rgb(255,255,255) 80px)"></div>`,
    );
    repairLeaks(doc, { isVisible: visible });
    expect(doc.getElementById('gear')?.getAttribute(FIX_ATTR)).toBe('icon');
    expect(doc.getElementById('fade')?.getAttribute(FIX_ATTR)).toBe('fade');
    clearRepairs(doc);
    expect(doc.querySelector(`[${FIX_ATTR}]`)).toBeNull();
  });
});
