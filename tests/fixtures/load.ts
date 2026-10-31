import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

// vitest runs from the project root; import.meta.url is unreliable under the jsdom environment.
export function fixture(name: string): string {
  return readFileSync(join(process.cwd(), 'tests', 'fixtures', name), 'utf8');
}

/** A jsdom window at a given URL, loaded with a fixture. */
export function loadPage(name: string, url: string): JSDOM {
  return new JSDOM(fixture(name), { url, pretendToBeVisual: true });
}
