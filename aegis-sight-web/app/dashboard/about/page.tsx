'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface VersionInfo {
  api_version: string;
  app_version: string;
  python_version: string;
  build_date: string;
  git_commit_hash: string;
  minimum_agent_version: string;
}

const DUMMY_VERSION: VersionInfo = {
  api_version: '1.0.0',
  app_version: '1.0.0',
  python_version: '3.12.3',
  build_date: '2026-05-01T00:00:00Z',
  git_commit_hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
  minimum_agent_version: '1.0.0',
};

export default function AboutPage() {
  const [version, setVersion] = useState<VersionInfo | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/version`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setVersion)
      .catch(() => setVersion(DUMMY_VERSION));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          AEGIS-SIGHT について
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          バージョン情報・システム情報・ライセンス
        </p>
      </div>

      {/* Brand */}
      <div className="aegis-card text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600">
          <svg
            className="h-10 w-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          AEGIS-SIGHT
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          統合IT資産管理・SAM・調達・監視プラットフォーム
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Version Info */}
        <div className="aegis-card">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            バージョン情報
          </h3>
          {!version ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              読み込み中...
            </p>
          ) : (
            <dl className="space-y-3">
              {[
                { label: 'APIバージョン', value: `v${version.api_version}` },
                { label: 'アプリバージョン', value: `v${version.app_version}` },
                { label: 'Python', value: version.python_version },
                {
                  label: 'ビルド日時',
                  value: new Date(version.build_date).toLocaleString('ja-JP'),
                },
                { label: 'Gitコミット', value: version.git_commit_hash },
                {
                  label: '最小エージェントバージョン',
                  value: `v${version.minimum_agent_version}`,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 dark:border-aegis-border"
                >
                  <dt className="text-sm text-gray-500 dark:text-gray-400">
                    {item.label}
                  </dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* System Info */}
        <div className="aegis-card">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            システム情報
          </h3>
          <dl className="space-y-3">
            {[
              { label: 'フロントエンド', value: 'Next.js (React)' },
              { label: 'バックエンド', value: 'FastAPI (Python)' },
              { label: 'データベース', value: 'PostgreSQL' },
              { label: 'キャッシュ', value: 'Redis' },
              { label: 'タスクキュー', value: 'Celery' },
              { label: 'エージェント', value: 'AEGIS-SIGHT Agent (Go)' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 dark:border-aegis-border"
              >
                <dt className="text-sm text-gray-500 dark:text-gray-400">
                  {item.label}
                </dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* License */}
        <div className="aegis-card">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            ライセンス
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            AEGIS-SIGHT は MIT License の下で公開されています。
          </p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Copyright (c) 2024-2026 AEGIS-SIGHT Contributors.
            Permission is hereby granted, free of charge, to any person obtaining
            a copy of this software and associated documentation files.
          </p>
        </div>

        {/* Links */}
        <div className="aegis-card">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            リンク
          </h3>
          <ul className="space-y-3">
            {[
              {
                label: 'API ドキュメント (Swagger)',
                href: `${API_BASE}/docs`,
                description: 'OpenAPI仕様に基づくインタラクティブなAPIドキュメント',
              },
              {
                label: 'API ドキュメント (ReDoc)',
                href: `${API_BASE}/redoc`,
                description: '読みやすいAPI仕様ドキュメント',
              },
              {
                label: 'GitHub リポジトリ',
                href: 'https://github.com/aegis-sight/aegis-sight',
                description: 'ソースコードとコントリビューションガイド',
              },
              {
                label: 'Issues',
                href: 'https://github.com/aegis-sight/aegis-sight/issues',
                description: 'バグ報告と機能要望',
              },
              {
                label: 'Projects',
                href: 'https://github.com/orgs/aegis-sight/projects',
                description: '開発ロードマップと進捗管理',
              },
            ].map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-lg border border-gray-200 p-3 transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-aegis-border dark:hover:border-primary-700 dark:hover:bg-primary-900/10"
                >
                  <p className="text-sm font-medium text-primary-600 group-hover:text-primary-700 dark:text-primary-400">
                    {link.label}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {link.description}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
