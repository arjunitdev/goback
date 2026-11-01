import { describe, expect, it } from 'vitest';
import {
  ATTR,
  applyStyleState,
  clearStyleState,
  detectScheme,
  effectiveReducedMotion,
} from '../../src/engine/style-manager';

const base = {
  site: 'google' as const,
  route: 'results',
  mode: 'authentic' as const,
  motion: 'system' as const,
  highContrast: false,
  wordmark: false,
  scheme: 'light' as const,
};

describe('style manager', () => {
  it('sets and clears every attribute it owns', () => {
    const root = document.createElement('html');
    applyStyleState(root, { ...base, highContrast: true, wordmark: true }, true);
    expect(root.getAttribute(ATTR.site)).toBe('google');
    expect(root.getAttribute(ATTR.route)).toBe('results');
    expect(root.getAttribute(ATTR.mode)).toBe('authentic');
    expect(root.getAttribute(ATTR.scheme)).toBe('light');
    expect(root.getAttribute(ATTR.motion)).toBe('reduce');
    expect(root.getAttribute(ATTR.contrast)).toBe('high');
    expect(root.getAttribute(ATTR.wordmark)).toBe('on');
    clearStyleState(root);
    expect(root.getAttributeNames()).toEqual([]);
  });

  it('removes optional flags when they turn off', () => {
    const root = document.createElement('html');
    applyStyleState(root, { ...base, highContrast: true }, false);
    applyStyleState(root, base, false);
    expect(root.hasAttribute(ATTR.contrast)).toBe(false);
    expect(root.hasAttribute(ATTR.motion)).toBe(false);
  });

  it('never allows motion when the system asks for reduced motion (FR-009)', () => {
    expect(effectiveReducedMotion('system', true)).toBe(true);
    expect(effectiveReducedMotion('system', false)).toBe(false);
    expect(effectiveReducedMotion('reduce', false)).toBe(true);
  });
});

describe('detectScheme', () => {
  const page = (bodyBg: string, htmlBg = '') => {
    document.documentElement.style.backgroundColor = htmlBg;
    document.body.style.backgroundColor = bodyBg;
    return detectScheme(document, false);
  };

  it('classifies the page background, not the system preference', () => {
    expect(page('rgb(32, 33, 36)')).toBe('dark'); // Google dark
    expect(page('rgb(255, 255, 255)')).toBe('light');
    expect(page('rgb(235, 235, 235)')).toBe('light'); // YouTube 2012 grey (#ebebeb, measured)
    expect(page('rgb(15, 15, 15)')).toBe('dark'); // YouTube dark
    expect(page('#18191a')).toBe('dark'); // Facebook dark
  });

  it('falls through transparent body to <html>', () => {
    expect(page('transparent', 'rgb(30, 30, 30)')).toBe('dark');
    expect(page('rgba(0, 0, 0, 0)', 'rgb(250, 250, 250)')).toBe('light');
  });

  it('uses the system scheme only when the page paints no background', () => {
    document.documentElement.style.backgroundColor = '';
    document.body.style.backgroundColor = '';
    expect(detectScheme(document, true)).toBe('dark');
    expect(detectScheme(document, false)).toBe('light');
  });
});

describe('light lock (dark-theme attribute held off in Authentic mode)', () => {
  const tick = () => new Promise<void>((r) => setTimeout(r, 0));
  const lockState = {
    site: 'youtube' as const,
    route: 'watch',
    mode: 'authentic' as const,
    motion: 'system' as const,
    highContrast: false,
    wordmark: false,
    scheme: 'light' as const,
    lockLightAttr: 'dark',
  };

  it('removes the dark attribute, remembers its name, and restores it on clear', () => {
    const root = document.createElement('html');
    root.setAttribute('dark', '');
    applyStyleState(root, lockState, false);
    expect(root.hasAttribute('dark')).toBe(false);
    expect(root.getAttribute(ATTR.hadDark)).toBe('dark');
    clearStyleState(root);
    expect(root.hasAttribute('dark')).toBe(true);
    expect(root.hasAttribute(ATTR.hadDark)).toBe(false);
    expect(root.getAttributeNames()).toEqual(['dark']);
  });

  it('strips the attribute again if the site script re-adds it, then stands down after clear', async () => {
    const root = document.createElement('html');
    applyStyleState(root, lockState, false);
    root.setAttribute('dark', ''); // the site's own script
    await tick();
    expect(root.hasAttribute('dark')).toBe(false);

    // The site wanted dark, so clearing gives it back.
    clearStyleState(root);
    expect(root.hasAttribute('dark')).toBe(true);

    // And the lock observer is gone: the site is free to toggle the attribute again.
    root.removeAttribute('dark');
    await tick();
    root.setAttribute('dark', '');
    await tick();
    expect(root.hasAttribute('dark')).toBe(true);
  });

  it('Compatibility mode does not lock and puts a removed attribute back', () => {
    const root = document.createElement('html');
    root.setAttribute('dark', '');
    applyStyleState(root, lockState, false);
    expect(root.hasAttribute('dark')).toBe(false);
    applyStyleState(root, { ...lockState, mode: 'compatibility', lockLightAttr: undefined }, false);
    expect(root.hasAttribute('dark')).toBe(true);
  });

  it('never forces the scheme: it reports what the caller measured', () => {
    const root = document.createElement('html');
    applyStyleState(root, { ...lockState, scheme: 'dark' }, false);
    expect(root.getAttribute(ATTR.scheme)).toBe('dark');
  });
});
