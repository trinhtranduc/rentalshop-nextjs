/**
 * Mock module for onnxruntime-node
 * This prevents @xenova/transformers from loading the native module
 * and forces it to use pure JavaScript/WebAssembly mode
 */

// Export a mock object that throws an error if any method is called
// This ensures @xenova/transformers falls back to WebAssembly
const mockOnnxRuntime = new Proxy({}, {
  get(target, prop) {
    throw new Error(
      `onnxruntime-node is disabled. Property '${String(prop)}' accessed. ` +
      `@xenova/transformers should use pure JavaScript/WebAssembly mode instead.`
    );
  }
});

export default mockOnnxRuntime;
