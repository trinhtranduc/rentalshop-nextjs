import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Root page - Server component for Vercel deployment
 * 
 * This ensures at least one serverless page is built.
 * Performs server-side redirect based on authentication status.
 * 
 * IMPORTANT: This page performs server-side work (reading cookies)
 * and renders actual content before redirecting. This ensures Vercel
 * recognizes it as a serverless page, not a static page.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export default async function AdminHomePage() {
  // Perform actual server-side work to ensure this is a serverless function
  // Reading cookies requires server-side execution
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  // Determine redirect destination
  const redirectTo = token ? '/dashboard' : '/login';
  
  // Render actual content first to ensure Vercel recognizes this as serverless
  // Then redirect using client-side script
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.location.href = '${redirectTo}';`,
        }}
      />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
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
        </div>
      </div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
} 