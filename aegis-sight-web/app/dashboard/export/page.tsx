'use client';

import { useState } from 'react';
import { Badge, Select } from '@/components/ui/design-components';

const EXPORT_TYPES = [
  { id: 'exp-001', name: 'デバイス一覧',             category: 'デバイス管理',     formats: ['CSV', 'Excel'], lastExport: '2025-01-15 09:00', size: '2.4 MB' },
  { id: 'exp-002', name: 'ソフトウェアライセンス台帳', category: 'SAM',             formats: ['CSV', 'Excel', 'PDF'], lastExport: '2025-01-15 08:30', size: '1.8 MB' },
  { id: 'exp-003', name: 'アラート履歴',             category: 'セキュリティ',     formats: ['CSV'],          lastExport: '2025-01-14 23:00', size: '5.2 MB' },
  { id: 'exp-004', name: '監査ログ',                 category: '監査',             formats: ['CSV', 'PDF'],   lastExport: '2025-01-14 00:00', size: '12.1 MB' },
  { id: 'exp-005', name: 'コンプライアンスレポート', category: 'コンプライアンス', formats: ['PDF'],          lastExport: '2025-01-13 17:00', size: '3.6 MB' },
  { id: 'exp-006', name: 'パッチ適用状況',           category: 'パッチ管理',       formats: ['CSV', 'Excel'], lastExport: '2025-01-13 15:00', size: '0.9 MB' },
  { id: 'exp-007', name: 'ユーザーアカウント一覧',   category: 'ユーザー管理',     formats: ['CSV'],          lastExport: '2025-01-12 10:00', size: '0.4 MB' },
  { id: 'exp-008', name: '調達申請一覧',             category: '調達管理',         formats: ['CSV', 'Excel'], lastExport: '2025-01-10 14:00', size: '0.7 MB' },
];

const FORMAT_COLORS: Record<string, string> = {
  PDF:   '#ef4444',
  Excel: '#10b981',
  CSV:   '#3b82f6',
};

const CATEGORY_OPTS = [
  { value: '', label: 'すべてのカテゴリ' },
  { value: 'デバイス管理',     label: 'デバイス管理' },
  { value: 'SAM',             label: 'SAM' },
  { value: 'セキュリティ',     label: 'セキュリティ' },
  { value: '監査',             label: '監査' },
  { value: 'コンプライアンス', label: 'コンプライアンス' },
  { value: 'パッチ管理',       label: 'パッチ管理' },
  { value: 'ユーザー管理',     label: 'ユーザー管理' },
  { value: '調達管理',         label: '調達管理' },
];

export default function ExportPage() {
  const [category, setCategory] = useState('');

  const filtered = EXPORT_TYPES.filter(e => !category || e.category === category);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">データエクスポート</h1>
          <p className="page-subtitle">各管理モジュールのデータを CSV・Excel・PDF 形式でエクスポート</p>
        </div>
      </div>

      <div className="grid-3">
        <div className="card card-center"><p className="stat-label">エクスポート種別</p><p className="stat-value">{EXPORT_TYPES.length}</p></div>
        <div className="card card-center"><p className="stat-label">対応フォーマット</p><p className="stat-value">3</p></div>
        <div className="card card-center"><p className="stat-label">最終実行</p><p className="stat-value" style={{ fontSize: 16 }}>2025-01-15</p></div>
      </div>

      <div className="card filter-row">
        <Select options={CATEGORY_OPTS} value={category} onChange={v => setCategory(v)} style={{ minWidth: 200 }} />
      </div>

      <div className="card table-card">
        <h2 className="card-title">エクスポート一覧</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['レポート名', 'カテゴリ', 'フォーマット', '最終エクスポート', 'サイズ', 'アクション'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(e => (
                <tr key={e.id} className="table-row-hover">
                  <td><span className="text-main" style={{ fontWeight: 500 }}>{e.name}</span></td>
                  <td className="text-sub">{e.category}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {e.formats.map(f => (
                        <span key={f} style={{ display: 'inline-block', background: FORMAT_COLORS[f] + '20', color: FORMAT_COLORS[f], border: `1px solid ${FORMAT_COLORS[f]}40`, borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="text-sub">{e.lastExport}</td>
                  <td className="text-sub">{e.size}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {e.formats.map(f => (
                        <button key={f} className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="table-empty">条件に一致するエクスポートがありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {EXPORT_TYPES.length} 件中 {filtered.length} 件を表示</span>
        </div>
      </div>
    </div>
  );
}
