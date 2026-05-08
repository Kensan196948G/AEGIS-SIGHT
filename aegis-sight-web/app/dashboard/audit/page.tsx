'use client';

import { useState } from 'react';
import {
  Badge, SearchInput,
} from '@/components/ui/design-components';

const AUDIT_LOGS = [
  { id: 'au-001', user: 'tanaka.hiroshi',    action: 'ユーザーアカウント作成',         resource: 'users/suzuki.akira',          result: 'success', ip: '192.168.1.42',  time: '2025-01-15 09:02' },
  { id: 'au-002', user: 'yamamoto.kenji',    action: '機密ファイルへのアクセス',        resource: 'files/confidential/Q4-2024', result: 'success', ip: '192.168.1.88',  time: '2025-01-15 09:15' },
  { id: 'au-003', user: 'unknown',           action: '管理者ログイン試行（失敗）',      resource: 'admin/login',                 result: 'failure', ip: '203.0.113.99',  time: '2025-01-15 09:23' },
  { id: 'au-004', user: 'ito.masaru',        action: 'ポリシー設定変更',                resource: 'policies/po-003',             result: 'success', ip: '192.168.1.15',  time: '2025-01-15 10:05' },
  { id: 'au-005', user: 'sato.yuki',         action: 'レポートのエクスポート',          resource: 'reports/rp-003',              result: 'success', ip: '192.168.10.22', time: '2025-01-15 10:32' },
  { id: 'au-006', user: 'unknown',           action: '無効ユーザーでのログイン試行',    resource: 'auth/login',                  result: 'failure', ip: '203.0.113.55',  time: '2025-01-15 10:48' },
  { id: 'au-007', user: 'tanaka.hiroshi',    action: 'デバイスグループ設定変更',        resource: 'device-groups/dg-005',        result: 'success', ip: '192.168.1.42',  time: '2025-01-15 11:10' },
  { id: 'au-008', user: 'admin',             action: 'システム設定更新',                resource: 'settings/security',           result: 'success', ip: '192.168.1.1',   time: '2025-01-15 11:30' },
  { id: 'au-009', user: 'suzuki.akira',      action: '初回ログイン',                    resource: 'auth/login',                  result: 'success', ip: '192.168.10.55', time: '2025-01-15 13:00' },
  { id: 'au-010', user: 'yamamoto.kenji',    action: 'DLP ポリシー違反（USB 接続）',   resource: 'dlp/usb-control',             result: 'blocked', ip: '192.168.1.88',  time: '2025-01-15 14:22' },
];

type AuditResult = 'success' | 'failure' | 'blocked';
const RESULT_CFG: Record<AuditResult, { l: string; v: 'success' | 'danger' | 'warning' }> = {
  success: { l: '成功',    v: 'success' },
  failure: { l: '失敗',    v: 'danger'  },
  blocked: { l: 'ブロック', v: 'warning' },
};
const getResult = (r: string) => RESULT_CFG[r as AuditResult] ?? RESULT_CFG.success;

export default function AuditPage() {
  const [search, setSearch] = useState('');

  const filtered = AUDIT_LOGS.filter(a =>
    !search ||
    a.user.toLowerCase().includes(search.toLowerCase()) ||
    a.action.toLowerCase().includes(search.toLowerCase()) ||
    a.resource.toLowerCase().includes(search.toLowerCase()) ||
    a.ip.includes(search)
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">監査ログ</h1>
          <p className="page-subtitle">ユーザー操作・システム変更・認証イベントの完全記録</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">CSVエクスポート</button>
        </div>
      </div>

      <div className="grid-3">
        <div className="card card-center"><p className="stat-label">総ログ件数</p><p className="stat-value">{AUDIT_LOGS.length}</p></div>
        <div className="card card-center"><p className="stat-label">失敗イベント</p><p className="stat-value text-red">{AUDIT_LOGS.filter(a => a.result === 'failure').length}</p></div>
        <div className="card card-center"><p className="stat-label">ブロックイベント</p><p className="stat-value text-amber">{AUDIT_LOGS.filter(a => a.result === 'blocked').length}</p></div>
      </div>

      <div className="card filter-row">
        <SearchInput placeholder="ユーザー・操作・リソース・IP で検索..." value={search} onChange={v => setSearch(v)} style={{ flex: 1, minWidth: 200 }} />
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['日時', 'ユーザー', '操作', 'リソース', 'IPアドレス', '結果'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(a => {
                const rs = getResult(a.result);
                return (
                  <tr key={a.id} className="table-row-hover">
                    <td className="mono text-sub" style={{ whiteSpace: 'nowrap' }}>{a.time}</td>
                    <td><span className="link-text">{a.user}</span></td>
                    <td>{a.action}</td>
                    <td className="mono text-sub" style={{ fontSize: 12 }}>{a.resource}</td>
                    <td className="mono text-sub">{a.ip}</td>
                    <td><Badge variant={rs.v} dot>{rs.l}</Badge></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={6} className="table-empty">条件に一致するログが見つかりません</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {AUDIT_LOGS.length} 件中 {filtered.length} 件を表示</span>
        </div>
      </div>
    </div>
  );
}
