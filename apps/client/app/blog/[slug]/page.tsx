import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import BlogPostClient from './BlogPostClient';
import type { Post } from '@rentalshop/types';
import { postsApi } from '@rentalshop/utils';

// Force dynamic rendering - don't pre-render during build
// This prevents Prisma Client initialization errors during build
export const dynamic = 'force-dynamic';

function toIsoDateTime(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : undefined;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.toISOString() : undefined;
  }
  return undefined;
}

async function fetchBlogPost(slug: string) {
  try {
    // Try all locales to find the published post
    // Use postsApi.getPostBySlug() - same pattern as dashboard/page.tsx uses analyticsApi
    const locales: ('en' | 'vi' | 'zh' | 'ko' | 'ja')[] = ['vi', 'en', 'zh', 'ko', 'ja'];
    
    for (const locale of locales) {
      try {
        console.log(`🌐 Fetching blog post: slug=${slug}, locale=${locale}`);
        
        // Use postsApi.getPostBySlug() - same pattern as dashboard uses analyticsApi
        const result = await postsApi.getPostBySlug(slug, locale);
        
        console.log('📦 Parsed result:', {
          success: result.success,
          code: result.code,
          message: result.message,
          hasData: !!result.data,
          locale
        });
        
        if (result.success && result.data) {
          // API already filters for PUBLISHED posts, so we can return it
          console.log('✅ Found blog post:', result.data.title, 'in locale:', locale);
          return result.data;
        }
      } catch (err) {
        // Continue to next locale if this one fails
        console.error(`❌ Error fetching post for locale ${locale}:`, err);
        continue;
      }
    }
    
    console.error('❌ Blog post not found in any locale:', slug);
    return null;
  } catch (error) {
    console.error('❌ Error fetching blog post:', error);
    return null;
  }
}

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  // Fetch post from database (server-side)
  const post = await fetchBlogPost(slug);

  if (!post) {
    notFound();
  }

  // Pass post data to client component
  // Note: Database post structure matches Post type, but TypeScript needs explicit cast
  return <BlogPostClient initialPost={post as unknown as Post} />;
}

// Generate metadata for SEO (runs on server)
export async function generateMetadata({ 
  params 
}: BlogPostPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await fetchBlogPost(resolvedParams.slug);

  if (!post) {
    return {
      title: 'Blog Post - AnyRent',
      description: 'Read our latest blog posts about rental business management',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || `Read ${post.title} on AnyRent blog`;
  const blogPath = `/blog/${resolvedParams.slug}`;

  return {
    title: `${title} - AnyRent Blog`,
    description,
    keywords: post.seoKeywords ? post.seoKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0) : undefined,
    alternates: {
      canonical: blogPath,
      languages: {
        'x-default': blogPath,
        vi: blogPath,
        en: blogPath,
        zh: blogPath,
        ko: blogPath,
        ja: blogPath,
      },
    },
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: toIsoDateTime((post as any).publishedAt),
      modifiedTime: toIsoDateTime((post as any).updatedAt),
      images: post.featuredImage ? [post.featuredImage] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: post.featuredImage ? [post.featuredImage] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}
