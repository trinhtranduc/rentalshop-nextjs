/**
 * Mock module for onnxruntime-node (CommonJS version)
 * This prevents @huggingface/transformers from loading the native module
 * and forces it to use pure JavaScript/WebAssembly mode
 * 
 * CRITICAL: Library checks for onnxruntime-node and tries to call create()
 * If we return undefined, library may still try to access properties
 * Solution: Return object with proper structure, but throw error on access
 * Library will catch error and fallback to WASM
 */

// Return object with InferenceSession structure
// When library tries to call create(), it throws error and library falls back to WASM
const mockInferenceSession = {
  create: function() {
    throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
  }
};

module.exports = {
  InferenceSession: mockInferenceSession,
  create: function() {
    throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
  }
};
