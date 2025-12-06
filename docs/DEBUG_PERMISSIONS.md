# 🔍 Debug Permissions Guide

## Cách Kiểm Tra Permissions

### 1. **Trong Browser Console (Khi Login)**

Khi login, check console logs:

```javascript
// Backend logs (server console)
🔍 LOGIN: Permissions to be sent to frontend: {
  userRole: "OUTLET_ADMIN",
  permissionsCount: 15,
  permissions: ["outlet.manage", "bankAccounts.view", ...],
  hasBankAccountsView: true,
  hasBankAccountsManage: true
}

// Frontend logs (browser console)
🔍 LOGIN RESPONSE: {
  success: true,
  hasToken: true,
  user: {...},
  userPermissions: ["outlet.manage", "bankAccounts.view", ...],
  permissionsCount: 15
}

🔍 LOGIN: Stored permissions in localStorage: {
  hasPermissions: true,
  permissionsCount: 15,
  permissions: ["outlet.manage", "bankAccounts.view", ...]
}
```

### 2. **Trong Settings Page (Bank Accounts Tab)**

Khi vào tab **Bank Accounts** trong Settings, bạn sẽ thấy:

1. **Bank Account List** (nếu có permissions)
2. **Permissions Debug Component** (luôn hiển thị để debug)

Debug component hiển thị:
- ✅ Permissions từ `useAuth` hook (user.permissions)
- ✅ Permissions từ `usePermissions` hook (computed)
- ✅ Permissions từ localStorage (authData)
- ✅ Bank Account permissions check (bankAccounts.view, bankAccounts.manage)
- ✅ Full localStorage authData (click để expand)

### 3. **Trong Browser DevTools**

#### Xem localStorage:

```javascript
// Open DevTools → Application → Local Storage
// Tìm key: "authData"
// Parse JSON để xem:

const authData = JSON.parse(localStorage.getItem('authData'));
console.log('User:', authData.user);
console.log('Permissions:', authData.user.permissions);
```

#### Xem trong Console:

```javascript
// Check permissions từ localStorage
const authData = JSON.parse(localStorage.getItem('authData'));
console.log('Permissions:', authData?.user?.permissions);

// Check permissions từ useAuth hook (trong React component)
// Component sẽ log permissions khi render
```

### 4. **Check Permissions trong Code**

#### Trong Component:

```typescript
import { useAuth, usePermissions } from '@rentalshop/hooks';

const MyComponent = () => {
  const { user } = useAuth();
  const { permissions, hasPermission, canViewBankAccounts } = usePermissions();
  
  console.log('User permissions:', user?.permissions);
  console.log('Hook permissions:', permissions);
  console.log('Can view bank accounts:', canViewBankAccounts);
  
  // Check specific permission
  if (hasPermission('bankAccounts.view')) {
    // User can view bank accounts
  }
};
```

## Common Issues & Solutions

### Issue 1: Permissions là empty array `[]`

**Nguyên nhân:**
- `getUserPermissions()` return empty array
- User role không match với ROLE_PERMISSIONS keys
- Custom permissions không được load đúng

**Giải pháp:**
1. Check backend logs khi login:
   ```
   🔍 getUserPermissions returned: {
     permissionsCount: 0,  // ❌ Should be > 0
     permissions: []
   }
   ```
2. Check user role:
   ```javascript
   console.log('User role:', user.role);
   // Should be: "ADMIN", "MERCHANT", "OUTLET_ADMIN", or "OUTLET_STAFF"
   ```
3. Check ROLE_PERMISSIONS trong `packages/auth/src/core.ts`:
   ```typescript
   export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
     'OUTLET_ADMIN': [
       'bankAccounts.manage', 
       'bankAccounts.view',  // ✅ Should be here
       // ...
     ],
     // ...
   };
   ```

### Issue 2: Permissions không được store trong localStorage

**Nguyên nhân:**
- Login response không include permissions
- `storeAuthData()` không store permissions đúng cách

**Giải pháp:**
1. Check login response:
   ```javascript
   // In browser console after login
   const authData = JSON.parse(localStorage.getItem('authData'));
   console.log('Has permissions:', !!authData?.user?.permissions);
   console.log('Permissions:', authData?.user?.permissions);
   ```
2. Check `storeAuthData()` function:
   ```typescript
   // packages/utils/src/core/common.ts
   permissions: (user as any).permissions || [],  // ✅ Should store permissions
   ```

### Issue 3: Permissions không được pass vào component

**Nguyên nhân:**
- `useAuth()` hook không return permissions
- `getStoredUser()` không include permissions

**Giải pháp:**
1. Check `useAuth()` hook:
   ```typescript
   const { user } = useAuth();
   console.log('User from hook:', user);
   console.log('User permissions:', user?.permissions);
   ```
2. Check `getStoredUser()`:
   ```typescript
   // Should return user with permissions
   const storedUser = getStoredUser();
   console.log('Stored user permissions:', storedUser?.permissions);
   ```

### Issue 4: `canViewBankAccounts` return false

**Nguyên nhân:**
- User không có `bankAccounts.view` permission
- Permissions không được load đúng

**Giải pháp:**
1. Check permissions array:
   ```javascript
   const { permissions, hasPermission } = usePermissions();
   console.log('Has bankAccounts.view:', hasPermission('bankAccounts.view'));
   console.log('All permissions:', permissions);
   ```
2. Check user role:
   - Only `OUTLET_ADMIN` has `bankAccounts.view` by default
   - `OUTLET_STAFF` does NOT have this permission
3. Login lại để refresh permissions:
   ```javascript
   // Permissions được load khi login
   // Nếu permissions thay đổi, cần login lại
   ```

## Debug Checklist

Khi permissions không hoạt động, check theo thứ tự:

- [ ] **Backend**: Check login API response có include `permissions` array không
- [ ] **Backend**: Check `getUserPermissions()` return permissions đúng không
- [ ] **Backend**: Check user role có trong `ROLE_PERMISSIONS` không
- [ ] **Frontend**: Check login response có `data.user.permissions` không
- [ ] **Frontend**: Check `storeAuthData()` có store permissions không
- [ ] **Frontend**: Check localStorage có `authData.user.permissions` không
- [ ] **Frontend**: Check `useAuth()` hook return user với permissions không
- [ ] **Frontend**: Check `usePermissions()` hook có lấy permissions từ user không
- [ ] **Component**: Check component có sử dụng `usePermissions()` đúng không

## Quick Debug Commands

### In Browser Console:

```javascript
// 1. Check localStorage
const authData = JSON.parse(localStorage.getItem('authData'));
console.log('Permissions:', authData?.user?.permissions);

// 2. Check if bankAccounts.view exists
const hasView = authData?.user?.permissions?.includes('bankAccounts.view');
console.log('Has bankAccounts.view:', hasView);

// 3. Check user role
console.log('User role:', authData?.user?.role);

// 4. Clear and re-login (if needed)
localStorage.clear();
window.location.href = '/login';
```

### In Component:

```typescript
// Add to any component
const { user } = useAuth();
const { permissions, canViewBankAccounts } = usePermissions();

useEffect(() => {
  console.log('🔍 DEBUG PERMISSIONS:', {
    userPermissions: user?.permissions,
    hookPermissions: permissions,
    canViewBankAccounts,
    userRole: user?.role,
  });
}, [user, permissions, canViewBankAccounts]);
```

## Expected Permissions by Role

### OUTLET_ADMIN
```javascript
[
  'outlet.manage', 'outlet.view',
  'users.view',
  'products.manage', 'products.view', 'products.export',
  'orders.create', 'orders.view', 'orders.update', 'orders.delete', 'orders.export', 'orders.manage',
  'customers.manage', 'customers.view', 'customers.export',
  'analytics.view',
  'bankAccounts.manage', 'bankAccounts.view'  // ✅ Has bank accounts permissions
]
```

### OUTLET_STAFF
```javascript
[
  'outlet.view',
  'products.view',
  'orders.create', 'orders.view', 'orders.update',
  'customers.view', 'customers.manage'
  // ❌ NO bankAccounts permissions
]
```

## Next Steps

1. **Login lại** để refresh permissions
2. **Check console logs** khi login
3. **Vào Settings → Bank Accounts tab** để xem debug component
4. **Check localStorage** để verify permissions được store
5. **Report findings** nếu vẫn không có permissions

