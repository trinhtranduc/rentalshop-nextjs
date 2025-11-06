export const metadata = {
  title: 'My Shop - AnyRent',
  description: 'Tenant dashboard',
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
