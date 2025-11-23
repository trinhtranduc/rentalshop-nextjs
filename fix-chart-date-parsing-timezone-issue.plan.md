<!-- 2fc2c39d-93a5-4177-9155-6cb34330553a a5a6fc3d-0dbf-4967-988b-f5ece11d6704 -->
# Update User Localization and Review Plan Types Display

## Problem Analysis

1. **Localization Issues**: User components have hardcoded English strings, especially:

   - `ChangePasswordDialog.tsx`: All strings are hardcoded (title, labels, placeholders, error messages, buttons)
   - `UserActions.tsx`: Hardcoded strings in confirmation dialogs
   - `UserFormValidation.ts`: Some error messages may be hardcoded

2. **Plan Types Display**: Review and update existing subscription plan types display pages to ensure they properly show all plan types (TRIAL, BASIC, PROFESSIONAL, ENTERPRISE) with their permissions and features.

## Implementation Steps

### 1. Update ChangePasswordDialog Localization

**File**: `packages/ui/src/components/features/Users/components/ChangePasswordDialog.tsx`

- Import `useUsersTranslations` and `useCommonTranslations` hooks
- Replace all hardcoded strings:
  - "Change Password" → `t('dialogs.changePasswordTitle')`
  - "Change password for user:" → `t('dialogs.changePasswordDescription')`
  - "New Password *" → `t('dialogs.newPassword')`
  - "Confirm New Password *" → `t('dialogs.confirmNewPassword')`
  - "Enter new password" → `t('placeholders.enterNewPassword')`
  - "Confirm new password" → `t('placeholders.confirmNewPassword')`
  - "Password must be at least 6 characters long" → `t('messages.passwordMinLength')`
  - "New password is required" → `t('messages.newPasswordRequired')`
  - "New password must be at least 6 characters long" → `t('messages.passwordMinLength')`
  - "Please confirm your new password" → `t('messages.confirmPasswordRequired')`
  - "Passwords do not match" → `t('messages.passwordsDoNotMatch')`
  - "Failed to change password" → `t('messages.passwordChangeFailed')`
  - "Cancel" → `tc('buttons.cancel')`
  - "Changing..." → `t('actions.changingPassword')`
  - "Change Password" → `t('actions.changePassword')`

### 2. Update UserActions Localization

**File**: `packages/ui/src/components/features/Users/components/UserActions.tsx`

- Import `useUsersTranslations` and `useCommonTranslations` hooks
- Replace hardcoded strings:
  - "Deactivate User" → `t('messages.confirmDeactivateAccount')`
  - "Are you sure you want to deactivate..." → `t('messages.confirmDeactivate')`
  - "This action will prevent them from accessing the system." → `t('messages.confirmDeactivateDetails')`
  - "Deactivate" → `t('actions.deactivate')`
  - "Cancel" → `tc('buttons.cancel')`

### 3. Add Missing Localization Keys

**Files**:

- `locales/en/users.json`
- `locales/vi/users.json`

Add missing keys:

```json
{
  "dialogs": {
    "changePasswordTitle": "Change Password",
    "changePasswordDescription": "Change password for user:",
    "newPassword": "New Password",
    "confirmNewPassword": "Confirm New Password"
  },
  "placeholders": {
    "enterNewPassword": "Enter new password",
    "confirmNewPassword": "Confirm new password"
  },
  "messages": {
    "passwordMinLength": "Password must be at least 6 characters long",
    "newPasswordRequired": "New password is required",
    "confirmPasswordRequired": "Please confirm your new password",
    "passwordsDoNotMatch": "Passwords do not match",
    "passwordChangeFailed": "Failed to change password"
  },
  "actions": {
    "changingPassword": "Changing..."
  }
}
```

### 4. Review and Update Existing Plan Types Display Pages

**Existing Pages to Review**:

1. **`apps/client/app/pricing/page.tsx`** - Already displays plans from `SUBSCRIPTION_PLANS` constant
   - ✅ Shows all plan types (TRIAL, BASIC, PROFESSIONAL, ENTERPRISE)
   - ✅ Displays limits, features, platform access, and public product check
   - ✅ Has feature comparison table
   - **Review**: Ensure all plan types are displayed correctly
   - **Review**: Verify all permissions and features are shown
   - **Update**: Add localization support if needed
   - **Update**: Ensure TRIAL plan is included in display

2. **`apps/client/app/plans/page.tsx`** - Displays plans from API
   - ✅ Shows plan cards with features and limits
   - ✅ Displays current subscription status
   - **Review**: Ensure it properly displays all plan types
   - **Review**: Verify it shows all permissions and features
   - **Update**: Add localization support if needed
   - **Update**: Ensure consistency with `SUBSCRIPTION_PLANS` constant

**Review Checklist**:
- [ ] Both pages display all 4 plan types (TRIAL, BASIC, PROFESSIONAL, ENTERPRISE)
- [ ] All plan limits are displayed correctly (outlets, users, products, customers, orders)
- [ ] All features are listed for each plan
- [ ] Platform access (mobile, mobile+web) is clearly shown
- [ ] Public product check permission is displayed
- [ ] Upgrade/downgrade paths are shown (if applicable)
- [ ] Plan pricing is displayed correctly
- [ ] Localization is implemented (if needed)

**Potential Updates**:
- Add localization keys for plan names, descriptions, and features
- Ensure TRIAL plan is prominently displayed (currently may be filtered out)
- Add comparison matrix showing all plans side-by-side
- Add detailed permissions breakdown for each plan

### 5. Add Plan Types Localization (if needed)

**Files**:

- `locales/en/plans.json` (already exists - review and update)
- `locales/vi/plans.json` (already exists - review and update)

Review existing keys and add missing plan type names and descriptions for localization support.

## Files to Modify

1. `packages/ui/src/components/features/Users/components/ChangePasswordDialog.tsx` - Add localization
2. `packages/ui/src/components/features/Users/components/UserActions.tsx` - Add localization
3. `locales/en/users.json` - Add missing keys
4. `locales/vi/users.json` - Add missing keys
5. `apps/client/app/pricing/page.tsx` - Review and update plan display (if needed)
6. `apps/client/app/plans/page.tsx` - Review and update plan display (if needed)
7. `locales/en/plans.json` - Review and update with plan translations (if needed)
8. `locales/vi/plans.json` - Review and update with plan translations (if needed)

## Testing Checklist

- [ ] ChangePasswordDialog displays all strings in English and Vietnamese
- [ ] UserActions confirmation dialogs display localized strings
- [ ] Pricing page displays all 4 plan types (TRIAL, BASIC, PROFESSIONAL, ENTERPRISE)
- [ ] Plans page displays all plan types correctly
- [ ] Both pages show limits, features, and permissions for each plan
- [ ] Plan types pages are accessible and display correctly
- [ ] TRIAL plan is visible and properly displayed

### To-dos

- [x] Fix user creation: firstName and lastName should be optional
- [x] Fix change password: minimum 6 characters instead of 8
- [x] Fix password validation: at least 6 characters in all places
- [x] Fix phone validation: make it optional
- [ ] Review existing plan types display pages
- [ ] Update plan display pages if needed
- [ ] Add localization for plan types (if needed)

