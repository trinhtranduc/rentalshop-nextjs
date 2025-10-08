// Force all API routes to be dynamic (no static generation)
// This prevents Next.js from trying to prerender API routes during build
// which would fail because database connection is only available at runtime
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

export default function ApiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

