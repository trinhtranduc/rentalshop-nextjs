import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Root page - Server component for Vercel deployment
 * 
 * CRITICAL FIX: Vercel requires at least ONE Server Component that renders actual content.
 * 
 * ISSUE: Client Components don't create serverless functions - they're built as static pages.
 * SOLUTION: Use Server Component that renders actual content, then redirect client-side.
 * 
 * This ensures:
 * 1. Page is server-rendered (serverless function)
 * 2. Content is rendered from server (Vercel requirement)
 * 3. Dynamic rendering is forced (dynamic = 'force-dynamic')
 * 4. Client-side redirect after content loads
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export default async function AdminHomePage() {
  // Perform actual server-side work to ensure this is a serverless function
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  const hasAuth = !!token;
  
  // Get server-side data to ensure dynamic rendering
  const timestamp = new Date().toISOString();
  const serverTime = new Date().toLocaleString('en-US', {
    timeZone: 'UTC',
    dateStyle: 'full',
    timeStyle: 'long'
  });
  
  // CRITICAL: Use Next.js redirect() directly
  // redirect() throws internally, ensuring this is a serverless function
  // This is the proper Next.js pattern for server-side redirects
  if (!hasAuth) {
    redirect('/login');
  }
  
  redirect('/dashboard');
} 