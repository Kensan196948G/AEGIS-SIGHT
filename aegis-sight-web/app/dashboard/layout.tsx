import { Sidebar } from '@/components/ui/sidebar';
import { Header } from '@/components/ui/header';
import { SkipLink } from '@/components/ui/skip-link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-aegis-dark">
      <SkipLink targetId="main-content" />
      <nav aria-label="サイドバーナビゲーション" role="navigation">
        <Sidebar />
      </nav>
      <div className="lg:pl-64">
        <Header />
        <main id="main-content" className="p-6" role="main" aria-label="メインコンテンツ">
          {children}
        </main>
      </div>
    </div>
  );
}
