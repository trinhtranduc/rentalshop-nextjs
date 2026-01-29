# Railway Environment Variables for Image Search

## Required Environment Variables

Để image search hoạt động trên Railway, bạn cần set các environment variables sau trong Railway Dashboard:

### 1. Open Railway Dashboard
- Vào project của bạn trên Railway
- Click vào service (API service)
- Vào tab "Variables"

### 2. Add these environment variables:

```
USE_ONNXRUNTIME=false
USE_BROWSER=false
ONNXRUNTIME_NODE_DISABLE=true
```

### 3. Why these are needed:

- **USE_ONNXRUNTIME=false**: Forces `@xenova/transformers` to use pure JavaScript/WebAssembly mode instead of native ONNX Runtime
- **USE_BROWSER=false**: Prevents browser-specific code from running
- **ONNXRUNTIME_NODE_DISABLE=true**: Explicitly disables `onnxruntime-node` which requires glibc (not available in Alpine Linux)

### 4. After adding variables:

1. Redeploy the service (Railway will automatically redeploy when you add variables)
2. Check logs to verify environment variables are set:
   ```
   Look for: "🔧 @xenova/transformers environment:"
   ```

### 5. Verify it's working:

Check logs for:
- ✅ `Model loaded successfully` - Model loaded without errors
- ❌ `ERR_DLOPEN_FAILED` - Still trying to load native module (check environment variables)

## Troubleshooting

If you still see `ERR_DLOPEN_FAILED`:

1. **Check Railway logs** - Look for the environment check log:
   ```
   🔧 @xenova/transformers environment: {
     USE_ONNXRUNTIME: 'false',
     USE_BROWSER: 'false',
     ONNXRUNTIME_NODE_DISABLE: 'true',
     ...
   }
   ```

2. **If environment variables are not set**:
   - Make sure you added them in Railway Dashboard
   - Redeploy the service
   - Check that variables are not being overridden elsewhere

3. **If still failing**:
   - Check Railway service logs for detailed error messages
   - Verify the Docker image was built with the latest code
   - Check if there are any memory/resource constraints

## Alternative: Set in Railway CLI

If you prefer using Railway CLI:

```bash
railway variables set USE_ONNXRUNTIME=false
railway variables set USE_BROWSER=false
railway variables set ONNXRUNTIME_NODE_DISABLE=true
```
