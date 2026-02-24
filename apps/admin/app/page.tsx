'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@rentalshop/hooks';

/**
 * Root page - Client component for Vercel deployment
 * 
 * CRITICAL FIX: Based on comparison with working client app:
 * - Client app uses 'use client' and renders actual content → WORKS
 * - Admin app was using Server Component with redirect-only → FAILS
 * 
 * SOLUTION: Convert to Client Component like client app:
 * 1. Use 'use client' directive
 * 2. Render actual content (loading spinner)
 * 3. Use client-side redirect with useRouter
 * 4. This ensures Vercel recognizes the page and builds it correctly
 * 
 * This matches the pattern used in client app which works on Vercel.
 */
export default function AdminHomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  useEffect(() => {
    // Wait for auth to load, then redirect
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);
  
  // Render actual content to ensure Vercel recognizes this page
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
          {loading ? 'Loading...' : (user ? 'Redirecting to dashboard...' : 'Redirecting to login...')}
        </p>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: loading ? '4px solid #3b82f6' : (user ? '4px solid #10b981' : '4px solid #ef4444'),
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }}></div>
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
  );
} 