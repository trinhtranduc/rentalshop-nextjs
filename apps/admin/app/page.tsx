import { cookies } from 'next/headers';

/**
 * Root page - Server component for Vercel deployment
 * 
 * CRITICAL: Vercel requires at least ONE page that renders actual content.
 * Root page MUST render content (not just redirect) to ensure serverless function is built.
 * 
 * SOLUTION: Render loading state with server-side data, then use meta refresh for redirect.
 * This ensures:
 * 1. Page renders actual content (Vercel requirement)
 * 2. Server-side work is performed (cookies, timestamp)
 * 3. Dynamic rendering is forced (dynamic = 'force-dynamic')
 * 4. Page cannot be statically optimized
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export default async function AdminHomePage() {
  // Perform actual server-side work to ensure this is a serverless function
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  // Get server-side data to ensure dynamic rendering
  const timestamp = new Date().toISOString();
  const redirectTo = token ? '/dashboard' : '/login';
  
  // CRITICAL: Render actual content (not just redirect) so Vercel recognizes this as serverless
  // Vercel only counts pages that render content as serverless functions
  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
        backgroundColor: '#f3f4f6'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280', margin: 0 }}>Redirecting...</p>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
            Server rendered at: {timestamp}
          </p>
        </div>
      </div>
      <meta httpEquiv="refresh" content={`0;url=${redirectTo}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `setTimeout(() => { window.location.href = '${redirectTo}'; }, 100);`,
        }}
      />
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </>
  );
} 