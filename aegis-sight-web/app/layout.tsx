import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'AEGIS-SIGHT IT管理',
    template: '%s | AEGIS-SIGHT',
  },
  description: 'AEGIS-SIGHT 統合IT資産管理・SAM・調達・監視プラットフォーム',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#2563EB',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={inter.variable}>
      <body className={`${inter.className} min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
