import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dev Herald bundle test app (Webpack)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
