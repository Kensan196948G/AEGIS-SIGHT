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
// Dummy data fallbacks (shown when API returns empty results)
// ---------------------------------------------------------------------------

const DUMMY_SUMMARY: BackendDLPEventSummary = {
  total_events: 342,
  blocked: 87,
  alerted: 193,
  logged: 62,
  by_severity: { critical: 23, high: 64, medium: 148, low: 107 },
  by_rule_type: { file_extension: 189, path_pattern: 78, content_keyword: 55, size_limit: 20 },
};

const DUMMY_RULES: BackendDLPRule[] = [
  {
    id: 'dr-001',
    name: '機密ファイル拡張子制限',
    description: 'xlsx, pptx, pdf などの機密情報を含む可能性があるファイルの外部送信を監視',
    rule_type: 'file_extension',
    pattern: '.xlsx,.pptx,.pdf,.docx',
    action: 'block',
    severity: 'critical',
    is_enabled: true,
    created_at: '2026-01-10T09:00:00Z',
  },
  {
    id: 'dr-002',
    name: 'マイナンバー検知',
    description: '12桁のマイナンバーを含むファイルのコピーおよびアップロードをブロック',
    rule_type: 'content_keyword',
    pattern: 'マイナンバー,個人番号,mynumber',
    action: 'block',
    severity: 'critical',
    is_enabled: true,
    created_at: '2026-01-12T10:30:00Z',
  },
  {
    id: 'dr-003',
    name: '個人情報キーワード検知',
    description: '氏名・住所・電話番号などの個人情報キーワードを含むドキュメントを検出',
    rule_type: 'content_keyword',
    pattern: '氏名,住所,生年月日,電話番号,メールアドレス',
    action: 'alert',
    severity: 'high',
    is_enabled: true,
    created_at: '2026-01-15T08:00:00Z',
  },
  {
    id: 'dr-004',
    name: '100MB超えファイル転送制限',
    description: '100MB以上の大容量ファイルの外部転送を検出しアラートを発報',
    rule_type: 'size_limit',
    pattern: '104857600',
    action: 'alert',
    severity: 'medium',
    is_enabled: true,
    created_at: '2026-01-20T11:00:00Z',
  },
  {
    id: 'dr-005',
    name: 'Cドライブユーザーフォルダ監視',
    description: 'C:\\Users\\ 配下のファイルへのアクセスを記録',
    rule_type: 'path_pattern',
    pattern: 'C:\\Users\\*',
    action: 'log',
    severity: 'low',
    is_enabled: true,
    created_at: '2026-01-22T14:00:00Z',
  },
  {
    id: 'dr-006',
    name: '実行ファイルブロック',
    description: '.exe, .msi, .bat などの実行ファイルの持ち込みを禁止',
    rule_type: 'file_extension',
    pattern: '.exe,.msi,.bat,.ps1,.vbs',
    action: 'block',
    severity: 'high',
    is_enabled: true,
    created_at: '2026-02-01T09:00:00Z',
  },
  {
    id: 'dr-007',
    name: '外部ストレージパス検出',
    description: 'USBや外部ドライブへの書き込みを検出（D:\\, E:\\, F:\\）',
    rule_type: 'path_pattern',
    pattern: 'D:\\*,E:\\*,F:\\*',
    action: 'alert',
    severity: 'high',
    is_enabled: true,
    created_at: '2026-02-05T10:00:00Z',
  },
  {
    id: 'dr-008',
    name: '財務・経理キーワード監視',
    description: '売上・予算・決算などの財務情報を含むファイルのアクセスをログ記録',
    rule_type: 'content_keyword',
    pattern: '売上,予算,決算,損益,貸借対照表',
    action: 'log',
    severity: 'medium',
    is_enabled: true,
    created_at: '2026-02-10T09:30:00Z',
  },
  {
    id: 'dr-009',
    name: '圧縮ファイル制限',
    description: 'zip, 7z, tar.gz などの圧縮ファイルによる情報持ち出しを監視',
    rule_type: 'file_extension',
    pattern: '.zip,.7z,.tar,.gz,.rar',
    action: 'alert',
    severity: 'medium',
    is_enabled: false,
    created_at: '2026-02-15T11:00:00Z',
  },
  {
    id: 'dr-010',
    name: '500MB超え大容量ファイル監視',
    description: '500MB以上の大容量ファイルはブロックして管理者承認を要求',
    rule_type: 'size_limit',
    pattern: '524288000',
    action: 'block',
    severity: 'high',
    is_enabled: true,
    created_at: '2026-02-20T15:00:00Z',
  },
];

const DUMMY_EVENTS: BackendDLPEvent[] = [
  {
    id: 'de-001',
    rule_id: 'dr-001',
    device_id: 'dev-win-001',
    user_name: 'yamamoto.kenji',
    file_path: 'C:\\Users\\yamamoto\\Desktop\\Q1_売上予測.xlsx',
    file_name: 'Q1_売上予測.xlsx',
    file_size: 2457600,
    action_taken: 'blocked',
    matched_pattern: '.xlsx',
    detected_at: '2026-05-07T08:32:14Z',
  },
  {
    id: 'de-002',
    rule_id: 'dr-002',
    device_id: 'dev-win-003',
    user_name: 'tanaka.hiroshi',
    file_path: 'C:\\Users\\tanaka\\Documents\\社員名簿_2026.docx',
    file_name: '社員名簿_2026.docx',
    file_size: 512000,
    action_taken: 'blocked',
    matched_pattern: '個人番号',
    detected_at: '2026-05-07T09:15:42Z',
  },
  {
    id: 'de-003',
    rule_id: 'dr-003',
    device_id: 'dev-win-007',
    user_name: 'sato.yuki',
    file_path: 'C:\\Users\\sato\\Downloads\\顧客リスト_東京.pdf',
    file_name: '顧客リスト_東京.pdf',
    file_size: 1048576,
    action_taken: 'alerted',
    matched_pattern: '氏名,住所',
    detected_at: '2026-05-07T09:48:03Z',
  },
  {
    id: 'de-004',
    rule_id: 'dr-004',
    device_id: 'dev-win-012',
    user_name: 'watanabe.tomoko',
    file_path: 'C:\\Users\\watanabe\\Desktop\\製品仕様書_最終版.pptx',
    file_name: '製品仕様書_最終版.pptx',
    file_size: 157286400,
    action_taken: 'alerted',
    matched_pattern: '104857600',
    detected_at: '2026-05-07T10:05:27Z',
  },
  {
    id: 'de-005',
    rule_id: 'dr-006',
    device_id: 'dev-win-002',
    user_name: 'ito.masaru',
    file_path: 'D:\\install\\setup_tool.exe',
    file_name: 'setup_tool.exe',
    file_size: 8388608,
    action_taken: 'blocked',
    matched_pattern: '.exe',
    detected_at: '2026-05-07T10:22:55Z',
  },
  {
    id: 'de-006',
    rule_id: 'dr-007',
    device_id: 'dev-win-009',
    user_name: 'nakamura.akiko',
    file_path: 'E:\\backup\\人事評価_2025年度.xlsx',
    file_name: '人事評価_2025年度.xlsx',
    file_size: 983040,
    action_taken: 'alerted',
    matched_pattern: 'E:\\*',
    detected_at: '2026-05-07T11:03:18Z',
  },
  {
    id: 'de-007',
    rule_id: 'dr-008',
    device_id: 'dev-win-005',
    user_name: 'kobayashi.ryo',
    file_path: 'C:\\Users\\kobayashi\\Documents\\FY2026_損益計算書.pdf',
    file_name: 'FY2026_損益計算書.pdf',
    file_size: 716800,
    action_taken: 'logged',
    matched_pattern: '損益,決算',
    detected_at: '2026-05-07T11:45:30Z',
  },
  {
    id: 'de-008',
    rule_id: 'dr-001',
    device_id: 'dev-win-014',
    user_name: 'kato.shinichi',
    file_path: 'C:\\Users\\kato\\Desktop\\取引先_契約書一覧.xlsx',
    file_name: '取引先_契約書一覧.xlsx',
    file_size: 3145728,
    action_taken: 'blocked',
    matched_pattern: '.xlsx',
    detected_at: '2026-05-07T12:10:44Z',
  },
  {
    id: 'de-009',
    rule_id: 'dr-009',
    device_id: 'dev-win-006',
    user_name: 'yoshida.mami',
    file_path: 'C:\\Users\\yoshida\\Downloads\\プロジェクト資料一式.zip',
    file_name: 'プロジェクト資料一式.zip',
    file_size: 52428800,
    action_taken: 'alerted',
    matched_pattern: '.zip',
    detected_at: '2026-05-07T13:02:11Z',
  },
  {
    id: 'de-010',
    rule_id: 'dr-005',
    device_id: 'dev-win-011',
    user_name: 'hayashi.takuya',
    file_path: 'C:\\Users\\hayashi\\AppData\\Local\\Temp\\export_data.csv',
    file_name: 'export_data.csv',
    file_size: 204800,
    action_taken: 'logged',
    matched_pattern: 'C:\\Users\\*',
    detected_at: '2026-05-07T13:28:59Z',
  },
  {
    id: 'de-011',
    rule_id: 'dr-002',
    device_id: 'dev-win-008',
    user_name: 'inoue.keiko',
    file_path: 'C:\\Users\\inoue\\Documents\\従業員マイナンバー管理台帳.xlsx',
    file_name: '従業員マイナンバー管理台帳.xlsx',
    file_size: 1310720,
    action_taken: 'blocked',
    matched_pattern: 'マイナンバー',
    detected_at: '2026-05-07T14:05:22Z',
  },
  {
    id: 'de-012',
    rule_id: 'dr-010',
    device_id: 'dev-win-004',
    user_name: 'kimura.daisuke',
    file_path: 'C:\\Users\\kimura\\Desktop\\設計図面_製品A_フルセット.zip',
    file_name: '設計図面_製品A_フルセット.zip',
    file_size: 629145600,
    action_taken: 'blocked',
    matched_pattern: '524288000',
    detected_at: '2026-05-07T14:33:47Z',
  },
  {
    id: 'de-013',
    rule_id: 'dr-003',
    device_id: 'dev-win-015',
    user_name: 'matsumoto.eri',
    file_path: 'C:\\Users\\matsumoto\\Downloads\\新規会員申込書_5月分.pdf',
    file_name: '新規会員申込書_5月分.pdf',
    file_size: 409600,
    action_taken: 'alerted',
    matched_pattern: '氏名,電話番号,生年月日',
    detected_at: '2026-05-07T15:12:05Z',
  },
  {
    id: 'de-014',
    rule_id: 'dr-006',
    device_id: 'dev-win-010',
    user_name: 'ogawa.tatsuya',
    file_path: 'E:\\tools\\remote_access.bat',
    file_name: 'remote_access.bat',
    file_size: 4096,
    action_taken: 'blocked',
    matched_pattern: '.bat',
    detected_at: '2026-05-07T15:55:38Z',
  },
  {
    id: 'de-015',
    rule_id: 'dr-008',
    device_id: 'dev-win-013',
    user_name: 'fujiwara.naomi',
    file_path: 'C:\\Users\\fujiwara\\Documents\\2026年度_予算計画書.pptx',
    file_name: '2026年度_予算計画書.pptx',
    file_size: 5242880,
    action_taken: 'alerted',
    matched_pattern: '予算,売上',
    detected_at: '2026-05-07T16:30:19Z',
  },
];

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
      setSummary(summaryData.total_events > 0 ? summaryData : DUMMY_SUMMARY);
      setEvents(eventsData.items.length > 0 ? eventsData.items : DUMMY_EVENTS);
      setRules(rulesData.items.length > 0 ? rulesData.items : DUMMY_RULES);
    } catch (err) {
      console.error('DLP data fetch error:', err);
      setSummary(DUMMY_SUMMARY);
      setEvents(DUMMY_EVENTS);
      setRules(DUMMY_RULES);
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
