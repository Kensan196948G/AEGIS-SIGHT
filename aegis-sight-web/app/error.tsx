'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('AEGIS-SIGHT error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 dark:bg-aegis-dark">
      {/* Warning Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/20">
        <svg
          className="h-12 w-12 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>

      {/* Error Info */}
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        エラーが発生しました
      </h1>
      <p className="mt-2 max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
        予期しないエラーが発生しました。問題が続く場合はシステム管理者にお問い合わせください。
      </p>

      {/* Error Details (dev) */}
      {error.message && (
        <div className="mt-4 max-w-lg rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/10">
          <p className="text-xs font-mono text-red-800 dark:text-red-300">
            {error.message}
          </p>
          {error.digest && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              Digest: {error.digest}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
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
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
            />
          </svg>
          リトライ
        </button>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-aegis-border dark:bg-aegis-surface dark:text-gray-300 dark:hover:bg-aegis-dark"
        >
          ダッシュボードへ
        </a>
      </div>

      {/* Branding */}
      <p className="mt-12 text-xs text-gray-400 dark:text-gray-600">
        AEGIS-SIGHT IT Management Platform
      </p>
    </div>
  );
}
