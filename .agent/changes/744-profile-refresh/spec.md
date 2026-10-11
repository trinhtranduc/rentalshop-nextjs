# Spec — #744

1. Every `useAuth()` instance is tied to the others through localStorage (`storeAuthData` fires `auth-storage-change`). The sync ran only when the user id changed, so a changed name or phone of the same user never reached the sidebar (a second instance).
2. `storedUserDiffers(current, stored)` (`packages/hooks/src/hooks/auth-sync.ts`): the instance takes the stored user when id, first/last/display name, phone, email, role, isActive or updatedAt differ. The instance that just refreshed holds the same values and keeps its richer state.
3. The web e2e session init script sets the session only when none is stored: it ran on every navigation and put the login-time user back, which hid the bug from a reload.
