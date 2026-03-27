'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const pathLabelMap: Record<string, string> = {
  dashboard: 'ダッシュボード',
  sam: 'SAM',
  licenses: 'ライセンス',
  assets: '資産',
  contracts: '契約',
  settings: '設定',
  users: 'ユーザー',
  reports: 'レポート',
  alerts: 'アラート',
  audit: '監査ログ',
};

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [];

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    items.push({
      label: pathLabelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
      href: currentPath,
    });
  }

  return items;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const pathname = usePathname();
  const breadcrumbs = items || generateBreadcrumbs(pathname);

  if (breadcrumbs.length === 0) return null;

  return (
    <nav
      aria-label="パンくずリスト"
      className={clsx('flex items-center text-sm', className)}
    >
      <ol className="flex items-center gap-1.5">
        {/* Home */}
        <li className="flex items-center">
          <Link
            href="/"
            className="text-gray-500 transition-colors hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
              />
            </svg>
          </Link>
        </li>

        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-1.5">
              <svg
                className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
              {isLast ? (
                <span className="font-medium text-gray-900 dark:text-white">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-gray-500 transition-colors hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
