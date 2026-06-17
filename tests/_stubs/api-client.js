// Minimal stub for @danwa/api-client (workspace package, not always installed).
export const api = new Proxy({}, { get: () => () => Promise.resolve(null) });
export default { api };
