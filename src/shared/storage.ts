import { DEFAULT_PREFS, SITE_IDS, isDisplayMode } from './flags';
import type { MotionPref, Prefs, SiteId, SitePrefs } from './types';

export const PREFS_KEY = 'prefs';
export const DIAG_KEY = 'diagnostics';

/** Minimal slice of chrome.storage.StorageArea so tests can inject a fake. */
export interface KeyValueArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function migrateSite(raw: unknown, fallback: SitePrefs): SitePrefs {
  if (!isRecord(raw)) return { ...fallback };
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : fallback.enabled,
    mode: isDisplayMode(raw.mode) ? raw.mode : fallback.mode,
    theme: 2012,
  };
}

function isMotion(v: unknown): v is MotionPref {
  return v === 'system' || v === 'reduce';
}

/**
 * Normalise whatever is stored into the current schema. Unknown or corrupt
 * values fall back to defaults so a bad write can never brick the extension.
 */
export function migratePrefs(raw: unknown): Prefs {
  if (!isRecord(raw)) return structuredClone(DEFAULT_PREFS);
  const rawSites = isRecord(raw.sites) ? raw.sites : {};
  const sites = {} as Record<SiteId, SitePrefs>;
  for (const id of SITE_IDS) sites[id] = migrateSite(rawSites[id], DEFAULT_PREFS.sites[id]);
  return {
    schema: 1,
    killSwitch: raw.killSwitch === true,
    motion: isMotion(raw.motion) ? raw.motion : DEFAULT_PREFS.motion,
    highContrast: raw.highContrast === true,
    sites,
  };
}

export async function loadPrefs(area: KeyValueArea): Promise<Prefs> {
  const stored = await area.get(PREFS_KEY);
  return migratePrefs(stored[PREFS_KEY]);
}

export async function savePrefs(area: KeyValueArea, prefs: Prefs): Promise<void> {
  await area.set({ [PREFS_KEY]: migratePrefs(prefs) });
}

export async function updatePrefs(
  area: KeyValueArea,
  mutate: (draft: Prefs) => void,
): Promise<Prefs> {
  const next = await loadPrefs(area);
  mutate(next);
  await savePrefs(area, next);
  return next;
}

/** Real chrome.storage.local, wrapped to the injectable shape. */
export function chromeLocalArea(): KeyValueArea {
  return {
    get: (key) => chrome.storage.local.get(key),
    set: (items) => chrome.storage.local.set(items),
  };
}
