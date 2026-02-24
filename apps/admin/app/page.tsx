import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Root page - Server component for Vercel deployment
 * 
 * This ensures at least one serverless page is built.
 * Performs server-side redirect based on authentication status.
 * 
 * IMPORTANT: 
 * - This page performs server-side work (reading cookies) which requires
 *   server-side execution, ensuring it's built as a serverless function.
 * - Uses Next.js redirect() which is a server action that throws, ensuring
 *   the page cannot be statically generated.
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
  
  // Use Next.js redirect() which is a server action
  // This throws internally, ensuring the page is server-rendered
  // Vercel will recognize this as a serverless function because:
  // 1. It uses dynamic = 'force-dynamic'
  // 2. It uses runtime = 'nodejs'
  // 3. It performs server-side work (reading cookies)
  // 4. It uses redirect() which requires server-side execution
  if (!token) {
    redirect('/login');
  }
  
  redirect('/dashboard');
} 