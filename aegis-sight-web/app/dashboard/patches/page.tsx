'use client';

import { useState } from 'react';
import {
  Badge, ProgressBar, SearchInput, Select,
} from '@/components/ui/design-components';

const PATCHES = [
  { id: 'pa-001', title: 'KB5034441 — Windows セキュリティ更新', severity: 'critical',  released: '2025-01-09', installed: 812, pending:  30, failed:  0, total: 842 },
  { id: 'pa-002', title: 'CVE-2025-21333 — Windows Hyper-V 権限昇格', severity: 'critical',  released: '2025-01-14', installed: 795, pending:  40, failed:  7, total: 842 },
  { id: 'pa-003', title: 'APSB25-02 — Adobe Acrobat Reader 脆弱性修正', severity: 'important', released: '2025-01-10', installed:  44, pending:   5, failed:  1, total:  50 },
  { id: 'pa-004', title: 'Chrome 131.x セキュリティアップデート', severity: 'important', released: '2025-01-07', installed: 820, pending:  18, failed:  4, total: 842 },
  { id: 'pa-005', title: 'Microsoft Office 2024 定期更新', severity: 'moderate',   released: '2025-01-08', installed: 475, pending:  25, failed:  0, total: 500 },
  { id: 'pa-006', title: 'Windows Defender 定義ファイル更新',      severity: 'low',       released: '2025-01-15', installed: 838, pending:   4, failed:  0, total: 842 },
];

const SEV_OPTS = [
  { value: '',          label: 'すべての重要度' },
  { value: 'critical',  label: '緊急' },
  { value: 'important', label: '重要' },
  { value: 'moderate',  label: '中' },
  { value: 'low',       label: '低' },
];

type SevKey = 'critical' | 'important' | 'moderate' | 'low';
const SEV_CFG: Record<SevKey, { l: string; v: 'danger' | 'warning' | 'info' | 'default' }> = {
  critical:  { l: '緊急', v: 'danger'  },
  important: { l: '重要', v: 'warning' },
  moderate:  { l: '中',   v: 'info'    },
  low:       { l: '低',   v: 'default' },
};
const getSev = (s: string) => SEV_CFG[s as SevKey] ?? SEV_CFG.moderate;

const totalPatches  = PATCHES.reduce((s, p) => s + p.total, 0);
const totalInstalled = PATCHES.reduce((s, p) => s + p.installed, 0);
const totalPending  = PATCHES.reduce((s, p) => s + p.pending, 0);
const totalFailed   = PATCHES.reduce((s, p) => s + p.failed, 0);
const applyRate     = Math.round((totalInstalled / Math.max(totalPatches, 1)) * 100);

export default function PatchesPage() {
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('');

  const filtered = PATCHES.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
    const matchSev    = !sevFilter || p.severity === sevFilter;
    return matchSearch && matchSev;
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">パッチ管理</h1>
          <p className="page-subtitle">Windows Update / サードパーティパッチ適用状況と脆弱性管理</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">CSVエクスポート</button>
          <button className="btn-primary">パッチを追加</button>
        </div>
      </div>

      <div className="grid-4">
        <div className="card card-center">
          <p className="stat-label">適用率</p>
          <p className="stat-value" style={{ color: applyRate >= 95 ? '#10b981' : applyRate >= 80 ? '#f59e0b' : '#ef4444' }}>{applyRate}%</p>
        </div>
        <div className="card card-center"><p className="stat-label">管理パッチ数</p><p className="stat-value">{PATCHES.length}</p></div>
        <div className="card card-center"><p className="stat-label">適用待ち</p><p className="stat-value text-amber">{totalPending}</p></div>
        <div className="card card-center"><p className="stat-label">失敗</p><p className="stat-value text-red">{totalFailed}</p></div>
      </div>

      <div className="card filter-row">
        <SearchInput placeholder="パッチ名・IDで検索..." value={search} onChange={v => setSearch(v)} style={{ flex: 1, minWidth: 200 }} />
        <Select options={SEV_OPTS} value={sevFilter} onChange={v => setSevFilter(v)} style={{ minWidth: 160 }} />
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['パッチ名', '重要度', 'リリース日', '適用率', '適用済', '未適用', '失敗', 'ステータス'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(p => {
                const sc = getSev(p.severity);
                const rate = Math.round((p.installed / Math.max(p.total, 1)) * 100);
                const status = p.failed > 0 ? { l: '一部失敗', v: 'warning' as const } : p.pending === 0 ? { l: '完了', v: 'success' as const } : { l: '適用中', v: 'info' as const };
                return (
                  <tr key={p.id} className="table-row-hover">
                    <td><span className="link-text">{p.title}</span></td>
                    <td><Badge variant={sc.v}>{sc.l}</Badge></td>
                    <td className="text-sub">{p.released}</td>
                    <td style={{ minWidth: 140 }}>
                      <ProgressBar value={p.installed} max={p.total} size="sm" />
                      <span className="text-sub" style={{ fontSize: 11 }}>{rate}%</span>
                    </td>
                    <td className="text-green">{p.installed.toLocaleString()}</td>
                    <td className={p.pending > 0 ? 'text-amber' : 'text-sub'}>{p.pending}</td>
                    <td className={p.failed > 0 ? 'text-red' : 'text-sub'}>{p.failed}</td>
                    <td><Badge variant={status.v} dot>{status.l}</Badge></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={8} className="table-empty">条件に一致するパッチが見つかりません</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {PATCHES.length} 件中 {filtered.length} 件を表示</span>
        </div>
      </div>
    </div>
  );
}
