# SEO Audit và Optimization Plan cho Client Landing Page

## Mục tiêu
1. Audit và tối ưu SEO cho client landing page (`apps/client/app/page.tsx`)
2. Đảm bảo admin landing page và tất cả admin routes không được index bởi Google

## Phần 1: SEO Audit và Optimization cho Client Landing Page

### 1.1 Metadata và Meta Tags
**File:** `apps/client/app/layout.tsx`
- [x] Đã có: Title, description, keywords, Open Graph, Twitter Cards
- [ ] **Cần kiểm tra:** 
  - Verify `NEXT_PUBLIC_CLIENT_URL` environment variable được set đúng
  - Verify OG image tồn tại tại `/og-image.jpg` (1200x630px)
  - Thêm missing meta tags nếu cần

### 1.2 Structured Data (JSON-LD)
**File:** `apps/client/app/page.tsx`
- [x] Đã có: SoftwareApplication và Organization schema
- [x] Đã có: FAQ Structured Data trong FAQ component
- [ ] **Cần thêm:** BreadcrumbList structured data cho navigation

### 1.3 Semantic HTML và Accessibility
**File:** `apps/client/app/page.tsx`
- [x] Đã có: `role="banner"` cho header, `role="contentinfo"` cho footer
- [x] Đã có: `aria-label` cho Hero, Download, Features, FAQ, Pricing, CTA sections
- [ ] **Cần thêm:** `aria-label` cho Stats section
- [ ] **Cần thêm:** `aria-label` cho Testimonials section
- [ ] **Cần kiểm tra:** Heading hierarchy (h1 → h2 → h3) đúng thứ tự

### 1.4 Sitemap và Robots.txt
**Files cần tạo:**
- [ ] `apps/client/app/sitemap.ts` - Dynamic sitemap generation (Next.js 13+)
- [ ] `apps/client/public/robots.txt` - Allow indexing cho client app

### 1.5 Image Optimization
**File:** `apps/client/app/page.tsx`
- [x] Đã có: Alt text cho images
- [ ] **Cần kiểm tra:** Tất cả images có proper alt attributes
- [ ] **Cần verify:** OG image tồn tại hoặc tạo fallback

## Phần 2: Prevent Google Indexing cho Admin Pages

### 2.1 Admin Layout Metadata
**File:** `apps/admin/app/layout.tsx`
- [ ] **Cần thêm:** `robots: { index: false, follow: false }` trong metadata
- [ ] **Cần thêm:** `noindex, nofollow` meta tags

### 2.2 Admin Robots.txt
**File cần tạo:**
- [ ] `apps/admin/public/robots.txt` - Disallow all crawling

### 2.3 Admin Sitemap (Optional)
- [ ] Không cần tạo sitemap cho admin app

## Implementation Details

### Task 1: Add Missing aria-labels
**File:** `apps/client/app/page.tsx`
- Thêm `aria-label` cho Stats section
- Thêm `aria-label` cho Testimonials section

### Task 2: Create Client Sitemap
**File:** `apps/client/app/sitemap.ts`
```typescript
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
```

### Task 3: Create Client Robots.txt
**File:** `apps/client/public/robots.txt`
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /login
Disallow: /register

Sitemap: https://anyrent.shop/sitemap.xml
```

### Task 4: Update Admin Layout
**File:** `apps/admin/app/layout.tsx`
- Thêm `robots: { index: false, follow: false }` vào metadata object

### Task 5: Create Admin Robots.txt
**File:** `apps/admin/public/robots.txt`
```
User-agent: *
Disallow: /
```

### Task 6: Verify OG Image
- Check if `/og-image.jpg` exists in `apps/client/public/`
- If missing, create placeholder or update metadata to use existing image
- Ensure image is 1200x630px for optimal display

### Task 7: Add BreadcrumbList Structured Data
**File:** `apps/client/app/page.tsx`
- Add BreadcrumbList schema for better navigation understanding
- Include: Home → Features → Pricing → FAQ → Contact

## Testing Checklist

- [ ] Test client landing page với Google Rich Results Test
- [ ] Verify sitemap.xml accessible tại `/sitemap.xml`
- [ ] Verify robots.txt accessible tại `/robots.txt`
- [ ] Test admin pages với Google Search Console (should show noindex)
- [ ] Verify all structured data valid với Schema.org validator
- [ ] Check mobile-friendliness với Google Mobile-Friendly Test
- [ ] Verify page speed với PageSpeed Insights

## Files to Modify/Create

1. `apps/client/app/page.tsx` - Add missing aria-labels, add BreadcrumbList
2. `apps/client/app/sitemap.ts` - Create dynamic sitemap
3. `apps/client/public/robots.txt` - Create robots.txt
4. `apps/admin/app/layout.tsx` - Add noindex metadata
5. `apps/admin/public/robots.txt` - Create robots.txt to block all
6. Verify `apps/client/public/og-image.jpg` exists

## Notes

- Client app should be fully indexable by Google
- Admin app should be completely blocked from indexing
- All structured data should follow Schema.org standards
- Sitemap should only include public-facing pages
- Robots.txt should be placed in public folder for Next.js

