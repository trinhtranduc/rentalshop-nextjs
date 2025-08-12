# TopNavigation Usage Guide

## Overview

We now have two versions of TopNavigation to support both client and server components:

1. **`TopNavigation`** - For client components (uses React hooks)
2. **`ServerTopNavigation`** - For server components (no hooks, form-based actions)

## Client Component Usage

Use `TopNavigation` when you need interactive features and can use React hooks:

```typescript
'use client'

import { TopNavigation } from '@rentalshop/ui'
import { usePathname } from 'next/navigation'

export default function ClientPage() {
  const pathname = usePathname()

  const handleSearch = (query: string) => {
    console.log('Search:', query)
    // Handle search
  }

  const handleLogout = () => {
    // Handle logout
  }

  const handleProfileClick = () => {
    // Handle profile click
  }

  return (
    <TopNavigation
      variant="client"
      currentPage={pathname}
      notificationsCount={5}
      cartItemsCount={3}
      onSearch={handleSearch}
      onLogout={handleLogout}
      onProfileClick={handleProfileClick}
    />
  )
}
```

## Server Component Usage

Use `ServerTopNavigation` when you're in a server component or need form-based actions:

```typescript
import { ServerTopNavigation } from '@rentalshop/ui'

export default function ServerPage() {
  return (
    <ServerTopNavigation
      variant="client"
      currentPage="/dashboard"
      notificationsCount={5}
      cartItemsCount={3}
      searchAction="/api/search"
      logoutAction="/api/logout"
      profileAction="/profile"
    />
  )
}
```

## Main Layout Usage (Recommended)

For the main layout, use `ServerTopNavigation` since it's a server component:

```typescript
// apps/client/app/layout.tsx
import { ServerTopNavigation } from '@rentalshop/ui'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ServerTopNavigation
          variant="client"
          currentPage="/"
          notificationsCount={3}
          cartItemsCount={5}
          searchAction="/search"
          logoutAction="/logout"
          profileAction="/profile"
        />
        <main>{children}</main>
      </body>
    </html>
  )
}
```

## Key Differences

| Feature | TopNavigation | ServerTopNavigation |
|---------|---------------|-------------------|
| **Component Type** | Client Component | Server Component |
| **Hooks** | ✅ Uses `useState` | ❌ No hooks |
| **Interactivity** | ✅ Full React interactivity | ⚠️ Limited (form-based) |
| **Mobile Menu** | ✅ Dynamic toggle | ⚠️ Requires JavaScript |
| **Search** | ✅ `onSearch` callback | ✅ Form action |
| **Logout** | ✅ `onLogout` callback | ✅ Form action |
| **Profile** | ✅ `onProfileClick` callback | ✅ Form action |

## Props

### TopNavigation Props
- `variant`: 'client' | 'admin'
- `currentPage`: string (required)
- `notificationsCount`: number
- `cartItemsCount`: number
- `onSearch`: (query: string) => void
- `onLogout`: () => void
- `onProfileClick`: () => void

### ServerTopNavigation Props
- `variant`: 'client' | 'admin'
- `currentPage`: string (required)
- `notificationsCount`: number
- `cartItemsCount`: number
- `searchAction`: string (form action URL)
- `logoutAction`: string (form action URL)
- `profileAction`: string (form action URL)

## Best Practices

1. **Use ServerTopNavigation in layouts** - Better performance, no hydration issues
2. **Use TopNavigation in interactive pages** - When you need custom behavior
3. **Set currentPage correctly** - Ensures proper active state highlighting
4. **Provide form actions** - For ServerTopNavigation to work properly
5. **Handle mobile menu** - Include JavaScript for mobile functionality

## Mobile Menu JavaScript

For ServerTopNavigation mobile menu to work, include this script:

```html
<script src="/components/mobile-menu.js"></script>
```

Or use Next.js Script component:

```typescript
import Script from 'next/script'

<Script src="/components/mobile-menu.js" strategy="afterInteractive" />
```
