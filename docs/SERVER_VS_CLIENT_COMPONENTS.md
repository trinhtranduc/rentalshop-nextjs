# Server Component vs Client Component trong Next.js

## 🔍 Khái niệm cơ bản

### Server Component (Mặc định)
- **Chạy ở đâu?** Trên **SERVER** (Node.js)
- **Khi nào chạy?** Khi Next.js build/render page
- **Code được gửi về browser?** ❌ KHÔNG - chỉ HTML được gửi
- **Có thể dùng gì?**
  - ✅ `async/await` để fetch data
  - ✅ Database queries trực tiếp
  - ✅ File system access
  - ✅ Environment variables
  - ✅ `generateMetadata()` cho SEO
  - ❌ KHÔNG thể dùng: `useState`, `useEffect`, `onClick`, `useRouter`

### Client Component (Cần 'use client')
- **Chạy ở đâu?** Trên **BROWSER** (JavaScript)
- **Khi nào chạy?** Sau khi HTML đã load, JavaScript chạy
- **Code được gửi về browser?** ✅ CÓ - toàn bộ component code
- **Có thể dùng gì?**
  - ✅ React hooks: `useState`, `useEffect`, `useRouter`
  - ✅ Event handlers: `onClick`, `onChange`
  - ✅ Browser APIs: `localStorage`, `window`
  - ✅ Fetch API (chạy trên browser)
  - ❌ KHÔNG thể dùng: `async function`, database queries, `generateMetadata()`

## 📊 So sánh trong project của bạn

### Ví dụ 1: Blog Post Page (Server Component)

```typescript
// apps/client/app/blog/[slug]/page.tsx
// ❌ KHÔNG có 'use client'
export default async function BlogPostPage({ params }) {
  // ✅ Fetch trên SERVER - nhanh, SEO-friendly
  const post = await db.posts.findBySlug(slug);
  
  // ✅ Data đã có sẵn khi HTML render
  return <BlogPostClient initialPost={post} />;
}

// ✅ Có thể generate metadata cho Google
export async function generateMetadata() {
  const post = await db.posts.findBySlug(slug);
  return { title: post.title, description: post.excerpt };
}
```

**Lợi ích:**
- ✅ Google có thể đọc metadata ngay (SEO tốt)
- ✅ Data đã có sẵn khi page load (không cần loading spinner)
- ✅ Code không được gửi về browser (bundle size nhỏ)

### Ví dụ 2: Categories Page (Client Component)

```typescript
// apps/client/app/categories/page.tsx
'use client'; // ✅ Phải có

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ❌ Fetch trên CLIENT - chậm hơn, không SEO-friendly
  useEffect(() => {
    categoriesApi.getCategories().then(setCategories);
  }, []);
  
  // ✅ Có thể dùng event handlers
  const handleClick = () => { ... };
  
  return <div onClick={handleClick}>...</div>;
}
```

**Nhược điểm:**
- ❌ Google không thể đọc data (không SEO)
- ❌ Phải đợi JavaScript load xong mới fetch data
- ❌ Code được gửi về browser (bundle size lớn)

## 🎯 Khi nào dùng cái nào?

### Dùng Server Component khi:
1. ✅ Cần SEO (blog posts, product pages)
2. ✅ Fetch data từ database
3. ✅ Cần `generateMetadata()`
4. ✅ Không cần interactivity (click, form, state)

### Dùng Client Component khi:
1. ✅ Cần interactivity (buttons, forms, dialogs)
2. ✅ Cần React hooks (`useState`, `useEffect`)
3. ✅ Cần browser APIs (`localStorage`, `window`)
4. ✅ Cần real-time updates

## 🔄 Pattern tốt nhất: Kết hợp cả hai

```typescript
// ✅ Server Component: Fetch data + SEO
// apps/client/app/blog/[slug]/page.tsx
export default async function BlogPostPage({ params }) {
  const post = await db.posts.findBySlug(slug); // Server-side
  return <BlogPostClient initialPost={post} />; // Pass data xuống
}

// ✅ Client Component: Interactivity
// apps/client/app/blog/[slug]/BlogPostClient.tsx
'use client';
export default function BlogPostClient({ initialPost }) {
  const [relatedPosts, setRelatedPosts] = useState([]);
  
  // Chỉ fetch related posts (cần category của post hiện tại)
  useEffect(() => {
    postsApi.searchPublicPosts({ categoryId: initialPost.categoryId })
      .then(setRelatedPosts);
  }, []);
  
  return (
    <div>
      {/* Render post đã có sẵn từ server */}
      <h1>{initialPost.title}</h1>
      
      {/* Related posts được fetch trên client */}
      {relatedPosts.map(post => <PostCard key={post.id} post={post} />)}
    </div>
  );
}
```

## 📈 Lợi ích của pattern này:

1. **SEO tốt**: Google đọc được metadata và content chính
2. **Performance tốt**: Data chính đã có sẵn, không cần loading
3. **Interactivity**: Vẫn có thể dùng hooks và event handlers
4. **Bundle size nhỏ**: Chỉ code cần thiết được gửi về browser

## ❌ Lỗi thường gặp:

```typescript
// ❌ SAI: Export generateMetadata từ Client Component
'use client';
export async function generateMetadata() { ... } // ❌ Lỗi!

// ✅ ĐÚNG: Export generateMetadata từ Server Component
export default async function Page() { ... }
export async function generateMetadata() { ... } // ✅ OK
```

## 🎓 Tóm tắt:

| Tính năng | Server Component | Client Component |
|-----------|------------------|------------------|
| `'use client'` | ❌ Không cần | ✅ Phải có |
| `async function` | ✅ Có thể | ❌ Không thể |
| `useState`, `useEffect` | ❌ Không thể | ✅ Có thể |
| `onClick`, `onChange` | ❌ Không thể | ✅ Có thể |
| Database queries | ✅ Có thể | ❌ Không thể |
| `generateMetadata()` | ✅ Có thể | ❌ Không thể |
| SEO-friendly | ✅ Có | ❌ Không |
| Bundle size | ✅ Nhỏ | ❌ Lớn |
