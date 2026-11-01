/**
 * Shared probe machinery. A probe passes if ANY of its selectors matches.
 * A route is "supported" when every *required* probe passes and no *forbidden*
 * selector is present. Optional misses only downgrade health to "degraded".
 */
export interface Probe {
  name: string;
  any: readonly string[];
  required: boolean;
}

export interface Forbidden {
  /** Reported in `missing` as `blocked:<name>` when present. */
  name: string;
  any: readonly string[];
}

export interface ProbeOutcome {
  supported: boolean;
  missing: string[];
}

function matchesAny(doc: Document, selectors: readonly string[]): boolean {
  return selectors.some((sel) => {
    try {
      return doc.querySelector(sel) !== null;
    } catch {
      return false; // an invalid selector must degrade, never throw
    }
  });
}

/** Read-only: never touches page text, only checks that elements exist. */
export function evaluateProbes(
  doc: Document,
  probes: readonly Probe[],
  forbidden: readonly Forbidden[] = [],
): ProbeOutcome {
  const missing: string[] = [];
  let supported = true;
  for (const probe of probes) {
    if (!matchesAny(doc, probe.any)) {
      missing.push(probe.name);
      if (probe.required) supported = false;
    }
  }
  for (const f of forbidden) {
    if (matchesAny(doc, f.any)) {
      missing.push(`blocked:${f.name}`);
      supported = false;
    }
  }
  return { supported, missing };
}
