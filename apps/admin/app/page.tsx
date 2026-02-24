import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Root page - Server component for Vercel deployment
 * 
 * This ensures at least one serverless page is built.
 * Performs server-side redirect based on authentication status.
 * 
 * IMPORTANT: This page must perform actual server-side work (reading cookies)
 * and use redirect() to ensure it's built as a serverless function.
 * The redirect() function in Next.js ensures this is a server-rendered page.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export default async function AdminHomePage() {
  // Perform actual server-side work to ensure this is a serverless function
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  // Use Next.js redirect() which ensures server-side rendering
  // This is different from client-side redirects - it's a server action
  if (!token) {
    redirect('/login');
  }
  
  redirect('/dashboard');
} 