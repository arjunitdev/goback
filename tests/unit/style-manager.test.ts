import { describe, expect, it } from 'vitest';
import {
  ATTR,
  applyStyleState,
  clearStyleState,
  effectiveReducedMotion,
} from '../../src/engine/style-manager';

const base = {
  site: 'google' as const,
  route: 'results',
  mode: 'authentic' as const,
  motion: 'system' as const,
  highContrast: false,
  wordmark: false,
};

describe('style manager', () => {
  it('sets and clears every attribute it owns', () => {
    const root = document.createElement('html');
    applyStyleState(root, { ...base, highContrast: true, wordmark: true }, true);
    expect(root.getAttribute(ATTR.site)).toBe('google');
    expect(root.getAttribute(ATTR.route)).toBe('results');
    expect(root.getAttribute(ATTR.mode)).toBe('authentic');
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
