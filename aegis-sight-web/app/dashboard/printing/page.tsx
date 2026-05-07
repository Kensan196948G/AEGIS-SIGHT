'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart } from '@/components/ui/chart';
import {
  fetchPrinters,
  fetchPrintJobs,
  fetchPrintStats,
  fetchPrintPolicies,
  type BackendPrinter,
  type BackendPrintJob,
  type BackendPrintStats,
  type BackendPrintPolicy,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = 'stats' | 'printers' | 'jobs' | 'policies';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">完了</Badge>;
    case 'failed':
      return <Badge variant="default" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">失敗</Badge>;
    case 'cancelled':
      return <Badge variant="default" className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">キャンセル</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatsCards({
  stats,
  printers,
  jobs,
}: {
  stats: BackendPrintStats;
  printers: BackendPrinter[];
  jobs: BackendPrintJob[];
}) {
  const colorRatio = (stats.color_ratio * 100).toFixed(1);
  const activePrinters = printers.filter((p) => p.is_active).length;

  const completedJobs = jobs.filter((j) => j.status === 'completed').length;
  const successRate = jobs.length > 0 ? Math.round((completedJobs / jobs.length) * 100) : 0;
  const successColor = successRate >= 80 ? '#10b981' : successRate >= 60 ? '#f59e0b' : '#ef4444';

  const userBarData = stats.by_user.slice(0, 5).map((u, i) => ({
    label: u.user_name.substring(0, 6),
    value: u.total_pages,
    color: ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500'][i] ?? 'bg-gray-400',
  }));

  return (
    <div className="space-y-6">
      {/* 印刷概要チャート */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">印刷概要</h2>
        {stats.total_jobs === 0 ? (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">データなし</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ジョブ成功率</p>
              <DonutChart
                value={successRate}
                max={100}
                size={140}
                strokeWidth={14}
                color={successColor}
                label={`${successRate}%`}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                全 {jobs.length} ジョブ中 {completedJobs} 件成功
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ユーザー別印刷ページ数 Top 5</p>
              {userBarData.length > 0 && (
                <BarChart
                  data={userBarData}
                  maxValue={Math.max(...userBarData.map((d) => d.value), 1)}
                  height={160}
                  showValues
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400">総印刷ページ数</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats.total_pages.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">今月</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400">総ジョブ数</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total_jobs}</div>
          <div className="text-xs text-gray-400 mt-1">今月</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400">カラー率</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{colorRatio}%</div>
          <div className="text-xs text-gray-400 mt-1">完了ジョブ中</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400">稼働プリンタ</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {activePrinters} / {printers.length}
          </div>
          <div className="text-xs text-gray-400 mt-1">アクティブ / 全台数</div>
        </div>
      </div>

      {/* User Top 5 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">ユーザー別印刷トップ5</h3>
        </div>
        <div className="overflow-x-auto">
          {stats.by_user.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">データなし</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">順位</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ユーザー名</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">総ページ数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {stats.by_user.slice(0, 5).map((u, i) => (
                  <tr key={u.user_name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{i + 1}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">{u.user_name}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{u.total_pages.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function PrintersTable({ printers }: { printers: BackendPrinter[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">プリンタ一覧</h3>
      </div>
      <div className="overflow-x-auto">
        {printers.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">データなし</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">名前</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">設置場所</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">IPアドレス</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">機種</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {printers.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">{p.name}</td>
                  <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">{p.location}</td>
                  <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">{p.ip_address ?? '-'}</td>
                  <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">{p.model}</td>
                  <td className="px-5 py-3 text-sm text-center">
                    {p.is_active ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">稼働中</Badge>
                    ) : (
                      <Badge variant="default" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">停止</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function JobsTable({ jobs }: { jobs: BackendPrintJob[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">印刷ジョブ履歴</h3>
      </div>
      <div className="overflow-x-auto">
        {jobs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">データなし</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">日時</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ユーザー</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ドキュメント</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ページ</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">部数</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">カラー</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">両面</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(j.printed_at)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{j.user_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[200px] truncate" title={j.document_name}>{j.document_name}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{j.pages}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{j.copies}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    {j.color ? (
                      <span className="inline-block w-3 h-3 rounded-full bg-blue-500" title="カラー" />
                    ) : (
                      <span className="inline-block w-3 h-3 rounded-full bg-gray-400" title="モノクロ" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300">{j.duplex ? '両面' : '片面'}</td>
                  <td className="px-4 py-3 text-sm text-center">{statusBadge(j.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PoliciesTable({ policies }: { policies: BackendPrintPolicy[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">印刷ポリシー管理</h3>
      </div>
      <div className="overflow-x-auto">
        {policies.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">データなし</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ポリシー名</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">日次上限</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">カラー</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">両面のみ</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {policies.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">{p.name}</td>
                  <td className="px-5 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{p.max_pages_per_day?.toLocaleString() ?? '-'}</td>
                  <td className="px-5 py-3 text-sm text-center">
                    {p.allow_color ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">許可</Badge>
                    ) : (
                      <Badge variant="default" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">禁止</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-center">
                    {p.allow_duplex_only ? (
                      <Badge variant="default" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">必須</Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-center">
                    {p.is_enabled ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">有効</Badge>
                    ) : (
                      <Badge variant="default" className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">無効</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

const tabs: { id: TabId; label: string }[] = [
  { id: 'stats', label: '統計' },
  { id: 'printers', label: 'プリンタ' },
  { id: 'jobs', label: 'ジョブ履歴' },
  { id: 'policies', label: 'ポリシー' },
];

export default function PrintingPage() {
  const [printers, setPrinters] = useState<BackendPrinter[]>([]);
  const [jobs, setJobs] = useState<BackendPrintJob[]>([]);
  const [stats, setStats] = useState<BackendPrintStats | null>(null);
  const [policies, setPolicies] = useState<BackendPrintPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('stats');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [printersRes, jobsRes, statsRes, policiesRes] = await Promise.all([
        fetchPrinters(0, 100),
        fetchPrintJobs(0, 100),
        fetchPrintStats(),
        fetchPrintPolicies(0, 100),
      ]);
      setPrinters(printersRes.items);
      setJobs(jobsRes.items);
      setStats(statsRes);
      setPolicies(policiesRes.items);
    } catch {
      setPrinters([]);
      setJobs([]);
      setStats(null);
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="flex gap-6 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((t) => (
            <div key={t.id} className="h-10 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
        <div className="h-64 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">印刷管理</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          プリンタ管理、印刷ジョブ監視、ポリシーによる印刷制御
        </p>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6" aria-label="印刷管理タブ">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'stats' && (
        stats === null ? (
          <p className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">データなし</p>
        ) : (
          <StatsCards stats={stats} printers={printers} jobs={jobs} />
        )
      )}
      {activeTab === 'printers' && <PrintersTable printers={printers} />}
      {activeTab === 'jobs' && <JobsTable jobs={jobs} />}
      {activeTab === 'policies' && <PoliciesTable policies={policies} />}
    </div>
  );
}
