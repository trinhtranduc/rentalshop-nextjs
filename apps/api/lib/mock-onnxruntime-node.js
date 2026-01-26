/**
 * Mock module for onnxruntime-node (CommonJS version)
 * This prevents @xenova/transformers from loading the native module
 * and forces it to use pure JavaScript/WebAssembly mode
 * 
 * ROOT CAUSE FIX: Instead of throwing errors immediately, return undefined/null
 * This allows @xenova/transformers to detect that onnxruntime-node is unavailable
 * and automatically fallback to WASM backend without throwing errors
 */

// Return undefined/null instead of throwing errors
// This signals to @xenova/transformers that onnxruntime-node is not available
// Library will automatically detect this and use WASM backend
module.exports = undefined;
