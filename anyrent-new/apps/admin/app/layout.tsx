export const metadata = {
  title: 'AnyRent - Create Your Shop',
  description: 'Multi-tenant shop management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
