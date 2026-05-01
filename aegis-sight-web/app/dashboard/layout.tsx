'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/ui/sidebar';
import { Header } from '@/components/ui/header';
import { SkipLink } from '@/components/ui/skip-link';
import { OfflineIndicator } from '@/components/ui/offline-indicator';
import { PWAInstallPrompt } from '@/components/ui/pwa-install';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-aegis-dark">
      <OfflineIndicator />
      <PWAInstallPrompt />
      <SkipLink targetId="main-content" />

      {/* Mobile sidebar overlay backdrop */}
      {mobileNavOpen && (
        <div
          data-testid="mobile-nav-backdrop"
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav aria-label="サイドバーナビゲーション" role="navigation">
        <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      </nav>

      <div className="lg:pl-64">
        <Header onMobileMenuClick={() => setMobileNavOpen(true)} />
        <main id="main-content" className="p-6" role="main" aria-label="メインコンテンツ">
          {children}
        </main>
      </div>
    </div>
  );
}
