'use client';

import {
  Badge,
} from '@/components/ui/design-components';

const REPORTS = [
  { id: 'rp-001', name: '月次セキュリティサマリーレポート',      category: 'セキュリティ',   period: '2024年12月',  format: 'PDF',  size: '2.4 MB', created: '2025-01-05', status: 'ready'      },
  { id: 'rp-002', name: 'パッチ適用状況レポート',                category: 'パッチ管理',     period: '2024年12月',  format: 'Excel', size: '1.1 MB', created: '2025-01-06', status: 'ready'      },
  { id: 'rp-003', name: 'コンプライアンス準拠状況レポート',       category: 'コンプライアンス', period: 'Q4 2024',    format: 'PDF',  size: '5.8 MB', created: '2025-01-08', status: 'ready'      },
  { id: 'rp-004', name: 'DLP インシデントレポート',              category: 'DLP',            period: '2024年12月',  format: 'PDF',  size: '0.9 MB', created: '2025-01-07', status: 'ready'      },
  { id: 'rp-005', name: 'ライセンスコスト最適化提案',            category: 'SAM',            period: '2024 年次',   format: 'PDF',  size: '3.2 MB', created: '2025-01-10', status: 'ready'      },
  { id: 'rp-006', name: '脆弱性スキャンレポート',                category: 'セキュリティ',   period: '2025年1月',   format: 'CSV',  size: '0.4 MB', created: '2025-01-15', status: 'ready'      },
  { id: 'rp-007', name: '変更管理月次サマリー',                  category: '変更管理',       period: '2024年12月',  format: 'PDF',  size: '1.6 MB', created: '2025-01-09', status: 'ready'      },
  { id: 'rp-008', name: 'SLA 達成状況レポート Q4 2024',         category: 'SLA',            period: 'Q4 2024',    format: 'PDF',  size: '2.0 MB', created: '2025-01-11', status: 'generating' },
];

type ReportStatus = 'ready' | 'generating' | 'failed';
const STATUS_CFG: Record<ReportStatus, { l: string; v: 'success' | 'warning' | 'danger' }> = {
  ready:      { l: '準備完了',  v: 'success' },
  generating: { l: '生成中',    v: 'warning' },
  failed:     { l: '失敗',      v: 'danger'  },
};
const getStatus = (s: string) => STATUS_CFG[s as ReportStatus] ?? STATUS_CFG.ready;

const FORMAT_COLOR: Record<string, string> = {
  PDF:   '#ef4444',
  Excel: '#10b981',
  CSV:   '#3b82f6',
};

export default function ReportsPage() {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">レポート</h1>
          <p className="page-subtitle">セキュリティ・コンプライアンス・運用レポートの生成とダウンロード</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary">レポートを生成</button>
        </div>
      </div>

      <div className="grid-3">
        <div className="card card-center"><p className="stat-label">レポート数</p><p className="stat-value">{REPORTS.length}</p></div>
        <div className="card card-center"><p className="stat-label">準備完了</p><p className="stat-value text-green">{REPORTS.filter(r => r.status === 'ready').length}</p></div>
        <div className="card card-center"><p className="stat-label">生成中</p><p className="stat-value text-amber">{REPORTS.filter(r => r.status === 'generating').length}</p></div>
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['レポート名', 'カテゴリ', '対象期間', '形式', 'サイズ', '作成日', 'ステータス', '操作'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {REPORTS.map(r => {
                const st = getStatus(r.status);
                return (
                  <tr key={r.id} className="table-row-hover">
                    <td><span className="link-text">{r.name}</span></td>
                    <td className="text-sub">{r.category}</td>
                    <td className="text-sub">{r.period}</td>
                    <td>
                      <span className="mono" style={{ color: FORMAT_COLOR[r.format] ?? '#6b7280', fontWeight: 600, fontSize: 12 }}>
                        {r.format}
                      </span>
                    </td>
                    <td className="text-sub">{r.size}</td>
                    <td className="text-sub">{r.created}</td>
                    <td><Badge variant={st.v} dot>{st.l}</Badge></td>
                    <td>
                      {r.status === 'ready' && (
                        <button className="btn-secondary" style={{ fontSize: 12, padding: '2px 10px' }}>
                          ダウンロード
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
