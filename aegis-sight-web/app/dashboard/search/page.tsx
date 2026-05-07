'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface SearchResultItem {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  matched_field: string;
  matched_value: string;
  created_at: string | null;
}

interface SearchResultGroup {
  type: string;
  count: number;
  items: SearchResultItem[];
}

interface SearchResponse {
  query: string;
  total: number;
  groups: SearchResultGroup[];
  offset: number;
  limit: number;
  has_more: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  all: 'すべて',
  device: 'デバイス',
  license: 'ライセンス',
  procurement: '調達',
  alert: 'アラート',
};

const TYPE_COLORS: Record<string, string> = {
  device: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  license: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  procurement: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  alert: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const TYPE_LINKS: Record<string, string> = {
  device: '/dashboard/assets',
  license: '/dashboard/sam/licenses',
  procurement: '/dashboard/procurement',
  alert: '/dashboard/alerts',
};

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-800/60 dark:text-yellow-200">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';
  const initialType = searchParams.get('type') || 'all';

  const [query, setQuery] = useState(initialQuery);
  const [activeType, setActiveType] = useState(initialType);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(
    async (q: string, type: string) => {
      if (!q.trim()) {
        setResults(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<SearchResponse>(
          `/api/v1/search?q=${encodeURIComponent(q)}&type=${type}&limit=20`
        );
        setResults(data);
      } catch (err) {
        setError('検索中にエラーが発生しました。');
        setResults(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery, initialType);
    }
  }, [initialQuery, initialType, performSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(query)}&type=${activeType}`);
      performSearch(query, activeType);
    }
  };

  const handleTypeChange = (type: string) => {
    setActiveType(type);
    if (query.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(query)}&type=${type}`);
      performSearch(query, type);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Search Input */}
      <div>
        <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
          統合検索
        </h1>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="デバイス名、ライセンス、調達番号、アラートを検索..."
              className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-aegis-border dark:bg-aegis-surface dark:text-white dark:placeholder-gray-400"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary-600 px-6 py-3 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            検索
          </button>
        </form>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-aegis-border dark:bg-aegis-surface">
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeType === type
                ? 'bg-white text-gray-900 shadow-sm dark:bg-aegis-darker dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {label}
            {results && type !== 'all' && (
              <span className="ml-1.5 text-xs text-gray-500">
                {results.groups.find((g) => g.type === type)?.count || 0}
              </span>
            )}
            {results && type === 'all' && (
              <span className="ml-1.5 text-xs text-gray-500">{results.total}</span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
            検索中...
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {!loading && results && (
        <div className="space-y-4">
          {results.total === 0 ? (
            <div className="py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                「{results.query}」に一致する結果が見つかりませんでした。
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {results.total} 件の結果
              </p>
              {results.groups.map((group) => (
                <div key={group.type} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {TYPE_LABELS[group.type] || group.type}
                    </h2>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-aegis-surface dark:text-gray-400">
                      {group.count}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <Link
                        key={item.id}
                        href={`${TYPE_LINKS[item.type] || '/dashboard'}/${item.type === 'device' ? '' : item.id}`}
                        className="block rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-primary-300 hover:bg-primary-50/50 dark:border-aegis-border dark:bg-aegis-surface dark:hover:border-primary-700 dark:hover:bg-primary-900/10"
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                  TYPE_COLORS[item.type] || ''
                                }`}
                              >
                                {TYPE_LABELS[item.type] || item.type}
                              </span>
                              <h3 className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                {highlightMatch(item.title, results.query)}
                              </h3>
                            </div>
                            {item.subtitle && (
                              <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
                                {item.subtitle}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                              一致フィールド: {item.matched_field} ={' '}
                              {highlightMatch(item.matched_value, results.query)}
                            </p>
                          </div>
                          {item.created_at && (
                            <time className="ml-4 shrink-0 text-xs text-gray-400 dark:text-gray-500">
                              {new Date(item.created_at).toLocaleDateString('ja-JP')}
                            </time>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Empty state: quick-access category cards */}
      {!loading && !results && !error && (
        <div>
          <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
            キーワードを入力するか、カテゴリを選択して検索してください
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                type: 'device',
                label: 'デバイス',
                description: 'デバイス名・IPアドレス・MACアドレスで検索',
                examples: ['Windows 11', '10.0.1.1', 'core-sw-01'],
                iconPath: 'M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3',
                accent: 'border-blue-200 dark:border-blue-800',
                iconColor: 'text-blue-500 dark:text-blue-400',
                chipColor: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40',
              },
              {
                type: 'license',
                label: 'ライセンス',
                description: 'ソフトウェア名・ベンダー・ライセンスキーで検索',
                examples: ['Microsoft 365', 'Adobe', 'Zoom'],
                iconPath: 'M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 14.25 5.25h1.5Z',
                accent: 'border-green-200 dark:border-green-800',
                iconColor: 'text-green-500 dark:text-green-400',
                chipColor: 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/40',
              },
              {
                type: 'procurement',
                label: '調達',
                description: '発注番号・ベンダー・品目名で検索',
                examples: ['PO-2026', 'Dell', 'ThinkPad'],
                iconPath: 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z',
                accent: 'border-purple-200 dark:border-purple-800',
                iconColor: 'text-purple-500 dark:text-purple-400',
                chipColor: 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/40',
              },
              {
                type: 'alert',
                label: 'アラート',
                description: 'アラートタイトル・重要度・デバイスで検索',
                examples: ['CPU使用率', 'ディスク容量', 'オフライン'],
                iconPath: 'M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0',
                accent: 'border-red-200 dark:border-red-800',
                iconColor: 'text-red-500 dark:text-red-400',
                chipColor: 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40',
              },
            ].map(({ type, label, description, examples, iconPath, accent, iconColor, chipColor }) => (
              <div
                key={type}
                className={`rounded-xl border bg-white p-5 dark:bg-aegis-card ${accent}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800 ${iconColor}`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{label}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {examples.map((kw) => (
                    <button
                      key={kw}
                      onClick={() => {
                        setQuery(kw);
                        setActiveType(type);
                        router.push(`/dashboard/search?q=${encodeURIComponent(kw)}&type=${type}`);
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${chipColor}`}
                    >
                      {kw}
                    </button>
                  ))}
                </div>
                <Link
                  href={TYPE_LINKS[type]}
                  className="mt-4 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  一覧を見る
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">読み込み中...</span>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
