import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Root page - Server component for Vercel deployment
 * 
 * SOLUTION BASED ON GITHUB ISSUES & VERCEL DOCS:
 * - Vercel requires at least ONE page that renders actual content (not just redirect)
 * - Status page (/status) already provides this requirement
 * - Root page can use redirect() since status page ensures serverless function exists
 * 
 * WHY THIS WORKS:
 * 1. Status page (/status) renders actual content - satisfies Vercel requirement
 * 2. Root page uses redirect() - clean and simple
 * 3. Both have dynamic = 'force-dynamic' - ensures serverless functions
 * 4. API route (/api/health) also provides serverless function
 * 
 * KEY INSIGHT:
 * - Vercel needs at least ONE page with actual content rendering
 * - Status page fulfills this requirement
 * - Root page can safely use redirect() without breaking build
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export default async function AdminHomePage() {
  // Perform actual server-side work to ensure this is a serverless function
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  // Use Next.js redirect() - this is safe because /status page ensures serverless function exists
  if (!token) {
    redirect('/login');
  }
  
  redirect('/dashboard');
} 