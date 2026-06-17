// Minimal ELK.js wrapper used by the blueprint canvas.
// At runtime this should call the real elkjs library; for tests we expose
// the same surface and let individual tests mock it via vi.mock.
export async function runLayout(graph) {
  // The real implementation would invoke ELK here:
  //
  //   const elk = new ELK();
  //   return elk.layout(graph);
  //
  // Returning the input graph unchanged lets dependent code execute
  // without a heavy native dependency, and tests stub this function.
  return graph;
}

export default { runLayout };
