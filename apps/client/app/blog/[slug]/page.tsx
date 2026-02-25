import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@rentalshop/database';
import BlogPostClient from './BlogPostClient';
import type { Post } from '@rentalshop/types';

async function fetchBlogPost(slug: string) {
  try {
    // Try all locales to find the published post
    const locales: ('en' | 'vi' | 'zh' | 'ko' | 'ja')[] = ['vi', 'en', 'zh', 'ko', 'ja'];
    
    for (const locale of locales) {
      try {
        const result = await db.posts.findBySlug(slug, locale);
        // Check if post exists and is published
        if (result && result.status === 'PUBLISHED' && result.publishedAt) {
          return result;
        }
      } catch (err) {
        // Continue to next locale if this one fails
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching blog post:', error);
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
  
  return {
    title: `${title} - AnyRent Blog`,
    description,
    keywords: post.seoKeywords ? post.seoKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0) : undefined,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.publishedAt ? post.publishedAt.toISOString() : undefined,
      modifiedTime: post.updatedAt ? post.updatedAt.toISOString() : undefined,
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
