import type { Metadata } from 'next';
import BlogClient from './BlogClient';

// Generate metadata for SEO (runs on server)
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Blog - AnyRent | Rental Business Management Tips & Guides',
    description: 'Discover expert insights, tips, and guides for managing your rental business. Learn about best practices, industry trends, and how to grow your rental shop with AnyRent.',
    keywords: ['rental business', 'rental shop management', 'equipment rental', 'business tips', 'rental guides'],
    openGraph: {
      title: 'Blog - AnyRent | Rental Business Management Tips & Guides',
      description: 'Discover expert insights, tips, and guides for managing your rental business.',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Blog - AnyRent',
      description: 'Discover expert insights, tips, and guides for managing your rental business.',
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

export default function BlogPage() {
  return <BlogClient />;
}
