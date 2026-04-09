'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

type DeviceStatus = 'online' | 'offline' | 'warning' | 'maintenance';

interface DeviceDetail {
  id: string;
  hostname: string;
  os_type: string;
  os_version: string;
  ip_address: string;
  mac_address: string;
  department: string;
  status: DeviceStatus;
  last_seen: string;
  assigned_user: string;
  serial_number: string;
  manufacturer: string;
  model: string;
  cpu: string;
  memory_gb: number;
  disk_total_gb: number;
  disk_free_gb: number;
  registered_at: string;
  last_patch_applied: string;
}

interface InstalledSoftware {
  name: string;
  version: string;
  installed_at: string;
}

interface RecentEvent {
  timestamp: string;
  type: 'logon' | 'logoff' | 'alert' | 'patch' | 'config_change';
  description: string;
}

const demoDevice: DeviceDetail = {
  id: 'd001',
  hostname: 'PC-TANAKA-001',
  os_type: 'Windows',
  os_version: 'Windows 11 Pro 23H2 (Build 22631)',
  ip_address: '192.168.1.101',
  mac_address: '00:1A:2B:3C:4D:5E',
  department: 'エンジニアリング',
  status: 'online',
  last_seen: '2026-04-02 14:30',
  assigned_user: '田中 一郎',
  serial_number: 'SN-2024-001234',
  manufacturer: 'Dell',
  model: 'OptiPlex 7090',
  cpu: 'Intel Core i7-11700 @ 2.50GHz',
  memory_gb: 16,
  disk_total_gb: 512,
  disk_free_gb: 234,
  registered_at: '2024-03-15',
  last_patch_applied: '2026-03-28',
};

const demoSoftware: InstalledSoftware[] = [
  { name: 'Microsoft Office 365', version: '16.0.17425', installed_at: '2024-03-15' },
  { name: 'Google Chrome', version: '123.0.6312.87', installed_at: '2026-03-20' },
  { name: 'Visual Studio Code', version: '1.87.2', installed_at: '2026-02-10' },
  { name: 'Slack', version: '4.36.140', installed_at: '2024-04-01' },
  { name: 'Zoom', version: '5.17.7', installed_at: '2026-01-15' },
];

const demoEvents: RecentEvent[] = [
  { timestamp: '2026-04-02 14:30', type: 'logon', description: '田中 一郎 がログオン' },
  { timestamp: '2026-04-02 09:00', type: 'logon', description: '田中 一郎 がログオン' },
  { timestamp: '2026-04-01 18:35', type: 'logoff', description: '田中 一郎 がログオフ' },
  { timestamp: '2026-03-28 22:00', type: 'patch', description: 'Windows Update KB5035853 適用完了' },
  { timestamp: '2026-03-25 10:15', type: 'alert', description: 'ディスク使用率 80% 超過アラート' },
];

const statusConfig: Record<DeviceStatus, { label: string; variant: 'success' | 'danger' | 'warning' | 'info' }> = {
  online: { label: 'オンライン', variant: 'success' },
  offline: { label: 'オフライン', variant: 'danger' },
  warning: { label: '要注意', variant: 'warning' },
  maintenance: { label: 'メンテナンス', variant: 'info' },
};

const eventTypeConfig: Record<RecentEvent['type'], { label: string; color: string }> = {
  logon: { label: 'ログオン', color: 'text-green-600 dark:text-green-400' },
  logoff: { label: 'ログオフ', color: 'text-gray-500 dark:text-gray-400' },
  alert: { label: 'アラート', color: 'text-red-600 dark:text-red-400' },
  patch: { label: 'パッチ', color: 'text-blue-600 dark:text-blue-400' },
  config_change: { label: '設定変更', color: 'text-yellow-600 dark:text-yellow-400' },
};

export function getDeviceStatusDotColor(status: string): string {
  return status === 'online' ? 'bg-green-500' :
    status === 'warning' ? 'bg-yellow-500' :
    status === 'maintenance' ? 'bg-blue-500' :
    'bg-gray-400';
}

export function getDiskBarColor(pct: number): string {
  return pct >= 80 ? 'bg-red-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-green-500';
}

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const device = demoDevice; // 実際にはAPIからid でfetch
  const status = statusConfig[device.status];
  const diskUsedPct = Math.round(((device.disk_total_gb - device.disk_free_gb) / device.disk_total_gb) * 100);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/dashboard/devices" className="hover:text-aegis-blue transition-colors">
          デバイス管理
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white">{device.hostname}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`h-3 w-3 rounded-full ${getDeviceStatusDotColor(device.status)}`} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{device.hostname}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {device.manufacturer} {device.model} / {device.department}
            </p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <div className="flex gap-3">
          <button className="aegis-btn-secondary">
            パッチ適用
          </button>
          <button className="aegis-btn-secondary">
            リモート接続
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Device Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Info */}
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">基本情報</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                { label: 'ホスト名', value: device.hostname },
                { label: 'シリアル番号', value: device.serial_number },
                { label: 'OS', value: device.os_version },
                { label: 'IPアドレス', value: device.ip_address, mono: true },
                { label: 'MACアドレス', value: device.mac_address, mono: true },
                { label: '担当ユーザー', value: device.assigned_user },
                { label: '部門', value: device.department },
                { label: '登録日', value: device.registered_at },
                { label: '最終確認', value: device.last_seen },
                { label: '最終パッチ', value: device.last_patch_applied },
              ].map(({ label, value, mono }) => (
                <div key={label}>
                  <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
                  <dd className={`mt-0.5 font-medium text-gray-900 dark:text-white ${mono ? 'font-mono' : ''}`}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Hardware Info */}
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">ハードウェア</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">CPU</p>
                <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{device.cpu}</p>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">メモリ</span>
                  <span className="font-medium text-gray-900 dark:text-white">{device.memory_gb} GB</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">ディスク使用率</span>
                  <span className={`font-medium ${diskUsedPct >= 80 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                    {diskUsedPct}% ({device.disk_total_gb - device.disk_free_gb} / {device.disk_total_gb} GB)
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-2 rounded-full transition-all ${getDiskBarColor(diskUsedPct)}`}
                    style={{ width: `${diskUsedPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Installed Software */}
          <div className="aegis-card overflow-hidden p-0">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                インストール済みソフトウェア
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-aegis-dark/50">
                    <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      ソフトウェア名
                    </th>
                    <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      バージョン
                    </th>
                    <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      インストール日
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
                  {demoSoftware.map((sw) => (
                    <tr key={sw.name} className="hover:bg-gray-50/50 dark:hover:bg-aegis-dark/30">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">{sw.name}</td>
                      <td className="px-6 py-3 font-mono text-sm text-gray-600 dark:text-gray-400">{sw.version}</td>
                      <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">{sw.installed_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Events */}
        <div className="space-y-6">
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">最近のイベント</h2>
            <ol className="space-y-3">
              {demoEvents.map((event, i) => {
                const cfg = eventTypeConfig[event.type];
                return (
                  <li key={i} className="flex gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      <span className={`text-xs font-semibold ${cfg.color}`}>[{cfg.label}]</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">{event.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{event.timestamp}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Quick Actions */}
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">クイックアクション</h2>
            <div className="space-y-2">
              {[
                '監視詳細を見る',
                'パッチ履歴',
                'セキュリティスキャン',
                'ログ一覧',
                '関連アラート',
              ].map((action) => (
                <button
                  key={action}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-aegis-border dark:text-gray-300 dark:hover:bg-aegis-dark/50"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
