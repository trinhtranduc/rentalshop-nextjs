# Dependency Cleanup Analysis

## 📊 Dependencies Analysis for Admin App

### ❌ Dependencies NOT Used (Can be removed)

1. **`critters`** - ❌ NOT USED
   - Không có file nào import critters
   - Next.js tự động xử lý CSS optimization
   - **Action**: Remove

### ✅ Dependencies USED (Keep - Used in @rentalshop/ui)

1. **`formik`** - ✅ USED in @rentalshop/ui
   - Used in: RegisterForm, LoginForm, ForgetPasswordForm, ResetPasswordForm
   - **Action**: Keep (required by @rentalshop/ui)

2. **`yup`** - ✅ USED in @rentalshop/ui
   - Used in: RegisterForm, LoginForm, ForgetPasswordForm, ResetPasswordForm
   - **Action**: Keep (required by @rentalshop/ui)

### ⚠️ Dependencies to Verify

1. **`@hookform/resolvers`** - ⚠️ NEEDS VERIFICATION
   - Có trong package.json
   - Không thấy dùng trong admin app code
   - Có thể được dùng trong @rentalshop/ui packages
   - **Action**: Check if used in packages, if not → Remove

2. **`react-hook-form`** - ⚠️ NEEDS VERIFICATION
   - Có trong package.json
   - Không thấy dùng useForm, Controller, FormProvider trong admin app
   - Có thể được dùng trong @rentalshop/ui packages
   - **Action**: Check if used in packages, if not → Remove

### ✅ Dependencies USED (Keep)

1. **`next`** - ✅ USED
   - Core framework

2. **`next-auth`** - ✅ USED
   - Authentication

3. **`next-intl`** - ✅ USED
   - Internationalization (i18n)

4. **`react`** & **`react-dom`** - ✅ USED
   - Core React

5. **`lucide-react`** - ✅ USED
   - Icons (used extensively)

6. **`zod`** - ✅ USED
   - Validation (used instead of yup)

7. **`tailwindcss-animate`** - ✅ USED
   - Tailwind animations

8. **`@rentalshop/*` packages** - ✅ USED
   - Internal workspace packages

## 🔧 Recommended Actions

### Step 1: Remove Unused Dependencies

```bash
cd apps/admin
yarn remove critters
```

### Step 2: Verify @hookform/resolvers and react-hook-form

Check if used in packages:
```bash
# Check in packages
grep -r "react-hook-form\|@hookform" packages/
```

If NOT used:
```bash
yarn remove @hookform/resolvers react-hook-form
```

### Step 3: Clean up and rebuild

```bash
# Clean node_modules
yarn clean:all

# Reinstall
yarn install

# Test build
yarn build
```

## 📈 Expected Benefits

1. **Reduced Bundle Size**
   - critters: ~20KB
   - Total: ~20KB reduction

2. **Note**: formik và yup được giữ lại vì được dùng trong @rentalshop/ui forms

2. **Faster Build Times**
   - Less packages to install
   - Less packages to bundle
   - Faster dependency resolution

3. **Cleaner Dependencies**
   - Only keep what's needed
   - Easier to maintain
   - Clearer project structure

## ⚠️ Before Removing

1. **Test thoroughly** after removal
2. **Check all packages** for indirect usage
3. **Verify build** still works
4. **Test runtime** functionality

## 📝 Notes

- `critters` - Not used, can be safely removed
- `formik` và `yup` - **KEEP** - Used in @rentalshop/ui forms (RegisterForm, LoginForm, etc.)
- `react-hook-form` và `@hookform/resolvers` - Not used, can be removed
- `zod` - Used for API validation, different from form validation (yup)
