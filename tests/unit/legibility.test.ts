import { describe, expect, it } from 'vitest';
import { isLegible, legibleNow } from '../../src/adapters/google/legibility';

function page(paragraphColor: string, count = 30, extra = ''): Document {
  const doc = document; // the jsdom window's own document: a detached one has no view to measure
  doc.body.removeAttribute('style');
  doc.body.style.backgroundColor = 'rgb(255, 255, 255)';
  const html = Array.from({ length: count }, (_, i) => `<p style="color:${paragraphColor}">line ${i}</p>`).join('');
  doc.body.innerHTML = html + extra;
  return doc;
}

const everything = { isVisible: () => true };

describe('legibility guard', () => {
  it('passes dark text on white', () => {
    expect(isLegible(page('rgb(34, 34, 34)'), everything)).toBe(true);
  });

  it('fails pale dark-theme text on white (the AI Overview case)', () => {
    expect(isLegible(page('rgb(232, 234, 237)'), everything)).toBe(false);
  });

  it('passes light text on a dark panel', () => {
    const doc = page('rgb(232, 234, 237)');
    doc.body.style.backgroundColor = 'rgb(32, 33, 36)';
    expect(isLegible(doc, everything)).toBe(true);
  });

  it('does not fail a page where only a little text is pale', () => {
    const doc = page('rgb(34, 34, 34)', 40, '<p style="color:rgb(232,234,237)">faint</p>');
    expect(isLegible(doc, everything)).toBe(true);
  });

  it('ignores tiny samples and text that is mid-fade', () => {
    expect(isLegible(page('rgb(232, 234, 237)', 5), everything)).toBe(true);
    const doc = page('rgb(232, 234, 237)');
    doc.body.style.opacity = '0.4';
    expect(isLegible(doc, everything)).toBe(true);
  });

  it('skips text over images or gradients because the background is unknown', () => {
    const doc = page('rgb(232, 234, 237)');
    doc.body.style.backgroundImage = 'linear-gradient(red, blue)';
    expect(isLegible(doc, everything)).toBe(true);
  });

  it('measures nothing when nothing is on screen (jsdom has no layout)', () => {
    expect(isLegible(page('rgb(232, 234, 237)'))).toBe(true);
  });

  it('rate limits the probe wrapper and resets per address', () => {
    const doc = page('rgb(34, 34, 34)');
    expect(legibleNow(doc, 'https://x/a', 1_000_000)).toBe(true);
    expect(legibleNow(doc, 'https://x/a', 1_000_100)).toBe(true);
    expect(legibleNow(doc, 'https://x/b', 1_000_200)).toBe(true);
  });
});
