export interface BatchInfo {
  /** Number of mutation records seen since the last batch (capped). */
  records: number;
  /** True when the cap was hit and further records were dropped. */
  capped: boolean;
}

export interface BatchedObserver {
  /** Observe a (new) root; disconnects any previous root first. `init` overrides the default options. */
  observe(root: Node, init?: MutationObserverInit): void;
  disconnect(): void;
}

export interface ObserverOptions {
  /** Max records counted per batch; protects against observer storms (R06). */
  maxRecords?: number;
  /** Scheduler for flushing; defaults to requestAnimationFrame. */
  schedule?: (flush: () => void) => void;
  /** Stable subtree to watch; defaults to childList+subtree without attribute noise. */
  init?: MutationObserverInit;
}

const DEFAULT_INIT: MutationObserverInit = { childList: true, subtree: true };

/**
 * Batches DOM mutations into at most one callback per frame. The callback
 * receives counts only, never nodes, so it cannot be tempted to walk page
 * content, and recursion from the callback's own DOM writes is guarded.
 */
export function createBatchedObserver(
  onBatch: (info: BatchInfo) => void,
  options: ObserverOptions = {},
): BatchedObserver {
  const max = options.maxRecords ?? 500;
  const schedule =
    options.schedule ??
    ((flush: () => void) => {
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(flush);
      else setTimeout(flush, 16);
    });

  let observer: MutationObserver | null = null;
  const init: MutationObserverInit = options.init ?? DEFAULT_INIT;
  let pending = 0;
  let capped = false;
  let scheduled = false;
  let inCallback = false;

  const flush = () => {
    scheduled = false;
    if (!observer) return;
    // Drain anything queued during the callback so our own writes don't re-trigger us.
    const info: BatchInfo = { records: pending, capped };
    pending = 0;
    capped = false;
    if (info.records === 0) return;
    inCallback = true;
    try {
      onBatch(info);
    } finally {
      observer.takeRecords();
      inCallback = false;
    }
  };

  const handle = (records: MutationRecord[]) => {
    if (inCallback) return;
    const room = max - pending;
    if (records.length > room) {
      pending = max;
      capped = true;
    } else {
      pending += records.length;
    }
    if (!scheduled) {
      scheduled = true;
      schedule(flush);
    }
  };

  return {
    observe(next: Node, override?: MutationObserverInit) {
      this.disconnect();
      observer = new MutationObserver(handle);
      observer.observe(next, override ?? init);
    },
    disconnect() {
      observer?.disconnect();
      observer = null;
      pending = 0;
      capped = false;
    },
  };
}
