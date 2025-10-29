# 🎨 Hướng Dẫn Tích Hợp Logo AnyRent

## ✅ Đã Hoàn Thành

Đã tạo Logo component linh hoạt để bạn có thể dùng icon mặc định hoặc logo PNG/SVG của bạn.

## 📍 Vị Trí Files

### Logo Component
- `packages/ui/src/components/ui/logo.tsx`
- Đã được export trong `@rentalshop/ui`

### Login Form
- `packages/ui/src/components/forms/LoginForm.tsx`
- Đã sử dụng Logo component

## 🎯 Cách Sử Dụng Logo Component

### **Option 1: Icon Mặc Định (Hiện tại)**
```tsx
import { Logo } from '@rentalshop/ui';

<Logo size="lg" variant="default" />
```

### **Option 2: Logo PNG của bạn**
```tsx
import { Logo } from '@rentalshop/ui';

// 1. Đưa file PNG vào public folder
// 2. Sử dụng component:
<Logo 
  size="lg" 
  variant="custom" 
  src="/logo.png" 
/>
```

### **Option 3: Với Text Label**
```tsx
<Logo 
  size="lg" 
  variant="default" 
  showLabel={true}
  labelText="AnyRent"
/>
```

### **Size Options:**
- `sm`: 32x32px
- `md`: 48x48px (default)
- `lg`: 64x64px
- `xl`: 80x80px

## 🔄 Cách Convert PNG → SVG

### **Option 1: Online Tools (Khuyến nghị)**

1. **RealfaviconGenerator** (Best)
   - https://realfavicongenerator.net/
   - Upload PNG → Generate SVG
   - Free & high quality

2. **Convertio**
   - https://convertio.co/png-svg/
   - Upload → Convert → Download
   - Fast & easy

3. **CloudConvert**
   - https://cloudconvert.com/png-to-svg
   - Supports many formats
   - Batch conversion

### **Option 2: Inkscape (Desktop)**

```bash
# Install
brew install inkscape  # macOS
# hoặc
sudo apt install inkscape  # Linux

# Convert PNG to SVG with tracing
inkscape logo.png --export-filename logo.svg
# hoặc với auto-trace
inkscape logo.png --export-type=svg
```

**Bước 1: Convert PNG → SVG**
```bash
inkscape logo.png --export-filename logo.svg
```

**Bước 2: Optimize SVG**
```bash
# Install SVGO
npm install -g svgo

# Optimize
svgo logo.svg -o logo-optimized.svg
```

### **Option 3: Python Script**

```python
# Install dependencies
pip install pillow cairosvg pillow-simd

# Basic conversion
from PIL import Image
img = Image.open('logo.png')
img.save('logo.svg')
```

## 📦 Tích Hợp Logo PNG vào Project

### **Bước 1: Convert PNG → SVG**

**Khuyến nghị:** Sử dụng https://realfavicongenerator.net/
1. Upload file PNG của bạn
2. Chọn "Generate this favicon"
3. Download SVG file

### **Bước 2: Thêm SVG vào Project**

```bash
# Đặt SVG vào public folder của mỗi app
apps/client/public/logo.svg
apps/admin/public/logo.svg
apps/api/public/logo.svg
```

### **Bước 3: Sử dụng trong LoginForm**

```tsx
// packages/ui/src/components/forms/LoginForm.tsx
import { Logo } from "@rentalshop/ui";

// Thay thế
<Logo 
  size="lg" 
  variant="custom" 
  src="/logo.svg" 
/>
```

### **Bước 4: Update các Sidebar**

```tsx
// Tương tự cho sidebar
<Logo 
  size="md" 
  variant="custom" 
  src="/logo.svg"
  showLabel={true}
  labelText="AnyRent"
/>
```

## 🎨 Logo Variants

### **1. Login Screen**
```tsx
<Logo size="lg" variant="custom" src="/logo.svg" />
```

### **2. Sidebar (Collapsed)**
```tsx
<Logo size="sm" variant="custom" src="/logo.svg" />
```

### **3. Sidebar (Expanded)**
```tsx
<Logo 
  size="md" 
  variant="custom" 
  src="/logo.svg"
  showLabel={true}
  labelText="AnyRent"
/>
```

### **4. Top Navigation**
```tsx
<Logo size="sm" variant="custom" src="/logo.svg" />
```

## 📐 Kích Thước Logo Khuyến Nghị

| Location | Size | Format | Background |
|----------|------|--------|------------|
| Favicon | 16x16, 32x32 | ICO, PNG | Transparent |
| Login | 256x256 | SVG, PNG | Transparent |
| Sidebar | 128x128 | SVG, PNG | Transparent |
| Apple Touch | 180x180 | PNG | Transparent |
| Android | 192x192, 512x512 | PNG | Transparent |

## 🚀 Quick Start

### **Nếu bạn có PNG:**

1. **Convert online:** https://realfavicongenerator.net/
2. **Download SVG**
3. **Copy vào:**
   ```bash
   cp logo.svg apps/client/public/logo.svg
   cp logo.svg apps/admin/public/logo.svg
   cp logo.svg apps/api/public/logo.svg
   ```
4. **Update code:** Thay `variant="default"` → `variant="custom" src="/logo.svg"`

### **Nếu bạn muốn upload PNG:**
```tsx
// Trong LoginForm.tsx
<Logo 
  size="lg" 
  variant="custom" 
  src="/logo.png"  // PNG works too!
/>
```

## 📝 Files Cần Update

Để thay icon mặc định bằng logo của bạn:

1. ✅ LoginForm.tsx - Đã dùng component Logo
2. ⚠️ ClientSidebar.tsx - Cần update
3. ⚠️ AdminSidebar.tsx - Cần update
4. ⚠️ sidebar.tsx - Cần update

### **Ví dụ Update Sidebar:**

**Before:**
```tsx
<span className="text-white font-bold text-lg">A</span>
```

**After:**
```tsx
import { Logo } from "@rentalshop/ui";

<Logo size="sm" variant="custom" src="/logo.svg" />
```

## 🎯 Kết Luận

**Hiện tại:**
- ✅ Login screen đã dùng Logo component
- ✅ Component hỗ trợ cả icon và custom logo
- ✅ Bạn có thể upload PNG hoặc SVG

**Để hoàn tất:**
1. Convert PNG → SVG của bạn
2. Thêm file vào `public/` folder
3. Thay `src="/logo.svg"` trong code

**Gửi file PNG của bạn, tôi sẽ giúp convert và tích hợp!** 🎨

