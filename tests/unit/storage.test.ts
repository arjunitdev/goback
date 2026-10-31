import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS } from '../../src/shared/flags';
import { incrementCounter, loadCounters, resetCounters } from '../../src/shared/diagnostics';
import {
  PREFS_KEY,
  loadPrefs,
  migratePrefs,
  savePrefs,
  updatePrefs,
  type KeyValueArea,
} from '../../src/shared/storage';

function fakeArea(
  initial: Record<string, unknown> = {},
): KeyValueArea & { data: Record<string, unknown> } {
  const data = { ...initial };
  return {
    data,
    get: async (key) => (key in data ? { [key]: data[key] } : {}),
    set: async (items) => void Object.assign(data, items),
  };
}

describe('prefs migration', () => {
  it('returns defaults for missing or corrupt data', () => {
    expect(migratePrefs(undefined)).toEqual(DEFAULT_PREFS);
    expect(migratePrefs('nope')).toEqual(DEFAULT_PREFS);
    expect(migratePrefs([1, 2])).toEqual(DEFAULT_PREFS);
  });

  it('defaults to everything off, so nothing is applied until the user opts in (FR-001)', () => {
    const p = migratePrefs({});
    expect(p.killSwitch).toBe(false);
    for (const s of Object.values(p.sites)) expect(s.enabled).toBe(false);
  });

  it('keeps valid values and repairs invalid ones', () => {
    const p = migratePrefs({
      killSwitch: true,
      motion: 'bogus',
      highContrast: 'yes',
      sites: {
        google: { enabled: true, mode: 'compatibility', theme: 1999 },
        youtube: { enabled: 'x', mode: 'zzz' },
      },
    });
    expect(p.killSwitch).toBe(true);
    expect(p.motion).toBe('system');
    expect(p.highContrast).toBe(false);
    expect(p.sites.google).toEqual({ enabled: true, mode: 'compatibility', theme: 2012 });
    expect(p.sites.youtube).toEqual({ enabled: false, mode: 'authentic', theme: 2012 });
  });

  it('does not alias DEFAULT_PREFS', () => {
    const a = migratePrefs(undefined);
    a.sites.google.enabled = true;
    expect(DEFAULT_PREFS.sites.google.enabled).toBe(false);
  });

  it('round-trips through storage and updatePrefs', async () => {
    const area = fakeArea();
    expect(await loadPrefs(area)).toEqual(DEFAULT_PREFS);
    await updatePrefs(area, (p) => {
      p.sites.google.enabled = true;
    });
    expect((await loadPrefs(area)).sites.google.enabled).toBe(true);
    await savePrefs(area, { ...DEFAULT_PREFS, killSwitch: true });
    expect(area.data[PREFS_KEY]).toMatchObject({ killSwitch: true });
  });
});

describe('diagnostics counters', () => {
  it('counts allow-listed events only and resets', async () => {
    const area = fakeArea();
    await incrementCounter(area, 'mounted');
    await incrementCounter(area, 'mounted');
    await incrementCounter(area, 'fail-open');
    expect(await loadCounters(area)).toEqual({ mounted: 2, 'fail-open': 1 });
    await resetCounters(area);
    expect(await loadCounters(area)).toEqual({});
  });

  it('ignores junk in storage', async () => {
    const area = fakeArea({
      diagnostics: { mounted: -3, 'fail-open': 'x', url: 'https://secret', unmounted: 4 },
    });
    expect(await loadCounters(area)).toEqual({ unmounted: 4 });
  });
});
