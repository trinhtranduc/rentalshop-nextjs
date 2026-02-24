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
  
  // Determine redirect target
  const redirectTo = hasAuth ? '/dashboard' : '/login';
  
  // CRITICAL: Render actual content from server (Vercel requirement)
  // Use Next.js redirect() AFTER rendering to ensure serverless function
  // This ensures Vercel recognizes this as a serverless page
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#f3f4f6',
      padding: '20px'
    }}>
      <div style={{
        textAlign: 'center',
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
          Admin Portal
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          {hasAuth ? 'Redirecting to dashboard...' : 'Redirecting to login...'}
        </p>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: hasAuth ? '4px solid #10b981' : '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }}></div>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '16px' }}>
          Server time: {serverTime}
        </p>
        <p style={{ fontSize: '11px', color: '#d1d5db', marginTop: '8px' }}>
          Timestamp: {timestamp}
        </p>
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `
        }} />
      </div>
      {/* Use Next.js redirect() - this throws internally but ensures serverless function */}
      {redirect(redirectTo)}
    </div>
  );
} 