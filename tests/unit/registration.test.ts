import { describe, expect, it } from 'vitest';
import { buildManifest } from '../../src/manifest';
import { IMPLEMENTED_SITES, SITE_ORIGINS } from '../../src/shared/flags';
import { includesWordmark, registrationsFor, siteCss } from '../../src/shared/registration';

const ALL_ORIGINS = [
  'https://www.google.com/*',
  'https://www.youtube.com/*',
  'https://www.facebook.com/*',
];

describe('registrations', () => {
  it.each(IMPLEMENTED_SITES)(
    'registers an early (stylesheet) and a main (engine) script for %s',
    (site) => {
      const [early, main] = registrationsFor(site, 'store');
      expect(early?.runAt).toBe('document_start');
      expect(early?.css).toContain(`styles/${site}.css`);
      expect(main?.runAt).toBe('document_idle');
      expect(early?.matches).toEqual([...SITE_ORIGINS[site]]);
      // Scripts are scoped to the single site's origin, never shared.
      expect(early?.matches).toHaveLength(1);
    },
  );

  it('implements exactly the three target sites', () => {
    expect([...IMPLEMENTED_SITES].sort()).toEqual(['facebook', 'google', 'youtube']);
  });

  it.each(IMPLEMENTED_SITES)('store flavor never ships the %s wordmark (ADR-011)', (site) => {
    expect(includesWordmark('store')).toBe(false);
    expect(siteCss(site, 'store')).toEqual([`styles/${site}.css`]);
    expect(siteCss(site, 'dev')).toContain(`styles/${site}-wordmark.css`);
  });
});

describe('manifest', () => {
  it('store: least privilege, no install-time host access, no wordmark resources', () => {
    const m = buildManifest('store', '1.2.3');
    expect(m.permissions).toEqual(['storage', 'scripting']);
    expect(m.host_permissions).toBeUndefined();
    expect(m.optional_host_permissions).toEqual(ALL_ORIGINS);
    expect(m.web_accessible_resources).toBeUndefined();
    expect(m.name).toMatch(/unofficial/i);
  });

  it('never requests broad or sensitive permissions in any flavor', () => {
    for (const flavor of ['dev', 'store', 'test', 'release'] as const) {
      const text = JSON.stringify(buildManifest(flavor, '1.0.0'));
      for (const banned of [
        '<all_urls>',
        'webRequest',
        'cookies',
        'history',
        '"tabs"',
        'declarativeNetRequest',
        '*://*/*',
      ]) {
        expect(text).not.toContain(banned);
      }
    }
  });

  it('only the test flavor has install-time host access', () => {
    expect(buildManifest('test', '1.0.0').host_permissions).toEqual(ALL_ORIGINS);
    expect(buildManifest('dev', '1.0.0').host_permissions).toBeUndefined();
  });

  it('dev exposes each wordmark only to its own site', () => {
    const war = buildManifest('dev', '1.0.0').web_accessible_resources as {
      resources: string[];
      matches: string[];
    }[];
    expect(war).toHaveLength(3);
    for (const entry of war) {
      expect(entry.resources).toHaveLength(1);
      expect(entry.matches).toHaveLength(1);
    }
  });
});
