/**
 * Mock module for onnxruntime-node (CommonJS version)
 * This prevents @xenova/transformers from loading the native module
 * and forces it to use pure JavaScript/WebAssembly mode
 * 
 * ROOT CAUSE FIX: Return undefined instead of throwing errors
 * Based on @xenova/transformers source code analysis:
 * - Library checks if onnxruntime-node exists and has InferenceSession.create()
 * - If create() throws, library catches error and tries WASM fallback
 * - However, if WASM backend also fails, the error message is confusing
 * - Better approach: Return undefined so library immediately uses WASM
 * 
 * CRITICAL: In WebAssembly mode, the library needs WASM files to be accessible.
 * If WASM files are missing, the library will try to download them.
 * Ensure cache directory is writable and network access is available.
 */

// Return undefined to signal that onnxruntime-node is not available
// Library will immediately use WASM backend without trying onnxruntime-node first
module.exports = undefined;
