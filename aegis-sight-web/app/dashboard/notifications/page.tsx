'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart } from '@/components/ui/chart';
import {
  fetchNotificationChannels,
  fetchNotificationRules,
  testNotificationChannel,
  deleteNotificationChannel,
  deleteNotificationRule,
  type BackendNotificationChannel,
  type BackendNotificationRule,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const channelTypeLabel: Record<string, string> = {
  email: 'Email',
  webhook: 'Webhook',
  slack: 'Slack',
  teams: 'Teams',
};

const channelTypeVariant: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
  email: 'info',
  webhook: 'success',
  slack: 'warning',
  teams: 'info',
};

// ---------------------------------------------------------------------------
// Dummy data (displayed when API returns empty or fails)
// ---------------------------------------------------------------------------

const DUMMY_CHANNELS: BackendNotificationChannel[] = [
  { id: 'ch-0001', name: 'Slack #it-alerts', channel_type: 'slack', config: { webhook_url: 'https://hooks.slack.com/services/EXAMPLE' }, is_enabled: true, created_by: 'yamamoto.kenji', created_at: '2026-03-01T09:00:00Z', updated_at: '2026-04-15T10:30:00Z' },
  { id: 'ch-0002', name: '管理者メール通知', channel_type: 'email', config: { to: 'it-admin@example.co.jp', smtp_host: 'smtp.example.co.jp' }, is_enabled: true, created_by: 'suzuki.taro', created_at: '2026-03-01T09:05:00Z', updated_at: '2026-03-01T09:05:00Z' },
  { id: 'ch-0003', name: 'Teams - セキュリティチーム', channel_type: 'teams', config: { webhook_url: 'https://outlook.office.com/webhook/EXAMPLE' }, is_enabled: true, created_by: 'ito.keiko', created_at: '2026-03-10T14:00:00Z', updated_at: '2026-04-20T08:00:00Z' },
  { id: 'ch-0004', name: 'Webhook - SIEM連携', channel_type: 'webhook', config: { url: 'https://siem.example.co.jp/api/ingest', secret: 'xxxxxxxx' }, is_enabled: false, created_by: 'nakamura.ryota', created_at: '2026-04-01T11:00:00Z', updated_at: '2026-04-01T11:00:00Z' },
];

const DUMMY_RULES: BackendNotificationRule[] = [
  { id: 'rule-0001', name: 'クリティカルアラート即時通知', event_type: 'alert.critical', channel_id: 'ch-0001', conditions: { severity: 'critical' }, is_enabled: true, created_at: '2026-03-02T10:00:00Z' },
  { id: 'rule-0002', name: 'ライセンス期限警告', event_type: 'license.expiry_warning', channel_id: 'ch-0002', conditions: { days_remaining: 30 }, is_enabled: true, created_at: '2026-03-02T10:05:00Z' },
  { id: 'rule-0003', name: '廃棄申請承認待ち', event_type: 'disposal.pending_approval', channel_id: 'ch-0002', conditions: null, is_enabled: true, created_at: '2026-03-05T09:00:00Z' },
  { id: 'rule-0004', name: 'セキュリティインシデント検知', event_type: 'incident.detected', channel_id: 'ch-0003', conditions: { severity: ['p1', 'p2'] }, is_enabled: true, created_at: '2026-03-10T15:00:00Z' },
  { id: 'rule-0005', name: 'パッチ未適用デバイス週次レポート', event_type: 'patch.weekly_report', channel_id: 'ch-0002', conditions: { missing_critical: true }, is_enabled: true, created_at: '2026-03-15T09:00:00Z' },
  { id: 'rule-0006', name: 'SIEM イベント転送', event_type: 'alert.any', channel_id: 'ch-0004', conditions: null, is_enabled: false, created_at: '2026-04-01T11:05:00Z' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationsPage() {
  const [channels, setChannels] = useState<BackendNotificationChannel[]>([]);
  const [rules, setRules] = useState<BackendNotificationRule[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'channels' | 'rules'>('channels');
  const [testingChannelId, setTestingChannelId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ channelId: string; success: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [channelsRes, rulesRes] = await Promise.all([
        fetchNotificationChannels(0, 100),
        fetchNotificationRules(0, 100),
      ]);
      setChannels(channelsRes.items.length > 0 ? channelsRes.items : DUMMY_CHANNELS);
      setRules(rulesRes.items.length > 0 ? rulesRes.items : DUMMY_RULES);
    } catch {
      setChannels(DUMMY_CHANNELS);
      setRules(DUMMY_RULES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleTestChannel = async (channelId: string) => {
    setTestingChannelId(channelId);
    setTestResult(null);
    try {
      const result = await testNotificationChannel(channelId);
      setTestResult({ channelId, success: result.success, message: result.message });
    } catch {
      setTestResult({ channelId, success: false, message: 'テスト送信に失敗しました' });
    } finally {
      setTestingChannelId(null);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('このチャネルを削除しますか？')) return;
    try {
      await deleteNotificationChannel(channelId);
      await load();
    } catch {
      // ignore
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('このルールを削除しますか？')) return;
    try {
      await deleteNotificationRule(ruleId);
      await load();
    } catch {
      // ignore
    }
  };

  const getChannelName = (channelId: string) => {
    const ch = channels.find((c) => c.id === channelId);
    return ch ? ch.name : channelId.slice(0, 8) + '…';
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="aegis-card h-48 bg-gray-200 dark:bg-aegis-surface" />
        <div className="h-10 rounded-lg bg-gray-200 dark:bg-aegis-surface" />
        <div className="aegis-card h-64 bg-gray-200 dark:bg-aegis-surface" />
      </div>
    );
  }

  // ── Summary chart values ──────────────────────────────────────────────────
  const enabledChannels = channels.filter((c) => c.is_enabled).length;
  const enabledRate = channels.length > 0 ? Math.round((enabledChannels / channels.length) * 100) : 0;
  const enabledColor = enabledRate >= 80 ? '#10b981' : enabledRate >= 50 ? '#f59e0b' : '#ef4444';
  const channelTypeCounts: Record<string, number> = {};
  channels.forEach((c) => {
    const label = channelTypeLabel[c.channel_type] ?? c.channel_type;
    channelTypeCounts[label] = (channelTypeCounts[label] || 0) + 1;
  });
  const channelBarData = Object.entries(channelTypeCounts).map(([type, count], i) => ({
    label: type,
    value: count,
    color: ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500'][i] ?? 'bg-gray-400',
  }));

  return (
    <div className="space-y-6">
      {/* 通知概要チャート */}
      <div className="aegis-card">
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">通知概要</h2>
        {channels.length === 0 ? (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">データなし</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">チャネル有効率</p>
              <DonutChart value={enabledRate} max={100} size={140} strokeWidth={14} color={enabledColor} label={`${enabledRate}%`} />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                全 {channels.length} チャネル中 {enabledChannels} 有効 / ルール {rules.length} 件
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">チャネル種別別件数</p>
              {channelBarData.length > 0 && (
                <BarChart
                  data={channelBarData}
                  maxValue={Math.max(...channelBarData.map((d) => d.value), 1)}
                  height={160}
                  showValues
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Test result banner */}
      {testResult && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            testResult.success
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
              : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}
        >
          {testResult.success ? '✓ ' : '✗ '}{testResult.message}
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Notification Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage notification channels and event routing rules
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-aegis-surface">
        <button
          onClick={() => setActiveTab('channels')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'channels'
              ? 'bg-white text-gray-900 shadow-sm dark:bg-aegis-darker dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Channels
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'rules'
              ? 'bg-white text-gray-900 shadow-sm dark:bg-aegis-darker dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Rules
        </button>
      </div>

      {/* Channels Tab */}
      {activeTab === 'channels' && (
        <div className="space-y-4">
          <div className="aegis-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-aegis-border dark:bg-aegis-darker">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">Name</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">Type</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">Created</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
                  {channels.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        データなし
                      </td>
                    </tr>
                  ) : (
                    channels.map((channel) => (
                      <tr
                        key={channel.id}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {channel.name}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={channelTypeVariant[channel.channel_type] ?? 'info'}>
                            {channelTypeLabel[channel.channel_type] ?? channel.channel_type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={channel.is_enabled ? 'success' : 'danger'}>
                            {channel.is_enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                          {new Date(channel.created_at).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTestChannel(channel.id)}
                              disabled={testingChannelId === channel.id}
                              className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                            >
                              {testingChannelId === channel.id ? 'Sending...' : 'Test'}
                            </button>
                            <button
                              onClick={() => handleDeleteChannel(channel.id)}
                              className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="aegis-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-aegis-border dark:bg-aegis-darker">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">Rule Name</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">Event Type</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">Channel</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">Created</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        データなし
                      </td>
                    </tr>
                  ) : (
                    rules.map((rule) => (
                      <tr
                        key={rule.id}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {rule.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-700 dark:text-gray-300">
                            {rule.event_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-700 dark:text-gray-300">
                            {getChannelName(rule.channel_id)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={rule.is_enabled ? 'success' : 'danger'}>
                            {rule.is_enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                          {new Date(rule.created_at).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
