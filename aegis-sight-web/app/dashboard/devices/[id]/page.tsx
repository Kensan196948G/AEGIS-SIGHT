'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { fetchDevice, fetchDeviceSoftware } from '@/lib/api';
import type { BackendDevice, BackendSoftwareInventory } from '@/lib/api';

type UIStatus = 'active' | 'inactive' | 'maintenance';

const statusConfig: Record<UIStatus, { label: string; variant: 'success' | 'danger' | 'warning' | 'info'; dot: string }> = {
  active:      { label: 'アクティブ',    variant: 'success', dot: 'bg-green-500' },
  inactive:    { label: 'オフライン',     variant: 'danger',  dot: 'bg-gray-400' },
  maintenance: { label: 'メンテナンス',   variant: 'info',    dot: 'bg-blue-500' },
};

function formatDatetime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return iso.split('T')[0] ?? '—';
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className={`mt-0.5 font-medium text-gray-900 dark:text-white ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '—'}
      </dd>
    </div>
  );
}

export function getDeviceStatusDotColor(status: string): string {
  return status === 'active' ? 'bg-green-500' :
    status === 'maintenance' ? 'bg-blue-500' :
    'bg-gray-400';
}

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [device, setDevice] = useState<BackendDevice | null>(null);
  const [software, setSoftware] = useState<BackendSoftwareInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    async function load() {
      try {
        const [dev, sw] = await Promise.all([
          fetchDevice(id),
          fetchDeviceSoftware(id).catch(() => ({ items: [] as BackendSoftwareInventory[], total: 0, offset: 0, limit: 100, has_more: false })),
        ]);
        if (!mounted) return;
        setDevice(dev);
        setSoftware(sw.items);
      } catch {
        if (mounted) setNotFound(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-10 w-72 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="aegis-card h-48 bg-gray-100 dark:bg-gray-800" />
            <div className="aegis-card h-32 bg-gray-100 dark:bg-gray-800" />
          </div>
          <div className="aegis-card h-48 bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  if (notFound || !device) {
    return (
      <div className="space-y-4">
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/dashboard/devices" className="hover:text-primary-600 transition-colors">デバイス管理</Link>
          <span>/</span>
          <span>デバイス詳細</span>
        </nav>
        <div className="aegis-card text-center py-16">
          <p className="text-gray-500 dark:text-gray-400">デバイスが見つかりませんでした。</p>
          <Link href="/dashboard/devices" className="mt-4 inline-block text-sm text-primary-600 hover:underline">
            一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  const st = statusConfig[device.status as UIStatus] ?? statusConfig.inactive;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/dashboard/devices" className="hover:text-primary-600 transition-colors">
          デバイス管理
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white">{device.hostname}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`h-3 w-3 rounded-full ${st.dot}`} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{device.hostname}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {device.os_version ?? '—'}{device.domain ? ` / ${device.domain}` : ''}
            </p>
          </div>
          <Badge variant={st.variant}>{st.label}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Device Info + Software */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Info */}
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">基本情報</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <InfoRow label="ホスト名"    value={device.hostname} />
              <InfoRow label="OS バージョン" value={device.os_version ?? '—'} />
              <InfoRow label="IPアドレス"  value={device.ip_address ?? '—'} mono />
              <InfoRow label="MACアドレス" value={device.mac_address ?? '—'} mono />
              <InfoRow label="ドメイン"    value={device.domain ?? '—'} />
              <InfoRow label="デバイスID"  value={String(device.id)} mono />
              <InfoRow label="最終確認"    value={formatDatetime(device.last_seen)} />
              <InfoRow label="登録日"      value={formatDate(device.created_at)} />
            </dl>
          </div>

          {/* Installed Software */}
          <div className="aegis-card overflow-hidden p-0">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                インストール済みソフトウェア
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({software.length} 件)
                </span>
              </h2>
            </div>
            {software.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400">
                ソフトウェア情報がありません
              </p>
            ) : (
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
                        発行元
                      </th>
                      <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        インストール日
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
                    {software.map((sw) => (
                      <tr key={sw.id} className="hover:bg-gray-50/50 dark:hover:bg-aegis-dark/30">
                        <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {sw.software_name}
                        </td>
                        <td className="px-6 py-3 font-mono text-sm text-gray-600 dark:text-gray-400">
                          {sw.version ?? '—'}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {sw.publisher ?? '—'}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {sw.install_date ? formatDate(sw.install_date) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="space-y-6">
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
