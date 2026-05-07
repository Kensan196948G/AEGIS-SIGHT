'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ProgressBar, DonutChart, BarChart } from '@/components/ui/chart';
import {
  fetchComplianceOverview,
  fetchComplianceISO27001,
  fetchComplianceJSOX,
  fetchComplianceNIST,
} from '@/lib/api';
import type {
  BackendComplianceOverview,
  BackendISO27001Response,
  BackendJSOXResponse,
  BackendNISTResponse,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function statusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'compliant':
    case 'effective':
      return 'success';
    case 'partial':
    case 'partially_effective':
      return 'warning';
    case 'non_compliant':
    case 'ineffective':
      return 'danger';
    default:
      return 'info';
  }
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    compliant: '適合',
    partial: '部分適合',
    non_compliant: '不適合',
    effective: '有効',
    partially_effective: '一部有効',
    ineffective: '無効',
  };
  return map[status] || status;
}

export function severityVariant(sev: string): 'danger' | 'warning' | 'info' | 'success' {
  switch (sev) {
    case 'critical': return 'danger';
    case 'high': return 'warning';
    case 'medium': return 'info';
    default: return 'success';
  }
}

export function severityLabel(sev: string): string {
  const map: Record<string, string> = { critical: '緊急', high: '高', medium: '中', low: '低' };
  return map[sev] || sev;
}

export function issueStatusLabel(s: string): string {
  const map: Record<string, string> = { open: '未対応', in_progress: '対応中', resolved: '解決済' };
  return map[s] || s;
}

export function getNistTierBarColor(tier: number, targetTier: number): string {
  return tier >= targetTier ? 'bg-emerald-500' : tier >= targetTier - 1 ? 'bg-blue-500' : 'bg-amber-500';
}

const eventTypeColors: Record<string, string> = {
  assessment: 'bg-blue-500',
  remediation: 'bg-emerald-500',
  finding: 'bg-red-500',
  review: 'bg-purple-500',
  training: 'bg-amber-500',
};

// ---------------------------------------------------------------------------
// NIST CSF radar-like visual (pure CSS bar-based)
// ---------------------------------------------------------------------------

function NistRadarChart({ data }: { data: BackendNISTResponse['functions'] }) {
  const maxTier = 4;
  return (
    <div className="space-y-3">
      {data.map((fn) => (
        <div key={fn.function} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300 font-medium">{fn.function}</span>
            <span className="text-gray-500 dark:text-gray-400 text-xs">
              Tier {fn.tier} / 目標 Tier {fn.target_tier}
            </span>
          </div>
          <div className="relative h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-300 dark:bg-blue-500 z-10"
              style={{ left: `${(fn.target_tier / maxTier) * 100}%` }}
            />
            <div
              className={`h-full rounded-full transition-all duration-500 ${getNistTierBarColor(fn.tier, fn.target_tier)}`}
              style={{ width: `${(fn.tier / maxTier) * 100}%` }}
            />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded bg-emerald-500" /> 目標達成
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded bg-blue-500" /> 目標近い
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded bg-amber-500" /> 要改善
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-0.5 bg-blue-300 dark:bg-blue-500" /> 目標ライン
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<'iso' | 'jsox' | 'nist'>('iso');
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState<BackendComplianceOverview | null>(null);
  const [iso, setIso] = useState<BackendISO27001Response | null>(null);
  const [jsox, setJsox] = useState<BackendJSOXResponse | null>(null);
  const [nist, setNist] = useState<BackendNISTResponse | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchComplianceOverview(),
      fetchComplianceISO27001(),
      fetchComplianceJSOX(),
      fetchComplianceNIST(),
    ])
      .then(([ov, iso27k, jsoxRes, nistRes]) => {
        setOverview(ov);
        setIso(iso27k);
        setJsox(jsoxRes);
        setNist(nistRes);
      })
      .catch(() => {/* retain null — UI shows skeleton/empty */})
      .finally(() => setLoading(false));
  }, []);

  const isoOverall = iso ? Math.round(iso.overall_score) : 0;
  const isoDonutColor = isoOverall >= 80 ? '#10b981' : isoOverall >= 60 ? '#f59e0b' : '#ef4444';
  const nistBarData = nist
    ? nist.functions.map((fn) => ({
        label: fn.function.split(' ')[0],
        value: fn.score,
        color: fn.score >= 75 ? 'bg-emerald-500' : fn.score >= 60 ? 'bg-blue-500' : 'bg-amber-500',
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            コンプライアンスダッシュボード
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ISO 27001 / J-SOX / NIST CSF 統合コンプライアンス管理
          </p>
        </div>
        <button
          className="aegis-btn-primary"
          onClick={() => alert('PDF出力機能は今後実装予定です')}
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          PDF出力
        </button>
      </div>

      {/* Compliance Overview Charts */}
      <div className="aegis-card">
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">コンプライアンス概要</h2>
        {loading ? (
          <div className="h-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ISO 27001 総合スコア</p>
              <DonutChart value={isoOverall} max={100} size={140} strokeWidth={14} color={isoDonutColor} label={`${isoOverall}%`} />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                全 {iso?.categories.length ?? 0} カテゴリの平均スコア（目標: 85%以上）
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">NIST CSF スコア別</p>
              {nistBarData.length > 0 ? (
                <BarChart data={nistBarData} maxValue={100} height={160} showValues />
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-gray-400">データなし</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="aegis-card">
          <p className="text-sm text-gray-500 dark:text-gray-400">ISO 27001 スコア</p>
          {loading ? (
            <div className="mt-1 h-9 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <>
              <p className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">{isoOverall}%</p>
              <ProgressBar value={isoOverall} max={100} color="blue" size="md" showLabel={false} className="mt-2" />
            </>
          )}
        </div>
        <div className="aegis-card">
          <p className="text-sm text-gray-500 dark:text-gray-400">J-SOX ITGC</p>
          {loading ? (
            <div className="mt-1 h-9 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <>
              <p className="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">
                {statusLabel(jsox?.overall_status ?? '')}
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                有効: {jsox?.controls.filter((c) => c.status === 'effective').length ?? 0} / {jsox?.controls.length ?? 0} 領域
              </p>
            </>
          )}
        </div>
        <div className="aegis-card">
          <p className="text-sm text-gray-500 dark:text-gray-400">NIST CSF 成熟度</p>
          {loading ? (
            <div className="mt-1 h-9 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <>
              <p className="mt-1 text-3xl font-bold text-purple-600 dark:text-purple-400">
                Tier {nist?.overall_tier.toFixed(1) ?? '—'}
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">6コア機能の平均</p>
            </>
          )}
        </div>
        <div className="aegis-card">
          <p className="text-sm text-gray-500 dark:text-gray-400">未解決課題</p>
          {loading ? (
            <div className="mt-1 h-9 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <>
              <p className="mt-1 text-3xl font-bold text-red-600 dark:text-red-400">
                {overview?.open_issues ?? 0}
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                緊急: {overview?.issues.filter((i) => i.severity === 'critical').length ?? 0}件
              </p>
            </>
          )}
        </div>
      </div>

      {/* Tabbed Framework Detail */}
      <div className="aegis-card">
        <div className="flex gap-1 border-b border-gray-200 dark:border-aegis-border pb-3 mb-4">
          {([
            { key: 'iso' as const, label: 'ISO 27001' },
            { key: 'jsox' as const, label: 'J-SOX ITGC' },
            { key: 'nist' as const, label: 'NIST CSF' },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-aegis-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : (
          <>
            {/* ISO 27001 Tab */}
            {activeTab === 'iso' && iso && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    ISO 27001 カテゴリ別スコア
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">最終評価: {iso.last_assessment}</span>
                </div>
                {iso.categories.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-3">
                    <span className="w-64 text-sm text-gray-700 dark:text-gray-300 truncate shrink-0">
                      {cat.name}
                    </span>
                    <div className="flex-1">
                      <ProgressBar value={cat.score} max={cat.max_score} color="blue" size="md" />
                    </div>
                    <Badge variant={statusBadgeVariant(cat.status)} dot>
                      {statusLabel(cat.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* J-SOX ITGC Tab */}
            {activeTab === 'jsox' && jsox && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    ITGC 4領域の統制状態
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">監査期間: {jsox.audit_period}</span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {jsox.controls.map((ctrl) => (
                    <div key={ctrl.area} className="rounded-lg border border-gray-200 dark:border-aegis-border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{ctrl.area}</h4>
                        <Badge variant={statusBadgeVariant(ctrl.status)} dot>
                          {statusLabel(ctrl.status)}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">指摘事項</span>
                          <span className={`font-medium ${ctrl.findings > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {ctrl.findings}件
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">是正進捗</span>
                            <span className="font-medium text-gray-900 dark:text-white">{ctrl.remediation_progress}%</span>
                          </div>
                          <ProgressBar
                            value={ctrl.remediation_progress}
                            max={100}
                            color={ctrl.remediation_progress === 100 ? 'green' : ctrl.remediation_progress >= 70 ? 'blue' : 'amber'}
                            size="sm"
                            showLabel={false}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NIST CSF Tab */}
            {activeTab === 'nist' && nist && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    NIST CSF 6コア機能 成熟度レベル
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">最終評価: {nist.last_assessment}</span>
                </div>
                <NistRadarChart data={nist.functions} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Two-Column: Issues & Timeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Compliance Issues */}
        <div className="aegis-card overflow-hidden p-0">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              コンプライアンス課題
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-aegis-border">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-6 py-3">
                  <div className="h-5 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              ))
            ) : (overview?.issues ?? []).length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-400">課題なし</div>
            ) : (
              (overview?.issues ?? []).map((issue) => (
                <div key={issue.id} className="flex items-start gap-3 px-6 py-3 hover:bg-gray-50 dark:hover:bg-aegis-surface/50 transition-colors">
                  <Badge variant={severityVariant(issue.severity)} dot>
                    {severityLabel(issue.severity)}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {issue.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{issue.framework}</span>
                      {issue.due_date && (
                        <>
                          <span>|</span>
                          <span>期限: {issue.due_date}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant={issue.status === 'in_progress' ? 'info' : issue.status === 'resolved' ? 'success' : 'warning'}>
                    {issueStatusLabel(issue.status)}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit Event Timeline */}
        <div className="aegis-card overflow-hidden p-0">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              最近の監査イベント
            </h2>
          </div>
          <div className="px-6 py-4">
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                ))}
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-4">
                  {(overview?.recent_events ?? []).map((event, i) => (
                    <div key={i} className="relative flex gap-4 pl-6">
                      <div className={`absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-white dark:border-aegis-dark ${eventTypeColors[event.event_type] || 'bg-gray-400'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {event.description}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{event.actor}</span>
                          <span>|</span>
                          <span>{new Date(event.timestamp).toLocaleString('ja-JP')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
