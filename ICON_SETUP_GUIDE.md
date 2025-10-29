# 🎨 Hướng dẫn setup Icon & Favicon cho Rental Shop

## 📍 Nơi lưu trữ Icon

### Cấu trúc thư mục cho mỗi app:

```
apps/
├── client/
│   └── public/
│       ├── favicon.ico          # Legacy favicon (16x16)
│       ├── favicon-16x16.png    # Small favicon
│       ├── favicon-32x32.png    # Standard favicon
│       ├── apple-touch-icon.png # iOS Safari icon (180x180)
│       ├── android-chrome-192x192.png # Android icon
│       └── android-chrome-512x512.png # Android icon (large)
├── admin/
│   └── public/
│       └── [same structure]
└── api/
    └── public/
        └── [same structure]
```

## 🎯 Danh sách Icon cần thiết

### 1. Favicon (Browser Tab)
```
favicon.ico        - 16x16, 32x32, 48x48 (ICO format) - BẮT BUỘC
favicon-16x16.png  - 16x16 PNG
favicon-32x32.png  - 32x32 PNG
```

### 2. Apple Touch Icon (iOS Safari)
```
apple-touch-icon.png - 180x180 PNG - iPhone/iPad
```

### 3. Android Chrome Icons
```
android-chrome-192x192.png - 192x192 PNG - Android home screen
android-chrome-512x512.png - 512x512 PNG - Android home screen (large)
```

### 4. Web App Manifest (PWA)
```
manifest.json - JSON file định nghĩa app metadata
site.webmanifest - Alternative manifest name
```

## 📝 Kích thước chuẩn

| Icon Name | Kích thước | Format | Mục đích |
|-----------|-----------|--------|----------|
| `favicon.ico` | 16x16, 32x32, 48x48 | ICO | Browser tab |
| `favicon-16x16.png` | 16x16 | PNG | Browser tab |
| `favicon-32x32.png` | 32x32 | PNG | Browser tab |
| `apple-touch-icon.png` | 180x180 | PNG | iOS home screen |
| `android-chrome-192x192.png` | 192x192 | PNG | Android home screen |
| `android-chrome-512x512.png` | 512x512 | PNG | Android home screen (large) |

## 🔧 Cách tạo Icon

### Bước 1: Tạo icon chính (512x512)
```bash
# Tạo file SVG logo của bạn (recommend 512x512)
# Ví dụ: rentallogo.svg
```

### Bước 2: Convert sang các kích thước
```bash
# Install ImageMagick
brew install imagemagick  # macOS
sudo apt-get install imagemagick  # Linux

# Generate all sizes from master icon
convert rentallogo.png -resize 16x16 favicon-16x16.png
convert rentallogo.png -resize 32x32 favicon-32x32.png
convert rentallogo.png -resize 180x180 apple-touch-icon.png
convert rentallogo.png -resize 192x192 android-chrome-192x192.png
convert rentallogo.png -resize 512x512 android-chrome-512x512.png

# Create .ico file
convert rentallogo.png favicon.ico
```

### Bước 3: Online Tool (Đơn giản hơn)
Sử dụng công cụ online:
- https://realfavicongenerator.net/
- https://favicon.io/

**Upload logo 512x512** → Tải về tất cả các kích thước đã được tạo sẵn.

## 📄 Manifest Files

### `manifest.json` (cho mỗi app)

**apps/client/public/manifest.json:**
```json
{
  "name": "RentalShop Client",
  "short_name": "RentalShop",
  "description": "Rental shop management for shop owners",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**apps/admin/public/manifest.json:**
```json
{
  "name": "RentalShop Admin",
  "short_name": "Admin",
  "description": "Administration panel for rental shop",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1e293b",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**apps/api/public/manifest.json:**
```json
{
  "name": "RentalShop API",
  "short_name": "API",
  "description": "Rental shop API server",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## 🔗 Cách kết nối Icon với Next.js

### Cách 1: Next.js tự động (Recommended cho App Router)

Next.js 13+ tự động tìm icon trong `public/` folder:

```
apps/client/public/
├── icon.png (or icon.ico)  ← Next.js tự động detect
├── apple-icon.png           ← Apple touch icon
├── opengraph-image.png     ← Open Graph image
└── ...
```

**File naming:**
- `icon.png` hoặc `icon.ico` → Favicon
- `apple-icon.png` → Apple touch icon
- `opengraph-image.png` → Social media preview

### Cách 2: Manual trong metadata

```typescript
// apps/client/app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rental Shop - Client',
  description: 'Rental shop management system for shop owners',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  themeColor: '#3b82f6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RentalShop Client',
  },
}
```

## 📋 Checklist setup Icon

### Client App
- [ ] Tạo `apps/client/public/favicon.ico`
- [ ] Tạo `apps/client/public/favicon-16x16.png`
- [ ] Tạo `apps/client/public/favicon-32x32.png`
- [ ] Tạo `apps/client/public/apple-touch-icon.png`
- [ ] Tạo `apps/client/public/android-chrome-192x192.png`
- [ ] Tạo `apps/client/public/android-chrome-512x512.png`
- [ ] Tạo `apps/client/public/manifest.json`
- [ ] Cập nhật `apps/client/app/layout.tsx` với metadata icons

### Admin App
- [ ] Tạo `apps/admin/public/favicon.ico`
- [ ] Tạo `apps/admin/public/favicon-16x16.png`
- [ ] Tạo `apps/admin/public/favicon-32x32.png`
- [ ] Tạo `apps/admin/public/apple-touch-icon.png`
- [ ] Tạo `apps/admin/public/android-chrome-192x192.png`
- [ ] Tạo `apps/admin/public/android-chrome-512x512.png`
- [ ] Tạo `apps/admin/public/manifest.json`
- [ ] Cập nhật `apps/admin/app/layout.tsx` với metadata icons

### API App
- [ ] Tạo `apps/api/public/favicon.ico`
- [ ] Tạo `apps/api/public/favicon-16x16.png`
- [ ] Tạo `apps/api/public/favicon-32x32.png`
- [ ] Tạo `apps/api/public/apple-touch-icon.png`
- [ ] Tạo `apps/api/public/android-chrome-192x192.png`
- [ ] Tạo `apps/api/public/android-chrome-512x512.png`
- [ ] Tạo `apps/api/public/manifest.json`
- [ ] Cập nhật `apps/api/app/layout.tsx` với metadata icons

## 🎨 Design Guidelines

### Color Scheme (cho từng app)
- **Client**: Blue (#3b82f6) - Friendly, customer-facing
- **Admin**: Dark Blue (#1e293b) - Professional, admin tools
- **API**: Indigo (#6366f1) - Technical, API documentation

### Icon Design Tips
1. **Keep it simple**: Simple design works best at small sizes
2. **High contrast**: Ensure visibility on all backgrounds
3. **Brand consistency**: Use same design across all apps
4. **Test size**: View at 16x16 to ensure readability
5. **SVG source**: Keep master in SVG format, export to PNG

## 🌐 Browser Support

| Browser | Favicon.ico | PNG Icons | Manifest |
|---------|-------------|-----------|----------|
| Chrome | ✅ Required | ✅ Used | ✅ PWA |
| Firefox | ✅ Required | ✅ Used | ✅ PWA |
| Safari | ✅ Required | ✅ Used | ✅ PWA |
| Edge | ✅ Required | ✅ Used | ✅ PWA |
| Opera | ✅ Required | ✅ Used | ✅ PWA |

## 📱 Mobile Support

| Platform | Icon Support |
|----------|--------------|
| iOS Safari | `apple-touch-icon.png` (180x180) |
| Android Chrome | Manifest icons (192x192, 512x512) |
| PWA | Manifest icons |

## 🚀 Testing

### Test Favicon
```bash
# Start dev server
cd apps/client && yarn dev

# Open browser at http://localhost:3000
# Check tab icon appears
```

### Test PWA
1. Open Chrome DevTools
2. Go to **Application** tab
3. Check **Manifest** section
4. Verify icons are loaded

### Test Mobile
1. Use browser emulator (Chrome DevTools)
2. Test on actual device
3. Add to home screen
4. Verify icon appears correctly

## 🎯 Quick Start

1. **Tạo logo chính**: Design 512x512 logo
2. **Generate icons**: Use https://realfavicongenerator.net/
3. **Copy files**: Đặt vào `public/` folder của mỗi app
4. **Update metadata**: Cập nhật `layout.tsx` của mỗi app
5. **Test**: Chạy dev server và kiểm tra icon hiển thị

## 📚 References

- [Next.js Icon Documentation](https://nextjs.org/docs/app/building-your-application/optimizing/metadata#defaults)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Favicon.ico Guide](https://www.favicon.cc/)
- [Web App Manifest](https://web.dev/add-manifest/)

