'use client';

import { useState } from 'react';
import {
  Badge, Select,
} from '@/components/ui/design-components';

const ALERTS_DATA = [
  { id: 'al-001', title: '不正アクセス試行検知',               severity: 'critical', category: '認証',         message: '5分間に50回以上の認証失敗 — yamamoto.kenji より',         status: 'open',         time: '09:12' },
  { id: 'al-002', title: 'マルウェア検知',                     severity: 'critical', category: 'エンドポイント', message: 'Sophos が MSPC-0042 で Trojan.GenericKD を検知',          status: 'acknowledged', time: '09:34' },
  { id: 'al-003', title: '未承認デバイスのネットワーク接続',   severity: 'warning',  category: 'ネットワーク',  message: 'MAC: 3C:22:FB:xx:xx — 棟192.168.10.0/24 セグメントへ接続', status: 'open',         time: '10:05' },
  { id: 'al-004', title: 'DLP ポリシー違反 — 機密ファイル送信', severity: 'warning',  category: 'DLP',           message: 'yamamoto.kenji が機密 Excel を外部送信しようとしました',    status: 'acknowledged', time: '10:22' },
  { id: 'al-005', title: 'SSL 証明書の期限切れ警告',           severity: 'warning',  category: 'インフラ',      message: 'api.internal.aegis.local の証明書が 7 日以内に期限切れ',   status: 'open',         time: '10:48' },
  { id: 'al-006', title: 'パッチ適用失敗 — 重大脆弱性',       severity: 'warning',  category: 'パッチ',        message: 'KB5034441 が MSPC-0015 / 0021 への適用に失敗',             status: 'open',         time: '11:15' },
  { id: 'al-007', title: 'ライセンス超過検知',                 severity: 'info',     category: 'SAM',           message: 'Zoom Business が購入数 100 を超え 143 ライセンスを使用中', status: 'acknowledged', time: '11:30' },
  { id: 'al-008', title: 'バックアップ完了通知',               severity: 'info',     category: 'インフラ',      message: '深夜バックアップジョブが正常に完了しました',                status: 'resolved',     time: '03:15' },
];

const SEV_OPTS = [
  { value: '',         label: 'すべての重大度' },
  { value: 'critical', label: '重大' },
  { value: 'warning',  label: '警告' },
  { value: 'info',     label: '情報' },
];

type AltSev    = 'critical' | 'warning' | 'info';
type AltStatus = 'open' | 'acknowledged' | 'resolved';

const ALT_SEV: Record<AltSev, { l: string; v: 'danger' | 'warning' | 'info'; dot: string }> = {
  critical: { l: '重大', v: 'danger',  dot: '#ef4444' },
  warning:  { l: '警告', v: 'warning', dot: '#f59e0b' },
  info:     { l: '情報', v: 'info',    dot: '#3b82f6' },
};

const ALT_STATUS: Record<AltStatus, { l: string; v: 'danger' | 'warning' | 'success' }> = {
  open:         { l: '未対応', v: 'danger'  },
  acknowledged: { l: '確認済', v: 'warning' },
  resolved:     { l: '解決済', v: 'success' },
};

const getSev    = (s: string) => ALT_SEV[s as AltSev] ?? ALT_SEV.info;
const getStatus = (s: string) => ALT_STATUS[s as AltStatus] ?? ALT_STATUS.open;

const openCount  = ALERTS_DATA.filter(a => a.status === 'open').length;
const ackCount   = ALERTS_DATA.filter(a => a.status === 'acknowledged').length;
const doneCount  = ALERTS_DATA.filter(a => a.status === 'resolved').length;

export default function AlertsPage() {
  const [sevFilter, setSevFilter] = useState('');

  const filtered = ALERTS_DATA.filter(a => !sevFilter || a.severity === sevFilter);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">アラート管理</h1>
          <p className="page-subtitle">セキュリティアラートの検知・追跡・対応状況</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">CSVエクスポート</button>
        </div>
      </div>

      <div className="grid-3">
        <div className="card card-center"><p className="stat-label">未対応</p><p className="stat-value text-red">{openCount}</p></div>
        <div className="card card-center"><p className="stat-label">確認済</p><p className="stat-value text-amber">{ackCount}</p></div>
        <div className="card card-center"><p className="stat-label">解決済</p><p className="stat-value text-green">{doneCount}</p></div>
      </div>

      <div className="card filter-row">
        <Select options={SEV_OPTS} value={sevFilter} onChange={v => setSevFilter(v)} style={{ minWidth: 180 }} />
      </div>

      <div className="card">
        <div className="activity-list">
          {filtered.length > 0 ? filtered.map(a => {
            const sv = getSev(a.severity);
            const st = getStatus(a.status);
            return (
              <div key={a.id} className="activity-item">
                <div className="activity-dot" style={{ background: sv.dot }} />
                <div className="activity-content">
                  <p className="activity-text">
                    <strong>{a.title}</strong> — {a.message}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Badge variant={sv.v}>{sv.l}</Badge>
                    <Badge variant={st.v} dot>{st.l}</Badge>
                    <span className="text-sub" style={{ fontSize: 11 }}>{a.category}</span>
                    <span className="activity-time">{a.time}</span>
                  </div>
                </div>
              </div>
            );
          }) : (
            <p className="table-empty">条件に一致するアラートがありません</p>
          )}
        </div>
      </div>
    </div>
  );
}
