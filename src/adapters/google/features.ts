import type { GoogleRoute } from './routes';
import { PROBES, type Probe } from './selectors';

export interface ProbeOutcome {
  supported: boolean;
  missing: string[];
}

/** Evaluate route probes against a document. Read-only; never touches page text. */
export function runProbes(doc: Document, route: GoogleRoute): ProbeOutcome {
  const missing: string[] = [];
  let supported = true;
  for (const probe of PROBES[route]) {
    if (!probeMatches(doc, probe)) {
      missing.push(probe.name);
      if (probe.required) supported = false;
    }
  }
  return { supported, missing };
}

function probeMatches(doc: Document, probe: Probe): boolean {
  return probe.any.some((sel) => {
    try {
      return doc.querySelector(sel) !== null;
    } catch {
      return false; // invalid selector must degrade, not throw
    }
  });
}
