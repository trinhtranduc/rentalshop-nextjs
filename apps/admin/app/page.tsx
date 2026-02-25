// CRITICAL: This must be a Server Component for Vercel to detect serverless functions
// Force dynamic rendering to ensure Vercel builds this as serverless function
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import AdminHomeClient from './AdminHomeClient';

export default async function AdminHomePage() {
  // Check authentication server-side
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  // Server-side redirect based on authentication
  if (token) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
  
  // This won't render, but needed for TypeScript
  return <AdminHomeClient />;
} 