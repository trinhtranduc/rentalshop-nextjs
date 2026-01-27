/**
 * Mock module for onnxruntime-node (CommonJS version)
 * This prevents @xenova/transformers from loading the native module
 * and forces it to use pure JavaScript/WebAssembly mode
 * 
 * ROOT CAUSE FIX: Return empty object instead of undefined or throwing errors
 * Library checks for onnxruntime-node existence, and if methods don't work,
 * it will automatically fallback to WASM backend
 */

// Return empty object - library will detect methods don't work and fallback to WASM
// This is safer than undefined (which causes "Cannot read property" errors)
// and better than throwing errors (which library may not catch properly)
module.exports = {};
