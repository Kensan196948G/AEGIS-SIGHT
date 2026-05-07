'use client';

import { useState } from 'react';
import {
  Tabs,
} from '@/components/ui/design-components';

const TABS = [
  { id: 'general',       label: '一般'         },
  { id: 'notifications', label: '通知'         },
  { id: 'security',      label: 'セキュリティ'  },
  { id: 'integrations',  label: '連携'         },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
        background: checked ? '#10b981' : 'var(--border)',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18,
        borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );
}

function SettingRow({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <p className="text-main" style={{ fontWeight: 500 }}>{label}</p>
        {description && <p className="text-sub" style={{ fontSize: 12, marginTop: 2 }}>{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState('general');

  const [settings, setSettings] = useState({
    darkMode: true,
    compactView: false,
    autoRefresh: true,
    emailAlerts: true,
    slackAlerts: false,
    weeklyReport: true,
    criticalOnly: false,
    mfaEnforce: true,
    sessionTimeout: true,
    ipWhitelist: false,
    ssoEnabled: true,
    sophos: true,
    m365: true,
    github: false,
    splunk: false,
  });

  const set = (key: keyof typeof settings) => (v: boolean) =>
    setSettings(prev => ({ ...prev, [key]: v }));

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">設定</h1>
          <p className="page-subtitle">システム設定・通知・セキュリティオプションの管理</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary">変更を保存</button>
        </div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'general' && (
        <div className="card">
          <h2 className="card-title">表示設定</h2>
          <SettingRow label="ダークモード" description="ダークテーマを使用します" checked={settings.darkMode} onChange={set('darkMode')} />
          <SettingRow label="コンパクト表示" description="テーブル行の高さを縮小して情報密度を上げます" checked={settings.compactView} onChange={set('compactView')} />
          <SettingRow label="自動更新" description="ダッシュボードデータを 30 秒ごとに自動更新します" checked={settings.autoRefresh} onChange={set('autoRefresh')} />
        </div>
      )}

      {tab === 'notifications' && (
        <div className="card">
          <h2 className="card-title">通知設定</h2>
          <SettingRow label="メール通知" description="重要なアラートをメールで受信します" checked={settings.emailAlerts} onChange={set('emailAlerts')} />
          <SettingRow label="Slack 通知" description="Slack チャンネルへアラートを転送します" checked={settings.slackAlerts} onChange={set('slackAlerts')} />
          <SettingRow label="週次レポートメール" description="毎週月曜日に週次サマリーを送信します" checked={settings.weeklyReport} onChange={set('weeklyReport')} />
          <SettingRow label="重大のみ通知" description="Critical レベルのアラートのみを通知します" checked={settings.criticalOnly} onChange={set('criticalOnly')} />
        </div>
      )}

      {tab === 'security' && (
        <div className="card">
          <h2 className="card-title">セキュリティ設定</h2>
          <SettingRow label="MFA 強制" description="全ユーザーに多要素認証を必須にします" checked={settings.mfaEnforce} onChange={set('mfaEnforce')} />
          <SettingRow label="セッションタイムアウト" description="30 分の無操作でセッションを切断します" checked={settings.sessionTimeout} onChange={set('sessionTimeout')} />
          <SettingRow label="IP ホワイトリスト" description="指定した IP アドレスからのみアクセスを許可します" checked={settings.ipWhitelist} onChange={set('ipWhitelist')} />
          <SettingRow label="SSO（SAML/OIDC）" description="企業 IdP による シングルサインオンを有効にします" checked={settings.ssoEnabled} onChange={set('ssoEnabled')} />
        </div>
      )}

      {tab === 'integrations' && (
        <div className="card">
          <h2 className="card-title">外部連携設定</h2>
          <SettingRow label="Sophos Central" description="Sophos Intercept X からのアラートを受信します" checked={settings.sophos} onChange={set('sophos')} />
          <SettingRow label="Microsoft 365" description="Microsoft 365 の監査ログと連携します" checked={settings.m365} onChange={set('m365')} />
          <SettingRow label="GitHub Enterprise" description="GitHub Enterprise のイベントを監視します" checked={settings.github} onChange={set('github')} />
          <SettingRow label="Splunk SIEM" description="Splunk へログをフォワードします" checked={settings.splunk} onChange={set('splunk')} />
        </div>
      )}
    </div>
  );
}
