/**
 * Mock module for onnxruntime-node (CommonJS version)
 * This prevents @huggingface/transformers from loading the native module
 * and forces it to use pure JavaScript/WebAssembly mode
 * 
 * ROOT CAUSE FIX: Return object with InferenceSession structure that throws on create()
 * Based on logs analysis:
 * - Library tries to access onnxruntime.InferenceSession.create()
 * - If module is undefined, library throws "Cannot read properties of undefined"
 * - Solution: Return object with proper structure, but create() throws error
 * - Library will catch error and immediately fallback to WASM
 * 
 * CRITICAL: The object structure must match what library expects:
 * - Must have InferenceSession property
 * - InferenceSession must have create() method
 * - create() should throw error (library catches and fallbacks to WASM)
 */

// Return object with InferenceSession structure
// Library will try to call create() which throws, triggering immediate WASM fallback
const mockInferenceSession = {
  create: function() {
    // Throw error so library immediately falls back to WASM
    // Library catches this error and uses WASM backend
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
