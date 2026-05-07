import type { Metadata, Viewport } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto',
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
    <html lang="ja" className={notoSansJP.variable}>
      <body className={`${notoSansJP.className} min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
