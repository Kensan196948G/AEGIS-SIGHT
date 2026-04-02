'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

type DeviceStatus = 'online' | 'offline' | 'warning' | 'maintenance';
type OsType = 'Windows' | 'macOS' | 'Linux' | 'Other';

interface Device {
  id: string;
  hostname: string;
  os_type: OsType;
  os_version: string;
  ip_address: string;
  department: string;
  status: DeviceStatus;
  last_seen: string;
  assigned_user: string;
}

const demoDevices: Device[] = [
  {
    id: 'd001',
    hostname: 'PC-TANAKA-001',
    os_type: 'Windows',
    os_version: 'Windows 11 Pro 23H2',
    ip_address: '192.168.1.101',
    department: 'エンジニアリング',
    status: 'online',
    last_seen: '2026-04-02 14:30',
    assigned_user: '田中 一郎',
  },
  {
    id: 'd002',
    hostname: 'PC-SATO-002',
    os_type: 'Windows',
    os_version: 'Windows 10 Pro 22H2',
    ip_address: '192.168.1.102',
    department: '営業',
    status: 'online',
    last_seen: '2026-04-02 14:25',
    assigned_user: '佐藤 花子',
  },
  {
    id: 'd003',
    hostname: 'MAC-YAMADA-001',
    os_type: 'macOS',
    os_version: 'macOS Sonoma 14.3',
    ip_address: '192.168.1.103',
    department: 'デザイン',
    status: 'online',
    last_seen: '2026-04-02 14:28',
    assigned_user: '山田 次郎',
  },
  {
    id: 'd004',
    hostname: 'SRV-WEB-001',
    os_type: 'Linux',
    os_version: 'Ubuntu 22.04 LTS',
    ip_address: '192.168.2.10',
    department: 'インフラ',
    status: 'online',
    last_seen: '2026-04-02 14:31',
    assigned_user: '（共有）',
  },
  {
    id: 'd005',
    hostname: 'PC-SUZUKI-003',
    os_type: 'Windows',
    os_version: 'Windows 11 Pro 23H2',
    ip_address: '192.168.1.105',
    department: '人事',
    status: 'offline',
    last_seen: '2026-04-01 18:10',
    assigned_user: '鈴木 三郎',
  },
  {
    id: 'd006',
    hostname: 'PC-ITO-004',
    os_type: 'Windows',
    os_version: 'Windows 10 Pro 22H2',
    ip_address: '192.168.1.106',
    department: '経理',
    status: 'warning',
    last_seen: '2026-04-02 13:45',
    assigned_user: '伊藤 四郎',
  },
  {
    id: 'd007',
    hostname: 'MAC-KOBAYASHI-002',
    os_type: 'macOS',
    os_version: 'macOS Ventura 13.6',
    ip_address: '192.168.1.107',
    department: 'エンジニアリング',
    status: 'warning',
    last_seen: '2026-04-02 12:00',
    assigned_user: '小林 五郎',
  },
  {
    id: 'd008',
    hostname: 'SRV-DB-001',
    os_type: 'Linux',
    os_version: 'CentOS Stream 9',
    ip_address: '192.168.2.20',
    department: 'インフラ',
    status: 'maintenance',
    last_seen: '2026-04-02 10:00',
    assigned_user: '（共有）',
  },
  {
    id: 'd009',
    hostname: 'PC-NAKAMURA-005',
    os_type: 'Windows',
    os_version: 'Windows 11 Pro 23H2',
    ip_address: '192.168.1.109',
    department: '営業',
    status: 'online',
    last_seen: '2026-04-02 14:15',
    assigned_user: '中村 六郎',
  },
  {
    id: 'd010',
    hostname: 'PC-KIMURA-006',
    os_type: 'Windows',
    os_version: 'Windows 10 Home 22H2',
    ip_address: '192.168.1.110',
    department: '総務',
    status: 'offline',
    last_seen: '2026-03-30 17:00',
    assigned_user: '木村 七子',
  },
];

const demoStats = {
  total: 1284,
  online: 1102,
  offline: 128,
  warning: 54,
};

const statusConfig: Record<DeviceStatus, { label: string; variant: 'success' | 'danger' | 'warning' | 'info' }> = {
  online: { label: 'オンライン', variant: 'success' },
  offline: { label: 'オフライン', variant: 'danger' },
  warning: { label: '要注意', variant: 'warning' },
  maintenance: { label: 'メンテナンス', variant: 'info' },
};

const osTypeOptions: Array<OsType | 'all'> = ['all', 'Windows', 'macOS', 'Linux', 'Other'];
const statusOptions: Array<DeviceStatus | 'all'> = ['all', 'online', 'offline', 'warning', 'maintenance'];
const departmentOptions = ['all', 'エンジニアリング', '営業', 'デザイン', 'インフラ', '人事', '経理', '総務'];

export default function DevicesPage() {
  const [search, setSearch] = useState('');
  const [osFilter, setOsFilter] = useState<OsType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  const filtered = demoDevices.filter((d) => {
    if (search && !d.hostname.toLowerCase().includes(search.toLowerCase()) && !d.ip_address.includes(search)) {
      return false;
    }
    if (osFilter !== 'all' && d.os_type !== osFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (departmentFilter !== 'all' && d.department !== departmentFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">デバイス管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            管理対象エンドポイントのステータス・詳細情報
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="aegis-btn-secondary">
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            CSVエクスポート
          </button>
          <button className="aegis-btn-primary">
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            デバイスを追加
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="aegis-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">合計</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {demoStats.total.toLocaleString()}
          </p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-green-600 dark:text-green-400">オンライン</p>
          <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
            {demoStats.online.toLocaleString()}
          </p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">オフライン</p>
          <p className="mt-2 text-3xl font-bold text-gray-500 dark:text-gray-400">
            {demoStats.offline.toLocaleString()}
          </p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-yellow-600 dark:text-yellow-400">要注意</p>
          <p className="mt-2 text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {demoStats.warning.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="aegis-card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="ホスト名・IPアドレスで検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="aegis-input w-full"
            />
          </div>
          <select
            value={osFilter}
            onChange={(e) => setOsFilter(e.target.value as OsType | 'all')}
            className="aegis-input w-auto"
          >
            {osTypeOptions.map((os) => (
              <option key={os} value={os}>
                {os === 'all' ? 'すべてのOS' : os}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DeviceStatus | 'all')}
            className="aegis-input w-auto"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'すべてのステータス' : statusConfig[s]?.label ?? s}
              </option>
            ))}
          </select>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="aegis-input w-auto"
          >
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>
                {dept === 'all' ? 'すべての部門' : dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Device Table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  ホスト名
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  OS
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  IPアドレス
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  担当ユーザー
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  部門
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  最終確認
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    条件に一致するデバイスがありません
                  </td>
                </tr>
              ) : (
                filtered.map((device) => {
                  const status = statusConfig[device.status];
                  return (
                    <tr
                      key={device.id}
                      className="transition-colors hover:bg-gray-50/70 dark:hover:bg-aegis-dark/40"
                    >
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/devices/${device.id}`} className="flex items-center gap-2 hover:underline">
                          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                            device.status === 'online' ? 'bg-green-500' :
                            device.status === 'warning' ? 'bg-yellow-500' :
                            device.status === 'maintenance' ? 'bg-blue-500' :
                            'bg-gray-400'
                          }`} />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {device.hostname}
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{device.os_type}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{device.os_version}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-gray-700 dark:text-gray-300">
                        {device.ip_address}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {device.assigned_user}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {device.department}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {device.last_seen}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-aegis-border">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            全 <span className="font-medium">{demoStats.total.toLocaleString()}</span> 件中{' '}
            <span className="font-medium">{filtered.length}</span> 件を表示（フィルター適用中）
          </p>
          <div className="flex gap-2">
            <button className="aegis-btn-secondary" disabled>前へ</button>
            <button className="aegis-btn-secondary">次へ</button>
          </div>
        </div>
      </div>
    </div>
  );
}
