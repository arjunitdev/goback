import { ADAPTERS } from '../adapters';
import { createEngine } from '../engine/bootstrap';
import { reportEvent } from '../shared/diagnostics';
import { PREFS_KEY, chromeLocalArea, loadPrefs } from '../shared/storage';
import type { Message } from '../shared/types';

const area = chromeLocalArea();

const engine = createEngine({
  window,
  adapters: ADAPTERS,
  loadPrefs: () => loadPrefs(area),
  report: reportEvent,
  wordmark: __WORDMARK__,
});

void engine.start();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && PREFS_KEY in changes) void engine.reconcile();
});

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type === 'status') {
    sendResponse(engine.status());
  }
  return false;
});
