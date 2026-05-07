'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart } from '@/components/ui/chart';
import {
  fetchIncidentStats,
  fetchIncidents,
  createIncident,
  fetchThreatIndicators,
} from '@/lib/api';
import type {
  BackendIncidentStats,
  BackendIncidentResponse,
  BackendThreatIndicator,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Severity = 'P1_critical' | 'P2_high' | 'P3_medium' | 'P4_low';
type Status = 'detected' | 'investigating' | 'containing' | 'eradicating' | 'recovering' | 'resolved' | 'post_mortem';
type Category = 'malware' | 'unauthorized_access' | 'data_breach' | 'policy_violation' | 'hardware_failure' | 'other';
type IndicatorType = 'ip_address' | 'domain' | 'file_hash' | 'url' | 'email';
type ThreatLevel = 'critical' | 'high' | 'medium' | 'low';
type TabKey = 'list' | 'create' | 'threats';

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
// Dummy data (shown when API returns empty or errors)
// ---------------------------------------------------------------------------
const DUMMY_INCIDENT_STATS: BackendIncidentStats = {
  total: 10,
  p1_critical: 1,
  p2_high: 3,
  p3_medium: 4,
  p4_low: 2,
  open_incidents: 6,
  resolved_incidents: 4,
  mttr_hours: 4.2,
};

const DUMMY_INCIDENTS: BackendIncidentResponse[] = [
  {
    id: 'inc-0001',
    title: 'ランサムウェア感染疑い（PC-FIN-007）',
    description: '財務部門端末でランサムウェア活動を示すプロセスが検出された。感染拡大防止のため即時ネットワーク隔離を実施。',
    severity: 'P1_critical',
    status: 'containing',
    category: 'malware',
    affected_devices: ['dev-aabb1100-0001'],
    assigned_to: 'suzuki.taro',
    reported_by: 'yamamoto.kenji',
    timeline: [
      { event: 'EDRアラート発砲', timestamp: '2026-05-01T03:12:00Z', details: 'Defender for Endpoint が疑わしいプロセスを検出' },
      { event: 'SOCチーム初動調査開始', timestamp: '2026-05-01T03:25:00Z', details: '担当者がリモートで調査開始' },
      { event: 'ネットワーク隔離実施', timestamp: '2026-05-01T03:40:00Z', details: '端末を企業LANから切断し封じ込め' },
    ],
    root_cause: null,
    resolution: null,
    lessons_learned: null,
    detected_at: '2026-05-01T03:12:00Z',
    resolved_at: null,
    created_at: '2026-05-01T03:12:00Z',
  },
  {
    id: 'inc-0002',
    title: '不正SSH接続（SRV-DB-01）',
    description: '深夜帯に海外IPアドレスからSSHによる不正ログインが複数回試みられた。Fail2banが自動遮断したが調査を継続中。',
    severity: 'P2_high',
    status: 'investigating',
    category: 'unauthorized_access',
    affected_devices: ['dev-ccdd2200-0002'],
    assigned_to: 'tanaka.hiroshi',
    reported_by: 'ops-monitoring',
    timeline: [
      { event: '不正ログイン試行検出', timestamp: '2026-05-02T23:14:00Z', details: '198.51.100.42 から SSH ブルートフォース攻撃' },
      { event: 'Fail2ban 自動遮断', timestamp: '2026-05-02T23:14:30Z', details: '発信元IPをファイアウォールでブロック' },
    ],
    root_cause: null,
    resolution: null,
    lessons_learned: null,
    detected_at: '2026-05-02T23:14:00Z',
    resolved_at: null,
    created_at: '2026-05-02T23:14:00Z',
  },
  {
    id: 'inc-0003',
    title: '機密ファイル外部送信疑い（DLP検知）',
    description: 'DLPポリシーにより、個人情報を含む可能性のあるファイルが外部メールに添付されようとした行為を検出・ブロック。',
    severity: 'P2_high',
    status: 'post_mortem',
    category: 'data_breach',
    affected_devices: null,
    assigned_to: 'ito.keiko',
    reported_by: 'dlp-system',
    timeline: [
      { event: 'DLPシステムが送信をブロック', timestamp: '2026-04-28T14:05:00Z', details: '顧客情報含有ファイルの外部送信を自動遮断' },
      { event: '当事者ヒアリング実施', timestamp: '2026-04-29T10:00:00Z', details: '誤送信であることを確認、教育対応実施' },
    ],
    root_cause: 'セキュリティ意識の不足による誤操作。送信先の確認不足。',
    resolution: 'DLPポリシーにより送信前にブロック済み。当該ユーザーにセキュリティ再教育を実施。',
    lessons_learned: 'DLPポリシーの有効性を確認。全社員向けセキュリティ研修を四半期実施に変更。',
    detected_at: '2026-04-28T14:05:00Z',
    resolved_at: '2026-04-30T17:00:00Z',
    created_at: '2026-04-28T14:05:00Z',
  },
  {
    id: 'inc-0004',
    title: 'USBストレージ無断持ち込み（PC-HR-015）',
    description: '人事部端末にてポリシー未承認のUSBストレージが接続された。データコピーの有無を調査中。',
    severity: 'P2_high',
    status: 'investigating',
    category: 'policy_violation',
    affected_devices: ['dev-eeff3300-0003'],
    assigned_to: 'nakamura.ryota',
    reported_by: 'endpoint-agent',
    timeline: [
      { event: 'USB接続をエージェントが検知', timestamp: '2026-05-03T09:48:00Z', details: 'エンドポイントエージェントがデバイス接続を記録' },
      { event: '管理者にアラート通知', timestamp: '2026-05-03T09:49:00Z', details: '自動アラートをIT管理部門に送信' },
    ],
    root_cause: null,
    resolution: null,
    lessons_learned: null,
    detected_at: '2026-05-03T09:48:00Z',
    resolved_at: null,
    created_at: '2026-05-03T09:48:00Z',
  },
  {
    id: 'inc-0005',
    title: 'SRV-APP-02 HDDクラッシュ',
    description: 'アプリケーションサーバーのHDDがRAID障害を検知。冗長性は維持されているが交換が必要。',
    severity: 'P2_high',
    status: 'recovering',
    category: 'hardware_failure',
    affected_devices: ['dev-aabb4400-0004'],
    assigned_to: 'watanabe.yuki',
    reported_by: 'hardware-monitor',
    timeline: [
      { event: 'RAID障害アラート発砲', timestamp: '2026-05-04T07:30:00Z', details: 'RAID-5 アレイの1ドライブで読み取りエラー' },
      { event: '予備ドライブへの再構築開始', timestamp: '2026-05-04T08:00:00Z', details: '自動フェイルオーバーが起動' },
    ],
    root_cause: '経年劣化によるHDD故障（稼働5年超）',
    resolution: '予備ドライブへのRAID再構築中。翌営業日に物理ドライブ交換予定。',
    lessons_learned: null,
    detected_at: '2026-05-04T07:30:00Z',
    resolved_at: null,
    created_at: '2026-05-04T07:30:00Z',
  },
  {
    id: 'inc-0006',
    title: 'VPN認証情報漏洩疑い',
    description: 'ダークウェブモニタリングにより、社内VPNの認証情報と思われる情報が検出された。',
    severity: 'P3_medium',
    status: 'eradicating',
    category: 'unauthorized_access',
    affected_devices: null,
    assigned_to: 'suzuki.taro',
    reported_by: 'threat-intel-feed',
    timeline: [
      { event: '脅威インテリジェンスが検知', timestamp: '2026-05-01T18:00:00Z', details: 'ダークウェブフォーラムへの投稿を検出' },
      { event: '影響範囲調査開始', timestamp: '2026-05-01T18:30:00Z', details: '対象アカウントのリセット対応開始' },
    ],
    root_cause: 'フィッシングメール経由と推定',
    resolution: null,
    lessons_learned: null,
    detected_at: '2026-05-01T18:00:00Z',
    resolved_at: null,
    created_at: '2026-05-01T18:00:00Z',
  },
  {
    id: 'inc-0007',
    title: 'Webアプリケーションへの不審なリクエスト',
    description: 'Webアプリケーションファイアウォールが複数のSQLインジェクション試行を検出しブロックした。',
    severity: 'P3_medium',
    status: 'resolved',
    category: 'unauthorized_access',
    affected_devices: null,
    assigned_to: 'kobayashi.emi',
    reported_by: 'waf-system',
    timeline: [
      { event: 'WAFがSQLiを検出・ブロック', timestamp: '2026-04-25T22:10:00Z' },
      { event: 'ログ分析完了', timestamp: '2026-04-26T10:00:00Z', details: '実害なし。WAFが正常に防御' },
    ],
    root_cause: '外部からの自動スキャンツールによる探索',
    resolution: 'WAFが自動的にブロック。発信元IPをブロックリストに追加。実害なし。',
    lessons_learned: 'WAFの定義ファイルを最新化するサイクルを週次に変更。',
    detected_at: '2026-04-25T22:10:00Z',
    resolved_at: '2026-04-26T17:00:00Z',
    created_at: '2026-04-25T22:10:00Z',
  },
  {
    id: 'inc-0008',
    title: 'スパムメール大量受信（マルウェア添付）',
    description: '複数社員宛てにマルウェア添付スパムが大量送信された。メールゲートウェイが自動隔離。',
    severity: 'P3_medium',
    status: 'resolved',
    category: 'malware',
    affected_devices: null,
    assigned_to: 'hayashi.akiko',
    reported_by: 'email-gateway',
    timeline: [
      { event: 'メールゲートウェイが隔離', timestamp: '2026-04-22T08:30:00Z', details: '47通の添付ファイルを自動隔離' },
      { event: '全社通達完了', timestamp: '2026-04-22T10:00:00Z', details: 'フィッシング注意喚起メールを配信' },
    ],
    root_cause: 'フィッシングキャンペーンによる組織的攻撃',
    resolution: 'メールゲートウェイが全数隔離。社員への注意喚起を実施。',
    lessons_learned: 'メールゲートウェイのサンドボックス機能が有効に機能。定期的な訓練実施を継続。',
    detected_at: '2026-04-22T08:30:00Z',
    resolved_at: '2026-04-22T17:00:00Z',
    created_at: '2026-04-22T08:30:00Z',
  },
  {
    id: 'inc-0009',
    title: 'PrintSpooler脆弱性（CVE-2021-34527）対応',
    description: 'PrintNightmare脆弱性の影響を受ける可能性のある端末を特定。パッチ未適用端末への緊急展開を実施。',
    severity: 'P4_low',
    status: 'resolved',
    category: 'other',
    affected_devices: ['dev-ccdd5500-0005', 'dev-eeff6600-0006'],
    assigned_to: 'yoshida.masato',
    reported_by: 'vulnerability-scanner',
    timeline: [
      { event: '脆弱性スキャン実施', timestamp: '2026-04-15T09:00:00Z', details: '未適用端末12台を特定' },
      { event: '緊急パッチ展開完了', timestamp: '2026-04-16T18:00:00Z', details: '全対象端末へのパッチ適用完了' },
    ],
    root_cause: 'パッチ管理サイクルの遅延',
    resolution: '対象全端末へのパッチ適用完了。自動パッチ適用設定を強化。',
    lessons_learned: 'Critical脆弱性は48時間以内の対応を義務化するポリシーを策定。',
    detected_at: '2026-04-15T09:00:00Z',
    resolved_at: '2026-04-16T18:00:00Z',
    created_at: '2026-04-15T09:00:00Z',
  },
  {
    id: 'inc-0010',
    title: '共有フォルダ権限設定ミス（全社公開）',
    description: '経理部門の共有フォルダが誤って全社員閲覧可能に設定変更されていることを発見。速やかに権限修正。',
    severity: 'P4_low',
    status: 'resolved',
    category: 'policy_violation',
    affected_devices: null,
    assigned_to: 'sato.naoko',
    reported_by: 'ito.keiko',
    timeline: [
      { event: '内部監査で設定ミスを検出', timestamp: '2026-04-10T14:00:00Z' },
      { event: 'アクセス権限を修正', timestamp: '2026-04-10T14:30:00Z', details: '経理部門のみアクセス可能に修正' },
    ],
    root_cause: '管理者の操作ミス（権限設定変更時の確認不足）',
    resolution: '権限設定を適切な状態に修正。アクセスログを調査し不正アクセスがないことを確認。',
    lessons_learned: '権限変更操作の承認フロー（2名確認）を義務付けるプロセスを導入。',
    detected_at: '2026-04-10T14:00:00Z',
    resolved_at: '2026-04-10T18:00:00Z',
    created_at: '2026-04-10T14:00:00Z',
  },
];

const DUMMY_THREATS: BackendThreatIndicator[] = [
  { id: 'ti-0001', indicator_type: 'ip_address', value: '198.51.100.42', threat_level: 'high', source: 'AbuseIPDB', description: 'SSHブルートフォース攻撃の発信元', is_active: true, first_seen: '2026-05-02T23:14:00Z', last_seen: '2026-05-04T11:00:00Z', related_incidents: ['inc-0002'] },
  { id: 'ti-0002', indicator_type: 'domain', value: 'malware-c2.example.net', threat_level: 'critical', source: 'Threat Intel Feed', description: 'ランサムウェアC2サーバードメイン', is_active: true, first_seen: '2026-04-30T00:00:00Z', last_seen: '2026-05-05T06:00:00Z', related_incidents: ['inc-0001'] },
  { id: 'ti-0003', indicator_type: 'file_hash', value: 'a3f5b2c1d4e6f7a8b9c0d1e2f3a4b5c6', threat_level: 'critical', source: 'VirusTotal', description: 'ランサムウェア本体のMD5ハッシュ', is_active: true, first_seen: '2026-05-01T03:12:00Z', last_seen: '2026-05-01T03:12:00Z', related_incidents: ['inc-0001'] },
  { id: 'ti-0004', indicator_type: 'ip_address', value: '203.0.113.88', threat_level: 'medium', source: 'Internal SOC', description: 'フィッシングメールの送信元IP', is_active: false, first_seen: '2026-04-22T08:00:00Z', last_seen: '2026-04-22T09:00:00Z', related_incidents: ['inc-0008'] },
  { id: 'ti-0005', indicator_type: 'url', value: 'https://phish.example.com/login', threat_level: 'high', source: 'PhishTank', description: 'フィッシングサイトURL', is_active: false, first_seen: '2026-04-20T00:00:00Z', last_seen: '2026-04-23T00:00:00Z', related_incidents: ['inc-0008'] },
  { id: 'ti-0006', indicator_type: 'email', value: 'noreply@malicious-domain.xyz', threat_level: 'medium', source: 'Internal SOC', description: 'スパムキャンペーンの送信元アドレス', is_active: false, first_seen: '2026-04-22T08:00:00Z', last_seen: '2026-04-22T10:00:00Z', related_incidents: ['inc-0008'] },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function IncidentsPage() {
  const [stats, setStats] = useState<BackendIncidentStats | null>(null);
  const [incidents, setIncidents] = useState<BackendIncidentResponse[]>([]);
  const [threats, setThreats] = useState<BackendThreatIndicator[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<TabKey>('list');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [selectedIncident, setSelectedIncident] = useState<BackendIncidentResponse | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSeverity, setFormSeverity] = useState<Severity>('P3_medium');
  const [formCategory, setFormCategory] = useState<Category>('other');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, incPage, threatPage] = await Promise.all([
        fetchIncidentStats(),
        fetchIncidents(0, 100),
        fetchThreatIndicators(0, 100),
      ]);
      // Use dummy data when API returns empty results
      const hasStats = statsData.total > 0;
      setStats(hasStats ? statsData : DUMMY_INCIDENT_STATS);
      setIncidents((incPage.items || []).length > 0 ? incPage.items : DUMMY_INCIDENTS);
      setThreats((threatPage.items || []).length > 0 ? threatPage.items : DUMMY_THREATS);
    } catch {
      // Fallback to dummy data on error
      setStats(DUMMY_INCIDENT_STATS);
      setIncidents(DUMMY_INCIDENTS);
      setThreats(DUMMY_THREATS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const resolvedRate = stats
    ? Math.round((stats.resolved_incidents / (stats.total || 1)) * 100)
    : 0;
  const resolvedRateColor = resolvedRate >= 80 ? '#10b981' : resolvedRate >= 60 ? '#f59e0b' : '#ef4444';
  const severityBarData = [
    { label: 'P1 重大', value: stats?.p1_critical ?? 0, color: 'bg-red-500'    },
    { label: 'P2 高',   value: stats?.p2_high ?? 0,     color: 'bg-orange-500' },
    { label: 'P3 中',   value: stats?.p3_medium ?? 0,   color: 'bg-amber-500'  },
    { label: 'P4 低',   value: stats?.p4_low ?? 0,      color: 'bg-blue-400'   },
  ];

  const filtered = incidents.filter((inc) => {
    if (severityFilter !== 'all' && inc.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && inc.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && inc.category !== categoryFilter) return false;
    return true;
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const handleCreate = async () => {
    if (!formTitle.trim() || !formDescription.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createIncident({
        title: formTitle,
        description: formDescription,
        severity: formSeverity,
        category: formCategory,
        detected_at: new Date().toISOString(),
      });
      setFormTitle('');
      setFormDescription('');
      setActiveTab('list');
      await loadAll();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '作成に失敗しました');
    } finally {
      setCreating(false);
    }
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
        {loading ? (
          <div className="h-44 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">解決率</p>
              <DonutChart value={resolvedRate} max={100} size={140} strokeWidth={14} color={resolvedRateColor} label={`${resolvedRate}%`} />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                全 {stats?.total ?? 0} 件中 {stats?.resolved_incidents ?? 0} 件解決済
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">重要度別件数</p>
              <BarChart data={severityBarData} maxValue={Math.max(stats?.total ?? 1, 1)} height={160} showValues />
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aegis-card h-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
          <div className="aegis-card text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total ?? 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">合計</p>
          </div>
          <div className="aegis-card text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats?.p1_critical ?? 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">P1 重大</p>
          </div>
          <div className="aegis-card text-center">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats?.p2_high ?? 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">P2 高</p>
          </div>
          <div className="aegis-card text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats?.p3_medium ?? 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">P3 中</p>
          </div>
          <div className="aegis-card text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.p4_low ?? 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">P4 低</p>
          </div>
          <div className="aegis-card text-center">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats?.open_incidents ?? 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">未解決</p>
          </div>
          <div className="aegis-card text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.resolved_incidents ?? 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">解決済み</p>
          </div>
          <div className="aegis-card text-center">
            <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
              {stats?.mttr_hours != null ? `${stats.mttr_hours}h` : '—'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">MTTR</p>
          </div>
        </div>
      )}

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
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse border-b border-gray-100 dark:border-aegis-border/50">
                        {[...Array(6)].map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        該当するインシデントがありません
                      </td>
                    </tr>
                  ) : (
                    filtered.map((inc) => (
                      <tr
                        key={inc.id}
                        onClick={() => setSelectedIncident(inc)}
                        className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-aegis-border/50 dark:hover:bg-aegis-surface"
                      >
                        <td className="px-4 py-3">
                          <Badge variant={severityVariant[inc.severity as Severity] ?? 'default'} dot>
                            {severityLabel[inc.severity as Severity] ?? inc.severity}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{inc.title}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {categoryLabel[inc.category as Category] ?? inc.category}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusVariant[inc.status as Status] ?? 'default'}>
                            {statusLabel[inc.status as Status] ?? inc.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {inc.affected_devices ? inc.affected_devices.length : 0}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(inc.detected_at)}</td>
                      </tr>
                    ))
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
                <Badge variant={severityVariant[selectedIncident.severity as Severity] ?? 'default'} dot size="md">
                  {severityLabel[selectedIncident.severity as Severity] ?? selectedIncident.severity}
                </Badge>
                <Badge variant={statusVariant[selectedIncident.status as Status] ?? 'default'} size="md">
                  {statusLabel[selectedIncident.status as Status] ?? selectedIncident.status}
                </Badge>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">カテゴリ</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {categoryLabel[selectedIncident.category as Category] ?? selectedIncident.category}
                </p>
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
          {selectedIncident.timeline && selectedIncident.timeline.length > 0 && (
            <div className="aegis-card">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">タイムライン</h3>
              <div className="relative space-y-0">
                {selectedIncident.timeline.map((entry, idx) => {
                  const event = (entry['event'] as string) ?? '';
                  const timestamp = (entry['timestamp'] as string) ?? '';
                  const details = entry['details'] as string | undefined;
                  return (
                    <div key={idx} className="relative flex gap-4 pb-6 last:pb-0">
                      {idx < (selectedIncident.timeline?.length ?? 0) - 1 && (
                        <div className="absolute left-[7px] top-4 h-full w-0.5 bg-gray-200 dark:bg-aegis-border" />
                      )}
                      <div className="relative z-10 mt-1.5 h-4 w-4 flex-shrink-0 rounded-full border-2 border-primary-500 bg-white dark:bg-aegis-darker" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{event}</p>
                        {details && (
                          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{details}</p>
                        )}
                        {timestamp && (
                          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{formatDate(timestamp)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
                <select value={formSeverity} onChange={(e) => setFormSeverity(e.target.value as Severity)} className={inputClasses}>
                  <option value="P1_critical">P1 - 重大</option>
                  <option value="P2_high">P2 - 高</option>
                  <option value="P3_medium">P3 - 中</option>
                  <option value="P4_low">P4 - 低</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">カテゴリ</label>
                <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as Category)} className={inputClasses}>
                  <option value="malware">マルウェア</option>
                  <option value="unauthorized_access">不正アクセス</option>
                  <option value="data_breach">データ漏洩</option>
                  <option value="policy_violation">ポリシー違反</option>
                  <option value="hardware_failure">ハードウェア障害</option>
                  <option value="other">その他</option>
                </select>
              </div>
            </div>
            {createError && (
              <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>
            )}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleCreate}
                disabled={creating || !formTitle.trim() || !formDescription.trim()}
                className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? '作成中...' : 'インシデントを作成'}
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
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="animate-pulse border-b border-gray-100 dark:border-aegis-border/50">
                      {[...Array(7)].map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : threats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      脅威インジケーターなし
                    </td>
                  </tr>
                ) : (
                  threats.map((threat) => (
                    <tr key={threat.id} className="border-b border-gray-100 dark:border-aegis-border/50">
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        {indicatorTypeLabel[threat.indicator_type as IndicatorType] ?? threat.indicator_type}
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-800 dark:bg-aegis-surface dark:text-gray-300">
                          {threat.value}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={threatLevelVariant[threat.threat_level as ThreatLevel] ?? 'default'} dot>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
