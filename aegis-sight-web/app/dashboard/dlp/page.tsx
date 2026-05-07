'use client';

import { useState, useEffect, useCallback } from 'react';
import { DonutChart, BarChart } from '@/components/ui/chart';
import {
  fetchDLPEventSummary,
  fetchDLPEvents,
  fetchDLPRules,
  BackendDLPEventSummary,
  BackendDLPEvent,
  BackendDLPRule,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Helpers & style maps (open-string keys for backend compatibility)
// ---------------------------------------------------------------------------

const RULE_TYPE_STYLE: Record<string, { label: string; className: string }> = {
  file_extension: {
    label: 'ファイル拡張子',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  path_pattern: {
    label: 'パスパターン',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
  content_keyword: {
    label: 'キーワード',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  size_limit: {
    label: 'サイズ制限',
    className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  },
};

const ACTION_STYLE: Record<string, { label: string; className: string }> = {
  alert: {
    label: 'アラート',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  block: {
    label: 'ブロック',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  log: {
    label: 'ログ',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  alerted: {
    label: 'アラート済',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  blocked: {
    label: 'ブロック済',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  logged: {
    label: 'ログ済',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
};

const SEVERITY_STYLE: Record<string, { label: string; className: string }> = {
  critical: {
    label: 'Critical',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  high: {
    label: 'High',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  medium: {
    label: 'Medium',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  low: {
    label: 'Low',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
};

function getActionStyle(key: string) {
  return ACTION_STYLE[key] ?? { label: key, className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
}

function getSeverityStyle(key: string) {
  return SEVERITY_STYLE[key] ?? { label: key, className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
}

function getRuleTypeStyle(key: string) {
  return RULE_TYPE_STYLE[key] ?? { label: key, className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="aegis-card p-5 animate-pulse">
      <div className="h-3 w-20 rounded bg-gray-200 dark:bg-aegis-border" />
      <div className="mt-3 h-8 w-16 rounded bg-gray-200 dark:bg-aegis-border" />
    </div>
  );
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 rounded bg-gray-200 dark:bg-aegis-border" />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function DLPPage() {
  const [activeTab, setActiveTab] = useState<'rules' | 'events'>('rules');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    rule_type: 'file_extension',
    pattern: '',
    action: 'alert',
    severity: 'medium',
    is_enabled: true,
  });

  // API state
  const [summary, setSummary] = useState<BackendDLPEventSummary | null>(null);
  const [events, setEvents] = useState<BackendDLPEvent[]>([]);
  const [rules, setRules] = useState<BackendDLPRule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, eventsData, rulesData] = await Promise.all([
        fetchDLPEventSummary(),
        fetchDLPEvents(0, 100),
        fetchDLPRules(0, 100),
      ]);
      setSummary(summaryData);
      setEvents(eventsData.items);
      setRules(rulesData.items);
    } catch (err) {
      console.error('DLP data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ---------------------------------------------------------------------------
  // Derived chart values
  // ---------------------------------------------------------------------------
  const totalEvents = summary?.total_events ?? 0;
  const blocked = summary?.blocked ?? 0;
  const alerted = summary?.alerted ?? 0;
  const bySeverity = summary?.by_severity ?? {};
  const blockRate = Math.round((blocked / Math.max(totalEvents, 1)) * 100);
  const blockRateColor = blockRate >= 50 ? '#ef4444' : blockRate >= 30 ? '#f59e0b' : '#10b981';
  const severityBarData = [
    { label: 'Critical', value: bySeverity['critical'] ?? 0, color: 'bg-red-500' },
    { label: 'High', value: bySeverity['high'] ?? 0, color: 'bg-orange-500' },
    { label: 'Medium', value: bySeverity['medium'] ?? 0, color: 'bg-amber-500' },
    { label: 'Low', value: bySeverity['low'] ?? 0, color: 'bg-blue-400' },
  ];
  const maxSeverityValue = Math.max(...severityBarData.map((d) => d.value), 1);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            DLP (情報漏洩防止)
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ファイル操作監視ルールの管理、DLPイベントの追跡
          </p>
        </div>
        <div className="flex gap-3">
          <button className="aegis-btn-secondary">
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            エクスポート
          </button>
          <button
            className="aegis-btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            ルール作成
          </button>
        </div>
      </div>

      {/* DLP 概要チャート */}
      {loading ? (
        <div className="aegis-card animate-pulse">
          <div className="mb-4 h-4 w-24 rounded bg-gray-200 dark:bg-aegis-border" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <div className="h-[140px] w-[140px] rounded-full bg-gray-200 dark:bg-aegis-border" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-6 rounded bg-gray-200 dark:bg-aegis-border" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="aegis-card">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">DLP 概要</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ブロック率</p>
              <DonutChart value={blockRate} max={100} size={140} strokeWidth={14} color={blockRateColor} label={`${blockRate}%`} />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                全 {totalEvents} イベント中 {blocked} 件ブロック
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">重要度別イベント数</p>
              <BarChart data={severityBarData} maxValue={maxSeverityValue} height={160} showValues />
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            {/* Total events */}
            <div className="aegis-card p-5">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">総イベント数</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{totalEvents}</p>
            </div>

            {/* Blocked */}
            <div className="aegis-card p-5">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ブロック</p>
              <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">{blocked}</p>
            </div>

            {/* Alerted */}
            <div className="aegis-card p-5">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">アラート</p>
              <p className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">{alerted}</p>
            </div>

            {/* Critical */}
            <div className="aegis-card p-5">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Critical</p>
              <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
                {bySeverity['critical'] ?? 0}
              </p>
            </div>

            {/* Severity breakdown */}
            <div className="aegis-card p-5">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">重要度別</p>
              <div className="mt-2 space-y-1.5">
                {Object.entries(bySeverity).map(([sev, count]) => {
                  const style = getSeverityStyle(sev);
                  return (
                    <div key={sev} className="flex items-center justify-between">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.className}`}>
                        {style.label}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{count}</span>
                    </div>
                  );
                })}
                {Object.keys(bySeverity).length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">データなし</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-aegis-darker">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'rules'
              ? 'bg-white text-gray-900 shadow dark:bg-aegis-surface dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          DLPルール
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'events'
              ? 'bg-white text-gray-900 shadow dark:bg-aegis-surface dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          DLPイベント
          {blocked > 0 && (
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {blocked}
            </span>
          )}
        </button>
      </div>

      {/* Rules Table */}
      {activeTab === 'rules' && (
        <div className="aegis-card">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              DLPルール一覧
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              ファイル操作監視ルールの管理
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-aegis-border dark:bg-aegis-darker">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    ルール名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    種別
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    パターン
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    アクション
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    重要度
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    状態
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-aegis-border">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
                ) : rules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      データなし
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => {
                    const typeBadge = getRuleTypeStyle(rule.rule_type);
                    const actBadge = getActionStyle(rule.action);
                    const sevBadge = getSeverityStyle(rule.severity);
                    return (
                      <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {rule.name}
                            </p>
                            {rule.description && (
                              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                {rule.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeBadge.className}`}>
                            {typeBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <code className="max-w-[200px] truncate block text-xs font-mono text-gray-600 dark:text-gray-400">
                            {rule.pattern}
                          </code>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${actBadge.className}`}>
                            {actBadge.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${sevBadge.className}`}>
                            {sevBadge.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              rule.is_enabled
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                rule.is_enabled ? 'bg-emerald-500' : 'bg-gray-400'
                              }`}
                            />
                            {rule.is_enabled ? '有効' : '無効'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <button className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                            編集
                          </button>
                          <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
                          <button className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                            削除
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Events Table */}
      {activeTab === 'events' && (
        <div className="aegis-card">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              DLPイベント一覧
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              検出されたファイル操作違反イベント
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-aegis-border dark:bg-aegis-darker">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    検出日時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    ユーザー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    ファイル
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    サイズ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    マッチパターン
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-aegis-border">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      データなし
                    </td>
                  </tr>
                ) : (
                  events.map((event) => {
                    const actBadge = getActionStyle(event.action_taken);
                    return (
                      <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(event.detected_at)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-mono font-medium text-primary-600 dark:text-primary-400">
                          {event.user_name}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[250px]">
                              {event.file_name}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[250px]">
                              {event.file_path}
                            </p>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatFileSize(event.file_size)}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-700 dark:text-gray-300 truncate max-w-[180px]">
                          {event.matched_pattern}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${actBadge.className}`}>
                            {actBadge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-aegis-darker">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                新規DLPルール作成
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-aegis-surface dark:hover:text-gray-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  ルール名
                </label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                  placeholder="例: 実行ファイル検出"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  説明
                </label>
                <textarea
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    ルール種別
                  </label>
                  <select
                    value={newRule.rule_type}
                    onChange={(e) => setNewRule({ ...newRule, rule_type: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                  >
                    <option value="file_extension">ファイル拡張子</option>
                    <option value="path_pattern">パスパターン</option>
                    <option value="content_keyword">キーワード</option>
                    <option value="size_limit">サイズ制限</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    アクション
                  </label>
                  <select
                    value={newRule.action}
                    onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                  >
                    <option value="alert">アラート</option>
                    <option value="block">ブロック</option>
                    <option value="log">ログ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  パターン
                </label>
                <input
                  type="text"
                  value={newRule.pattern}
                  onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                  placeholder="例: .exe,.msi,.bat"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {newRule.rule_type === 'file_extension' && 'カンマ区切りの拡張子 (例: .exe,.msi)'}
                  {newRule.rule_type === 'path_pattern' && 'glob/正規表現パターン (例: E:\\*,F:\\*)'}
                  {newRule.rule_type === 'content_keyword' && 'カンマ区切りのキーワード'}
                  {newRule.rule_type === 'size_limit' && '最大サイズ (バイト) (例: 104857600 = 100MB)'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    重要度
                  </label>
                  <select
                    value={newRule.severity}
                    onChange={(e) => setNewRule({ ...newRule, severity: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newRule.is_enabled}
                      onChange={(e) => setNewRule({ ...newRule, is_enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      有効にする
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="aegis-btn-secondary"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  // In production: POST /api/v1/dlp/rules
                  setShowCreateModal(false);
                }}
                className="aegis-btn-primary"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
