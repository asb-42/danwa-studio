// Stub for src/lib/elk-service.js (not yet implemented in the codebase).
// Tests in tests/lib/blueprint/layout.test.js mock this module directly;
// this stub is the fallback used when the layout.js module is imported
// (e.g. indirectly via the layout tests' await import).
export const runLayout = async () => ({ id: 'root', children: [] });
export default { runLayout };
