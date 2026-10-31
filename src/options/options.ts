import { loadCounters, resetCounters } from '../shared/diagnostics';
import { IMPLEMENTED_SITES, SITE_LABELS, SITE_ORIGINS } from '../shared/flags';
import { chromeLocalArea, loadPrefs, updatePrefs } from '../shared/storage';
import { DIAG_EVENTS, type MotionPref, type SiteId } from '../shared/types';
import { byId, h } from '../ui/dom';

const area = chromeLocalArea();
const notice = byId<HTMLElement>('notice');

async function render(): Promise<void> {
  const prefs = await loadPrefs(area);
  byId<HTMLSelectElement>('motion').value = prefs.motion;
  byId<HTMLInputElement>('contrast').checked = prefs.highContrast;
  await renderAccess();
  await renderDiagnostics();
}

async function renderAccess(): Promise<void> {
  const host = byId<HTMLElement>('access');
  host.replaceChildren();
  for (const id of IMPLEMENTED_SITES) {
    const granted = await chrome.permissions.contains({ origins: [...SITE_ORIGINS[id]] });
    const button = h('button', { type: 'button', disabled: !granted }, 'Withdraw access');
    button.addEventListener('click', () => void revoke(id));
    host.append(
      h(
        'div',
        { class: 'row' },
        h('span', {}, `${SITE_LABELS[id]}: ${granted ? 'access granted' : 'no access'}`),
        button,
      ),
    );
  }
}

async function revoke(id: SiteId): Promise<void> {
  await updatePrefs(area, (p) => {
    p.sites[id].enabled = false;
  });
  const removed = await chrome.permissions.remove({ origins: [...SITE_ORIGINS[id]] });
  notice.textContent = removed
    ? `${SITE_LABELS[id]} disabled and access withdrawn.`
    : `${SITE_LABELS[id]} disabled; access could not be withdrawn (it may be required by this build).`;
  await renderAccess();
}

async function renderDiagnostics(): Promise<void> {
  const counters = await loadCounters(area);
  const dl = byId<HTMLElement>('diag');
  dl.replaceChildren();
  for (const ev of DIAG_EVENTS) dl.append(h('dt', {}, ev), h('dd', {}, String(counters[ev] ?? 0)));
}

byId<HTMLSelectElement>('motion').addEventListener('change', (e) => {
  const motion = (e.target as HTMLSelectElement).value as MotionPref;
  void updatePrefs(area, (p) => {
    p.motion = motion;
  });
});

byId<HTMLInputElement>('contrast').addEventListener('change', (e) => {
  const highContrast = (e.target as HTMLInputElement).checked;
  void updatePrefs(area, (p) => {
    p.highContrast = highContrast;
  });
});

byId<HTMLButtonElement>('reset').addEventListener('click', () => {
  void resetCounters(area).then(renderDiagnostics);
});

void render();
