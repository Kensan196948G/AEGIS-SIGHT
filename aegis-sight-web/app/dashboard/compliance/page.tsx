'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/chart';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const isoCategories = [
  { name: 'A.5 情報セキュリティ方針', score: 92, maxScore: 100, status: 'compliant' },
  { name: 'A.6 情報セキュリティの組織', score: 85, maxScore: 100, status: 'compliant' },
  { name: 'A.7 人的資源セキュリティ', score: 78, maxScore: 100, status: 'partial' },
  { name: 'A.8 資産管理', score: 88, maxScore: 100, status: 'compliant' },
  { name: 'A.9 アクセス制御', score: 91, maxScore: 100, status: 'compliant' },
  { name: 'A.10 暗号', score: 95, maxScore: 100, status: 'compliant' },
  { name: 'A.11 物理的・環境的セキュリティ', score: 82, maxScore: 100, status: 'compliant' },
  { name: 'A.12 運用セキュリティ', score: 76, maxScore: 100, status: 'partial' },
  { name: 'A.13 通信セキュリティ', score: 89, maxScore: 100, status: 'compliant' },
  { name: 'A.14 システム取得・開発・保守', score: 72, maxScore: 100, status: 'partial' },
];

const jsoxControls = [
  { area: 'プログラム変更管理', status: 'effective', findings: 0, remediation: 100 },
  { area: 'アクセス管理', status: 'partially_effective', findings: 2, remediation: 75 },
  { area: 'コンピュータ運用', status: 'effective', findings: 0, remediation: 100 },
  { area: 'プログラム開発', status: 'partially_effective', findings: 1, remediation: 60 },
];

const nistFunctions = [
  { function: '識別 (Identify)', tier: 3, targetTier: 4, score: 75 },
  { function: '防御 (Protect)', tier: 3, targetTier: 4, score: 80 },
  { function: '検知 (Detect)', tier: 2, targetTier: 3, score: 65 },
  { function: '対応 (Respond)', tier: 3, targetTier: 4, score: 70 },
  { function: '復旧 (Recover)', tier: 2, targetTier: 3, score: 55 },
  { function: '統治 (Govern)', tier: 2, targetTier: 3, score: 60 },
];

const complianceIssues = [
  { id: 'CI-001', framework: 'ISO 27001', severity: 'high', title: 'A.12 運用セキュリティ: ログ監視の自動化不足', status: 'in_progress', dueDate: '2026-04-15' },
  { id: 'CI-002', framework: 'J-SOX', severity: 'medium', title: 'アクセス権の定期レビュー未実施（Q1）', status: 'open', dueDate: '2026-04-30' },
  { id: 'CI-003', framework: 'NIST CSF', severity: 'high', title: 'インシデント対応計画の更新遅延', status: 'in_progress', dueDate: '2026-04-10' },
  { id: 'CI-004', framework: 'ISO 27001', severity: 'critical', title: 'A.14 開発環境と本番環境の分離不十分', status: 'open', dueDate: '2026-04-05' },
  { id: 'CI-005', framework: 'J-SOX', severity: 'low', title: '変更管理チケットの承認記録不備', status: 'open', dueDate: '2026-05-01' },
];

const auditEvents = [
  { timestamp: '2026-03-27 10:30', type: 'assessment', description: 'ISO 27001 内部監査完了', actor: '監査チーム' },
  { timestamp: '2026-03-25 14:00', type: 'remediation', description: 'アクセス制御ポリシー更新', actor: '情報セキュリティ部' },
  { timestamp: '2026-03-22 09:15', type: 'finding', description: 'J-SOX ITGC テスト: アクセス管理に指摘事項', actor: '外部監査人' },
  { timestamp: '2026-03-20 16:45', type: 'review', description: 'NIST CSF 成熟度評価レビュー会議', actor: 'CISO' },
  { timestamp: '2026-03-18 11:00', type: 'training', description: 'セキュリティ意識向上トレーニング実施', actor: 'HR' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusBadgeVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
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
};

const statusLabel = (status: string): string => {
  const map: Record<string, string> = {
    compliant: '適合',
    partial: '部分適合',
    non_compliant: '不適合',
    effective: '有効',
    partially_effective: '一部有効',
    ineffective: '無効',
  };
  return map[status] || status;
};

const severityVariant = (sev: string): 'danger' | 'warning' | 'info' | 'success' => {
  switch (sev) {
    case 'critical': return 'danger';
    case 'high': return 'warning';
    case 'medium': return 'info';
    default: return 'success';
  }
};

const severityLabel = (sev: string): string => {
  const map: Record<string, string> = { critical: '緊急', high: '高', medium: '中', low: '低' };
  return map[sev] || sev;
};

const issueStatusLabel = (s: string): string => {
  const map: Record<string, string> = { open: '未対応', in_progress: '対応中', resolved: '解決済' };
  return map[s] || s;
};

const eventTypeColors: Record<string, string> = {
  assessment: 'bg-blue-500',
  remediation: 'bg-emerald-500',
  finding: 'bg-red-500',
  review: 'bg-purple-500',
  training: 'bg-amber-500',
};

// ---------------------------------------------------------------------------
// Radar-like visual for NIST CSF (pure CSS bar-based)
// ---------------------------------------------------------------------------

function NistRadarChart({ data }: { data: typeof nistFunctions }) {
  const maxTier = 4;
  return (
    <div className="space-y-3">
      {data.map((fn) => (
        <div key={fn.function} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300 font-medium">{fn.function}</span>
            <span className="text-gray-500 dark:text-gray-400 text-xs">
              Tier {fn.tier} / 目標 Tier {fn.targetTier}
            </span>
          </div>
          <div className="relative h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            {/* Target tier marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-300 dark:bg-blue-500 z-10"
              style={{ left: `${(fn.targetTier / maxTier) * 100}%` }}
            />
            {/* Current tier bar */}
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                fn.tier >= fn.targetTier ? 'bg-emerald-500' : fn.tier >= fn.targetTier - 1 ? 'bg-blue-500' : 'bg-amber-500'
              }`}
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

  const isoOverall = Math.round(
    isoCategories.reduce((acc, c) => acc + c.score, 0) / isoCategories.length
  );

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

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="aegis-card">
          <p className="text-sm text-gray-500 dark:text-gray-400">ISO 27001 スコア</p>
          <p className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">{isoOverall}%</p>
          <ProgressBar value={isoOverall} max={100} color="blue" size="md" showLabel={false} className="mt-2" />
        </div>
        <div className="aegis-card">
          <p className="text-sm text-gray-500 dark:text-gray-400">J-SOX ITGC</p>
          <p className="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">一部有効</p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            有効: {jsoxControls.filter(c => c.status === 'effective').length} / {jsoxControls.length} 領域
          </p>
        </div>
        <div className="aegis-card">
          <p className="text-sm text-gray-500 dark:text-gray-400">NIST CSF 成熟度</p>
          <p className="mt-1 text-3xl font-bold text-purple-600 dark:text-purple-400">
            Tier {(nistFunctions.reduce((a, f) => a + f.tier, 0) / nistFunctions.length).toFixed(1)}
          </p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">6コア機能の平均</p>
        </div>
        <div className="aegis-card">
          <p className="text-sm text-gray-500 dark:text-gray-400">未解決課題</p>
          <p className="mt-1 text-3xl font-bold text-red-600 dark:text-red-400">
            {complianceIssues.filter(i => i.status !== 'resolved').length}
          </p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            緊急: {complianceIssues.filter(i => i.severity === 'critical').length}件
          </p>
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

        {/* ISO 27001 Tab */}
        {activeTab === 'iso' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                ISO 27001 カテゴリ別スコア
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">最終評価: 2026-03-27</span>
            </div>
            {isoCategories.map((cat) => (
              <div key={cat.name} className="flex items-center gap-3">
                <span className="w-64 text-sm text-gray-700 dark:text-gray-300 truncate shrink-0">
                  {cat.name}
                </span>
                <div className="flex-1">
                  <ProgressBar value={cat.score} max={cat.maxScore} color="blue" size="md" />
                </div>
                <Badge variant={statusBadgeVariant(cat.status)} dot>
                  {statusLabel(cat.status)}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* J-SOX ITGC Tab */}
        {activeTab === 'jsox' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                ITGC 4領域の統制状態
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">監査期間: 2025-04 ~ 2026-03</span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {jsoxControls.map((ctrl) => (
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
                        <span className="font-medium text-gray-900 dark:text-white">{ctrl.remediation}%</span>
                      </div>
                      <ProgressBar
                        value={ctrl.remediation}
                        max={100}
                        color={ctrl.remediation === 100 ? 'green' : ctrl.remediation >= 70 ? 'blue' : 'amber'}
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
        {activeTab === 'nist' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                NIST CSF 6コア機能 成熟度レベル
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">最終評価: 2026-03-20</span>
            </div>
            <NistRadarChart data={nistFunctions} />
          </div>
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
            {complianceIssues.map((issue) => (
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
                    <span>|</span>
                    <span>期限: {issue.dueDate}</span>
                  </div>
                </div>
                <Badge variant={issue.status === 'in_progress' ? 'info' : issue.status === 'resolved' ? 'success' : 'warning'}>
                  {issueStatusLabel(issue.status)}
                </Badge>
              </div>
            ))}
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
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-4">
                {auditEvents.map((event, i) => (
                  <div key={i} className="relative flex gap-4 pl-6">
                    {/* Dot */}
                    <div className={`absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-white dark:border-aegis-dark ${eventTypeColors[event.type] || 'bg-gray-400'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {event.description}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{event.actor}</span>
                        <span>|</span>
                        <span>{event.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
