import { cookies } from 'next/headers';

/**
 * Status page - Server component for Vercel deployment
 * 
 * This page renders actual content from the server to ensure
 * Vercel recognizes it as a serverless page.
 * 
 * IMPORTANT: This page MUST render actual content (not just redirect)
 * for Vercel to recognize it as a serverless page.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export default async function StatusPage() {
  // Perform actual server-side work to ensure this is a serverless function
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  const hasAuth = !!token;
  
  // Get current timestamp to ensure dynamic rendering
  const timestamp = new Date().toISOString();
  const serverTime = new Date().toLocaleString('en-US', {
    timeZone: 'UTC',
    dateStyle: 'full',
    timeStyle: 'long'
  });
  
  // Render actual content to ensure Vercel recognizes this as a serverless page
  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-bg-card rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-text-primary mb-4">System Status</h1>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-text-secondary">Status:</span>
            <span className="text-action-success font-medium">Operational</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Authenticated:</span>
            <span className={hasAuth ? 'text-action-success' : 'text-action-warning'}>
              {hasAuth ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Server Time:</span>
            <span className="text-text-primary text-sm">{serverTime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Timestamp:</span>
            <span className="text-text-tertiary text-xs">{timestamp}</span>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-border">
          <a 
            href="/dashboard" 
            className="text-action-primary hover:underline text-sm"
          >
            Go to Dashboard →
          </a>
        </div>
      </div>
    </div>
  );
}
