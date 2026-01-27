/**
 * Mock module for onnxruntime-node (CommonJS version)
 * This prevents @huggingface/transformers from loading the native module
 * and forces it to use pure JavaScript/WebAssembly mode
 * 
 * ROOT CAUSE FIX: Return undefined so library detects unavailability
 * Based on logs analysis:
 * - Library tries to import onnxruntime-node
 * - If module is undefined, library automatically falls back to WASM
 * - Solution: Return undefined (library detects and uses WASM backend)
 * 
 * CRITICAL: Return undefined (not an object) so library detects unavailability
 * Library will check if module exists, and if undefined, uses WASM automatically
 */

// Return undefined so library detects unavailability and uses WASM
// Library will check: if (onnxruntime === undefined) { use WASM }
module.exports = undefined;
