// CRITICAL: This must be a Server Component for Vercel to detect serverless functions
// Force dynamic rendering to ensure Vercel builds this as serverless function
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import AdminHomeClient from './AdminHomeClient';

/**
 * Root page for admin app
 * CRITICAL: Must render actual content (not just redirect) for Vercel to detect as serverless function
 * Vercel does not detect pages that only redirect as serverless functions
 */
export default async function AdminHomePage() {
  // Check authentication server-side
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  // CRITICAL: Render actual content first, then redirect client-side
  // This ensures Vercel detects this as a serverless function
  // If we only redirect, Vercel may not detect it
  return (
    <AdminHomeClient 
      isAuthenticated={!!token}
      redirectTo={token ? '/dashboard' : '/login'}
    />
  );
} 