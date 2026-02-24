import { cookies } from 'next/headers';

/**
 * Root page - Server component for Vercel deployment
 * 
 * This ensures at least one serverless page is built.
 * Performs server-side redirect based on authentication status.
 * 
 * IMPORTANT: 
 * - This page MUST render actual content (not just redirect) for Vercel
 *   to recognize it as a serverless page.
 * - Uses client-side redirect after server-side check to ensure the page
 *   is actually rendered as a server component.
 * - The combination of dynamic = 'force-dynamic', runtime = 'nodejs', and
 *   server-side work ensures Vercel recognizes this as a serverless page.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export default async function AdminHomePage() {
  // Perform actual server-side work to ensure this is a serverless function
  // Reading cookies requires server-side execution and cannot be statically generated
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  // Determine redirect destination based on auth status
  const redirectTo = token ? '/dashboard' : '/login';
  
  // Get current timestamp to ensure dynamic rendering
  const timestamp = new Date().toISOString();
  
  // Render actual content to ensure Vercel recognizes this as a serverless page
  // Using client-side redirect after server render to avoid Next.js optimization
  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-action-primary mx-auto mb-4"></div>
        <p className="text-text-secondary">Redirecting...</p>
        <p className="text-xs text-text-tertiary mt-2">Server rendered at: {timestamp}</p>
        <script
          dangerouslySetInnerHTML={{
            __html: `setTimeout(() => { window.location.href = '${redirectTo}'; }, 100);`,
          }}
        />
      </div>
    </div>
  );
} 