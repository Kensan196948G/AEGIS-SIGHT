'use client';

import { useState, useCallback } from 'react';
import { downloadReport } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Report card config
// ---------------------------------------------------------------------------

interface ReportCard {
  type: 'sam' | 'assets' | 'security';
  filename: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  lastGenerated: string;
  size: string;
}

const REPORT_CARDS: ReportCard[] = [
  {
    type: 'sam',
    filename: 'sam_report.csv',
    title: 'SAMレポート',
    description: 'ソフトウェア資産管理 — ライセンスコンプライアンス状況の一覧',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
      </svg>
    ),
    lastGenerated: '2026-05-07 09:00',
    size: '284 KB',
  },
  {
    type: 'assets',
    filename: 'asset_report.csv',
    title: '資産インベントリレポート',
    description: 'IT資産インベントリ — デバイス一覧と状態の全件出力',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
      </svg>
    ),
    lastGenerated: '2026-05-07 08:30',
    size: '1.2 MB',
  },
  {
    type: 'security',
    filename: 'security_report.csv',
    title: 'セキュリティレポート',
    description: 'セキュリティポスチャ — Defender / BitLocker / パッチ状況の一覧',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    lastGenerated: '2026-05-07 09:15',
    size: '542 KB',
  },
];

const SCHEDULED_REPORTS = [
  { name: '月次SAMコンプライアンスレポート',   schedule: '毎月1日 09:00', next: '2026-06-01',  recipients: 3, status: 'active' },
  { name: '週次資産変更差分レポート',           schedule: '毎週月曜 08:00', next: '2026-05-11', recipients: 5, status: 'active' },
  { name: '四半期セキュリティポスチャ報告',     schedule: '毎四半期初日',   next: '2026-07-01', recipients: 8, status: 'active' },
  { name: 'J-SOX準拠証跡レポート',             schedule: '毎年3月31日',   next: '2027-03-31', recipients: 4, status: 'paused' },
];

const RECENT_HISTORY = [
  { name: 'SAMレポート',                     time: '2026-05-07 09:00', size: '284 KB', status: 'success', user: 'admin@aegis-sight.local' },
  { name: '資産インベントリレポート',         time: '2026-05-07 08:30', size: '1.2 MB', status: 'success', user: 'admin@aegis-sight.local' },
  { name: 'セキュリティレポート',             time: '2026-05-07 09:15', size: '542 KB', status: 'success', user: 'scheduler' },
  { name: '月次SAMコンプライアンスレポート', time: '2026-05-01 09:01', size: '312 KB', status: 'success', user: 'scheduler' },
  { name: '週次資産変更差分レポート',         time: '2026-04-28 08:00', size: '98 KB',  status: 'success', user: 'scheduler' },
  { name: 'J-SOX準拠証跡レポート',           time: '2026-04-25 14:30', size: '—',      status: 'failed',  user: 'tanaka@corp.local' },
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
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary-100 p-3 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 shrink-0">
          {card.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{card.title}</h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{card.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>最終生成: {card.lastGenerated}</span>
        <span>{card.size}</span>
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
            <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            ダウンロード中...
          </>
        ) : (
          <>
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">レポート</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            各種レポートを CSV 形式でダウンロード / スケジュール生成
          </p>
        </div>
        <button className="aegis-btn-secondary">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          カスタムレポート作成
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: '今月生成数',   value: '18',   color: 'text-gray-900 dark:text-white' },
          { label: '自動スケジュール', value: '4', color: 'text-primary-600 dark:text-primary-400' },
          { label: '配信先合計',   value: '20 名', color: 'text-green-600 dark:text-green-400' },
          { label: '失敗件数',     value: '1',    color: 'text-red-600 dark:text-red-400' },
        ].map((s) => (
          <div key={s.label} className="aegis-card text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Report Cards */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">即時ダウンロード</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {REPORT_CARDS.map((card) => (
            <ReportDownloadCard key={card.type} card={card} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Scheduled Reports */}
        <div className="aegis-card overflow-hidden p-0">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">スケジュールレポート</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-aegis-border">
            {SCHEDULED_REPORTS.map((r) => (
              <div key={r.name} className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {r.schedule} · 配信先 {r.recipients} 名 · 次回 {r.next}
                  </p>
                </div>
                <Badge variant={r.status === 'active' ? 'success' : 'warning'} dot>
                  {r.status === 'active' ? '有効' : '停止中'}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Recent History */}
        <div className="aegis-card overflow-hidden p-0">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">生成履歴</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-aegis-border">
            {RECENT_HISTORY.map((h, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                <div className={`h-2 w-2 shrink-0 rounded-full ${h.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{h.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {h.time} · {h.size} · {h.user}
                  </p>
                </div>
                {h.status === 'failed' && (
                  <Badge variant="danger">失敗</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
