'use client';

import { useState } from 'react';
import {
  Badge, ProgressBar, SearchInput,
} from '@/components/ui/design-components';

const POLICIES = [
  { id: 'po-001', name: 'Windows 標準セキュリティポリシー',  category: 'エンドポイント', targets: 842, compliant: 821, violations:  21, severity: 'high',     status: 'active'   },
  { id: 'po-002', name: 'Mac 開発者ポリシー',                category: 'エンドポイント', targets: 124, compliant: 119, violations:   5, severity: 'medium',   status: 'active'   },
  { id: 'po-003', name: 'USB デバイス制御ポリシー',           category: 'DLP',           targets: 966, compliant: 930, violations:  36, severity: 'critical', status: 'active'   },
  { id: 'po-004', name: 'ファイアウォール強制ポリシー',        category: 'ネットワーク',   targets: 966, compliant: 964, violations:   2, severity: 'high',     status: 'active'   },
  { id: 'po-005', name: 'パスワード複雑性ポリシー',           category: '認証',           targets: 966, compliant: 940, violations:  26, severity: 'high',     status: 'active'   },
  { id: 'po-006', name: '暗号化強制ポリシー（BitLocker）',    category: 'エンドポイント', targets: 842, compliant: 798, violations:  44, severity: 'critical', status: 'active'   },
  { id: 'po-007', name: 'リモートデスクトップ制限',           category: 'ネットワーク',   targets: 966, compliant: 966, violations:   0, severity: 'low',      status: 'active'   },
  { id: 'po-008', name: 'Windows 10 EOL 移行ポリシー',       category: 'ライフサイクル', targets:  67, compliant:  12, violations:  55, severity: 'critical', status: 'warning'  },
];

type SevKey = 'critical' | 'high' | 'medium' | 'low';
type PolStatus = 'active' | 'warning' | 'disabled';

const SEV_CFG: Record<SevKey, { l: string; v: 'danger' | 'warning' | 'info' | 'success' }> = {
  critical: { l: '緊急', v: 'danger'  },
  high:     { l: '高',   v: 'warning' },
  medium:   { l: '中',   v: 'info'    },
  low:      { l: '低',   v: 'success' },
};

const STATUS_CFG: Record<PolStatus, { l: string; v: 'success' | 'warning' | 'default' }> = {
  active:   { l: '有効',   v: 'success' },
  warning:  { l: '要対応', v: 'warning' },
  disabled: { l: '無効',   v: 'default' },
};

const getSev    = (s: string) => SEV_CFG[s as SevKey] ?? SEV_CFG.medium;
const getStatus = (s: string) => STATUS_CFG[s as PolStatus] ?? STATUS_CFG.active;

const totalViolations = POLICIES.reduce((s, p) => s + p.violations, 0);
const activePolicies  = POLICIES.filter(p => p.status === 'active').length;
const overallCompliance = Math.round(
  POLICIES.reduce((s, p) => s + Math.round((p.compliant / Math.max(p.targets, 1)) * 100), 0) / POLICIES.length
);

export default function PoliciesPage() {
  const [search, setSearch] = useState('');

  const filtered = POLICIES.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">ポリシー管理</h1>
          <p className="page-subtitle">セキュリティポリシーの適用状況と違反管理</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">CSVエクスポート</button>
          <button className="btn-primary">ポリシーを追加</button>
        </div>
      </div>

      <div className="grid-3">
        <div className="card card-center"><p className="stat-label">有効ポリシー数</p><p className="stat-value">{activePolicies}</p></div>
        <div className="card card-center"><p className="stat-label">総違反数</p><p className="stat-value text-red">{totalViolations}</p></div>
        <div className="card card-center">
          <p className="stat-label">遵守率</p>
          <p className="stat-value" style={{ color: overallCompliance >= 95 ? '#10b981' : overallCompliance >= 80 ? '#f59e0b' : '#ef4444' }}>
            {overallCompliance}%
          </p>
        </div>
      </div>

      <div className="card filter-row">
        <SearchInput placeholder="ポリシー名・カテゴリで検索..." value={search} onChange={v => setSearch(v)} style={{ flex: 1, minWidth: 200 }} />
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['ポリシー名', 'カテゴリ', '対象端末', '遵守率', '違反数', '重大度', 'ステータス'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(p => {
                const sc = getSev(p.severity);
                const st = getStatus(p.status);
                const rate = Math.round((p.compliant / Math.max(p.targets, 1)) * 100);
                return (
                  <tr key={p.id} className="table-row-hover">
                    <td><span className="link-text">{p.name}</span></td>
                    <td className="text-sub">{p.category}</td>
                    <td>{p.targets.toLocaleString()} 台</td>
                    <td style={{ minWidth: 140 }}>
                      <ProgressBar value={p.compliant} max={p.targets} color={rate >= 95 ? '#10b981' : rate >= 80 ? '#f59e0b' : '#ef4444'} size="sm" />
                      <span className="text-sub" style={{ fontSize: 11 }}>{rate}%</span>
                    </td>
                    <td className={p.violations > 0 ? 'text-red' : 'text-sub'}>{p.violations}</td>
                    <td><Badge variant={sc.v}>{sc.l}</Badge></td>
                    <td><Badge variant={st.v} dot>{st.l}</Badge></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={7} className="table-empty">条件に一致するポリシーが見つかりません</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {POLICIES.length} 件中 {filtered.length} 件を表示</span>
        </div>
      </div>
    </div>
  );
}
