/**
 * Facebook can only be styled safely once the page is known to be a signed-in shell, which needs the
 * DOM. To avoid a native first paint on every load, the adapter remembers the outcome of the last
 * visit as one boolean in extension storage; the early script reads it (see `earlyHintKey`). Nothing
 * about the account is stored: just "the last page I probed was a signed-in shell: yes/no".
 */
export const FB_HINT_KEY = 'rw-hint-facebook';

interface Area {
  set(items: Record<string, unknown>): Promise<void> | void;
}

let last: boolean | null = null;

export function rememberSignedIn(value: boolean): void {
  if (last === value) return;
  last = value;
  try {
    const area = (globalThis as { chrome?: { storage?: { local?: Area } } }).chrome?.storage?.local;
    void area?.set({ [FB_HINT_KEY]: value });
  } catch {
    // no extension storage (tests, or the context was invalidated): the hint is only an optimisation
  }
}
