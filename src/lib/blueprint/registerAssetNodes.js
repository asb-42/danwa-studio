/**
 * registerAssetNodes.js — STUB (pre-existing repo state: missing).
 *
 * The original file (568-line monolithic registry, see Sprint 4 audit
 * L5) was split into three focused modules in commit `<unknown>` but
 * only the orchestrator (registerAll.js) made it into the repo. The
 * three split files — this one, registerWorkflowNodes.js, and
 * registerEdges.js — are missing.
 *
 * This stub preserves the public surface so the build resolves.
 * Calling any of the exported functions throws a clear runtime error
 * pointing at this comment, so a future developer knows immediately
 * that real wiring is required before BlueprintCanvas can be used.
 *
 * To complete the refactor, restore the original three-file split
 * from the audit L5 commit, or replace the stubs with no-op
 * implementations if the BlueprintCanvas feature is being removed.
 */

import { registerNode, registerEdge } from './registry.js';

export function registerAssetNodes() {
  throw new Error(
    'registerAssetNodes() is a stub — see src/lib/blueprint/registerAssetNodes.js',
  );
  // Suppress unused-import warning while still being a runtime failure.
  // eslint-disable-next-line no-unreachable
  void registerNode; void registerEdge;
}
