/**
 * Mock module for onnxruntime-node (CommonJS version)
 * This prevents @xenova/transformers from loading the native module
 * and forces it to use pure JavaScript/WebAssembly mode
 * 
 * ROOT CAUSE FIX: Return object with InferenceSession structure
 * Library checks for onnxruntime-node.InferenceSession.create()
 * If method throws or returns undefined, library will fallback to WASM
 */

// Return object with InferenceSession structure
// Library will try to call create() which throws, triggering WASM fallback
const mockInferenceSession = {
  create: function() {
    throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
  }
};

module.exports = {
  InferenceSession: mockInferenceSession,
  // Also export create directly (some code paths may use this)
  create: function() {
    throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
  }
};
