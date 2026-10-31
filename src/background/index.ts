import { isDiagEvent, incrementCounter } from '../shared/diagnostics';
import { IMPLEMENTED_SITES, SITE_ORIGINS, isSiteActive } from '../shared/flags';
import { registrationsFor, type ScriptRegistration } from '../shared/registration';
import { PREFS_KEY, chromeLocalArea, loadPrefs } from '../shared/storage';
import type { Message } from '../shared/types';

const area = chromeLocalArea();
const ID_PREFIX = 'rw-';

/**
 * Reconcile dynamic content-script registrations with prefs + granted
 * permissions. A site's scripts exist only while it is enabled, permitted and
 * not killed, which is what lets the early stylesheet paint before first render
 * without an async storage lookup. Idempotent; safe to call from any trigger.
 */
async function syncRegistrations(): Promise<void> {
  const prefs = await loadPrefs(area);
  const desired: ScriptRegistration[] = [];
  for (const site of IMPLEMENTED_SITES) {
    if (!isSiteActive(prefs, site)) continue;
    const granted = await chrome.permissions.contains({ origins: [...SITE_ORIGINS[site]] });
    if (granted) desired.push(...registrationsFor(site, __FLAVOR__));
  }

  const existing = (await chrome.scripting.getRegisteredContentScripts())
    .map((s) => s.id)
    .filter((id) => id.startsWith(ID_PREFIX));
  const desiredIds = new Set(desired.map((d) => d.id));

  const stale = existing.filter((id) => !desiredIds.has(id));
  if (stale.length > 0) await chrome.scripting.unregisterContentScripts({ ids: stale });

  const toUpdate = desired.filter((d) => existing.includes(d.id));
  const toAdd = desired.filter((d) => !existing.includes(d.id));
  if (toUpdate.length > 0) await chrome.scripting.updateContentScripts(toUpdate);
  if (toAdd.length > 0) await chrome.scripting.registerContentScripts(toAdd);
}

// Serialise all work: the service worker can be woken by several events at once.
let queue: Promise<unknown> = Promise.resolve();
function enqueue(task: () => Promise<unknown>): Promise<unknown> {
  queue = queue.then(task, task).catch(() => undefined);
  return queue;
}

chrome.runtime.onInstalled.addListener(() => void enqueue(syncRegistrations));
chrome.runtime.onStartup.addListener(() => void enqueue(syncRegistrations));
chrome.permissions.onAdded.addListener(() => void enqueue(syncRegistrations));
chrome.permissions.onRemoved.addListener(() => void enqueue(syncRegistrations));
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && PREFS_KEY in changes) void enqueue(syncRegistrations);
});

chrome.runtime.onMessage.addListener((message: Message, sender) => {
  // Only our own extension pages and content scripts may talk to us.
  if (sender.id !== chrome.runtime.id) return false;
  if (message.type === 'diag' && isDiagEvent(message.event)) {
    void enqueue(() => incrementCounter(area, message.event));
  } else if (message.type === 'sync') {
    void enqueue(syncRegistrations);
  }
  return false;
});
