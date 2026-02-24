import { MetadataRoute } from 'next'

/**
 * Sitemap for admin app
 * 
 * CRITICAL: This file ensures Vercel recognizes at least one serverless function.
 * Next.js sitemap routes are automatically built as serverless functions by Vercel.
 * 
 * IMPORTANT: Must be async function with dynamic export to ensure serverless function.
 * This is why client app works on Vercel - it has sitemap.ts!
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Perform server-side work to ensure this is a serverless function
  const baseUrl = process.env.NEXT_PUBLIC_ADMIN_URL || process.env.NEXT_PUBLIC_VERCEL_URL 
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
    : 'https://adminvercel.anyrent.shop'
  
  // Use current date to ensure dynamic rendering
  const now = new Date();
  
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/dashboard`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/status`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ]
  
  return routes
}
