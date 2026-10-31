import type { HealthState } from '../shared/types';

export interface ProbeResult {
  supported: boolean;
  missing: string[];
}

export interface HealthOptions {
  /** Consecutive failed probes before we declare failure and fail open. */
  failThreshold?: number;
}

/**
 * Tracks probe outcomes with hysteresis so transient loading states do not
 * flap the theme: one miss is "degraded", only N consecutive misses fail.
 * `failed` is the signal for the engine to restore the native page (FR-007).
 */
export class HealthMonitor {
  private consecutiveFailures = 0;
  private current: HealthState = 'healthy';
  private lastMissing: string[] = [];
  private readonly threshold: number;

  constructor(options: HealthOptions = {}) {
    this.threshold = options.failThreshold ?? 3;
  }

  record(result: ProbeResult): HealthState {
    this.lastMissing = [...result.missing];
    if (result.supported) {
      this.consecutiveFailures = 0;
      this.current = result.missing.length > 0 ? 'degraded' : 'healthy';
    } else {
      this.consecutiveFailures += 1;
      this.current = this.consecutiveFailures >= this.threshold ? 'failed' : 'degraded';
    }
    return this.current;
  }

  get state(): HealthState {
    return this.current;
  }

  get missing(): string[] {
    return [...this.lastMissing];
  }

  reset(): void {
    this.consecutiveFailures = 0;
    this.current = 'healthy';
    this.lastMissing = [];
  }
}
