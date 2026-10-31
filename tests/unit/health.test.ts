import { describe, expect, it } from 'vitest';
import { HealthMonitor } from '../../src/engine/health';

describe('HealthMonitor', () => {
  it('is healthy when everything is present', () => {
    const h = new HealthMonitor();
    expect(h.record({ supported: true, missing: [] })).toBe('healthy');
  });

  it('is degraded when only optional probes miss', () => {
    const h = new HealthMonitor();
    expect(h.record({ supported: true, missing: ['footer'] })).toBe('degraded');
    expect(h.missing).toEqual(['footer']);
  });

  it('tolerates transient failures, fails only after the threshold', () => {
    const h = new HealthMonitor({ failThreshold: 3 });
    const bad = { supported: false, missing: ['search-box'] };
    expect(h.record(bad)).toBe('degraded');
    expect(h.record(bad)).toBe('degraded');
    expect(h.record(bad)).toBe('failed');
  });

  it('recovers when probes pass again before the threshold', () => {
    const h = new HealthMonitor({ failThreshold: 3 });
    h.record({ supported: false, missing: ['x'] });
    h.record({ supported: false, missing: ['x'] });
    expect(h.record({ supported: true, missing: [] })).toBe('healthy');
    expect(h.record({ supported: false, missing: ['x'] })).toBe('degraded');
  });

  it('reset clears state', () => {
    const h = new HealthMonitor({ failThreshold: 1 });
    h.record({ supported: false, missing: ['x'] });
    h.reset();
    expect(h.state).toBe('healthy');
    expect(h.missing).toEqual([]);
  });
});
