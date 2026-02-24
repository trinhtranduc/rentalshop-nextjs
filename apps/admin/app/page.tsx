import { cookies } from 'next/headers';
import { RedirectClient } from './redirect-client';

/**
 * Root page - Server component for Vercel deployment
 * 
 * This ensures at least one serverless page is built.
 * Performs server-side redirect based on authentication status.
 * 
 * IMPORTANT: This page renders actual content (not just redirect)
 * to ensure Vercel recognizes it as a serverless page.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export default async function AdminHomePage() {
  // Check for auth token in cookies
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  // Determine redirect destination
  const redirectTo = token ? '/dashboard' : '/login';
  
  // Render a component that will handle the redirect client-side
  // This ensures the page is actually rendered as a server component
  return <RedirectClient redirectTo={redirectTo} />;
} 