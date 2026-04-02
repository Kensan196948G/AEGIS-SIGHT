'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart } from '@/components/ui/chart';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ChannelType = 'email' | 'webhook' | 'slack' | 'teams';
type EventType =
  | 'alert_critical'
  | 'alert_warning'
  | 'license_violation'
  | 'license_expiry'
  | 'procurement_approval'
  | 'security_incident';

interface NotificationChannel {
  id: string;
  name: string;
  channel_type: ChannelType;
  config: Record<string, string>;
  is_enabled: boolean;
  created_at: string;
}

interface NotificationRule {
  id: string;
  name: string;
  event_type: EventType;
  channel_id: string;
  is_enabled: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------
const channelTypeLabel: Record<ChannelType, string> = {
  email: 'Email',
  webhook: 'Webhook',
  slack: 'Slack',
  teams: 'Teams',
};

const channelTypeVariant: Record<ChannelType, 'info' | 'success' | 'warning' | 'danger'> = {
  email: 'info',
  webhook: 'success',
  slack: 'warning',
  teams: 'info',
};

const eventTypeLabel: Record<EventType, string> = {
  alert_critical: 'Critical Alert',
  alert_warning: 'Warning Alert',
  license_violation: 'License Violation',
  license_expiry: 'License Expiry',
  procurement_approval: 'Procurement Approval',
  security_incident: 'Security Incident',
};

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------
const demoChannels: NotificationChannel[] = [
  {
    id: '1',
    name: 'IT Admin Email',
    channel_type: 'email',
    config: { to_email: 'admin@example.com' },
    is_enabled: true,
    created_at: '2026-03-20T10:00:00Z',
  },
  {
    id: '2',
    name: 'Security Slack',
    channel_type: 'slack',
    config: { webhook_url: 'https://hooks.slack.com/services/xxx' },
    is_enabled: true,
    created_at: '2026-03-21T11:00:00Z',
  },
  {
    id: '3',
    name: 'PagerDuty Webhook',
    channel_type: 'webhook',
    config: { url: 'https://events.pagerduty.com/v2/enqueue' },
    is_enabled: true,
    created_at: '2026-03-22T09:00:00Z',
  },
  {
    id: '4',
    name: 'Ops Teams',
    channel_type: 'teams',
    config: { webhook_url: 'https://outlook.office.com/webhook/xxx' },
    is_enabled: false,
    created_at: '2026-03-23T14:00:00Z',
  },
];

const demoRules: NotificationRule[] = [
  { id: '1', name: 'Critical to Email', event_type: 'alert_critical', channel_id: '1', is_enabled: true, created_at: '2026-03-24T10:00:00Z' },
  { id: '2', name: 'Critical to Slack', event_type: 'alert_critical', channel_id: '2', is_enabled: true, created_at: '2026-03-24T10:05:00Z' },
  { id: '3', name: 'License Violation', event_type: 'license_violation', channel_id: '1', is_enabled: true, created_at: '2026-03-24T10:10:00Z' },
  { id: '4', name: 'Security to PagerDuty', event_type: 'security_incident', channel_id: '3', is_enabled: true, created_at: '2026-03-24T10:15:00Z' },
  { id: '5', name: 'Procurement Approval', event_type: 'procurement_approval', channel_id: '1', is_enabled: false, created_at: '2026-03-24T10:20:00Z' },
];

// ---------------------------------------------------------------------------
// Channel config form fields per type
// ---------------------------------------------------------------------------
const channelConfigFields: Record<ChannelType, { key: string; label: string; placeholder: string }[]> = {
  email: [
    { key: 'to_email', label: 'Recipient Email', placeholder: 'admin@example.com' },
  ],
  webhook: [
    { key: 'url', label: 'Webhook URL', placeholder: 'https://example.com/webhook' },
  ],
  slack: [
    { key: 'webhook_url', label: 'Slack Webhook URL', placeholder: 'https://hooks.slack.com/services/...' },
  ],
  teams: [
    { key: 'webhook_url', label: 'Teams Webhook URL', placeholder: 'https://outlook.office.com/webhook/...' },
  ],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'channels' | 'rules'>('channels');
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [testingChannelId, setTestingChannelId] = useState<string | null>(null);

  // Add channel form state
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<ChannelType>('email');
  const [newChannelConfig, setNewChannelConfig] = useState<Record<string, string>>({});

  // Add rule form state
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleEventType, setNewRuleEventType] = useState<EventType>('alert_critical');
  const [newRuleChannelId, setNewRuleChannelId] = useState('');

  const getChannelName = (channelId: string) => {
    const ch = demoChannels.find((c) => c.id === channelId);
    return ch ? ch.name : 'Unknown';
  };

  const handleTestChannel = (channelId: string) => {
    setTestingChannelId(channelId);
    // Simulate test send
    setTimeout(() => setTestingChannelId(null), 2000);
  };

  const resetChannelForm = () => {
    setNewChannelName('');
    setNewChannelType('email');
    setNewChannelConfig({});
    setShowAddChannelModal(false);
  };

  const resetRuleForm = () => {
    setNewRuleName('');
    setNewRuleEventType('alert_critical');
    setNewRuleChannelId('');
    setShowAddRuleModal(false);
  };

  return (
    <div className="space-y-6">
      {/* 通知概要チャート */}
      {(() => {
        const enabledChannels = demoChannels.filter(c => c.is_enabled).length;
        const enabledRate = Math.round((enabledChannels / demoChannels.length) * 100);
        const enabledColor = enabledRate >= 80 ? '#10b981' : enabledRate >= 50 ? '#f59e0b' : '#ef4444';
        const channelTypeCounts: Record<string, number> = {};
        demoChannels.forEach(c => { channelTypeCounts[channelTypeLabel[c.channel_type]] = (channelTypeCounts[channelTypeLabel[c.channel_type]] || 0) + 1; });
        const channelBarData = Object.entries(channelTypeCounts).map(([type, count], i) => ({
          label: type,
          value: count,
          color: ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500'][i] || 'bg-gray-400',
        }));
        return (
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">通知概要</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">チャネル有効率</p>
                <DonutChart value={enabledRate} max={100} size={140} strokeWidth={14} color={enabledColor} label={`${enabledRate}%`} />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  全 {demoChannels.length} チャネル中 {enabledChannels} 有効 / ルール {demoRules.length} 件
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">チャネル種別別件数</p>
                <BarChart data={channelBarData} maxValue={Math.max(...channelBarData.map(d => d.value), 1)} height={160} showValues />
              </div>
            </div>
          </div>
        );
      })()}

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
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddChannelModal(true)}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              + Add Channel
            </button>
          </div>

          <div className="aegis-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-aegis-border dark:bg-aegis-darker">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">Name</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">Type</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">Config</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">Created</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
                  {demoChannels.map((channel) => (
                    <tr
                      key={channel.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {channel.name}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={channelTypeVariant[channel.channel_type]}>
                          {channelTypeLabel[channel.channel_type]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-aegis-surface dark:text-gray-400">
                          {Object.entries(channel.config)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ')}
                        </code>
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
                          <button className="rounded-md bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:bg-aegis-surface dark:text-gray-400 dark:hover:bg-aegis-border">
                            Edit
                          </button>
                          <button className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {demoChannels.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        No notification channels configured
                      </td>
                    </tr>
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
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddRuleModal(true)}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              + Add Rule
            </button>
          </div>

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
                  {demoRules.map((rule) => (
                    <tr
                      key={rule.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {rule.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700 dark:text-gray-300">
                          {eventTypeLabel[rule.event_type]}
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
                          <button className="rounded-md bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:bg-aegis-surface dark:text-gray-400 dark:hover:bg-aegis-border">
                            Edit
                          </button>
                          <button className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {demoRules.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        No notification rules configured
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Channel Modal */}
      {showAddChannelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-aegis-darker">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
              Add Notification Channel
            </h2>

            <div className="space-y-4">
              {/* Channel Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. IT Admin Email"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                />
              </div>

              {/* Channel Type */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Channel Type
                </label>
                <select
                  value={newChannelType}
                  onChange={(e) => {
                    setNewChannelType(e.target.value as ChannelType);
                    setNewChannelConfig({});
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                >
                  <option value="email">Email</option>
                  <option value="webhook">Webhook</option>
                  <option value="slack">Slack</option>
                  <option value="teams">Microsoft Teams</option>
                </select>
              </div>

              {/* Dynamic Config Fields */}
              {channelConfigFields[newChannelType].map((field) => (
                <div key={field.key}>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={newChannelConfig[field.key] || ''}
                    onChange={(e) =>
                      setNewChannelConfig((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={resetChannelForm}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-aegis-border dark:text-gray-300 dark:hover:bg-aegis-surface"
              >
                Cancel
              </button>
              <button
                onClick={resetChannelForm}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                Create Channel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Rule Modal */}
      {showAddRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-aegis-darker">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
              Add Notification Rule
            </h2>

            <div className="space-y-4">
              {/* Rule Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="e.g. Critical Alert to Email"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                />
              </div>

              {/* Event Type */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Event Type
                </label>
                <select
                  value={newRuleEventType}
                  onChange={(e) => setNewRuleEventType(e.target.value as EventType)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                >
                  {Object.entries(eventTypeLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Channel */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notification Channel
                </label>
                <select
                  value={newRuleChannelId}
                  onChange={(e) => setNewRuleChannelId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                >
                  <option value="">Select a channel...</option>
                  {demoChannels
                    .filter((c) => c.is_enabled)
                    .map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.name} ({channelTypeLabel[channel.channel_type]})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={resetRuleForm}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-aegis-border dark:text-gray-300 dark:hover:bg-aegis-surface"
              >
                Cancel
              </button>
              <button
                onClick={resetRuleForm}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                Create Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
