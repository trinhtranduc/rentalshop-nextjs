/**
 * Mock module for onnxruntime-node (CommonJS version)
 * This prevents @xenova/transformers from loading the native module
 * and forces it to use pure JavaScript/WebAssembly mode
 * 
 * Based on: https://github.com/huggingface/transformers.js/issues/1275
 * Solution: Create mock module that throws errors to force WASM fallback
 */

// Create mock object that throws errors when accessed
// This ensures @xenova/transformers falls back to WebAssembly mode
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
