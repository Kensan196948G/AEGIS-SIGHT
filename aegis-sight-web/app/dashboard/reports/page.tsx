'use client';

import { useState, useCallback } from 'react';
import { downloadReport } from '@/lib/api';

// ---------------------------------------------------------------------------
// Report card config
// ---------------------------------------------------------------------------

interface ReportCard {
  type: 'sam' | 'assets' | 'security';
  filename: string;
  title: string;
  description: string;
}

const REPORT_CARDS: ReportCard[] = [
  {
    type: 'sam',
    filename: 'sam_report.csv',
    title: 'SAM レポート',
    description: 'ソフトウェア資産管理 — ライセンスコンプライアンス状況の一覧',
  },
  {
    type: 'assets',
    filename: 'asset_report.csv',
    title: '資産インベントリレポート',
    description: 'IT資産インベントリ — デバイス一覧と状態の全件出力',
  },
  {
    type: 'security',
    filename: 'security_report.csv',
    title: 'セキュリティレポート',
    description: 'セキュリティポスチャ — Defender / BitLocker / パッチ状況の一覧',
  },
];

// ---------------------------------------------------------------------------
// Download button with per-card state
// ---------------------------------------------------------------------------

function ReportDownloadCard({ card }: { card: ReportCard }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setError(null);
    try {
      await downloadReport(card.type, card.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ダウンロードに失敗しました');
    } finally {
      setDownloading(false);
    }
  }, [card.type, card.filename]);

  return (
    <div className="aegis-card flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{card.title}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{card.description}</p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        onClick={handleDownload}
        disabled={downloading}
        className="aegis-btn-primary self-start"
      >
        {downloading ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            ダウンロード中...
          </>
        ) : (
          <>
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            CSV ダウンロード
          </>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">レポート</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          各種レポートを CSV 形式でダウンロードします
        </p>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {REPORT_CARDS.map((card) => (
          <ReportDownloadCard key={card.type} card={card} />
        ))}
      </div>
    </div>
  );
}
