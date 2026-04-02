'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

type AlertLevel = 'critical' | 'warning' | 'info';

interface MonitorEvent {
  id: string;
  time: string;
  level: AlertLevel;
  host: string;
  message: string;
}

interface ServiceStatus {
  name: string;
  host: string;
  status: 'healthy' | 'degraded' | 'down';
  uptime_pct: number;
  response_ms: number;
  last_checked: string;
}

const demoEvents: MonitorEvent[] = [
  { id: 'e001', time: '14:32', level: 'critical', host: 'srv-prod-03', message: 'CPU使用率が95%を超過' },
  { id: 'e002', time: '14:15', level: 'warning', host: 'db-replica-02', message: 'レプリケーション遅延 5秒' },
  { id: 'e003', time: '13:58', level: 'info', host: 'srv-web-01', message: 'デプロイ完了 v2.4.1' },
  { id: 'e004', time: '13:42', level: 'warning', host: 'storage-nas-01', message: 'ディスク使用率 85%' },
  { id: 'e005', time: '13:30', level: 'info', host: 'fw-edge-01', message: 'ファームウェア更新完了' },
  { id: 'e006', time: '13:10', level: 'critical', host: 'srv-app-02', message: 'メモリ不足エラー（OOM Killer 発動）' },
  { id: 'e007', time: '12:55', level: 'info', host: 'srv-web-02', message: 'SSL証明書自動更新完了' },
  { id: 'e008', time: '12:40', level: 'warning', host: 'switch-core-01', message: 'ポートエラーカウント増加' },
];

const demoServices: ServiceStatus[] = [
  { name: 'Web Frontend', host: 'srv-web-01', status: 'healthy', uptime_pct: 99.98, response_ms: 45, last_checked: '14:32:01' },
  { name: 'API Server', host: 'srv-api-01', status: 'healthy', uptime_pct: 99.95, response_ms: 120, last_checked: '14:32:05' },
  { name: 'Database (Primary)', host: 'db-primary-01', status: 'healthy', uptime_pct: 99.99, response_ms: 8, last_checked: '14:32:10' },
  { name: 'Database (Replica)', host: 'db-replica-02', status: 'degraded', uptime_pct: 98.20, response_ms: 380, last_checked: '14:31:50' },
  { name: 'Application Server', host: 'srv-app-02', status: 'down', uptime_pct: 95.10, response_ms: 0, last_checked: '14:30:00' },
  { name: 'File Storage', host: 'storage-nas-01', status: 'degraded', uptime_pct: 99.50, response_ms: 210, last_checked: '14:32:03' },
  { name: 'Monitoring (Prometheus)', host: 'mon-prom-01', status: 'healthy', uptime_pct: 100.0, response_ms: 22, last_checked: '14:32:08' },
  { name: 'Grafana Dashboard', host: 'mon-graf-01', status: 'healthy', uptime_pct: 99.90, response_ms: 95, last_checked: '14:32:06' },
];

const alertConfig: Record<AlertLevel, { label: string; variant: 'danger' | 'warning' | 'info'; dotColor: string }> = {
  critical: { label: '重大', variant: 'danger', dotColor: 'bg-red-500' },
  warning: { label: '警告', variant: 'warning', dotColor: 'bg-amber-500' },
  info: { label: '情報', variant: 'info', dotColor: 'bg-blue-500' },
};

const serviceStatusConfig: Record<ServiceStatus['status'], { label: string; variant: 'success' | 'warning' | 'danger'; dotColor: string }> = {
  healthy: { label: '正常', variant: 'success', dotColor: 'bg-green-500' },
  degraded: { label: '低下', variant: 'warning', dotColor: 'bg-amber-500' },
  down: { label: '停止', variant: 'danger', dotColor: 'bg-red-500' },
};

const stats = {
  healthy: demoServices.filter((s) => s.status === 'healthy').length,
  degraded: demoServices.filter((s) => s.status === 'degraded').length,
  down: demoServices.filter((s) => s.status === 'down').length,
  total: demoServices.length,
};

export default function MonitoringPage() {
  const [levelFilter, setLevelFilter] = useState<AlertLevel | 'all'>('all');

  const filteredEvents = demoEvents.filter(
    (e) => levelFilter === 'all' || e.level === levelFilter
  );

  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">監視ダッシュボード</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            システムとネットワークのリアルタイム監視
          </p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          最終更新: 14:32 JST
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="aegis-card text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.healthy}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">正常</p>
        </div>
        <div className="aegis-card text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <div className="h-3 w-3 rounded-full bg-amber-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.degraded}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">低下</p>
        </div>
        <div className="aegis-card text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <div className="h-3 w-3 rounded-full bg-red-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.down}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">停止中</p>
        </div>
        <div className="aegis-card text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">合計サービス</p>
        </div>
      </div>

      {/* Service Status Table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">サービス稼働状況</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">サービス</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ホスト</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">状態</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">稼働率</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">応答時間</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">最終確認</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {demoServices.map((svc) => {
                const cfg = serviceStatusConfig[svc.status];
                return (
                  <tr key={svc.host} className="transition-colors hover:bg-gray-50/70 dark:hover:bg-aegis-dark/40">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dotColor}`} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{svc.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 font-mono text-sm text-gray-600 dark:text-gray-400">{svc.host}</td>
                    <td className="px-6 py-3">
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-sm font-medium ${svc.uptime_pct >= 99.9 ? 'text-green-600 dark:text-green-400' : svc.uptime_pct >= 99.0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                        {svc.uptime_pct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-sm font-mono ${svc.response_ms === 0 ? 'text-gray-400' : svc.response_ms > 200 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {svc.response_ms === 0 ? '—' : `${svc.response_ms} ms`}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">{svc.last_checked}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grafana Embed / Placeholder */}
      <div className="aegis-card">
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
          システムメトリクス（Grafana）
        </h2>
        {grafanaUrl ? (
          <iframe
            src={grafanaUrl}
            className="h-96 w-full rounded-lg"
            frameBorder="0"
            title="Grafana Dashboard"
          />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:border-aegis-border dark:bg-aegis-dark">
            <div className="text-center">
              <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
              <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                Grafana ダッシュボード未接続
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                環境変数 <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">NEXT_PUBLIC_GRAFANA_URL</code> を設定してください
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Events */}
      <div className="aegis-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">最近のイベント</h2>
          <div className="flex gap-2">
            {(['all', 'critical', 'warning', 'info'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  levelFilter === lvl
                    ? 'bg-aegis-blue text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-aegis-dark dark:text-gray-400 dark:hover:bg-aegis-surface'
                }`}
              >
                {lvl === 'all' ? 'すべて' : alertConfig[lvl].label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {filteredEvents.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              該当するイベントがありません
            </p>
          ) : (
            filteredEvents.map((event) => {
              const cfg = alertConfig[event.level];
              return (
                <div key={event.id} className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${cfg.dotColor}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{event.host}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{event.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">{event.time}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
