/**
 * registerEdges.js — STUB (pre-existing repo state: missing).
 *
 * See registerAssetNodes.js for the full context. This file is one of
 * three that was supposed to land when the 568-line monolithic
 * registry was split in audit L5. Only registerAll.js (the
 * orchestrator) made it into the repo.
 */

import { registerNode, registerEdge } from './registry.js';

export function registerEdges() {
  throw new Error(
    'registerEdges() is a stub — see src/lib/blueprint/registerEdges.js',
  );
  // eslint-disable-next-line no-unreachable
  void registerNode; void registerEdge;
}
