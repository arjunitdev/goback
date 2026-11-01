import { evaluateProbes, type ProbeOutcome } from '../probe';
import type { GoogleRoute } from './routes';
import { PROBES } from './selectors';

/** Evaluate route probes against a document. Read-only; never touches page text. */
export function runProbes(doc: Document, route: GoogleRoute): ProbeOutcome {
  return evaluateProbes(doc, PROBES[route]);
}
