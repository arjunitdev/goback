import { afterEach, describe, expect, it } from 'vitest';
import { ADAPTERS } from '../../src/adapters';
import { createEngine, type Engine } from '../../src/engine/bootstrap';
import { createBatchedObserver } from '../../src/engine/observer';
import { DEFAULT_PREFS } from '../../src/shared/flags';
import { fixture, loadPage } from '../fixtures/load';

/**
 * Sanity checks on engine cost, NOT a measurement of the docs/01 §1.4 budgets
 * (100ms main-thread p95, 30ms per navigation). jsdom is several times slower than
 * Chrome, so the thresholds here are deliberately loose: they catch accidental
 * O(n²) behaviour, not small regressions. Real budgets need Chrome traces (a documented gap).
 */
const engines: Engine[] = [];
afterEach(() => {
  while (engines.length) engines.pop()?.stop();
});

function bigResultsPage(extraNodes: number) {
  const dom = loadPage('google-results.html', 'https://www.google.com/search?q=cats');
  const rso = dom.window.document.querySelector('#rso');
  const frag = dom.window.document.createDocumentFragment();
  for (let i = 0; i < extraNodes; i++) {
    const div = dom.window.document.createElement('div');
    div.innerHTML = `<a href="https://example.org/${i}"><h3>Result ${i}</h3></a><cite>example.org</cite>`;
    frag.append(div);
  }
  rso?.append(frag);
  return dom;
}

describe('engine cost sanity', () => {
  it('mounts on a results page with ~15,000 nodes quickly', async () => {
    const dom = bigResultsPage(5000);
    const prefs = structuredClone(DEFAULT_PREFS);
    prefs.sites.google.enabled = true;
    const engine = createEngine({
      window: dom.window as unknown as Window,
      adapters: ADAPTERS,
      loadPrefs: async () => prefs,
      report: () => undefined,
      schedule: (f) => queueMicrotask(f),
    });
    engines.push(engine);

    const t0 = performance.now();
    await engine.start();
    const elapsed = performance.now() - t0;

    expect(engine.status().health).toBe('healthy');
    // Loose on purpose: this runs alongside other suites on shared CI/dev machines.
    // It guards against pathological (quadratic) behaviour, not small regressions.
    expect(elapsed).toBeLessThan(750);
  });

  it('probing does not scale with page size (selector existence checks only)', async () => {
    const small = bigResultsPage(10);
    const large = bigResultsPage(20000);
    const time = (win: typeof small.window) => {
      const adapter = ADAPTERS[0];
      const t0 = performance.now();
      for (let i = 0; i < 200; i++) adapter?.probe(win.document, 'results');
      return performance.now() - t0;
    };
    time(small.window); // warm up
    const tSmall = time(small.window);
    const tLarge = time(large.window);
    expect(tLarge).toBeLessThan(Math.max(tSmall * 8, 100));
  });

  it('a mutation storm is processed as a bounded number of capped batches', async () => {
    const dom = bigResultsPage(0);
    const root = dom.window.document.body;
    const batches: { records: number; capped: boolean }[] = [];
    const obs = createBatchedObserver((b) => batches.push(b), {
      maxRecords: 500,
      schedule: (f) => queueMicrotask(f),
    });
    obs.observe(root);
    for (let i = 0; i < 20000; i++) root.append(dom.window.document.createElement('i'));
    await new Promise((r) => setTimeout(r, 20));
    obs.disconnect();
    expect(batches.length).toBeLessThanOrEqual(2);
    expect(Math.max(...batches.map((b) => b.records))).toBeLessThanOrEqual(500);
    expect(batches.some((b) => b.capped)).toBe(true);
  });

  it('keeps the fixture honest: it really is the page we think it is', () => {
    expect(fixture('google-results.html')).toContain('id="rso"');
  });
});
