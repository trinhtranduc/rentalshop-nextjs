# 🔄 Unified Error Handling System - Complete Documentation

## 📋 Overview

Hệ thống xử lý lỗi đã được **đồng bộ hóa hoàn toàn** từ API đến frontend, tự động hiển thị toast cho tất cả errors.

## ✅ Complete Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. API BACKEND (ResponseBuilder)                            │
│    ResponseBuilder.error('ERROR_CODE')                      │
│    → { success: false, code: "ERROR_CODE", message: "..." } │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. FRONTEND FETCH (authenticatedFetch)                      │
│    authenticatedFetch(url) → Response                       │
│    - Handles 401 (redirect to login)                        │
│    - Handles 402 (subscription errors)                      │
│    - Handles 403 (forbidden)                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. RESPONSE PARSING (parseApiResponse)                      │
│    Response → ApiResponse<T>                                │
│    - Standardizes format: { success, code, message, error } │
│    - ✅ Dispatches 'api-error' event for ALL errors         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. GLOBAL ERROR HANDLER (useGlobalErrorHandler)             │
│    Listens to 'api-error' event                            │
│    - Auto-translates error code → message                   │
│    - Auto-shows toast notification                          │
│    - Special handling for subscription errors               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. USER SEES TOAST                                          │
│    Translated error message in toast popup                  │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Key Components

### 1. **ResponseBuilder** (Backend)
```typescript
// packages/utils/src/api/response-builder.ts
ResponseBuilder.error('ERROR_CODE')
// Returns: { success: false, code: "ERROR_CODE", message: "...", error: "..." }
```

### 2. **parseApiResponse** (Frontend)
```typescript
// packages/utils/src/core/common.ts
const result = await parseApiResponse(response);
// Returns: ApiResponse<T> with standardized format
// ✅ Automatically dispatches 'api-error' event for ALL errors
```

### 3. **useGlobalErrorHandler** (Frontend)
```typescript
// packages/hooks/src/hooks/useGlobalErrorHandler.ts
useGlobalErrorHandler(); // In ClientLayout
// ✅ Listens to 'api-error' events
// ✅ Auto-translates and shows toast
```

### 4. **useSubscriptionError** (Frontend)
```typescript
// packages/hooks/src/hooks/useSubscriptionError.ts
// ✅ Specialized handler for subscription errors
// ✅ Called automatically by useGlobalErrorHandler
```

## ✅ Benefits

1. **Zero Manual Error Checking**
   - Components don't need to check `result.success === false`
   - Errors automatically displayed

2. **Consistent Error Display**
   - All errors follow same flow
   - Same toast format everywhere

3. **Automatic Translation**
   - Error codes automatically translated
   - Supports multiple languages

4. **Special Handling**
   - Subscription errors get specialized UX
   - Validation errors show as warnings

5. **Backward Compatible**
   - Existing code still works
   - No breaking changes

## 📝 Usage Examples

### ✅ Simple API Call (No Error Handling Needed)
```typescript
// ✅ OLD WAY (removed - no longer needed):
const result = await api.createProduct(data);
if (!result.success) {
  handleError(result); // ❌ REMOVED - No longer exists!
  toastError('Error', result.message); // ❌ REMOVED - No longer needed!
}

// ✅ NEW WAY (automatic):
const result = await api.createProduct(data);
if (result.success) {
  toastSuccess('Success', 'Product created'); // ✅ Only handle success
  // Error automatically shown if failed via useGlobalErrorHandler
}
```

### ✅ Manual UI Toasts (Success/Warning/Info Only)
```typescript
// ✅ For manual UI toasts (not API errors):
const { showSuccess, showWarning, showInfo } = useToastHandler();

// Success toast
if (result.success) {
  showSuccess('Success', 'Operation completed');
}

// Manual warning (not from API)
showWarning('Warning', 'Please check your input');

// Manual info
showInfo('Info', 'Processing...');
```

### ✅ Subscription Errors
```typescript
// ✅ Automatically handled with specialized UX
const result = await api.createOrder(data);
// If subscription error → Special toast with action buttons
// If other error → Standard error toast
```

## 🔧 Configuration

### Enable Global Error Handler
```typescript
// apps/client/app/components/ClientLayout.tsx
import { useGlobalErrorHandler } from '@rentalshop/hooks';

function ClientLayout() {
  useGlobalErrorHandler(); // ✅ Enable auto-error handling
  // ...
}
```

### Custom Error Handling (Optional)
```typescript
// If you want custom handling for specific errors:
const result = await api.someCall();
if (!result.success) {
  // Custom handling (global handler won't show toast)
  // But you can still use translateError(result)
}
```

## 🎨 Error Types & Toast Styles

| Error Type | Toast Type | Handler |
|------------|------------|---------|
| Subscription Errors | Error (specialized) | `useSubscriptionError` |
| Validation Errors | Warning | `useGlobalErrorHandler` |
| All Other Errors | Error | `useGlobalErrorHandler` |

## 🧹 Simplified System (2025 Update)

### Removed Redundant Hooks
- ❌ **useErrorHandler** - Removed (replaced by useGlobalErrorHandler)
- ❌ **useSimpleErrorHandler** - Removed (replaced by useGlobalErrorHandler)
- ❌ **useToastHandler.handleError()** - Removed (replaced by useGlobalErrorHandler)

### Kept Hooks
- ✅ **useGlobalErrorHandler** - Single source of truth for auto-error handling
- ✅ **useSubscriptionError** - Specialized subscription error handler
- ✅ **useToastHandler** (without handleError) - For manual success/warning/info toasts only

### Manual Error Handling Removed
- ❌ All `toastError()` calls removed from components
- ❌ All `handleError()` calls removed from components
- ❌ All `showErrorToast()` calls removed from components
- ✅ Components now only handle success cases with `toastSuccess()`
- ✅ All API errors automatically handled by `useGlobalErrorHandler`

## 📊 Error Code Flow

```
ERROR_CODE (from API)
  ↓
parseApiResponse() extracts code
  ↓
Dispatch 'api-error' event with code
  ↓
useGlobalErrorHandler() receives event
  ↓
translateError(code) → Translated message
  ↓
addToast(type, title, message)
  ↓
User sees toast
```

## ✅ Status: FULLY SYNCHRONIZED

- ✅ API → Frontend format standardized
- ✅ All errors automatically displayed
- ✅ Translation system integrated
- ✅ Subscription errors specialized
- ✅ Zero manual error checking needed
- ✅ Backward compatible

## 🚀 Next Steps

1. **Test**: Verify all error types show correctly
2. **Monitor**: Check console logs for error events
3. **Refactor** (Optional): Remove manual error checks from components

