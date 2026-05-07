'use client';

import { Badge } from '@/components/ui/badge';
import { useCallback, useEffect, useState } from 'react';
import {
  BackendAlert,
  BackendAlertStats,
  acknowledgeAlert,
  fetchAlertStats,
  fetchAlerts,
  resolveAlert,
} from '@/lib/api';

type SeverityFilter = 'all' | 'critical' | 'warning' | 'info';

export default function MonitoringPage() {
  const [stats, setStats] = useState<BackendAlertStats | null>(null);
  const [alerts, setAlerts] = useState<BackendAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, alertsRes] = await Promise.all([
        fetchAlertStats(),
        fetchAlerts(0, 100),
      ]);
      setStats(statsRes);
      setAlerts(alertsRes.items);
    } catch {
      setStats(null);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAcknowledge = async (alertId: string) => {
    setActionLoading(alertId + '-ack');
    try {
      await acknowledgeAlert(alertId);
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (alertId: string) => {
    setActionLoading(alertId + '-res');
    try {
      await resolveAlert(alertId);
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  const severityConfig = (severity: BackendAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return { label: '重大', className: 'bg-red-100 text-red-700 border-red-200' };
      case 'warning':
        return { label: '警告', className: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'info':
        return { label: '情報', className: 'bg-blue-100 text-blue-700 border-blue-200' };
    }
  };

  const formatDate = (s: string) => new Date(s).toLocaleString('ja-JP');

  const filteredAlerts =
    severityFilter === 'all' ? alerts : alerts.filter((a) => a.severity === severityFilter);

  const filterButtons: { value: SeverityFilter; label: string }[] = [
    { value: 'all', label: 'すべて' },
    { value: 'critical', label: '重大' },
    { value: 'warning', label: '警告' },
    { value: 'info', label: '情報' },
  ];

  const statCards = stats
    ? [
        { label: '総アラート', value: stats.total, color: 'text-gray-900' },
        { label: '重大', value: stats.critical, color: 'text-red-600' },
        { label: '警告', value: stats.warning, color: 'text-amber-600' },
        { label: '情報', value: stats.info, color: 'text-blue-600' },
        { label: '未承認', value: stats.unacknowledged, color: 'text-orange-600' },
        { label: '未解決', value: stats.unresolved, color: 'text-purple-600' },
      ]
    : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">アラート監視</h1>
        <p className="text-sm text-gray-500 mt-1">システム全体のアラートを管理します</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-200 p-5">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </>
        ) : !stats ? (
          <div className="col-span-6 flex items-center justify-center h-32 text-gray-400">
            データなし
          </div>
        ) : (
          statCards.map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))
        )}
      </div>

      {/* Alerts table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-semibold text-gray-900">アラート一覧</h2>
          <div className="flex gap-2">
            {filterButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => setSeverityFilter(btn.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  severityFilter === btn.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="animate-pulse space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded" />
            ))}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400">データなし</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">重要度</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">タイトル</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">カテゴリ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">デバイスID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">承認状態</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">発生日時</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => {
                  const sc = severityConfig(alert.severity);
                  const isAckLoading = actionLoading === alert.id + '-ack';
                  const isResLoading = actionLoading === alert.id + '-res';
                  return (
                    <tr key={alert.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Badge className={sc.className}>{sc.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{alert.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{alert.category}</td>
                      <td className="px-4 py-3 text-sm font-mono">{alert.device_id ?? '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        {alert.is_acknowledged ? (
                          <span className="text-green-600 font-medium">承認済み</span>
                        ) : (
                          <span className="text-orange-600 font-medium">未承認</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(alert.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {!alert.is_acknowledged && (
                            <button
                              onClick={() => handleAcknowledge(alert.id)}
                              disabled={isAckLoading}
                              className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50 transition-colors"
                            >
                              {isAckLoading ? '処理中...' : '承認'}
                            </button>
                          )}
                          {!alert.resolved_at && (
                            <button
                              onClick={() => handleResolve(alert.id)}
                              disabled={isResLoading}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 transition-colors"
                            >
                              {isResLoading ? '処理中...' : '解決'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
