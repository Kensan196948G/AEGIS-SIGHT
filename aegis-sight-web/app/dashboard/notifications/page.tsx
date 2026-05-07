'use client';

import { useState } from 'react';
import { Badge, Select } from '@/components/ui/design-components';

const NOTIFICATIONS = [
  { id: 'nt-001', title: 'ランサムウェア試行を検知',         body: 'aegis-siem-01 でランサムウェアの試行が検知されました。即時対応が必要です。', severity: 'critical', category: 'セキュリティ', time: '2025-01-15 14:32', read: false },
  { id: 'nt-002', title: 'SIEM サーバー CPU 使用率 88%',    body: 'aegis-siem-01 の CPU 使用率が閾値を超えました。パフォーマンスを確認してください。', severity: 'critical', category: '監視',         time: '2025-01-15 14:15', read: false },
  { id: 'nt-003', title: '緊急パッチ適用待ち — 12 台',      body: 'CVE-2025-0145 の緊急パッチが 12 台のデバイスに未適用です。', severity: 'high',     category: 'パッチ',       time: '2025-01-15 12:00', read: false },
  { id: 'nt-004', title: 'MFA 未適用ユーザー — 3 名',       body: '営業部の 3 名が MFA を設定していません。ポリシー強制を検討してください。', severity: 'high',     category: 'セキュリティ', time: '2025-01-15 10:45', read: true  },
  { id: 'nt-005', title: 'データベースサーバー メモリ 85%', body: 'aegis-db-01 のメモリ使用率が 85% に達しました。', severity: 'warning',  category: '監視',         time: '2025-01-15 09:30', read: true  },
  { id: 'nt-006', title: 'DLP 違反 21 件（本日）',          body: '本日 DLP ポリシー違反が 21 件発生しています。詳細を確認してください。', severity: 'warning',  category: 'コンプライアンス', time: '2025-01-15 08:00', read: true },
  { id: 'nt-007', title: 'Sophos ライセンス有効期限 — 30 日', body: 'Sophos Intercept X ライセンスが 30 日後に期限切れになります。更新を検討してください。', severity: 'info',     category: 'SAM',          time: '2025-01-14 09:00', read: true  },
  { id: 'nt-008', title: '週次セキュリティレポート生成完了', body: '2025年第2週のセキュリティレポートが生成されました。', severity: 'info',     category: 'レポート',     time: '2025-01-13 07:00', read: true  },
  { id: 'nt-009', title: '調達申請 — 承認待ち 2 件',        body: 'Zoom Business ライセンス追加・iPad Pro の調達申請が承認待ちです。', severity: 'info',     category: '調達',         time: '2025-01-12 15:00', read: true  },
];

const SEV_OPTS = [
  { value: '', label: 'すべての重要度' },
  { value: 'critical', label: '重大' },
  { value: 'high',     label: '高'   },
  { value: 'warning',  label: '警告' },
  { value: 'info',     label: '情報' },
];

type Severity = 'critical' | 'high' | 'warning' | 'info';
const SEV_CFG: Record<Severity, { l: string; v: 'danger' | 'warning' | 'info' | 'success'; dot: string }> = {
  critical: { l: '重大', v: 'danger',  dot: '#ef4444' },
  high:     { l: '高',   v: 'warning', dot: '#f59e0b' },
  warning:  { l: '警告', v: 'warning', dot: '#f59e0b' },
  info:     { l: '情報', v: 'info',    dot: '#3b82f6' },
};

const unreadCount   = NOTIFICATIONS.filter(n => !n.read).length;
const criticalCount = NOTIFICATIONS.filter(n => n.severity === 'critical').length;
const highCount     = NOTIFICATIONS.filter(n => n.severity === 'high').length;

export default function NotificationsPage() {
  const [filter, setFilter] = useState('');

  const filtered = NOTIFICATIONS.filter(n => !filter || n.severity === filter);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">通知センター</h1>
          <p className="page-subtitle">システムアラート・イベント・ポリシー違反の通知管理</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">すべて既読にする</button>
        </div>
      </div>

      <div className="grid-4">
        <div className="card card-center"><p className="stat-label">未読</p><p className="stat-value text-red">{unreadCount}</p></div>
        <div className="card card-center"><p className="stat-label">重大</p><p className="stat-value text-red">{criticalCount}</p></div>
        <div className="card card-center"><p className="stat-label">高優先度</p><p className="stat-value text-amber">{highCount}</p></div>
        <div className="card card-center"><p className="stat-label">総通知数</p><p className="stat-value">{NOTIFICATIONS.length}</p></div>
      </div>

      <div className="card filter-row">
        <Select options={SEV_OPTS} value={filter} onChange={v => setFilter(v)} style={{ minWidth: 180 }} />
      </div>

      <div className="card">
        <h2 className="card-title">通知一覧</h2>
        <div className="activity-list">
          {filtered.map(n => {
            const sv = SEV_CFG[n.severity as Severity] ?? SEV_CFG.info;
            return (
              <div key={n.id} className="activity-item" style={{
                opacity: n.read ? 0.75 : 1,
                borderLeft: n.read ? 'none' : `3px solid ${sv.dot}`,
                paddingLeft: n.read ? 0 : 10,
                marginLeft: n.read ? 0 : -10,
              }}>
                <div className="activity-dot" style={{ background: sv.dot }} />
                <div className="activity-content">
                  <p className="activity-text">
                    <strong>{n.title}</strong>
                    {!n.read && <span style={{ marginLeft: 8, fontSize: 10, background: sv.dot, color: '#fff', borderRadius: 4, padding: '1px 6px' }}>新着</span>}
                  </p>
                  <p className="text-sub" style={{ fontSize: 12, marginTop: 2 }}>{n.body}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                    <Badge variant={sv.v}>{sv.l}</Badge>
                    <span className="text-sub" style={{ fontSize: 11 }}>{n.category}</span>
                    <span className="activity-time">{n.time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="table-footer">
          <span className="table-info">全 {NOTIFICATIONS.length} 件中 {filtered.length} 件を表示</span>
        </div>
      </div>
    </div>
  );
}
