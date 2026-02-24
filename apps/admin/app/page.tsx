import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Root page - Server component for Vercel deployment
 * 
 * This ensures at least one serverless page is built.
 * Performs server-side redirect based on authentication status.
 * 
 * IMPORTANT: This page renders actual content first, then redirects.
 * This ensures Vercel recognizes it as a serverless page.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export default async function AdminHomePage() {
  // Perform actual server-side work to ensure this is a serverless function
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  // Render actual content first to ensure Vercel recognizes this as a serverless page
  // Then use meta refresh for redirect (client-side redirect after server render)
  const redirectTo = token ? '/dashboard' : '/login';
  
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="refresh" content={`0;url=${redirectTo}`} />
        <title>Redirecting...</title>
      </head>
      <body>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
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
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            ` }} />
          </div>
        </div>
      </body>
    </html>
  );
} 