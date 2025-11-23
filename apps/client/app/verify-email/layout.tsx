import type { Metadata } from 'next';

/**
 * Metadata for verify-email page
 * Helps browsers trust the page and avoid "dangerous site" warnings
 */
export const metadata: Metadata = {
  title: 'Xác thực email - AnyRent',
  description: 'Xác thực địa chỉ email của bạn để hoàn tất đăng ký tài khoản AnyRent',
  robots: {
    index: false, // Don't index verification pages
    follow: false,
  },
  // Security headers
  other: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  },
};

export default function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

