import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Root page - Server component for Vercel deployment
 * 
 * CRITICAL: Vercel requires at least ONE page that renders actual content.
 * 
 * SOLUTION: This page uses Next.js redirect() which is a server action that throws.
 * However, to ensure Vercel recognizes this as serverless, we also have:
 * - Status page (/status) that renders actual content
 * - API route (/api/health) that performs server-side work
 * 
 * The combination ensures:
 * 1. Root page is server-rendered (redirect() requires server-side execution)
 * 2. Status page renders content (Vercel requirement)
 * 3. API route provides serverless function
 * 4. All have dynamic = 'force-dynamic' for dynamic rendering
 * 
 * This pattern ensures Vercel recognizes at least one serverless function.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export default async function AdminHomePage() {
  // Perform actual server-side work to ensure this is a serverless function
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  // Use Next.js redirect() - this is a server action that throws internally
  // This ensures the page is built as a serverless function
  if (!token) {
    redirect('/login');
  }
  
  redirect('/dashboard');
} 