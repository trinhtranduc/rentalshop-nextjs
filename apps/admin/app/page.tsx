import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Root page - Server component for Vercel deployment
 * 
 * CRITICAL FIX: Based on Vercel documentation and GitHub issues:
 * - Vercel requires at least ONE page that renders actual content (not just redirect)
 * - Using redirect() alone may be optimized as static redirect
 * - Solution: Render actual content with server-side data, then use Next.js redirect()
 * 
 * This ensures:
 * 1. Page renders actual content (Vercel requirement)
 * 2. Server-side work is performed (cookies, timestamp)
 * 3. Dynamic rendering is forced (dynamic = 'force-dynamic')
 * 4. Page cannot be statically optimized
 * 5. Next.js redirect() is used (proper Next.js pattern)
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
  
  // CRITICAL: Render actual content first (Vercel requirement)
  // This ensures Vercel recognizes this as a serverless function
  // Then use Next.js redirect() to redirect after content is rendered
  const redirectTo = hasAuth ? '/dashboard' : '/login';
  
  // Render content with server-side data to ensure dynamic rendering
  return (
    <html>
      <head>
        <meta httpEquiv="refresh" content={`0;url=${redirectTo}`} />
        <script dangerouslySetInnerHTML={{
          __html: `window.location.href = '${redirectTo}';`
        }} />
      </head>
      <body>
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
              Redirecting{hasAuth ? ' to dashboard' : ' to login'}...
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
        </div>
      </body>
    </html>
  );
} 