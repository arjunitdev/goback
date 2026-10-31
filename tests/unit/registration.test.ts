import { describe, expect, it } from 'vitest';
import { buildManifest } from '../../src/manifest';
import { includesWordmark, registrationsFor, siteCss } from '../../src/shared/registration';

describe('registrations', () => {
  it('registers an early (stylesheet) and a main (engine) script per site', () => {
    const [early, main] = registrationsFor('google', 'store');
    expect(early?.runAt).toBe('document_start');
    expect(early?.css).toContain('styles/google.css');
    expect(main?.runAt).toBe('document_idle');
    expect(early?.matches).toEqual(['https://www.google.com/*']);
  });

  it('store flavor never ships the wordmark (ADR-011)', () => {
    expect(includesWordmark('store')).toBe(false);
    expect(siteCss('google', 'store')).toEqual(['styles/google.css']);
    expect(siteCss('google', 'dev')).toContain('styles/google-wordmark.css');
  });
});

describe('manifest', () => {
  it('store: least privilege, no install-time host access, no wordmark resources', () => {
    const m = buildManifest('store', '1.2.3');
    expect(m.permissions).toEqual(['storage', 'scripting']);
    expect(m.host_permissions).toBeUndefined();
    expect(m.optional_host_permissions).toEqual(['https://www.google.com/*']);
    expect(m.web_accessible_resources).toBeUndefined();
    expect(m.name).toMatch(/unofficial/i);
  });

  it('never requests broad or sensitive permissions in any flavor', () => {
    for (const flavor of ['dev', 'store', 'test'] as const) {
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
    expect(buildManifest('test', '1.0.0').host_permissions).toEqual(['https://www.google.com/*']);
    expect(buildManifest('dev', '1.0.0').host_permissions).toBeUndefined();
  });
});
