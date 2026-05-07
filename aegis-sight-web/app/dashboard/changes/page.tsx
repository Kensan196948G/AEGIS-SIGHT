'use client';

import { useState } from 'react';
import {
  Badge, SearchInput,
} from '@/components/ui/design-components';

const CHANGES = [
  { id: 'CR-001', title: 'Windows 11 23H2 一斉適用',                 risk: '中', type: '標準変更',   requester: 'ito.masaru',       scheduled: '2025-01-20', status: 'approved'  },
  { id: 'CR-002', title: 'ファイアウォールルール追加 — DMZ→AP サーバー', risk: '高', type: '緊急変更',   requester: 'tanaka.hiroshi',    scheduled: '2025-01-16', status: 'approved'  },
  { id: 'CR-003', title: 'Active Directory OU 構成変更',              risk: '高', type: '通常変更',   requester: 'セキュリティチーム', scheduled: '2025-01-22', status: 'review'    },
  { id: 'CR-004', title: 'Sophos ポリシー更新 — USB 制御強化',        risk: '低', type: '標準変更',   requester: 'yamamoto.kenji',    scheduled: '2025-01-17', status: 'completed' },
  { id: 'CR-005', title: 'VPN 認証方式変更（証明書認証へ移行）',       risk: '高', type: '通常変更',   requester: 'インフラチーム',    scheduled: '2025-01-25', status: 'pending'   },
  { id: 'CR-006', title: 'SSL 証明書更新 — api.internal.aegis.local', risk: '低', type: '標準変更',   requester: 'ito.masaru',        scheduled: '2025-01-18', status: 'completed' },
  { id: 'CR-007', title: 'SIEM ルールチューニング — 誤検知削減',       risk: '中', type: '通常変更',   requester: 'セキュリティチーム', scheduled: '2025-01-21', status: 'review'    },
  { id: 'CR-008', title: 'GitHub Enterprise SAML SSO 統合',          risk: '中', type: '通常変更',   requester: '開発チーム',         scheduled: '2025-01-28', status: 'pending'   },
];

type RiskKey    = '低' | '中' | '高';
type ChangeStatus = 'approved' | 'review' | 'pending' | 'completed' | 'rejected';

const RISK_CFG: Record<RiskKey, { v: 'success' | 'warning' | 'danger' }> = {
  '低': { v: 'success' },
  '中': { v: 'warning' },
  '高': { v: 'danger'  },
};

const STATUS_CFG: Record<ChangeStatus, { l: string; v: 'success' | 'warning' | 'info' | 'default' | 'danger' }> = {
  approved:  { l: '承認済',   v: 'success' },
  review:    { l: 'レビュー中', v: 'warning' },
  pending:   { l: '申請中',   v: 'info'    },
  completed: { l: '完了',     v: 'default' },
  rejected:  { l: '却下',     v: 'danger'  },
};

const getRisk   = (r: string) => RISK_CFG[r as RiskKey] ?? RISK_CFG['中'];
const getStatus = (s: string) => STATUS_CFG[s as ChangeStatus] ?? STATUS_CFG.pending;

const approvedCount  = CHANGES.filter(c => c.status === 'approved').length;
const pendingCount   = CHANGES.filter(c => c.status === 'pending' || c.status === 'review').length;
const completedCount = CHANGES.filter(c => c.status === 'completed').length;

export default function ChangesPage() {
  const [search, setSearch] = useState('');

  const filtered = CHANGES.filter(c =>
    !search ||
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.requester.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">変更管理</h1>
          <p className="page-subtitle">IT 変更要求の申請・承認・実施追跡（ITIL Change Management）</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">CSVエクスポート</button>
          <button className="btn-primary">変更を申請</button>
        </div>
      </div>

      <div className="grid-3">
        <div className="card card-center"><p className="stat-label">承認済</p><p className="stat-value text-green">{approvedCount}</p></div>
        <div className="card card-center"><p className="stat-label">申請・レビュー中</p><p className="stat-value text-amber">{pendingCount}</p></div>
        <div className="card card-center"><p className="stat-label">完了</p><p className="stat-value">{completedCount}</p></div>
      </div>

      <div className="card filter-row">
        <SearchInput placeholder="変更名・申請者・ID で検索..." value={search} onChange={v => setSearch(v)} style={{ flex: 1, minWidth: 200 }} />
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['CR#', '変更タイトル', 'リスク', '種別', '申請者', '実施予定日', 'ステータス'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(c => {
                const rk = getRisk(c.risk);
                const st = getStatus(c.status);
                return (
                  <tr key={c.id} className="table-row-hover">
                    <td className="mono text-sub">{c.id}</td>
                    <td><span className="link-text">{c.title}</span></td>
                    <td><Badge variant={rk.v}>{c.risk}</Badge></td>
                    <td className="text-sub">{c.type}</td>
                    <td className="text-sub">{c.requester}</td>
                    <td className="text-sub">{c.scheduled}</td>
                    <td><Badge variant={st.v} dot>{st.l}</Badge></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={7} className="table-empty">条件に一致する変更が見つかりません</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {CHANGES.length} 件中 {filtered.length} 件を表示</span>
        </div>
      </div>
    </div>
  );
}
