import { IMPLEMENTED_SITES, SITE_IDS, SITE_LABELS, SITE_ORIGINS } from '../shared/flags';
import { chromeLocalArea, loadPrefs, updatePrefs } from '../shared/storage';
import type { AdapterStatus, Prefs, SiteId } from '../shared/types';
import { byId, h } from '../ui/dom';

const area = chromeLocalArea();
const notice = byId<HTMLElement>('notice');

function say(text: string): void {
  notice.textContent = text;
}

async function render(): Promise<void> {
  const prefs = await loadPrefs(area);
  byId<HTMLInputElement>('kill').checked = prefs.killSwitch;
  renderSites(prefs);
  await renderStatus();
}

function renderSites(prefs: Prefs): void {
  const host = byId<HTMLElement>('sites');
  host.replaceChildren();
  for (const id of SITE_IDS) {
    const implemented = IMPLEMENTED_SITES.includes(id);
    const toggle = h('input', {
      type: 'checkbox',
      id: `site-${id}`,
      disabled: !implemented,
      checked: implemented && prefs.sites[id].enabled,
    });
    toggle.addEventListener('change', () => void onToggle(id, toggle));

    host.append(
      h(
        'div',
        { class: 'row' },
        h(
          'label',
          { for: `site-${id}` },
          implemented ? SITE_LABELS[id] : `${SITE_LABELS[id]} (coming later)`,
        ),
        toggle,
      ),
    );
  }
}

async function onToggle(id: SiteId, toggle: HTMLInputElement): Promise<void> {
  const want = toggle.checked;
  if (want) {
    // Must be the first await in the click chain to keep the user gesture.
    const granted = await chrome.permissions.request({ origins: [...SITE_ORIGINS[id]] });
    if (!granted) {
      toggle.checked = false;
      say(`Access to ${SITE_LABELS[id]} was not granted, so nothing was changed.`);
      return;
    }
  }
  await updatePrefs(area, (p) => {
    p.sites[id].enabled = want;
  });
  say(
    want
      ? 'Enabled. Reload open tabs to see it.'
      : 'Disabled. Reload open tabs to restore the native look.',
  );
  await renderStatus();
}

async function renderStatus(): Promise<void> {
  const dl = byId<HTMLElement>('status');
  dl.replaceChildren();
  const add = (k: string, v: string) => dl.append(h('dt', {}, k), h('dd', {}, v));
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) throw new Error('no tab');
    const s = (await chrome.tabs.sendMessage(tab.id, { type: 'status' })) as
      AdapterStatus | undefined;
    if (!s) throw new Error('no reply');
    add('Adapter', s.adapter ? `${s.adapter} v${s.adapterVersion ?? '?'}` : 'none');
    add('Route', s.route ?? 'n/a');
    add('Health', s.health);
    if (s.missing.length > 0) add('Missing', s.missing.join(', '));
  } catch {
    add('Status', 'Not active on this tab');
  }
}

byId<HTMLInputElement>('kill').addEventListener('change', (e) => {
  const killSwitch = (e.target as HTMLInputElement).checked;
  void updatePrefs(area, (p) => {
    p.killSwitch = killSwitch;
  }).then(() =>
    say(killSwitch ? 'Paused everywhere. Reload tabs to restore the native look.' : 'Resumed.'),
  );
});

byId<HTMLButtonElement>('settings').addEventListener('click', () => {
  void chrome.runtime.openOptionsPage();
});

void render();
