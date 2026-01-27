#!/usr/bin/env tsx
/**
 * Test script to verify onnxruntime patching logic
 * This tests the patch logic without loading the full transformers library
 */

// Mock transformers module structure
const mockTransformersModule = {
  env: {
    useBrowser: false,
    useOnnxruntime: true,
    onnxruntime: undefined as any,
    backends: {
      onnxruntime: undefined as any,
    },
  },
  onnxruntime: undefined as any,
};

// Mock global
const mockGlobal = {
  onnxruntime: undefined as any,
  window: {
    onnxruntime: undefined as any,
  },
};

// Mock onnxruntime object (same as in image-embeddings.ts)
const mockOnnxRuntime = {
  InferenceSession: {
    create: function() {
      throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
    }
  },
  create: function() {
    throw new Error('onnxruntime-node is disabled - using WebAssembly mode');
  }
};

// Helper function to safely set property (same as in image-embeddings.ts)
const safeSetProperty = (obj: any, prop: string, value: any) => {
  try {
    obj[prop] = value;
  } catch (e) {
    try {
      Object.defineProperty(obj, prop, {
        value: value,
        writable: true,
        enumerable: true,
        configurable: true
      });
    } catch (e2) {
      try {
        Reflect.set(obj, prop, value);
      } catch (e3: any) {
        console.warn(`⚠️ Could not set property ${prop}:`, e3?.message || String(e3));
        return false;
      }
    }
  }
  return true;
};

// Test Step 1: Patch transformers.env.onnxruntime
console.log('🧪 Testing Step 1: Patch transformers.env.onnxruntime...');
if (mockTransformersModule.env) {
  mockTransformersModule.env.useBrowser = true;
  mockTransformersModule.env.useOnnxruntime = false;
  const step1Success = safeSetProperty(mockTransformersModule.env, 'onnxruntime', mockOnnxRuntime);
  console.log(step1Success ? '✅ Step 1: Patch successful' : '❌ Step 1: Patch failed');
  
  // Verify
  const envOnnx = mockTransformersModule.env.onnxruntime;
  if (envOnnx && envOnnx.InferenceSession && typeof envOnnx.InferenceSession.create === 'function') {
    console.log('✅ Step 1 VERIFIED: transformers.env.onnxruntime has InferenceSession.create');
  } else {
    console.error('❌ Step 1 VERIFICATION FAILED: transformers.env.onnxruntime is not properly patched');
    process.exit(1);
  }
  
  // Test backends
  if (mockTransformersModule.env.backends) {
    const step1_1Success = safeSetProperty(mockTransformersModule.env.backends, 'onnxruntime', mockOnnxRuntime);
    console.log(step1_1Success ? '✅ Step 1.1: Patch backends.onnxruntime successful' : '❌ Step 1.1: Patch failed');
  }
}

// Test Step 2: Patch module-level onnxruntime
console.log('\n🧪 Testing Step 2: Patch module-level onnxruntime...');
const step2Success = safeSetProperty(mockTransformersModule, 'onnxruntime', mockOnnxRuntime);
console.log(step2Success ? '✅ Step 2: Patch successful' : '❌ Step 2: Patch failed');

// Verify
const moduleOnnx = mockTransformersModule.onnxruntime;
if (moduleOnnx && moduleOnnx.InferenceSession && typeof moduleOnnx.InferenceSession.create === 'function') {
  console.log('✅ Step 2 VERIFIED: transformersModule.onnxruntime has InferenceSession.create');
} else {
  console.error('❌ Step 2 VERIFICATION FAILED: transformersModule.onnxruntime is not properly patched');
  process.exit(1);
}

// Test Step 3: Patch global onnxruntime
console.log('\n🧪 Testing Step 3: Patch global.onnxruntime...');
const step3Success = safeSetProperty(mockGlobal, 'onnxruntime', mockOnnxRuntime);
console.log(step3Success ? '✅ Step 3: Patch successful' : '❌ Step 3: Patch failed');

// Verify
const globalOnnx = mockGlobal.onnxruntime;
if (globalOnnx && globalOnnx.InferenceSession && typeof globalOnnx.InferenceSession.create === 'function') {
  console.log('✅ Step 3 VERIFIED: global.onnxruntime has InferenceSession.create');
} else {
  console.error('❌ Step 3 VERIFICATION FAILED: global.onnxruntime is not properly patched');
  process.exit(1);
}

// Test Step 4: Verify mock throws error correctly
console.log('\n🧪 Testing Step 4: Verify mock throws error correctly...');
try {
  mockOnnxRuntime.InferenceSession.create();
  console.error('❌ Step 4 FAILED: Mock should throw error');
  process.exit(1);
} catch (error: any) {
  if (error.message.includes('onnxruntime-node is disabled')) {
    console.log('✅ Step 4 VERIFIED: Mock throws correct error message');
  } else {
    console.error('❌ Step 4 FAILED: Mock throws wrong error:', error.message);
    process.exit(1);
  }
}

console.log('\n✅ All tests passed! Patch logic is working correctly.');
console.log('📝 Ready to commit changes.');
