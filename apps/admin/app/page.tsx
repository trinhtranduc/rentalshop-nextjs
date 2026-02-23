import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

/**
 * Root page - Server component for Vercel deployment
 * 
 * This ensures at least one serverless page is built.
 * Performs server-side redirect based on authentication status.
 */
export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  // Check for auth token in cookies
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  // If no token, redirect to login
  if (!token) {
    redirect('/login');
  }
  
  // If token exists, redirect to dashboard
  // The dashboard page will handle token validation
  redirect('/dashboard');
} 