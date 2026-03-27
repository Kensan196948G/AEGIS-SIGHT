'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface Settings {
  // Alert Thresholds
  cpuAlertThreshold: number;
  memoryAlertThreshold: number;
  diskAlertThreshold: number;
  licenseOverageThreshold: number;
  licenseUnderuseThreshold: number;
  // Collection
  agentCollectionInterval: number;
  samScanInterval: number;
  securityScanInterval: number;
  // Notifications
  emailNotifications: boolean;
  slackNotifications: boolean;
  slackWebhookUrl: string;
  alertEmailRecipients: string;
  // Retention
  logRetentionDays: number;
  alertRetentionDays: number;
  // Security
  sessionTimeout: number;
  mfaRequired: boolean;
  passwordMinLength: number;
  passwordExpireDays: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    cpuAlertThreshold: 90,
    memoryAlertThreshold: 85,
    diskAlertThreshold: 80,
    licenseOverageThreshold: 100,
    licenseUnderuseThreshold: 50,
    agentCollectionInterval: 5,
    samScanInterval: 24,
    securityScanInterval: 12,
    emailNotifications: true,
    slackNotifications: false,
    slackWebhookUrl: '',
    alertEmailRecipients: 'admin@aegis-sight.local',
    logRetentionDays: 90,
    alertRetentionDays: 365,
    sessionTimeout: 30,
    mfaRequired: false,
    passwordMinLength: 12,
    passwordExpireDays: 90,
  });

  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'collection' | 'notifications' | 'security'>('alerts');

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  const tabs = [
    { key: 'alerts' as const, label: 'アラート閾値', icon: AlertIcon },
    { key: 'collection' as const, label: '収集設定', icon: CollectionIcon },
    { key: 'notifications' as const, label: '通知設定', icon: NotificationIcon },
    { key: 'security' as const, label: 'セキュリティ', icon: SecurityTabIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">システム設定</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            AEGIS-SIGHTの動作パラメータを設定します
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              設定を保存しました
            </span>
          )}
          <button onClick={handleSave} className="aegis-btn-primary">
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            設定を保存
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 dark:border-aegis-border dark:bg-aegis-dark">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm dark:bg-aegis-surface dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alert Thresholds */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <div className="aegis-card space-y-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">監視アラート閾値</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                閾値を超えた場合にアラートが発報されます
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <ThresholdInput
                label="CPU使用率"
                value={settings.cpuAlertThreshold}
                onChange={(v) => updateSetting('cpuAlertThreshold', v)}
                unit="%"
                description="CPU使用率がこの値を超えると警告"
              />
              <ThresholdInput
                label="メモリ使用率"
                value={settings.memoryAlertThreshold}
                onChange={(v) => updateSetting('memoryAlertThreshold', v)}
                unit="%"
                description="メモリ使用率がこの値を超えると警告"
              />
              <ThresholdInput
                label="ディスク使用率"
                value={settings.diskAlertThreshold}
                onChange={(v) => updateSetting('diskAlertThreshold', v)}
                unit="%"
                description="ディスク使用率がこの値を超えると警告"
              />
            </div>
          </div>

          <div className="aegis-card space-y-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">SAMアラート閾値</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                ライセンス管理に関するアラート条件
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <ThresholdInput
                label="ライセンス超過閾値"
                value={settings.licenseOverageThreshold}
                onChange={(v) => updateSetting('licenseOverageThreshold', v)}
                unit="%"
                description="使用率がこの値を超えるとアラート"
              />
              <ThresholdInput
                label="ライセンス低利用閾値"
                value={settings.licenseUnderuseThreshold}
                onChange={(v) => updateSetting('licenseUnderuseThreshold', v)}
                unit="%"
                description="使用率がこの値を下回るとアラート"
              />
            </div>
          </div>
        </div>
      )}

      {/* Collection Settings */}
      {activeTab === 'collection' && (
        <div className="aegis-card space-y-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">データ収集間隔</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              各種データの収集・スキャン頻度を設定します
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ThresholdInput
              label="エージェント収集間隔"
              value={settings.agentCollectionInterval}
              onChange={(v) => updateSetting('agentCollectionInterval', v)}
              unit="分"
              description="端末情報の収集間隔（最小1分）"
              min={1}
              max={60}
            />
            <ThresholdInput
              label="SAMスキャン間隔"
              value={settings.samScanInterval}
              onChange={(v) => updateSetting('samScanInterval', v)}
              unit="時間"
              description="ソフトウェアインベントリの定期スキャン"
              min={1}
              max={168}
            />
            <ThresholdInput
              label="セキュリティスキャン間隔"
              value={settings.securityScanInterval}
              onChange={(v) => updateSetting('securityScanInterval', v)}
              unit="時間"
              description="Defender/BitLocker状態の確認間隔"
              min={1}
              max={72}
            />
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-aegis-border dark:bg-aegis-dark/50">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">データ保持期間</h3>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <ThresholdInput
                label="ログ保持期間"
                value={settings.logRetentionDays}
                onChange={(v) => updateSetting('logRetentionDays', v)}
                unit="日"
                description="操作ログの保持日数"
                min={30}
                max={365}
              />
              <ThresholdInput
                label="アラート保持期間"
                value={settings.alertRetentionDays}
                onChange={(v) => updateSetting('alertRetentionDays', v)}
                unit="日"
                description="アラート履歴の保持日数"
                min={30}
                max={730}
              />
            </div>
          </div>
        </div>
      )}

      {/* Notification Settings */}
      {activeTab === 'notifications' && (
        <div className="aegis-card space-y-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">通知設定</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              アラート通知の送信先を設定します
            </p>
          </div>

          <div className="space-y-4">
            <ToggleSetting
              label="メール通知"
              description="アラート発生時にメールで通知します"
              checked={settings.emailNotifications}
              onChange={(v) => updateSetting('emailNotifications', v)}
            />
            {settings.emailNotifications && (
              <div className="ml-12">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  通知先メールアドレス
                </label>
                <input
                  type="text"
                  value={settings.alertEmailRecipients}
                  onChange={(e) => updateSetting('alertEmailRecipients', e.target.value)}
                  placeholder="カンマ区切りで複数指定可"
                  className="aegis-input max-w-md"
                />
              </div>
            )}

            <div className="border-t border-gray-200 pt-4 dark:border-aegis-border" />

            <ToggleSetting
              label="Slack通知"
              description="Slack Webhookでアラートを通知します"
              checked={settings.slackNotifications}
              onChange={(v) => updateSetting('slackNotifications', v)}
            />
            {settings.slackNotifications && (
              <div className="ml-12">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={settings.slackWebhookUrl}
                  onChange={(e) => updateSetting('slackWebhookUrl', e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="aegis-input max-w-lg"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="aegis-card space-y-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">認証設定</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                ログインとセッション管理の設定
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <ThresholdInput
                label="セッションタイムアウト"
                value={settings.sessionTimeout}
                onChange={(v) => updateSetting('sessionTimeout', v)}
                unit="分"
                description="無操作時の自動ログアウトまでの時間"
                min={5}
                max={120}
              />
              <ThresholdInput
                label="パスワード最小文字数"
                value={settings.passwordMinLength}
                onChange={(v) => updateSetting('passwordMinLength', v)}
                unit="文字"
                description="パスワードの最小必要文字数"
                min={8}
                max={32}
              />
              <ThresholdInput
                label="パスワード有効期限"
                value={settings.passwordExpireDays}
                onChange={(v) => updateSetting('passwordExpireDays', v)}
                unit="日"
                description="パスワード変更を要求する間隔"
                min={0}
                max={365}
              />
            </div>

            <ToggleSetting
              label="多要素認証 (MFA) を必須にする"
              description="全ユーザーに対してMFAを要求します"
              checked={settings.mfaRequired}
              onChange={(v) => updateSetting('mfaRequired', v)}
            />
          </div>

          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              システム情報
            </h2>
            <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                { label: 'バージョン', value: 'AEGIS-SIGHT v0.1.0' },
                { label: 'API URL', value: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000' },
                { label: 'エージェントバージョン', value: 'v0.1.0' },
                { label: 'データベース', value: 'PostgreSQL 16' },
                { label: 'キャッシュ', value: 'Redis 7' },
                { label: 'ライセンス', value: 'Enterprise' },
              ].map((info) => (
                <div key={info.label} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-aegis-border">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{info.label}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{info.value}</span>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components

function ThresholdInput({
  label,
  value,
  onChange,
  unit,
  description,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  description: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary-600 dark:bg-gray-700"
        />
        <div className="flex w-20 items-center gap-1">
          <input
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            className="aegis-input w-16 px-2 py-1 text-center text-sm"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">{unit}</span>
        </div>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">{description}</p>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-4">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          checked ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}

// Icon components
function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}

function CollectionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  );
}

function NotificationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  );
}

function SecurityTabIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}
