'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart } from '@/components/ui/chart';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Severity = 'P1_critical' | 'P2_high' | 'P3_medium' | 'P4_low';
type Status = 'detected' | 'investigating' | 'containing' | 'eradicating' | 'recovering' | 'resolved' | 'post_mortem';
type Category = 'malware' | 'unauthorized_access' | 'data_breach' | 'policy_violation' | 'hardware_failure' | 'other';
type IndicatorType = 'ip_address' | 'domain' | 'file_hash' | 'url' | 'email';
type ThreatLevel = 'critical' | 'high' | 'medium' | 'low';

interface TimelineEvent {
  timestamp: string;
  event: string;
  user?: string;
  details?: string;
}

interface IncidentItem {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: Status;
  category: Category;
  affected_devices: string[] | null;
  assigned_to: string | null;
  reported_by: string;
  timeline: TimelineEvent[];
  root_cause: string | null;
  resolution: string | null;
  detected_at: string;
  resolved_at: string | null;
  created_at: string;
}

interface ThreatIndicatorItem {
  id: string;
  indicator_type: IndicatorType;
  value: string;
  threat_level: ThreatLevel;
  source: string;
  description: string;
  is_active: boolean;
  first_seen: string;
  last_seen: string;
}

// ---------------------------------------------------------------------------
// Labels & styling maps
// ---------------------------------------------------------------------------
const severityVariant: Record<Severity, 'danger' | 'warning' | 'info' | 'default'> = {
  P1_critical: 'danger',
  P2_high: 'warning',
  P3_medium: 'info',
  P4_low: 'default',
};
const severityLabel: Record<Severity, string> = {
  P1_critical: 'P1 - 重大',
  P2_high: 'P2 - 高',
  P3_medium: 'P3 - 中',
  P4_low: 'P4 - 低',
};
const statusVariant: Record<Status, 'danger' | 'warning' | 'info' | 'success' | 'purple' | 'default'> = {
  detected: 'danger',
  investigating: 'warning',
  containing: 'warning',
  eradicating: 'info',
  recovering: 'info',
  resolved: 'success',
  post_mortem: 'purple',
};
const statusLabel: Record<Status, string> = {
  detected: '検出',
  investigating: '調査中',
  containing: '封じ込め',
  eradicating: '根絶',
  recovering: '復旧中',
  resolved: '解決済み',
  post_mortem: '事後分析',
};
const categoryLabel: Record<Category, string> = {
  malware: 'マルウェア',
  unauthorized_access: '不正アクセス',
  data_breach: 'データ漏洩',
  policy_violation: 'ポリシー違反',
  hardware_failure: 'ハードウェア障害',
  other: 'その他',
};
const threatLevelVariant: Record<ThreatLevel, 'danger' | 'warning' | 'info' | 'default'> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};
const indicatorTypeLabel: Record<IndicatorType, string> = {
  ip_address: 'IPアドレス',
  domain: 'ドメイン',
  file_hash: 'ファイルハッシュ',
  url: 'URL',
  email: 'メール',
};

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------
const demoIncidents: IncidentItem[] = [
  {
    id: '1',
    title: 'ランサムウェア感染検知',
    description: '経理部端末でランサムウェアの挙動を検出。ファイル暗号化の試行を確認。',
    severity: 'P1_critical',
    status: 'containing',
    category: 'malware',
    affected_devices: ['PC-ACCT-001', 'PC-ACCT-002'],
    assigned_to: 'user-001',
    reported_by: 'user-002',
    timeline: [
      { timestamp: '2026-03-27T14:00:00Z', event: 'インシデント作成', user: 'user-002' },
      { timestamp: '2026-03-27T14:05:00Z', event: 'ステータス変更: 調査中', user: 'user-001' },
      { timestamp: '2026-03-27T14:30:00Z', event: 'ステータス変更: 封じ込め', user: 'user-001', details: '対象端末をネットワークから隔離' },
    ],
    root_cause: null,
    resolution: null,
    detected_at: '2026-03-27T13:55:00Z',
    resolved_at: null,
    created_at: '2026-03-27T14:00:00Z',
  },
  {
    id: '2',
    title: '外部からの不正アクセス試行',
    description: 'VPNゲートウェイに対する複数回のブルートフォース攻撃を検出。',
    severity: 'P2_high',
    status: 'investigating',
    category: 'unauthorized_access',
    affected_devices: ['VPN-GW-01'],
    assigned_to: 'user-003',
    reported_by: 'user-001',
    timeline: [
      { timestamp: '2026-03-27T12:00:00Z', event: 'インシデント作成', user: 'user-001' },
      { timestamp: '2026-03-27T12:15:00Z', event: '担当者割当: user-003', user: 'user-001' },
    ],
    root_cause: null,
    resolution: null,
    detected_at: '2026-03-27T11:50:00Z',
    resolved_at: null,
    created_at: '2026-03-27T12:00:00Z',
  },
  {
    id: '3',
    title: '機密データの外部送信検知',
    description: 'DLPシステムが社外メールアドレスへの機密ファイル送信を検出。',
    severity: 'P2_high',
    status: 'resolved',
    category: 'data_breach',
    affected_devices: ['PC-SALES-015'],
    assigned_to: 'user-001',
    reported_by: 'user-004',
    timeline: [
      { timestamp: '2026-03-26T09:00:00Z', event: 'インシデント作成', user: 'user-004' },
      { timestamp: '2026-03-26T09:30:00Z', event: 'ステータス変更: 調査中', user: 'user-001' },
      { timestamp: '2026-03-26T11:00:00Z', event: 'ステータス変更: 解決済み', user: 'user-001', details: '誤送信と確認。データ回収完了。' },
    ],
    root_cause: '従業員の誤操作による機密ファイルの外部送信',
    resolution: '送信先に削除を要請し確認。DLPルールを強化。',
    detected_at: '2026-03-26T08:45:00Z',
    resolved_at: '2026-03-26T11:00:00Z',
    created_at: '2026-03-26T09:00:00Z',
  },
  {
    id: '4',
    title: 'USB使用ポリシー違反',
    description: '未許可USBデバイスの接続を複数端末で検出。',
    severity: 'P3_medium',
    status: 'resolved',
    category: 'policy_violation',
    affected_devices: ['PC-DEV-003', 'PC-DEV-007', 'PC-DEV-012'],
    assigned_to: 'user-005',
    reported_by: 'user-001',
    timeline: [
      { timestamp: '2026-03-25T10:00:00Z', event: 'インシデント作成', user: 'user-001' },
      { timestamp: '2026-03-25T14:00:00Z', event: 'ステータス変更: 解決済み', user: 'user-005', details: '対象者への教育実施完了' },
    ],
    root_cause: 'セキュリティ意識の不足',
    resolution: '対象者へのセキュリティ教育を実施。ポリシー再周知。',
    detected_at: '2026-03-25T09:30:00Z',
    resolved_at: '2026-03-25T14:00:00Z',
    created_at: '2026-03-25T10:00:00Z',
  },
  {
    id: '5',
    title: 'サーバーディスク障害',
    description: 'ファイルサーバーのRAIDアレイでディスク障害を検出。',
    severity: 'P4_low',
    status: 'post_mortem',
    category: 'hardware_failure',
    affected_devices: ['SRV-FILE-01'],
    assigned_to: 'user-006',
    reported_by: 'user-006',
    timeline: [
      { timestamp: '2026-03-24T08:00:00Z', event: 'インシデント作成', user: 'user-006' },
      { timestamp: '2026-03-24T10:00:00Z', event: 'ディスク交換完了', user: 'user-006' },
      { timestamp: '2026-03-24T16:00:00Z', event: 'RAID再構築完了', user: 'user-006' },
    ],
    root_cause: 'ディスクの経年劣化',
    resolution: 'ディスク交換とRAID再構築を実施',
    detected_at: '2026-03-24T07:45:00Z',
    resolved_at: '2026-03-24T16:00:00Z',
    created_at: '2026-03-24T08:00:00Z',
  },
];

const demoThreats: ThreatIndicatorItem[] = [
  {
    id: '1',
    indicator_type: 'ip_address',
    value: '203.0.113.42',
    threat_level: 'critical',
    source: 'SIEM',
    description: '既知のC2サーバーIPアドレス',
    is_active: true,
    first_seen: '2026-03-27T10:00:00Z',
    last_seen: '2026-03-27T14:30:00Z',
  },
  {
    id: '2',
    indicator_type: 'domain',
    value: 'malicious-update.example.com',
    threat_level: 'high',
    source: '外部脅威インテリジェンス',
    description: 'マルウェア配布ドメイン',
    is_active: true,
    first_seen: '2026-03-26T08:00:00Z',
    last_seen: '2026-03-27T12:00:00Z',
  },
  {
    id: '3',
    indicator_type: 'file_hash',
    value: 'a1b2c3d4e5f6789012345678abcdef01',
    threat_level: 'high',
    source: 'VirusTotal',
    description: 'ランサムウェア検体のMD5ハッシュ',
    is_active: true,
    first_seen: '2026-03-27T13:55:00Z',
    last_seen: '2026-03-27T14:00:00Z',
  },
  {
    id: '4',
    indicator_type: 'email',
    value: 'phishing@fake-bank.example.com',
    threat_level: 'medium',
    source: 'メールゲートウェイ',
    description: 'フィッシングメール送信元',
    is_active: false,
    first_seen: '2026-03-20T09:00:00Z',
    last_seen: '2026-03-22T11:00:00Z',
  },
];

const demoStats = {
  total: 23,
  p1_critical: 3,
  p2_high: 7,
  p3_medium: 8,
  p4_low: 5,
  open_incidents: 9,
  resolved_incidents: 14,
  mttr_hours: 4.5,
};

// ---------------------------------------------------------------------------
// Tab type
// ---------------------------------------------------------------------------
type TabKey = 'list' | 'create' | 'threats';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function IncidentsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('list');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSeverity, setFormSeverity] = useState<Severity>('P3_medium');
  const [formCategory, setFormCategory] = useState<Category>('other');

  const resolvedRate = Math.round((demoStats.resolved_incidents / demoStats.total) * 100);
  const resolvedRateColor = resolvedRate >= 80 ? '#10b981' : resolvedRate >= 60 ? '#f59e0b' : '#ef4444';
  const severityBarData = [
    { label: 'P1 重大', value: demoStats.p1_critical, color: 'bg-red-500'    },
    { label: 'P2 高',   value: demoStats.p2_high,     color: 'bg-orange-500' },
    { label: 'P3 中',   value: demoStats.p3_medium,   color: 'bg-amber-500'  },
    { label: 'P4 低',   value: demoStats.p4_low,      color: 'bg-blue-400'   },
  ];

  const filtered = demoIncidents.filter((inc) => {
    if (severityFilter !== 'all' && inc.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && inc.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && inc.category !== categoryFilter) return false;
    return true;
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const handleCreate = () => {
    alert(`インシデント作成: ${formTitle}\n重要度: ${severityLabel[formSeverity]}\nカテゴリ: ${categoryLabel[formCategory]}`);
    setFormTitle('');
    setFormDescription('');
    setActiveTab('list');
  };

  const selectClasses = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-aegis-border dark:bg-aegis-surface dark:text-gray-300';
  const inputClasses = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-aegis-border dark:bg-aegis-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          インシデント管理
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          セキュリティインシデントの検出・対応・管理とフォレンジック
        </p>
      </div>

      {/* Incident Overview Charts */}
      <div className="aegis-card">
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">インシデント概要</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">解決率</p>
            <DonutChart value={resolvedRate} max={100} size={140} strokeWidth={14} color={resolvedRateColor} label={`${resolvedRate}%`} />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              全 {demoStats.total} 件中 {demoStats.resolved_incidents} 件解決済
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">重要度別件数</p>
            <BarChart data={severityBarData} maxValue={demoStats.total} height={160} showValues />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{demoStats.total}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">合計</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{demoStats.p1_critical}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">P1 重大</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{demoStats.p2_high}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">P2 高</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{demoStats.p3_medium}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">P3 中</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{demoStats.p4_low}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">P4 低</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{demoStats.open_incidents}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">未解決</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{demoStats.resolved_incidents}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">解決済み</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{demoStats.mttr_hours}h</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">MTTR</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-aegis-border">
        <nav className="-mb-px flex gap-4">
          {([
            { key: 'list' as TabKey, label: 'インシデント一覧' },
            { key: 'create' as TabKey, label: '新規作成' },
            { key: 'threats' as TabKey, label: '脅威インジケーター' },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setSelectedIncident(null); setActiveTab(tab.key); }}
              className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Incident List */}
      {activeTab === 'list' && !selectedIncident && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as Severity | 'all')} className={selectClasses}>
              <option value="all">全重要度</option>
              <option value="P1_critical">P1 - 重大</option>
              <option value="P2_high">P2 - 高</option>
              <option value="P3_medium">P3 - 中</option>
              <option value="P4_low">P4 - 低</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as Status | 'all')} className={selectClasses}>
              <option value="all">全ステータス</option>
              <option value="detected">検出</option>
              <option value="investigating">調査中</option>
              <option value="containing">封じ込め</option>
              <option value="eradicating">根絶</option>
              <option value="recovering">復旧中</option>
              <option value="resolved">解決済み</option>
              <option value="post_mortem">事後分析</option>
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as Category | 'all')} className={selectClasses}>
              <option value="all">全カテゴリ</option>
              <option value="malware">マルウェア</option>
              <option value="unauthorized_access">不正アクセス</option>
              <option value="data_breach">データ漏洩</option>
              <option value="policy_violation">ポリシー違反</option>
              <option value="hardware_failure">ハードウェア障害</option>
              <option value="other">その他</option>
            </select>
          </div>

          {/* Incident Table */}
          <div className="aegis-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-aegis-border">
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">重要度</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">タイトル</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">カテゴリ</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">ステータス</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">影響端末</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">検出日時</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inc) => (
                    <tr
                      key={inc.id}
                      onClick={() => setSelectedIncident(inc)}
                      className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-aegis-border/50 dark:hover:bg-aegis-surface"
                    >
                      <td className="px-4 py-3">
                        <Badge variant={severityVariant[inc.severity]} dot>{severityLabel[inc.severity]}</Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{inc.title}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{categoryLabel[inc.category]}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[inc.status]}>{statusLabel[inc.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {inc.affected_devices ? inc.affected_devices.length : 0}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(inc.detected_at)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        該当するインシデントがありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Incident Detail / Timeline */}
      {activeTab === 'list' && selectedIncident && (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedIncident(null)}
            className="text-sm text-primary-600 hover:underline dark:text-primary-400"
          >
            &larr; 一覧に戻る
          </button>

          <div className="aegis-card space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedIncident.title}</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{selectedIncident.description}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant={severityVariant[selectedIncident.severity]} dot size="md">
                  {severityLabel[selectedIncident.severity]}
                </Badge>
                <Badge variant={statusVariant[selectedIncident.status]} size="md">
                  {statusLabel[selectedIncident.status]}
                </Badge>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">カテゴリ</p>
                <p className="text-sm text-gray-900 dark:text-white">{categoryLabel[selectedIncident.category]}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">影響端末</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedIncident.affected_devices?.join(', ') || 'なし'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">検出日時</p>
                <p className="text-sm text-gray-900 dark:text-white">{formatDate(selectedIncident.detected_at)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">解決日時</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedIncident.resolved_at ? formatDate(selectedIncident.resolved_at) : '未解決'}
                </p>
              </div>
            </div>

            {(selectedIncident.root_cause || selectedIncident.resolution) && (
              <div className="border-t border-gray-200 pt-4 dark:border-aegis-border">
                {selectedIncident.root_cause && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">根本原因</p>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedIncident.root_cause}</p>
                  </div>
                )}
                {selectedIncident.resolution && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">解決策</p>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedIncident.resolution}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="aegis-card">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">タイムライン</h3>
            <div className="relative space-y-0">
              {selectedIncident.timeline.map((entry, idx) => (
                <div key={idx} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* Vertical line */}
                  {idx < selectedIncident.timeline.length - 1 && (
                    <div className="absolute left-[7px] top-4 h-full w-0.5 bg-gray-200 dark:bg-aegis-border" />
                  )}
                  {/* Dot */}
                  <div className="relative z-10 mt-1.5 h-4 w-4 flex-shrink-0 rounded-full border-2 border-primary-500 bg-white dark:bg-aegis-darker" />
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.event}</p>
                    {entry.details && (
                      <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{entry.details}</p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{formatDate(entry.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Create Incident */}
      {activeTab === 'create' && (
        <div className="aegis-card max-w-2xl space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">新規インシデント作成</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">タイトル</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="インシデントのタイトルを入力"
                className={inputClasses}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">説明</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="インシデントの詳細を入力"
                rows={4}
                className={inputClasses}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">重要度</label>
                <select value={formSeverity} onChange={(e) => setFormSeverity(e.target.value as Severity)} className={`${inputClasses}`}>
                  <option value="P1_critical">P1 - 重大</option>
                  <option value="P2_high">P2 - 高</option>
                  <option value="P3_medium">P3 - 中</option>
                  <option value="P4_low">P4 - 低</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">カテゴリ</label>
                <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as Category)} className={`${inputClasses}`}>
                  <option value="malware">マルウェア</option>
                  <option value="unauthorized_access">不正アクセス</option>
                  <option value="data_breach">データ漏洩</option>
                  <option value="policy_violation">ポリシー違反</option>
                  <option value="hardware_failure">ハードウェア障害</option>
                  <option value="other">その他</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={handleCreate}
                disabled={!formTitle.trim() || !formDescription.trim()}
                className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                インシデントを作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Threat Indicators */}
      {activeTab === 'threats' && (
        <div className="aegis-card overflow-hidden">
          <h2 className="mb-4 px-4 pt-4 text-lg font-semibold text-gray-900 dark:text-white">脅威インジケーター</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-aegis-border">
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">種別</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">値</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">脅威レベル</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">ソース</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">説明</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">状態</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">最終検出</th>
                </tr>
              </thead>
              <tbody>
                {demoThreats.map((threat) => (
                  <tr
                    key={threat.id}
                    className="border-b border-gray-100 dark:border-aegis-border/50"
                  >
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{indicatorTypeLabel[threat.indicator_type]}</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-800 dark:bg-aegis-surface dark:text-gray-300">
                        {threat.value}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={threatLevelVariant[threat.threat_level]} dot>
                        {threat.threat_level.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{threat.source}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{threat.description}</td>
                    <td className="px-4 py-3">
                      <Badge variant={threat.is_active ? 'danger' : 'default'}>
                        {threat.is_active ? '有効' : '無効'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(threat.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
