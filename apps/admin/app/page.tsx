// Root page for admin app - similar to client app structure
// Render actual content to ensure Vercel detects as serverless function
export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

/**
 * Root page for admin app
 * Similar structure to client app - renders actual content
 * TODO: Add proper landing page UI after Vercel deployment works
 */
export default async function AdminHomePage() {
  // Server-side auth check
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  // If authenticated, redirect to dashboard
  if (token) {
    redirect('/dashboard');
  }
  
  // Render actual content (similar to client app landing page)
  // This ensures Vercel detects this as a serverless function
  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="text-3xl font-bold text-text-primary mb-4">
          AnyRent Admin
        </h1>
        <p className="text-text-secondary mb-8">
          Administration system for managing your rental business
        </p>
        <div className="space-y-4">
          <Link
            href="/login"
            className="inline-block w-full px-6 py-3 bg-action-primary text-text-inverted rounded-lg font-medium hover:bg-action-primary/90 transition-colors"
          >
            Login to Admin Panel
          </Link>
          <p className="text-sm text-text-tertiary">
            Need help? Contact support
          </p>
        </div>
      </div>
    </div>
  );
} 