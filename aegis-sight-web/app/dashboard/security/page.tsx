'use client';

import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart, ProgressBar } from '@/components/ui/chart';

const defenderStatus = {
  total: 1284,
  active: 1245,
  outdated: 28,
  disabled: 11,
};

const bitlockerStatus = {
  total: 1284,
  encrypted: 1198,
  inProgress: 32,
  notEncrypted: 54,
};

const patchStatus = {
  total: 1284,
  upToDate: 1105,
  pending: 132,
  failed: 47,
};

const vulnerabilities = [
  { id: 'CVE-2024-21338', severity: 'critical', title: 'Windows Kernel Elevation of Privilege', affected: 47, status: 'patching' },
  { id: 'CVE-2024-21412', severity: 'critical', title: 'Internet Shortcut SmartScreen Bypass', affected: 23, status: 'patching' },
  { id: 'CVE-2024-21351', severity: 'warning', title: 'Windows SmartScreen Security Feature Bypass', affected: 156, status: 'scheduled' },
  { id: 'CVE-2024-20677', severity: 'warning', title: 'Microsoft Office Remote Code Execution', affected: 312, status: 'scheduled' },
  { id: 'CVE-2024-20674', severity: 'info', title: 'Windows Kerberos Security Feature Bypass', affected: 14, status: 'resolved' },
];

const recentEvents = [
  { time: '15:42', type: 'threat', msg: 'マルウェア検出: Trojan:Win32/Emotet - PC-SALES-042', status: '隔離済' },
  { time: '14:18', type: 'policy', msg: 'BitLocker暗号化開始: PC-HR-015', status: '進行中' },
  { time: '13:55', type: 'patch', msg: 'KB5034763 適用失敗: SRV-APP-02', status: '要対応' },
  { time: '12:30', type: 'auth', msg: 'ブルートフォース検出: 5回の失敗ログイン - admin_ext', status: 'ブロック済' },
  { time: '11:15', type: 'patch', msg: '月次パッチ適用完了: 1,105台', status: '完了' },
];

const eventTypeStyles: Record<string, string> = {
  threat: 'bg-red-500',
  policy: 'bg-blue-500',
  patch: 'bg-amber-500',
  auth: 'bg-purple-500',
};

const statusVariants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'purple'> = {
  '隔離済': 'success',
  '進行中': 'info',
  '要対応': 'danger',
  'ブロック済': 'purple',
  '完了': 'success',
};

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            セキュリティ概要
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Defender、BitLocker、パッチ管理の統合ビュー
          </p>
        </div>
        <button className="aegis-btn-primary">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
          </svg>
          フルスキャン実行
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Defender */}
        <div className="aegis-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Microsoft Defender
            </h3>
            <Badge variant="success" dot>稼働中</Badge>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <DonutChart
              value={defenderStatus.active}
              max={defenderStatus.total}
              size={90}
              strokeWidth={8}
              color="#10b981"
              label="有効"
            />
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-gray-600 dark:text-gray-400">有効: {defenderStatus.active}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-gray-600 dark:text-gray-400">定義古い: {defenderStatus.outdated}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-gray-600 dark:text-gray-400">無効: {defenderStatus.disabled}</span>
              </div>
            </div>
          </div>
        </div>

        {/* BitLocker */}
        <div className="aegis-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              BitLocker暗号化
            </h3>
            <Badge variant="info" dot>93.3%</Badge>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <DonutChart
              value={bitlockerStatus.encrypted}
              max={bitlockerStatus.total}
              size={90}
              strokeWidth={8}
              color="#2563eb"
              label="暗号化"
            />
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary-500" />
                <span className="text-gray-600 dark:text-gray-400">暗号化済: {bitlockerStatus.encrypted}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-gray-600 dark:text-gray-400">暗号化中: {bitlockerStatus.inProgress}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-gray-600 dark:text-gray-400">未暗号化: {bitlockerStatus.notEncrypted}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Patch Status */}
        <div className="aegis-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              パッチ適用状況
            </h3>
            <Badge variant={patchStatus.failed > 0 ? 'warning' : 'success'} dot>
              {Math.round((patchStatus.upToDate / patchStatus.total) * 100)}%
            </Badge>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <DonutChart
              value={patchStatus.upToDate}
              max={patchStatus.total}
              size={90}
              strokeWidth={8}
              color="#f59e0b"
              label="最新"
            />
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-gray-600 dark:text-gray-400">最新: {patchStatus.upToDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-gray-600 dark:text-gray-400">適用待: {patchStatus.pending}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-gray-600 dark:text-gray-400">失敗: {patchStatus.failed}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Score */}
      <div className="aegis-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            セキュリティスコア
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">最終更新: 15分前</span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'エンドポイント保護', value: 97, max: 100 },
            { label: 'ディスク暗号化', value: 93, max: 100 },
            { label: 'パッチ適用率', value: 86, max: 100 },
            { label: '総合スコア', value: 92, max: 100 },
          ].map((metric) => (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{metric.value}%</span>
              </div>
              <ProgressBar value={metric.value} max={metric.max} color="auto" size="md" showLabel={false} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Vulnerabilities */}
        <div className="aegis-card overflow-hidden p-0">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              脆弱性一覧
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-aegis-border">
            {vulnerabilities.map((vuln) => (
              <div key={vuln.id} className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                <Badge
                  variant={
                    vuln.severity === 'critical' ? 'danger' :
                    vuln.severity === 'warning' ? 'warning' : 'info'
                  }
                  dot
                >
                  {vuln.severity === 'critical' ? '重大' : vuln.severity === 'warning' ? '警告' : '情報'}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {vuln.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {vuln.id} - {vuln.affected}台
                  </p>
                </div>
                <Badge
                  variant={
                    vuln.status === 'resolved' ? 'success' :
                    vuln.status === 'patching' ? 'info' : 'warning'
                  }
                >
                  {vuln.status === 'resolved' ? '解決済' :
                   vuln.status === 'patching' ? '適用中' : '予定'}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Events */}
        <div className="aegis-card overflow-hidden p-0">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              セキュリティイベント
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-aegis-border">
            {recentEvents.map((event, i) => (
              <div key={i} className="flex items-start gap-3 px-6 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${eventTypeStyles[event.type]}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">{event.msg}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={statusVariants[event.status] || 'default'}>
                      {event.status}
                    </Badge>
                    <span className="text-xs text-gray-400">{event.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* OS Distribution Chart */}
      <div className="aegis-card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          OS別端末分布
        </h2>
        <BarChart
          data={[
            { label: 'Win 11 23H2', value: 680 },
            { label: 'Win 11 22H2', value: 245 },
            { label: 'Win 10 22H2', value: 47 },
            { label: 'macOS 14', value: 156 },
            { label: 'macOS 13', value: 89 },
            { label: 'Ubuntu 22', value: 42 },
            { label: 'Other', value: 25 },
          ]}
          height={200}
        />
      </div>
    </div>
  );
}
