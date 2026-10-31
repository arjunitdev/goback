import { DIAG_KEY, type KeyValueArea } from './storage';
import { DIAG_EVENTS, type DiagCounters, type DiagEvent } from './types';

export function isDiagEvent(v: unknown): v is DiagEvent {
  return typeof v === 'string' && (DIAG_EVENTS as readonly string[]).includes(v);
}

export async function loadCounters(area: KeyValueArea): Promise<DiagCounters> {
  const stored = (await area.get(DIAG_KEY))[DIAG_KEY];
  const out: DiagCounters = {};
  if (typeof stored === 'object' && stored !== null) {
    for (const ev of DIAG_EVENTS) {
      const n = (stored as Record<string, unknown>)[ev];
      if (typeof n === 'number' && Number.isFinite(n) && n >= 0) out[ev] = n;
    }
  }
  return out;
}

export async function incrementCounter(area: KeyValueArea, event: DiagEvent): Promise<void> {
  const counters = await loadCounters(area);
  counters[event] = (counters[event] ?? 0) + 1;
  await area.set({ [DIAG_KEY]: counters });
}

export async function resetCounters(area: KeyValueArea): Promise<void> {
  await area.set({ [DIAG_KEY]: {} });
}

/**
 * Content-script side: report an event name to the background, which
 * serialises writes. Only allow-listed names are ever sent, never page content.
 */
export function reportEvent(event: DiagEvent): void {
  try {
    void chrome.runtime.sendMessage({ type: 'diag', event }).catch(() => undefined);
  } catch {
    // Extension context may be invalidated after an update; diagnostics are best effort.
  }
}
