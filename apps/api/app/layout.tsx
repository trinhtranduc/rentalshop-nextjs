import './globals.css';

// Force all routes to be dynamic (no static generation)
// This prevents Next.js from collecting page data during build
// which would trigger Prisma client initialization before database is available
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
} 