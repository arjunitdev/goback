import { describe, expect, it } from 'vitest';
import { createBatchedObserver, type BatchInfo } from '../../src/engine/observer';

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe('createBatchedObserver', () => {
  it('coalesces many mutations into one callback per flush', async () => {
    const root = document.createElement('div');
    const batches: BatchInfo[] = [];
    const obs = createBatchedObserver((b) => batches.push(b), {
      schedule: (f) => queueMicrotask(f),
    });
    obs.observe(root);
    for (let i = 0; i < 5; i++) root.append(document.createElement('span'));
    await tick();
    expect(batches).toHaveLength(1);
    expect(batches[0]?.records).toBe(5);
    expect(batches[0]?.capped).toBe(false);
    obs.disconnect();
  });

  it('caps records per batch (observer-storm guard)', async () => {
    const root = document.createElement('div');
    const batches: BatchInfo[] = [];
    const obs = createBatchedObserver((b) => batches.push(b), {
      maxRecords: 3,
      schedule: (f) => queueMicrotask(f),
    });
    obs.observe(root);
    for (let i = 0; i < 10; i++) root.append(document.createElement('span'));
    await tick();
    expect(batches[0]).toEqual({ records: 3, capped: true });
    obs.disconnect();
  });

  it('ignores mutations made by its own callback (no recursion)', async () => {
    const root = document.createElement('div');
    let calls = 0;
    const obs = createBatchedObserver(
      () => {
        calls++;
        root.append(document.createElement('i')); // adapter writing to the DOM
      },
      { schedule: (f) => queueMicrotask(f) },
    );
    obs.observe(root);
    root.append(document.createElement('b'));
    await tick();
    await tick();
    expect(calls).toBe(1);
    obs.disconnect();
  });

  it('stops delivering after disconnect and can re-observe a new root', async () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    let calls = 0;
    const obs = createBatchedObserver(() => calls++, { schedule: (f) => queueMicrotask(f) });
    obs.observe(a);
    obs.disconnect();
    a.append(document.createElement('x'));
    await tick();
    expect(calls).toBe(0);
    obs.observe(b);
    b.append(document.createElement('x'));
    await tick();
    expect(calls).toBe(1);
    obs.disconnect();
  });
});
